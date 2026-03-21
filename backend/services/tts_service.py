import edge_tts
import uuid
import os

TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)

async def generate_audio(text: str, voice: str = "en-US-AriaNeural") -> dict:
    file_id = uuid.uuid4().hex
    audio_path = os.path.join(TEMP_DIR, f"{file_id}.mp3")
    subtitles_path = os.path.join(TEMP_DIR, f"{file_id}.vtt")
    
    communicate = edge_tts.Communicate(text, voice)
    submaker = edge_tts.SubMaker()
    
    with open(audio_path, "wb") as file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                file.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                submaker.create_sub((chunk["offset"], chunk["duration"]), chunk["text"])
                
    with open(subtitles_path, "w", encoding="utf-8") as file:
        file.write(submaker.get_srt() if hasattr(submaker, "get_srt") else submaker.generate_subs())

        
    return {
        "audio_path": audio_path,
        "subtitles_path": subtitles_path
    }
