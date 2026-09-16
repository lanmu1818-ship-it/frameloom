// Modified for standalone community distribution; see NOTICE.
"use client";

import type React from "react";

const IMAGE_ADJUST_NOISE_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.18' numOctaves='2' stitchTiles='stitch'/></filter><rect width='160' height='160' filter='url(#n)' opacity='1'/></svg>"
)}`;

export interface ImageAdjustmentOverlayState {
  temperature: number;
  tint: number;
  grain: number;
  vignette: number;
  softLight: number;
  glow: number;
}

interface ImageNodeAdjustOverlaysProps {
  adjustments: ImageAdjustmentOverlayState;
  hasActiveAdjustments: boolean;
  style: React.CSSProperties;
}

export function ImageNodeAdjustOverlays({
  adjustments,
  hasActiveAdjustments,
  style,
}: ImageNodeAdjustOverlaysProps) {
  if (!hasActiveAdjustments) return null;

  const temperatureOpacity = Math.min(
    0.38,
    Math.abs(adjustments.temperature) / 260
  );
  const tintOpacity = Math.min(0.28, Math.abs(adjustments.tint) / 300);
  const grainOpacity = Math.min(0.28, adjustments.grain / 340);
  const vignetteOpacity = Math.min(0.42, adjustments.vignette / 180);
  const softLightOpacity = Math.min(0.24, adjustments.softLight / 320);
  const glowOpacity = Math.min(0.22, adjustments.glow / 280);

  return (
    <>
      {temperatureOpacity > 0 ? (
        <div
          className="pointer-events-none absolute"
          style={{
            ...style,
            background:
              adjustments.temperature >= 0
                ? "linear-gradient(135deg, rgba(255,188,109,0.9), rgba(255,232,194,0.42))"
                : "linear-gradient(135deg, rgba(109,180,255,0.86), rgba(219,240,255,0.36))",
            mixBlendMode: "soft-light",
            opacity: temperatureOpacity,
          }}
        />
      ) : null}
      {tintOpacity > 0 ? (
        <div
          className="pointer-events-none absolute"
          style={{
            ...style,
            background:
              adjustments.tint >= 0
                ? "linear-gradient(135deg, rgba(244,105,214,0.78), rgba(255,203,236,0.28))"
                : "linear-gradient(135deg, rgba(76,214,141,0.76), rgba(194,255,221,0.28))",
            mixBlendMode: "overlay",
            opacity: tintOpacity,
          }}
        />
      ) : null}
      {softLightOpacity > 0 ? (
        <div
          className="pointer-events-none absolute"
          style={{
            ...style,
            background:
              "linear-gradient(180deg, rgba(255,247,229,0.84) 0%, rgba(255,255,255,0.08) 34%, rgba(255,219,168,0.42) 100%)",
            mixBlendMode: "soft-light",
            opacity: softLightOpacity,
          }}
        />
      ) : null}
      {glowOpacity > 0 ? (
        <div
          className="pointer-events-none absolute"
          style={{
            ...style,
            boxShadow:
              "inset 0 0 72px rgba(255,255,255,0.78), inset 0 0 24px rgba(255,236,201,0.66)",
            mixBlendMode: "screen",
            opacity: glowOpacity,
          }}
        />
      ) : null}
      {vignetteOpacity > 0 ? (
        <div
          className="pointer-events-none absolute"
          style={{
            ...style,
            background:
              "radial-gradient(circle at center, rgba(0,0,0,0) 38%, rgba(0,0,0,0.06) 58%, rgba(0,0,0,0.34) 100%)",
            mixBlendMode: "multiply",
            opacity: vignetteOpacity,
          }}
        />
      ) : null}
      {grainOpacity > 0 ? (
        <div
          className="pointer-events-none absolute"
          style={{
            ...style,
            backgroundImage: `url("${IMAGE_ADJUST_NOISE_DATA_URI}")`,
            backgroundRepeat: "repeat",
            backgroundSize: "140px 140px",
            mixBlendMode: "overlay",
            opacity: grainOpacity,
          }}
        />
      ) : null}
    </>
  );
}
