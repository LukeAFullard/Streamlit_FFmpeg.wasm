// For stlite / browser-only use, loaded from CDN
const { Streamlit } = window.Streamlit;

// Robustly check for the FFmpeg library on the window object
const FFmpegLib = window.FFmpegWASM || window.FFmpeg;
if (!FFmpegLib) {
  const errorMsg = 'FFmpeg library not loaded from CDN. Check script tags in index.html.';
  console.error(errorMsg);
  Streamlit.setComponentValue({ error: errorMsg });
  // Render an error message in the component UI
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="color: red;">${errorMsg}</div>`;
  }
  // Stop execution if the library is missing
  throw new Error(errorMsg);
}
const { FFmpeg } = FFmpegLib;

import { base64ToUint8Array, uint8ArrayToBase64 } from './utils.js';

let ffmpeg = null;

async function ensureFFmpeg() {
  const statusEl = document.getElementById('status');
  if (!ffmpeg) {
    statusEl.textContent = 'Status: Loading ffmpeg-core.js';
    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      console.log(message);
      if (statusEl) {
        statusEl.textContent = `Log: ${message}`;
      }
    });
    ffmpeg.on('progress', ({ progress }) => {
        if (statusEl) {
            statusEl.textContent = `Status: Processing ${Math.round(progress * 100)}%`;
        }
    });
    await ffmpeg.load();
  }
  return ffmpeg;
}

async function runCommand(b64_input, command, filename = 'input.mp4', maxSizeMB = 100) {
  const ff = await ensureFFmpeg();
  const inputFilename = filename;
  let outputFilename = null;
  let bytes = null;

  try {
    const estimatedSizeMB = (b64_input.length * 0.75) / (1024 * 1024);
    if (estimatedSizeMB > maxSizeMB) {
        throw new Error(`File too large: ${estimatedSizeMB.toFixed(1)}MB. Limit is ${maxSizeMB}MB.`);
    }

    bytes = base64ToUint8Array(b64_input);
    await ff.writeFile(inputFilename, bytes);

    await ff.exec(command);
    outputFilename = command[command.length - 1];
    const out = await ff.readFile(outputFilename);
    return uint8ArrayToBase64(new Uint8Array(out));
  } finally {
      // Cleanup files and memory
      bytes = null; // Hint for garbage collection
      try {
        await ff.deleteFile(inputFilename);
      } catch (e) { /* Ignore */ }
      try {
        if (outputFilename) {
          await ff.deleteFile(outputFilename);
        }
      } catch (e) { /* Ignore */ }
  }
}

function onRender(event) {
    const args = event.detail.args;
    const root = document.getElementById('root');
    if (root.innerHTML === "") {
        root.innerHTML = `<p id="status-container">Status: <span id="status">Idle</span></p>`;
    }
    const statusEl = document.getElementById('status');
    const statusContainer = document.getElementById('status-container');

    // Ensure loader div exists
    let loader = document.getElementById('loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'loader';
        loader.className = 'loader';
        loader.style.display = 'none'; // Initially hidden
        statusContainer.appendChild(loader);
    }

    if (args.command && args.data) {
        statusEl.textContent = 'Processing...';
        loader.style.display = 'inline-block';

        runCommand(args.data, args.command, args.filename, args.max_size_mb).then((b64) => {
            Streamlit.setComponentValue({ output: b64 });
            statusEl.textContent = 'Done!';
            loader.style.display = 'none';
        }).catch((err) => {
            console.error(err);
            Streamlit.setComponentValue({ error: String(err) });
            statusEl.textContent = `Error - ${err}`;
            loader.style.display = 'none';
        });
    }
}

Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, onRender);
Streamlit.setFrameHeight(100);
