# FFmpeg.wasm Streamlit Component — Full Plan

**Goal:** Build a robust, reusable Streamlit component that runs `FFmpeg.wasm` in the browser to process short video files entirely client-side. Provide two implementation flavours: a classic (server-backend friendly) Streamlit Component ("v1-style") and a frontend-only (stlite / browser-only) component ("v2-style").

---

## Contents

1. Motivation
2. High-level design
3. Trade-offs & limitations
4. Pre-requisites
5. Component flavours (v1 vs v2) — overview
6. File layout (example)
7. Detailed step-by-step guide: Frontend (JS) — shared pieces
8. Detailed step-by-step guide: Streamlit v1-style component (server-backed)
9. Detailed step-by-step guide: Streamlit v2-style component (stlite / browser-only)
10. Example Python wrappers & usage (both flavours)
11. Progress, logs, and UX patterns
12. Testing & debugging
13. Packaging, distribution & publishing
14. Security, privacy & cost considerations
15. Appendix: useful FFmpeg command examples

---

## 1. Motivation

* **Why FFmpeg.wasm in Streamlit?**

  * Many Streamlit apps need light video operations (trim, transcode, snapshot, extract audio) without shipping large server-side binaries or paying server CPU time.
  * `FFmpeg.wasm` lets you run FFmpeg compiled to WebAssembly **in the browser**, using client CPU and memory.
  * In stlite (Streamlit-on-Pyodide) or when you want to avoid server-side processing, a client-side FFmpeg pipeline is ideal.

* **Why a component?**

  * JS/WASM async lifecycle and large memory usage are handled best in browser JS.
  * Components provide a stable JS ↔ Python communication channel and let the UI be implemented natively in the browser; they solve the Pyodide bridging issues discussed earlier.
  * Clean API for app authors: `processed = ffmpeg_component.process(input_bytes, command, ...)`

---

## 2. High-level design

* **Frontend (JS) responsibilities:**

  * Load `@ffmpeg/ffmpeg` (FFmpeg.wasm) in the browser (optionally in a Web Worker).
  * Accept file(s) from Python via component args or by drag-drop inside the component.
  * Run FFmpeg commands asynchronously, provide progress updates/logs.
  * Return final output(s) as base64 or Uint8Array-safe values.

* **Python responsibilities:**

  * Provide a friendly synchronous API to Streamlit authors.
  * Present UI controls (upload, parameter choices) if desired.
  * Convert Streamlit `UploadedFile` into bytes and pass them into component call.
  * Decode returned base64 into bytes and feed to `st.video` or `st.download_button`.

* **Communication channel:** use the official Streamlit Component API (frontend `streamlit-component-lib`) and `Streamlit.setComponentValue()` to deliver results and `Streamlit.events` to receive render calls.

---

## 3. Trade-offs & limitations

* **Performance:** Client CPU runs the encoding — mobile devices may be slow or run out of memory for large inputs.
* **Size:** `FFmpeg.wasm` (and its codecs) can be multiple megabytes; lazy-load it.
* **Browser compatibility:** Modern Chromium-based browsers and Firefox are best; Safari/WebKit may have quirks with WASM memory and Web Worker support.
* **Security / privacy:** All processing is client-side: no server upload required — a privacy win. But if you move heavy work to a server, take care.

---

## 4. Pre-requisites

* Node.js and npm/yarn for building the frontend component.
* Python 3.8+ (or Streamlit-compatible)
* Streamlit (any version) installed. We'll show two flavors:

  * **v1-style** (classic server-backed components using `streamlit.components.v1`) — works in standard Streamlit.
  * **v2-style** (frontend-only or stlite-friendly) — a component intended to be run in-browser (works in stlite if packaged correctly).

---

## 5. Component flavours (v1 vs v2) — overview

* **v1-style (server-backed):**

  * Standard component development with `streamlit-component-lib`.
  * Frontend bundles served from a small web server (development) or static `index.html` served by the component during production.
  * Suitable for normal Streamlit hosted apps (Streamlit Cloud / local server).

* **v2-style (frontend-only / stlite):**

  * Component is shipped as a static frontend embedded in the app bundle or loaded from CDN.
  * All logic (FFmpeg.wasm) runs entirely inside the browser; Python does not need to await JS Promises.
  * Works best for stlite (Streamlit with Pyodide) where Python cannot reliably await JS async ops.

---

## 6. File layout (example)

```
ffmpeg_component/
├── frontend/
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   └── index.js    # component main
│   └── build/         # created by build step
├── __init__.py        # python wrapper
└── example_app.py     # demo Streamlit app
```

For the stlite-friendly version you can keep a similar layout but ensure `index.html` and `build` are static and load FFmpeg from a CDN (or bundle the wasm build) and avoid server runtime dependencies.

---

## 7. Shared frontend pieces (JS): how the FFmpeg integration looks

**Key patterns to follow:**

* Lazy-load FFmpeg module only when needed.
* Use a Web Worker if you expect heavy encoding to avoid blocking the main thread.
* Convert binary data to/from base64 when moving between JS and Python (Streamlit component channel supports JSON-safe values).
* Provide progress via `setComponentValue({progress: n})` or separate `setComponentValue` messages.

