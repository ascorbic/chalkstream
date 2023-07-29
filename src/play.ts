import videojs from "video.js";

const player = videojs("video");
if (!player) {
  console.log("no player");
}

const [, , sessionid] = window.location.pathname.split("/");

if (!sessionid) {
  console.log("no sessionid");
}

player.src({
  src: `/playlist/${sessionid}.m3u8`,
  type: "application/x-mpegURL",
});
