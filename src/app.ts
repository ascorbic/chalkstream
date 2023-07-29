import type { TransmuxMessage } from "./transcode.worker";
import { ulid } from "ulid";

const timeslice = 6000;

const sessionIdInput = document.getElementById("session") as HTMLInputElement;
const playbackLink = document.getElementById(
  "playback-link"
) as HTMLAnchorElement;
sessionIdInput.oninput = () => {
  playbackLink.href = `/play/${sessionIdInput.value}`;
  playbackLink.innerText = new URL(
    `/play/${sessionIdInput.value}`,
    document.location.href
  ).href;
};
sessionIdInput.value = ulid();
sessionIdInput.oninput(new Event("init"));

const worker = new Worker(new URL("./transcode.worker.ts", import.meta.url), {
  type: "module",
});

worker.onmessage = ({ data }) => {
  const { outputFileName, buffer } = data;
  downloadBlob(new Blob([buffer], { type: "video/mp2t" }), outputFileName);
};

let recorder: MediaRecorder;

function downloadBlob(blob: Blob, name = "file") {
  if (!(document.getElementById("download") as HTMLInputElement).checked) {
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = name;
  a.href = url;
  a.click();
  a.parentElement?.removeChild(a);
  URL.revokeObjectURL(url);
}

const CODECS = [
  "video/webm; codecs=avc1.42E01E",
  "video/mp4; codecs=avc1.42E01E",
  "video/webm",
  "video/*",
];

const mimeType = CODECS.find((codec) => MediaRecorder.isTypeSupported(codec));

console.log("mimeType", mimeType);

// If we can't generate H.264, we'll need to transcode after
const transcodeVideo = !mimeType?.endsWith("avc1.42E01E");

// Create a function to initialize media recorder object
async function initRecorder() {
  console.log("init recorder");
  // Request access to user camera and microphone
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  const camera = document.getElementById("camera") as HTMLVideoElement;

  // Set source of camera video element to stream
  camera.srcObject = stream;

  // Create a new media recorder object with stream and MIME type
  recorder = new MediaRecorder(stream, {
    mimeType,
  });
  console.log("initted recorder");

  let sequence = 0;
  const chunks: Array<Blob> = [];

  // Add an event listener for when data is available from recorder
  recorder.addEventListener("dataavailable", async (event) => {
    console.log("data available", recorder.state);
    console.log(`Data blob size: ${event.data.size}`);
    chunks.push(event.data);

    // This is the last chunk, so we need to transcode it
    if (recorder.state === "inactive") {
      // Concatenate all chunks into a single ArrayBuffer which we'll send to the worker
      const blob = new Blob(chunks, { type: mimeType });
      await downloadBlob(blob, `${sequence + 1}.webm`);
      const buffer = await blob.arrayBuffer();
      chunks.length = 0;
      const message: TransmuxMessage = {
        buffer,
        sequence,
        length: timeslice,
        session:
          (document.getElementById("session") as HTMLInputElement).value ||
          "session",
        transcodeVideo,
      };
      sequence++;
      // Send message to worker, and transfer ownership of buffer
      worker.postMessage(message, [buffer]);

      recorder.start(timeslice);

      return;
    }
    // Stop the recorder as soon as we have a chunk, so we start a new clip
    recorder.stop();
  });

  console.log("Recorder initialized");
}

const start = document.getElementById("start") as HTMLButtonElement;

// Add an event listener for when button is clicked
start.addEventListener("click", () => {
  // Disable button
  start.disabled = true;

  // Start recorder with timeslice of 6 seconds
  recorder.start(timeslice);

  // Write a message to console
  console.log("Recorder started");
});

console.log("about to load");
initRecorder();
