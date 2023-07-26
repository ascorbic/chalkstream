import { Context, Config } from "https://deploy-preview-243--edge.netlify.app/";
import type { Blobs } from "https://blobs-js.netlify.app/main.ts";

export default async function handler(request: Request, context: Context) {
  const url = new URL(request.url);
  const [_, session, sequence] = url.pathname.split("/");
  console.log(request);
  if (request.method !== "GET") {
    return new Response(`Method ${request.method} not allowed`, {
      status: 405,
    });
  }
  if (!session || !sequence) {
    return new Response("Not found", { status: 404 });
  }

  const blobs: Blobs = context.blobs;
  if (!blobs) {
    console.log("no blobs");
    return new Response("No blobs", { status: 202 });
  }

  try {
    const body = await blobs.get(`${session}/${sequence}.ts`);
    return new Response(body, {
      headers: {
        "Content-Type": "video/mp2t",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "*",
      },
    });
  } catch (e) {
    console.log(e);
    return new Response(e.message, { status: 500 });
  }
}

export const config: Config = {
  path: "/chunks/*",
};
