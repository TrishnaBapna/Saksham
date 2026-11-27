import React from 'react';
import {
  Mic,
  MicOff,
  Square,
  Pause,
  Play,
  Trash2,
  RotateCcw,
  AlertCircle,
  Loader2,
  Volume2,
} from 'lucide-react';
import {
  ContinuousVoiceRecorderController,
} from '../hooks/useContinuousVoiceRecorder.js';

interface ContinuousVoiceRecorderPanelProps {
  recorder: ContinuousVoiceRecorderController;
  highContrast?: boolean;
  reducedMotion?: boolean;
  isBusySending?: boolean;
  hasSentTurnBefore?: boolean;
  unsupportedMicLabel: string;
}

const WAVEFORM_HEIGHTS = ['h-3', 'h-6', 'h-8', 'h-5', 'h-7', 'h-4', 'h-6'];

export const ContinuousVoiceRecorderPanel: React.FC<ContinuousVoiceRecorderPanelProps> = ({
  recorder,
  highContrast = false,
  reducedMotion = false,
  isBusySending = false,
  hasSentTurnBefore = false,
  unsupportedMicLabel,
}) => {
  const {
    status,
    isSupported,
    isMicOpen,
    isSubmitting,
    finalizedTranscript,
    interimTranscript,
    errorMessage,
    noticeMessage,
    strings,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopAndSend,
    discardRecording,
    retryRecording,
    clearNotices,
  } = recorder;

  // Idle view: Large accessible tap-to-speak microphone CTA + calm guidance
  if (status === 'idle') {
    return (
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <button
            type="button"
            data-testid="sanctuary-mic-button"
            data-listening="false"
            data-recorder-status="idle"
            onClick={startRecording}
            disabled={isBusySending}
            title={!isSupported ? unsupportedMicLabel : strings.tapToSpeakBtn}
            aria-label={!isSupported ? unsupportedMicLabel : strings.tapToSpeakBtn}
            className={`w-full sm:w-auto flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl font-extrabold text-sm md:text-base min-h-[54px] transition-all shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-400 ${
              !isSupported
                ? 'bg-slate-200 text-slate-600 border border-slate-300 hover:bg-slate-300'
                : highContrast
                ? 'bg-amber-400 hover:bg-amber-300 text-black border-2 border-black'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <Mic className="w-5 h-5 shrink-0" />
            <span>{strings.tapToSpeakBtn}</span>
          </button>
          <p className="text-xs text-slate-600 leading-snug font-medium">
            {hasSentTurnBefore ? strings.startNewVoiceHint : strings.idleHelper}
          </p>
        </div>

        {(noticeMessage || errorMessage) && (
          <div
            role="alert"
            data-testid="voice-recorder-alert"
            className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{errorMessage || noticeMessage}</span>
            </div>
            <button
              type="button"
              onClick={clearNotices}
              aria-label={strings.discardBtn}
              className="text-amber-800 hover:text-amber-950 font-bold px-2 py-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );
  }

  const isRecording = status === 'recording';
  const isPaused = status === 'paused';
  const isFinalizing = status === 'finalizing' || isSubmitting;
  const isError = status === 'error';
  const isUnsupported = status === 'unsupported';

  const statusBadgeText = isRecording
    ? strings.recordingBadge
    : isPaused
    ? strings.pausedBadge
    : isFinalizing
    ? strings.finalizingBadge
    : isUnsupported
    ? strings.unsupportedBadge
    : strings.errorBadge;

  return (
    <section
      role="region"
      aria-label={strings.recorderRegionAria}
      data-testid="continuous-voice-recorder"
      data-recorder-status={status}
      data-listening={isMicOpen ? 'true' : 'false'}
      className={`rounded-2xl p-4 border-2 transition-all space-y-3 shadow-sm ${
        highContrast
          ? 'bg-slate-950 text-white border-amber-400'
          : isRecording
          ? 'bg-rose-50/70 border-rose-300 text-slate-900'
          : isPaused
          ? 'bg-indigo-50/70 border-indigo-300 text-slate-900'
          : isError || isUnsupported
          ? 'bg-amber-50/80 border-amber-300 text-slate-900'
          : 'bg-purple-50/80 border-purple-300 text-slate-900'
      }`}
    >
      {/* Top Status Row + Accessible Waveform */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`w-3 h-3 rounded-full shrink-0 ${
              isRecording
                ? reducedMotion
                  ? 'bg-rose-600'
                  : 'bg-rose-600 animate-ping'
                : isPaused
                ? 'bg-indigo-500'
                : isFinalizing
                ? 'bg-emerald-500'
                : 'bg-amber-600'
            }`}
          />
          <span
            data-testid="voice-recorder-status"
            role="status"
            aria-live="polite"
            className="text-sm font-extrabold tracking-tight flex items-center gap-1.5"
          >
            {isRecording ? (
              <Mic className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <MicOff className="w-4 h-4 text-slate-600 shrink-0" />
            )}
            <span>{statusBadgeText}</span>
          </span>
        </div>

        {/* Waveform Visualization */}
        <div
          data-testid="voice-waveform"
          aria-hidden="true"
          className="flex items-end gap-1 h-8 px-2.5 py-1 rounded-xl bg-white/80 border border-purple-200/70"
        >
          {WAVEFORM_HEIGHTS.map((hClass, idx) => (
            <span
              key={idx}
              className={`w-1.5 rounded-full transition-all duration-300 ${
                isRecording
                  ? `${hClass} bg-rose-500 ${reducedMotion ? '' : 'animate-pulse'}`
                  : isPaused
                  ? 'h-2.5 bg-indigo-400'
                  : 'h-2 bg-slate-300'
              }`}
              style={
                isRecording && !reducedMotion
                  ? { animationDelay: `${idx * 110}ms` }
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* Microphone Activity Summary */}
      <p className="text-xs font-semibold flex items-center gap-1.5 text-slate-700">
        <Volume2 className="w-3.5 h-3.5 shrink-0 text-purple-700" />
        <span>{isMicOpen ? strings.micActiveLabel : strings.micPausedLabel}</span>
      </p>

      {/* Accumulating Transcript Box */}
      <div
        data-testid="accumulating-transcript-box"
        className={`rounded-xl p-3.5 border min-h-[76px] text-sm md:text-base leading-relaxed ${
          highContrast
            ? 'bg-black text-white border-amber-300'
            : 'bg-white text-slate-900 border-purple-200'
        }`}
      >
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
          {strings.transcriptLabel}
        </div>
        {finalizedTranscript || interimTranscript ? (
          <p className="break-words">
            {finalizedTranscript && (
              <span data-testid="finalized-transcript-text" className="font-semibold">
                {finalizedTranscript}
              </span>
            )}
            {finalizedTranscript && interimTranscript && ' '}
            {interimTranscript && (
              <span
                data-testid="interim-voice-pill"
                className="italic text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded"
              >
                {interimTranscript}
              </span>
            )}
          </p>
        ) : (
          <p data-testid="transcript-placeholder" className="text-slate-500 italic text-sm">
            {strings.transcriptPlaceholder}
          </p>
        )}
      </div>

      {/* Error / Calm Notice Banner (always preserves captured transcript above) */}
      {(errorMessage || noticeMessage) && (
        <div
          role="alert"
          data-testid="voice-recorder-alert"
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            isError || isUnsupported
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage || noticeMessage}</span>
        </div>
      )}

      {/* Large Dementia-Friendly Controls */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {!isUnsupported && (
          <button
            type="button"
            data-testid="voice-stop-send-btn"
            onClick={() => void stopAndSend()}
            disabled={isFinalizing}
            aria-label={strings.stopAndSendBtn}
            aria-busy={isFinalizing}
            className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-extrabold text-sm md:text-base min-h-[52px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400"
          >
            {isFinalizing ? (
              <Loader2 className="w-5 h-5 animate-spin shrink-0" />
            ) : (
              <Square className="w-4 h-4 fill-current shrink-0" />
            )}
            <span>{isFinalizing ? strings.finalizingBadge : strings.stopAndSendBtn}</span>
          </button>
        )}

        {isRecording && (
          <button
            type="button"
            data-testid="voice-pause-btn"
            onClick={pauseRecording}
            disabled={isFinalizing}
            aria-label={strings.pauseBtn}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm min-h-[52px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400"
          >
            <Pause className="w-4 h-4 shrink-0" />
            <span>{strings.pauseBtn}</span>
          </button>
        )}

        {isPaused && (
          <button
            type="button"
            data-testid="voice-resume-btn"
            onClick={resumeRecording}
            disabled={isFinalizing}
            aria-label={strings.resumeBtn}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm min-h-[52px] bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-400"
          >
            <Play className="w-4 h-4 fill-current shrink-0" />
            <span>{strings.resumeBtn}</span>
          </button>
        )}

        {isError && (
          <button
            type="button"
            data-testid="voice-retry-btn"
            onClick={retryRecording}
            disabled={isFinalizing}
            aria-label={strings.retryBtn}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm min-h-[52px] bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-400"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>{strings.retryBtn}</span>
          </button>
        )}

        <button
          type="button"
          data-testid="voice-discard-btn"
          onClick={discardRecording}
          disabled={isFinalizing}
          aria-label={strings.discardBtn}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm min-h-[52px] bg-white hover:bg-slate-100 text-slate-700 border-2 border-slate-300 shadow-2xs transition cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400"
        >
          <Trash2 className="w-4 h-4 shrink-0" />
          <span>{strings.discardBtn}</span>
        </button>
      </div>
    </section>
  );
};
