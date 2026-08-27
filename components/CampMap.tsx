"use client";

import {
  LeafletContext,
  createLeafletContext,
  type LeafletContextInterface,
} from "@react-leaflet/core";
import L from "leaflet";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { isPrivateCamp, type Campground } from "@/types/camp";

/** パン可能な最大範囲（端のキャンプ場を中央へ寄せられるよう余裕を持たせる） */
const MAP_MAX_BOUNDS = L.latLngBounds(
  [34.5, 139.0], // 南西
  [36.3, 141.5], // 北東
);

const BOSO_CENTER: [number, number] = [35.35, 140.3];

const NOTE_LABELS: { key: keyof Campground["notes"]; label: string }[] = [
  { key: "pet", label: "ペット" },
  { key: "fire", label: "直火" },
  { key: "sauna", label: "サウナ" },
  { key: "facility", label: "施設" },
  { key: "price", label: "料金" },
];

type LeafletDom = HTMLElement & { _leaflet_id?: number };

function isMapUsable(map: L.Map) {
  const container = map.getContainer?.();
  return Boolean(container?.isConnected && map.getPane("mapPane"));
}

/**
 * react-leaflet の MapContainer は callback ref で二重初期化しがちなので、
 * マウント/アンマウント時にインスタンスを自前で破棄する。
 */
function SafeMapContainer({ children }: { children: ReactNode }) {
  const mapRef = useRef<L.Map | null>(null);
  const [context, setContext] = useState<LeafletContextInterface | null>(null);

  const setNode = useCallback((node: HTMLDivElement | null) => {
    if (node === null) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setContext(null);
      }
      return;
    }

    if (mapRef.current) return;

    delete (node as LeafletDom)._leaflet_id;
    node.replaceChildren();

    const map = L.map(node, {
      center: BOSO_CENTER,
      zoom: 10,
      minZoom: 8,
      maxZoom: 16,
      maxBounds: MAP_MAX_BOUNDS,
      maxBoundsViscosity: 0.6,
      scrollWheelZoom: true,
    });
    mapRef.current = map;
    setContext(createLeafletContext(map));
  }, []);

  return (
    <div ref={setNode} className="h-full w-full">
      {context ? (
        <LeafletContext value={context}>{children}</LeafletContext>
      ) : null}
    </div>
  );
}

function FitAllCamps({ camps }: { camps: Campground[] }) {
  const map = useMap();
  const positionsKey = camps
    .map((camp) => `${camp.id}:${camp.lat},${camp.lng}`)
    .join("|");

  useEffect(() => {
    if (camps.length === 0) return;

    const fit = () => {
      if (!isMapUsable(map)) return;
      const bounds = L.latLngBounds(
        camps.map((camp) => [camp.lat, camp.lng] as L.LatLngTuple),
      );
      map.fitBounds(bounds, {
        padding: [48, 48],
        maxZoom: 11,
        animate: false,
      });
      map.setMinZoom(Math.min(map.getZoom(), 8));
    };

    if (isMapUsable(map)) {
      fit();
      return;
    }

    map.whenReady(fit);
  }, [map, camps, positionsKey]);

  return null;
}

function RecenterOnPopup() {
  const map = useMap();

  useEffect(() => {
    function onPopupOpen(event: L.PopupEvent) {
      if (!isMapUsable(map)) return;
      const latlng = event.popup.getLatLng();
      if (!latlng) return;

      const point = map.project(latlng);
      point.y -= 96;
      map.panTo(map.unproject(point), { animate: true, duration: 0.45 });
    }

    map.on("popupopen", onPopupOpen);
    return () => {
      map.off("popupopen", onPopupOpen);
    };
  }, [map]);

  return null;
}

type CampMapProps = {
  camps: Campground[];
  allCamps: Campground[];
};

const PIN_SIZE = { iconSize: [44, 54] as [number, number], iconAnchor: [22, 50] as [number, number], popupAnchor: [0, -42] as [number, number] };

