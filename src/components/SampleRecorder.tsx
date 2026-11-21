import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export const SampleRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordedSamples, setRecordedSamples] = useState<string[]>([]);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [volume, setVolume] = useState(75);
  const [pitch, setPitch] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedSamples(prev => [...prev, url]);
        setSelectedSample(url);
        setDuration(0);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Setup audio context for visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      drawWaveform();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteTimeDomainData(dataArray);
    
    ctx.fillStyle = "#1a1a4e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#6b8e23";
    ctx.beginPath();
    
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    animationFrameRef.current = requestAnimationFrame(drawWaveform);
  };

  const playSample = (url: string) => {
    const audio = new Audio(url);
    audio.volume = volume / 100;
    audio.playbackRate = 1 + (pitch / 12);
    audio.play();
    setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
  };

  const deleteSample = (index: number) => {
    setRecordedSamples(prev => prev.filter((_, i) => i !== index));
    if (selectedSample === recordedSamples[index]) {
      setSelectedSample(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Recorder Panel */}
      <div className="panel panel-raised p-4">
        <h2 className="font-pixel text-sm text-gb-green mb-3">Sample Recorder</h2>
        
        {/* Waveform Display */}
        <div className="lcd-screen h-32 mb-4">
          <canvas
            ref={canvasRef}
            width={400}
            height={128}
            className="waveform-canvas"
          />
          {isRecording && (
            <div className="absolute top-2 right-2 flex items-center gap-1">
              <div className="w-2 h-2 bg-magenta rounded-full animate-pulse" />
              <span className="font-pixel text-xs text-magenta">REC</span>
            </div>
          )}
        </div>
        
        {/* Record Controls */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "btn-retro flex-1",
              isRecording ? "btn-retro-accent" : "btn-retro-primary"
            )}
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </button>
        </div>
        
        {/* Duration Display */}
        <div className="text-center mb-4">
          <span className="font-pixel text-xs text-snes-grey">Duration: </span>
          <span className="font-pixel text-xs text-gb-green">{duration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Sample Library */}
      <div className="panel panel-raised p-4">
        <h2 className="font-pixel text-sm text-gb-green mb-3">Sample Library</h2>
        
        {recordedSamples.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-snes-grey-dark flex items-center justify-center">
              <svg className="w-8 h-8 text-snes-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-2v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-2" />
              </svg>
            </div>
            <p className="font-pixel text-xs text-snes-grey">No samples recorded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recordedSamples.map((sample, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 p-2 rounded border-2 transition-all duration-75",
                  selectedSample === sample
                    ? "border-gb-green bg-gb-green/10"
                    : "border-snes-grey-dark bg-snes-grey-darker"
                )}
              >
                <button
                  onClick={() => {
                    setSelectedSample(sample);
                    playSample(sample);
                  }}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gb-green rounded-full" />
                    <span className="font-pixel text-xs text-gb-green">Sample {index + 1}</span>
                  </div>
                </button>
                <button
                  onClick={() => deleteSample(index)}
                  className="btn-retro btn-retro-accent px-2 py-1"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sample Editor */}
      {selectedSample && (
        <div className="panel panel-raised p-4">
          <h2 className="font-pixel text-sm text-gb-green mb-3">Sample Editor</h2>
          
          {/* Volume */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <label className="font-pixel text-xs text-snes-grey">Volume</label>
              <span className="font-pixel text-xs text-gb-green">{volume}%</span>
            </div>
            <div className="fader-track h-2">
              <div
                className="h-full bg-gb-green transition-all duration-75"
                style={{ width: `${volume}%` }}
              />
            </div>
          </div>
          
          {/* Pitch */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <label className="font-pixel text-xs text-snes-grey">Pitch</label>
              <span className="font-pixel text-xs text-gb-green">{pitch > 0 ? "+" : ""}{pitch} semitones</span>
            </div>
            <div className="fader-track h-2">
              <div
                className="h-full bg-cyan transition-all duration-75"
                style={{ width: `${((pitch + 12) / 24) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Trim Controls */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <label className="font-pixel text-xs text-snes-grey">Trim Start</label>
              <span className="font-pixel text-xs text-gb-green">{trimStart}%</span>
            </div>
            <div className="fader-track h-2">
              <div
                className="h-full bg-magenta transition-all duration-75"
                style={{ width: `${trimStart}%` }}
              />
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <label className="font-pixel text-xs text-snes-grey">Trim End</label>
              <span className="font-pixel text-xs text-gb-green">{trimEnd}%</span>
            </div>
            <div className="fader-track h-2">
              <div
                className="h-full bg-magenta transition-all duration-75"
                style={{ width: `${trimEnd}%` }}
              />
            </div>
          </div>
          
          {/* Play Button */}
          <button
            onClick={() => playSample(selectedSample)}
            className="btn-retro btn-retro-primary w-full"
          >
            {isPlaying ? "Playing..." : "Play Sample"}
          </button>
        </div>
      )}
    </div>
  );
};