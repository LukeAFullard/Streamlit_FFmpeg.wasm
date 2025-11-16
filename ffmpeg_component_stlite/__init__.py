
import streamlit.components.v1 as components
import base64
import os

# The component is designed to be served statically, so we point to the public directory
parent_dir = os.path.dirname(os.path.abspath(__file__))
component_dir = os.path.join(parent_dir, "frontend/public")

_component_func = components.declare_component(
    'ffmpeg_component_stlite',
    path=component_dir
)


def ffmpeg_process_stlite(data: bytes, command: list):
    """
    Runs a general FFmpeg command on the provided video data using a client-side
def ffmpeg_trim_stlite(data: bytes, seconds: int = 10):
    """
    Trims a video to the specified number of seconds using a client-side
    FFmpeg.wasm component compatible with stlite.

    Args:
        data (bytes): The video data to process.
        command (list): The FFmpeg command to execute as a list of strings.
        seconds (int): The duration to trim the video to.

    Returns:
        bytes: The processed video data, or None if an error occurred.
    """
    b64 = base64.b64encode(data).decode('ascii')
    res = _component_func(command=command, data=b64)
    res = _component_func(cmd='trim', data=b64, seconds=seconds)

    if not res:
        return None

    if 'error' in res:
        raise RuntimeError(res['error'])

    out_b64 = res.get('output')
    if out_b64:
        return base64.b64decode(out_b64)
    return None
