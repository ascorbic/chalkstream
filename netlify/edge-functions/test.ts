import { Config, Context } from "https://deploy-preview-243--edge.netlify.app";
import { Blobs } from "https://blobs-js.netlify.app/main.ts";

export interface Manifest {
  chunks: Array<{ sequence: number; duration: number }>;
  targetDuration: number;
}
export default async function handler(request: Request, context: Context) {
  const blobs: Blobs = context.blobs;
  if (!request.body) {
    return new Response("No body", { status: 400 });
  }
  if (request.method === "PUT") {
    await blobs.set("test", request.body);
    return new Response("OK", { status: 200 });
  }
  if (request.method === "GET") {
    const body = await blobs.get("test", { type: "stream" });
    return new Response(body, { status: 200 });
  }
  return new Response("Method not allowed", { status: 405 });
}

export const config: Config = {
  path: "/test",
};
