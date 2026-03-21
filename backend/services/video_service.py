import requests
import os
import uuid
from typing import List

TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)

def fetch_videos(keywords: str, num_videos: int = 3) -> List[str]:
    api_key = os.getenv("PEXELS_API_KEY")
    if not api_key or api_key == "your_pexels_api_key_here":
        raise ValueError("Valid PEXELS_API_KEY is not set in environment.")

    headers = {"Authorization": api_key}
    url = f"https://api.pexels.com/videos/search?query={keywords}&per_page=15&orientation=portrait"
    
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    
    data = response.json()
    videos = data.get("videos", [])
    
    downloaded_paths = []
    
    for i, video in enumerate(videos[:num_videos]):
        # Get the best HD quality link
        video_files = video.get("video_files", [])
        if not video_files: continue
            
        # Try to find a link with height >= 1080
        hd_videos = [v for v in video_files if v.get("height", 0) >= 1080]
        selected_video = hd_videos[0] if hd_videos else video_files[0]
        
        video_url = selected_video.get("link")
        if not video_url: continue
        
        # Download video
        vid_resp = requests.get(video_url, stream=True)
        vid_resp.raise_for_status()
        
        file_path = os.path.join(TEMP_DIR, f"{uuid.uuid4().hex}.mp4")
        with open(file_path, "wb") as f:
            for chunk in vid_resp.iter_content(chunk_size=8192):
                f.write(chunk)
                
        downloaded_paths.append(file_path)
    
    return downloaded_paths
