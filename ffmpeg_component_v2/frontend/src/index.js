// For stlite / browser-only use, loaded from CDN
const { Streamlit } = window.Streamlit;

// The UMD script for @ffmpeg/ffmpeg exposes its exports on window.FFmpegWASM
if (!window.FFmpegWASM && !window.FFmpeg) {
  console.error('FFmpeg library not loaded from CDN. Check script tags.');
  Streamlit.setComponentValue({ error: 'FFmpeg library failed to load' });
}
const FFmpegLib = window.FFmpegWASM || window.FFmpeg; // Fallback for safety
const { FFmpeg } = FFmpegLib;

let ffmpeg = null;

// Efficient base64 decoding
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Efficient base64 encoding (chunked)
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

async function runCommand(b64_input, command) {
  const ff = await ensureFFmpeg();
  const inputFilename = 'input.mp4';
  let outputFilename = null;

  try {
    const estimatedSizeMB = (b64_input.length * 0.75) / (1024 * 1024);
    if (estimatedSizeMB > 150) {
        throw new Error(`File too large: ${estimatedSizeMB.toFixed(1)}MB. Client-side limit is 150MB.`);
    }

    const bytes = base64ToUint8Array(b64_input);
    await ff.writeFile(inputFilename, bytes);

    await ff.exec(command);
    outputFilename = command[command.length - 1];
    const out = await ff.readFile(outputFilename);
    return uint8ArrayToBase64(new Uint8Array(out));
  } finally {
      // Cleanup files from virtual filesystem
      try {
        if (await ff.fileExists(inputFilename)) {
          await ff.deleteFile(inputFilename);
        }
        if (outputFilename && await ff.fileExists(outputFilename)) {
          await ff.deleteFile(outputFilename);
        }
      } catch(cleanupError) {
        console.warn('File cleanup failed:', cleanupError);
      }
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
        runCommand(args.data, args.command).then((b64) => {
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
