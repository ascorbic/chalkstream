import type { StaticRouteProps } from "@impalajs/core";
import ReactPlayer from "react-player";
import { App } from "../App";
import "./index.css";
import { useEffect, useRef, useState } from "react";

export default function Play({ path }: StaticRouteProps) {
  const [sessionId, setSessionId] = useState<string>();
  const playerRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!globalThis.window?.location?.search) {
      return;
    }
    const params = new URLSearchParams(globalThis.window.location.search);
    const sessionId = params.get("id");
    if (sessionId) {
      setSessionId(sessionId);
    }
  }, []);

  return (
    <App title="Home">
      <div className="App">
        <div className="card">
          {sessionId ? (
            <ReactPlayer
              url={`/playlist/${sessionId}.m3u8`}
              autoPlay={true}
              controls={true}
              playerRef={playerRef}
            />
          ) : (
            <p>Missing id</p>
          )}
        </div>
      </div>
    </App>
  );
}
