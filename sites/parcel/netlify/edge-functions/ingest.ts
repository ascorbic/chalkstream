import type { Config } from "@netlify/edge-functions";
export { ingestHandler as default } from "../../node_modules/chalkstream/edge/mod.ts";

export const config: Config = {
  method: "PUT",
  path: "/ingest/:session/:digest.ts",
};
