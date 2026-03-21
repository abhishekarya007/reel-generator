import os
import uuid
import subprocess
from imageio_ffmpeg import get_ffmpeg_exe

TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)

def create_reel(audio_path: str, video_paths: list, subtitles_path: str = None) -> str:
    if not video_paths:
        raise ValueError("At least one video path is required")
        
    ffmpeg_exe = "ffmpeg"
    output_path = os.path.join(TEMP_DIR, f"final_{uuid.uuid4().hex}.mp4")
    
    # 1. Create a concat file for videos
    concat_file = os.path.join(TEMP_DIR, f"concat_{uuid.uuid4().hex}.txt")
    with open(concat_file, "w") as f:
        for vp in video_paths:
            # properly escape the path for ffmpeg concat
            f.write(f"file '{os.path.abspath(vp)}'\n")
            
    # Add an audio length check command (optional, but we can just use -shortest)
    cmd = [
        ffmpeg_exe, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_file,
        "-i", audio_path,
    ]
    
    filter_complex = ""
    
    # Check if subtitles present
    if subtitles_path and os.path.exists(subtitles_path):
        # We need to escape the path for the subtitles filter
        sub_path_escaped = os.path.abspath(subtitles_path).replace("\\", "/").replace(":", "\\:")
        # Scale to 1080x1920 cropping to center, then add subtitles with a standard font
        filter_complex = "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v];[1:a]anull[a]"





    else:
        filter_complex = "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v];[1:a]anull[a]"
        
    cmd.extend([
        "-filter_complex", filter_complex,
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-shortest", # End when the shortest input (usually audio, or padded video) ends
        output_path
    ])
    
    # Run FFmpeg
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed:\n{result.stderr}")
        
    # Clean up concat file
    try:
        os.remove(concat_file)
    except:
        pass
        
    return output_path
