// Modified for standalone community distribution; see NOTICE.
import "katex/dist/katex.min.css";
import { OpenSourceBootstrap } from "./open-source-bootstrap";
import React from "react";
import { createRoot } from "react-dom/client";
import { CanvasDesktopApp } from "@/src/desktop/canvas-app";
import "@/src/styles/globals.css";

declare global {
  interface Window {
    __LANBI_CANVAS_RENDERER__?: {
      name: string;
      version: string;
    };
  }
}

window.__LANBI_CANVAS_RENDERER__ = {
  name: "lanbi-canvas-renderer",
  version: "1",
};

const root = document.getElementById("root");

if (!root) {
  throw new Error("lanbi_canvas_renderer_root_missing");
}

createRoot(root).render(
  <React.StrictMode>
    <OpenSourceBootstrap><CanvasDesktopApp /></OpenSourceBootstrap>
  </React.StrictMode>
);
