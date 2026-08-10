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
  sentido?: string;
  comprimento?: string;
  largura?: string;
  altEsp?: string;
  rc?: string;
  lat: number;
  lon: number;
  segmentCoords?: [number, number][];
  layer: LayerKey;
  status: StatusKey;
  corFundo?: string;
  corTexto?: string;
};

export type MeshLine = { coords: [number, number][]; name: string };