### Minimal JS helper (concept)

```js
// helpers/ffmpegRunner.js
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg'

export async function createRunner({ log = true } = {}) {
  const ffmpeg = createFFmpeg({ log });
  await ffmpeg.load();

  async function run(inputBytes, args = [], onProgress = null) {
    ffmpeg.FS('writeFile', 'input.mp4', new Uint8Array(inputBytes));
    if (onProgress) ffmpeg.setProgress(onProgress);
    await ffmpeg.run(...args);
    const out = ffmpeg.FS('readFile', 'output.webm');
    return out; // Uint8Array
  }

  return { run };
}
```

Note: `ffmpeg.setProgress` is provided by `@ffmpeg/ffmpeg` to get progress callbacks (if available).

---

## 8. Streamlit v1-style component (server-backed) — step-by-step

### 8.1 Initialize project (frontend)

```bash
mkdir ffmpeg_component && cd ffmpeg_component
mkdir frontend && cd frontend
npm init -y
npm install @ffmpeg/ffmpeg streamlit-component-lib
```

Add `public/index.html` with a div root and the component script. Create `src/index.js` that uses `streamlit-component-lib`.

### 8.2 Example `src/index.js` (v1)

```js
// src/index.js
import React, { useEffect, useState } from 'react';
import { Streamlit, withStreamlitConnection } from 'streamlit-component-lib';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

function App(props) {
  const [ffmpeg, setFFmpeg] = useState(null);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    Streamlit.setFrameHeight();
  });

  async function ensureFFmpeg() {
    if (!ffmpeg) {
      setStatus('loading ffmpeg');
      const ff = createFFmpeg({ log: true });
      await ff.load();
      setFFmpeg(ff);
      setStatus('ready');
    }
  }

  async function processFile(inputB64, args = []) {
    await ensureFFmpeg();
    const inputBytes = Uint8Array.from(atob(inputB64), c => c.charCodeAt(0));
    ffmpeg.FS('writeFile', 'input.mp4', inputBytes);
    await ffmpeg.run(...args);
    const out = ffmpeg.FS('readFile', 'output.webm');
    const b64 = btoa(String.fromCharCode(...out));
    Streamlit.setComponentValue({ output: b64 });
  }

  Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, (event) => {
    const args = event.detail.args;
    if (args.command && args.data) {
      processFile(args.data, args.command);
    }
  });

  return (
    <div>
      <p>Status: {status}</p>
      <p>Drop a file in the parent app to process.</p>
    </div>
  );
}

export default withStreamlitConnection(App);
```

### 8.3 Build & serve frontend (dev)

Use a bundler (webpack / parcel / Vite). For production, build a static bundle and serve it from the Python component.

### 8.4 Python wrapper (v1)

`__init__.py` in the component root:

```python
import streamlit.components.v1 as components
import base64

_component_func = components.declare_component(
    "ffmpeg_component",
    path="./frontend/build"
)


def ffmpeg_process(data: bytes, command: list):
    b64 = base64.b64encode(data).decode('ascii')
    result = _component_func(data=b64, command=command)
    if not result:
        return None
    out_b64 = result.get('output')
    return base64.b64decode(out_b64)
```

### 8.5 Example usage in `example_app.py` (v1)

```python
import streamlit as st
from ffmpeg_component import ffmpeg_process

f = st.file_uploader('Upload MP4', type='mp4')
if f:
    if st.button('Trim to 10s'):
        data = f.read()
        # command is written for ffmpeg.run: input already written as 'input.mp4'
        out = ffmpeg_process(data, ['-i', 'input.mp4', '-t', '10', 'output.webm'])
        if out:
            st.video(out)
            st.download_button('Download', out, 'trimmed.webm', mime='video/webm')
```

---

## 9. Streamlit v2-style component (frontend-only / stlite) — step-by-step

**Goal:** produce a component that can be used in stlite (browser-only) without relying on server side asset hosting or Pyodide `await` hacks.

### 9.1 Key changes from v1

* The component must be usable as a static build (no node server required). Keep `index.html` and `build` static.
* Avoid Node-specific APIs in runtime (use browser-compatible imports via CDN or bundled scripts).
* Use base64 or `MessageChannel` to exchange binary safely between JS and Python.

### 9.2 Minimal `public/index.html` for stlite

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <script src="https://unpkg.com/@ffmpeg/ffmpeg@0.12.8/dist/ffmpeg.min.js"></script>
    <script src="https://unpkg.com/streamlit-component-lib@latest/dist/index.iife.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script src="index.bundle.js"></script>
  </body>
</html>
```

> Note: using the CDN distribution of `@ffmpeg/ffmpeg` avoids bundling the wasm artifacts in the component package. Alternatively, bundle and host the wasm yourself.

### 9.3 Example `src/index.js` (frontend-only)

```js
// For stlite / browser-only use
const { Streamlit } = window.Streamlit;
const { createFFmpeg } = window.FFmpeg;

