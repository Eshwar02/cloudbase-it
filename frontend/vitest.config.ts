import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    alias: [{ find: "lottie-react", replacement: "/src/test/__mocks__/lottie-react.tsx" }],
  },
});
