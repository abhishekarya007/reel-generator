# 🎬 AI Reel & Shorts Generator

A fully autonomous, hyper-optimized local Video Editing studio that perfectly splices together 4K stock footage from Pexels, layers in studio-grade Edge-TTS AI voiceovers, dynamically cross-fades clips, and perfectly restricts video codecs to industry-standard NLE (Non-Linear Editor) profiles. 

Works natively on Mac and Windows without any expensive cloud processing rendering! ☁️❌

---

## ⚙️ Prerequisites

Before you start, make sure you have installed:
1. **Python** (v3.9 or higher) installed.
2. **Node.js** (v16 or higher) installed.
3. **FFmpeg** (v5.0+): The core rendering engine.
   - **Mac**: Open terminal and run `brew install ffmpeg`
   - **Windows**: Download the binary from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) or use Winget (`winget install ffmpeg`), then explicitly add the `bin` folder to your System PATH variables.

---

## 🔧 1. Backend Setup (FastAPI & Pipeline)

1. Open your terminal and navigate into the backend folder:
   ```bash
   cd backend
   ```
2. Create an isolated Python virtual environment:
   ```bash
   # On Mac/Linux:
   python3 -m venv venv
   source venv/bin/activate

   # On Windows (Command Prompt / PowerShell):
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install all the required Python packages (FastAPI, Edge-TTS, FFmpeg bindings, etc.):
   ```bash
   pip install -r requirements.txt
   ```
4. *(Optional but strictly recommended)* Create a `.env` file inside the `backend` folder and add your free Pexels API key:
   ```env
   PEXELS_API_KEY=your_pexels_key_here
   ```
5. Fire up the backend engine!
   ```bash
   uvicorn main:app --reload
   ```

---

## 🎨 2. Frontend Setup (React UI)

1. Open a **brand new** terminal window (leave the backend running!) and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install the Node modules and dependencies:
   ```bash
   npm install
   ```
3. Hook up the backend connection by ensuring you have a `.env` file inside the `frontend` folder:
   ```env
   VITE_API_URL=http://localhost:8000
   ```
4. Start the glorious React interface:
   ```bash
   npm run dev
   ```

**You are live!** Open the provided `localhost` link in your browser (usually `http://localhost:5173`) and start generating cinematic shorts instantly! 🚀
