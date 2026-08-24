import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      "/geoboundaries-api": {
        target: "https://www.geoboundaries.org",
        changeOrigin: true,

        rewrite: (path) =>
          path.replace(
            /^\/geoboundaries-api/,
            ""
          ),
      },

      "/geoboundaries-github": {
        target: "https://github.com",
        changeOrigin: true,

        followRedirects: true,

        rewrite: (path) =>
          path.replace(
            /^\/geoboundaries-github/,
            ""
          ),
      },
    },
  },
});