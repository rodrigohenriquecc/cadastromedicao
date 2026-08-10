import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";

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

  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const parsed = await shp(await res.arrayBuffer());
        for (const fc of Array.isArray(parsed) ? parsed : [parsed]) {
          if (fc?.features?.length) features.push(...fc.features);
        }
      } catch {
        /* ignora shapefile inválido */
      }
    }),
  );

  return { type: "FeatureCollection", features };
}

export const REGION_STYLE = {
  color: "#3b82f6",
  weight: 1.5,
  opacity: 0.4,
  fillOpacity: 0.04,
} as const;