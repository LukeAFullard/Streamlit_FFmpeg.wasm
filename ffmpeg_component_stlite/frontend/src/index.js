
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
      statusEl.textContent = `Status: ${message}`;
    });
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

  await ffmpeg.writeFile('input.mp4', bytes);
  await ffmpeg.exec(['-i', 'input.mp4', '-c', 'copy', '-t', seconds.toString(), 'output.webm']);
  const out = await ffmpeg.readFile('output.webm');

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

    if (args.cmd === 'trim' && args.data) {
        statusEl.textContent = 'Status: Processing...';
        runTrim(args.data, args.seconds || 10).then((b64) => {
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
