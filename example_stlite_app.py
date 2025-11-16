import streamlit as st
from ffmpeg_component_stlite import ffmpeg_trim_stlite

st.set_page_config(layout="wide")

st.title("FFmpeg.wasm Component for stlite")
st.markdown("This demonstrates the **v2-style** (frontend-only) component. It runs entirely in the browser and is compatible with `stlite`.")

f = st.file_uploader('Upload a short video to trim (e.g., MP4, MOV)', type=['mp4', 'mov', 'avi'])

if f:
    st.video(f)

    st.header("Trimming Operation")

    seconds_to_trim = st.slider("Trim video to (seconds):", 1, 60, 10)

    if st.button(f'Trim to {seconds_to_trim} seconds'):
        with st.spinner('Processing in browser... this may take a moment.'):
            try:
                video_data = f.getvalue()
                out = ffmpeg_trim_stlite(video_data, seconds=seconds_to_trim)

                if out:
                    st.success("Processing complete!")
                    st.video(out, format='video/webm')
                    st.download_button('Download Trimmed Video', out, 'trimmed.webm', mime='video/webm')
                else:
                    st.warning("Component did not return data. This can happen if the operation is cancelled or an error occurs in the frontend.")
            except Exception as e:
                st.error(f"An error occurred in the Python wrapper: {e}")
