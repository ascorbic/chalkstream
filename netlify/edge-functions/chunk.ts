import { Context, Config } from "https://deploy-preview-243--edge.netlify.app/";

const pattern = new URLPattern({ pathname: "/chunks/:session/:digest.ts" });

export default async function handler(request: Request, context: Context) {
  if (request.method !== "GET") {
    return new Response(`Method ${request.method} not allowed`, {
      status: 405,
    });
  }

  const result = pattern.exec(request.url);

  const { session, digest } = result?.pathname.groups ?? {};

  if (!session || !digest) {
    return new Response("Not found", { status: 404 });
  }
  console.log(`getting ${session}/${digest}.ts`);

  if (!context.blobs) {
    console.log("no blobs");
    return new Response("No blobs", { status: 202 });
  }

  try {
    const body = await context.blobs.get(`${session}/${digest}.ts`, {
      type: "arrayBuffer",
    });
    return new Response(body, {
      headers: {
        "Content-Type": "video/mp2t",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control":
          "public, max-age=31536000, immutable, s-maxage=31536000",
      },
    });
  } catch (e) {
    console.log(e);
    return new Response(e.message, { status: 500 });
  }
}

export const config: Config = {
  path: "/chunks/*",
  cache: "manual",
};
