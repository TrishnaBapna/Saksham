import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  classifyTimeOfDay,
  getLiveTemporalContext,
  formatTemporalPromptBlock,
  detectGreetingTimeMismatch,
  formatTimeOfDayClarification,
} from '../utils/temporalContext';
import { SpeechService } from '../services/speechService';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine';
import { ConversationalAIService } from '../features/ai-companion/services/conversationalAIService';
import { FirebaseAILogicService } from '../features/ai-companion/services/firebaseAILogicService';
import {
  appendTranscriptSegment,
  consolidateTranscript,
} from '../features/ai-companion/hooks/useContinuousVoiceRecorder';
import { getContinuousVoiceStrings } from '../features/ai-companion/utils/continuousVoiceLocalization';
import { ConversationalSanctuaryStage } from '../features/ai-companion/components/ConversationalSanctuaryStage';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { CharacterProvider } from '../context/CharacterContext';
import { AccessibilityProvider } from '../context/AccessibilityContext';
import { PatientExperienceProvider } from '../context/PatientExperienceContext';

// Mock firebase/ai to inspect exact runtime systemInstruction sent on each turn
const generateContentMock = vi.fn().mockResolvedValue({
  response: {
    text: () => 'Namaste! I am right here with you.',
  },
});
const getGenerativeModelMock = vi.fn().mockReturnValue({
  generateContent: generateContentMock,
});

const getAIMock = vi.fn(() => ({ __mockAI: true }));

vi.mock('firebase/ai', () => ({
  getAI: (...args: any[]) => (getAIMock as any)(...args),
  getGenerativeModel: (...args: any[]) => getGenerativeModelMock(...args),
  GoogleAIBackend: vi.fn(),
}));

interface MockRecInstance {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  onnomatch: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
  aborted: boolean;
}

function createSpeechRecognitionHarness(options?: {
  trailingFlushOnStop?: string;
  autoEndOnStop?: boolean;
}) {
  const instances: MockRecInstance[] = [];

  class MockSpeechRecognition implements MockRecInstance {
    continuous = false;
    interimResults = false;
    lang = 'en-IN';
    onstart: (() => void) | null = null;
    onresult: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    onend: (() => void) | null = null;
    onnomatch: (() => void) | null = null;
    aborted = false;

    start = vi.fn(() => {
      this.onstart?.();
    });
    stop = vi.fn(() => {
      if (options?.trailingFlushOnStop && instances.indexOf(this) === 0) {
        this.onresult?.({
          resultIndex: 0,
          results: [{ isFinal: true, 0: { transcript: options.trailingFlushOnStop } }],
        });
      }
      if (options?.autoEndOnStop !== false) {
        this.onend?.();
      }
    });
    abort = vi.fn(() => {
      this.aborted = true;
    });

    constructor() {
      instances.push(this);
    }
  }

  return { MockSpeechRecognition, instances };
}

function createSpeechSynthesisHarness() {
  const spokenUtterances: Array<{
    text: string;
    lang: string;
    voice: any;
    instance: any;
  }> = [];

  class MockUtterance {
    text: string;
    lang = 'en-IN';
    rate = 1;
    pitch = 1;
    voice: any = null;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }

  const synthMock = {
    getVoices: vi.fn(() => [
      { lang: 'en-IN', name: 'Rishi', localService: true } as SpeechSynthesisVoice,
      { lang: 'hi-IN', name: 'Lekha', localService: true } as SpeechSynthesisVoice,
      { lang: 'mr-IN', name: 'Google Marathi', localService: false } as SpeechSynthesisVoice,
      { lang: 'bn-IN', name: 'Google Bengali', localService: false } as SpeechSynthesisVoice,
      { lang: 'ta-IN', name: 'Vani', localService: true } as SpeechSynthesisVoice,
      { lang: 'te-IN', name: 'Google Telugu', localService: false } as SpeechSynthesisVoice,
      { lang: 'kn-IN', name: 'Google Kannada', localService: false } as SpeechSynthesisVoice,
    ]),
    addEventListener: vi.fn(),
    cancel: vi.fn(),
    speak: vi.fn((utt: any) => {
      spokenUtterances.push({
        text: utt.text,
        lang: utt.lang,
        voice: utt.voice,
        instance: utt,
      });
      utt.onstart?.();
    }),
  };

  return { MockUtterance, synthMock, spokenUtterances };
}

function createMediaRecorderHarness() {
  const recorders: any[] = [];
  const trackStopFn = vi.fn();

  class MockMediaRecorder {
    static isTypeSupported = vi.fn((mime: string) => mime === 'audio/webm;codecs=opus' || mime === 'audio/webm');
    mimeType: string;
    state: 'inactive' | 'recording' | 'paused' = 'inactive';
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    onerror: ((e: any) => void) | null = null;
    onstop: (() => void) | null = null;

    start = vi.fn(() => {
      this.state = 'recording';
    });
    pause = vi.fn(() => {
      this.state = 'paused';
    });
    resume = vi.fn(() => {
      this.state = 'recording';
    });
    requestData = vi.fn(() => {
      this.ondataavailable?.({ data: new Blob([new Uint8Array([1, 2, 3, 4])], { type: this.mimeType }) });
    });
    stop = vi.fn(() => {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob([new Uint8Array([5, 6, 7, 8])], { type: this.mimeType }) });
      this.onstop?.();
    });

    constructor(_stream: MediaStream, opts?: { mimeType?: string }) {
      this.mimeType = opts?.mimeType || 'audio/webm';
      recorders.push(this);
    }
  }

  const getUserMediaMock = vi.fn().mockResolvedValue({
    getTracks: () => [{ stop: trackStopFn }],
  });

  return { MockMediaRecorder, recorders, getUserMediaMock, trackStopFn };
}

