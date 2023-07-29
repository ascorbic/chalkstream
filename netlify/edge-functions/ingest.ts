import { Config, Context } from "https://deploy-preview-243--edge.netlify.app";

export interface Manifest {
  chunks: Array<{ sequence: number; duration: number; digest: string }>;
  targetDuration: number;
}

const pattern = new URLPattern({ pathname: "/ingest/:session/:digest.ts" });

export default async function handler(request: Request, context: Context) {
  if (request.method !== "PUT") {
    return new Response(`Method ${request.method} not allowed`, {
      status: 405,
    });
  }

  const result = pattern.exec(request.url);

  const { session, digest } = result?.pathname.groups ?? {};

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

  const key = `${session}/${digest}.ts`;

  const manifestKey = `${session}/manifest.json`;

  try {
    console.log(`setting ${key}`);
    const body = await request.arrayBuffer();

    await blobs.set(key, body, { ttl: 60 * 60 });
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

  config.chunks.push({ sequence, duration: Number(duration), digest });

  console.log({ config });

  await blobs.setJSON(manifestKey, config, { ttl: 60 * 60 });

  return new Response("OK", { status: 202 });
}

export const config: Config = {
  path: "/ingest/*.ts",
};
