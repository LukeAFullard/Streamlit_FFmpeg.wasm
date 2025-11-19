# ffmpeg_component_v2/__init__.py
import streamlit as st
import base64
import os
import logging
import hashlib
from typing import Optional, List

logger = logging.getLogger(__name__)

# Read the bundled JavaScript as a string (NOT the HTML file)
parent_dir = os.path.dirname(os.path.abspath(__file__))

# You need to create a NEW component.js file (not bundle.js with v1 API)
with open(os.path.join(parent_dir, "frontend/public/component.js"), "r") as f:
    js_content = f.read()

# Register TRUE v2 component with inline JS
_component_func = st.components.v2.component(
    "ffmpeg_component_v2",
    html="""
    <div id="ffmpeg-container">
        <p id="status">Ready to process video</p>
        <div id="loader" class="loader" style="display: none;"></div>
    </div>
    """,
    js=js_content,  # Inline JavaScript string, NOT HTML with script tags
    css="""
    .loader {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        animation: spin 1s linear infinite;
        display: inline-block;
        margin-left: 10px;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    """
)


class FFmpegError(Exception):
    """Custom exception for FFmpeg processing errors."""
    pass


def ffmpeg_process_v2(
    data: bytes,
    command: List[str],
    filename: str,
    max_size_mb: int = 100
) -> Optional[bytes]:
    """
    Process video using FFmpeg.wasm with Streamlit v2 component API.

    Requires Streamlit >= 1.51.0
    """
    if not data:
        raise ValueError("Input data cannot be empty.")

    file_size_mb = len(data) / (1024 * 1024)
    if file_size_mb > max_size_mb:
        raise ValueError(
            f"File is too large ({file_size_mb:.1f}MB). "
            f"Maximum allowed size is {max_size_mb}MB."
        )

    if not command or not isinstance(command, list):
        raise ValueError("The 'command' argument must be a non-empty list of strings.")

    if not filename or not isinstance(filename, str):
        raise ValueError("The 'filename' argument must be a non-empty string.")

    logger.info(f"Processing {file_size_mb:.1f}MB file '{filename}' with v2 component")

    b64_data = base64.b64encode(data).decode('ascii')
    data_hash = hashlib.md5(data).hexdigest()[:8]
    cmd_hash = hashlib.md5(str(command).encode()).hexdigest()[:8]
    component_key = f"ffmpeg_v2_{data_hash}_{cmd_hash}"

    # V2 API: Pass data and define callbacks
    result = _component_func(
        data={
            'videoData': b64_data,
            'command': command,
            'filename': filename,
            'maxSizeMB': max_size_mb
        },
        key=component_key,
        # V2 requires callbacks for each state/trigger value
        on_output_change=lambda: None,  # State value
        on_error_change=lambda: None,   # State value
        on_progress_change=lambda: None,  # State value
        on_complete_change=lambda: None,  # Trigger value
    )

    # V2 components return objects with attribute access (NOT dict)
    if result.error:
        logger.error(f"FFmpeg v2 processing failed: {result.error}")
        raise FFmpegError(f"Client-side error: {result.error}")

    if result.output:
        output_data = base64.b64decode(result.output)
        output_size_mb = len(output_data) / (1024 * 1024)
        logger.info(f"V2 processing successful. Output size: {output_size_mb:.1f}MB")
        return output_data

    return None