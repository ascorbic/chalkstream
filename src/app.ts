import { ChalkStream } from "./lib/stream";

const status = document.getElementById("status") as HTMLDivElement;

function setStatus(message: string) {
  status.innerText = message;
}

async function hashString(id: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(id)
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const stream = new ChalkStream({
  onStatusChange: async (status) => {
    console.log("status", status);
    if (status === "ready") {
      document.getElementById("controls")!.hidden = false;
    }
  },
  videoElement: document.getElementById("camera") as HTMLVideoElement,
  onError: (error) => {
    console.error(error);
    setStatus(error.message);
  },
});

const start = document.getElementById("start") as HTMLButtonElement;

start.addEventListener("click", async () => {
  if (!stream.isRecording) {
    stream.start();
    start.textContent = "Stop";
  } else {
    stream.stop();
    setStatus("Stopped");
    start.textContent = "Start streaming";
  }
});

stream
  .init()
  .then(
    () =>
      ((
        document.getElementById("playback-link") as HTMLAnchorElement
      ).href = `/play/${stream.streamId}`)
  );
