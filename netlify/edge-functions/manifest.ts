import { Context, Config } from "https://deploy-preview-243--edge.netlify.app/";
import type { Blobs } from "https://blobs-js.netlify.app/main.ts";
import type { Manifest } from "./ingest.ts";

function jsonToManifest(json: Manifest, session: string): string {
  const sorted = json.chunks.sort((a, b) => a.sequence - b.sequence);
  return `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-TARGETDURATION:${json.targetDuration}
#EXT-X-MEDIA-SEQUENCE:0
${sorted
  .map(
    (chunk) =>
      `#EXT-X-DISCONTINUITY\n#EXTINF:${chunk.duration.toFixed(
        2
      )},\n/chunks/${session}/${chunk.sequence}.ts`
  )
  .join("\n")}
`;
}
export default async function handler(request: Request, context: Context) {
  if (request.method !== "GET") {
    return new Response(`Method ${request.method} not allowed`, {
      status: 405,
    });
  }

  const pattern = new URLPattern({ pathname: "/manifest/:session.m3u3" });

  const result = pattern.exec(request.url);

  const { session } = result?.pathname.groups ?? {};
  console.log(result?.pathname.groups);

  if (!session) {
    return new Response("Not found", { status: 404 });
  }
  console.log(`getting ${session}/manifest.json`);

  const blobs: Blobs = context.blobs;
  if (!blobs) {
    console.log("no blobs");
    return new Response("No blobs", { status: 202 });
  }

  try {
    const manifest = await blobs.get(`${session}/manifest.json`, {
      type: "json",
    });

    return new Response(jsonToManifest(manifest, session), {
      headers: {
        "Content-Type": "application/x-mpegURL",
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
  path: "/manifest/*.m3u3",
};
