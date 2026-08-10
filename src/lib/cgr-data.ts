import Papa from "papaparse";
import type { BiPoint, LayerKey, MeshLine, ServicePoint, StatusKey } from "./cgr-types";

const norm = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

export const normalizeSp = (v: unknown) => {
  const s = norm(v).replace(/[^A-Z0-9]/g, "");
  const m = s.match(/^SP0*(\d+)$/);
  return m?.[1] ? `SP ${m[1].padStart(3, "0")}` : norm(v);
};

export const formatKmBR = (km: number): string => {
  return km.toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
};

const toNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;

  let cleaned = s.replace(/[^\d.,+-]/g, "");
  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    cleaned = cleaned.replace(",", ".");
  } else if (hasDot) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
};

/* ---------- BI dictionary (CSV) ---------- */

export function parseBiCsv(text: string): Map<string, BiPoint[]> {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
  });
  const byRoad = new Map<string, BiPoint[]>();
  for (const row of parsed.data) {
    const keys = Object.keys(row);
    const get = (frag: string) => {
      const k = keys.find((key) => norm(key).startsWith(frag));
      return k ? row[k] : undefined;
    };
    const sp = normalizeSp(get("SP"));
    const km = toNumber(get("KM"));
    const lat = toNumber(get("LAT"));
    const lon = toNumber(get("LON"));
    if (!sp || km === null || lat === null || lon === null) continue;
    const list = byRoad.get(sp) ?? [];
    list.push({ sp, km, lat, lon });
    byRoad.set(sp, list);
  }
  for (const list of byRoad.values()) list.sort((a, b) => a.km - b.km);
  return byRoad;
}

export function mergeMetaPoints(byRoad: Map<string, BiPoint[]>, text: string): Map<string, BiPoint[]> {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: true,
  });

  for (const row of parsed.data) {
    const keys = Object.keys(row);
    const pick = (...frags: string[]) => {
      for (const frag of frags) {
        const k = keys.find((key) => norm(key).includes(frag));
        if (k) return row[k];
      }
      return undefined;
    };

    const sp = normalizeSp(pick("RODOVIA", "SP"));
    if (!sp) continue;

    const kmInit = toNumber(pick("KM INICIAL", "KM INICIO"));
    const kmFin = toNumber(pick("KM FINAL"));

    const initCoordStr = String(pick("LAT E LONG KM INICIAL", "INICIAL") ?? "");
    const finCoordStr = String(pick("LAT E LONG KM FINAL", "FINAL") ?? "");

    const parseCoords = (str: string) => {
      const parts = str.split(",").map((s) => s.trim());
      if (parts.length < 2) return null;
      const lat = toNumber(parts[0]);
      const lon = toNumber(parts[1]);
      return lat !== null && lon !== null ? { lat, lon } : null;
    };

    const initLoc = parseCoords(initCoordStr);
    const finLoc = parseCoords(finCoordStr);

    const list = byRoad.get(sp) ?? [];

    if (kmInit !== null && initLoc) {
      list.push({ sp, km: kmInit, lat: initLoc.lat, lon: initLoc.lon });
    }
    if (kmFin !== null && finLoc) {
      list.push({ sp, km: kmFin, lat: finLoc.lat, lon: finLoc.lon });
    }

    byRoad.set(sp, list);
  }

  for (const list of byRoad.values()) {
    list.sort((a, b) => a.km - b.km);
  }

  return byRoad;
}

export type HighwaySummary = {
  sp: string;
  minKm: number | null;
  maxKm: number | null;
  totalBiPoints: number;
  totalServices: number;
  statusCounts: {
    atual: number;
    vencido: number;
    sem: number;
  };
};

