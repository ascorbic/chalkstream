import React, {
  useRef,
  useImperativeHandle,
  useMemo,
  useEffect,
  forwardRef,
  useState,
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

    const [loaded, setLoaded] = useState(false);

    const chalkstream = useRef<ChalkStream>();

    useEffect(() => {
      setLoaded(true);
      if (!("MediaRecorder" in window)) {
        console.warn("[chalkstream] Cannot initialise without MediaRecorder");
        return undefined;
      }
      if (!videoRef.current) {
        return undefined;
      }
      if (chalkstream.current) {
        console.log(videoRef.current, chalkstream.current);
        return undefined;
      }
      chalkstream.current = new ChalkStream({
        videoElement: videoRef.current,
        onStatusChange,
        onError: onStreamError,
        ingestServer,
        sessionId,
      });
      chalkstream.current.init();
    }, [chalkstream, videoRef.current, loaded, videoRef]);

    useImperativeHandle(
      ref,
      (): ChalkStreamRef => {
        return chalkstream.current;
      },
      [chalkstream.current]
    );

    return <video autoPlay muted ref={videoRef} {...props} />;
  }
);
