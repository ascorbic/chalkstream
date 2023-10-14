import type { TransmuxMessage } from "./transcode.worker";
import { ulid } from "ulidx";

// @ts-expect-error This is inlined by tsup
import TranscodeWorker from "./transcode.worker";

export type Status =
  | "initializing"
  | "ready"
  | "encoding"
  | "streamready"
  | "streaming"
  | "stopped"
  | "error";

export interface StreamOptions {
  /** The element used to display the user's camera */
  videoElement?: HTMLVideoElement;
  /**
   * If undefined, will be generated by navigator.mediaDevices.getUserMedia
   */
  mediaStream?: MediaStream;

  /**
   * The ingest server URL. If undefined, will be generated from the current
   * hostname.
   */
  ingestServer?: string;

  /** The session id for this stream. If undefined will be generated */
  sessionId?: string;

  /** Called when the status changes */
  onStatusChange?: (status: Status) => void;

  onError?: (message: string) => void;
}

const timeslice = 6000;

// Preferred mimetypes, in descending order
const CODECS = [
  "video/webm; codecs=avc1.42E01E",
  "video/mp4; codecs=avc1.42E01E",
  "video/webm",
  "video/*",
];

async function hashString(id: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(id)
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export class ChalkStream {
  public videoElement?: HTMLVideoElement;

  /**
   * The ingest session id
   */
  public readonly sessionId: string;
  public mediaStream?: MediaStream;

  private _isRecording = false;

  private _ingestServer: string;

  /**
   * Is the stream currently recording?
   */
  public get isRecording() {
    return this._isRecording;
  }

  private _onError?: (message: string) => void;

  private _onStatusChange?: (status: Status) => void;

  private _worker?: Worker;

  private _recorder?: MediaRecorder;

  private _transcodeVideo?: boolean;

  private _mimeType?: string;

  private _initted = false;

  private _streamId?: string;

  constructor(options: StreamOptions = {}) {
    this.mediaStream = options.mediaStream;
    this.videoElement = options.videoElement;
    this.sessionId = options.sessionId ?? ulid();
    this._ingestServer =
      options.ingestServer ??
      globalThis.window?.location.origin ??
      "http://localhost:8888";
    this._onStatusChange = options.onStatusChange;
    this._onError = options.onError;
  }

  /**
   * Initialises the recorder and stream. This must be called before start()
   */
  public async init() {
    if (!crossOriginIsolated) {
      console.error(`⚠️ Error: Cross-Origin Isolation is not enabled on this page, which is required for the proper functioning of Chalkstream ⚠️

See https://github.com/ascorbic/chalkstream#cross-origin-isolation for details
`);
      throw new Error(`Page is not cross-origin isolated`);
    }
    if (this._initted) {
      throw new Error("Cannot call init() more than once");
    }
    this._initted = true;

    if (!this.mediaStream) {
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch (e) {
        this._onError?.((e as Error).message);
        throw e;
      }
    }
    if (!this._worker) {
      this.setupWorker();
    }

    this._streamId = await hashString(this.sessionId);

    if (!this._recorder) {
      await this.initRecorder();
    }
  }

  /**
   * This is needed to generate the URLs for the HLS stream. Available after
   * init() has been called.
   */
  public get streamId(): string {
    if (!this._streamId) {
      throw new Error("Must call init() before reading streamId");
    }
    return this._streamId;
  }

  /**
   * Starts streaming to the ingest server
   */
  public start() {
    if (!this._initted) {
      throw new Error("Must call init() before start()");
    }
    if (this.isRecording) {
      return;
    }
    this._onStatusChange?.("streaming");
    // Start recorder with timeslice of 6 seconds
    this._recorder?.start(timeslice);

    this._isRecording = true;
  }

  /**
   * Stops streaming to the ingest server
   */
  public stop() {
    this._recorder?.stop();
    this._onStatusChange?.("stopped");
    this._isRecording = false;
  }

  private setupWorker() {
    this._worker = TranscodeWorker() as Worker;

    this._worker.onmessage = (event) => {
      if (event.data.error) {
        this._onStatusChange?.("error");
        this._onError?.(event.data.error);
        console.error(event.data.error);
      } else {
        this._onStatusChange?.("streamready");
      }
    };
  }

  private async initRecorder() {
    this._mimeType = CODECS.find((codec) =>
      MediaRecorder.isTypeSupported(codec)
    );

    // If we can't generate H.264, we'll need to transcode after
    if (!this._mimeType?.endsWith("avc1.42E01E")) {
      this._transcodeVideo = false;
      console.warn(
        "Browser does not support H.264 - transcoding required. This will affect stream performance."
      );
    }

    this._onStatusChange?.("initializing");
    // Request access to user camera and microphone
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    // Set source of camera video element to stream
    if (this.videoElement) {
      this.videoElement.srcObject = stream;
    } else {
      console.warn("No video element provided");
    }

    // Create a new media recorder object with stream and MIME type
    this._recorder = new MediaRecorder(stream, {
      mimeType: this._mimeType,
    });

    let sequence = 0;
    const chunks: Array<Blob> = [];

    // Add an event listener for when data is available from recorder
    this._recorder.addEventListener("dataavailable", async (event) => {
      chunks.push(event.data);

      // This is the last chunk, so we need to transcode it
      if (this._recorder?.state === "inactive") {
        // Concatenate all chunks into a single ArrayBuffer which we'll send to the worker
        const blob = new Blob(chunks, { type: this._mimeType });
        const buffer = await blob.arrayBuffer();
        chunks.length = 0;
        const message: TransmuxMessage = {
          buffer,
          sequence,
          length: timeslice,
          session: this.sessionId!,
          transcodeVideo: this._transcodeVideo,
          ingestServer: this._ingestServer,
        };
        sequence++;
        this._onStatusChange?.("encoding");
        // Send message to worker, and transfer ownership of buffer
        this._worker?.postMessage(message, [buffer]);
        // If we're recording, start a new clip
        if (this._isRecording) {
          this._recorder?.start(timeslice);
        }

        return;
      }
      // Stop the recorder as soon as we have a chunk to force a new clip
      this._recorder!.stop();
    });
    this._onStatusChange?.("ready");
  }
}
