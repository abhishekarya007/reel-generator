import React from 'react';

export default function VideoPlayer({ videoUrl, onReset }) {
  if (!videoUrl) return null;

  return (
    <div className="glass p-8 rounded-2xl max-w-xl w-full mx-auto shadow-2xl flex flex-col items-center space-y-6">
      <div className="w-full relative pt-[177.77%] bg-black rounded-xl overflow-hidden shadow-inner border border-gray-800 flex items-center justify-center group">
        <video 
          src={videoUrl} 
          controls 
          autoPlay 
          loop 
          className="absolute top-0 left-0 w-full h-full object-cover rounded-xl"
        />
      </div>
      
      <div className="flex gap-4 w-full">
        <a 
          href={videoUrl} 
          download="reel.mp4"
          target="_blank"
          rel="noreferrer"
          className="flex-1 text-center bg-gray-800/80 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-xl border border-gray-700 transition-colors shadow-sm"
        >
          Download Video
        </a>
        <button 
          onClick={onReset}
          className="flex-1 text-center bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-sm"
        >
          Create Another
        </button>
      </div>
    </div>
  );
}
