import type { Config } from "@netlify/edge-functions";

export { chunkHandler as default } from "../../node_modules/chalkstream/edge/mod.ts";

export const config: Config = {
  method: "GET",
  path: "/chunks/:session/:digest.ts",
  cache: "manual",
};
