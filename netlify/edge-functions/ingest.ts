import { Config, Context } from "https://deploy-preview-243--edge.netlify.app";

export default async function handler(request: Request, context: Context) {
  console.log(request.body, request.headers);
  if (request.method !== "PUT") {
    return new Response(`Method ${request.method} not allowed`, {
      status: 405,
    });
  }
  return new Response(request.body, { status: 200 });
}

export const config: Config = {
  path: "/ingest",
};
