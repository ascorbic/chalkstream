import React, {
  useRef,
  useImperativeHandle,
  useEffect,
  forwardRef,
  useState,
} from "react";
import { ChalkStream, type StreamOptions } from "./index.js";

export type ChalkStreamProps = Omit<
  React.VideoHTMLAttributes<HTMLVideoElement>,
  "children" | "src"
> &
  Omit<StreamOptions, "onError" | "videoElement"> & {
    onStreamError?: StreamOptions["onError"];
  };

type ChalkStreamRef = Omit<ChalkStream, "init"> | undefined;

export { ChalkStreamRef };
export const ChalkstreamVideo = forwardRef<ChalkStreamRef, ChalkStreamProps>(
  (
    {
      onStreamError,
      mediaStream,
      ingestServer,
      sessionId,
      chunkLength,
      onChunkEncoded,
      onChunkUploaded,
      onStreamStart,
      onStreamStop,
      onReady,
      ...props
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    const [loaded, setLoaded] = useState(false);

    const chalkstream = useRef<ChalkStream>();

    useEffect(() => {
      setLoaded(true);
      if (!("MediaRecorder" in window)) {
        console.warn("[chalkstream] Cannot initialise without MediaRecorder");
        return;
      }
      if (!videoRef.current) {
        return;
      }
      if (chalkstream.current) {
        return;
      }
      chalkstream.current = new ChalkStream({
        videoElement: videoRef.current,
        onError: onStreamError,
        mediaStream,
        ingestServer,
        sessionId,
        chunkLength,
        onChunkEncoded,
        onChunkUploaded,
        onStreamStart,
        onStreamStop,
        onReady,
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