const LanguageSwitchTestControl: React.FC = () => {
  const { setLanguage } = useLanguage();
  return (
    <div>
      <button type="button" data-testid="switch-en" onClick={() => setLanguage('en')}>
        Switch EN
      </button>
      <button type="button" data-testid="switch-hi" onClick={() => setLanguage('hi')}>
        Switch HI
      </button>
      <button type="button" data-testid="switch-mr" onClick={() => setLanguage('mr')}>
        Switch MR
      </button>
      <button type="button" data-testid="switch-bn" onClick={() => setLanguage('bn')}>
        Switch BN
      </button>
      <button type="button" data-testid="switch-ta" onClick={() => setLanguage('ta')}>
        Switch TA
      </button>
      <button type="button" data-testid="switch-te" onClick={() => setLanguage('te')}>
        Switch TE
      </button>
      <button type="button" data-testid="switch-kn" onClick={() => setLanguage('kn')}>
        Switch KN
      </button>
    </div>
  );
};

function renderSanctuary() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LanguageProvider>
          <CharacterProvider>
            <AccessibilityProvider>
              <PatientExperienceProvider>
                <LanguageSwitchTestControl />
                <ConversationalSanctuaryStage />
              </PatientExperienceProvider>
            </AccessibilityProvider>
          </CharacterProvider>
        </LanguageProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Continuous Transcript Accumulation & Deduplication Utilities', () => {
  it('merges consecutive finalized sentences cleanly without duplicating repeats or overlaps', () => {
    let segs: string[] = [];
    segs = appendTranscriptSegment(segs, 'Hello Asha');
    segs = appendTranscriptSegment(segs, 'Hello Asha'); // exact burst repeat
    segs = appendTranscriptSegment(segs, 'Hello Asha I forgot where I kept my glasses'); // cumulative expansion
    segs = appendTranscriptSegment(segs, 'where I kept my glasses on the table'); // overlap stitch
    segs = appendTranscriptSegment(segs, 'Please help me check today');

    expect(consolidateTranscript(segs)).toBe(
      'Hello Asha I forgot where I kept my glasses on the table Please help me check today'
    );
  });

  it('provides localized recorder controls and status labels for all 7 voice languages', () => {
    const langs = ['en', 'hi', 'mr', 'bn', 'ta', 'te', 'kn'] as const;
    for (const lang of langs) {
      const ui = getContinuousVoiceStrings(lang);
      expect(ui.tapToSpeakBtn.trim().length).toBeGreaterThan(2);
      expect(ui.stopAndSendBtn.trim().length).toBeGreaterThan(2);
      expect(ui.pauseBtn.trim().length).toBeGreaterThan(2);
      expect(ui.resumeBtn.trim().length).toBeGreaterThan(2);
      expect(ui.discardBtn.trim().length).toBeGreaterThan(2);
    }
  });
});

