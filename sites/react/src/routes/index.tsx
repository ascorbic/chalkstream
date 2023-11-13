import type { StaticRouteProps } from "@impalajs/core";
import { ChalkstreamVideo, ChalkStreamRef } from "chalkstream/react";
import { useState, useRef, useCallback, useEffect } from "react";
import { App } from "../App";
import netlifyIdentity from "netlify-identity-widget";
import "./index.css";

export default function Hello({ path }: StaticRouteProps) {
  const chalkStreamRef = useRef<ChalkStreamRef>(null);

  const [playerSessionId, setPlayerSessionId] = useState<string>();

  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const [error, setError] = useState<string>();

  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    netlifyIdentity.init();
  }, []);

  async function toggleStream() {
    if (!chalkStreamRef.current) {
      return;
    }
    if (chalkStreamRef.current.isStreaming) {
      chalkStreamRef.current.stop();
    } else {
      const authorization = await netlifyIdentity.refresh();
      chalkStreamRef.current.authorization = authorization;
      chalkStreamRef.current.start();
    }
  }

  const onReady = useCallback(
    (sessionId: string) => {
      setIsReady(true);
      setPlayerSessionId(sessionId);
    },
    [setIsReady, setPlayerSessionId]
  );

  const onError = useCallback(
    (error: string) => {
      setError(error);
    },
    [setError]
  );

  const onStreamStart = useCallback(() => {
    setIsStreaming(true);
  }, [setIsStreaming]);

  const onStreamStop = useCallback(() => {
    setIsStreaming(false);
  }, [setIsStreaming]);

  return (
    <App title="Home">
      <div className="App">
        <div data-netlify-identity-menu></div>
        <div className="card">
          <ChalkstreamVideo
            ref={chalkStreamRef}
            onReady={onReady}
            onStreamError={onError}
            onStreamStart={onStreamStart}
            onStreamStop={onStreamStop}
          />
          {isReady ? (
            <button
              onClick={toggleStream}
              title={isStreaming ? "Stop" : "Start"}
            >
              {isStreaming ? "⏹️ " : "⏺️"}
            </button>
          ) : null}
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
