import React, { useState } from 'react';

export default function Studio({ onVideoGenerated }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const [mode, setMode] = useState('quick');
  const [script, setScript] = useState('');
  const [keywords, setKeywords] = useState('');
  const [voice, setVoice] = useState('en-US-AriaNeural');
  const [rate, setRate] = useState('+0%');
  const [pitch, setPitch] = useState('default');
  const [volume, setVolume] = useState('+0%');
  const [removeSilence, setRemoveSilence] = useState(false);
  const [enhanceVoice, setEnhanceVoice] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [transitionStyle, setTransitionStyle] = useState('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [generatedAudio, setGeneratedAudio] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);

  // Timeline State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [timelineClips, setTimelineClips] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/videos/search?query=${encodeURIComponent(searchQuery)}`);
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
      const res = await fetch(`${API_URL}/api/videos/upload`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      
      const videoElement = document.createElement('video');
      videoElement.src = data.url;
      videoElement.onloadedmetadata = () => {
        setTimelineClips(prev => [...prev, {
          id: Date.now(),
          url: data.url,
          thumbnail: null,
          start_time: 0,
          end_time: parseFloat(videoElement.duration.toFixed(1)),
          max_duration: parseFloat(videoElement.duration.toFixed(1))
        }]);
      };
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const getTotalVideoDuration = () => {
    const rawSum = timelineClips.reduce((acc, clip) => acc + Math.max(0, clip.end_time - clip.start_time), 0);
    if (timelineClips.length < 2 || transitionStyle === 'none') {
      return rawSum.toFixed(1);
    }
    // FFmpeg's xfade dynamically consumes 0.5s on each transition overlap intersection
    const overlapLoss = (timelineClips.length - 1) * 0.5;
    return Math.max(0, rawSum - overlapLoss).toFixed(1);
  };

  const handlePreview = async () => {
    if (timelineClips.length === 0) {
      setError("Please add clips to the timeline to preview."); return;
    }
    setError(null);
    setPreviewLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode, script: "preview", 
          clips: timelineClips,
          aspect_ratio: aspectRatio,
          transition_style: transitionStyle,
          is_preview: true,
          audio_path: mode === 'custom' && generatedAudio ? generatedAudio.local_path : undefined
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Fast rendering failed");
      }
      const data = await response.json();
      setPreviewUrl(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!script) {
      setError("Please provide a script first."); return;
    }
    setError(null);
    setAudioLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/generate_audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          script, voice, rate, pitch, volume,
          remove_silence: removeSilence,
          enhance_voice: enhanceVoice 
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Audio generation failed");
      }
      const data = await response.json();
      setGeneratedAudio({
        url: data.audio_url,
        local_path: data.audio_path,
        subtitles_path: data.subtitles_path,
        duration: data.duration
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setAudioLoading(false);
    }
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
      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode, script, 
          keywords: mode === 'quick' ? keywords : "",
          clips: mode === 'custom' ? timelineClips : [],
          voice, rate, pitch,
          volume, remove_silence: removeSilence, enhance_voice: enhanceVoice,
          aspect_ratio: aspectRatio,
          transition_style: transitionStyle,
          audio_path: mode === 'custom' && generatedAudio ? generatedAudio.local_path : undefined,
          subtitles_path: mode === 'custom' && generatedAudio ? generatedAudio.subtitles_path : undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Generation failed.");
      }

      const data = await response.json();
      if (data.status === "success") {
        onVideoGenerated(`${API_URL}${data.video_url}`);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-24 h-24 mb-10">
            <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full animate-ping delay-75"></div>
            <div className="absolute inset-0 border-[6px] border-transparent border-t-cyan-400 border-b-cyan-400 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse mb-5 tracking-tight">
             Building Cinematic Reel...
          </h2>
          <div className="text-gray-300 max-w-md text-center text-sm leading-relaxed border border-gray-700/80 bg-gray-900/80 p-5 rounded-2xl shadow-inner backdrop-blur-sm">
             <p className="mb-2">Please wait while the FFmpeg engine streams AI audio, dynamically auto-mixes EQ levels, trims source clips, and blends everything using smooth cinematic transitions.</p>
             <span className="text-cyan-400 mt-4 block font-bold uppercase tracking-widest text-xs animate-pulse shadow-cyan-500/50">Ready in a few seconds</span>
          </div>
        </div>
      )}
      
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
                        const videoElement = document.createElement('video');
                        videoElement.src = optimalVideoUrl;
                        videoElement.onloadedmetadata = () => {
                          setTimelineClips(prev => [...prev, {
                            id: Date.now() + Math.random(),
                            url: optimalVideoUrl,
                            thumbnail: vid.image,
                            start_time: 0,
                            end_time: parseFloat(videoElement.duration.toFixed(1)),
                            max_duration: parseFloat(videoElement.duration.toFixed(1))
                          }]);
                        };
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
                {mode === 'custom' && generatedAudio ? (
                  <span className={`text-xs font-bold px-2 py-1 rounded border shadow-inner ${parseFloat(getTotalVideoDuration()) >= generatedAudio.duration ? 'bg-green-900/30 text-green-400 border-green-800/50' : 'bg-amber-900/30 text-amber-400 border-amber-800/50'}`}>
                    {getTotalVideoDuration()}s / {generatedAudio.duration}s Required
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2 py-1 rounded border shadow-inner bg-cyan-900/30 text-cyan-400 border-cyan-800/50">
                    {getTotalVideoDuration()}s Sequence
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {timelineClips.map((clip, idx) => (
                  <div 
                    key={clip.id} 
                    draggable
                    onDragStart={(e) => {
                      setDraggedIdx(idx);
                      e.dataTransfer.effectAllowed = 'move';
                      e.currentTarget.style.opacity = '0.4';
                    }}
                    onDragEnd={(e) => {
                      setDraggedIdx(null);
                      e.currentTarget.style.opacity = '1';
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedIdx === null || draggedIdx === idx) return;
                      const newClips = [...timelineClips];
                      const [draggedItem] = newClips.splice(draggedIdx, 1);
                      newClips.splice(idx, 0, draggedItem);
                      setTimelineClips(newClips);
                      setDraggedIdx(null);
                    }}
                    className={`flex gap-3 md:gap-4 items-center bg-gray-950 p-3 rounded-lg border shadow-inner transition-transform cursor-grab active:cursor-grabbing ${draggedIdx === idx ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-gray-700 hover:border-gray-500'}`}
                  >
                    <div className="flex flex-col items-center justify-center text-gray-600 mr-1 hidden sm:flex">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                    </div>
                    <span className="text-gray-500 font-bold w-4 md:w-6 text-sm text-center">{idx + 1}.</span>
                    <video src={clip.url} poster={clip.thumbnail} controls preload="metadata" className="w-20 h-28 object-cover rounded bg-black flex-shrink-0 border border-gray-800" />
                    <div className="flex-1 flex gap-4">
                      <div className="flex flex-col flex-1">
                        <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-1.5 font-semibold">Start (s)</label>
                        <input type="number" step="0.5" value={clip.start_time} onChange={(e) => {
                          const newClips = [...timelineClips];
                          let val = parseFloat(e.target.value) || 0;
                          val = Math.max(0, Math.min(val, (clip.end_time || val + 0.5) - 0.5));
                          newClips[idx].start_time = val;
                          setTimelineClips(newClips);
                        }} className="w-full bg-gray-800 text-white rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 border border-gray-700/50" />
                      </div>
                      <div className="flex flex-col flex-1">
                        <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-1.5 font-semibold">End (s)</label>
                        <input type="number" step="0.5" value={clip.end_time} onChange={(e) => {
                          const newClips = [...timelineClips];
                          let val = parseFloat(e.target.value) || 0;
                          val = Math.max(clip.start_time + 0.5, Math.min(val, clip.max_duration || 9999));
                          newClips[idx].end_time = val;
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

        {mode === 'custom' && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <button 
              onClick={handleGenerateAudio} 
              disabled={audioLoading}
              className={`w-full font-bold py-3 px-4 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 transform active:scale-[0.98] ${audioLoading ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700/50' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25'}`}
            >
              {audioLoading ? 'Synthesizing Edge-TTS Voice...' : '🎙️ Generate Voiceover Audio'}
            </button>
            
            {generatedAudio && (
              <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-indigo-500/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    Cached Audio Track
                  </span>
                  <span className="text-sm font-mono text-gray-300 bg-gray-800 px-2 py-1 rounded">{generatedAudio.duration}s</span>
                </div>
                <audio src={generatedAudio.url} controls className="w-full h-8 outline-none" />
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-900/40 p-5 rounded-xl border border-gray-700/50 space-y-4">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Advanced Audio</h3>
          <div className="flex flex-col sm:flex-row gap-6">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={removeSilence} onChange={(e) => setRemoveSilence(e.target.checked)} />
                <div className={`w-10 h-6 bg-gray-700 rounded-full transition-colors ${removeSilence ? 'bg-cyan-500' : ''}`}></div>
                <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-transform ${removeSilence ? 'translate-x-5' : 'translate-x-1'}`}></div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Silence Removal</span>
                <span className="text-xs text-gray-500">Fast-paced, jump-cut delivery</span>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={enhanceVoice} onChange={(e) => setEnhanceVoice(e.target.checked)} />
                <div className={`w-10 h-6 bg-gray-700 rounded-full transition-colors ${enhanceVoice ? 'bg-cyan-500' : ''}`}></div>
                <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-transform ${enhanceVoice ? 'translate-x-5' : 'translate-x-1'}`}></div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Podcast EQ Filter</span>
                <span className="text-xs text-gray-500">Rich, punchy radio-style voice</span>
              </div>
            </label>
          </div>
        </div>

        <div className="bg-gray-900/40 p-5 rounded-xl border border-gray-700/50 space-y-4">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Advanced Video Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Aspect Ratio</label>
              <select 
                className="w-full bg-gray-950 border border-gray-700/50 rounded-lg p-3 text-sm text-white hover:border-cyan-500 transition-all cursor-pointer"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                <option value="9:16">9:16 (TikTok, Reels, Shorts)</option>
                <option value="16:9">16:9 (YouTube, Desktop)</option>
                <option value="1:1">1:1 (Instagram Square)</option>
              </select>
            </div>
            
            {mode === 'custom' && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Transition Style</label>
                <select 
                  className="w-full bg-gray-950 border border-gray-700/50 rounded-lg p-3 text-sm text-white hover:border-cyan-500 transition-all cursor-pointer"
                  value={transitionStyle}
                  onChange={(e) => setTransitionStyle(e.target.value)}
                >
                  <option value="none">None (Hard Cut)</option>
                  <option value="fade">Smooth Fade</option>
                  <option value="wipeleft">Wipe Left</option>
                  <option value="circlecrop">Circle Crop</option>
                  <option value="pixelize">Pixelize</option>
                  <option value="hblur">Horizontal Blur</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-900/50 text-red-400 rounded-xl text-sm font-medium shadow-inner">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          {mode === 'custom' && (
            <button 
              onClick={handlePreview}
              disabled={loading || previewLoading}
              className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all transform active:scale-[0.98] ${previewLoading ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-400 hover:to-fuchsia-500 text-white shadow-lg shadow-purple-500/25'}`}
            >
              {previewLoading ? 'Rendering Fast Preview...' : '👁️ Fast Preview'}
            </button>
          )}
          <button 
            onClick={handleGenerate}
            disabled={loading || previewLoading}
            className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all transform active:scale-[0.98] ${loading ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700/50' : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25'}`}
          >
            {loading ? 'Rendering Pipeline Active...' : 'Generate Reel'}
          </button>
        </div>
      </div>
      
      {/* Real-time Transition Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm shadow-2xl">
          <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden max-w-[360px] w-full relative">
            <button 
              onClick={() => setPreviewUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/80 text-white hover:bg-red-500 flex items-center justify-center z-10 transition-colors"
            >
              ✕
            </button>
            <div className="p-3 bg-gray-900 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-white text-xs font-bold uppercase tracking-widest text-purple-400">Lightning Preview</h3>
            </div>
            <video src={previewUrl} controls autoPlay loop className="w-full aspect-[9/16] object-cover bg-black" />
          </div>
        </div>
      )}
    </div>
    </>
  );
}
