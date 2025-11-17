import React, { useEffect, useState, useCallback } from 'react';
import { Streamlit, withStreamlitConnection } from 'streamlit-component-lib';
import { FFmpeg } from '@ffmpeg/ffmpeg';

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

// Efficient base64 encoding (chunked to avoid stack overflow)
function uint8ArrayToBase64(bytes) {
  const CHUNK_SIZE = 0x8000; // 32KB chunks
  let b64 = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    // Use apply() for performance
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    b64 += String.fromCharCode.apply(null, chunk);
  }
  return btoa(b64);
}

function App(props) {
  const [ffmpeg, setFFmpeg] = useState(null);
  const [status, setStatus] = useState('idle');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    Streamlit.setFrameHeight();
  });

  const ensureFFmpeg = useCallback(async () => {
    if (ffmpeg) {
      return ffmpeg;
    }
    setStatus('loading ffmpeg');
    const ff = new FFmpeg();
    ff.on('log', ({ message }) => {
      setLogs(prevLogs => [...prevLogs.slice(-10), message]);
      console.log(message);
    });
    // Add progress reporting for better UX
    ff.on('progress', ({ progress }) => {
        setStatus(`Processing: ${Math.round(progress * 100)}%`);
    });
    await ff.load();
    setFFmpeg(ff);
    setStatus('ready');
    return ff;
  }, [ffmpeg]);

  const processFile = useCallback(async (inputB64, args = []) => {
    const ff = await ensureFFmpeg();
    setStatus('processing');
    setLogs([]);

    const inputFilename = 'input.mp4';
    let outputFilename = null;

    try {
      const estimatedSizeMB = (inputB64.length * 0.75) / (1024 * 1024);
      if (estimatedSizeMB > 150) { // Safety limit
        throw new Error(`File too large: ${estimatedSizeMB.toFixed(1)}MB. Client-side limit is 150MB.`);
      }

      const inputBytes = base64ToUint8Array(inputB64);
      await ff.writeFile(inputFilename, inputBytes);

      await ff.exec(args);
      outputFilename = args[args.length - 1];

      const out = await ff.readFile(outputFilename);
      const b64 = uint8ArrayToBase64(new Uint8Array(out));
      Streamlit.setComponentValue({ output: b64 });
      setStatus('done');

    } catch (error) {
      console.error('FFmpeg processing failed:', error);
      setStatus('error');
      setLogs(prev => [...prev.slice(-10), `Error: ${error.message}`]);
      Streamlit.setComponentValue({ error: error.message });

    } finally {
      // Cleanup files from virtual filesystem to free up memory
      try {
        if (await ff.fileExists(inputFilename)) {
          await ff.deleteFile(inputFilename);
        }
        if (outputFilename && await ff.fileExists(outputFilename)) {
          await ff.deleteFile(outputFilename);
        }
      } catch (cleanupError) {
        console.warn('File cleanup failed:', cleanupError);
      }
    }
  }, [ensureFFmpeg]);

  useEffect(() => {
    const renderEventHandler = (event) => {
      const { args } = event.detail;
      if (args.command && args.data) {
        processFile(args.data, args.command);
      }
    };

    Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, renderEventHandler);
    return () => {
      Streamlit.events.removeEventListener(Streamlit.RENDER_EVENT, renderEventHandler);
    };
  }, [processFile]);

  return (
    <div>
      <p>Status: {status}</p>
      <p>Drop a file in the parent app to process.</p>
      {logs.length > 0 && (
        <div style={{ marginTop: '10px', padding: '5px', border: '1px solid #ccc', maxHeight: '150px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
          <strong>Logs:</strong>
          {logs.map((log, i) => <div key={i}>{log}</div>)}
        </div>
      )}
    </div>
  );
}
export default withStreamlitConnection(App);
