# Streamlit FFmpeg.wasm Components

This repository contains two powerful, reusable Streamlit components that run FFmpeg.wasm in the browser. This allows you to process video, audio, and image files entirely on the client-side, saving server resources and improving privacy.

Two component flavors are provided:
1.  **v1 Component (Server-Backed):** A classic Streamlit component for standard, server-hosted applications. It bundles the frontend code and serves it as part of the Streamlit application.
2.  **v2 Component (Frontend-Only):** A lightweight, static component designed for browser-only environments like `stlite`. It loads its dependencies from a CDN.

---

## Installation

```bash
pip install streamlit-ffmpeg-wasm
```

---

## Functionality & Examples

Both components now support arbitrary FFmpeg commands. The primary difference is how they are imported and used in your Streamlit application.

Here are some of the things you can do:

*   **Trim Videos:** Quickly cut a video to a specific duration.
    ```python
    command = ['-i', 'input.mp4', '-t', '5', '-c', 'copy', 'output.webm']
    ```
*   **Convert Video Format:** Change the container or codecs of a video.
    ```python
    command = ['-i', 'input.mov', 'output.mp4']
    ```
*   **Apply Filters:** Perform operations like converting to grayscale, rotating, or changing speed.
    ```python
    command = ['-i', 'input.mp4', '-vf', 'format=gray', 'output.webm']
    ```
*   **Create GIFs:** Convert a segment of a video into an animated GIF.
    ```python
    command = ['-i', 'input.mp4', '-t', '3', '-vf', 'fps=10,scale=320:-1:flags=lanczos', 'output.gif']
    ```
*   **Extract Audio:** Pull the audio track from a video file.
    ```python
    command = ['-i', 'input.mp4', '-vn', '-acodec', 'copy', 'output.aac']
    ```

---

## Usage

### v1 Component (`ffmpeg_component_v1`)

Ideal for server-hosted Streamlit applications.

```python
import streamlit as st
from ffmpeg_component_v1 import ffmpeg_process

st.title("v1 FFmpeg Component Demo")

f = st.file_uploader('Upload a video', type=['mp4', 'mov'])

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
See `example_app.py` for more detailed examples.

---

### v2 Component (`ffmpeg_component_v2`)

Designed for browser-only environments like **stlite**.

**Compatibility:** Requires **Streamlit version 1.51.0 or newer**.

```python
import streamlit as st
from ffmpeg_component_v2 import ffmpeg_process_stlite

st.title("v2 stlite FFmpeg Component Demo")

f = st.file_uploader('Upload a video', type=['mp4', 'mov'])

if f:
    st.video(f)
    video_data = f.getvalue()

    if st.button('Convert to Grayscale'):
        with st.spinner('Processing in browser...'):
            command = ['-i', 'input.mp4', '-vf', 'format=gray', 'output.webm']
            out = ffmpeg_process_stlite(data=video_data, command=command)
            if out:
                st.video(out, format='video/webm')
                st.download_button('Download Grayscale', out, 'grayscale.webm', 'video/webm')
```
See `example_stlite_app.py` for more detailed examples.

---

## Development

1.  **Install Python dependencies:**
    ```bash
    pip install streamlit
    ```
2.  **Build the v1 frontend (if modifying):**
    ```bash
    cd ffmpeg_component_v1/frontend
    npm install
    npm run build
    ```

The v2 component requires no build step.
