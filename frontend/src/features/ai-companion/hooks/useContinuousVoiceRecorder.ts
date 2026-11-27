import { useState, useRef, useCallback, useEffect } from 'react';
import { SpeechService } from '../../../services/speechService.js';
import {
  MultilingualVoicePipeline,
  AcousticTranscribeResult,
} from '../../../services/multilingualVoicePipeline.js';
import {
  getContinuousVoiceStrings,
  ContinuousVoiceStrings,
} from '../utils/continuousVoiceLocalization.js';

export type ContinuousRecorderStatus =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'finalizing'
  | 'error'
  | 'unsupported';

const NON_RECOVERABLE_ERRORS = new Set([
  'not-allowed',
  'service-not-allowed',
  'audio-capture',
  'not-supported',
  'language-not-supported',
]);

const MAX_SILENCE_RECOVERY_RESTARTS = 5;
const MAX_NETWORK_RETRIES = 1;
const STOP_FLUSH_WAIT_MS = 350;

function normalizeForComparison(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,!?।]+$/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/^[.,!?।"'()]+|[.,!?।"'()]+$/g, '');
}

/**
 * Append a newly finalized or recovered segment into existing accumulated
 * segments without duplicating repeated tail phrases or identical back-to-back segments.
 */
export function appendTranscriptSegment(
  existingSegments: string[],
  rawNextSegment: string
): string[] {
  const cleanNext = (rawNextSegment || '').trim().replace(/\s+/g, ' ');
  if (!cleanNext) return existingSegments;

  if (existingSegments.length === 0) {
    return [cleanNext];
  }

  const last = existingSegments[existingSegments.length - 1];
  const lastNorm = normalizeForComparison(last);
  const nextNorm = normalizeForComparison(cleanNext);

  // Skip exact consecutive duplicate (e.g., Web Speech re-emitting same finalized utterance)
  if (lastNorm && nextNorm === lastNorm) {
    return existingSegments;
  }

  // Handle cumulative prefix expansion where the engine expands an earlier finalized phrase
  if (lastNorm && nextNorm.startsWith(lastNorm + ' ')) {
    const suffix = cleanNext.slice(last.length).trim();
    if (!suffix) return existingSegments;
    const nextList = [...existingSegments];
    nextList[nextList.length - 1] = `${last} ${suffix}`.replace(/\s+/g, ' ').trim();
    return nextList;
  }

  // Deduplicate multi-word boundary overlap across browser session restarts
  const combinedExisting = existingSegments.join(' ').trim();
  const existingWords = combinedExisting.split(/\s+/);
  const nextWords = cleanNext.split(/\s+/);
  const maxOverlap = Math.min(existingWords.length, nextWords.length);

  if (nextWords.length >= 2) {
    for (let k = maxOverlap; k >= 2; k--) {
      let allMatch = true;
      for (let j = 0; j < k; j++) {
        const w1 = normalizeWord(existingWords[existingWords.length - k + j]);
        const w2 = normalizeWord(nextWords[j]);
        if (!w1 || w1 !== w2) {
          allMatch = false;
          break;
        }
      }
      if (allMatch) {
        const remainder = nextWords.slice(k).join(' ').trim();
        return remainder ? [...existingSegments, remainder] : existingSegments;
      }
    }
  }

  return [...existingSegments, cleanNext];
}

/**
 * Merge all accumulated segments and any valid trailing interim text into a
 * single clean transcript without duplicate fragments.
 */
export function consolidateTranscript(
  committedSegments: string[],
  pendingInterim?: string
): string {
  let merged: string[] = [];
  for (const seg of committedSegments) {
    merged = appendTranscriptSegment(merged, seg);
  }
  if (pendingInterim && pendingInterim.trim()) {
    merged = appendTranscriptSegment(merged, pendingInterim);
  }
  return merged.join(' ').trim().replace(/\s+/g, ' ');
}

export interface UseContinuousVoiceRecorderOptions {
  language: string;
  spokenInputLanguages?: string[];
  onSubmitTranscript: (transcript: string) => Promise<void> | void;
}

