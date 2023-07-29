async function load() {
  if (!("URLPattern" in globalThis)) {
    await import("urlpattern-polyfill");
  }
  const player = globalThis.videojs?.("video");
  if (!player) {
    console.log("no player");
    return;
  }
  const pattern = new URLPattern({
    pathname: "/play/:sessionid",
  });

  const result = pattern.exec(window.location.href);

  const { sessionid } = result?.pathname.groups ?? {};

  if (!sessionid) {
    console.log("no sessionid");
    return;
  }

  player.src({
    src: `/playlist/${sessionid}.m3u8`,
    type: "application/x-mpegURL",
  });
}
load();
