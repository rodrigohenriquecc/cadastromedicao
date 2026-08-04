declare module "shpjs" {
  import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
  const shp: (
    source: string | ArrayBuffer,
  ) => Promise<
    | FeatureCollection<Geometry, GeoJsonProperties>
    | FeatureCollection<Geometry, GeoJsonProperties>[]
  >;
  export default shp;
}