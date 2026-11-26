import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../../context/LanguageContext.js';
import { useAccessibility } from '../../../context/AccessibilityContext.js';
import { Mic, Square, Play, Pause, Trash2, AlertCircle, Sparkles } from 'lucide-react';
import { getNotesUi } from '../utils/notesCalendarTranslation.js';

export interface VoiceNoteRecordResult {
  blob: Blob;
  durationSeconds: number;
  mimeType: string;
}

interface VoiceNoteRecorderProps {
  onRecordingComplete: (result: VoiceNoteRecordResult) => void;
  onDiscard?: () => void;
  existingDurationSeconds?: number;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onRecordingComplete,
  onDiscard,
  existingDurationSeconds,
}) => {
  const { t, language } = useLanguage();
  const notesUi = getNotesUi(language);
  const { highContrast } = useAccessibility();

  const [state, setState] = useState<'idle' | 'recording' | 'recorded' | 'playing'>('idle');
  const [duration, setDuration] = useState<number>(existingDurationSeconds || 0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up object URLs and recording tracks on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, [previewUrl]);

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage(t('notes.mic_denied'));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine supported mime type
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setPreviewUrl(url);
        setState('recorded');

        onRecordingComplete({
          blob: audioBlob,
          durationSeconds: duration,
          mimeType,
        });

        // Stop stream tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      recorder.start(250); // Emit data slices every 250ms
      setState('recording');
      setDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('[VoiceNoteRecorder] Microphone access error:', err);
      setErrorMessage(t('notes.mic_denied'));
      setState('idle');
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('[VoiceNoteRecorder] Error stopping MediaRecorder:', err);
      }
    }
  };

  const playPreview = () => {
    if (!previewUrl) return;

    if (!audioElementRef.current) {
      const audio = new Audio(previewUrl);
      audioElementRef.current = audio;

      audio.onended = () => {
        setState('recorded');
      };
      audio.onerror = () => {
        setState('recorded');
      };
    }

    audioElementRef.current.play().then(() => {
      setState('playing');
    }).catch((err) => {
      console.warn('[VoiceNoteRecorder] Playback error:', err);
      setState('recorded');
    });
  };

  const pausePreview = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      setState('recorded');
    }
  };

  const handleDiscard = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setState('idle');
    setDuration(0);
    onDiscard?.();
  };

  return (
    <div
      className={`rounded-2xl p-3 border transition-all ${
        highContrast
          ? 'bg-black border-yellow-300 text-white'
          : 'bg-purple-50/70 border-purple-100 text-purple-950'
      }`}
      data-testid="voice-note-recorder"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {state === 'recording' ? (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          ) : (
            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
          )}

          <div className="text-xs font-semibold">
            {state === 'idle' && t('notes.record_voice')}
            {state === 'recording' && (
              <span className="text-rose-600 font-bold flex items-center gap-1.5">
                {t('notes.recording')}
                <span className="font-mono text-xs font-normal bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                  {formatTimer(duration)}
                </span>
              </span>
            )}
            {state === 'recorded' && (
              <span className="text-purple-900 font-medium">
                {t('notes.play_voice')} ({formatTimer(duration)})
              </span>
            )}
            {state === 'playing' && (
              <span className="text-purple-900 font-medium animate-pulse">
                {notesUi.playingPrefix} ({formatTimer(duration)})
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {state === 'idle' && (
            <button
              type="button"
              onClick={startRecording}
              aria-label={t('notes.record_voice')}
              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
                highContrast
                  ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                  : 'bg-purple-700 text-white hover:bg-purple-800 shadow-sm'
              }`}
              data-testid="voice-record-start-btn"
            >
              <Mic className="w-4 h-4" />
              <span>{notesUi.recordBtn}</span>
            </button>
          )}

          {state === 'recording' && (
            <button
              type="button"
              onClick={stopRecording}
              aria-label={t('notes.stop_recording')}
              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm cursor-pointer"
              data-testid="voice-record-stop-btn"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{t('notes.stop_recording')}</span>
            </button>
          )}

          {(state === 'recorded' || state === 'playing') && (
            <>
              {state === 'recorded' ? (
                <button
                  type="button"
                  onClick={playPreview}
                  aria-label={t('notes.play_voice')}
                  className="p-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
                  data-testid="voice-record-play-btn"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t('notes.play_voice')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pausePreview}
                  aria-label={notesUi.pauseVoiceAria}
                  className="p-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
                  data-testid="voice-record-pause-btn"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>{notesUi.pauseBtn}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDiscard}
                aria-label={t('notes.discard_voice')}
                className="p-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium transition-colors cursor-pointer"
                data-testid="voice-record-discard-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 rounded-xl p-2 flex items-center gap-1.5 border border-amber-200">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Spark Free-Tier & Local Storage Reassurance */}
      <div className="mt-2 text-[10px] text-purple-700/80 leading-tight">
        {t('notes.local_voice_disclaimer')}
      </div>
    </div>
  );
};
