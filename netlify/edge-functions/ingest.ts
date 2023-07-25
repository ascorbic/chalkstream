import { Config, Context } from "https://deploy-preview-243--edge.netlify.app";

export default async function handler(request: Request, context: Context) {
  console.log(request.headers, context.blobs);
  if (request.method !== "PUT") {
    return new Response(`Method ${request.method} not allowed`, {
      status: 405,
    });
  }
  await request.arrayBuffer();
  return new Response("OK", { status: 202 });
}

export const config: Config = {
  path: "/ingest",
};
