<div style="text-align:center"><img src="./src/stream.png" width="128" height="128" alt="Chalkstream">

# Chalkstream

## Serverless live streaming

<a href="https://app.netlify.com/start/deploy?repository=https://github.com/ascorbic/chalkstream"><img src="https://www.netlify.com/img/deploy/button.svg" alt="Deploy to Netlify"></a>

</div>

Chalkstream is an open source live streaming "server" that runs on serverless edge functions. You can stream right from the browser, with a public link to share with your friends. It uses Netlify Edge Functions to ingest and serve HLS streams, and the chunks are stored in Netlify Blob Store. Control your own data.

## How it works

HLS is a streaming protocol created by Apple that doesn't require a special server to stream. It works by splitting the video into small chunks, and serving them in a playlist. Chalkstream does this encoding in the browser using a WebAssembly build of FFmpeg. This is a lot quicker if your browser natively supports H.264 (most except Firefox). Otherwise your computer needs to be quite fast if it is to handle real-time encoding. The chunks are then uploaded to Netlify Blob Store. Netlify Edge Functions handle the ingest and generating the dynamic playlist.

When you load the broadcast page it generates a random stream ID, and once you start streaming you can share a page with the live stream. The generated page includes a [Video.js](https://videojs.com) player that plays the stream. HLS is supported natively in Safari and iOS, and in other browsers with the help of hls.js.

## How to use

By default, anybody can create a stream, and anybody can view it. Chunks are retained for ten minutes. If you deploy the site yourself you should restrict access to prevent abuse. You can then increase the chunk retention time if you would like streams to be available for longer. Any completed stream can be viewed on-demand, automatically. A stream is considered complete if no chunks have been received for 30 seconds, but you can resume streaming with the same session id and it will continue where it left off.

## Security

All streams are public by default, and anyone can access the ingest endpoint. If you want to do anything serious you should restrict access. The playback endpoints require knowing the stream id, which is a hash of the session ID. Anyone who knows the session ID can record to that stream, so don't share it! It uses SHA-1 hashing, which is not cryptographically secure, but it's good enough for something with 10 minute retention. Don't use your stream to record state secrets or recite your wallet seed phrase.

### 1. Deploy the site

<a href="https://app.netlify.com/start/deploy?repository=https://github.com/ascorbic/chalkstream"><img src="https://www.netlify.com/img/deploy/button.svg" alt="Deploy to Netlify"></a>

Clone the repo, or use the button above to deploy the site to Netlify for free.

### 2. Configure stream retention

The default retention is 10 minutes. You can change this by setting the `STREAM_RETENTION` environment variable to the number of minutes you want to retain chunks for. You can also set `STREAM_RETENTION` to `0` to retain chunks indefinitely.

### 3. Customise the site, player etc

The pages are `src/index.html` (the broadcast page) and `src/play.html` (the playback page). It's all vanilla HTML, CSS and TypeScript, so you can customise it however you like. The edge functions are in `netlify/edge-functions`, where you can customise the HLS playlist generation if you need to.

### Copyright

Copyright Matt Kane 2023. Chalkstream is released under the MIT license.
