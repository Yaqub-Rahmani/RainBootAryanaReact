import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:5288",
        changeOrigin: true,
      },
      "/storage": {
        target: "http://localhost:5288",
        changeOrigin: true,
      },
    },
  },
});
