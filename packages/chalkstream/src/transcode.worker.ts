import type { FFmpeg } from "@ffmpeg/ffmpeg";

export interface TransmuxMessage {
  buffer: ArrayBuffer;
  sequence: number;
  length: number;
  session: string;
  transcodeVideo?: boolean;
  ingestServer?: string;
  authorization?: string;
}

export interface TransmuxReadyResponse {
  type: "ready";
}

export interface TransmuxSuccessResponse {
  type: "encoded" | "uploaded";
  length: number;
  sequence: number;
  session: string;
}

export interface TransmuxErrorResponse {
  type: "error";
  error: string;
}

export type TransmuxResponse =
  | TransmuxReadyResponse
  | TransmuxSuccessResponse
  | TransmuxErrorResponse;

let ffmpeg: FFmpeg;

// Load the FFmpeg library and create a new FFmpeg object
import("@ffmpeg/ffmpeg").then(async ({ createFFmpeg }) => {
  // Create a new FFmpeg object with some options
  ffmpeg = createFFmpeg({
    log: true,
    corePath: "https://cdn.jsdelivr.net/npm/@ffmpeg/core/dist/ffmpeg-core.js",
  });

  console.log("[chalkstream-worker] Loading FFmpeg");

  if (ffmpeg.isLoaded()) {
    console.log("[chalkstream-worker] Already loaded");
    return;
  }

  // Load FFmpeg library
  await ffmpeg.load();

  console.log("[chalkstream-worker] FFmpeg loading complete");
  postMessage({ type: "ready" });
});

// Received a job from the main thread
onmessage = async (event: MessageEvent<TransmuxMessage>) => {
  const {
    buffer,
    sequence,
    length,
    session,
    transcodeVideo,
    ingestServer,
    authorization,
  } = event.data;

  const inputFileName = `${sequence + 1}.webm`;
  const outputFileName = `${sequence + 1}.ts`;

  // Write input file to FFmpeg virtual filesystem
  ffmpeg.FS("writeFile", inputFileName, new Uint8Array(buffer));

  console.time("[chalkstream-worker] transmux");

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
  console.timeEnd("[chalkstream-worker] transmux");

  // Read output file from FFmpeg virtual filesystem as array buffer
  const data = ffmpeg.FS("readFile", outputFileName);
  postMessage({
    type: "encoded",
    sequence,
    session,
    length: data.length,
  });

  // Delete output files from FFmpeg filesystem
  ffmpeg.FS("unlink", outputFileName);
  let res: Response | undefined = undefined;
  try {
    res = await putChunk({
      chunk: data,
      sequence,
      duration: length,
      session,
      ingestServer,
      authorization,
    });
  } catch (err) {
    console.error("[chalkstream-worker] Failed to upload chunk", {
      sequence,
      session,
      err,
    });
    postMessage({ type: "error", error: (err as Error).message });
    return;
  }
  if (res?.ok) {
    console.log("[chalkstream-worker] Uploaded chunk", {
      sequence,
      session,
      length: data.length,
    });
    postMessage({
      type: "uploaded",
      sequence,
      session,
    });
  } else {
    console.log("[chalkstream-worker] Failed to upload chunk", {
      sequence,
      session,
    });
    postMessage({
      type: "error",
      error: await res?.text().catch(() => res?.statusText),
    });
  }
};

async function putChunk({
  chunk,
  sequence,
  duration,
  session,
  ingestServer,
  authorization,
}: {
  chunk: Uint8Array;
  sequence: number;
  duration: number;
  session: string;
  ingestServer?: string;
  authorization?: string;
}) {
  const hash = await getDigest(chunk);
  console.log("Uploading chunk", {
    sequence,
    duration,
    session,
    hash,
    length: chunk.length,
  });

  const auth: HeadersInit | undefined = authorization
    ? { Authorization: `Bearer ${authorization}` }
    : undefined;

  return fetch(new URL(`/ingest/${session}/${hash}.ts`, ingestServer), {
    method: "PUT",
    body: chunk,
    headers: {
      "Content-Type": "video/mp2t",
      "X-Sequence": String(sequence),
      "X-Duration": (duration / 1000).toFixed(2),
      ...auth,
    },
  });
}

async function getDigest(file: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", file);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
