import { Config, Context } from "https://deploy-preview-243--edge.netlify.app";
import { Blobs } from "https://deploy-preview-25--blobs-js.netlify.app/main.ts";

export default async function handler(request: Request, context: Context) {
  const blobs = new Blobs(context.blobs);
  console.log(request);
  if (request.method === "PUT") {
    if (!request.body) {
      return new Response("No body", { status: 400 });
    }
    await blobs.set("test", request.body, {
      contentLength: Number(request.headers.get("content-length")),
    });
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
