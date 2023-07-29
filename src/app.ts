import type { TransmuxMessage } from "./transcode.worker";
import { ulid } from "ulid";

const timeslice = 6000;

const sessionIdInput = document.getElementById("session") as HTMLInputElement;
const playbackLink = document.getElementById(
  "playback-link"
) as HTMLAnchorElement;
sessionIdInput.oninput = () => {
  playbackLink.href = `/play/${sessionIdInput.value}`;
};
sessionIdInput.value = ulid();
sessionIdInput.oninput(new Event("init"));

const worker = new Worker(new URL("./transcode.worker.ts", import.meta.url), {
  type: "module",
});

worker.onmessage = (event) => {
  if (event.data.error) {
    console.error(event.data.error);
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
      // Send message to worker, and transfer ownership of buffer
      worker.postMessage(message, [buffer]);

      recorder.start(timeslice);

      return;
    }
    // Stop the recorder as soon as we have a chunk, so we start a new clip
    recorder.stop();
  });
}

// rest of your code...

let isRecording = false; // add a state variable

const start = document.getElementById("start") as HTMLButtonElement;

// Add an event listener for when button is clicked
start.addEventListener("click", async () => {
  // If not recording, start the recorder
  if (!isRecording) {
    // Start recorder with timeslice of 6 seconds
    recorder.start(timeslice);

    // Write a message to console
    console.log("Recorder started");

    // Enable stop state
    isRecording = true;
    start.textContent = "Stop";
  }
  // If recording, stop the recorder
  else {
    // Stop the recorder
    recorder.stop();

    // Write a message to console
    console.log("Recorder stopped");

    // Enable start state
    isRecording = false;
    start.textContent = "Start";
  }
});

initRecorder();
