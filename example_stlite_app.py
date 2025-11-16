import streamlit as st
from ffmpeg_component_stlite import ffmpeg_process_stlite

st.set_page_config(layout="wide")

st.title("FFmpeg.wasm Component for stlite (General Purpose)")
st.markdown("This demonstrates the **v2-style** (frontend-only) component. It runs entirely in the browser and is compatible with `stlite`.")

f = st.file_uploader('Upload a short video (e.g., MP4, MOV)', type=['mp4', 'mov', 'avi'])

if f:
    st.video(f)
    video_data = f.getvalue()

    st.header("FFmpeg Operations")

    # 1. Trimming Operation
    st.subheader("Trim Video")
    seconds_to_trim = st.slider("Trim duration (seconds):", 1, 60, 5)
    if st.button('Trim to ' + str(seconds_to_trim) + ' seconds'):
        with st.spinner('Trimming in browser...'):
            try:
                command = ['-i', 'input.mp4', '-t', str(seconds_to_trim), '-c', 'copy', 'output.webm']
                out = ffmpeg_process_stlite(data=video_data, command=command)

                if out:
                    st.success("Trim complete!")
                    st.video(out, format='video/webm')
                    st.download_button('Download Trimmed', out, 'trimmed.webm', 'video/webm')
                else:
                    st.warning("Component did not return data.")
            except Exception as e:
                st.error(f"An error occurred: {e}")

    # 2. Grayscale Conversion
    st.subheader("Convert to Grayscale")
    if st.button('Convert to Grayscale'):
        with st.spinner('Converting in browser... this will be slower.'):
            try:
                command = ['-i', 'input.mp4', '-vf', 'format=gray', 'output.webm']
                out = ffmpeg_process_stlite(data=video_data, command=command)

                if out:
                    st.success("Conversion complete!")
                    st.video(out, format='video/webm')
                    st.download_button('Download Grayscale', out, 'grayscale.webm', 'video/webm')
                else:
                    st.warning("Component did not return data.")
            except Exception as e:
                st.error(f"An error occurred: {e}")
