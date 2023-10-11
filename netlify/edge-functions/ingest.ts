import type { Context, Config } from "@netlify/edge-functions";
import type { Blobs } from "https://unpkg.com/@netlify/blobs@2.0.0/dist/src/main.d.ts";

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

export default async function handler(
  request: Request,
  context: Context & { blobs?: Blobs }
) {
  const { session, digest } = context.params;

  if (!session || !digest) {
    return new Response("Not found", { status: 404 });
  }

  const { blobs } = context;

  if (!blobs) {
    console.log("no blobs");
    return new Response("No blobs", { status: 202 });
  }

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

    await blobs.set(key, body, { expiration: 60 * 60 });
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
    config = JSON.parse(await blobs.get(manifestKey));
    config.lastTimestamp = Date.now();
  } catch (e) {
    console.log(e);
  }

  config.chunks.push({ sequence, duration: Number(duration), digest });

  console.log({ config });

  await blobs.setJSON(manifestKey, config, { expiration: 60 * 60 });

  return new Response("OK", { status: 202 });
}

export const config: Config = {
  method: "PUT",
  path: "/ingest/:session/:digest.ts",
};
