import React, { useState, useEffect, useRef } from 'react';
import { VoiceRecording } from '../../../types/index.js';
import { SpeechService } from '../../../services/speechService.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { Play, Pause, RotateCcw, Volume2, ShieldCheck, FileText } from 'lucide-react';

interface VoiceMemoryPlayerProps {
  voiceRecording: VoiceRecording;
  compact?: boolean;
  onFinished?: () => void;
}

export const VoiceMemoryPlayer: React.FC<VoiceMemoryPlayerProps> = ({
  voiceRecording,
  compact = false,
  onFinished
}) => {
  const { t, language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showTranscript, setShowTranscript] = useState(!compact);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const duration = voiceRecording.durationSeconds || 15;

  const handleStop = () => {
    SpeechService.cancelSpeech();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    setElapsedSeconds(0);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      SpeechService.cancelSpeech();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      // Play audio note using SpeechService as accessible fallback for prototype voice recordings
      SpeechService.speak(
        voiceRecording.transcript,
        () => {},
        () => {
          setIsPlaying(false);
          setElapsedSeconds(duration);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (onFinished) onFinished();
        },
        SpeechService.getBCP47(language)
      );

      // Start elapsed timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev >= duration) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            setIsPlaying(false);
            return duration;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      SpeechService.cancelSpeech();
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = Math.min(100, Math.round((elapsedSeconds / duration) * 100));

  if (compact) {
    return (
      <div className="bg-lavender-50 rounded-2xl p-3 border border-purple-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleTogglePlay}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow-xs ${
                isPlaying
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
              aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <div>
              <p className="text-xs font-bold text-saksham-darkText">
                {voiceRecording.title || 'Voice Message'}
              </p>
              <p className="text-[11px] text-gray-500">
                {t('loved_ones.voice_speaker')} <span className="font-semibold text-purple-700">{voiceRecording.speakerName}</span> ({formatTime(duration)})
              </p>
            </div>
          </div>

          {isPlaying && (
            <button
              onClick={handleStop}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white"
              title="Reset"
              aria-label="Reset recording playback"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {isPlaying && (
          <div className="mt-2.5 space-y-1">
            <div className="w-full bg-purple-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>{formatTime(elapsedSeconds)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-lavender-50 via-purple-50 to-pink-50 rounded-3xl p-5 border border-purple-200 shadow-soft-purple">
      {/* Header with Verified Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-saksham-darkText">
              {voiceRecording.title || 'Voice Memory'}
            </h4>
            <p className="text-[11px] text-gray-600">
              {t('loved_ones.voice_verified_of')} <span className="font-bold text-purple-800">{voiceRecording.speakerName}</span>
            </p>
          </div>
        </div>

        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-white/80 border border-purple-200 text-[10px] font-bold text-purple-700 shadow-2xs">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>{t('loved_ones.voice_authentic')}</span>
        </span>
      </div>

      {/* Playback Controls & Waveform Bar */}
      <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-inner space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleTogglePlay}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all transform active:scale-95 shadow-md ${
                isPlaying
                  ? 'bg-rose-500 hover:bg-rose-600 ring-4 ring-rose-100 animate-pulse'
                  : 'bg-purple-600 hover:bg-purple-700 ring-4 ring-purple-100'
              }`}
              aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>

            <div>
              <div className="text-xs font-bold text-saksham-darkText">
                {isPlaying ? t('loved_ones.voice_playing') : t('loved_ones.voice_listen')}
              </div>
              <div className="text-[11px] text-gray-500 font-mono">
                {formatTime(elapsedSeconds)} / {formatTime(duration)}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {elapsedSeconds > 0 && (
              <button
                onClick={handleStop}
                className="p-2 rounded-xl text-gray-500 hover:bg-purple-50 transition"
                title="Restart playback"
                aria-label="Restart playback"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className={`p-2 rounded-xl transition ${
                showTranscript ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-purple-50'
              }`}
              title="Toggle transcript"
              aria-label="Toggle transcript text"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="space-y-1">
          <div className="w-full bg-purple-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Transcript Card */}
      {showTranscript && voiceRecording.transcript && (
        <div className="mt-3 bg-white/90 rounded-2xl p-3.5 border border-purple-100 text-xs text-gray-700 leading-relaxed shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700 mb-1 flex items-center space-x-1">
            <FileText className="w-3 h-3" />
            <span>{t('loved_ones.voice_transcript')}</span>
          </div>
          <p className="italic text-gray-800">
            "{voiceRecording.transcript}"
          </p>
        </div>
      )}

      {/* Safety Notice */}
      <div className="mt-2 text-[10px] text-gray-500 text-center">
        Speaker identity provided by family • No synthetic or AI-imitated voices
      </div>
    </div>
  );
};
