import React, { useState } from 'react';

export default function Studio({ onVideoGenerated }) {
  const [mode, setMode] = useState('quick');
  const [script, setScript] = useState('');
  const [keywords, setKeywords] = useState('');
  const [voice, setVoice] = useState('en-US-AriaNeural');
  const [rate, setRate] = useState('+0%');
  const [pitch, setPitch] = useState('default');
  const [volume, setVolume] = useState('+0%');
  const [removeSilence, setRemoveSilence] = useState(false);
  const [enhanceVoice, setEnhanceVoice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Timeline State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [timelineClips, setTimelineClips] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`http://localhost:8000/api/videos/search?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.videos || []);
    } catch (err) {
      console.error("Search err:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch('http://localhost:8000/api/videos/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setTimelineClips([...timelineClips, {
        id: Date.now(),
        url: data.url,
        thumbnail: "https://via.placeholder.com/300x533?text=Local+Upload",
        start_time: 0,
        end_time: 5
      }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const getTotalVideoDuration = () => {
    return timelineClips.reduce((acc, clip) => acc + Math.max(0, clip.end_time - clip.start_time), 0).toFixed(1);
  };

  const handleGenerate = async () => {
    if (!script) {
      setError("Please provide a script."); return;
    }
    if (mode === 'quick' && !keywords) {
      setError("Please provide keywords for quick generation."); return;
    }
    if (mode === 'custom' && timelineClips.length === 0) {
      setError("Please add at least one clip to the timeline."); return;
    }
    
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode, script, 
          keywords: mode === 'quick' ? keywords : "",
          clips: mode === 'custom' ? timelineClips : [],
          voice, rate, pitch,
          volume, remove_silence: removeSilence, enhance_voice: enhanceVoice
        })
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
    <div className="glass p-6 md:p-8 rounded-2xl max-w-5xl w-full mx-auto shadow-2xl space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Create a Reel</h2>
        <p className="text-gray-400 text-sm">Convert your script into a professionally edited video instantly.</p>
      </div>

      <div className="flex gap-4 mb-2">
        <button onClick={() => setMode('quick')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${mode === 'quick' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>⚡ Quick Magic</button>
        <button onClick={() => setMode('custom')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${mode === 'custom' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>✂️ Custom Editor</button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Video Script</label>
          <textarea 
            className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all resize-none"
            rows={5}
            placeholder={mode === 'quick' ? "Enter the exact script for the voiceover..." : "Write your custom voiceover script..."}
            value={script}
            onChange={(e) => setScript(e.target.value)}
          />
        </div>

        {mode === 'quick' && (
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
        )}

        {mode === 'custom' && (
          <div className="space-y-6">
            <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-700/50">
              <h3 className="text-white font-bold mb-3 flex justify-between items-center text-sm uppercase tracking-wide">
                Media Bin
                <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-xs text-white py-2 px-3 rounded-lg border border-gray-600 transition-all text-center normal-case shadow-md">
                  {isUploading ? "Uploading..." : "⬆ Upload Local File"}
                  <input type="file" accept="video/mp4" className="hidden" onChange={handleUpload} disabled={isUploading} />
                </label>
              </h3>
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Search pure stock footage from Pexels..." 
                  className="flex-1 bg-gray-950 border border-gray-700 p-3 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 shadow-inner"
                />
                <button onClick={handleSearch} disabled={isSearching} className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-500/20">
                  {isSearching ? "Searching..." : "Search"}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {searchResults.map(vid => {
                  const optimalVideoUrl = vid.video_files.find(f => f.quality === 'hd')?.link || vid.video_files[0].link;
                  return (
                    <div key={vid.id} className="flex flex-col bg-gray-950 rounded-lg border border-gray-700 hover:border-cyan-500 transition-all overflow-hidden shadow-lg">
                      <video src={optimalVideoUrl} poster={vid.image} controls preload="metadata" className="w-full aspect-[9/16] object-cover bg-black" />
                      <button onClick={() => {
                        setTimelineClips([...timelineClips, {
                          id: Date.now() + Math.random(),
                          url: optimalVideoUrl,
                          thumbnail: vid.image,
                          start_time: 0,
                          end_time: 5
                        }])
                      }} className="bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-bold py-2.5 text-[10px] sm:text-xs uppercase tracking-widest transition-colors border-t border-gray-700">
                        + Add To Reel
                      </button>
                    </div>
                  );
                })}
                {searchResults.length === 0 && !isSearching && <div className="col-span-full text-center py-6 text-gray-500 text-sm">Search across thousands of free clips or upload your own.</div>}
              </div>
            </div>

            <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-700/50">
              <div className="flex justify-between items-end mb-3">
                <h3 className="text-white font-bold text-sm uppercase tracking-wide">Timeline Sequence</h3>
                <span className="text-xs font-bold px-2 py-1 rounded border shadow-inner bg-cyan-900/30 text-cyan-400 border-cyan-800/50">
                  {getTotalVideoDuration()}s Video Selected
                </span>
              </div>
              <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {timelineClips.map((clip, idx) => (
                  <div key={clip.id} className="flex gap-4 items-center bg-gray-950 p-3 rounded-lg border border-gray-700 shadow-inner">
                    <span className="text-gray-500 font-bold w-6 text-sm text-center">{idx + 1}.</span>
                    <video src={clip.url} poster={clip.thumbnail} controls preload="metadata" className="w-20 h-28 object-cover rounded bg-black flex-shrink-0 border border-gray-800" />
                    <div className="flex-1 flex gap-4">
                      <div className="flex flex-col flex-1">
                        <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-1.5 font-semibold">Start (s)</label>
                        <input type="number" step="0.5" value={clip.start_time} onChange={(e) => {
                          const newClips = [...timelineClips];
                          newClips[idx].start_time = parseFloat(e.target.value) || 0;
                          setTimelineClips(newClips);
                        }} className="w-full bg-gray-800 text-white rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 border border-gray-700/50" />
                      </div>
                      <div className="flex flex-col flex-1">
                        <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-1.5 font-semibold">End (s)</label>
                        <input type="number" step="0.5" value={clip.end_time} onChange={(e) => {
                          const newClips = [...timelineClips];
                          newClips[idx].end_time = parseFloat(e.target.value) || 0;
                          setTimelineClips(newClips);
                        }} className="w-full bg-gray-800 text-white rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 border border-gray-700/50" />
                      </div>
                    </div>
                    <button onClick={() => setTimelineClips(timelineClips.filter(c => c.id !== clip.id))} className="w-8 h-8 rounded-md bg-red-900/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors border border-red-900/40">
                      ✕
                    </button>
                  </div>
                ))}
                {timelineClips.length === 0 && <div className="text-center py-6 text-gray-500 text-sm italic">Your timeline is empty. Add a clip!</div>}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Volume</label>
            <select 
              className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner appearance-none cursor-pointer"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
            >
              <option value="-20%">Soft</option>
              <option value="+0%">Normal</option>
              <option value="+20%">Loud</option>
              <option value="+50%">Very Loud</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 mt-2 p-4 bg-gray-900/40 border border-gray-800/50 rounded-xl">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`relative flex items-center justify-center w-6 h-6 border-2 rounded-md transition-colors ${removeSilence ? 'border-cyan-500' : 'border-gray-600 group-hover:border-gray-400'}`}>
              <input 
                type="checkbox"
                className="opacity-0 absolute inset-0 cursor-pointer"
                checked={removeSilence}
                onChange={(e) => setRemoveSilence(e.target.checked)}
              />
              {removeSilence && <div className="w-3 h-3 bg-cyan-500 rounded-sm"></div>}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-200">Remove Silences</span>
              <span className="text-xs text-gray-500">Fast-paced, jump-cut delivery</span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`relative flex items-center justify-center w-6 h-6 border-2 rounded-md transition-colors ${enhanceVoice ? 'border-cyan-500' : 'border-gray-600 group-hover:border-gray-400'}`}>
              <input 
                type="checkbox"
                className="opacity-0 absolute inset-0 cursor-pointer"
                checked={enhanceVoice}
                onChange={(e) => setEnhanceVoice(e.target.checked)}
              />
              {enhanceVoice && <div className="w-3 h-3 bg-cyan-500 rounded-sm"></div>}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-200">Podcast EQ Filter</span>
              <span className="text-xs text-gray-500">Rich, punchy radio-style voice</span>
            </div>
          </label>
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
