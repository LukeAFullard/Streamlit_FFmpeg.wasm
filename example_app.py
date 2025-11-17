import streamlit as st
from ffmpeg_component_v1 import ffmpeg_process

st.set_page_config(layout="wide")

st.title("v1 Client-Side Video Processing with FFmpeg.wasm")
st.markdown("Upload a short video and apply FFmpeg commands, processed in the browser.")

f = st.file_uploader('Upload a video (MP4, MOV, AVI)', type=['mp4', 'mov', 'avi'])

if f:
    st.video(f)
    video_data = f.getvalue()  # Read the file content once

    st.header("FFmpeg Operations")

    operation = st.selectbox("Choose an operation", [
        "Trim to 5 seconds",
        "Convert to Grayscale",
        "Create a 3-second GIF",
        "Extract Audio (AAC)",
    ])

    run_button = st.button("Run Operation")

    if run_button:
        command = []
        output_filename = ""
        output_mime = ""
        output_type = "video"  # 'video', 'image', or 'audio'

        if operation == "Trim to 5 seconds":
            command = ['-i', 'input.mp4', '-t', '5', '-c', 'copy', 'output.webm']
            output_filename = "trimmed.webm"
            output_mime = "video/webm"

        elif operation == "Convert to Grayscale":
            command = ['-i', 'input.mp4', '-vf', 'format=gray', 'output.webm']
            output_filename = "grayscale.webm"
            output_mime = "video/webm"
            st.info("Re-encoding is slower than copying codecs.")

        elif operation == "Create a 3-second GIF":
            command = ['-i', 'input.mp4', '-t', '3', '-vf', 'fps=10,scale=320:-1:flags=lanczos', 'output.gif']
            output_filename = "animation.gif"
            output_mime = "image/gif"
            output_type = "image"

        elif operation == "Extract Audio (AAC)":
            command = ['-i', 'input.mp4', '-vn', '-acodec', 'copy', 'output.aac']
            output_filename = "extracted_audio.aac"
            output_mime = "audio/aac"
            output_type = "audio"

        if command:
            with st.spinner('Processing... this may take a moment.'):
                try:
                    out = ffmpeg_process(video_data, command)
                    if out:
                        st.success("Processing complete!")

                        if output_type == "video":
                            st.video(out, format=output_mime)
                        elif output_type == "image":
                            st.image(out)
                        elif output_type == "audio":
                            st.audio(out, format=output_mime)

                        st.download_button(f'Download {output_filename}', out, output_filename, mime=output_mime)
                    else:
                        st.error("Processing failed or returned no data.")
                except Exception as e:
                    st.error(f"An error occurred: {e}")
