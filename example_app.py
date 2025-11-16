import streamlit as st
from ffmpeg_component import ffmpeg_process

st.set_page_config(layout="wide")

st.title("Client-Side Video Processing with FFmpeg.wasm")
st.markdown("Upload a short video and apply simple FFmpeg commands, all within your browser.")

f = st.file_uploader('Upload an MP4 video', type=['mp4', 'mov', 'avi'])

if f:
    st.video(f)
    video_data = f.getvalue()  # Read the file content once

    st.header("FFmpeg Operations")

    # Simple trim operation
    if st.button('Trim to first 5 seconds'):
        with st.spinner('Processing... this may take a moment.'):
            try:
                # Command for ffmpeg.exec: input is already written as 'input.mp4'
                # -i: input file
                # -t 5: trim to 5 seconds
                # -c copy: use the same codecs to avoid re-encoding (faster)
                # output.webm: the output filename
                command = ['-i', 'input.mp4', '-t', '5', '-c', 'copy', 'output.webm']
                out = ffmpeg_process(video_data, command)

                if out:
                    st.success("Processing complete!")
                    st.video(out)
                    st.download_button('Download Trimmed Video', out, 'trimmed.webm', mime='video/webm')
                else:
                    st.error("Processing failed or returned no data.")
            except Exception as e:
                st.error(f"An error occurred: {e}")

    # Convert to grayscale
    if st.button('Convert to Grayscale'):
        with st.spinner('Processing and re-encoding... this will be slower.'):
            try:
                # -vf "format=gray": video filter to apply grayscale
                command = ['-i', 'input.mp4', '-vf', 'format=gray', 'output.webm']
                out = ffmpeg_process(video_data, command)

                if out:
                    st.success("Conversion complete!")
                    st.video(out)
                    st.download_button('Download Grayscale Video', out, 'grayscale.webm', mime='video/webm')
                else:
                    st.error("Processing failed or returned no data.")
            except Exception as e:
                st.error(f"An error occurred: {e}")
