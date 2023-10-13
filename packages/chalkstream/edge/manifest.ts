import type { Context, Config } from "@netlify/edge-functions";
import type { Blobs } from "https://unpkg.com/@netlify/blobs@2.0.0/dist/src/main.d.ts";
import type { Manifest } from "./ingest.ts";

const emptyPlaylist = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-PLAYLIST-TYPE:EVENT
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:6,
/poster.ts`;

function manifestToPlaylist(json: Manifest, session: string): string {
  if (!json?.chunks?.length) {
    console.log("no chunks");
    return emptyPlaylist;
  }

  // If there have been no chunks in the last 20 seconds, the stream has probably ended
  const hasEnded = Date.now() - json.lastTimestamp > 20_000;

  const sorted = json.chunks.sort((a, b) => a.sequence - b.sequence);
  return [
    "#EXTM3U",
    "#EXT-X-VERSION:4",
    `#EXT-X-PLAYLIST-TYPE:${hasEnded ? "VOD" : "EVENT"}`,
    "#EXT-X-INDEPENDENT-SEGMENTS",
    "#EXT-X-DISCONTINUITY-SEQUENCE",
    `#EXT-X-PROGRAM-DATE-TIME:${new Date(json.firstTimestamp)
      .toISOString()
      .replace("Z", "+00:00")}`,
    `#EXT-X-TARGETDURATION:${json.targetDuration}`,
    "#EXT-X-MEDIA-SEQUENCE:0",

    ...sorted.map(
      (chunk) =>
        `#EXT-X-DISCONTINUITY\n#EXTINF:${chunk.duration.toFixed(
          2
        )},\n/chunks/${session}/${chunk.digest}.ts`
    ),
    hasEnded ? "#EXT-X-ENDLIST" : "",
  ]
    .flat()
    .join("\n");
}

export default async function handler(
  _request: Request,
  context: Context & { blobs?: Blobs }
) {
  const { session } = context.params;

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
  method: "GET",
  path: "/playlist/:session.m3u8",
};
