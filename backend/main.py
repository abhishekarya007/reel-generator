from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import asyncio
from dotenv import load_dotenv

from services.tts_service import generate_audio
from services.video_service import fetch_videos
from services.editor_service import create_reel

load_dotenv()

app = FastAPI(title="Reel Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    script: str
    keywords: str

@app.get("/")
def read_root():
    return {"message": "Reel Generator API is running!"}

@app.post("/api/generate")
async def generate_reel(request: GenerateRequest):
    try:
        # 1. Generate Audio & Subtitles
        audio_data = await generate_audio(request.script)
        audio_path = audio_data["audio_path"]
        subtitles_path = audio_data["subtitles_path"]
        
        # 2. Fetch Videos
        video_paths = fetch_videos(request.keywords, num_videos=3)
        if not video_paths:
            raise HTTPException(status_code=400, detail="Could not find stock videos for the given keywords.")
            
        # 3. Create Final Reel
        loop = asyncio.get_event_loop()
        final_video_path = await loop.run_in_executor(
            None, 
            create_reel, 
            audio_path, 
            video_paths, 
            subtitles_path
        )
        
        filename = os.path.basename(final_video_path)
        return {"status": "success", "video_url": f"/api/video/{filename}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/video/{filename}")
async def get_video(filename: str):
    file_path = os.path.join("temp", filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="video/mp4")
    raise HTTPException(status_code=404, detail="Video not found")
