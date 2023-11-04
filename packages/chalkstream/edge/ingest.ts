import type { Context, Config } from "@netlify/edge-functions";
import { getStore } from "https://esm.sh/@netlify/blobs";

export interface Manifest {
  chunks: Array<{ sequence: number; duration: number; digest: string }>;
  targetDuration: number;
  lastTimestamp: number;
  firstTimestamp: number;
}

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

  if (!session || !digest) {
    return new Response("Not found", { status: 404 });
  }

  const store = getStore({ name: "chunks" });

  const expires = Number(Netlify.env.get("CHALKSTREAM_RETENTION") ?? 60 * 10);

  const sequenceHeader = request.headers.get("x-sequence");
  const duration = request.headers.get("x-duration");

  if (request.body === null) {
    return new Response("No body", { status: 400 });
  }

  if (!duration || (!sequenceHeader && sequenceHeader !== "0")) {
    return new Response("Missing headers", { status: 400 });
  }
  const sequence = parseInt(sequenceHeader);

  if (sequenceHeader !== sequence.toString()) {
    console.log("Invalid sequence header", sequenceHeader, sequence);
    return new Response("Invalid sequence", { status: 400 });
  }

  if (!parseFloat(duration).toString()) {
    console.log("Invalid duration header", duration);
    return new Response("Invalid duration", { status: 400 });
  }

  const sessionKey = await hashString(session);

  const key = `${sessionKey}/${digest}.ts`;

  const manifestKey = `${sessionKey}/manifest.json`;

  try {
    console.log(`setting ${key}`);
    const body = await request.arrayBuffer();

    await store.set(key, body, { metadata: { expires } });
  } catch (e) {
    console.log(e);
    return new Response(e.message, { status: 500 });
  }

  let config: Manifest = {
    chunks: [],
    targetDuration: parseInt(duration) ?? 6,
    firstTimestamp: Date.now(),
    lastTimestamp: Date.now(),
  };

  try {
    const manifest = await store.get(manifestKey, { type: "json" });
    if (manifest) {
      config = manifest;
      config.lastTimestamp = Date.now();
    }
  } catch (e) {
    console.log(e);
  }

  config.chunks.push({ sequence, duration: Number(duration), digest });

  console.log({ config });

  await store.setJSON(manifestKey, config, { metadata: { expires } });

  return new Response("OK", { status: 202 });
}

export const config: Config = {
  method: "PUT",
  path: "/ingest/:session/:digest.ts",
};
