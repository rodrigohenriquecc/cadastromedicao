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

export const formatKmBR = (km: number | null | undefined): string => {
  if (km === null || km === undefined || !Number.isFinite(km)) return "-";
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
    const firstBi = biList[0];
    const lastBi = biList[biList.length - 1];
    if (!firstBi || !lastBi) continue;
    const minKm = firstBi.km;
    const maxKm = lastBi.km;
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

  const first = list[0];
  const last = list[list.length - 1];
  if (!first || !last) return null;

  if (km <= first.km) {
    return { lat: first.lat, lon: first.lon };
  }
  if (km >= last.km) {
    return { lat: last.lat, lon: last.lon };
  }

  for (let i = 0; i < list.length - 1; i++) {
    const p1 = list[i];
    const p2 = list[i + 1];
    if (!p1 || !p2) continue;

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

  return { lat: first.lat, lon: first.lon };
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

export function snapSegmentToMesh(
  sp: string,
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  mesh: MeshLine[],
  fallbackCoords?: [number, number][],
): [number, number][] {
  if (!mesh || mesh.length === 0) return fallbackCoords || [[startLat, startLon], [endLat, endLon]];

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

  let bestLine: MeshLine | null = null;
  let bestStartIdx = -1;
  let bestEndIdx = -1;
  let bestStartProj: [number, number] = [startLat, startLon];
  let bestEndProj: [number, number] = [endLat, endLon];
  let minTotalDistSq = Infinity;

  for (const line of candidateLines) {
    const coords = line.coords;
    if (!coords || coords.length < 2) continue;

    let minStartDistSq = Infinity;
    let lineStartIdx = -1;
    let lineStartProj: [number, number] = [startLat, startLon];

    let minEndDistSq = Infinity;
    let lineEndIdx = -1;
    let lineEndProj: [number, number] = [endLat, endLon];

    for (let i = 0; i < coords.length - 1; i++) {
      const ptA = coords[i];
      const ptB = coords[i + 1];
      if (!ptA || !ptB) continue;
      const [latA, lonA] = ptA;
      const [latB, lonB] = ptB;

      const dLat = latB - latA;
      const dLon = lonB - lonA;
      const lenSq = dLat * dLat + dLon * dLon;
      if (lenSq === 0) continue;

      const tStart = Math.max(0, Math.min(1, ((startLat - latA) * dLat + (startLon - lonA) * dLon) / lenSq));
      const projStartLat = latA + tStart * dLat;
      const projStartLon = lonA + tStart * dLon;
      const distStartSq = (startLat - projStartLat) ** 2 + (startLon - projStartLon) ** 2;

      if (distStartSq < minStartDistSq) {
        minStartDistSq = distStartSq;
        lineStartIdx = i;
        lineStartProj = [projStartLat, projStartLon];
      }

      const tEnd = Math.max(0, Math.min(1, ((endLat - latA) * dLat + (endLon - lonA) * dLon) / lenSq));
      const projEndLat = latA + tEnd * dLat;
      const projEndLon = lonA + tEnd * dLon;
      const distEndSq = (endLat - projEndLat) ** 2 + (endLon - projEndLon) ** 2;

      if (distEndSq < minEndDistSq) {
        minEndDistSq = distEndSq;
        lineEndIdx = i;
        lineEndProj = [projEndLat, projEndLon];
      }
    }

    const totalDistSq = minStartDistSq + minEndDistSq;
    if (totalDistSq < minTotalDistSq) {
      minTotalDistSq = totalDistSq;
      bestLine = line;
      bestStartIdx = lineStartIdx;
      bestEndIdx = lineEndIdx;
      bestStartProj = lineStartProj;
      bestEndProj = lineEndProj;
    }
  }

  if (!bestLine || minTotalDistSq > 0.05 || bestStartIdx === -1 || bestEndIdx === -1) {
    return fallbackCoords || [[startLat, startLon], [endLat, endLon]];
  }

  const coords = bestLine.coords;
  const result: [number, number][] = [bestStartProj];

  if (bestStartIdx === bestEndIdx) {
    result.push(bestEndProj);
  } else if (bestStartIdx < bestEndIdx) {
    for (let k = bestStartIdx + 1; k <= bestEndIdx; k++) {
      const pt = coords[k];
      if (pt) result.push([pt[0], pt[1]]);
    }
    result.push(bestEndProj);
  } else {
    for (let k = bestStartIdx; k > bestEndIdx; k--) {
      const pt = coords[k];
      if (pt) result.push([pt[0], pt[1]]);
    }
    result.push(bestEndProj);
  }

  const cleaned: [number, number][] = [];
  for (const pt of result) {
    if (cleaned.length === 0) {
      cleaned.push(pt);
    } else {
      const last = cleaned[cleaned.length - 1]!;
      const dist = Math.abs(pt[0] - last[0]) + Math.abs(pt[1] - last[1]);
      if (dist > 0.000001) {
        cleaned.push(pt);
      }
    }
  }

  return cleaned.length > 1 ? cleaned : (fallbackCoords || [[startLat, startLon], [endLat, endLon]]);
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
      const ptA = coords[i];
      const ptB = coords[i + 1];
      if (!ptA || !ptB) continue;
      const [latA, lonA] = ptA;
      const [latB, lonB] = ptB;

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
  const firstPt = list[0];
  if (!firstPt) return null;
  if (list.length === 1) return firstPt.km;

  let minDistanceSq = Infinity;
  let bestKm = firstPt.km;

  for (let i = 0; i < list.length - 1; i++) {
    const p1 = list[i];
    const p2 = list[i + 1];
    if (!p1 || !p2) continue;

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

export const COLOR_MAP: Record<string, string> = {
  vermelho: "#ef4444",
  vermelha: "#ef4444",
  red: "#ef4444",

  verde: "#32CD32",
  "verde limao": "#32CD32",
  "verde limão": "#32CD32",
  "verde-limao": "#32CD32",
  "verde escuro": "#15803d",
  "verde-escuro": "#15803d",
  "verde claro": "#4ade80",
  "verde-claro": "#4ade80",
  green: "#32CD32",

  azul: "#3b82f6",
  "azul escuro": "#1e3a8a",
  "azul-escuro": "#1e3a8a",
  "azul claro": "#38bdf8",
  "azul-claro": "#38bdf8",
  blue: "#3b82f6",

  amarelo: "#eab308",
  amarela: "#eab308",
  yellow: "#eab308",

  laranja: "#f97316",
  orange: "#f97316",

  preto: "#1e293b",
  preta: "#1e293b",
  black: "#1e293b",

  cinza: "#64748b",
  gray: "#64748b",
  grey: "#64748b",

  roxo: "#a855f7",
  roxa: "#a855f7",
  violeta: "#7c3aed",
  purple: "#a855f7",

  rosa: "#ec4899",
  pink: "#ec4899",

  marrom: "#78350f",
  brown: "#78350f",

  branco: "#ffffff",
  branca: "#ffffff",
  white: "#ffffff",

  ciano: "#06b6d4",
  turquesa: "#14b8a6",
  dourado: "#d97706",
};

export function resolveColorName(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return "blue";
  if (COLOR_MAP[s]) return COLOR_MAP[s]!;
  
  const normalized = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (COLOR_MAP[normalized]) return COLOR_MAP[normalized]!;

  if (s.startsWith("#") || /^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) {
    return s.startsWith("#") ? s : `#${s}`;
  }
  return raw.trim();
}

function parseSingleColor(raw: string): { bg?: string; text?: string } | null {
  const s = raw.trim();
  if (!s) return null;
  const bg = resolveColorName(s);
  return { bg, text: "#ffffff" };
}

export function parseCustomColor(val: unknown): { corFundo?: string | undefined; corTexto?: string | undefined } | null {
  const str = String(val ?? "").trim();
  if (!str) return null;

  const parts = str.split(/[/,;:-]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const p0 = parts[0] ?? "";
    const p1 = parts[1] ?? "";
    const bgObj = parseSingleColor(p0);
    const textObj = parseSingleColor(p1);
    return {
      corFundo: bgObj?.bg || resolveColorName(p0) || undefined,
      corTexto: textObj?.bg || resolveColorName(p1) || undefined,
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
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
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
      if (!sp || kmInicial === null || !Number.isFinite(kmInicial)) continue;
      
      let loc = interpolateLocation(byRoad, sp, kmInicial);
      if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lon)) continue;

      if (mesh && mesh.length > 0) {
        loc = snapPointToRoad(loc.lat, loc.lon, sp, mesh);
      }
      if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lon)) continue;

      const kmFinalRaw = toNumber(pick("KM FINAL", "KM FIN", "KM_FINAL", "KM F", "KM-FINAL", "KMFINAL"));
      const isDifferentKm = kmFinalRaw !== null && Number.isFinite(kmFinalRaw) && Math.abs(kmFinalRaw - kmInicial) >= 0.001;
      const kmFinal = isDifferentKm ? kmFinalRaw : kmInicial;

      let segmentCoords = isDifferentKm
        ? interpolateSegment(byRoad, sp, kmInicial, kmFinal)
        : undefined;

      if (segmentCoords && segmentCoords.length > 1 && mesh && mesh.length > 0) {
        const firstPt = segmentCoords[0]!;
        const lastPt = segmentCoords[segmentCoords.length - 1]!;
        segmentCoords = snapSegmentToMesh(sp, firstPt[0], firstPt[1], lastPt[0], lastPt[1], mesh, segmentCoords);
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

      const k10 = keys[10];
      const corVal = pick("COR", "CORES", "COR DA BOLINHA", "COR BOLINHA", "COR MARCADOR") ?? (k10 ? row[k10] : undefined);
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
        corFundo: customColors?.corFundo ?? undefined,
        corTexto: customColors?.corTexto ?? undefined,
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