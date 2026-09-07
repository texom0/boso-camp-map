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
import {
  isEnecaCamp,
  isPrivateCamp,
  type Campground,
} from "@/types/camp";

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
      closePopupOnClick: true,
      scrollWheelZoom: true,
      // iOS で touchend に preventDefault が付き、リンクの click が消えるのを防ぐ
      tapHold: false,
    });
    mapRef.current = map;
    setContext(createLeafletContext(map));
  }, []);

  return (
    <div className="camp-map-host">
      <div ref={setNode} className="camp-map-host__canvas" />
      {context ? (
        <LeafletContext value={context}>{children}</LeafletContext>
      ) : null}
    </div>
  );
}

function stopMapGesture(event: Event) {
  event.stopPropagation();
  if ("stopImmediatePropagation" in event) {
    event.stopImmediatePropagation();
  }
  L.DomEvent.stopPropagation(event);
}

/**
 * Leaflet は popup 上の touchstart を stopPropagation するため、
 * React のルート委譲まで届かない。ネイティブリスナーで遷移させる。
 */
function CampPopupLink({ href, label }: { href: string; label: string }) {
  const linkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const node = linkRef.current;
    if (!node || !href) return;

    let lastOpen = 0;
    const open = (event: Event) => {
      event.preventDefault();
      stopMapGesture(event);
      const now = Date.now();
      if (now - lastOpen < 700) return;
      lastOpen = now;
      const opened = window.open(href, "_blank", "noopener,noreferrer");
      if (opened == null) {
        window.location.assign(href);
      }
    };

    node.addEventListener("pointerdown", stopMapGesture, { capture: true });
    node.addEventListener("touchstart", stopMapGesture, { capture: true, passive: true });
    node.addEventListener("mousedown", stopMapGesture, { capture: true });
    node.addEventListener("click", open, { capture: true });
    node.addEventListener("pointerup", open, { capture: true });
    node.addEventListener("touchend", open, { capture: true });

    return () => {
      node.removeEventListener("pointerdown", stopMapGesture, { capture: true });
      node.removeEventListener("touchstart", stopMapGesture, { capture: true });
      node.removeEventListener("mousedown", stopMapGesture, { capture: true });
      node.removeEventListener("click", open, { capture: true });
      node.removeEventListener("pointerup", open, { capture: true });
      node.removeEventListener("touchend", open, { capture: true });
    };
  }, [href]);

  return (
    <a
      ref={linkRef}
      className="camp-popup__link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
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
      const container = event.popup.getElement();
      if (container) {
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
      }

      if (!isMapUsable(map)) return;
      const latlng = event.popup.getLatLng();
      if (!latlng) return;

      const point = map.project(latlng);
      const hasPhoto = Boolean(container?.querySelector(".camp-popup--eneca"));
      point.y -= hasPhoto ? 96 : 40;
      map.panTo(map.unproject(point), { animate: true, duration: 0.45 });
    }

    map.on("popupopen", onPopupOpen);
    return () => {
      map.off("popupopen", onPopupOpen);
    };
  }, [map]);

  return null;
}

function isInsidePopupBubble(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  const popup = target.closest(".leaflet-popup");
  return Boolean(popup && !popup.classList.contains("leaflet-popup-pane"));
}

function isMapChrome(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(".leaflet-control") ||
      target.closest(".camp-pin") ||
      target.closest(".leaflet-marker-icon"),
  );
}

