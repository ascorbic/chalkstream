import type { FFmpeg } from "@ffmpeg/ffmpeg";

export interface TransmuxMessage {
  buffer: ArrayBuffer;
  sequence: number;
  length: number;
  session: string;
  transcodeVideo?: boolean;
  ingestServer?: string;
}

let ffmpeg: FFmpeg;

// Load the FFmpeg library and create a new FFmpeg object
import("@ffmpeg/ffmpeg").then(async ({ createFFmpeg }) => {
  // Create a new FFmpeg object with some options
  ffmpeg = createFFmpeg({
    log: true,
    corePath: "https://cdn.jsdelivr.net/npm/@ffmpeg/core/dist/ffmpeg-core.js",
  });

  console.log("Loading FFmpeg");

  if (ffmpeg.isLoaded()) {
    console.log("already loaded");
    return;
  }

  // Load FFmpeg library
  await ffmpeg.load();

  console.log("FFmpeg loaded");
});

// Received a job from the main thread
onmessage = async (event: MessageEvent<TransmuxMessage>) => {
  const { buffer, sequence, length, session, transcodeVideo, ingestServer } =
    event.data;

  const inputFileName = `${sequence + 1}.webm`;
  const outputFileName = `${sequence + 1}.ts`;

  // Write input file to FFmpeg virtual filesystem
  ffmpeg.FS("writeFile", inputFileName, new Uint8Array(buffer));

  console.time("transmux");

  // Run FFmpeg command to transmux from WebM to TS
  await ffmpeg.run(
    "-i",
    inputFileName,
    "-c:v",
    // If it's already H.264, we can just copy the video stream. Otherwise, we'll need to transcode it
    transcodeVideo ? "libx264" : "copy",
    "-c:a",
    // Transcode audio to AAC
    "aac",
    "-f",
    // Set output format to MPEG-TS
    "mpegts",
    outputFileName
  );
  console.timeEnd("transmux");

  // Read output file from FFmpeg virtual filesystem as array buffer
  const data = ffmpeg.FS("readFile", outputFileName);

  // Delete output files from FFmpeg filesystem
  ffmpeg.FS("unlink", outputFileName);
  const res = await putChunk(data, sequence, length, session, ingestServer);
  if (res.ok) {
    console.log("Uploaded chunk", { sequence, length, session });
    postMessage({});
  } else {
    console.log("Failed to upload chunk", { sequence, length, session });
    postMessage({ error: await res.text().catch(() => res.statusText) });
  }
};

async function putChunk(
  chunk: Uint8Array,
  sequence: number,
  duration: number,
  session: string,
  ingestServer?: string
) {
  console.time("hash");
  const hash = await getDigest(chunk);
  console.timeEnd("hash");
  console.log("Uploading chunk", { sequence, duration, session, hash });
  return fetch(new URL(`/ingest/${session}/${hash}.ts`, ingestServer), {
    method: "PUT",
    body: chunk,
    headers: {
      "Content-Type": "video/mp2t",
      "X-Sequence": String(sequence),
      "X-Duration": (duration / 1000).toFixed(2),
    },
  });
}

async function getDigest(file: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", file);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
