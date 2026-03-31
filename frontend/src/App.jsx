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
        <div className="w-full max-w-4xl px-4 animate-fade-in-up">
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
        
        {videoUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/90 backdrop-blur-xl animate-fade-in px-4 overflow-y-auto pt-20 pb-20">
            <div className="w-full max-w-xl relative">
              <button 
                onClick={() => setVideoUrl(null)}
                className="absolute -top-14 right-0 z-[110] text-gray-400 hover:text-white transition-colors bg-gray-900/50 p-3 rounded-full border border-gray-700 hover:border-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] backdrop-blur shadow-xl"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <VideoPlayer videoUrl={videoUrl} onReset={() => setVideoUrl(null)} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
