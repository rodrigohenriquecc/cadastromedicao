export type BiPoint = { sp: string; km: number; lat: number; lon: number };

export type LayerKey = "fresa" | "cameras" | "sensores" | "obras";

export type StatusKey = "atual" | "vencido" | "sem";

export type ServicePoint = {
  id: string;
  sp: string;
  kmInicial: number;
  kmFinal: number | null;
  descricao: string;
  data: Date | null;
  quantidade: string;
  lat: number;
  lon: number;
  layer: LayerKey;
  status: StatusKey;
};

export type MeshLine = { coords: [number, number][]; name: string };