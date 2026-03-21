import React, { useState } from 'react';

export default function Studio({ onVideoGenerated }) {
  const [script, setScript] = useState('');
  const [keywords, setKeywords] = useState('');
  const [voice, setVoice] = useState('en-US-AriaNeural');
  const [rate, setRate] = useState('+0%');
  const [pitch, setPitch] = useState('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!script || !keywords) {
      setError("Please provide both script and keywords.");
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, keywords, voice, rate, pitch })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Generation failed.");
      }

      const data = await response.json();
      if (data.status === "success") {
        onVideoGenerated(`http://localhost:8000${data.video_url}`);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass p-8 rounded-2xl max-w-2xl w-full mx-auto shadow-2xl space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Create a Reel</h2>
        <p className="text-gray-400 text-sm">Convert your script into a professionally edited video instantly.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Video Script</label>
          <textarea 
            className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all resize-none"
            rows={5}
            placeholder="Enter the exact script for the voiceover..."
            value={script}
            onChange={(e) => setScript(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Pexels Search Keywords</label>
          <input 
            type="text"
            className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all shadow-inner"
            placeholder="e.g. nature, technology, neon city"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Voice & Language</label>
            <select 
              className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner appearance-none cursor-pointer"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
            >
              <optgroup label="English (US)">
                <option value="en-US-AriaNeural">Female (Aria)</option>
                <option value="en-US-GuyNeural">Male (Guy)</option>
              </optgroup>
              <optgroup label="English (UK)">
                <option value="en-GB-SoniaNeural">Female (Sonia)</option>
                <option value="en-GB-RyanNeural">Male (Ryan)</option>
              </optgroup>
              <optgroup label="Hindi (India)">
                <option value="hi-IN-SwaraNeural">Female (Swara)</option>
                <option value="hi-IN-MadhurNeural">Male (Madhur)</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Speed</label>
            <select 
              className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner appearance-none cursor-pointer"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            >
              <option value="-25%">Slow (0.75x)</option>
              <option value="+0%">Normal (1.0x)</option>
              <option value="+25%">Fast (1.25x)</option>
              <option value="+50%">Very Fast (1.5x)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Pitch</label>
            <select 
              className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner appearance-none cursor-pointer"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
            >
              <option value="-10Hz">Low</option>
              <option value="default">Normal</option>
              <option value="+10Hz">High</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-900/50 text-red-400 rounded-xl text-sm font-medium shadow-inner">
            {error}
          </div>
        )}

        <button 
          onClick={handleGenerate}
          disabled={loading}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all transform active:scale-[0.98] ${loading ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700/50' : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25'}`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Magic...
            </span>
          ) : 'Generate Reel'}
        </button>
      </div>
    </div>
  );
}