export function getHighwaySummaries(
  byRoad: Map<string, BiPoint[]>,
  points: ServicePoint[],
): HighwaySummary[] {
  const map = new Map<string, HighwaySummary>();

  for (const [sp, biList] of byRoad.entries()) {
    if (!biList || biList.length === 0) continue;
    const minKm = biList[0].km;
    const maxKm = biList[biList.length - 1].km;
    map.set(sp, {
      sp,
      minKm,
      maxKm,
      totalBiPoints: biList.length,
      totalServices: 0,
      statusCounts: { atual: 0, vencido: 0, sem: 0 },
    });
  }

  for (const pt of points) {
    let summary = map.get(pt.sp);
    if (!summary) {
      summary = {
        sp: pt.sp,
        minKm: pt.kmInicial,
        maxKm: pt.kmFinal ?? pt.kmInicial,
        totalBiPoints: 0,
        totalServices: 0,
        statusCounts: { atual: 0, vencido: 0, sem: 0 },
      };
      map.set(pt.sp, summary);
    }
    summary.totalServices += 1;
    summary.statusCounts[pt.status] += 1;

    if (summary.minKm === null || pt.kmInicial < summary.minKm) {
      summary.minKm = pt.kmInicial;
    }
    const maxVal = pt.kmFinal ?? pt.kmInicial;
    if (summary.maxKm === null || maxVal > summary.maxKm) {
      summary.maxKm = maxVal;
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.sp.localeCompare(b.sp, undefined, { numeric: true, sensitivity: "base" }),
  );
}

export function findNearest(byRoad: Map<string, BiPoint[]>, sp: string, km: number): BiPoint | null {
  const list = byRoad.get(normalizeSp(sp));
  if (!list || list.length === 0) return null;
  let best = list[0] as BiPoint;
  let bestDiff = Math.abs(best.km - km);
  for (const p of list) {
    const d = Math.abs(p.km - km);
    if (d < bestDiff) {
      best = p;
      bestDiff = d;
    }
  }
  return best;
}

export function interpolateLocation(
  byRoad: Map<string, BiPoint[]>,
  sp: string,
  km: number,
): { lat: number; lon: number } | null {
  const normSp = normalizeSp(sp);
  const list = byRoad.get(normSp);
  if (!list || list.length === 0) return null;

  if (km <= list[0].km) {
    return { lat: list[0].lat, lon: list[0].lon };
  }
  if (km >= list[list.length - 1].km) {
    const last = list[list.length - 1];
    return { lat: last.lat, lon: last.lon };
  }

  for (let i = 0; i < list.length - 1; i++) {
    const p1 = list[i];
    const p2 = list[i + 1];

    if (km >= p1.km && km <= p2.km) {
      if (p1.km === p2.km) {
        return { lat: p1.lat, lon: p1.lon };
      }
      const t = (km - p1.km) / (p2.km - p1.km);
      const lat = p1.lat + t * (p2.lat - p1.lat);
      const lon = p1.lon + t * (p2.lon - p1.lon);
      return { lat, lon };
    }
  }

  return { lat: list[0].lat, lon: list[0].lon };
}

export function interpolateSegment(
  byRoad: Map<string, BiPoint[]>,
  sp: string,
  kmInicial: number,
  kmFinal: number,
): [number, number][] {
  const normSp = normalizeSp(sp);
  const list = byRoad.get(normSp);
  if (!list || list.length === 0) return [];

  const startKm = Math.min(kmInicial, kmFinal);
  const endKm = Math.max(kmInicial, kmFinal);

  if (Math.abs(endKm - startKm) < 0.001) return [];

  const startLoc = interpolateLocation(byRoad, sp, startKm);
  const endLoc = interpolateLocation(byRoad, sp, endKm);

  if (!startLoc || !endLoc) return [];

  const coords: [number, number][] = [[startLoc.lat, startLoc.lon]];

  for (const pt of list) {
    if (pt.km > startKm && pt.km < endKm) {
      coords.push([pt.lat, pt.lon]);
    }
  }

  coords.push([endLoc.lat, endLoc.lon]);
  return coords;
}

export function snapPointToRoad(
  lat: number,
  lon: number,
  sp: string,
  mesh: MeshLine[],
): { lat: number; lon: number } {
  if (!mesh || mesh.length === 0) return { lat, lon };

  const normTargetSp = normalizeSp(sp);
  const targetClean = normTargetSp.replace(/[^A-Z0-9]/g, "");

  let candidateLines = mesh.filter((m) => {
    const lineNorm = normalizeSp(m.name).replace(/[^A-Z0-9]/g, "");
    return (
      lineNorm === targetClean ||
      lineNorm.includes(targetClean) ||
      targetClean.includes(lineNorm)
    );
  });

  if (candidateLines.length === 0) {
    candidateLines = mesh;
  }

  let bestLat = lat;
  let bestLon = lon;
  let minDistSq = Infinity;

  for (const line of candidateLines) {
    const coords = line.coords;
    for (let i = 0; i < coords.length - 1; i++) {
      const [latA, lonA] = coords[i];
      const [latB, lonB] = coords[i + 1];

      const dLat = latB - latA;
      const dLon = lonB - lonA;

      if (dLat === 0 && dLon === 0) continue;

      const t = Math.max(
        0,
        Math.min(
          1,
          ((lat - latA) * dLat + (lon - lonA) * dLon) / (dLat * dLat + dLon * dLon),
        ),
      );

      const projLat = latA + t * dLat;
      const projLon = lonA + t * dLon;

      const distSq = (lat - projLat) ** 2 + (lon - projLon) ** 2;

      if (distSq < minDistSq) {
        minDistSq = distSq;
        bestLat = projLat;
        bestLon = projLon;
      }
    }
  }

  if (minDistSq < 0.0225) {
    return { lat: bestLat, lon: bestLon };
  }

  return { lat, lon };
}

export function calculateKmFromLocation(
  byRoad: Map<string, BiPoint[]>,
  sp: string,
  lat: number,
  lon: number,
): number | null {
  const normSp = normalizeSp(sp);
  let list = byRoad.get(normSp);

  if (!list || list.length === 0) {
    // Tenta encontrar por busca parcial se não encontrar por chave exata
    const targetClean = normSp.replace(/[^A-Z0-9]/g, "");
    for (const [key, val] of byRoad.entries()) {
      const keyClean = key.replace(/[^A-Z0-9]/g, "");
      if (keyClean === targetClean || keyClean.includes(targetClean) || targetClean.includes(keyClean)) {
        list = val;
        break;
      }
    }
  }

  if (!list || list.length === 0) return null;
  if (list.length === 1) return list[0].km;

  let minDistanceSq = Infinity;
  let bestKm = list[0].km;

  for (let i = 0; i < list.length - 1; i++) {
    const p1 = list[i];
    const p2 = list[i + 1];

    const dLat = p2.lat - p1.lat;
    const dLon = p2.lon - p1.lon;

    if (dLat === 0 && dLon === 0) continue;

    const t = Math.max(
      0,
      Math.min(
        1,
        ((lat - p1.lat) * dLat + (lon - p1.lon) * dLon) / (dLat * dLat + dLon * dLon),
      ),
    );

    const projLat = p1.lat + t * dLat;
    const projLon = p1.lon + t * dLon;

    const distSq = (lat - projLat) ** 2 + (lon - projLon) ** 2;

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      bestKm = p1.km + t * (p2.km - p1.km);
    }
  }

  return bestKm;
}