let ffmpeg = null;

async function ensureFFmpeg() {
  if (!ffmpeg) {
    ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();
  }
}

async function runTrim(b64_input, seconds) {
  await ensureFFmpeg();
  // convert base64 to Uint8Array
  const binary = atob(b64_input);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  ffmpeg.FS('writeFile', 'input.mp4', bytes);
  await ffmpeg.run('-i', 'input.mp4', '-c', 'copy', '-t', seconds.toString(), 'output.webm');
  const out = ffmpeg.FS('readFile', 'output.webm');
  let outBin = '';
  for (let i = 0; i < out.length; i++) {
    outBin += String.fromCharCode(out[i]);
  }
  return btoa(outBin);
}

Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, (e) => {
  const args = e.detail.args;
  if (args.cmd === 'trim' && args.data) {
    runTrim(args.data, args.seconds || 10).then((b64) => {
      Streamlit.setComponentValue({ output: b64 });
    }).catch((err) => {
      Streamlit.setComponentValue({ error: String(err) });
    });
  }
});

// Set initial height
Streamlit.setFrameHeight(200);
```

### 9.4 Python wrapper for stlite

In stlite you still use `components.declare_component`, pointing path to the folder with `index.html` and the bundle.

```python
import base64
import streamlit.components.v1 as components

_component_func = components.declare_component('ffmpeg_component', path='./frontend')


def ffmpeg_trim_stlite(data: bytes, seconds: int = 10):
    b64 = base64.b64encode(data).decode('ascii')
    res = _component_func(cmd='trim', data=b64, seconds=seconds)
    if not res:
        return None
    if 'error' in res:
        raise RuntimeError(res['error'])
    out_b64 = res.get('output')
    return base64.b64decode(out_b64)
```

### 9.5 Example `example_stlite_app.py`

```python
import streamlit as st
from ffmpeg_component import ffmpeg_trim_stlite

f = st.file_uploader('Upload MP4', type='mp4')
if f:
    if st.button('Trim to 10s'):
        out = ffmpeg_trim_stlite(f.read(), seconds=10)
        if out:
            st.video(out)
            st.download_button('Download', out, 'trimmed.webm', mime='video/webm')
```

---

## 10. Example Python wrappers & usage (both flavours)

Covered above: `ffmpeg_process` for v1, `ffmpeg_trim_stlite` for v2. The important pattern is: send base64 to JS, JS returns base64 for output.

---

## 11. Progress, logs, and UX patterns

* **Progress reporting:** Use `ffmpeg.setProgress()` (if available) and call `Streamlit.setComponentValue({progress: n})` periodically.
* **Streaming logs:** Hook `logger` in `createFFmpeg({logger: msg => ...})` and forward logs to Python via `setComponentValue({log: '...'})`.
* **Cancel:** Expose a `cancel_token` in JS and poll it; calling cancel from Python sets that token.
* **File size limits:** Enforce safe upload thresholds in Python UI and in JS. Warn users about mobile limitations.

---

## 12. Testing & debugging

* Test on multiple browsers: Chrome, Firefox, iOS Safari, Android Chrome.
* Verify memory usage: try trimming a few different sample videos; test 10s/30s/60s sizes.
* Use `console.log` in frontend and `st.write` in Python for debugging messaging.
* For stlite: ensure the static asset approach works (no dev server required).

---

## 13. Packaging, distribution & publishing

* For general Streamlit (server-backed) components, publish to PyPI with a `setup.py` or `pyproject.toml` and include the pre-built `frontend/build` directory.
* For stlite components: ship the `frontend` directory inside your component package and ensure `index.html` uses CDN paths or relative paths to the built JS bundle.
* Provide an example app in the package to help users test locally.

---

## 14. Security, privacy & cost considerations

* **Privacy:** Client-side processing avoids sending user videos to a server — that's a major privacy advantage.
* **DoS / CPU usage:** Warn users of CPU usage and set sensible limits. Throttling recommended in multi-user environments.
* **Cross-origin & CDN security:** If loading `ffmpeg.wasm` from a CDN, ensure integrity checks (SRI) or host the assets yourself.

---

## 15. Appendix: Useful FFmpeg command examples

* Trim: `-i input.mp4 -t 10 -c copy output.webm`
* Extract audio: `-i input.mp4 -vn -acodec copy audio.aac`
* Re-encode to VP8: `-i input.mp4 -c:v libvpx -crf 30 -b:v 0 -c:a libvorbis output.webm`
* Take snapshot at 1s: `-ss 00:00:01 -i input.mp4 -frames:v 1 out.png`

---

# Final notes

This plan is intentionally comprehensive: it gives you the motivation, architecture and step-by-step code to implement an FFmpeg.wasm Streamlit component that works both as a standard server-backed component and as a stlite-friendly frontend-only component.

If you'd like, I can now:

* generate the **complete code** for the *v1-style* component (frontend + Python wrapper + example app), or
* generate the **complete code** for the *v2-style* (stlite) static component, or
* generate **both** in a ready-to-download zip.

Tell me which one you want next.
