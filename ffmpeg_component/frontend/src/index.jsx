
import React, { useEffect, useState, useCallback } from 'react';
import { Streamlit, withStreamlitConnection } from 'streamlit-component-lib';
import { FFmpeg } from '@ffmpeg/ffmpeg';

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
    await ff.load();
    setFFmpeg(ff);
    setStatus('ready');
    return ff;
  }, [ffmpeg]);

  const processFile = useCallback(async (inputB64, args = []) => {
    const ff = await ensureFFmpeg();
    setStatus('processing');
    setLogs([]); // Clear previous logs
    const inputBytes = Uint8Array.from(atob(inputB64), c => c.charCodeAt(0));

    await ff.writeFile('input.mp4', inputBytes);
    await ff.exec(args);
    const out = await ff.readFile('output.webm');

    const uint8Array = new Uint8Array(out);
    const b64 = btoa(String.fromCharCode(...uint8Array));
    Streamlit.setComponentValue({ output: b64 });
    setStatus('done');
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
