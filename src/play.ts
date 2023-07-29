import videojs from "video.js";
import "video.js/dist/video-js.css";

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

player.play()?.catch((e) => console.log(e));
