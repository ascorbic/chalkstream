import Hls from "hls.js";

const pattern = new URLPattern({
  pathname: "/play/:sessionid",
});

const video = document.getElementById("video") as HTMLMediaElement;

async function load() {
  if (!("URLPattern" in globalThis)) {
    await import("urlpattern-polyfill");
  }

  if (!Hls.isSupported()) {
    console.log("No HLS support. Try a newer browser.");
    return;
  }

  const result = pattern.exec(window.location.href);

  const { sessionid } = result?.pathname.groups ?? {};

  if (!sessionid) {
    console.log("no sessionid");
    return;
  }

  const hls = new Hls();
  hls.loadSource(`/playlist/${sessionid}.m3u8`);
  hls.attachMedia(video);
}
load();
