"use client";

import React, { useState, useEffect, useRef } from "react";
import { siteConfig } from "@/lib/site-config";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Music2,
  Minimize2,
  Maximize2,
} from "lucide-react";

const TRACKS = [
  {
    title: siteConfig.music.title,
    artist: siteConfig.music.artist,
    src: siteConfig.music.source,
  },
  {
    title: "Deep Focus (432Hz Ambient)",
    artist: "Trishna Code Resonance",
    src: "/music/background.mp3",
  },
  {
    title: "Late Night Studio Flow",
    artist: "Trishna Creative Sessions",
    src: "/music/background.mp3",
  },
];

export function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.6);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthCtxRef = useRef<AudioContext | null>(null);
  const synthGainRef = useRef<GainNode | null>(null);

  // Initialize preferences from localStorage
  useEffect(() => {
    try {
      const savedVolume = localStorage.getItem("trishna_music_volume");
      const savedMute = localStorage.getItem("trishna_music_muted");
      if (savedVolume !== null) setVolume(parseFloat(savedVolume));
      if (savedMute !== null) setIsMuted(savedMute === "true");
    } catch {
      // ignore in incognito/SSR
    }
  }, []);

  // Update volume on change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    if (synthGainRef.current) {
      synthGainRef.current.gain.value = isMuted ? 0 : volume * 0.15;
    }
    try {
      localStorage.setItem("trishna_music_volume", volume.toString());
      localStorage.setItem("trishna_music_muted", isMuted.toString());
    } catch {
      // ignore
    }
  }, [volume, isMuted]);

  // Ambient web audio synth backup fallback
  const startSynthFallback = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      synthCtxRef.current = ctx;

      const gain = ctx.createGain();
      gain.gain.value = isMuted ? 0 : volume * 0.15;
      gain.connect(ctx.destination);
      synthGainRef.current = gain;

      // Chord frequencies: C3, G3, C4, E4
      const freqs = [130.81, 196.0, 261.63, 329.63];
      freqs.forEach((f) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        osc.connect(gain);
        osc.start();
      });
    } catch (e) {
      console.warn("Synth fallback error:", e);
    }
  };

  const stopSynthFallback = () => {
    if (synthCtxRef.current && synthCtxRef.current.state !== "closed") {
      synthCtxRef.current.close().catch(() => {});
      synthCtxRef.current = null;
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      stopSynthFallback();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn("Native audio play failed, starting synth fallback:", err);
        startSynthFallback();
        setIsPlaying(true);
      }
    }
  };

  const handleNext = () => {
    const nextIdx = (trackIndex + 1) % TRACKS.length;
    setTrackIndex(nextIdx);
    setCurrentTime(0);
    if (isPlaying && audioRef.current) {
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
      }, 100);
    }
  };

  const handlePrev = () => {
    const prevIdx = (trackIndex - 1 + TRACKS.length) % TRACKS.length;
    setTrackIndex(prevIdx);
    setCurrentTime(0);
    if (isPlaying && audioRef.current) {
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
      }, 100);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder.toString().padStart(2, "0")}`;
  };

  const currentTrack = TRACKS[trackIndex];

  return (
    <>
      <audio
        ref={audioRef}
        src={currentTrack.src}
        loop
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={handleNext}
      />

      <div className="fixed bottom-5 right-5 z-40">
        {!isExpanded ? (
          // Compact Floating Pill
          <div className="flex items-center gap-2.5 rounded-full border border-border bg-card/90 px-3.5 py-2 shadow-lg backdrop-blur-md transition-all hover:border-[#FF5A36]/40">
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#171717] text-[#FAF8F5] transition-transform hover:scale-105 active:scale-95 dark:bg-[#FAF8F5] dark:text-[#171717]"
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
              )}
            </button>

            <div
              onClick={() => setIsExpanded(true)}
              className="cursor-pointer flex items-center gap-2 max-w-[150px] sm:max-w-[200px]"
            >
              <div className="flex items-center gap-1.5">
                <Music2 className="h-3.5 w-3.5 text-[#FF5A36] shrink-0" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground shrink-0">
                  {isPlaying ? "NOW PLAYING" : "AUDIO"}
                </span>
              </div>
              <span className="truncate text-xs font-medium text-foreground">
                {currentTrack.title}
              </span>
            </div>

            <button
              onClick={() => setIsExpanded(true)}
              aria-label="Expand music player"
              className="ml-1 p-1 text-muted-foreground hover:text-foreground"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          // Expanded Player Drawer
          <div className="w-[310px] sm:w-[340px] rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl transition-all">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  {isPlaying && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5A36] opacity-75"></span>
                  )}
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5A36]"></span>
                </span>
                <span className="text-[11px] font-mono tracking-widest text-[#FF5A36] uppercase font-bold">
                  NOW PLAYING
                </span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                aria-label="Minimize player"
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="my-3">
              <p className="font-semibold text-sm text-foreground truncate">
                {currentTrack.title}
              </p>
              <p className="text-xs font-mono text-muted-foreground">
                {currentTrack.artist}
              </p>
            </div>

            {/* Progress Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                aria-label="Audio progress slider"
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-[#FF5A36]"
              />
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration || 240)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setIsMuted(false);
                    setVolume(parseFloat(e.target.value));
                  }}
                  aria-label="Volume control"
                  className="w-16 h-1 bg-border rounded appearance-none cursor-pointer accent-[#FF5A36]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  aria-label="Previous track"
                  className="p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <SkipBack className="h-4 w-4" />
                </button>

                <button
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause track" : "Play track"}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#171717] text-[#FAF8F5] transition-transform hover:scale-105 active:scale-95 dark:bg-[#FAF8F5] dark:text-[#171717]"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handleNext}
                  aria-label="Next track"
                  className="p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
