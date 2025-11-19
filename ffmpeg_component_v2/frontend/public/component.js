// ffmpeg_component_v2/frontend/public/component.js
// V2 Component - uses export default function pattern

/**
 * Waits for the FFmpeg library to be loaded on the window object.
 * @param {number} timeout - The maximum time to wait in milliseconds.
 * @returns {Promise<object>} A promise that resolves with the FFmpeg library object.
 */
function waitForFFmpeg(timeout = 45000) { // Increased timeout to 45 seconds
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const FFLib = window.FFmpegWASM || window.FFmpeg;
            if (FFLib) {
                clearInterval(interval);
                console.log('FFmpeg library found on window object.');
                resolve(FFLib);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                console.error('Timed out waiting for FFmpeg library to load.');
                reject(new Error(
                    'FFmpeg library not loaded within timeout. Ensure st.html with the script tag is placed before the component call.'
                ));
            }
        }, 100); // Check every 100ms
    });
}

// V2 Component Export - this is the required pattern
export default function(component) {
    // V2 API: Destructure component args
    const { setStateValue, setTriggerValue, data, parentElement } = component;
    console.log('Component mounted with data:', data);

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

    async function ensureFFmpeg(FFmpegLib) {
        if (!ffmpeg) {
            console.log('Initializing FFmpeg for the first time.');
            statusEl.textContent = 'Loading FFmpeg...';
            loaderEl.style.display = 'inline-block';

            const { FFmpeg } = FFmpegLib;
            ffmpeg = new FFmpeg();

            ffmpeg.on('log', ({ message }) => {
                console.log('[FFmpeg Log]', message);
            });

            ffmpeg.on('progress', ({ progress }) => {
                const percent = Math.round(progress * 100);
                statusEl.textContent = `Processing: ${percent}%`;
                setStateValue('progress', percent);
            });

            await ffmpeg.load();
            console.log('FFmpeg core loaded.');
            loaderEl.style.display = 'none';
        } else {
            console.log('Reusing existing FFmpeg instance.');
        }
        return ffmpeg;
    }

    async function processVideo() {
        console.log('Starting video processing...');
        let inputFilename = null;
        let outputFilename = null;
        let inputBytes = null;
        let ff;

        try {
            // Wait for the library to be available before doing anything
            const FFmpegLib = await waitForFFmpeg();
            ff = await ensureFFmpeg(FFmpegLib);

            console.log('Step 1: Decoding video data...');
            statusEl.textContent = 'Decoding video data...';
            loaderEl.style.display = 'inline-block';

            // Validate size
            const estimatedSizeMB = (data.videoData.length * 0.75) / (1024 * 1024);
            if (estimatedSizeMB > data.maxSizeMB) {
                throw new Error(`File too large: ${estimatedSizeMB.toFixed(1)}MB. Limit is ${data.maxSizeMB}MB.`);
            }
            console.log(`File size check passed (${estimatedSizeMB.toFixed(1)}MB).`);

            // Decode input
            inputBytes = base64ToUint8Array(data.videoData);
            inputFilename = data.filename;
            outputFilename = data.command[data.command.length - 1];
            console.log(`Input: ${inputFilename}, Output: ${outputFilename}`);

            // Write input file
            console.log('Step 2: Writing input file to virtual filesystem...');
            statusEl.textContent = 'Writing input file...';
            await ff.writeFile(inputFilename, inputBytes);
            console.log('Input file written successfully.');

            // Run FFmpeg command
            console.log('Step 3: Executing FFmpeg command:', data.command);
            statusEl.textContent = 'Processing with FFmpeg...';
            await ff.exec(data.command);
            console.log('FFmpeg command executed successfully.');

            // Read output file
            console.log('Step 4: Reading output file...');
            statusEl.textContent = 'Reading output file...';
            const outputData = await ff.readFile(outputFilename);
            console.log(`Output file read successfully (${outputData.length} bytes).`);

            // Encode output
            console.log('Step 5: Encoding output to base64...');
            statusEl.textContent = 'Encoding output...';
            const outputB64 = uint8ArrayToBase64(new Uint8Array(outputData));
            console.log('Output encoded successfully.');

            // V2 API: Set state values
            console.log('Step 6: Setting component state for success...');
            setStateValue('output', outputB64);
            setStateValue('error', null);
            setStateValue('progress', 100);
            setTriggerValue('complete', true);
            console.log('Component state updated.');

            statusEl.textContent = 'Complete!';
            loaderEl.style.display = 'none';

        } catch (error) {
            console.error('[FFmpeg Error in processVideo]', error);
            const errorMessage = error.message || 'An unknown error occurred.';
            setStateValue('error', errorMessage);
            setStateValue('output', null);
            statusEl.textContent = `Error: ${errorMessage}`;
            loaderEl.style.display = 'none';

        } finally {
            console.log('Step 7: Cleaning up virtual filesystem...');
            inputBytes = null; // Help GC

            try {
                if (ff && inputFilename) {
                    await ff.deleteFile(inputFilename);
                    console.log(`Cleaned up ${inputFilename}.`);
                }
            } catch (e) {
                console.warn(`Could not clean up input file ${inputFilename}:`, e);
            }

            try {
                if (ff && outputFilename) {
                    await ff.deleteFile(outputFilename);
                    console.log(`Cleaned up ${outputFilename}.`);
                }
            } catch (e) {
                console.warn(`Could not clean up output file ${outputFilename}:`, e);
            }
            console.log('Cleanup complete.');
        }
    }

    // Start processing when component mounts
    processVideo();

    // V2 API: Optional cleanup function called when component unmounts
    return () => {
        console.log('[FFmpeg Component] Unmounted');
    };
}