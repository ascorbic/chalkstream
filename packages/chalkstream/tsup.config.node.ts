import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/node.ts"],
  format: ["cjs", "esm"],
  target: "node18",
  dts: true,
});
