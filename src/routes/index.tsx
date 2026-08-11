import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { LeftSidebarPanel } from "@/components/cgr/LeftSidebarPanel";
import { getHighwaySummaries, mergeMetaPoints, parseBiCsv, parseCmWorkbook, parseKmz, snapPointToRoad, snapSegmentToMesh } from "@/lib/cgr-data";
import { loadShapefiles, type Regions } from "@/lib/cgr-shapes";
import type { BiPoint, MeshLine, ServicePoint } from "@/lib/cgr-types";
import type { FitTarget } from "@/components/cgr/MapView";

const MapView = lazy(() => import("@/components/cgr/MapView"));

const title = "CGR 02 - Sistema de Localização";
const description =
  "Mapa interativo da malha CGR 02: cruzamento de serviços do CM com o referenciamento linear (SP/Km) e visualização georreferenciada dos atendimentos.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [byRoad, setByRoad] = useState<Map<string, BiPoint[]>>(new Map());
  const [mesh, setMesh] = useState<MeshLine[]>([]);
  const [regions, setRegions] = useState<Regions | null>(null);
  const [points, setPoints] = useState<ServicePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Carregando base de referência...");
  const [selectedDescriptions, setSelectedDescriptions] = useState<string[]>([]);
  const [selectedHighways, setSelectedHighways] = useState<string[]>([]);
  const [selectedRcs, setSelectedRcs] = useState<string[]>([]);
  const [target, setTarget] = useState<FitTarget | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        const [csvRes, metaRes, kmzRes] = await Promise.all([
          fetch(`${base}/data/planilha_bi.csv`),
          fetch(`${base}/data/meta.csv`).catch(() => null),
          fetch(`${base}/data/malha_dr02.kmz`),
        ]);
        const dict = parseBiCsv(await csvRes.text());
        if (metaRes && metaRes.ok) {
          mergeMetaPoints(dict, await metaRes.text());
        }
        const lines = await parseKmz(await kmzRes.arrayBuffer());
        if (cancelled) return;
        setByRoad(dict);
        setMesh(lines);
        setStatus(`${dict.size} rodovias referenciadas`);
      } catch {
        if (!cancelled) setStatus("Falha ao carregar base de referência");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadShapefiles()
      .then((data) => {
        if (!cancelled) setRegions(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const rcs = useMemo(() => {
    const set = new Set<string>();
    for (const pt of points) {
      if (pt.rc) set.add(pt.rc);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
  }, [points]);

  const highwaySummaries = useMemo(() => {
    const selectedRc = new Set(selectedRcs);
    const relevantPoints =
      selectedRc.size === 0
        ? points
        : points.filter((p) => p.rc && selectedRc.has(p.rc));
    return getHighwaySummaries(byRoad, relevantPoints);
  }, [byRoad, points, selectedRcs]);

  const descriptions = useMemo(() => {
    const selectedRc = new Set(selectedRcs);
    const selectedHw = new Set(selectedHighways);

    const relevantPoints = points.filter((p) => {
      const matchRc = selectedRc.size === 0 || (p.rc && selectedRc.has(p.rc));
      const matchHw = selectedHw.size === 0 || selectedHw.has(p.sp);
      return matchRc && matchHw;
    });

    return Array.from(new Set(relevantPoints.map((point) => point.descricao))).sort();
  }, [points, selectedRcs, selectedHighways]);

  const visiblePoints = useMemo(() => {
    const selectedRc = new Set(selectedRcs);
    const selectedHw = new Set(selectedHighways);
    const selectedDesc = new Set(selectedDescriptions);

    return points.filter((point) => {
      const matchRc = selectedRc.size === 0 || (point.rc && selectedRc.has(point.rc));
      const matchHw = selectedHw.size === 0 || selectedHw.has(point.sp);
      const matchDesc = selectedDesc.size === 0 || selectedDesc.has(point.descricao);
      return matchRc && matchHw && matchDesc;
    });
  }, [points, selectedRcs, selectedHighways, selectedDescriptions]);

  useEffect(() => {
    if (mesh.length > 0 && points.length > 0) {
      setPoints((prev) =>
        prev.map((pt): ServicePoint => {
          const snapped = snapPointToRoad(pt.lat, pt.lon, pt.sp, mesh);
          let snappedSegment: [number, number][] | undefined = undefined;

          if (pt.segmentCoords && pt.segmentCoords.length > 1) {
            const firstPt = pt.segmentCoords[0]!;
            const lastPt = pt.segmentCoords[pt.segmentCoords.length - 1]!;
            snappedSegment = snapSegmentToMesh(pt.sp, firstPt[0], firstPt[1], lastPt[0], lastPt[1], mesh, pt.segmentCoords);
          }

          return {
            ...pt,
            lat: snapped.lat,
            lon: snapped.lon,
            segmentCoords: snappedSegment ?? undefined,
          };
        }),
      );
    }
  }, [mesh]);

  const DEFAULT_GOOGLE_SHEETS_URL =
    "https://docs.google.com/spreadsheets/d/1aGRRJrDp-Sq93CQgX-wHyXa9G-BJUpvy/export?format=xlsx";

  const handleProcessBuffer = async (buffer: ArrayBuffer, originLabel = "arquivo") => {
    setLoading(true);
    try {
      const { points: parsed, total } = await parseCmWorkbook(buffer, byRoad, mesh);
      setPoints(parsed);
      setSelectedDescriptions([]);
      setSelectedHighways([]);
      setSelectedRcs([]);
      setStatus(`${parsed.length} de ${total} serviços localizados (${originLabel})`);
    } catch {
      setStatus("Não foi possível ler esta planilha");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file: File) => {
    await handleProcessBuffer(await file.arrayBuffer(), "arquivo local");
  };

  const handleFetchGoogleDrive = async (customUrl?: string) => {
    setLoading(true);
    setStatus("Baixando planilha online do Google Drive...");
    try {
      const rawUrl = customUrl || DEFAULT_GOOGLE_SHEETS_URL;
      let exportUrl = rawUrl;
      const match = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        exportUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
      }

      let res = await fetch(exportUrl).catch(() => null);
      if (!res || !res.ok) {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(exportUrl)}`;
        res = await fetch(proxyUrl).catch(() => null);
      }

      if (!res || !res.ok) {
        throw new Error(`HTTP ${res?.status || "error"}`);
      }

      const buffer = await res.arrayBuffer();
      await handleProcessBuffer(buffer, "Google Drive");
    } catch (err) {
      console.error("[Google Drive Sync Error]", err);
      setStatus("Falha ao conectar com o Google Drive");
      setLoading(false);
    }
  };

  const handleLocate = () => {
    const bounds = visiblePoints.map((point) => [point.lat, point.lon] as [number, number]);
    if (bounds.length > 0) setTarget({ bounds, nonce: Date.now() });
  };

  const handleSelectHighway = (sp: string) => {
    setSelectedHighways((prev) =>
      prev.includes(sp) ? prev.filter((item) => item !== sp) : [...prev, sp],
    );
  };

  const handleClearHighways = () => {
    setSelectedHighways([]);
  };

  const handleResetAll = () => {
    setSelectedHighways([]);
    setSelectedDescriptions([]);
    setSelectedRcs([]);
  };

  const handleLocateHighway = (sp: string) => {
    const hwPoints = visiblePoints.filter((p) => p.sp === sp);
    let bounds: [number, number][] = [];
    if (hwPoints.length > 0) {
      bounds = hwPoints.map((p) => [p.lat, p.lon] as [number, number]);
    } else {
      const biList = byRoad.get(sp);
      if (biList && biList.length > 0) {
        bounds = biList.map((p) => [p.lat, p.lon] as [number, number]);
      }
    }
    if (bounds.length > 0) {
      setTarget({ bounds, nonce: Date.now() });
    }
  };

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-muted">
      <h1 className="sr-only">{title}</h1>
      <Suspense
        fallback={<div className="flex h-[100dvh] w-full items-center justify-center bg-muted" />}
      >
        {mounted && (
          <MapView points={visiblePoints} mesh={mesh} target={target} regions={regions} byRoad={byRoad} />
        )}
      </Suspense>

      <LeftSidebarPanel
        highways={highwaySummaries}
        selectedHighways={selectedHighways}
        onSelectHighway={handleSelectHighway}
        onSetHighways={setSelectedHighways}
        onClearHighways={handleClearHighways}
        onLocateHighway={handleLocateHighway}
        rcs={rcs}
        selectedRcs={selectedRcs}
        onRcs={setSelectedRcs}
        descriptions={descriptions}
        selectedDescriptions={selectedDescriptions}
        onDescriptions={setSelectedDescriptions}
        onFile={handleFile}
        onFetchGoogleDrive={handleFetchGoogleDrive}
        loading={loading}
        status={status}
        onLocate={handleLocate}
        visibleCount={visiblePoints.length}
        totalCount={points.length}
        visibleServices={visiblePoints}
        onResetAll={handleResetAll}
      />
    </main>
  );
}


