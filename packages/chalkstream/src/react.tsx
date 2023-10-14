import React, {
  useRef,
  useImperativeHandle,
  useMemo,
  useEffect,
  forwardRef,
} from "react";
import { ChalkStream, type StreamOptions } from "./index.js";

export interface ChalkStreamProps
  extends React.VideoHTMLAttributes<HTMLVideoElement> {
  onStatusChange?: StreamOptions["onStatusChange"];
  onStreamError?: StreamOptions["onError"];
  ingestServer?: StreamOptions["ingestServer"];
  sessionId?: StreamOptions["sessionId"];
}

type ChalkStreamRef = Omit<ChalkStream, "init"> | undefined;

export { ChalkStreamRef };
export const ChalkstreamVideo = forwardRef<ChalkStreamRef, ChalkStreamProps>(
  (
    { onStatusChange, onStreamError, ingestServer, sessionId, ...props },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    const chalkstream = useMemo(() => {
      return new ChalkStream({
        onStatusChange,
        onError: onStreamError,
        ingestServer,
        sessionId,
      });
    }, [onStatusChange, onStreamError, ingestServer, sessionId]);

    useEffect(() => {
      if (!chalkstream) {
        return;
      }
      if (!("MediaRecorder" in window)) {
        console.log("[chalkstream] Not initialising in SSR environment");
        return undefined;
      }
      chalkstream.videoElement = videoRef.current ?? undefined;
      chalkstream.init();
    }, [chalkstream]);

    useImperativeHandle(
      ref,
      (): ChalkStreamRef => {
        return chalkstream;
      },
      [chalkstream]
    );

    return <video ref={videoRef} {...props} />;
  }
);
