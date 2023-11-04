<div style="text-align:center"><img src="./src/stream.png" width="128" height="128" alt="Chalkstream">

# Chalkstream

## Serverless live streaming

<a href="https://app.netlify.com/start/deploy?repository=https://github.com/ascorbic/chalkstream"><img src="https://www.netlify.com/img/deploy/button.svg" alt="Deploy to Netlify"></a>

</div>

Chalkstream is an open source, self-hosted live streaming "server" that runs on
serverless edge functions. You can stream right from the browser, with a public
link to share with your friends. It uses Netlify Edge Functions to ingest and
serve HLS streams, and the chunks are stored in Netlify Blobs. Control your own
data.

## How it works

HLS is a streaming protocol created by Apple that doesn't require a special
server to stream. It works by splitting the video into small chunks, and serving
them in a playlist. Chalkstream does this encoding in the browser using a
WebAssembly build of FFmpeg. This is a lot quicker if your browser natively
supports H.264 (most except Firefox). Otherwise your computer needs to be quite
fast if it is to handle real-time encoding. The chunks are then uploaded to
Netlify Blobs. Netlify Edge Functions handle the ingest and generating the
dynamic playlist.

**[See a demo](https://chalkstream.netlify.app/)**

When you load the broadcast page it generates a random stream ID, and once you
start streaming you can share a page with the live stream. HLS streams can be
played in any modern browser, either natively or via Media Source Extensions and
Hls.js. Players such as Video.js and react-player make this easy - see
[the demo sites](https://github.com/ascorbic/chalkstream/tree/main/sites) for
examples.

## Usage

Chalkstream supports vanilla HTML+JS, plus React. For the vanilla version you
can either install it from npm and use it with a bundler or load it from a CDN
directly in the HTML page. For React, you can install it and import the
component.

### From a CDN

You can load the library directly from a CDN. This is the simplest way to get
started.

```html
<body>
  <video id="myself" autoplay muted></video>
  <div id="controls" hidden>
    <button id="start">Start streaming</button>
    <a id="playback-link" target="_blank">Playback link</a>
  </div>
  <script type="module">
    import { ChalkStream } from "https://cdn.jsdelivr.net/npm/chalkstream";

    const stream = new ChalkStream({
      onReady: async (streamId) => {
        document.getElementById("controls").hidden = false;
        const playback = document.getElementById("playback-link");
        playback.href = `/play/${streamId}`;
      },
      videoElement: document.getElementById("myself"),
      onError: (error) => {
        console.error(error);
      },
    });

    const start = document.getElementById("start");

    start.addEventListener("click", async () => {
      if (!stream.isStreaming) {
        stream.start();
        start.textContent = "Stop";
      } else {
        stream.stop();
        start.textContent = "Start";
      }
    });

    stream.init();
  </script>
</body>
```

### With a bundler

Install the package:

```sh
npm install chalkstream
```

Then import it:

```typescript
import { ChalkStream } from "chalkstream";

const stream = new ChalkStream({
  onReady: async (streamId) => {
    document.getElementById("controls").hidden = false;
    const playback = document.getElementById("playback-link");
    playback.href = `/play/${streamId}`;
  },
  videoElement: document.getElementById("myself"),
  onError: (error) => {
    console.error(error);
  },
});
```

### With React

Install the package:

```sh
npm install chalkstream
```

Then import the component:

```typescript
import { ChalkStreamVideo, type ChalkStreamRef } from "chalkstream/react";

export const VideoPlayer = () => {
  const [streamId, setStreamId] = useState<string | null>(null);
  const chalkstreamRef = useRef<ChalkStreamRef>(null);

  const togglePlayback = () => {
    if (chalkstreamRef.current?.isStreaming) {
      chalkstreamRef.current?.stop();
    } else {
      chalkstreamRef.current?.start();
    }
  };

  return (
    <div>
      <ChalkStreamVideo onReady={setStreamId} ref={ChalkStreamRef} />
      {streamId ? (
        <div id="controls">
          <button onClick={togglePlayback}>⏯️</button>
          <a href={`/play/${streamId}`} target="_blank">
            Playback link
          </a>
        </div>
      ) : null}
    </div>
  );
};
```

## Edge functions

However you build the site, you need to include three edge functions in the
`netlify/edge-functions` directory. These are `ingest`, `chunk` and `manifest`.
These just re-export the edge functions from the `chalkstream/edge` module.
Ensure that you have the correct config for each function so that the paths
match.

```typescript
// netlify/edge-functions/ingest.ts
import type { Context, Config } from "@netlify/edge-functions";

export { ingestHandler as default } from "https://esm.sh/chalkstream/edge/mod.ts";

export const config: Config = {
  method: "PUT",
  path: "/ingest/:session/:digest.ts",
};
```

```typescript
// netlify/edge-functions/chunk.ts
import type { Context, Config } from "@netlify/edge-functions";

export { chunkHandler as default } from "https://esm.sh/chalkstream/edge/mod.ts";

export const config: Config = {
  method: "GET",
  path: "/chunk/:session/:digest.ts",
};
```

```typescript
// netlify/edge-functions/manifest.ts
import type { Context, Config } from "@netlify/edge-functions";

export { manifestHandler as default } from "https://esm.sh/chalkstream/edge/mod.ts";

export const config: Config = {
  method: "GET",
  path: "/playlist/:session.m3u8",
};
```

## API

### `ChalkStream`

This is the main class. You either instantiate it, passing it a config object
and HTMLVideoElement, or you can use the React component which returns the
object in a ref.

#### `new ChalkStream(config: ChalkStreamConfig)`

## Security

By default, anybody can create a stream, and anybody can view it.

Chunks are retained for ten minutes. If you deploy the site yourself you should
restrict access to prevent abuse. You can then increase the chunk retention time
if you would like streams to be available for longer. Any completed stream can
be viewed on-demand, automatically. A stream is considered complete if no chunks
have been received for 30 seconds, but you can resume streaming with the same
session id and it will continue where it left off.

## Security

All streams are public by default, and anyone can access the ingest endpoint. If
you want to do anything serious you should restrict access. The playback
endpoints require knowing the stream id, which is a hash of the session ID.
Anyone who knows the session ID can record to that stream, so don't share it! It
uses SHA-1 hashing, which is not cryptographically secure, but it's good enough
for something with 10 minute retention. Don't use your stream to record state
secrets or recite your wallet seed phrase.

### 1. Deploy the site

<a href="https://app.netlify.com/start/deploy?repository=https://github.com/ascorbic/chalkstream">
  <img src="https://www.netlify.com/img/deploy/button.svg" alt="Deploy to Netlify" />
</a>

Clone the repo, or use the button above to deploy the site to Netlify.

### 2. Configure stream retention

The default retention is 10 minutes. You can change this by setting the
`CHALKSTREAM_RETENTION` environment variable to the number of minutes you want
to retain chunks for. You can also set `CHALKSTREAM_RETENTION` to `0` to retain
chunks indefinitely. ### 3. Customise the site, player etc The pages are
`src/index.html` (the broadcast page) and `src/play.html` (the playback page).
It's all vanilla HTML, CSS and TypeScript, so you can customise it however you
like. The edge functions are in `netlify/edge-functions`, where you can
customise the HLS playlist generation if you need to.

### Copyright

Copyright Matt Kane 2023. Chalkstream is released under the MIT license.
