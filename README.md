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

**Example:**
```python
import streamlit as st
from ffmpeg_component_v1 import ffmpeg_process, FFmpegError
from typing import List, Optional

st.title("v1 FFmpeg Component Demo")

f = st.file_uploader('Upload a video', type=['mp4', 'mov'])

if f:
    video_data = f.getvalue()
    try:
        command = ['-i', 'input.mp4', '-t', '5', '-c', 'copy', 'output.webm']
        out = ffmpeg_process(data=video_data, command=command)
        st.video(out, format='video/webm')
    except (FFmpegError, ValueError) as e:
        st.error(e)
```
See `example_app.py` for more detailed examples.

#### API Reference: `ffmpeg_process`

```python
ffmpeg_process(
    data: bytes,
    command: List[str],
    max_size_mb: int = 100
) -> Optional[bytes]
```

*   **`data`**: The raw byte content of the media file to be processed.
*   **`command`**: A list of strings representing the FFmpeg command-line arguments (e.g., `['-i', 'input.mp4', '-t', '5', 'output.webm']`).
*   **`max_size_mb`**: The maximum allowable file size in megabytes. Defaults to `100`. If the input `data` exceeds this size, a `ValueError` is raised.

**Returns:**
*   The processed media file as `bytes` on success.
*   `None` if the component does not return data (e.g., the user navigates away).

**Raises:**
*   **`ValueError`**: If the input `data` is empty, the `command` is invalid, or the file size exceeds `max_size_mb`.
*   **`FFmpegError`**: If an error occurs during processing on the client-side. The original error message from FFmpeg.wasm is included.

---

### v2 Component (`ffmpeg_component_v2`)

Designed for browser-only environments like **stlite**.

**Compatibility:** Requires **Streamlit version 1.51.0 or newer**.

**Example:**
```python
import streamlit as st
from ffmpeg_component_v2 import ffmpeg_process_stlite, FFmpegError
from typing import List, Optional

st.title("v2 stlite FFmpeg Component Demo")

f = st.file_uploader('Upload a video', type=['mp4', 'mov'])

if f:
    video_data = f.getvalue()
    try:
        command = ['-i', 'input.mp4', '-vf', 'format=gray', 'output.webm']
        out = ffmpeg_process_stlite(data=video_data, command=command)
        st.video(out, format='video/webm')
    except (FFmpegError, ValueError) as e:
        st.error(e)
```
See `example_stlite_app.py` for more detailed examples.

#### API Reference: `ffmpeg_process_stlite`

The API for the v2 component is identical to the v1 component.

```python
ffmpeg_process_stlite(
    data: bytes,
    command: List[str],
    max_size_mb: int = 100
) -> Optional[bytes]
```

*   **`data`**: The raw byte content of the media file.
*   **`command`**: A list of FFmpeg command-line arguments.
*   **`max_size_mb`**: The maximum allowable file size in megabytes. Defaults to `100`.

**Returns:**
*   The processed media file as `bytes` on success, or `None`.

**Raises:**
*   **`ValueError`**: For invalid inputs.
*   **`FFmpegError`**: For client-side processing errors.

---

## Limitations and Best Practices

Client-side processing with FFmpeg.wasm is powerful, but it's important to be aware of the limitations imposed by the browser environment.

*   **Browser Memory:** FFmpeg requires significant memory to process media files. During processing, it may use up to **3-4 times the original file size** in memory. A browser tab that consumes too much memory may crash.
*   **File Size Recommendations:** To ensure stability, especially on mobile devices, it is highly recommended to enforce file size limits.
    *   **Desktop:** Files up to **100 MB** are generally safe to process.
    *   **Mobile:** Files should ideally be kept under **20-30 MB**, as mobile browsers have more restrictive memory limits.
*   **Performance:** Complex FFmpeg operations that involve re-encoding (e.g., changing video codecs, applying complex filters) will be significantly slower than simpler operations that only copy streams (e.g., trimming with `-c copy`). Inform your users that processing may take time.
*   **Error Handling:** Always wrap calls to the component functions in a `try...except` block to gracefully handle potential `ValueError` (for oversized files) and `FFmpegError` (for processing failures) exceptions.

---

## Development

This project uses Python with Streamlit for the backend and Node.js for the v1 component's frontend. The v2 component is static and requires no build step.

### Initial Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/example/streamlit-ffmpeg-wasm.git
    cd streamlit-ffmpeg-wasm
    ```
2.  **Install Python dependencies:**
    ```bash
    pip install streamlit
    ```
3.  **Install frontend dependencies for the v1 component:**
    ```bash
    npm install --prefix ffmpeg_component_v1/frontend
    ```

### Running the v1 Component in Development Mode

Development mode for the v1 component uses the Vite dev server for hot-reloading, which is much faster than rebuilding on every change.

1.  **Start the frontend dev server:**
    Open a new terminal and run:
    ```bash
    npm run dev --prefix ffmpeg_component_v1/frontend
    ```
    This will start the Vite server, typically on `http://localhost:5173`.

2.  **Run the Streamlit example app:**
    In your original terminal, set the environment variable to enable development mode and run the app:
    ```bash
    export STREAMLIT_COMPONENT_DEV=1
    streamlit run example_app.py
    ```
    The component will now connect to the Vite dev server instead of using the static build artifacts.

### Building the v1 Component for Production

To create the static frontend assets that will be packaged with the Python library, run the build command:
```bash
npm run build --prefix ffmpeg_component_v1/frontend
```
The output will be placed in `ffmpeg_component_v1/frontend/build`. The component will use these files by default when `STREAMLIT_COMPONENT_DEV` is not set to `1`.
