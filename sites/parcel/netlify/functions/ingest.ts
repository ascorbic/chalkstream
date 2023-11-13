import type { Config } from "@netlify/functions";
import { ingestHandler } from "chalkstream/node";

export default ingestHandler;

export const config: Config = {
  method: "PUT",
  path: "/ingest/:session/:digest.ts",
};
