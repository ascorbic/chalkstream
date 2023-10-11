import type { Context, Config } from "@netlify/edge-functions";
import type { Blobs } from "https://unpkg.com/@netlify/blobs@2.0.0/dist/src/main.d.ts";

export default async function handler(
  _request: Request,
  context: Context & { blobs?: Blobs }
) {
  const { session, digest } = context.params;

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
      type: "stream",
    });
    if (!body) {
      return new Response("Not found", { status: 404 });
    }
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
  method: "GET",
  path: "/chunks/:session/:digest.ts",
  cache: "manual",
};
