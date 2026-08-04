import { memo, useEffect, useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
import MarkerClusterGroup from "react-leaflet-cluster";
import { MapPin, Camera, RadioTower, Construction, Calendar, Ruler, Layers } from "lucide-react";
import type { MeshLine, ServicePoint, StatusKey } from "@/lib/cgr-types";
import { REGION_STYLE, type Regions } from "@/lib/cgr-shapes";

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
  const key = `${point.layer}-${point.status}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const Glyph = LAYER_ICON[point.layer];
  const color = STATUS_COLOR[point.status];
  const html = renderToStaticMarkup(
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
        borderRadius: 9999,
        background: color,
        border: "2px solid rgba(255,255,255,0.9)",
        boxShadow: "0 4px 10px rgba(15,23,42,0.35)",
        color: "#fff",
      }}
    >
      <Glyph size={14} strokeWidth={2.4} />
    </span>,
  );
  const icon = L.divIcon({
    html,
    className: "cgr-marker",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -12],
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
}: {
  points: ServicePoint[];
  mesh: MeshLine[];
  target: FitTarget | null;
  regions: Regions | null;
}) {
  const meshPositions = useMemo(() => mesh.map((line) => line.coords), [mesh]);

  return (
    <MapContainer
      center={[-23.5, -47.6]}
      zoom={8}
      zoomControl={false}
      className="h-screen w-screen"
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
      {meshPositions.length > 0 && (
        <Polyline
          positions={meshPositions}
          pathOptions={{ color: "#1e3a8a", weight: 3, opacity: 0.9 }}
        />
      )}
      <MarkerClusterGroup chunkedLoading maxClusterRadius={60} showCoverageOnHover={false}>
      {points.map((point) => (
        <Marker key={point.id} position={[point.lat, point.lon]} icon={markerIcon(point)}>
          <Popup className="cgr-popup">
            <div className="min-w-56 space-y-2 font-sans">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                  {point.sp}
                </p>
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
                    Km {point.kmInicial.toFixed(3)}
                    {point.kmFinal !== null ? ` → ${point.kmFinal.toFixed(3)}` : ""}
                  </span>
                </div>
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
      </MarkerClusterGroup>
    </MapContainer>
  );
}

export default memo(MapView);