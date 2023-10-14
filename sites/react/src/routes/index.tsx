import type { StaticRouteProps } from "@impalajs/core";
import { ChalkstreamVideo, ChalkStreamRef } from "chalkstream/react";
import { useState, useRef } from "react";
import { App } from "../App";
import "./index.css";

export default function Hello({ path }: StaticRouteProps) {
  const chalkStreamRef = useRef<ChalkStreamRef>(null);

  const [streamingState, setStreamingState] = useState<string>();

  const [playerSessionId, setPlayerSessionId] = useState<string>();

  function toggleStream() {
    console.log(chalkStreamRef.current);
    if (!chalkStreamRef.current) {
      return;
    }
    if (chalkStreamRef.current.isRecording) {
      chalkStreamRef.current.stop();
    } else {
      chalkStreamRef.current.start();
    }
  }

  return (
    <App title="Home">
      <div className="App">
        <div className="card">
          <ChalkstreamVideo
            ref={chalkStreamRef}
            onStatusChange={(state) => setStreamingState(state)}
          />
          <button onClick={toggleStream}>⏯️</button>
          <label>{streamingState}</label>
          {chalkStreamRef.current?.streamId && (
            <a href={`/play?id=${chalkStreamRef.current.streamId}`}>
              Watch stream
            </a>
          )}
        </div>
      </div>
    </App>
  );
}
