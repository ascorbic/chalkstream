import { Config, Context } from "https://deploy-preview-243--edge.netlify.app";
import { Blobs } from "../blobs.ts";

export interface Manifest {
  chunks: Array<{ sequence: number; duration: number }>;
  targetDuration: number;
}
export default async function handler(request: Request, context: Context) {
  console.log(request.headers, context.blobs);
  if (request.method !== "PUT") {
    return new Response(`Method ${request.method} not allowed`, {
      status: 405,
    });
  }

  if (!context.blobs) {
    console.log("no blobs");
    return new Response("No blobs", { status: 202 });
  }
  const blobs = new Blobs(context.blobs);

  const sequenceHeader = request.headers.get("x-sequence");
  const session = request.headers.get("x-session");
  const duration = request.headers.get("x-duration");

  if (request.body === null) {
    return new Response("No body", { status: 400 });
  }

  if (!session || !duration || (!sequenceHeader && sequenceHeader !== "0")) {
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

  const key = `${session}/${sequence}.ts`;
  const manifestKey = `${session}/manifest.json`;

  try {
    await blobs.set(key, request.body, {
      contentLength: Number(request.headers.get("content-length")),
    });
  } catch (e) {
    console.log(e);
    return new Response(e.message, { status: 500 });
  }

  let config: Manifest = {
    chunks: [],
    targetDuration: parseInt(duration) ?? 6,
  };

  try {
    config = JSON.parse(await blobs.get(manifestKey));
  } catch (e) {
    console.log(e);
  }

  config.chunks.push({ sequence, duration: parseInt(duration) });

  await blobs.setJSON(manifestKey, config);

  return new Response("OK", { status: 202 });
}

export const config: Config = {
  path: "/ingest",
};