export interface ContinuousVoiceRecorderController {
  status: ContinuousRecorderStatus;
  isSupported: boolean;
  isMicOpen: boolean;
  isActive: boolean;
  isSubmitting: boolean;
  committedSegments: string[];
  finalizedTranscript: string;
  interimTranscript: string;
  accumulatedTranscript: string;
  hasTranscriptContent: boolean;
  errorMessage: string | null;
  errorCode: string | null;
  noticeMessage: string | null;
  recoveryCount: number;
  strings: ContinuousVoiceStrings;
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopAndSend: () => Promise<boolean>;
  discardRecording: () => void;
  retryRecording: () => void;
  clearNotices: () => void;
}

export function useContinuousVoiceRecorder({
  language,
  spokenInputLanguages,
  onSubmitTranscript,
}: UseContinuousVoiceRecorderOptions): ContinuousVoiceRecorderController {
  const strings = getContinuousVoiceStrings(language);
  const stringsRef = useRef(strings);
  stringsRef.current = strings;

  const isSupported = SpeechService.isSpeechRecognitionSupported() || MultilingualVoicePipeline.isLocalBridgeOnline();

  const [status, setStatus] = useState<ContinuousRecorderStatus>('idle');
  const [isMicOpen, setIsMicOpen] = useState(false);
  const [committedSegments, setCommittedSegments] = useState<string[]>([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [recoveryCount, setRecoveryCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusRef = useRef<ContinuousRecorderStatus>('idle');
  const committedSegmentsRef = useRef<string[]>([]);
  const interimRef = useRef('');
  const languageRef = useRef(language);
  const spokenLanguagesRef = useRef(spokenInputLanguages);
  const onSubmitRef = useRef(onSubmitTranscript);
  const mountedRef = useRef(true);
  const stopListeningRef = useRef<(() => void) | null>(null);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendingLockRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const fatalErrorInTurnRef = useRef(false);
  const silenceRecoveryCountRef = useRef(0);
  const networkRetryCountRef = useRef(0);
  const flushResolverRef = useRef<(() => void) | null>(null);
  const prevLanguageRef = useRef(language);

  const errorMessageRef = useRef<string | null>(null);
  errorMessageRef.current = errorMessage;

  languageRef.current = language;
  spokenLanguagesRef.current = spokenInputLanguages;
  onSubmitRef.current = onSubmitTranscript;

  const setStatusSynced = useCallback((next: ContinuousRecorderStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const clearRecoveryTimer = useCallback(() => {
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  }, []);

  const promotePendingInterim = useCallback(() => {
    const pending = interimRef.current.trim();
    interimRef.current = '';
    setInterimTranscript('');
    if (pending) {
      const updated = appendTranscriptSegment(committedSegmentsRef.current, pending);
      committedSegmentsRef.current = updated;
      setCommittedSegments(updated);
    }
  }, []);

  const openSession = useCallback(() => {
    if (!mountedRef.current) return;

    clearRecoveryTimer();

    if (stopListeningRef.current) {
      intentionalStopRef.current = true;
      stopListeningRef.current();
      stopListeningRef.current = null;
    }

    const activeLang = languageRef.current || spokenLanguagesRef.current?.[0] || 'en';
    const primaryCode = activeLang.split(/[-_]/)[0].toLowerCase();
    const capability = MultilingualVoicePipeline.getLanguageVoiceCapability(primaryCode);

    if (!SpeechService.isSpeechRecognitionSupported() && !MultilingualVoicePipeline.isLocalBridgeOnline()) {
      const fallback = SpeechService.getCalmVoiceErrorMessage('not-supported', activeLang);
      setIsMicOpen(false);
      setErrorCode('not-supported');
      setErrorMessage(fallback);
      setStatusSynced('unsupported');
      return;
    }

    if (!capability.hasBrowserSTT && !MultilingualVoicePipeline.isLocalBridgeOnline()) {
      const msg = `Browser voice recognition is not available for ${primaryCode.toUpperCase()}. Please select an official voice language or type below.`;
      setIsMicOpen(false);
      setErrorCode('language-not-supported');
      setErrorMessage(msg);
      setStatusSynced('unsupported');
      return;
    }

    SpeechService.cancelSpeech();
    intentionalStopRef.current = false;
    fatalErrorInTurnRef.current = false;
    setErrorMessage(null);
    setErrorCode(null);
    setIsMicOpen(true);
    setStatusSynced('recording');

    let endedSynchronously = false;

    const handleResult = (result: AcousticTranscribeResult) => {
      if (!mountedRef.current) return;
      if (statusRef.current !== 'recording' && statusRef.current !== 'finalizing') return;

      if (result.success && result.transcript) {
        silenceRecoveryCountRef.current = 0;
        networkRetryCountRef.current = 0;
        interimRef.current = '';
        setInterimTranscript('');
        setNoticeMessage(null);

        const nextSegments = appendTranscriptSegment(
          committedSegmentsRef.current,
          result.transcript
        );
        committedSegmentsRef.current = nextSegments;
        setCommittedSegments(nextSegments);
      } else if (result.error) {
        fatalErrorInTurnRef.current = true;
        setIsMicOpen(false);
        setErrorCode('recognition-error');
        setErrorMessage(result.error);
        setStatusSynced('error');
      }
    };

    const handleInterim = (interim: string) => {
      if (!mountedRef.current) return;
      if (statusRef.current !== 'recording' && statusRef.current !== 'finalizing') return;
      if (interim.trim()) {
        silenceRecoveryCountRef.current = 0;
        networkRetryCountRef.current = 0;
      }
      interimRef.current = interim;
      setInterimTranscript(interim);
    };

    const handleErrorMsg = (msg: string) => {
      if (!mountedRef.current) return;
      if (intentionalStopRef.current) return;
      if (statusRef.current === 'paused' || statusRef.current === 'idle') return;
      if (!fatalErrorInTurnRef.current && errorMessageRef.current === null) {
        // Fallback when onStructuredError didn't already classify error
        setNoticeMessage(msg);
      }
    };

    const handleEnd = () => {
      endedSynchronously = true;
      stopListeningRef.current = null;
      if (!mountedRef.current) return;
      setIsMicOpen(false);

      if (flushResolverRef.current) {
        const resolve = flushResolverRef.current;
        flushResolverRef.current = null;
        resolve();
        return;
      }

      if (intentionalStopRef.current || statusRef.current !== 'recording' || fatalErrorInTurnRef.current) {
        return;
      }

      // Preserve any trailing interim words before restarting session cleanly
      promotePendingInterim();

      if (silenceRecoveryCountRef.current < MAX_SILENCE_RECOVERY_RESTARTS) {
        silenceRecoveryCountRef.current += 1;
        setRecoveryCount((c) => c + 1);
        setNoticeMessage(stringsRef.current.sessionRecoveredNotice);
        clearRecoveryTimer();
        recoveryTimerRef.current = setTimeout(() => {
          recoveryTimerRef.current = null;
          if (mountedRef.current && statusRef.current === 'recording' && !intentionalStopRef.current) {
            openSession();
          }
        }, 180);
      } else {
        // Bounded pause after extended dead silence — preserves all speech, zero runaway loops
        setStatusSynced('paused');
        setNoticeMessage(stringsRef.current.silencePausedNotice);
      }
    };

    const stopFn = MultilingualVoicePipeline.startListening(
      activeLang,
      handleResult,
      handleErrorMsg,
      handleEnd,
      spokenLanguagesRef.current,
      handleInterim,
      {
        continuous: true,
        maxAlternatives: 1,
        onStart: () => {
          if (mountedRef.current && statusRef.current === 'recording') {
            setIsMicOpen(true);
          }
        },
        onNoMatch: () => {
          if (mountedRef.current && statusRef.current === 'recording') {
            setNoticeMessage(stringsRef.current.transcriptPlaceholder);
          }
        },
        onStructuredError: (code, msg, _recoverable) => {
          if (!mountedRef.current) return;
          if (intentionalStopRef.current) return;
          if (statusRef.current === 'paused' || statusRef.current === 'idle') return;

          if (code === 'no-speech') {
            // Cognitive pause tolerance: preserve transcript and allow controlled recovery
            setNoticeMessage(msg);
            return;
          }

          if (code === 'network' && networkRetryCountRef.current < MAX_NETWORK_RETRIES) {
            networkRetryCountRef.current += 1;
            setNoticeMessage(msg);
            return;
          }

          if (NON_RECOVERABLE_ERRORS.has(code) || code === 'network' || code === 'aborted' || code === 'start-failed') {
            fatalErrorInTurnRef.current = true;
            clearRecoveryTimer();
            promotePendingInterim();
            setIsMicOpen(false);
            setErrorCode(code);
            setErrorMessage(msg);
            setStatusSynced(code === 'not-supported' || code === 'language-not-supported' ? 'unsupported' : 'error');
          }
        },
      }
    );

    stopListeningRef.current = endedSynchronously ? null : stopFn;
  }, [clearRecoveryTimer, promotePendingInterim, setStatusSynced]);

  const startRecording = useCallback(() => {
    if (sendingLockRef.current || statusRef.current === 'finalizing') return;
    committedSegmentsRef.current = [];
    interimRef.current = '';
    setCommittedSegments([]);
    setInterimTranscript('');
    setNoticeMessage(null);
    setErrorMessage(null);
    setErrorCode(null);
    silenceRecoveryCountRef.current = 0;
    networkRetryCountRef.current = 0;
    openSession();
  }, [openSession]);

  const pauseRecording = useCallback(() => {
    if (statusRef.current !== 'recording') return;
    clearRecoveryTimer();
    intentionalStopRef.current = true;
    setStatusSynced('paused');
    setIsMicOpen(false);

    if (stopListeningRef.current) {
      stopListeningRef.current();
      stopListeningRef.current = null;
    }
    MultilingualVoicePipeline.stopMicrophone();
    SpeechService.abortListening();

    promotePendingInterim();
    setNoticeMessage(stringsRef.current.micPausedLabel);
  }, [clearRecoveryTimer, promotePendingInterim, setStatusSynced]);

  const resumeRecording = useCallback(() => {
    if (statusRef.current !== 'paused' && statusRef.current !== 'error') return;
    silenceRecoveryCountRef.current = 0;
    networkRetryCountRef.current = 0;
    setNoticeMessage(null);
    setErrorMessage(null);
    setErrorCode(null);
    openSession();
  }, [openSession]);

  const retryRecording = useCallback(() => {
    silenceRecoveryCountRef.current = 0;
    networkRetryCountRef.current = 0;
    setErrorMessage(null);
    setErrorCode(null);
    setNoticeMessage(null);
    openSession();
  }, [openSession]);

  const discardRecording = useCallback(() => {
    clearRecoveryTimer();
    intentionalStopRef.current = true;
    sendingLockRef.current = false;
    setIsSubmitting(false);

    if (flushResolverRef.current) {
      const resolve = flushResolverRef.current;
      flushResolverRef.current = null;
      resolve();
    }

    if (stopListeningRef.current) {
      stopListeningRef.current();
      stopListeningRef.current = null;
    }
    MultilingualVoicePipeline.stopMicrophone();
    SpeechService.abortListening();
    SpeechService.cancelSpeech();

    committedSegmentsRef.current = [];
    interimRef.current = '';
    silenceRecoveryCountRef.current = 0;
    networkRetryCountRef.current = 0;

    setCommittedSegments([]);
    setInterimTranscript('');
    setErrorMessage(null);
    setErrorCode(null);
    setNoticeMessage(null);
    setIsMicOpen(false);
    setStatusSynced('idle');
  }, [clearRecoveryTimer, setStatusSynced]);

  const stopAndSend = useCallback(async (): Promise<boolean> => {
    if (sendingLockRef.current || statusRef.current === 'finalizing') {
      return false;
    }
    sendingLockRef.current = true;
    setIsSubmitting(true);
    clearRecoveryTimer();

    const wasRecordingWithOpenMic =
      statusRef.current === 'recording' && (stopListeningRef.current !== null || SpeechService.isListeningActive());

    setStatusSynced('finalizing');

    if (wasRecordingWithOpenMic) {
      intentionalStopRef.current = false;
      await new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          flushResolverRef.current = null;
          resolve();
        };
        flushResolverRef.current = done;
        SpeechService.stopListening();
        setTimeout(done, STOP_FLUSH_WAIT_MS);
      });
    }

    intentionalStopRef.current = true;
    if (stopListeningRef.current) {
      stopListeningRef.current();
      stopListeningRef.current = null;
    }
    MultilingualVoicePipeline.stopMicrophone();
    SpeechService.abortListening();
    setIsMicOpen(false);

    const consolidated = consolidateTranscript(
      committedSegmentsRef.current,
      interimRef.current
    );
    interimRef.current = '';
    setInterimTranscript('');

    if (!consolidated) {
      sendingLockRef.current = false;
      setIsSubmitting(false);
      committedSegmentsRef.current = [];
      setCommittedSegments([]);
      setNoticeMessage(stringsRef.current.emptyTranscriptNotice);
      setStatusSynced('idle');
      return false;
    }

    // Lock consolidated text as clean single segment in case retry is needed on network failure
    committedSegmentsRef.current = [consolidated];
    setCommittedSegments([consolidated]);

    try {
      await onSubmitRef.current(consolidated);
      if (!mountedRef.current) return true;
      committedSegmentsRef.current = [];
      interimRef.current = '';
      silenceRecoveryCountRef.current = 0;
      networkRetryCountRef.current = 0;
      setCommittedSegments([]);
      setInterimTranscript('');
      setErrorMessage(null);
      setErrorCode(null);
      setNoticeMessage(null);
      setStatusSynced('idle');
      return true;
    } catch {
      if (mountedRef.current) {
        setErrorCode('send-failed');
        setErrorMessage(stringsRef.current.sendFailedPreservedNotice);
        setStatusSynced('error');
      }
      return false;
    } finally {
      sendingLockRef.current = false;
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [clearRecoveryTimer, setStatusSynced]);

  const clearNotices = useCallback(() => {
    setErrorMessage(null);
    setErrorCode(null);
    setNoticeMessage(null);
  }, []);

  // Safely tear down active recognition when active language switches
  useEffect(() => {
    if (prevLanguageRef.current === language) return;
    prevLanguageRef.current = language;

    clearRecoveryTimer();
    intentionalStopRef.current = true;

    if (stopListeningRef.current) {
      stopListeningRef.current();
      stopListeningRef.current = null;
    }
    MultilingualVoicePipeline.stopMicrophone();
    SpeechService.abortListening();
    SpeechService.cancelSpeech();
    setIsMicOpen(false);

    promotePendingInterim();

    if (statusRef.current === 'recording' || statusRef.current === 'paused' || statusRef.current === 'error') {
      if (committedSegmentsRef.current.length > 0) {
        setStatusSynced('paused');
        setErrorMessage(null);
        setErrorCode(null);
        setNoticeMessage(getContinuousVoiceStrings(language).languageChangedPausedNotice);
      } else {
        setStatusSynced('idle');
        setErrorMessage(null);
        setErrorCode(null);
        setNoticeMessage(null);
      }
    }
  }, [language, clearRecoveryTimer, promotePendingInterim, setStatusSynced]);

  // Mount & clean unmount teardown
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearRecoveryTimer();
      intentionalStopRef.current = true;
      if (flushResolverRef.current) {
        const resolve = flushResolverRef.current;
        flushResolverRef.current = null;
        resolve();
      }
      if (stopListeningRef.current) {
        stopListeningRef.current();
        stopListeningRef.current = null;
      }
      MultilingualVoicePipeline.stopMicrophone();
      SpeechService.abortListening();
      SpeechService.cancelSpeech();
    };
  }, [clearRecoveryTimer]);

  const finalizedTranscript = committedSegments.join(' ').trim();
  const accumulatedTranscript = consolidateTranscript(committedSegments, interimTranscript);

  return {
    status,
    isSupported,
    isMicOpen,
    isActive: status !== 'idle',
    isSubmitting,
    committedSegments,
    finalizedTranscript,
    interimTranscript,
    accumulatedTranscript,
    hasTranscriptContent: accumulatedTranscript.length > 0,
    errorMessage,
    errorCode,
    noticeMessage,
    recoveryCount,
    strings,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopAndSend,
    discardRecording,
    retryRecording,
    clearNotices,
  };
}
