import Hls from "hls.js";

async function load() {
  if (!("URLPattern" in globalThis)) {
    await import("urlpattern-polyfill");
  }

  if (Hls.isSupported()) {
    const video = document.getElementById("video") as HTMLMediaElement;
    const hls = new Hls();
    // bind them together

    const pattern = new URLPattern({
      pathname: "/play/:sessionid",
    });
    const result = pattern.exec(window.location.href);
    const { sessionid } = result?.pathname.groups ?? {};
    if (!sessionid) {
      console.log("no sessionid");
    } else {
      console.log(`getting ${sessionid}.m3u8`);
      hls.loadSource(`/manifest/${sessionid}.m3u8`);
      hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
        console.log(
          "manifest loaded, found " + data.levels.length + " quality level"
        );
      });
      hls.attachMedia(video);
      // MEDIA_ATTACHED event is fired by hls object once MediaSource is ready
      hls.on(Hls.Events.MEDIA_ATTACHED, function () {
        console.log("video and hls.js are now bound together !");
      });
    }
  }
}
load();
