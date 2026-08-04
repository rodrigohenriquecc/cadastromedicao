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

const toNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v ?? "").trim();
  if (!s) return null;
  const cleaned = s.replace(/\s/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number(cleaned);
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

export async function parseCmWorkbook(
  buffer: ArrayBuffer,
  byRoad: Map<string, BiPoint[]>,
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
      const match = findNearest(byRoad, sp, kmInicial);
      if (!match) continue;
      const descricao = String(pick("DESCRICAO", "SERVICO", "DESCRIÇÃO") ?? "").trim();
      const data = parseDate(pick("DATA"));
      points.push({
        id: `${sheetName}-${i}`,
        sp,
        kmInicial,
        kmFinal: toNumber(pick("KM FINAL")),
        descricao: descricao || "Serviço sem descrição",
        data,
        quantidade: String(pick("QNTD", "QUANTIDADE", "QTD") ?? "").trim(),
        lat: match.lat,
        lon: match.lon,
        layer: classifyLayer(descricao),
        status: classifyStatus(data),
      });
    }
  }
  return { points, total };
}