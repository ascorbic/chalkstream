import type { Config } from "@netlify/edge-functions";

export { manifestHandler as default } from "../../node_modules/chalkstream/edge/mod.ts";
export const config: Config = {
  method: "GET",
  path: "/playlist/:session.m3u8",
};
