// main.ts

import type * as ffMpegMod from "@ffmpeg/ffmpeg";
console.log(globalThis.FFmpeg);
const { createFFmpeg, fetchFile } = globalThis.FFmpeg as typeof ffMpegMod;

// Get the video element and the button element
const camera = document.getElementById("camera") as HTMLVideoElement;
const start = document.getElementById("start") as HTMLButtonElement;
const playback = document.getElementById("playback") as HTMLVideoElement;

// Create a global variable to store the media stream from the user camera
let stream: MediaStream;

// Create a global variable to store the media recorder object
let recorder: MediaRecorder;

// Create a new FFmpeg object with some options
const ffmpeg = createFFmpeg({
  log: true, // enable logging for debugging
  progress: ({ ratio }) => {
    // show progress percentage in console
    console.log(`${(ratio * 100).toFixed(2)}%`);
  },
});

function downloadBlob(blob: Blob, name = "file") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = name;
  a.href = url;
  a.click();
  a.parentElement?.removeChild(a);
  URL.revokeObjectURL(url);
}

// Create an async function to initialize media stream from user camera
async function initStream(): Promise<void> {
  // Request access to user camera and microphone
  stream = await navigator.mediaDevices.getUserMedia({
    video: true, // enable video
    audio: true, // enable audio
  });

  // Set source of camera video element to stream
  camera.srcObject = stream;

  // Write a message to console
  console.log("Stream initialized");
}

// Create a function to initialize media recorder object
function initRecorder(): void {
  console.log("init recorder");
  // Create a new media recorder object with stream and MIME type
  recorder = new MediaRecorder(stream, {
    // specify H.264 codec for WebM container
    mimeType: "video/webm; codecs=H264",
  });
  console.log("initted recorder");

  let firstChunk;
  let sequence = 0;
  let lastTimestamp = 0;
  // Add an event listener for when data is available from recorder
  recorder.addEventListener("dataavailable", async (event) => {
    // Write a message to console with size of data blob
    console.log(`Data blob size: ${event.data.size}`);
    const diff = event.timecode - lastTimestamp;
    console.log({ diff });
    lastTimestamp = event.timecode;
    // Generate a random file name for input file using timestamp
    const inputFileName = `${sequence + 1}.webm`;
    // downloadBlob(event.data, inputFileName);
    // Write array buffer to FFmpeg filesystem as input file
    ffmpeg.FS("writeFile", inputFileName, await fetchFile(event.data));

    // Generate a random file name for output file using timestamp
    const outputFileName = `${sequence + 1}.ts`;
    // Run FFmpeg command to transmux from WebM to TS
    // Use some options for TS output, such as bitrate, codec, etc.
    // -c:v libx264 -c:a aac -f
    // ffmpeg -i meta.webm -i input.webm -map 1 -c:v libx264 -crf 23 -c:a aac -b:a 128k -map_metadata 0 output.ts
    const now = Date.now();
    if (!firstChunk) {
      // If this is the first chunk we don't delete it, as we need the metadata
      // from the first chunk to map to the other chunks

      firstChunk = inputFileName;
      console.log("first chunk", firstChunk);
      await ffmpeg.run(
        "-i",
        inputFileName,
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-f",
        "mpegts",
        outputFileName
      );
    } else {
      await ffmpeg.run(
        "-i",
        firstChunk,
        "-i",
        inputFileName,
        "-map",
        "0",
        "-map",
        "1",
        "-c:v",
        "copy",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-map_metadata",
        "0",
        "-f",
        "mpegts",
        outputFileName
      );
      ffmpeg.FS("unlink", inputFileName);
    }
    console.log("*** ran ffmpeg in", Date.now() - now, "ms");
    // Read output file from FFmpeg filesystem as array buffer
    const data = ffmpeg.FS("readFile", outputFileName);
    // Delete output files from FFmpeg filesystem
    ffmpeg.FS("unlink", outputFileName);
    await putChunk(data, sequence++, diff / 1000);
  });

  // Write a message to console
  console.log("Recorder initialized");
}

// Add an event listener for when button is clicked
start.addEventListener("click", () => {
  // Disable button
  start.disabled = true;

  // Start recorder with timeslice of 4000 milliseconds (4 seconds)
  recorder.start(4000);

  // Write a message to console
  console.log("Recorder started");
});

async function loadFFmpeg() {
  // Write a message to console
  console.log("Loading FFmpeg");

  if (ffmpeg.isLoaded()) {
    console.log("already loaded");
    return;
  }

  // Load FFmpeg library
  await ffmpeg.load();

  // Write a message to console
  console.log("FFmpeg loaded");
}

function putChunk(chunk: Uint8Array, sequence: number, duration: number) {
  console.log("putting chunk", sequence, duration);
  return fetch("/ingest", {
    method: "PUT",
    body: chunk,
    headers: {
      "Content-Type": "video/mp2t",
      "X-Sequence": String(sequence),
      "X-Duration": duration.toFixed(2),
    },
  });
}

console.log("about to load");
// Call loadFFmpeg function and wait for it to finish
loadFFmpeg().then(async () => {
  console.log("loaded");
  await initStream();
  initRecorder();
});
