import { defineConfig } from "tsup";
import inlineWorkerPlugin from "esbuild-plugin-inline-worker";
export default defineConfig({
  entry: ["src/index.ts", "src/react.tsx"],
  format: ["cjs", "esm"],
  target: "chrome117",
  dts: true,
  esbuildPlugins: [inlineWorkerPlugin()],
  clean: true,
  platform: "browser",
});