const COMMERCIAL_PIN_SVG = `
<svg viewBox="0 0 44 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M16 37.5 22 51 28 37.5Z" fill="#fff"/>
  <circle cx="22" cy="21" r="18.2" fill="#fff" stroke="#d4d9d4" stroke-width="1.15"/>
  <path fill="#43a047" d="M15.8 15.2 28.6 14.2 32.8 31.6 22.6 31.6Z"/>
  <path fill="#2e7d32" d="M15.8 15.2 22.6 31.6 8.4 31.6Z"/>
  <path fill="#1b5e20" d="M15.8 20.2 20.4 31.6 11.4 31.6Z"/>
  <path fill="none" stroke="#174a1c" stroke-width="0.75" d="M13.4 22.2v8.2M15.8 21.2v10.4M18 23v7.6"/>
  <path fill="#f4a259" d="M26.8 8.4c1.7.3 2.9 1.7 2.9 3.4 0 1.9-1.5 3.3-3.4 3.3-.4 0-.8 0-1.1-.2 1-.4 1.7-1.4 1.7-2.5 0-1.5-1.1-2.7-2.6-3 .7-.7 1.5-1 2.5-1z"/>
  <path fill="#f7c948" d="M26.3 9.8c1 .2 1.8 1 1.8 2.1 0 1.1-.9 2-2 2.1.6-.3 1-.9 1-1.7 0-1-.7-1.7-1.5-2 .2-.3.4-.5.7-.5z"/>
</svg>
`;

const PRIVATE_PIN_SVG = `
<svg viewBox="0 0 44 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M16 37.5 22 51 28 37.5Z" fill="#fff"/>
  <circle cx="22" cy="21" r="18.2" fill="#fff" stroke="#d4d9d4" stroke-width="1.15"/>
  <path fill="#43a047" d="M31.6 16.2c.1 1.6-.7 2.5-.6 3.8.1 1.2 1 1.9 2 1.9 1.5 0 2.6-1.5 2.6-3.1 0-1.7-1.2-2.6-1.7-3.8-.2.9-1.2 1-2.3 1.2z"/>
  <path fill="#e09b2d" d="M22 12.4 34.2 23.6H9.8z"/>
  <path fill="#f0b54a" d="M13.2 23.2h17.6v11.2H13.2z"/>
  <path fill="#fff" d="M19.4 27.6h5.2v6.8h-5.2z"/>
  <path fill="#c47a22" d="M20.8 30.2h2.4v1.2h-2.4z"/>
</svg>
`;

export default function CampMap({ camps, allCamps }: CampMapProps) {
  const icons = useMemo(
    () => ({
      camp: L.divIcon({
        className: "camp-pin",
        html: `<span class="camp-pin__mark">${COMMERCIAL_PIN_SVG}</span>`,
        ...PIN_SIZE,
      }),
      private: L.divIcon({
        className: "camp-pin",
        html: `<span class="camp-pin__mark">${PRIVATE_PIN_SVG}</span>`,
        ...PIN_SIZE,
      }),
    }),
    [],
  );

  return (
    <SafeMapContainer>
      <FitAllCamps camps={allCamps} />
      <RecenterOnPopup />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {camps.map((camp) => {
        const privateSite = isPrivateCamp(camp);
        return (
          <Marker
            key={`${camp.id}:${camp.lat},${camp.lng}`}
            position={[camp.lat, camp.lng]}
            icon={privateSite ? icons.private : icons.camp}
          >
            <Popup
              minWidth={300}
              maxWidth={320}
              autoPan
              autoPanPadding={[48, 72]}
              keepInView
              className="camp-popup-wrap"
            >
              <article className="camp-popup">
                <img
                  className="camp-popup__photo"
                  src={camp.imageUrl}
                  alt={camp.name}
                />
                <div className="camp-popup__body">
                  <p
                    className={
                      privateSite
                        ? "camp-popup__badge camp-popup__badge--private"
                        : "camp-popup__badge camp-popup__badge--commercial"
                    }
                  >
                    {privateSite ? "【個人貸し・お庭】" : "【商業キャンプ場】"}
                  </p>
                  <p className="camp-popup__area">{camp.area}</p>
                  <h3 className="camp-popup__title">{camp.name}</h3>
                  <p className="camp-popup__desc">{camp.catchCopy}</p>
                  <div className="camp-popup__tags">
                    {camp.tags.map((tag) => (
                      <span key={tag} className="camp-popup__tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <dl className="camp-popup__notes">
                    {NOTE_LABELS.map(({ key, label }) => {
                      const value = camp.notes[key];
                      if (!value) return null;
                      return (
                        <div key={key}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      );
                    })}
                  </dl>
                  <a
                    className="camp-popup__link"
                    href={camp.hpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {camp.id === "private-001" ? "予約する" : "公式HPへ行く"}
                  </a>
                </div>
              </article>
            </Popup>
          </Marker>
        );
      })}
    </SafeMapContainer>
  );
}
