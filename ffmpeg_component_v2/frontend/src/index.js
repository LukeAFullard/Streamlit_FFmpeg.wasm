
// For stlite / browser-only use, loaded from CDN
const { Streamlit } = window.Streamlit;
const { FFmpeg } = window.FFmpeg; // The UMD script exposes FFmpeg on the window

let ffmpeg = null;

async function ensureFFmpeg() {
  const statusEl = document.getElementById('status');
  if (!ffmpeg) {
    statusEl.textContent = 'Status: Loading ffmpeg-core.js';
    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      console.log(message);
      const statusEl = document.getElementById('status');
      if (statusEl) {
        statusEl.textContent = `Status: ${message}`;
      }
    });
    await ffmpeg.load();
  }
}

async function runCommand(b64_input, command) {
  await ensureFFmpeg();

  // convert base64 to Uint8Array
  const binary = atob(b64_input);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const inputFilename = command[command.indexOf('-i') + 1];
  await ffmpeg.writeFile(inputFilename, bytes);
  await ffmpeg.exec(command);
  const outputFilename = command[command.length - 1];
  const out = await ffmpeg.readFile(outputFilename);

  // convert Uint8Array back to base64
  let outBin = '';
  const uint8 = new Uint8Array(out);
  for (let i = 0; i < uint8.length; i++) {
    outBin += String.fromCharCode(uint8[i]);
  }
  return btoa(outBin);
}

function onRender(event) {
    const args = event.detail.args;

    // Initialize a simple UI inside the iframe
    const root = document.getElementById('root');
    if (root.innerHTML === "") {
        root.innerHTML = `
            <div>
                <p>FFmpeg.wasm component (stlite)</p>
                <p id="status">Status: Idle</p>
            </div>
        `;
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
