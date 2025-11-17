import React, { useEffect, useState, useCallback } from 'react';
import { Streamlit, withStreamlitConnection } from 'streamlit-component-lib';
import { FFmpeg } from '@ffmpeg/ffmpeg';

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
  const CHUNK_SIZE = 0x8000; // 32KB chunks
  let b64 = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
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

  const processFile = useCallback(async (inputB64, args = [], maxSizeMB = 100) => {
    const ff = await ensureFFmpeg();
    setStatus('processing');
    setLogs([]);

    const inputFilename = 'input.mp4';
    let outputFilename = null;
    let inputBytes = null;

    try {
      const estimatedSizeMB = (inputB64.length * 0.75) / (1024 * 1024);
      if (estimatedSizeMB > maxSizeMB) {
        throw new Error(`File too large: ${estimatedSizeMB.toFixed(1)}MB. Limit is ${maxSizeMB}MB.`);
      }

      inputBytes = base64ToUint8Array(inputB64);
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
      // Cleanup files and memory
      inputBytes = null; // Hint for garbage collection
      try {
        await ff.deleteFile(inputFilename);
      } catch (e) { /* Ignore error if file doesn't exist */ }
      try {
        if (outputFilename) {
          await ff.deleteFile(outputFilename);
        }
      } catch (e) { /* Ignore error if file doesn't exist */ }
    }
  }, [ensureFFmpeg]);

  useEffect(() => {
    const renderEventHandler = (event) => {
      const { args } = event.detail;
      if (args.command && args.data) {
        processFile(args.data, args.command, args.max_size_mb);
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
