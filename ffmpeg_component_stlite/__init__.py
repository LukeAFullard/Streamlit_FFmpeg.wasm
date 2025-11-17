
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
    Runs an arbitrary FFmpeg command on the client-side using a component
    compatible with stlite.

    Args:
        data (bytes): The video data to process.
        command (list): The FFmpeg command arguments.

    Returns:
        bytes: The processed video data, or None if an error occurred.
    """
    b64 = base64.b64encode(data).decode('ascii')
    res = _component_func(data=b64, command=command)

    if not res:
        return None

    if 'error' in res:
        raise RuntimeError(res['error'])

    out_b64 = res.get('output')
    if out_b64:
        return base64.b64decode(out_b64)
    return None
