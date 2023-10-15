import { ChalkStream } from "chalkstream";

const status = document.getElementById("status") as HTMLDivElement;

function setStatus(message: string) {
  status.innerText = message;
}

const stream = new ChalkStream({
  onReady: async (streamId) => {
    document.getElementById("controls")!.hidden = false;
    const playback = document.getElementById(
      "playback-link"
    ) as HTMLAnchorElement;
    playback.href = `/play/${streamId}`;
    playback.hidden = false;
  },
  videoElement: document.getElementById("camera") as HTMLVideoElement,
  onError: (error) => {
    console.error(error);
    setStatus(error);
  },
});

const start = document.getElementById("start") as HTMLButtonElement;

start.addEventListener("click", async () => {
  if (!stream.isStreaming) {
    stream.start();
    start.textContent = "Stop";
  } else {
    stream.stop();
    start.textContent = "Start streaming";
  }
});

stream.init();
