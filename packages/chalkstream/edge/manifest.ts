import type { Context, Config } from "@netlify/edge-functions";
import { getStore } from "https://esm.sh/@netlify/blobs";
import type { Manifest } from "./ingest.ts";

const epoch = Date.now();

const emptyPlaylist = (poster: string, sequence: number) => `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-DISCONTINUITY-SEQUENCE
#EXT-X-PROGRAM-DATE-TIME:${new Date().toISOString().replace("Z", "+00:00")}
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:${sequence}
#EXT-X-DISCONTINUITY
#EXTINF:6
${poster}`;

function manifestToPlaylist(json: Manifest, session: string): string {
  if (!json?.chunks?.length) {
    const sequence = Math.round((Date.now() - epoch) / 6000) - 1;

    const poster = `/poster.ts?id=${encodeURIComponent(session)}`;
    return emptyPlaylist(poster, sequence);
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
    `#EXT-X-MEDIA-SEQUENCE:1`,

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

export default async function handler(_request: Request, context: Context) {
  const { session } = context.params;

  if (!session) {
    return new Response("Not found", { status: 404 });
  }
  console.log(`getting ${session}/manifest.json`);

  const store = getStore("chunks");

  try {
    const manifest = await store.get(`${session}/manifest.json`, {
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
