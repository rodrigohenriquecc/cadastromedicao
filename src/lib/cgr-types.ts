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
  sentido?: string | undefined;
  comprimento?: string | undefined;
  largura?: string | undefined;
  altEsp?: string | undefined;
  rc?: string | undefined;
  lat: number;
  lon: number;
  segmentCoords?: [number, number][] | undefined;
  layer: LayerKey;
  status: StatusKey;
  corFundo?: string | undefined;
  corTexto?: string | undefined;
};

export type MeshLine = { coords: [number, number][]; name: string };