import type { Config } from "@netlify/functions";
export { ingestHandler as default } from "chalkstream/node";

export const config: Config = {
  method: "PUT",
  path: "/ingest/:session/:digest.ts",
};