describe('Accessible Continuous Voice Mode (Start, Pauses, Recovery, Pause/Resume, Stop & Send)', () => {
  const originalSpeechRec = (window as any).SpeechRecognition;
  const originalWebkitSpeechRec = (window as any).webkitSpeechRecognition;
  const originalSpeechSynth = (window as any).speechSynthesis;
  const originalUtterance = (globalThis as any).SpeechSynthesisUtterance;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    SpeechService.abortListening();
    SpeechService.cancelSpeech();
    vi.restoreAllMocks();
    getGenerativeModelMock.mockClear();
    generateContentMock.mockClear();
  });

  afterEach(() => {
    SpeechService.abortListening();
    SpeechService.cancelSpeech();
    (window as any).SpeechRecognition = originalSpeechRec;
    (window as any).webkitSpeechRecognition = originalWebkitSpeechRec;
    (window as any).speechSynthesis = originalSpeechSynth;
    (globalThis as any).SpeechSynthesisUtterance = originalUtterance;
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('prevents stale session #1 async onend from corrupting session #2 in SpeechService', () => {
    const { MockSpeechRecognition, instances } = createSpeechRecognitionHarness();
    (window as any).SpeechRecognition = MockSpeechRecognition;

    const results: string[] = [];
    const onEnd1 = vi.fn();
    const onEnd2 = vi.fn();
    const onError1 = vi.fn();
    const onError2 = vi.fn();

    SpeechService.startListening((t) => results.push(`s1:${t}`), onError1, onEnd1, 'en', undefined, {
      continuous: true,
    });
    expect(instances.length).toBe(1);
    expect(instances[0].continuous).toBe(true);
    expect(SpeechService.isListeningActive()).toBe(true);

    // Session #2 supersedes session #1 before async teardown fires
    SpeechService.startListening((t) => results.push(`s2:${t}`), onError2, onEnd2, 'hi', undefined, {
      continuous: true,
    });
    expect(instances.length).toBe(2);
    expect(instances[1].lang).toBe('hi-IN');

    instances[0].onerror?.({ error: 'aborted' });
    instances[0].onend?.();

    expect(SpeechService.isListeningActive()).toBe(true);
    expect(onError1).not.toHaveBeenCalled();
    expect(onEnd1).not.toHaveBeenCalled();
    expect(onEnd2).not.toHaveBeenCalled();

    instances[1].onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: 'नमस्ते आशा' } }],
    });
    expect(results).toEqual(['s2:नमस्ते आशा']);
  });

  it('accumulates multiple consecutive sentences across long cognitive pauses without auto-submitting, then sends ONCE on Stop & Send', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { MockSpeechRecognition, instances } = createSpeechRecognitionHarness();
    const { MockUtterance, synthMock, spokenUtterances } = createSpeechSynthesisHarness();
    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).speechSynthesis = synthMock;
    (globalThis as any).SpeechSynthesisUtterance = MockUtterance;

    const processSpy = vi.spyOn(ConversationEngine, 'process');

    renderSanctuary();

    // Idle state: large accessible Start button & no recorder panel yet
    const startBtn = screen.getByTestId('sanctuary-mic-button');
    expect(startBtn).toHaveAttribute('data-listening', 'false');
    expect(screen.queryByTestId('continuous-voice-recorder')).not.toBeInTheDocument();

    // 1. Start Recording
    await act(async () => {
      fireEvent.click(startBtn);
    });
    const recorder = screen.getByTestId('continuous-voice-recorder');
    expect(recorder).toHaveAttribute('data-recorder-status', 'recording');
    expect(recorder).toHaveAttribute('data-listening', 'true');
    expect(screen.getByTestId('voice-waveform')).toBeInTheDocument();
    expect(instances[0].continuous).toBe(true);

    // 2. Sentence 1 finalized + Pause (`no-speech`) + Interim thinking -> must NOT auto-submit!
    await act(async () => {
      instances[0].onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'Hello Asha.' } }],
      });
    });
    expect(screen.getByTestId('finalized-transcript-text')).toHaveTextContent('Hello Asha.');
    expect(processSpy).not.toHaveBeenCalled();

    // Patient pauses for 10 seconds to recall next thought; Web Speech fires no-speech warning
    await act(async () => {
      instances[0].onerror?.({ error: 'no-speech' });
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(processSpy).not.toHaveBeenCalled();
    expect(spokenUtterances.length).toBe(0);
    expect(screen.getByTestId('finalized-transcript-text')).toHaveTextContent('Hello Asha.');

    // 3. Interim words arrive -> appear in interim pill separately
    await act(async () => {
      instances[0].onresult?.({
        resultIndex: 1,
        results: [
          { isFinal: true, 0: { transcript: 'Hello Asha.' } },
          { isFinal: false, 0: { transcript: 'What time' } },
        ],
      });
    });
    expect(screen.getByTestId('interim-voice-pill')).toHaveTextContent('What time');
    expect(processSpy).not.toHaveBeenCalled();

    // 4. Sentence 2 finalized + Sentence 3 finalized -> all preserved in accumulated transcript
    await act(async () => {
      instances[0].onresult?.({
        resultIndex: 1,
        results: [
          { isFinal: true, 0: { transcript: 'Hello Asha.' } },
          { isFinal: true, 0: { transcript: 'What time is it?' } },
        ],
      });
      instances[0].onresult?.({
        resultIndex: 2,
        results: [
          { isFinal: true, 0: { transcript: 'Hello Asha.' } },
          { isFinal: true, 0: { transcript: 'What time is it?' } },
          { isFinal: true, 0: { transcript: 'Please tell me slowly.' } },
        ],
      });
    });
    expect(screen.queryByTestId('interim-voice-pill')).not.toBeInTheDocument();
    expect(screen.getByTestId('finalized-transcript-text')).toHaveTextContent(
      'Hello Asha. What time is it? Please tell me slowly.'
    );

    // 5. Click Stop & Send twice rapidly -> sends EXACTLY ONCE!
    const stopSendBtn = screen.getByTestId('voice-stop-send-btn');
    await act(async () => {
      fireEvent.click(stopSendBtn);
      fireEvent.click(stopSendBtn);
    });

    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy.mock.calls[0][0]).toBe(
      'Hello Asha. What time is it? Please tell me slowly.'
    );
    expect(
      screen.getByText('Hello Asha. What time is it? Please tell me slowly.')
    ).toBeInTheDocument();

    // Recorder returns to idle cleanly, ready for next voice conversation, and Asha speaks response after stopping
    expect(screen.queryByTestId('continuous-voice-recorder')).not.toBeInTheDocument();
    expect(screen.getByTestId('sanctuary-mic-button')).toHaveAttribute('data-listening', 'false');
    expect(spokenUtterances.length).toBe(1);
  });

  it('preserves captured transcript when browser ends recognition unexpectedly and recovers seamlessly without runaway loops', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { MockSpeechRecognition, instances } = createSpeechRecognitionHarness();
    (window as any).SpeechRecognition = MockSpeechRecognition;

    renderSanctuary();

    await act(async () => {
      fireEvent.click(screen.getByTestId('sanctuary-mic-button'));
    });

    // Speak sentence 1 + dangling interim word before browser hits duration cap / onend
    await act(async () => {
      instances[0].onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'Where are my' } }],
      });
      instances[0].onresult?.({
        resultIndex: 1,
        results: [
          { isFinal: true, 0: { transcript: 'Where are my' } },
          { isFinal: false, 0: { transcript: 'glasses' } },
        ],
      });
      instances[0].onend?.(); // unexpected browser end
    });

    // Advance recovery timer -> opens session #2 cleanly preserving 'Where are my glasses'
    await act(async () => {
      await vi.advanceTimersByTimeAsync(220);
    });
    expect(instances.length).toBe(2);
    expect(screen.getByTestId('finalized-transcript-text')).toHaveTextContent('Where are my glasses');

    // User adds trailing phrase on recovered session #2 + stops & sends
    await act(async () => {
      instances[1].onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'I left them somewhere' } }],
      });
    });
    expect(screen.getByTestId('finalized-transcript-text')).toHaveTextContent(
      'Where are my glasses I left them somewhere'
    );

    // Exhaust extended dead silence restarts cleanly -> transitions to safe Paused state (not infinite loop!)
    for (let i = 1; i <= 6; i++) {
      await act(async () => {
        instances[instances.length - 1].onend?.();
        await vi.advanceTimersByTimeAsync(220);
      });
    }
    expect(instances.length).toBeLessThanOrEqual(7);
    expect(screen.getByTestId('continuous-voice-recorder')).toHaveAttribute(
      'data-recorder-status',
      'paused'
    );
    expect(screen.getByTestId('finalized-transcript-text')).toHaveTextContent(
      'Where are my glasses I left them somewhere'
    );
  });

  it('flushes trailing final speech during Stop & Send before submitting', async () => {
    const { MockSpeechRecognition, instances } = createSpeechRecognitionHarness({
      trailingFlushOnStop: 'and please remind me of water.',
      autoEndOnStop: true,
    });
    (window as any).SpeechRecognition = MockSpeechRecognition;
    const processSpy = vi.spyOn(ConversationEngine, 'process');

    renderSanctuary();

    await act(async () => {
      fireEvent.click(screen.getByTestId('sanctuary-mic-button'));
      instances[0].onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'Thank you Asha' } }],
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('voice-stop-send-btn'));
    });

    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy.mock.calls[0][0]).toBe('Thank you Asha and please remind me of water.');
  });

  it('supports Pause, Resume, Discard, and Retry cleanly without sending partial or empty transcripts', async () => {
    const { MockSpeechRecognition, instances } = createSpeechRecognitionHarness();
    (window as any).SpeechRecognition = MockSpeechRecognition;
    const processSpy = vi.spyOn(ConversationEngine, 'process');

    renderSanctuary();

    // Start + Pause + Resume flow
    await act(async () => {
      fireEvent.click(screen.getByTestId('sanctuary-mic-button'));
      instances[0].onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'I want to talk about' } }],
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('voice-pause-btn'));
    });
    expect(screen.getByTestId('continuous-voice-recorder')).toHaveAttribute(
      'data-recorder-status',
      'paused'
    );
    expect(screen.getByTestId('continuous-voice-recorder')).toHaveAttribute('data-listening', 'false');
    expect(processSpy).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByTestId('voice-resume-btn'));
    });
    expect(instances.length).toBe(2);
    expect(screen.getByTestId('continuous-voice-recorder')).toHaveAttribute(
      'data-recorder-status',
      'recording'
    );
    expect(screen.getByTestId('finalized-transcript-text')).toHaveTextContent(
      'I want to talk about'
    );

    // Discard cancels completely without sending
    await act(async () => {
      fireEvent.click(screen.getByTestId('voice-discard-btn'));
    });
    expect(processSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId('continuous-voice-recorder')).not.toBeInTheDocument();

    // Empty transcript Stop & Send must NOT send an empty message
    await act(async () => {
      fireEvent.click(screen.getByTestId('sanctuary-mic-button'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('voice-stop-send-btn'));
    });
    expect(processSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('voice-recorder-alert')).toBeInTheDocument();

    // Send error preserves transcript so Retry / Stop & Send succeeds without duplicating chat messages
    processSpy.mockRejectedValueOnce(new Error('Temporary network error'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('sanctuary-mic-button'));
    });
    await act(async () => {
      instances[instances.length - 1].onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'Open mind games' } }],
      });
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('voice-stop-send-btn'));
    });
    expect(screen.getByTestId('continuous-voice-recorder')).toHaveAttribute(
      'data-recorder-status',
      'error'
    );
    expect(screen.getByTestId('finalized-transcript-text')).toHaveTextContent('Open mind games');
    expect(screen.getByTestId('voice-retry-btn')).toBeInTheDocument();

    // Retry Stop & Send now succeeds
    await act(async () => {
      fireEvent.click(screen.getByTestId('voice-stop-send-btn'));
    });
    expect(screen.getAllByText('Open mind games')).toHaveLength(1);
    expect(screen.queryByTestId('continuous-voice-recorder')).not.toBeInTheDocument();
  });

  it('handles microphone permission errors and unsupported browser honestly without infinite loops or losing spoken words', async () => {
    const { MockSpeechRecognition, instances } = createSpeechRecognitionHarness();
    (window as any).SpeechRecognition = MockSpeechRecognition;

    renderSanctuary();

    await act(async () => {
      fireEvent.click(screen.getByTestId('sanctuary-mic-button'));
      instances[0].onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'Earlier sentence.' } }],
      });
      instances[0].onerror?.({ error: 'not-allowed' });
      instances[0].onend?.();
    });

    expect(instances.length).toBe(1);
    expect(screen.getByTestId('continuous-voice-recorder')).toHaveAttribute(
      'data-recorder-status',
      'error'
    );
    expect(screen.getByTestId('continuous-voice-recorder')).toHaveAttribute('data-listening', 'false');
    expect(screen.getByTestId('voice-recorder-alert')).toBeInTheDocument();
    expect(screen.getByTestId('finalized-transcript-text')).toHaveTextContent('Earlier sentence.');

    // Unsupported browser test
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    renderSanctuary();
    const startButtons = screen.getAllByTestId('sanctuary-mic-button');
    await act(async () => {
      fireEvent.click(startButtons[startButtons.length - 1]);
    });
    const unsupportedRecorders = screen.getAllByTestId('continuous-voice-recorder');
    const latestRecorder = unsupportedRecorders[unsupportedRecorders.length - 1];
    expect(latestRecorder).toHaveAttribute('data-recorder-status', 'unsupported');
    expect(latestRecorder).toHaveAttribute('data-listening', 'false');
  });

  it('handles language switches safely, cancels TTS on mic start, and avoids Enter/Space interference', async () => {
    const { MockSpeechRecognition, instances } = createSpeechRecognitionHarness();
    const { MockUtterance, synthMock } = createSpeechSynthesisHarness();
    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).speechSynthesis = synthMock;
    (globalThis as any).SpeechSynthesisUtterance = MockUtterance;

    const cancelSpy = vi.spyOn(SpeechService, 'cancelSpeech');
    const processSpy = vi.spyOn(ConversationEngine, 'process');

    renderSanctuary();

    // TTS must be cancelled when starting recording
    await act(async () => {
      fireEvent.click(screen.getByTestId('sanctuary-mic-button'));
    });
    expect(cancelSpy).toHaveBeenCalled();
    expect(instances[0].lang).toBe('en-IN');

    // Typing Enter in the text input while actively recording must NOT prematurely submit typed message
    const textInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(textInput, { target: { value: 'Draft note' } });
      fireEvent.keyDown(textInput, { key: 'Enter', code: 'Enter' });
      fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    });
    expect(processSpy).not.toHaveBeenCalled();

    // Speak words in English, then switch language to Hindi -> aborts old recognizer and pauses safely keeping text
    await act(async () => {
      instances[0].onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'First part' } }],
      });
      fireEvent.click(screen.getByTestId('switch-hi'));
    });

    expect(instances[0].abort).toHaveBeenCalled();
    expect(screen.getByTestId('continuous-voice-recorder')).toHaveAttribute(
      'data-recorder-status',
      'paused'
    );
    expect(screen.getByTestId('finalized-transcript-text')).toHaveTextContent('First part');
    // Localized Hindi Pause/Resume button should now appear
    expect(screen.getByTestId('voice-resume-btn')).toHaveTextContent('फिर शुरू करें');

    // Resuming opens new session strictly in hi-IN
    await act(async () => {
      fireEvent.click(screen.getByTestId('voice-resume-btn'));
    });
    expect(instances[1].lang).toBe('hi-IN');

    // Switching to Tamil translates controls cleanly and resumes with ta-IN
    await act(async () => {
      fireEvent.click(screen.getByTestId('switch-ta'));
    });
    expect(screen.getByTestId('voice-resume-btn')).toHaveTextContent('தொடர்');
    await act(async () => {
      fireEvent.click(screen.getByTestId('voice-resume-btn'));
    });
    expect(instances[2].lang).toBe('ta-IN');
  });
});

