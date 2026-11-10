import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  resolve: {
    alias: {
      "virtual:pwa-register/react": new URL(
        "./src/__tests__/swMock.ts",
        import.meta.url,
      ).pathname,
    },
  },
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    testTimeout: 15000,
  },
});
