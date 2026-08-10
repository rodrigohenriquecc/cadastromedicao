import { memo, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import { MapPin, Camera, RadioTower, Construction, Calendar, Ruler, Layers } from "lucide-react";
import type { BiPoint, MeshLine, ServicePoint, StatusKey } from "@/lib/cgr-types";
import { REGION_STYLE, type Regions } from "@/lib/cgr-shapes";
import { calculateKmFromLocation, formatKmBR } from "@/lib/cgr-data";

const STATUS_COLOR: Record<StatusKey, string> = {
  atual: "#2563eb",
  vencido: "#dc2626",
  sem: "#111827",
};

const LAYER_ICON = {
  fresa: MapPin,
  cameras: Camera,
  sensores: RadioTower,
  obras: Construction,
} as const;

const iconCache = new Map<string, L.DivIcon>();

function markerIcon(point: ServicePoint) {
  const bgColor = point.corFundo || STATUS_COLOR[point.status];
  const textColor = point.corTexto || "#ffffff";
  const key = `${point.layer}-${point.status}-${bgColor}-${textColor}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  
  const html = `<span style="display:block;width:12px;height:12px;border-radius:9999px;background:${bgColor};border:1.5px solid rgba(255,255,255,0.95);box-shadow:0 1px 4px rgba(15,23,42,0.35);transition:transform 0.15s ease;"></span>`;

  const icon = L.divIcon({
    html,
    className: "cgr-marker",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6],
  });
  iconCache.set(key, icon);
  return icon;
}

export type FitTarget = { bounds: [number, number][]; nonce: number };

function FitBounds({ target }: { target: FitTarget | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target || target.bounds.length === 0) return;
    map.fitBounds(L.latLngBounds(target.bounds.map(([lat, lon]) => L.latLng(lat, lon))), {
      padding: [80, 80],
      maxZoom: 15,
      animate: true,
    });
  }, [target, map]);
  return null;
}

const dateFmt = new Intl.DateTimeFormat("pt-BR");

function MapView({
  points,
  mesh,
  target,
  regions,
  byRoad,
}: {
  points: ServicePoint[];
  mesh: MeshLine[];
  target: FitTarget | null;
  regions: Regions | null;
  byRoad?: Map<string, BiPoint[]>;
}) {
  const [clickedInfo, setClickedInfo] = useState<{
    sp: string;
    km: number | null;
    lat: number;
    lon: number;
  } | null>(null);

  return (
    <div className="relative h-[100dvh] w-full">
      <MapContainer
        center={[-23.5, -47.6]}
        zoom={8}
        zoomControl={false}
        touchZoom={true}
        dragging={true}
        doubleClickZoom={true}
        bounceAtZoom={true}
        className="h-[100dvh] w-full"
        preferCanvas
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | DR.02 Sistema Colaborativo'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="topright" />
        {regions && regions.features.length > 0 && (
          <GeoJSON key={regions.features.length} data={regions} style={() => ({ ...REGION_STYLE })} />
        )}
        <FitBounds target={target} />

        {/* Linhas das Rodovias com suporte a clique e identificação do Km aproximado */}
        {mesh.map((line, idx) => (
          <Polyline
            key={`mesh-${idx}`}
            positions={line.coords}
            pathOptions={{ color: "#1e3a8a", weight: 5, opacity: 0.85 }}
            eventHandlers={{
              click: (e) => {
                const lat = e.latlng.lat;
                const lon = e.latlng.lng;
                const km = byRoad ? calculateKmFromLocation(byRoad, line.name, lat, lon) : null;
                setClickedInfo({
                  sp: line.name || "Rodovia",
                  km,
                  lat,
                  lon,
                });
              },
            }}
          />
        ))}

        {points.map(
          (point) =>
            point.segmentCoords &&
            point.segmentCoords.length > 1 && (
              <Polyline
                key={`segment-${point.id}`}
                positions={point.segmentCoords}
                pathOptions={{
                  color: point.corFundo || STATUS_COLOR[point.status],
                  weight: 6,
                  opacity: 0.8,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            ),
        )}

        {/* Card (balãozinho) de Km aproximado ao clicar em qualquer ponto da rodovia */}
        {clickedInfo && (
          <Popup
            position={[clickedInfo.lat, clickedInfo.lon]}
            onClose={() => setClickedInfo(null)}
            className="cgr-popup"
          >
            <div className="min-w-44 space-y-1.5 font-sans p-1 text-center">
              <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-xs font-bold text-blue-900 border border-blue-300">
                  {clickedInfo.sp}
                </span>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  Ponto de Clique
                </span>
              </div>
              <div className="py-1">
                <p className="text-xs text-muted-foreground font-medium">Quilometragem Aproximada:</p>
                <p className="text-lg font-extrabold text-slate-900 tracking-tight">
                  {clickedInfo.km !== null ? `Km ${formatKmBR(clickedInfo.km)}` : "Km Indisponível"}
                </p>
              </div>
              <p className="text-[10px] text-slate-400 border-t pt-1">
                Calculado via Referenciamento Linear
              </p>
            </div>
          </Popup>
        )}

        {points.map((point) => (
          <Marker key={point.id} position={[point.lat, point.lon]} icon={markerIcon(point)}>
            <Popup className="cgr-popup">
              <div className="min-w-56 space-y-2 font-sans">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                      {point.sp}
                    </p>
                    {point.rc && (
                      <span className="rounded bg-teal-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-teal-900 border border-teal-300">
                        RC: {point.rc}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold leading-snug text-foreground">
                    {point.descricao}
                  </p>
                </div>
                <dl className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar size={13} />
                    <span>{point.data ? dateFmt.format(point.data) : "Sem data registrada"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ruler size={13} />
                    <span>
                      Km {formatKmBR(point.kmInicial)}
                      {point.kmFinal !== null ? ` → ${formatKmBR(point.kmFinal)}` : ""}
                    </span>
                  </div>
                  {point.sentido && (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[10px] uppercase text-slate-500">Sentido:</span>
                      <span>{point.sentido}</span>
                    </div>
                  )}
                  {(point.comprimento || point.largura || point.altEsp) && (
                    <div className="text-[11px] text-slate-600">
                      Dim: {[point.comprimento && `Comp: ${point.comprimento}`, point.largura && `Larg: ${point.largura}`, point.altEsp && `Alt/Esp: ${point.altEsp}`].filter(Boolean).join(" | ")}
                    </div>
                  )}
                  {point.quantidade && (
                    <div className="flex items-center gap-2">
                      <Layers size={13} />
                      <span>Qntd (final): {point.quantidade}</span>
                    </div>
                  )}
                </dl>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default memo(MapView);