describe('Live Temporal Awareness, Gemini Context Injection & Clinical Safety Invariants', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    getGenerativeModelMock.mockClear();
    generateContentMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  it('classifies morning, afternoon, evening, and night periods accurately across boundary times and timezones', () => {
    expect(classifyTimeOfDay(4)).toBe('night');
    expect(classifyTimeOfDay(5)).toBe('morning');
    expect(classifyTimeOfDay(11)).toBe('morning');
    expect(classifyTimeOfDay(12)).toBe('afternoon');
    expect(classifyTimeOfDay(16)).toBe('afternoon');
    expect(classifyTimeOfDay(17)).toBe('evening');
    expect(classifyTimeOfDay(20)).toBe('evening');
    expect(classifyTimeOfDay(21)).toBe('night');
    expect(classifyTimeOfDay(0)).toBe('night');

    const instant = new Date('2026-11-27T15:00:00Z'); // 8:30 PM IST (evening) vs 10:00 AM EST (morning)
    expect(getLiveTemporalContext('en', instant, 'Asia/Kolkata').timeOfDay).toBe('evening');
    expect(getLiveTemporalContext('en', instant, 'America/New_York').timeOfDay).toBe('morning');
  });

  it('generates accurate localized greetings and date/time answers across all 7 languages and orients mismatched greetings', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-27T18:30:00+05:30'));

    const languages = ['en', 'hi', 'mr', 'bn', 'ta', 'te', 'kn'] as const;
    for (const lang of languages) {
      const ctx = getLiveTemporalContext(lang);
      const greetingReply = await ConversationEngine.process('hello', undefined, lang);
      expect(greetingReply.speech).toContain(ctx.appropriateGreeting);

      const dateReply = await ConversationEngine.process('what day is today', undefined, lang);
      expect(dateReply.speech).toContain(ctx.currentDate);
    }

    vi.setSystemTime(new Date('2026-11-27T22:45:00+05:30'));
    const istNight = getLiveTemporalContext('en', new Date('2026-11-27T22:45:00+05:30'), 'Asia/Kolkata');
    expect(detectGreetingTimeMismatch('Good morning', istNight)?.mismatch).toBe(true);
    const clarified = formatTimeOfDayClarification('morning', istNight);
    expect(clarified.toLowerCase()).toContain('night');
    expect(clarified.toLowerCase()).not.toContain('good morning');
  });

  it('updates runtime clock dynamically across midnight transitions and injects live temporal context on every Gemini request', async () => {
    vi.useFakeTimers();
    vi.spyOn(FirebaseAILogicService, 'getStatus').mockReturnValue({
      sdkReady: true,
      isProductionHost: false,
      appCheckReady: true,
      canDispatchCloudGemini: true,
      modelName: 'gemini-3.5-flash-lite',
      blockedReason: null,
      statusMessage: 'Mock configured',
    });

    vi.setSystemTime(new Date(2026, 10, 27, 23, 55, 0));
    const snapNight = getLiveTemporalContext('en');
    const scoped1 = ConversationalAIService.buildPurposeScopedContext('What time is it?', undefined, 'en', 'p1');
    await FirebaseAILogicService.generateChatResponse('What time is it?', 'en', scoped1);
    const instr1 = getGenerativeModelMock.mock.calls[0][1].systemInstruction as string;
    expect(instr1).toContain(snapNight.currentTime);
    expect(instr1).toContain('night');

    // Advance past midnight
    vi.setSystemTime(new Date(2026, 10, 28, 9, 15, 0));
    const snapMorning = getLiveTemporalContext('en');
    const scoped2 = ConversationalAIService.buildPurposeScopedContext('Hello', undefined, 'en', 'p1');
    await FirebaseAILogicService.generateChatResponse('Hello', 'en', scoped2);
    const instr2 = getGenerativeModelMock.mock.calls[1][1].systemInstruction as string;
    expect(instr2).toContain(snapMorning.currentDate);
    expect(instr2).toContain('morning');
    expect(instr2).not.toContain('Current Time of Day Period: night');

    // Also verify REST callGeminiAPI injects live block
    vi.spyOn(ConversationalAIService, 'getApiKey').mockReturnValue('test-runtime-key');
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ speech: 'Good morning!', expression: 'happy', intent: 'GENERAL_HELP', confidence: 0.95, actionClass: 'class1_read' }) }] } }],
      }),
    });
    globalThis.fetch = fetchSpy as any;

    await ConversationalAIService.callGeminiAPI('Good morning', 'en');
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.systemInstruction.parts[0].text).toContain(formatTemporalPromptBlock(snapMorning).split('\n')[0]);
  });

  it('preserves Asha clinical safety guards (double-dose prevention & emergency 112 escalation) alongside continuous mode', async () => {
    const emergencyRes = await ConversationEngine.process('Help, I fell down and need emergency help', undefined, 'en');
    expect(emergencyRes.isEmergency || emergencyRes.actionClass === 'emergency').toBeTruthy();

    const safetyProposal = await ConversationalAIService.generateConversationalResponse(
      'Should I take another pill right now?',
      undefined,
      'en'
    );
    expect(safetyProposal.speech.toLowerCase()).toMatch(/caregiver|doctor|dose|medication|schedule/);
  });
});

