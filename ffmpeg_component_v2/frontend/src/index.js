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

let ffmpeg = null;

/**
 * Decodes a base64 string into a Uint8Array.
 * @param {string} base64 The base64-encoded string.
 * @returns {Uint8Array} The decoded binary data.
 */
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes a Uint8Array into a base64 string in chunks to avoid stack overflow.
 * @param {Uint8Array} bytes The binary data to encode.
 * @returns {string} The base64-encoded string.
 */
function uint8ArrayToBase64(bytes) {
  const CHUNK_SIZE = 0x8000;
  let b64 = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    b64 += String.fromCharCode.apply(null, chunk);
  }
  return btoa(b64);
}

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

async function runCommand(b64_input, command, maxSizeMB = 100) {
  const ff = await ensureFFmpeg();
  const inputFilename = 'input.mp4';
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
        root.innerHTML = `<p id="status">Status: Idle</p>`;
    }
    const statusEl = document.getElementById('status');

    if (args.command && args.data) {
        statusEl.textContent = 'Status: Processing...';
        runCommand(args.data, args.command, args.max_size_mb).then((b64) => {
            Streamlit.setComponentValue({ output: b64 });
            statusEl.textContent = 'Status: Done!';
        }).catch((err) => {
            console.error(err);
            Streamlit.setComponentValue({ error: String(err) });
            statusEl.textContent = `Status: Error - ${err}`;
        });
    }
}

Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, onRender);
Streamlit.setFrameHeight(100);
