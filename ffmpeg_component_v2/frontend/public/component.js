// ffmpeg_component_v2/frontend/public/component.js
// V2 Component - uses export default function pattern

/**
 * Dynamically loads the FFmpeg library from a CDN and returns a Promise
 * that resolves when the library is available on the window object.
 * @param {string} src - The URL of the FFmpeg library.
 * @param {number} timeout - The maximum time to wait in milliseconds.
 * @returns {Promise<object>} A promise that resolves with the FFmpeg library object.
 */
function loadFFmpeg(src = "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/umd/ffmpeg.js", timeout = 45000) {
    return new Promise((resolve, reject) => {
        // Check if the library is already loaded
        if (window.FFmpeg) {
            console.log("FFmpeg library already loaded.");
            return resolve(window.FFmpeg);
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;

        const timer = setTimeout(() => {
            reject(new Error(`Timed out after ${timeout / 1000}s waiting for FFmpeg script to load.`));
        }, timeout);

        script.onload = () => {
            clearTimeout(timer);
            if (window.FFmpeg) {
                console.log("FFmpeg library loaded successfully from CDN.");
                resolve(window.FFmpeg);
            } else {
                reject(new Error("Script loaded, but window.FFmpeg is not defined."));
            }
        };

        script.onerror = () => {
            clearTimeout(timer);
            reject(new Error(`Failed to load FFmpeg script from ${src}`));
        };

        document.head.appendChild(script);
        console.log("Initiated FFmpeg library download from CDN...");
    });
}


// V2 Component Export - this is the required pattern
export default function(component) {
    const { setStateValue, setTriggerValue, data, parentElement } = component;
    console.log('Component mounted with data:', data);

    const statusEl = parentElement.querySelector('#status');
    const loaderEl = parentElement.querySelector('#loader');

    let ffmpeg = null;

    function base64ToUint8Array(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    function uint8ArrayToBase64(bytes) {
        const CHUNK_SIZE = 0x8000;
        let b64 = '';
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
            const chunk = bytes.subarray(i, i + CHUNK_SIZE);
            b64 += String.fromCharCode.apply(null, chunk);
        }
        return btoa(b64);
    }

    async function ensureFFmpeg(FFmpegLib) {
        if (!ffmpeg) {
            statusEl.textContent = 'Loading FFmpeg...';
            loaderEl.style.display = 'inline-block';
            const { FFmpeg } = FFmpegLib;
            ffmpeg = new FFmpeg();
            ffmpeg.on('log', ({ message }) => console.log('[FFmpeg Log]', message));
            ffmpeg.on('progress', ({ progress }) => {
                const percent = Math.round(progress * 100);
                statusEl.textContent = `Processing: ${percent}%`;
                setStateValue('progress', percent);
            });
            await ffmpeg.load();
            console.log('FFmpeg core loaded.');
            loaderEl.style.display = 'none';
        }
        return ffmpeg;
    }

    async function processVideo() {
        console.log('Starting video processing...');
        let inputFilename = null;
        let outputFilename = null;
        let ff;

        try {
            const FFmpegLib = await loadFFmpeg();
            ff = await ensureFFmpeg(FFmpegLib);

            statusEl.textContent = 'Decoding video data...';
            loaderEl.style.display = 'inline-block';

            const inputBytes = base64ToUint8Array(data.videoData);
            inputFilename = data.filename;
            outputFilename = data.command[data.command.length - 1];

            await ff.writeFile(inputFilename, inputBytes);
            console.log('Input file written.');

            await ff.exec(data.command);
            console.log('FFmpeg command executed.');

            const outputData = await ff.readFile(outputFilename);
            console.log('Output file read.');

            const outputB64 = uint8ArrayToBase64(new Uint8Array(outputData));
            console.log('Output encoded.');

            setStateValue('output', outputB64);
            setStateValue('error', null);
            setStateValue('progress', 100);
            setTriggerValue('complete', true);

            statusEl.textContent = 'Complete!';
            loaderEl.style.display = 'none';

        } catch (error) {
            console.error('[FFmpeg Error]', error);
            const errorMessage = error.message || 'An unknown error occurred.';
            setStateValue('error', errorMessage);
            setStateValue('output', null);
            statusEl.textContent = `Error: ${errorMessage}`;
            loaderEl.style.display = 'none';

        } finally {
            try {
                if (ff && inputFilename) await ff.deleteFile(inputFilename);
                if (ff && outputFilename) await ff.deleteFile(outputFilename);
            } catch (e) {
                console.warn('Could not clean up virtual files:', e);
            }
        }
    }

    processVideo();

    return () => {
        console.log('[FFmpeg Component] Unmounted');
    };
}