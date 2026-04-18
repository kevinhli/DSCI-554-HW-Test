import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  base: mode === "github-pages" ? "/DSCI-554-HW-Test/" : "./",
  plugins: [react()],
}));
