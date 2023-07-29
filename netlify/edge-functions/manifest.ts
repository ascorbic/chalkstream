import { Context, Config } from "https://deploy-preview-243--edge.netlify.app/";
import type { Manifest } from "./ingest.ts";

function manifestToPlaylist(json: Manifest, session: string): string {
  // If there have been no chunks in the last 20 seconds, the stream has probably ended
  const hasEnded = Date.now() - json.lastTimestamp > 20_000;

  const sorted = json.chunks.sort((a, b) => a.sequence - b.sequence);
  return `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-PLAYLIST-TYPE:${hasEnded ? "VOD" : "EVENT"}
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-TARGETDURATION:${json.targetDuration}
#EXT-X-MEDIA-SEQUENCE:0
${sorted
  .map(
    (chunk) =>
      `#EXT-X-DISCONTINUITY\n#EXTINF:${chunk.duration.toFixed(
        2
      )},\n/chunks/${session}/${chunk.digest}.ts`
  )
  .join("\n")}
${hasEnded ? "#EXT-X-ENDLIST" : ""}
`;
}

const pattern = new URLPattern({ pathname: "/playlist/:session.m3u8" });

export default async function handler(request: Request, context: Context) {
  if (request.method !== "GET") {
    return new Response(`Method ${request.method} not allowed`, {
      status: 405,
    });
  }

  const result = pattern.exec(request.url);

  const { session } = result?.pathname.groups ?? {};

  if (!session) {
    return new Response("Not found", { status: 404 });
  }
  console.log(`getting ${session}/manifest.json`);

  if (!context.blobs) {
    console.log("no blobs");
    return new Response("No blobs", { status: 202 });
  }

  try {
    const manifest = await context.blobs.get(`${session}/manifest.json`, {
      type: "json",
    });

    return new Response(manifestToPlaylist(manifest, session), {
      headers: {
        "Content-Type": "application/x-mpegURL",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "max-age=0, no-cache, no-store, must-revalidate",
      },
    });
  } catch (e) {
    console.log(e);
    return new Response("Not found", { status: 404 });
  }
}

export const config: Config = {
  path: "/playlist/*.m3u8",
};
