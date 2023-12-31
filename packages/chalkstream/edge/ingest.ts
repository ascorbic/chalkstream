import type { Context, Config } from "@netlify/edge-functions";
import { getStore } from "https://esm.sh/@netlify/blobs";
import { handleResponse } from "../shared/ingest.ts";

async function hashString(id: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(id)
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default async function handler(request: Request, context: Context) {
  const { session, digest } = context.params;
  const store = getStore("chunks");
  const sessionKey = await hashString(session);
  return await handleResponse({
    request,
    store,
    session,
    digest,
    sessionKey,
  });
}

export const config: Config = {
  method: "PUT",
  path: "/ingest/:session/:digest.ts",
};