/* ---------- KMZ / KML mesh ---------- */

export async function parseKmz(buffer: ArrayBuffer): Promise<MeshLine[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const entry = Object.keys(zip.files).find((f) => f.toLowerCase().endsWith(".kml"));
  if (!entry) return [];
  return parseKml(await zip.files[entry]!.async("string"));
}

export function parseKml(xml: string): MeshLine[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const lines: MeshLine[] = [];
  const placemarks = Array.from(doc.getElementsByTagName("Placemark"));
  for (const pm of placemarks) {
    const name = pm.getElementsByTagName("name")[0]?.textContent?.trim() ?? "";
    const geoms = Array.from(pm.getElementsByTagName("coordinates"));
    for (const g of geoms) {
      const coords: [number, number][] = [];
      for (const chunk of (g.textContent ?? "").trim().split(/\s+/)) {
        const [lon, lat] = chunk.split(",").map(Number);
        if (Number.isFinite(lat) && Number.isFinite(lon)) coords.push([lat as number, lon as number]);
      }
      if (coords.length > 1) lines.push({ coords, name });
    }
  }
  return lines;
}

/* ---------- CM workbook ---------- */

const LAYER_RULES: { layer: LayerKey; test: RegExp }[] = [
  { layer: "cameras", test: /CAMERA|CFTV|CFTC|MONITORAMENTO/ },
  { layer: "sensores", test: /SENSOR|DETECTOR|LACO|RADAR|METEOROL/ },
  { layer: "obras", test: /PONTE|VIADUTO|OBRA|OAE|PASSARELA|TUNEL/ },
  { layer: "fresa", test: /FRESA|RECAPE|PAVIMENT|TAPA|ASFALT|MICRO/ },
];

