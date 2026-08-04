import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ControlPanel } from "@/components/cgr/ControlPanel";
import { parseBiCsv, parseCmWorkbook, parseKmz } from "@/lib/cgr-data";
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
  const [road, setRoad] = useState("");
  const [selectedDescriptions, setSelectedDescriptions] = useState<string[]>([]);
  const [target, setTarget] = useState<FitTarget | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [csvRes, kmzRes] = await Promise.all([
          fetch("/data/planilha_bi.csv"),
          fetch("/data/malha_dr02.kmz"),
        ]);
        const dict = parseBiCsv(await csvRes.text());
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

  const roads = useMemo(() => Array.from(byRoad.keys()).sort(), [byRoad]);

  const descriptions = useMemo(
    () => Array.from(new Set(points.map((point) => point.descricao))).sort(),
    [points],
  );

  const visiblePoints = useMemo(() => {
    const selected = new Set(selectedDescriptions);
    return points.filter((point) => selected.size === 0 || selected.has(point.descricao));
  }, [points, selectedDescriptions]);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const { points: parsed, total } = await parseCmWorkbook(await file.arrayBuffer(), byRoad);
      setPoints(parsed);
      setSelectedDescriptions([]);
      setStatus(`${parsed.length} de ${total} serviços localizados`);
    } catch {
      setStatus("Não foi possível ler este arquivo");
    } finally {
      setLoading(false);
    }
  };

  const handleLocate = () => {
    if (!road) return;
    const fromPoints = visiblePoints
      .filter((point) => point.sp === road)
      .map((point) => [point.lat, point.lon] as [number, number]);
    const bounds =
      fromPoints.length > 0
        ? fromPoints
        : (byRoad.get(road) ?? []).map((p) => [p.lat, p.lon] as [number, number]);
    if (bounds.length > 0) setTarget({ bounds, nonce: Date.now() });
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-muted">
      <h1 className="sr-only">{title}</h1>
      <Suspense
        fallback={<div className="flex h-screen w-screen items-center justify-center bg-muted" />}
      >
        {mounted && (
          <MapView points={visiblePoints} mesh={mesh} target={target} regions={regions} />
        )}
      </Suspense>
      <div className="pointer-events-none absolute inset-0 z-[1000]">
        <ControlPanel
          roads={roads}
          road={road}
          onRoad={setRoad}
          onLocate={handleLocate}
          descriptions={descriptions}
          selectedDescriptions={selectedDescriptions}
          onDescriptions={setSelectedDescriptions}
          onFile={handleFile}
          loading={loading}
          status={status}
          visibleCount={visiblePoints.length}
        />
      </div>
    </main>
  );
}
