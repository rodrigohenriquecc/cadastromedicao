import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";

const getBaseUrl = () => (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export const SHAPEFILE_URLS = [
  "/data/shapefiles/RC_2.1.zip",
  "/data/shapefiles/RC_2.2.zip",
  "/data/shapefiles/RC_2.4.zip",
  "/data/shapefiles/RC_2.5.zip",
  "/data/shapefiles/RC_2.6_2.8.zip",
  "/data/shapefiles/RC_2.7.zip",
];

export type Regions = FeatureCollection<Geometry, GeoJsonProperties>;

export async function loadShapefiles(urls = SHAPEFILE_URLS): Promise<Regions> {
  const shp = (await import("shpjs")).default;
  const features: Regions["features"] = [];
  const base = getBaseUrl();

  await Promise.all(
    urls.map(async (rawUrl) => {
      try {
        const url =
          rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
            ? rawUrl
            : rawUrl.startsWith(base)
              ? rawUrl
              : `${base}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`[cgr-shapes] Falha ao carregar ${url}: status ${res.status}`);
          return;
        }
        const parsed = await shp(await res.arrayBuffer());
        for (const fc of Array.isArray(parsed) ? parsed : [parsed]) {
          if (fc?.features?.length) features.push(...fc.features);
        }
      } catch (err) {
        console.error(`[cgr-shapes] Erro ao processar shapefile ${rawUrl}:`, err);
      }
    }),
  );

  return { type: "FeatureCollection", features };
}

export const REGION_STYLE = {
  color: "#3b82f6",
  weight: 2,
  opacity: 0.65,
  fillOpacity: 0.29,
} as const;