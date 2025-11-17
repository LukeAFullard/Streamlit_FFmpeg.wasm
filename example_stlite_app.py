import streamlit as st
from ffmpeg_component_v2 import ffmpeg_process_stlite

st.set_page_config(layout="wide")

st.title("v2 FFmpeg.wasm Component for stlite")
st.markdown("This demonstrates the generalized, frontend-only component running FFmpeg commands entirely in the browser.")

f = st.file_uploader('Upload a short video (e.g., MP4, MOV)', type=['mp4', 'mov', 'avi'])

if f:
    st.video(f)
    video_data = f.getvalue()

    st.header("FFmpeg Operations")

    # Let user choose an operation
    operation = st.selectbox("Choose an operation", [
        "Trim Video",
        "Convert to Grayscale",
        "Convert to GIF",
        "Extract Audio (AAC)"
    ])

    # Conditionally show the slider ONLY for the Trim operation
    seconds_to_trim = 0
    if operation == "Trim Video":
        seconds_to_trim = st.slider("Trim to (seconds):", 1, 60, 5, key="trim_slider")

    run_button = st.button("Run FFmpeg Command")

    if run_button:
        command = []
        output_filename = ""
        output_mime = ""
        output_type = "video"

        if operation == "Trim Video":
            command = ['-i', 'input.mp4', '-t', str(seconds_to_trim), '-c', 'copy', 'output.webm']
            output_filename = f"trimmed_{seconds_to_trim}s.webm"
            output_mime = "video/webm"
            output_type = "video"

        elif operation == "Convert to Grayscale":
            command = ['-i', 'input.mp4', '-vf', 'format=gray', 'output.webm']
            output_filename = "grayscale.webm"
            output_mime = "video/webm"
            output_type = "video"

        elif operation == "Convert to GIF":
            # Creates a 3-second GIF at 10 fps
            command = ['-i', 'input.mp4', '-t', '3', '-vf', 'fps=10,scale=320:-1:flags=lanczos', 'output.gif']
            output_filename = "converted.gif"
            output_mime = "image/gif"
            output_type = "image"

        elif operation == "Extract Audio (AAC)":
            # Extracts audio without re-encoding
            command = ['-i', 'input.mp4', '-vn', '-acodec', 'copy', 'output.aac']
            output_filename = "audio.aac"
            output_mime = "audio/aac"
            output_type = "audio"

        if command:
            with st.spinner('Processing in browser... this may take a moment.'):
                try:
                    out_data = ffmpeg_process_stlite(video_data, command=command)

                    if out_data:
                        st.success("Processing complete!")
                        if output_type == "video":
                            st.video(out_data, format=output_mime)
                        elif output_type == "image":
                            st.image(out_data)
                        elif output_type == "audio":
                            st.audio(out_data, format=output_mime)

                        st.download_button('Download Output', out_data, output_filename, mime=output_mime)
                    else:
                        st.warning("Component did not return data.")
                except Exception as e:
                    st.error(f"An error occurred: {e}")
