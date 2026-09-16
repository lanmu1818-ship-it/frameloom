// Modified for standalone community distribution; see NOTICE.
"use client";

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ImgHTMLAttributes,
} from "react";
import { buildImageProxyUrl } from "@/src/lib/image-delivery";

type AgentPreviewImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "loading" | "decoding"
> & {
  src?: string | null;
  previewWidth?: number;
  previewQuality?: number;
  previewFormat?: "webp" | "avif" | "jpeg" | "png";
  delivery?: "display" | "proxy";
  fallbackSrc?: string | null;
  fallbackToOriginal?: boolean;
  rootMargin?: string;
  eager?: boolean;
  raw?: boolean;
};

const EMPTY_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function buildPreviewUrl(params: {
  src: string;
  width: number;
  quality: number;
  format: "webp" | "avif" | "jpeg" | "png";
  delivery?: "display" | "proxy";
  raw?: boolean;
}) {
  if (params.raw) return params.src;
  return (
    buildImageProxyUrl(params.src, {
      width: params.width,
      quality: params.quality,
      format: params.format,
      delivery: params.delivery,
    }) || params.src
  );
}

function AgentPreviewImageBase({
  src,
  previewWidth = 480,
  previewQuality = 78,
  previewFormat = "webp",
  delivery = "display",
  fallbackSrc,
  fallbackToOriginal = true,
  rootMargin = "640px 0px",
  eager = false,
  raw = false,
  onError,
  onLoad,
  ...props
}: AgentPreviewImageProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(eager);
  const [useOriginal, setUseOriginal] = useState(false);
  const [useFallbackSource, setUseFallbackSource] = useState(false);
  const normalizedSrc = String(src || "").trim();
  const normalizedFallbackSrc = String(fallbackSrc || "").trim();
  const currentSrc =
    useFallbackSource && normalizedFallbackSrc
      ? normalizedFallbackSrc
      : normalizedSrc;

  useEffect(() => {
    setUseOriginal(false);
    setUseFallbackSource(false);
    setShouldLoad(eager);
  }, [eager, normalizedFallbackSrc, normalizedSrc]);

  useEffect(() => {
    if (eager || shouldLoad || !currentSrc) return;
    const image = imageRef.current;
    if (!image) return;

    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );
    observer.observe(image);
    return () => observer.disconnect();
  }, [currentSrc, eager, rootMargin, shouldLoad]);

  const displaySrc = useMemo(() => {
    if (!currentSrc || !shouldLoad) return EMPTY_PIXEL;
    if (useOriginal) return currentSrc;
    return buildPreviewUrl({
      src: currentSrc,
      width: previewWidth,
      quality: previewQuality,
      format: previewFormat,
      delivery,
      raw,
    });
  }, [
    currentSrc,
    delivery,
    previewFormat,
    previewQuality,
    previewWidth,
    raw,
    shouldLoad,
    useOriginal,
  ]);

  return (
    <img
      {...props}
      ref={imageRef}
      src={displaySrc}
      data-image-delivery="manual"
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={(event) => {
        if (
          fallbackToOriginal &&
          currentSrc &&
          !useOriginal &&
          displaySrc !== currentSrc
        ) {
          setUseOriginal(true);
          return;
        }
        if (!useFallbackSource && normalizedFallbackSrc) {
          setUseFallbackSource(true);
          setUseOriginal(false);
          return;
        }
        onError?.(event);
      }}
      onLoad={onLoad}
    />
  );
}

export const AgentPreviewImage = memo(AgentPreviewImageBase);
