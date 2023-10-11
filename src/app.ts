import { ChalkStream } from "./lib/stream";

const status = document.getElementById("status") as HTMLDivElement;

function setStatus(message: string) {
  status.innerText = message;
}

const stream = new ChalkStream({
  onStatusChange: async (status) => {
    console.log("status", status);
    setStatus(status);

    if (status === "ready") {
      document.getElementById("controls")!.hidden = false;
    }
  },
  videoElement: document.getElementById("camera") as HTMLVideoElement,
  onError: (error) => {
    console.error(error);
    setStatus(error);
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

stream.init().then(() => {
  const playback = document.getElementById(
    "playback-link"
  ) as HTMLAnchorElement;
  playback.href = `/play/${stream.streamId}`;
  playback.hidden = false;
});