describe('Multilingual Voice Recognition (All 7 Languages + Mixed-Language Audio Mode — Mocked Browser APIs)', () => {
  const originalMediaRecorder = (globalThis as any).MediaRecorder;
  const originalMediaDevices = (navigator as any).mediaDevices;
  const originalSpeechRecognition = (window as any).SpeechRecognition;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    FirebaseAILogicService.resetRuntimeStateForTesting();
    getAIMock.mockReturnValue({ __mockAI: true });
    getGenerativeModelMock.mockClear();
    getGenerativeModelMock.mockReturnValue({ generateContent: generateContentMock });
    generateContentMock.mockClear();
    generateContentMock.mockResolvedValue({
      response: {
        text: () => 'Namaste! I am right here with you.',
      },
    });
  });

  afterEach(() => {
    SpeechService.abortListening();
    (globalThis as any).MediaRecorder = originalMediaRecorder;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    });
    if (originalSpeechRecognition) {
      (window as any).SpeechRecognition = originalSpeechRecognition;
    } else {
      delete (window as any).SpeechRecognition;
    }
  });

  it('binds exact BCP-47 locale on SpeechRecognition across all 7 languages and preserves Indic transcripts without English overwrite', async () => {
    const { MockSpeechRecognition, instances } = createSpeechRecognitionHarness();
    (window as any).SpeechRecognition = MockSpeechRecognition;

    const processSpy = vi.spyOn(ConversationEngine, 'process');
    renderSanctuary();

    const languageCases = [
      { code: 'en', bcp47: 'en-IN', sample: 'What time is my walk today' },
      { code: 'hi', bcp47: 'hi-IN', sample: 'मुझे आज मेरी दवाई याद दिलाओ' },
      { code: 'mr', bcp47: 'mr-IN', sample: 'मला आजच्या कामाची यादी दाखवा' },
      { code: 'bn', bcp47: 'bn-IN', sample: 'আমার পরিবারের ছবি দেখাও' },
      { code: 'ta', bcp47: 'ta-IN', sample: 'இன்றைய நேரம் என்ன' },
      { code: 'te', bcp47: 'te-IN', sample: 'నా మందుల సమయం ఎప్పుడు' },
      { code: 'kn', bcp47: 'kn-IN', sample: 'ನನ್ನ ಕುಟುಂಬದ ಫೋಟೋ ತೋರಿಸಿ' },
    ] as const;

    for (let idx = 0; idx < languageCases.length; idx++) {
      const { code, bcp47, sample } = languageCases[idx];

      await act(async () => {
        fireEvent.click(screen.getByTestId(`switch-${code}`));
      });

      const micBtn = screen.getByTestId('sanctuary-mic-button');
      expect(micBtn).toHaveAttribute('data-recognition-lang', bcp47);

      await act(async () => {
        fireEvent.click(micBtn);
      });

      const activeInstance = instances[idx];
      expect(activeInstance.lang).toBe(bcp47);
      expect(SpeechService.getActiveRecognitionLang()).toBe(bcp47);

      await act(async () => {
        activeInstance.onresult?.({
          resultIndex: 0,
          results: [{ isFinal: true, 0: { transcript: sample } }],
        });
      });

      expect(screen.getByTestId('finalized-transcript-text')).toHaveTextContent(sample);

      await act(async () => {
        fireEvent.click(screen.getByTestId('voice-stop-send-btn'));
      });

      expect(processSpy).toHaveBeenLastCalledWith(
        sample,
        expect.anything(),
        code,
        expect.anything(),
        code
      );
    }

    expect(SpeechService.getActiveRecognitionLang()).toBeNull();
  });

  it('preserves explicit pre-login guest language selection across login transition when user account has no override', () => {
    localStorage.setItem('saksham_lang_guest', 'mr');
    localStorage.setItem('saksham_has_selected_lang_guest', 'true');
    localStorage.setItem(
      'saksham_multilingual_prefs_guest',
      JSON.stringify({
        displayLanguage: 'mr',
        spokenInputLanguages: ['mr', 'en', 'hi'],
        responseLanguage: 'mr',
        readingPreference: 'both',
        autoDetectSpokenLanguage: true,
        allowCodeSwitching: true,
      })
    );

    // Emulate AuthContext signed-in user seed with NO per-user language saved yet
    const Probe: React.FC = () => {
      const { language, responseLanguage } = useLanguage();
      return (
        <div>
          <span data-testid="probe-lang">{language}</span>
          <span data-testid="probe-resp-lang">{responseLanguage}</span>
        </div>
      );
    };

    // Simulate pre-existing user key unset, reading directly from LanguageProvider guest fallback logic
    const userStorageKey = 'saksham_lang_user_demo-uid-1';
    expect(localStorage.getItem(userStorageKey)).toBeNull();

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );

    expect(screen.getByTestId('probe-lang')).toHaveTextContent('mr');
    expect(screen.getByTestId('probe-resp-lang')).toHaveTextContent('mr');
  });

  it('transcribes mixed-language audio verbatim via FirebaseAILogicService.transcribeMultilingualAudio and normalizes codec MIME types', async () => {
    vi.spyOn(FirebaseAILogicService, 'getStatus').mockReturnValue({
      sdkReady: true,
      isProductionHost: true,
      appCheckReady: true,
      canDispatchCloudGemini: true,
      modelName: 'gemini-3.5-flash-lite',
      blockedReason: null,
      statusMessage: 'Ready',
    });

    generateContentMock.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            transcript: 'मुझे doctor को call करना है today at 5 pm',
            detectedLanguages: ['hi', 'en'],
            isCodeSwitched: true,
          }),
      },
    });

    const tx = await FirebaseAILogicService.transcribeMultilingualAudio({
      base64AudioData: 'AQIDBA==',
      mimeType: 'audio/webm;codecs=opus',
      preferredLanguages: ['hi', 'en', 'mr'],
      activeLanguage: 'hi',
    });

    expect(tx).toMatchObject({ ok: true });
    expect(tx.transcript).toBe('मुझे doctor को call करना है today at 5 pm');
    expect(tx.isCodeSwitched).toBe(true);
    expect(tx.detectedLanguages).toEqual(['hi', 'en']);

    // Verify canonical MIME stripping (;codecs=opus -> audio/webm) and inlineData structure
    const sentParts = generateContentMock.mock.calls[0][0];
    expect(sentParts[1]).toEqual({
      inlineData: {
        mimeType: 'audio/webm',
        data: 'AQIDBA==',
      },
    });

    // Empty audio fails closed honestly
    const emptyRes = await FirebaseAILogicService.transcribeMultilingualAudio({
      base64AudioData: '',
      mimeType: 'audio/webm',
    });
    expect(emptyRes.ok).toBe(false);
    expect(emptyRes.blockedReason).toBe('EMPTY_AUDIO');

    // Oversized audio fails closed honestly
    const bigRes = await FirebaseAILogicService.transcribeMultilingualAudio({
      base64AudioData: 'A'.repeat(26_000_000),
      mimeType: 'audio/webm',
    });
    expect(bigRes.ok).toBe(false);
    expect(bigRes.blockedReason).toBe('AUDIO_TOO_LARGE');
  });

  it('supports Mixed Languages (AI) Mode B with Pause, Resume, Stop & Send and preserves audio retry/fallback on failure', async () => {
    const { MockMediaRecorder, recorders, getUserMediaMock, trackStopFn } = createMediaRecorderHarness();
    (globalThis as any).MediaRecorder = MockMediaRecorder;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: getUserMediaMock },
    });

    vi.spyOn(FirebaseAILogicService, 'getStatus').mockReturnValue({
      sdkReady: true,
      isProductionHost: false,
      appCheckReady: true,
      canDispatchCloudGemini: true,
      modelName: 'gemini-3.5-flash-lite',
      blockedReason: null,
      statusMessage: 'Ready',
    });

    const transcribeSpy = vi.spyOn(FirebaseAILogicService, 'transcribeMultilingualAudio').mockResolvedValueOnce({
      ok: false,
      modelUsed: 'gemini-3.5-flash-lite',
      latencyMs: 25,
      blockedReason: 'NETWORK_ERROR',
      errorMessage: 'Temporary network interruption during transcription.',
    }).mockResolvedValueOnce({
      ok: true,
      transcript: 'आशा, आज मेरा medicine कब लेना है please tell me',
      detectedLanguages: ['hi', 'en'],
      isCodeSwitched: true,
      modelUsed: 'gemini-3.5-flash-lite (Firebase AI Logic Audio)',
      latencyMs: 80,
    });

    const processSpy = vi.spyOn(ConversationEngine, 'process');

    renderSanctuary();

    // Switch UI language to Hindi and select Mode B (Mixed Languages AI)
    await act(async () => {
      fireEvent.click(screen.getByTestId('switch-hi'));
      fireEvent.click(screen.getByTestId('speech-mode-multilingual-btn'));
    });

    expect(screen.getByTestId('sanctuary-mic-button')).toHaveAttribute('data-speech-mode', 'multilingual');

    // Start recording in Mode B
    await act(async () => {
      fireEvent.click(screen.getByTestId('sanctuary-mic-button'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getUserMediaMock).toHaveBeenCalled();
    expect(recorders).toHaveLength(1);
    expect(recorders[0].state).toBe('recording');

    // Pause then Resume — preserves audio chunks
    await act(async () => {
      fireEvent.click(screen.getByTestId('voice-pause-btn'));
    });
    expect(recorders[0].pause).toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByTestId('voice-resume-btn'));
    });
    expect(recorders[0].resume).toHaveBeenCalled();

    // First Stop & Send fails transcription -> preserves audio chunks, offers retry & Selected Language fallback
    await act(async () => {
      fireEvent.click(screen.getByTestId('voice-stop-send-btn'));
    });
    await waitFor(() => {
      expect(trackStopFn).toHaveBeenCalled();
      expect(transcribeSpy).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId('continuous-voice-recorder')).toHaveAttribute('data-recorder-status', 'error');
    expect(screen.getByTestId('voice-fallback-selected-btn')).toBeInTheDocument();

    // Second Stop & Send retries transcription cleanly with preserved chunks and submits mixed transcript once
    await act(async () => {
      fireEvent.click(screen.getByTestId('voice-stop-send-btn'));
    });
    await waitFor(() => {
      expect(transcribeSpy).toHaveBeenCalledTimes(2);
      expect(processSpy).toHaveBeenLastCalledWith(
        'आशा, आज मेरा medicine कब लेना है please tell me',
        expect.anything(),
        'hi',
        expect.anything(),
        'hi'
      );
    });
  });

  it('includes mixed-language guidance in Gemini systemInstruction and avoids false language-switch resets on mixed sentences', async () => {
    vi.spyOn(FirebaseAILogicService, 'getStatus').mockReturnValue({
      sdkReady: true,
      isProductionHost: false,
      appCheckReady: true,
      canDispatchCloudGemini: true,
      modelName: 'gemini-3.5-flash-lite',
      blockedReason: null,
      statusMessage: 'Ready',
    });

    const chatRes = await FirebaseAILogicService.generateChatResponse('मेरे medicine और morning walk का समय बताओ', 'hi');
    expect(chatRes.ok).toBe(true);
    const instr = getGenerativeModelMock.mock.calls[0][1].systemInstruction as string;
    expect(instr).toContain('Hindi');
    expect(instr).toContain('MIXED-LANGUAGE UNDERSTANDING');

    // Mixed sentence mentioning Hindi without asking to switch language must NOT hijack language state
    const mixedRes = await ConversationalAIService.generateConversationalResponse(
      'Please tell me where my Hindi book is',
      undefined,
      'mr'
    );
    expect((mixedRes as any).conversationalLanguageSwitchedTo).toBeUndefined();

    // Explicit Bengali switch works cleanly
    const bnSwitch = (ConversationalAIService as any).detectLanguageSwitch('Please speak in Bengali');
    expect(bnSwitch).toBe('bn');
  });
});
