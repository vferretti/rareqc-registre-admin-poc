import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/base/ui/dialog";

/** Single participant marker — matches cluster style. */
const singleMarkerIcon = L.divIcon({
  html: `<div style="
    background: hsl(210 80% 50%);
    color: white;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    border: 3px solid hsl(210 80% 70%);
  ">1</div>`,
  className: "",
  iconSize: L.point(28, 28),
  iconAnchor: L.point(14, 14),
});

interface MapPoint {
  id: number;
  city: string;
  latitude: number;
  longitude: number;
}

/** Custom cluster icon showing participant count. */
function createClusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  let size: "small" | "medium" | "large" = "small";
  if (count >= 100) size = "large";
  else if (count >= 10) size = "medium";

  const sizeMap = { small: 36, medium: 44, large: 52 };
  const px = sizeMap[size];

  return L.divIcon({
    html: `<div style="
      background: hsl(210 80% 50%);
      color: white;
      border-radius: 50%;
      width: ${px}px;
      height: ${px}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size === "large" ? 14 : 12}px;
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      border: 3px solid hsl(210 80% 70%);
    ">${count}</div>`,
    className: "",
    iconSize: L.point(px, px),
  });
}

/** Fits the map to participant bounds after the dialog opens. */
function FitToPoints({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (points.length > 0) {
        const bounds = L.latLngBounds(
          points.map((p) => [p.latitude, p.longitude]),
        );
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [map, points]);

  // Also invalidate on container resize
  useEffect(() => {
    const container = map.getContainer().parentElement;
    if (!container) return;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

// Default center (Quebec) used before points load
const QUEBEC_CENTER: L.LatLngExpression = [47.0, -71.5];

interface ParticipantMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ParticipantMapDialog({
  open,
  onOpenChange,
}: ParticipantMapDialogProps) {
  const { t } = useTranslation();
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const fetchPoints = async () => {
      setIsLoading(true);
      try {
        const res = await api.get("/map/participants");
        if (!cancelled) setPoints(res.data);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchPoints();
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !flex-col max-w-[90vw] w-[70vw] h-[75vh] p-0 gap-0 resize overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-3">
            {t("map.title")}
            <span className="text-xs font-normal text-muted-foreground">
              {isLoading
                ? t("common.loading")
                : t("map.participant_count", { count: points.length })}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {open && (
            <MapContainer
              center={QUEBEC_CENTER}
              zoom={6}
              className="h-full w-full"
              scrollWheelZoom={true}
              minZoom={5}
            >
              <FitToPoints points={points} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png"
                tileSize={512}
                zoomOffset={-1}
              />
              <MarkerClusterGroup
                chunkedLoading
                iconCreateFunction={createClusterIcon}
                maxClusterRadius={60}
                spiderfyOnMaxZoom
                showCoverageOnHover={false}
              >
                {points.map((p) => (
                  <Marker
                    key={p.id}
                    position={[p.latitude, p.longitude]}
                    icon={singleMarkerIcon}
                  >
                    <Popup>
                      <div className="text-sm">{p.city}</div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
