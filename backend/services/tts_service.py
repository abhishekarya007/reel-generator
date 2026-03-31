import edge_tts
import uuid
import os
import subprocess

def get_audio_duration(file_path: str) -> float:
    try:
        cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file_path]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return float(result.stdout.strip())
    except Exception:
        return 0.0

TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)

async def generate_audio(text: str, voice: str = "en-US-AriaNeural", rate: str = "+0%", pitch: str = "default", volume: str = "+0%", remove_silence: bool = False, enhance_voice: bool = False) -> dict:
    file_id = uuid.uuid4().hex
    audio_path = os.path.join(TEMP_DIR, f"{file_id}.mp3")
    subtitles_path = os.path.join(TEMP_DIR, f"{file_id}.vtt")
    
    # edge_tts expects pitch to be "+0Hz" format but we can pass 'default' or similar
    # However edge_tts requires standard attributes
    pitch_val = "+0Hz" if pitch == "default" else pitch
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch_val, volume=volume)
    submaker = edge_tts.SubMaker()
    final_end_time = 0.0
    
    with open(audio_path, "wb") as file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                file.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                submaker.create_sub((chunk["offset"], chunk["duration"]), chunk["text"])
                end = (chunk["offset"] + chunk["duration"]) / 10000000.0
                if end > final_end_time: 
                    final_end_time = end
                
    with open(subtitles_path, "w", encoding="utf-8") as file:
        file.write(submaker.get_srt() if hasattr(submaker, "get_srt") else submaker.generate_subs())

    if remove_silence or enhance_voice:
        audio_filters = []
        if remove_silence:
            audio_filters.append("silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-35dB")
        if enhance_voice:
            audio_filters.append("bass=g=5,treble=g=3,acompressor=ratio=4")
            
        enhanced_path = os.path.join(TEMP_DIR, f"{file_id}_enhanced.mp3")
        cmd = ["ffmpeg", "-y", "-i", audio_path, "-af", ",".join(audio_filters), enhanced_path]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        if os.path.exists(enhanced_path):
            os.remove(audio_path) # Clean up raw audio
            audio_path = enhanced_path
            final_end_time = get_audio_duration(audio_path)
            
    return {
        "audio_path": audio_path,
        "subtitles_path": subtitles_path,
        "duration": round(final_end_time, 2)
    }
