import type { TransmuxMessage } from "./transcode.worker";
import { ulid } from "ulid";

const timeslice = 6000;

const status = document.getElementById("status") as HTMLDivElement;

function setStatus(message: string) {
  status.innerText = message;
}

async function hashString(id: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(id));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}


const sessionIdInput = document.getElementById("session") as HTMLInputElement;
const playbackLink = document.getElementById(
  "playback-link"
) as HTMLAnchorElement;
sessionIdInput.oninput = () => {
  playbackLink.href = `/play/${hashString(sessionIdInput.value)}`;
};
sessionIdInput.value = ulid();
sessionIdInput.oninput(new Event("init"));

const worker = new Worker(new URL("./transcode.worker.ts", import.meta.url), {
  type: "module",
});

worker.onmessage = (event) => {
  console.log(event);
  if (event.data.error) {
    setStatus("Error: " + event.data.error);
    console.error(event.data.error);
  } else {
    setStatus("Uploaded...");
  }
  playbackLink.hidden = false;
};

let recorder: MediaRecorder;

// Preferred mimetypes, in descending order
const CODECS = [
  "video/webm; codecs=avc1.42E01E",
  "video/mp4; codecs=avc1.42E01E",
  "video/webm",
  "video/*",
];

const mimeType = CODECS.find((codec) => MediaRecorder.isTypeSupported(codec));

// If we can't generate H.264, we'll need to transcode after
const transcodeVideo = !mimeType?.endsWith("avc1.42E01E");

// Create a function to initialize media recorder object
async function initRecorder() {
  console.log("init recorder");
  setStatus("Initializing camera");
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

  let sequence = 0;
  const chunks: Array<Blob> = [];

  // Add an event listener for when data is available from recorder
  recorder.addEventListener("dataavailable", async (event) => {
    chunks.push(event.data);

    // This is the last chunk, so we need to transcode it
    if (recorder.state === "inactive") {
      // Concatenate all chunks into a single ArrayBuffer which we'll send to the worker
      const blob = new Blob(chunks, { type: mimeType });
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
      setStatus("Encoding...");
      // Send message to worker, and transfer ownership of buffer
      worker.postMessage(message, [buffer]);
      // If we're recording, start a new clip
      if (isRecording) {
        recorder.start(timeslice);
      }

      return;
    }
    // Stop the recorder as soon as we have a chunk, so we start a new clip
    recorder.stop();
  });

  setStatus("Ready");
  document.getElementById("controls")!.hidden = false;
}

let isRecording = false;

const start = document.getElementById("start") as HTMLButtonElement;

start.addEventListener("click", async () => {
  // If not recording, start the recorder
  if (!isRecording) {
    setStatus("Recording...");
    // Start recorder with timeslice of 6 seconds
    recorder.start(timeslice);

    // Enable stop state
    isRecording = true;
    start.textContent = "Stop";
  } else {
    setStatus("Stopped");
    // If recording, stop the recorder
    isRecording = false;

    // Stop the recorder
    recorder.stop();

    console.log("Recorder stopped");

    // Enable start state
    isRecording = false;
    start.textContent = "Start streaming";
  }
});

initRecorder();
