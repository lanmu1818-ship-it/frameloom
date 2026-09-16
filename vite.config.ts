import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const publicEnv = {
    NODE_ENV: mode === "production" ? "production" : "development",
    NEXT_PUBLIC_API_BASE_URL: env.VITE_API_BASE_URL || "",
    NEXT_PUBLIC_API_CLIENT_NAME: "frameloom",
    NEXT_PUBLIC_DESKTOP_API_KEY: "",
    NEXT_PUBLIC_DESKTOP_UPDATE_CHANNEL: "stable",
    NEXT_PUBLIC_DESKTOP_UPDATE_MANIFEST_URL: "",
    NEXT_PUBLIC_BASE_PATH: "",
    NEXT_PUBLIC_ENABLE_CLIENT_LOGS: "false",
    NEXT_PUBLIC_AGENT_WORKFLOW_OPTIMIZED_RENDER: "true",
  };
  return {
    resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
    define: { "process.env": JSON.stringify(publicEnv) },
    server: { host: "127.0.0.1", port: 5173 },
    build: {
      outDir: "dist",
      sourcemap: false,
      rollupOptions: { input: { app: "index.html", canvas: "canvas.html" } },
    },
  };
});
