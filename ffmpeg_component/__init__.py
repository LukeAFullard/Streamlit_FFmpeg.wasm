
import streamlit.components.v1 as components
import base64
import os

_RELEASE = True

if not _RELEASE:
    _component_func = components.declare_component(
        "ffmpeg_component",
        url="http://localhost:5173", # Vite dev server
    )
else:
    parent_dir = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.join(parent_dir, "frontend/build")
    _component_func = components.declare_component("ffmpeg_component", path=build_dir)


def ffmpeg_process(data: bytes, command: list):
    b64 = base64.b64encode(data).decode('ascii')
    result = _component_func(data=b64, command=command)
    if not result:
        return None

    if 'error' in result:
        raise RuntimeError(result['error'])

    out_b64 = result.get('output')
    if out_b64:
        return base64.b64decode(out_b64)
    return None