/** 地図キャンバス／背景の click で選択中ポップアップを閉じる */
function ClosePopupOnMapClick({
  selectedCampId,
  onClearSelection,
}: {
  selectedCampId: string | null;
  onClearSelection: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    map.options.closePopupOnClick = true;
  }, [map]);

  useEffect(() => {
    if (selectedCampId === null) {
      map.closePopup();
    }
  }, [map, selectedCampId]);

  useEffect(() => {
    const dismiss = (target: EventTarget | null) => {
      if (isInsidePopupBubble(target) || isMapChrome(target)) return;
      onClearSelection();
      map.closePopup();
    };

    const onLeafletClick = (event: L.LeafletMouseEvent) => {
      dismiss(event.originalEvent.target);
    };

    const onCanvasClick = (event: Event) => {
      dismiss(event.target);
    };

    map.on("preclick", onLeafletClick);
    map.on("click", onLeafletClick);

    const canvas = map.getContainer();
    canvas.addEventListener("click", onCanvasClick);

    return () => {
      map.off("preclick", onLeafletClick);
      map.off("click", onLeafletClick);
      canvas.removeEventListener("click", onCanvasClick);
    };
  }, [map, onClearSelection]);

  return null;
}

type CampMapProps = {
  camps: Campground[];
  allCamps: Campground[];
};

function CampPopupCard({ camp }: { camp: Campground }) {
  const privateSite = isPrivateCamp(camp);
  const showEnecaPhoto = isEnecaCamp(camp);

  const body = (
    <div className="camp-popup__body">
      <span
        className={
          privateSite
            ? "camp-popup__badge camp-popup__badge--private"
            : "camp-popup__badge camp-popup__badge--commercial"
        }
      >
        {privateSite ? "【個人貸し・お庭】" : "【商業キャンプ場】"}
      </span>
      <div className="camp-popup__area">{camp.area}</div>
      <h3 className="camp-popup__title">{camp.name}</h3>
      {camp.catchCopy ? <p className="camp-popup__desc">{camp.catchCopy}</p> : null}
      {camp.tags.length > 0 ? (
        <div className="camp-popup__tags">
          {camp.tags.map((tag) => (
            <span key={tag} className="camp-popup__tag">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
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
      <div className="camp-popup__actions">
        {camp.hpUrl ? <CampPopupLink href={camp.hpUrl} label="公式HPへ行く" /> : null}
        {camp.reservationUrl && camp.reservationUrl !== camp.hpUrl ? (
          <CampPopupLink href={camp.reservationUrl} label="予約する" />
        ) : null}
        {!camp.hpUrl && camp.reservationUrl ? (
          <CampPopupLink href={camp.reservationUrl} label="予約する" />
        ) : null}
      </div>
    </div>
  );

  if (!showEnecaPhoto) {
    return <article className="camp-popup">{body}</article>;
  }

  return (
    <article className="camp-popup camp-popup--eneca">
      <div className="camp-popup__photo-frame">
        <img
          className="camp-popup__photo object-cover"
          src="/eneca.jpg"
          alt={camp.name}
        />
      </div>
      {body}
    </article>
  );
}

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
  const [selectedCampId, setSelectedCampId] = useState<string | null>(null);
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

  const clearSelection = useCallback(() => {
    setSelectedCampId(null);
  }, []);

  return (
    <SafeMapContainer>
      <FitAllCamps camps={allCamps} />
      <RecenterOnPopup />
      <ClosePopupOnMapClick
        selectedCampId={selectedCampId}
        onClearSelection={clearSelection}
      />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {camps.map((camp) => {
        const privateSite = isPrivateCamp(camp);
        return (
          <Marker
            key={`${camp.id}:${camp.lat},${camp.lng}`}
            position={[camp.lat, camp.lng]}
            icon={privateSite ? icons.private : icons.camp}
            eventHandlers={{
              click: () => {
                setSelectedCampId(camp.id);
              },
            }}
          >
            <Popup
              minWidth={300}
              maxWidth={320}
              autoPan
              autoPanPadding={[48, 72]}
              closeOnClick
              interactive
              className="camp-popup-wrap"
              eventHandlers={{
                remove: () => {
                  setSelectedCampId((current) =>
                    current === camp.id ? null : current,
                  );
                },
              }}
            >
              <CampPopupCard camp={camp} />
            </Popup>
          </Marker>
        );
      })}
    </SafeMapContainer>
  );
}
