import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev server keeps the port the client has always used.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});
