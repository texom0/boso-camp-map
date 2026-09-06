"use client";

import { useEffect, useState } from "react";

type PhotoState = "loading" | "ready" | "empty";

function isDummyImage(url: string) {
  return /images\.unsplash\.com/i.test(url);
}

export default function CampPopupPhoto({
  pageUrl,
  name,
  fallbackUrl,
}: {
  pageUrl: string;
  name: string;
  fallbackUrl?: string;
}) {
  const [src, setSrc] = useState("");
  const [state, setState] = useState<PhotoState>("loading");

  useEffect(() => {
    let cancelled = false;
    const usableFallback =
      fallbackUrl && !isDummyImage(fallbackUrl) ? fallbackUrl : "";

    async function load() {
      if (!pageUrl) {
        if (usableFallback) {
          setSrc(usableFallback);
          setState("ready");
          return;
        }
        setState("empty");
        return;
      }

      try {
        const response = await fetch(
          `/api/og-image?url=${encodeURIComponent(pageUrl)}`,
        );
        const payload = (await response.json()) as { imageUrl?: string | null };
        if (cancelled) return;

        if (payload.imageUrl) {
          setSrc(payload.imageUrl);
          setState("ready");
          return;
        }
      } catch {
        // fall through to fallback
      }

      if (cancelled) return;
      if (usableFallback) {
        setSrc(usableFallback);
        setState("ready");
        return;
      }
      setState("empty");
    }

    setState("loading");
    setSrc("");
    void load();

    return () => {
      cancelled = true;
    };
  }, [pageUrl, fallbackUrl]);

  if (state === "loading") {
    return (
      <div className="camp-popup__photo camp-popup__photo--skeleton" aria-hidden />
    );
  }

  if (state === "empty" || !src) {
    return (
      <div className="camp-popup__photo camp-popup__photo--fallback">
        <span>{name}</span>
      </div>
    );
  }

  return (
    <img
      className="camp-popup__photo"
      src={src}
      alt={name}
      onError={() => setState("empty")}
    />
  );
}