export function classifyLayer(descricao: string): LayerKey {
  const d = norm(descricao);
  for (const rule of LAYER_RULES) if (rule.test.test(d)) return rule.layer;
  return "fresa";
}

const MS_MONTH = 1000 * 60 * 60 * 24 * 30.44;

export function classifyStatus(date: Date | null): StatusKey {
  if (!date) return "sem";
  const months = (Date.now() - date.getTime()) / MS_MONTH;
  if (months < 0) return "atual";
  return months <= 6 ? "atual" : "vencido";
}

function parseDate(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === "number" && v > 20000 && v < 60000) {
    return new Date(Date.UTC(1899, 11, 30).valueOf() + v * 86400000);
  }
  const s = String(v ?? "").trim();
  if (!s) return null;
  const br = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (br?.[3]) {
    const year = Number(br[3].length === 2 ? `20${br[3]}` : br[3]);
    const d = new Date(year, Number(br[2]) - 1, Number(br[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const COLOR_DICTIONARY: Record<string, { bg: string; text: string }> = {
  verde: { bg: "#16a34a", text: "#ffffff" },
  "verde-escuro": { bg: "#15803d", text: "#ffffff" },
  "verde-claro": { bg: "#4ade80", text: "#0f172a" },
  azul: { bg: "#2563eb", text: "#ffffff" },
  "azul-escuro": { bg: "#1e3a8a", text: "#ffffff" },
  "azul-claro": { bg: "#38bdf8", text: "#0f172a" },
  vermelho: { bg: "#dc2626", text: "#ffffff" },
  amarelo: { bg: "#eab308", text: "#0f172a" },
  laranja: { bg: "#f97316", text: "#ffffff" },
  roxo: { bg: "#9333ea", text: "#ffffff" },
  violeta: { bg: "#7c3aed", text: "#ffffff" },
  rosa: { bg: "#ec4899", text: "#ffffff" },
  preto: { bg: "#0f172a", text: "#ffffff" },
  cinza: { bg: "#64748b", text: "#ffffff" },
  branco: { bg: "#ffffff", text: "#0f172a" },
  marrom: { bg: "#78350f", text: "#ffffff" },
  ciano: { bg: "#06b6d4", text: "#0f172a" },
  turquesa: { bg: "#14b8a6", text: "#ffffff" },
  dourado: { bg: "#d97706", text: "#ffffff" },
};

function parseSingleColor(raw: string): { bg?: string; text?: string } | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (COLOR_DICTIONARY[s]) return COLOR_DICTIONARY[s];
  if (s.startsWith("#") || /^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) {
    const hex = s.startsWith("#") ? s : `#${s}`;
    return { bg: hex, text: "#ffffff" };
  }
  return { bg: s, text: "#ffffff" };
}

export function parseCustomColor(val: unknown): { corFundo?: string; corTexto?: string } | null {
  const str = String(val ?? "").trim();
  if (!str) return null;

  const parts = str.split(/[/,;:-]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const bgObj = parseSingleColor(parts[0]);
    const textObj = parseSingleColor(parts[1]);
    return {
      corFundo: bgObj?.bg || parts[0],
      corTexto: textObj?.bg || parts[1],
    };
  }

  const single = parseSingleColor(str);
  if (!single) return null;
  return {
    corFundo: single.bg,
    corTexto: single.text,
  };
}

export async function parseCmWorkbook(
  buffer: ArrayBuffer,
  byRoad: Map<string, BiPoint[]>,
  mesh?: MeshLine[],
): Promise<{ points: ServicePoint[]; total: number }> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const points: ServicePoint[] = [];
  let total = 0;

  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]!, {
      defval: "",
    });
    for (const [i, row] of rows.entries()) {
      total += 1;
      const keys = Object.keys(row);
      const pick = (...frags: string[]) => {
        for (const frag of frags) {
          const k = keys.find((key) => norm(key).replace(/\s+/g, " ").includes(frag));
          if (k) return row[k];
        }
        return undefined;
      };
      const sp = normalizeSp(pick("SP", "RODOVIA"));
      const kmInicial = toNumber(pick("KM INICIAL", "KM INICIO", "KM"));
      if (!sp || kmInicial === null) continue;
      
      let loc = interpolateLocation(byRoad, sp, kmInicial);
      if (!loc) continue;

      if (mesh && mesh.length > 0) {
        loc = snapPointToRoad(loc.lat, loc.lon, sp, mesh);
      }

      const kmFinal = toNumber(pick("KM FINAL"));
      let segmentCoords =
        kmFinal !== null && kmFinal !== kmInicial
          ? interpolateSegment(byRoad, sp, kmInicial, kmFinal)
          : undefined;

      if (segmentCoords && mesh && mesh.length > 0) {
        segmentCoords = segmentCoords.map(([lat, lon]) => {
          const s = snapPointToRoad(lat, lon, sp, mesh);
          return [s.lat, s.lon] as [number, number];
        });
      }

      const descricao = String(pick("DESCRICAO", "SERVICO", "DESCRIÇÃO") ?? "").trim();
      const data = parseDate(pick("DATA"));
      const quantidade = String(
        pick(
          "QNTD ( FINAL )",
          "QNTD (FINAL)",
          "QNTD FINAL",
          "QUANTIDADE FINAL",
          "QTD (FINAL)",
          "QTD FINAL",
          "QNTD",
          "QUANTIDADE",
          "QTD",
          "QTDE",
          "QTD.",
          "QUANT"
        ) ?? ""
      ).trim();
      const sentido = String(pick("SENTIDO", "SENT", "PISTA", "FAIXA", "LADO") ?? "").trim();
      const comprimento = String(pick("COMPRIMENTO", "COMPR", "COMP", "EXTENSAO", "EXTENSÃO") ?? "").trim();
      const largura = String(pick("LARGURA", "LARG") ?? "").trim();
      const altEsp = String(pick("ALTURA", "ALT", "ESPESSURA", "ESP", "ESP. (CM)", "ESP (CM)", "ESP (M)", "ESP.(M)", "ALT. OU ESP.", "ALT/ESP") ?? "").trim();
      const rc = String(pick("RC", "Nº RC", "NO RC", "NUMERO RC", "REGISTRO RC", "RC N") ?? "").trim();

      const corVal = pick("COR", "CORES", "COR DA BOLINHA", "COR BOLINHA", "COR MARCADOR") ?? (keys[10] ? row[keys[10]] : undefined);
      const customColors = parseCustomColor(corVal);

      points.push({
        id: `${sheetName}-${i}`,
        sp,
        kmInicial,
        kmFinal,
        descricao: descricao || "Serviço sem descrição",
        data,
        quantidade,
        sentido: sentido || undefined,
        comprimento: comprimento || undefined,
        largura: largura || undefined,
        altEsp: altEsp || undefined,
        rc: rc || undefined,
        corFundo: customColors?.corFundo,
        corTexto: customColors?.corTexto,
        lat: loc.lat,
        lon: loc.lon,
        segmentCoords: segmentCoords && segmentCoords.length > 1 ? segmentCoords : undefined,
        layer: classifyLayer(descricao),
        status: classifyStatus(data),
      });
    }
  }
  return { points, total };
}