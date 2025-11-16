# Streamlit FFmpeg.wasm Components

This repository contains two powerful, reusable Streamlit components that run FFmpeg.wasm in the browser. This allows you to process short video files entirely on the client-side, saving server resources and improving privacy.

Two component flavors are provided:
1.  **v1-style (Server-Backed):** A classic Streamlit component for standard, server-hosted applications.
2.  **v2-style (Frontend-Only):** A lightweight, static component designed for browser-only environments like `stlite`.

---

## v1 Component (`ffmpeg_component`)

This is a standard Streamlit component that is ideal for server-hosted Streamlit applications (e.g., running on Streamlit Community Cloud, a VPS, or locally). It bundles the frontend code and serves it as part of the Streamlit application.

### Installation

```bash
pip install streamlit-ffmpeg-wasm
```

### Usage

The `ffmpeg_process` function allows you to run arbitrary FFmpeg commands.

```python
import streamlit as st
from ffmpeg_component import ffmpeg_process

st.title("v1 FFmpeg Component Demo")

f = st.file_uploader('Upload an MP4 video', type=['mp4'])

if f:
    st.video(f)
    video_data = f.getvalue()

    # Example: Trim to first 5 seconds
    if st.button('Trim to 5 seconds'):
        with st.spinner('Processing...'):
            command = ['-i', 'input.mp4', '-t', '5', '-c', 'copy', 'output.webm']
            out = ffmpeg_process(data=video_data, command=command)
            if out:
                st.video(out, format='video/webm')
                st.download_button('Download Trimmed', out, 'trimmed.webm', 'video/webm')
```

See `example_app.py` for a more detailed demonstration.

---

## v2 Component (`ffmpeg_component_stlite`)

This is a frontend-only component specifically designed for browser-based environments where a Python backend is not available for serving assets, such as **stlite**. It loads its dependencies from a CDN and runs entirely in the browser.

### Important Version Note

**Compatibility:** The v2 component relies on features available in **Streamlit version 1.51.0 and newer**. It will not work with older versions.

### Usage

The `ffmpeg_process_stlite` function allows you to run arbitrary FFmpeg commands, just like the v1 component.

```python
import streamlit as st
from ffmpeg_component_stlite import ffmpeg_process_stlite

st.title("v2 stlite FFmpeg Component Demo")

f = st.file_uploader('Upload a video', type=['mp4', 'mov'])

if f:
    st.video(f)
    video_data = f.getvalue()

    # Example: Convert to grayscale
    if st.button('Convert to Grayscale'):
        with st.spinner('Processing in browser...'):
            command = ['-i', 'input.mp4', '-vf', 'format=gray', 'output.webm']
            out = ffmpeg_process_stlite(data=video_data, command=command)
            if out:
                st.video(out, format='video/webm')
                st.download_button('Download Grayscale', out, 'grayscale.webm', 'video/webm')
```

See `example_stlite_app.py` for a full example with multiple operations.

---

## Development

To set up the development environment:

1.  **Install Python dependencies:**
    ```bash
    pip install streamlit
    ```
2.  **Build the v1 frontend:**
    ```bash
    cd ffmpeg_component/frontend
    npm install
    npm run build
    ```

The v2 component requires no build step.
