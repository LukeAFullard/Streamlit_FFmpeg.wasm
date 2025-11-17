import streamlit as st
from ffmpeg_component_v1 import ffmpeg_process, FFmpegError

st.set_page_config(layout="wide")

st.title("v1 Client-Side Video Processing with FFmpeg.wasm")
st.markdown("Upload a video and apply FFmpeg commands, processed entirely in your browser.")

# Display file size recommendations
st.info("""
**File Size Recommendations:**
- **Desktop:** Up to 100MB for smooth performance.
- **Mobile:** Up to 20MB is recommended.
- Very large files may slow down or crash the browser tab.
""")

f = st.file_uploader('Upload a video (MP4, MOV, AVI)', type=['mp4', 'mov', 'avi'])

if f:
    video_data = f.getvalue()
    file_size_mb = len(video_data) / (1024 * 1024)

    # Visual feedback on file size
    if file_size_mb > 100:
        st.error(f"⚠️ File is very large: {file_size_mb:.1f}MB. Processing may fail. Recommended max is 100MB.")
    elif file_size_mb > 20:
        st.warning(f"File size: {file_size_mb:.1f}MB. Performance may be slow on some devices.")
    else:
        st.success(f"File size: {file_size_mb:.1f}MB. Ready to process.")

    st.video(f)

    st.header("FFmpeg Operations")
    operation = st.selectbox("Choose an operation", [
        "Trim to 5 seconds",
        "Convert to Grayscale",
        "Create a 3-second GIF",
        "Extract Audio (AAC)",
    ])

    if st.button("Run Operation"):
        command, output_filename, output_mime, output_type = [], "", "", "video"

        if operation == "Trim to 5 seconds":
            command, output_filename, output_mime = ['-i', 'input.mp4', '-t', '5', '-c', 'copy', 'output.webm'], "trimmed.webm", "video/webm"
        elif operation == "Convert to Grayscale":
            st.info("Re-encoding is slower than copying codecs.")
            command, output_filename, output_mime = ['-i', 'input.mp4', '-vf', 'format=gray', 'output.webm'], "grayscale.webm", "video/webm"
        elif operation == "Create a 3-second GIF":
            command, output_filename, output_mime, output_type = ['-i', 'input.mp4', '-t', '3', '-vf', 'fps=10,scale=320:-1:flags=lanczos', 'output.gif'], "animation.gif", "image/gif", "image"
        elif operation == "Extract Audio (AAC)":
            command, output_filename, output_mime, output_type = ['-i', 'input.mp4', '-vn', '-acodec', 'copy', 'output.aac'], "audio.aac", "audio/aac", "audio"

        if command:
            with st.spinner('Processing... This may take a moment.'):
                try:
                    out = ffmpeg_process(video_data, command)
                    if out:
                        st.success("Processing complete!")
                        if output_type == "video": st.video(out, format=output_mime)
                        elif output_type == "image": st.image(out)
                        elif output_type == "audio": st.audio(out, format=output_mime)

                        st.download_button(f'Download {output_filename}', out, output_filename, mime=output_mime)
                    else:
                        st.error("Processing failed to return data. The user may have cancelled the operation.")
                except (ValueError, FFmpegError) as e:
                    st.error(f"An error occurred: {e}")
                except Exception as e:
                    st.error(f"An unexpected error occurred: {e}")
