// Modified for standalone community distribution; see NOTICE.
import "katex/dist/katex.min.css";
import { OpenSourceBootstrap } from "./open-source-bootstrap";
import React from "react";
import { createRoot } from "react-dom/client";
import { DesktopRendererApp } from "@/src/desktop/desktop-app";
import "@/src/styles/globals.css";
import "@/src/desktop/desktop-renderer.css";

declare global {
  interface Window {
    __YEDIR_DESKTOP_RENDERER__?: {
      name: string;
      version: string;
    };
  }
}

window.__YEDIR_DESKTOP_RENDERER__ = {
  name: "astra-canvas-desktop-renderer",
  version: "1",
};

const root = document.getElementById("root");

if (!root) {
  throw new Error("desktop_renderer_root_missing");
}

createRoot(root).render(
  <React.StrictMode>
    <OpenSourceBootstrap><DesktopRendererApp /></OpenSourceBootstrap>
  </React.StrictMode>
);
