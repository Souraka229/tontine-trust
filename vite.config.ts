import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { whatsappApiPlugin } from "./vite-plugin-whatsapp";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL;
  process.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: env.VITE_FLASHBOT_API_URL || "http://localhost:5000",
        changeOrigin: true,
      },
      "/health": {
        target: env.VITE_FLASHBOT_API_URL || "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "pwa-icon.svg"],
      manifest: {
        name: "HACKBIT",
        short_name: "HACKBIT",
        description: "Tontine Bitcoin Lightning + WhatsApp Bot + Mobile Money.",
        theme_color: "#40196D",
        background_color: "#F8F6FC",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/home",
        lang: "fr",
        icons: [
          {
            src: "/pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
    whatsappApiPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
};
});
