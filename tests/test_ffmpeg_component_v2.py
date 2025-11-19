import pytest
import base64
from unittest.mock import patch
from ffmpeg_component_v2 import ffmpeg_process_stlite, FFmpegError


@patch('ffmpeg_component_v2._component_func')
def test_ffmpeg_process_stlite_success(mock_component_func):
    """Test a successful component call."""
    mock_output = b'processed video data'
    mock_component_func.return_value = {
        'output': base64.b64encode(mock_output).decode('ascii')
    }
    video_data = b"dummy video data"
    command = ["-i", "input.mp4", "-t", "0.5", "output.mp4"]
    result = ffmpeg_process_stlite(video_data, command, "input.mp4")
    assert result == mock_output
    mock_component_func.assert_called_once()


@patch('ffmpeg_component_v2._component_func')
def test_ffmpeg_process_stlite_component_error(mock_component_func):
    """Test that a frontend error is raised correctly."""
    mock_component_func.return_value = {'error': 'Client-side processing failed.'}
    video_data = b"dummy video data"
    command = ["-i", "input.mp4", "-invalid", "output.mp4"]
    with pytest.raises(FFmpegError, match="A client-side FFmpeg error occurred: Client-side processing failed."):
        ffmpeg_process_stlite(video_data, command, "input.mp4")
    mock_component_func.assert_called_once()


@pytest.mark.parametrize(
    "test_input, command, filename, max_size_mb, error_message",
    [
        (b"", ["-i", "in.mp4"], "in.mp4", 100, "Input data cannot be empty"),
        (b"a" * 1049, ["-i", "in.mp4"], "in.mp4", 0.001, "File is too large"),
        (b"some data", [], "in.mp4", 100, "The 'command' argument must be a non-empty list of strings"),
        (b"some data", ["-i", "in.mp4"], "", 100, "The 'filename' argument must be a non-empty string"),
    ]
)
@patch('ffmpeg_component_v2._component_func')
def test_ffmpeg_process_stlite_input_validation(mock_component_func, test_input, command, filename, max_size_mb, error_message):
    """Test that input validation raises ValueErrors."""
    with pytest.raises(ValueError, match=error_message):
        ffmpeg_process_stlite(test_input, command, filename, max_size_mb=max_size_mb)
    mock_component_func.assert_not_called()
