import streamlit.components.v1 as components
import base64
import os
import logging
from typing import Optional, List

# Set up logger
logger = logging.getLogger(__name__)

# Check environment variable to determine if we're in development, default to release mode
_RELEASE = os.getenv("STREAMLIT_COMPONENT_DEV") != "1"

if not _RELEASE:
    _component_func = components.declare_component(
        "ffmpeg_component_v1",
        url="http://localhost:5173",  # Vite dev server
    )
else:
    parent_dir = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.join(parent_dir, "frontend/build")
    _component_func = components.declare_component("ffmpeg_component_v1", path=build_dir)


class FFmpegError(Exception):
    """Custom exception for FFmpeg processing errors."""
    pass


def ffmpeg_process(
    data: bytes,
    command: List[str],
    max_size_mb: int = 100
) -> Optional[bytes]:
    """
    Process video data using FFmpeg.wasm in the browser.

    Args:
        data: Input video file as bytes.
        command: FFmpeg command arguments (e.g., ['-i', 'input.mp4', '-t', '5', 'output.webm']).
        max_size_mb: Maximum file size in MB (default 100MB).

    Returns:
        Processed video as bytes, or None if the operation is cancelled by the user.

    Raises:
        ValueError: If input validation fails (e.g., empty data, large file).
        FFmpegError: If FFmpeg processing fails on the client-side.
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

    logger.info(f"Processing {file_size_mb:.1f}MB file with command: {' '.join(command)}")

    try:
        b64_data = base64.b64encode(data).decode('ascii')

        # Use a unique key to ensure the component re-renders on new data
        component_key = f"ffmpeg_{hash(data)}_{hash(tuple(command))}"

        result = _component_func(data=b64_data, command=command, key=component_key)

        if result is None:
            logger.warning("Component returned None. This may indicate the user navigated away.")
            return None

        if 'error' in result:
            error_msg = result['error']
            logger.error(f"FFmpeg processing failed on the client: {error_msg}")
            raise FFmpegError(f"A client-side FFmpeg error occurred: {error_msg}")

        output_b64 = result.get('output')
        if not output_b64:
            raise FFmpegError("Processing completed, but the component did not return any output data.")

        output_data = base64.b64decode(output_b64)
        output_size_mb = len(output_data) / (1024 * 1024)
        logger.info(f"Processing successful. Output size: {output_size_mb:.1f}MB")

        return output_data

    except FFmpegError:
        raise  # Re-raise the specific error
    except Exception as e:
        logger.exception("An unexpected error occurred while running the FFmpeg component.")
        raise FFmpegError(f"An unexpected error occurred: {e}") from e
