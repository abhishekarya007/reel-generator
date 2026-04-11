from fastapi import FastAPI, BackgroundTasks, HTTPException, File, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import asyncio
import requests
import shutil
import uuid
import subprocess
from dotenv import load_dotenv

from services.tts_service import generate_audio
from services.video_service import fetch_videos
from services.editor_service import create_reel, create_custom_reel, create_preview_reel

load_dotenv()

app = FastAPI(title="Reel Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoClip(BaseModel):
    url: str
    start_time: float
    end_time: float

class GenerateRequest(BaseModel):
    mode: str = "quick" # "quick" or "custom"
    script: str
    keywords: Optional[str] = ""
    clips: Optional[List[VideoClip]] = []
    voice: str = "en-US-AriaNeural"
    rate: str = "+0%"
    pitch: str = "default"
    volume: str = "+0%"
    remove_silence: bool = False
    enhance_voice: bool = False
    aspect_ratio: str = "9:16"
    transition_style: str = "none"
    is_preview: bool = False
    audio_path: Optional[str] = None
    subtitles_path: Optional[str] = None

class GenerateAudioRequest(BaseModel):
    script: str
    voice: str = "en-US-AriaNeural"
    rate: str = "+0%"
    pitch: str = "default"
    volume: str = "+0%"
    remove_silence: bool = False
    enhance_voice: bool = False

@app.get("/")
def read_root():
    return {"message": "Reel Generator API is running!"}

@app.get("/api/videos/search")
def search_videos(query: str, num_videos: int = 15):
    api_key = os.getenv("PEXELS_API_KEY")
    if not api_key or api_key == "your_pexels_api_key_here":
        raise HTTPException(status_code=400, detail="Valid PEXELS_API_KEY is not set.")
    headers = {"Authorization": api_key}
    url = f"https://api.pexels.com/videos/search?query={query}&per_page={num_videos}&orientation=portrait"
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

@app.post("/api/videos/upload")
async def upload_video(file: UploadFile = File(...)):
    file_ext = file.filename.split('.')[-1]
    filename = f"upload_{uuid.uuid4().hex}.{file_ext}"
    file_path = os.path.join("temp", filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": f"http://localhost:8000/api/video/{filename}", "path": file_path}

@app.post("/api/audio/upload")
async def upload_audio(file: UploadFile = File(...)):
    allowed_types = {"audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/m4a", "audio/aac", "audio/ogg", "audio/x-m4a"}
    ct = (file.content_type or "").lower()
    ext = (file.filename or "").split(".")[-1].lower()
    if ct not in allowed_types and ext not in {"mp3", "wav", "m4a", "aac", "ogg"}:
        raise HTTPException(status_code=400, detail="Unsupported audio format. Use mp3, wav, m4a, aac or ogg.")
    
    safe_ext = ext if ext in {"mp3", "wav", "m4a", "aac", "ogg"} else "mp3"
    filename = f"upload_audio_{uuid.uuid4().hex}.{safe_ext}"
    file_path = os.path.join("temp", filename)
    os.makedirs("temp", exist_ok=True)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Measure exact duration via ffprobe
    duration = 0.0
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", file_path],
            capture_output=True, text=True, timeout=15
        )
        duration = round(float(result.stdout.strip()), 2)
    except Exception:
        pass
    
    return {
        "status": "success",
        "audio_url": f"http://localhost:8000/api/video/{filename}",
        "audio_path": file_path,
        "subtitles_path": None,
        "duration": duration
    }

async def download_clip_if_needed(url: str) -> str:
    if url.startswith("http://localhost:8000/api/video/"):
        return os.path.join("temp", url.split("/")[-1])
    vid_resp = requests.get(url, stream=True)
    vid_resp.raise_for_status()
    file_path = os.path.join("temp", f"dl_{uuid.uuid4().hex}.mp4")
    with open(file_path, "wb") as f:
        for chunk in vid_resp.iter_content(chunk_size=8192):
            f.write(chunk)
    return file_path

@app.post("/api/generate_audio")
async def generate_only_audio(request: GenerateAudioRequest):
    try:
        audio_data = await generate_audio(
            request.script, 
            voice=request.voice, 
            rate=request.rate, 
            pitch=request.pitch,
            volume=request.volume,
            remove_silence=request.remove_silence,
            enhance_voice=request.enhance_voice
        )
        audio_filename = os.path.basename(audio_data["audio_path"])
        return {
            "status": "success",
            "audio_url": f"http://localhost:8000/api/video/{audio_filename}",
            "audio_path": audio_data["audio_path"],
            "subtitles_path": audio_data["subtitles_path"],
            "duration": audio_data.get("duration", 0.0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate")
async def generate_reel(request: GenerateRequest):
    try:
        if request.is_preview and request.mode == "custom":
            loop = asyncio.get_event_loop()
            video_paths_to_cleanup = []
            custom_video_data = []
            
            if request.clips:
                for clip in request.clips:
                    local_path = await download_clip_if_needed(clip.url)
                    if not local_path.startswith("temp/upload_"):
                        video_paths_to_cleanup.append(local_path)
                    custom_video_data.append((local_path, clip.start_time, clip.end_time))
                
            if not custom_video_data:
                raise HTTPException(status_code=400, detail="No timeline clips to preview.")
            
            final_video_path = await loop.run_in_executor(
                None,
                create_preview_reel,
                custom_video_data,
                request.aspect_ratio,
                request.transition_style,
                getattr(request, 'audio_path', None)
            )
            filename = os.path.basename(final_video_path)
            
            # Fast cleanup for preview
            for vp in video_paths_to_cleanup:
                if vp and os.path.exists(vp): os.remove(vp)
                
            return {"status": "success", "url": f"http://localhost:8000/api/video/{filename}"}

        # 1. Generate Audio OR bind cached decoupled tracks
        if request.mode == "custom" and type(request.audio_path) is str and os.path.exists(request.audio_path):
            audio_path = request.audio_path
            subtitles_path = request.subtitles_path
        else:
            audio_data = await generate_audio(
                request.script, 
                voice=request.voice, 
                rate=request.rate, 
                pitch=request.pitch,
                volume=request.volume,
                remove_silence=request.remove_silence,
                enhance_voice=request.enhance_voice
            )
            audio_path = audio_data["audio_path"]
            subtitles_path = audio_data["subtitles_path"]
        
        # 2. Process Videos based on mode
        loop = asyncio.get_event_loop()
        final_video_path = ""
        video_paths_to_cleanup = []
        
        if request.mode == "quick":
            video_paths = fetch_videos(request.keywords, num_videos=3)
            if not video_paths:
                raise HTTPException(status_code=400, detail="Could not find stock videos for keywords.")
            video_paths_to_cleanup = video_paths
            final_video_path = await loop.run_in_executor(
                None, 
                create_reel, 
                audio_path, 
                video_paths, 
                subtitles_path,
                request.aspect_ratio
            )
        else:
            custom_video_data = []
            if request.clips:
                for clip in request.clips:
                    local_path = await download_clip_if_needed(clip.url)
                    if not local_path.startswith("temp/upload_"): # Preserve uploads for reuse
                        video_paths_to_cleanup.append(local_path)
                    custom_video_data.append((local_path, clip.start_time, clip.end_time))
            if not custom_video_data:
                raise HTTPException(status_code=400, detail="No clips provided for custom mode.")
                
            final_video_path = await loop.run_in_executor(
                None,
                create_custom_reel,
                audio_path,
                custom_video_data,
                subtitles_path,
                request.aspect_ratio,
                request.transition_style
            )
        
        filename = os.path.basename(final_video_path)
        
        # Cleanup intermediate files
        try:
            if not request.audio_path and getattr(audio_path, 'strip', None) and os.path.exists(str(audio_path)): os.remove(str(audio_path))
            if not request.audio_path and getattr(subtitles_path, 'strip', None) and os.path.exists(str(subtitles_path)): os.remove(str(subtitles_path))
            for vp in video_paths_to_cleanup:
                if vp and os.path.exists(vp): os.remove(vp)
        except Exception as cleanup_err:
            print(f"Cleanup Error: {cleanup_err}")
            
        return {"status": "success", "video_url": f"/api/video/{filename}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/video/{filename}")
async def get_video(filename: str):
    file_path = os.path.join("temp", filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="video/mp4")
    raise HTTPException(status_code=404, detail="Video not found")
