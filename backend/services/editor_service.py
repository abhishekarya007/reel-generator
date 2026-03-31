import os
import uuid
import subprocess
from imageio_ffmpeg import get_ffmpeg_exe

TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)

def create_reel(audio_path: str, video_paths: list, subtitles_path: str = None, remove_silence: bool = False, enhance_voice: bool = False, aspect_ratio: str = "9:16") -> str:
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
    ar_map = {"9:16": (1080, 1920), "1:1": (1080, 1080), "16:9": (1920, 1080)}
    w, h = ar_map.get(aspect_ratio, (1080, 1920))
    if subtitles_path and os.path.exists(subtitles_path):
        sub_path_escaped = os.path.abspath(subtitles_path).replace("\\", "/").replace(":", "\\:")
        filter_complex = f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps=30,format=yuv420p,setsar=1/1[v];[1:a]{audio_filter_str}[a]"
    else:
        filter_complex = f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps=30,format=yuv420p,setsar=1/1[v];[1:a]{audio_filter_str}[a]"
        
    cmd.extend([
        "-filter_complex", filter_complex,
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-pix_fmt", "yuv420p",
        "-profile:v", "high",
        "-level", "4.0",
        "-r", "30",
        "-movflags", "+faststart",
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

def create_custom_reel(audio_path: str, custom_videos: list, subtitles_path: str = None, remove_silence: bool = False, enhance_voice: bool = False, aspect_ratio: str = "9:16", transition_style: str = "none") -> str:
    ffmpeg_exe = get_ffmpeg_exe()
    output_path = os.path.join(TEMP_DIR, f"final_{uuid.uuid4().hex}.mp4")
    
    cmd = [ffmpeg_exe, "-y"]
    for vp, start, end in custom_videos:
        cmd.extend(["-i", os.path.abspath(vp)])
    cmd.extend(["-i", os.path.abspath(audio_path)])
    
    audio_idx = len(custom_videos)
    
    audio_filters = []
    # Disable remove_silence entirely in Custom Mode to preserve UI timeline duration & .vtt sync!
    if enhance_voice:
        audio_filters.append("bass=g=5,treble=g=3,acompressor=ratio=4")
    audio_filter_str = ",".join(audio_filters) if audio_filters else "anull"
    
    filter_complex_parts = []
    
    ar_map = {"9:16": (1080, 1920), "1:1": (1080, 1080), "16:9": (1920, 1080)}
    w, h = ar_map.get(aspect_ratio, (1080, 1920))
    
    # Trim and scale each video individually
    clip_durations = []
    for i, (vp, start, end) in enumerate(custom_videos):
        duration = max(0.5, end - start)  # Ensure minimum length for transitions
        clip_durations.append(duration)
        filter_complex_parts.append(f"[{i}:v]trim=start={start}:duration={duration},setpts=PTS-STARTPTS,scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps=30,format=yuv420p,setsar=1/1[v{i}]")
        
    final_v_out = ""
    if transition_style == "none" or len(custom_videos) < 2:
        concat_inputs = "".join([f"[v{i}]" for i in range(len(custom_videos))])
        filter_complex_parts.append(f"{concat_inputs}concat=n={len(custom_videos)}:v=1:a=0[v_out]")
        final_v_out = "[v_out]"
    else:
        valid_transitions = ["fade", "wipeleft", "wiperight", "slideleft", "slideright", "circlecrop", "rectcrop", "pixelize", "hblur", "smoothleft"]
        xstyle = transition_style if transition_style in valid_transitions else "fade"
        
        last_out = "[v0]"
        current_cumulative_duration = clip_durations[0]
        transition_duration = 0.5
        
        for i in range(1, len(custom_videos)):
            offset = current_cumulative_duration - transition_duration
            if offset < 0: offset = 0
            
            out_node = f"[xf{i}]"
            filter_complex_parts.append(f"{last_out}[v{i}]xfade=transition={xstyle}:duration={transition_duration}:offset={offset}{out_node}")
            last_out = out_node
            current_cumulative_duration = current_cumulative_duration + clip_durations[i] - transition_duration
            
        final_v_out = last_out

    # Audio mapping
    filter_complex_parts.append(f"[{audio_idx}:a]{audio_filter_str}[a_out]")
    
    cmd.extend([
        "-filter_complex", ";".join(filter_complex_parts),
        "-map", final_v_out,
        "-map", "[a_out]",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-pix_fmt", "yuv420p",
        "-profile:v", "high",
        "-level", "4.0",
        "-r", "30",
        "-movflags", "+faststart",
        "-shortest",
        output_path
    ])
    
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg Custom failed:\n{result.stderr}")
        
    return output_path

def create_preview_reel(custom_videos: list, aspect_ratio: str = "9:16", transition_style: str = "none") -> str:
    ffmpeg_exe = get_ffmpeg_exe()
    output_path = os.path.join(TEMP_DIR, f"preview_{uuid.uuid4().hex}.mp4")
    
    cmd = [ffmpeg_exe, "-y"]
    
    for vp, start, end in custom_videos:
        cmd.extend(["-t", str(max(0.5, end - start)), "-ss", str(start), "-i", os.path.abspath(vp)])
        
    ar_map = {"9:16": (360, 640), "1:1": (480, 480), "16:9": (640, 360)}
    w, h = ar_map.get(aspect_ratio, (360, 640))
    
    filter_complex_parts = []
    clip_durations = []
    
    for i, (vp, start, end) in enumerate(custom_videos):
        duration = max(0.5, end - start)  
        clip_durations.append(duration)
        filter_complex_parts.append(f"[{i}:v]trim=start=0:duration={duration},setpts=PTS-STARTPTS,scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps=30,format=yuv420p,setsar=1/1[v{i}]")
        
    final_v_out = ""
    if transition_style == "none" or len(custom_videos) < 2:
        concat_inputs = "".join([f"[v{i}]" for i in range(len(custom_videos))])
        filter_complex_parts.append(f"{concat_inputs}concat=n={len(custom_videos)}:v=1:a=0[v_out]")
        final_v_out = "[v_out]"
    else:
        valid_transitions = ["fade", "wipeleft", "wiperight", "slideleft", "slideright", "circlecrop", "rectcrop", "pixelize", "hblur", "smoothleft"]
        xstyle = transition_style if transition_style in valid_transitions else "fade"
        
        last_out = "[v0]"
        current_cumulative_duration = clip_durations[0]
        transition_duration = 0.5
        
        for i in range(1, len(custom_videos)):
            offset = current_cumulative_duration - transition_duration
            if offset < 0: offset = 0
            
            out_node = f"[xf{i}]"
            filter_complex_parts.append(f"{last_out}[v{i}]xfade=transition={xstyle}:duration={transition_duration}:offset={offset}{out_node}")
            last_out = out_node
            current_cumulative_duration = current_cumulative_duration + clip_durations[i] - transition_duration
            
        final_v_out = last_out

    cmd.extend([
        "-filter_complex", ";".join(filter_complex_parts),
        "-map", final_v_out,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "35",
        "-an",
        output_path
    ])
    
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg Preview failed:\n{result.stderr}")
        
    return output_path
