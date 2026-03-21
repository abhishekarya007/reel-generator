import React, { useState } from 'react';
import Studio from './components/Studio';
import VideoPlayer from './components/VideoPlayer';

function App() {
  const [videoUrl, setVideoUrl] = useState(null);

  return (
    <div className="min-h-screen bg-gray-950 text-white relative flex flex-col items-center justify-center p-6 overflow-x-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      <header className="absolute top-8 left-8 flex items-center gap-3 select-none">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/30">
          <div className="w-4 h-4 rounded-sm border-2 border-white/80" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Reel<span className="text-gradient">GenAI</span>
        </h1>
      </header>

      <main className="w-full z-10 flex flex-col items-center max-w-7xl mx-auto pt-20">
        {!videoUrl ? (
          <div className="w-full max-w-2xl animate-fade-in-up">
            <div className="text-center mb-10 space-y-4">
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                Turn your text into <br/>
                <span className="text-gradient hover:opacity-80 transition-opacity">Viral Videos</span>
              </h1>
              <p className="text-gray-400 text-lg md:text-xl max-w-lg mx-auto">
                Generate professional short-form videos with AI voiceovers, stock footage, and rich subtitles.
              </p>
            </div>
            <Studio onVideoGenerated={setVideoUrl} />
          </div>
        ) : (
          <div className="w-full animate-fade-in">
            <VideoPlayer videoUrl={videoUrl} onReset={() => setVideoUrl(null)} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
