import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site lives in a subpath of github.io, so the base cannot be "/": without
// this, index.html looks for the assets at the domain root and the page stays
// blank. The repository name is also the name of the folder being served.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/big-tech-rewards/",
  plugins: [react()],
  build: { outDir: "dist", sourcemap: false },
});
