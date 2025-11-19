import streamlit as st
from ffmpeg_component_v2 import ffmpeg_process_v2, FFmpegError

st.set_page_config(layout="wide")

st.title("v2 FFmpeg.wasm Component (Modern API)")
st.markdown("Uses Streamlit's v2 component API with bidirectional state management. The component now handles its own dependency loading.")

# Display file size recommendations
st.info("""
**File Size Recommendations:**
- **Desktop:** Up to 100MB for smooth performance.
- **Mobile:** Up to 20MB is recommended.
""")

f = st.file_uploader('Upload a video (e.g., MP4, MOV)', type=['mp4', 'mov', 'avi'])

if f:
    video_data = f.getvalue()
    file_size_mb = len(video_data) / (1024 * 1024)

    if file_size_mb > 100:
        st.error(f"⚠️ File is very large: {file_size_mb:.1f}MB. Processing may fail.")
    elif file_size_mb > 20:
        st.warning(f"File size: {file_size_mb:.1f}MB. Performance may be slow.")
    else:
        st.success(f"File size: {file_size_mb:.1f}MB. Ready to process.")

    st.video(f)

    st.header("FFmpeg Operations")
    operation = st.selectbox("Choose an operation", [
        "Trim Video", "Convert to Grayscale", "Convert to GIF", "Extract Audio"
    ])

    seconds_to_trim = 5
    if operation == "Trim Video":
        seconds_to_trim = st.slider("Trim to (seconds):", 1, 60, 5)

    if st.button("Run FFmpeg Command"):
        command, output_filename, output_mime, output_type = [], "", "", "video"
        input_filename = f.name

        if operation == "Trim Video":
            command = ['-i', input_filename, '-t', str(seconds_to_trim), '-c', 'copy', 'output.webm']
            output_filename, output_mime = f"trimmed_{seconds_to_trim}s.webm", "video/webm"
        elif operation == "Convert to Grayscale":
            command = ['-i', input_filename, '-vf', 'format=gray', 'output.webm']
            output_filename, output_mime = "grayscale.webm", "video/webm"
        elif operation == "Convert to GIF":
            command = ['-i', input_filename, '-t', '3', '-vf', 'fps=10,scale=320:-1:flags=lanczos', 'output.gif']
            output_filename, output_mime, output_type = "converted.gif", "image/gif", "image"
        elif operation == "Extract Audio":
            command = ['-i', input_filename, '-vn', '-acodec', 'copy', 'output.aac']
            output_filename, output_mime, output_type = "audio.aac", "audio/aac", "audio"

        if command:
            with st.spinner('Processing with v2 component...'):
                try:
                    # V2 API call
                    out_data = ffmpeg_process_v2(
                        video_data,
                        command=command,
                        filename=input_filename
                    )

                    if out_data:
                        st.success("Processing complete!")
                        if output_type == "video":
                            st.video(out_data, format=output_mime)
                        elif output_type == "image":
                            st.image(out_data)
                        elif output_type == "audio":
                            st.audio(out_data, format=output_mime)

                        st.download_button(
                            'Download Output',
                            out_data,
                            output_filename,
                            mime=output_mime
                        )
                    else:
                        st.warning("Component did not return data.")

                except (ValueError, FFmpegError) as e:
                    st.error(f"Error: {e}")
                except Exception as e:
                    st.error(f"Unexpected error: {e}")