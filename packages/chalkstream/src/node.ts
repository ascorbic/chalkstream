import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { handleResponse } from "../shared/ingest.js";
import { webcrypto } from "node:crypto";

async function hashString(id: string): Promise<string> {
  const hash = await webcrypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(id)
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function ingestHandler(request: Request, context: Context) {
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
