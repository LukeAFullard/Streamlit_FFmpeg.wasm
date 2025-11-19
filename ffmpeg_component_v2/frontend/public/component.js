// ffmpeg_component_v2/frontend/public/component.js
// V2 Component - uses export default function pattern

// FFmpeg must be loaded globally (in your main Streamlit app)
const FFmpegLib = window.FFmpegWASM || window.FFmpeg;

if (!FFmpegLib) {
    throw new Error(
        'FFmpeg library not loaded. Add this to your Streamlit app:\n' +
        'st.html(\'<script src="https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/umd/ffmpeg.js"></script>\')'
    );
}

const { FFmpeg } = FFmpegLib;

// V2 Component Export - this is the required pattern
export default function(component) {
    // V2 API: Destructure component args
    const { setStateValue, setTriggerValue, data, parentElement } = component;

    const statusEl = parentElement.querySelector('#status');
    const loaderEl = parentElement.querySelector('#loader');

    let ffmpeg = null;

    // Utility: Decode base64 to Uint8Array
    function base64ToUint8Array(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    // Utility: Encode Uint8Array to base64 (chunked to avoid stack overflow)
    function uint8ArrayToBase64(bytes) {
        const CHUNK_SIZE = 0x8000; // 32KB chunks
        let b64 = '';
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
            const chunk = bytes.subarray(i, i + CHUNK_SIZE);
            b64 += String.fromCharCode.apply(null, chunk);
        }
        return btoa(b64);
    }

    async function ensureFFmpeg() {
        if (!ffmpeg) {
            statusEl.textContent = 'Loading FFmpeg...';
            loaderEl.style.display = 'inline-block';

            ffmpeg = new FFmpeg();

            ffmpeg.on('log', ({ message }) => {
                console.log('[FFmpeg]', message);
            });

            ffmpeg.on('progress', ({ progress }) => {
                const percent = Math.round(progress * 100);
                statusEl.textContent = `Processing: ${percent}%`;
                // V2 API: Use setStateValue for persistent state
                setStateValue('progress', percent);
            });

            await ffmpeg.load();
            loaderEl.style.display = 'none';
        }
        return ffmpeg;
    }

    async function processVideo() {
        let inputFilename = null;
        let outputFilename = null;
        let inputBytes = null;

        try {
            const ff = await ensureFFmpeg();

            statusEl.textContent = 'Decoding video data...';
            loaderEl.style.display = 'inline-block';

            // Validate size
            const estimatedSizeMB = (data.videoData.length * 0.75) / (1024 * 1024);
            if (estimatedSizeMB > data.maxSizeMB) {
                throw new Error(`File too large: ${estimatedSizeMB.toFixed(1)}MB. Limit is ${data.maxSizeMB}MB.`);
            }

            // Decode input
            inputBytes = base64ToUint8Array(data.videoData);
            inputFilename = data.filename;
            outputFilename = data.command[data.command.length - 1];

            // Write input file
            statusEl.textContent = 'Writing input file...';
            await ff.writeFile(inputFilename, inputBytes);

            // Run FFmpeg command
            statusEl.textContent = 'Processing with FFmpeg...';
            await ff.exec(data.command);

            // Read output file
            statusEl.textContent = 'Reading output file...';
            const outputData = await ff.readFile(outputFilename);

            // Encode output
            statusEl.textContent = 'Encoding output...';
            const outputB64 = uint8ArrayToBase64(new Uint8Array(outputData));

            // V2 API: Set state values (persistent across reruns)
            setStateValue('output', outputB64);
            setStateValue('error', null);
            setStateValue('progress', 100);

            // V2 API: Set trigger value (one-time event, resets to null after rerun)
            setTriggerValue('complete', true);

            statusEl.textContent = 'Complete!';
            loaderEl.style.display = 'none';

        } catch (error) {
            console.error('[FFmpeg Error]', error);

            // V2 API: Set error state
            setStateValue('error', error.message);
            setStateValue('output', null);

            statusEl.textContent = `Error: ${error.message}`;
            loaderEl.style.display = 'none';

        } finally {
            // Cleanup: Free memory
            inputBytes = null;

            try {
                if (inputFilename) await ff.deleteFile(inputFilename);
            } catch (e) { /* Ignore */ }

            try {
                if (outputFilename) await ff.deleteFile(outputFilename);
            } catch (e) { /* Ignore */ }
        }
    }

    // Start processing when component mounts
    processVideo();

    // V2 API: Optional cleanup function called when component unmounts
    return () => {
        console.log('[FFmpeg Component] Unmounted');
        // Could cleanup FFmpeg instance here if needed
    };
}