import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Il sito vive in un sottopercorso di github.io, quindi il base non puo' essere
// "/": senza questo index.html cerca gli asset alla radice del dominio e la
// pagina resta bianca. Il nome del repo e' anche il nome della cartella servita.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/big-tech-rewards/",
  plugins: [react()],
  build: { outDir: "dist", sourcemap: false },
});
