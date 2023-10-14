import type { StaticRouteProps } from "@impalajs/core";
import { ChalkstreamVideo, ChalkStreamRef } from "chalkstream/react";
import { useState, useRef } from "react";
import { App } from "../App";
import logo from "../assets/impala.png";
import "./index.css";

export default function Hello({ path }: StaticRouteProps) {
  const chalkStreamRef = useRef<ChalkStreamRef>(null);

  const [streamingState, setStreamingState] = useState<string>();

  function toggleStream() {
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
        <div>
          <img src={logo} alt="Impala Logo" className="logo" />
        </div>
        <h1>Impala</h1>
        <div className="card">
          <ChalkstreamVideo
            ref={chalkStreamRef}
            onStatusChange={(state) => setStreamingState(state)}
          />
          <button onClick={toggleStream}>Toggle Stream</button>
        </div>
      </div>
    </App>
  );
}
