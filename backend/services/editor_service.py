import os
import uuid
import subprocess
from imageio_ffmpeg import get_ffmpeg_exe

TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)

def create_reel(audio_path: str, video_paths: list, subtitles_path: str = None, remove_silence: bool = False, enhance_voice: bool = False) -> str:
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
    
    # Audio filter chain
    audio_filters = []
    if remove_silence:
        audio_filters.append("silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-35dB")
    if enhance_voice:
        audio_filters.append("bass=g=5,treble=g=3,acompressor=ratio=4")
        
    audio_filter_str = ",".join(audio_filters) if audio_filters else "anull"

    # Check if subtitles present - Note subtitles code disabled below temporarily based on prior instruction
    if subtitles_path and os.path.exists(subtitles_path):
        sub_path_escaped = os.path.abspath(subtitles_path).replace("\\", "/").replace(":", "\\:")
        filter_complex = f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v];[1:a]{audio_filter_str}[a]"
    else:
        filter_complex = f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v];[1:a]{audio_filter_str}[a]"
        
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
