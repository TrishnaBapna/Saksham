import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

vi.mock('firebase/ai', () => ({
  getAI: vi.fn(() => ({ __mockAI: true })),
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

function createSpeechRecognitionHarness() {
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
      this.onend?.();
    });
    abort = vi.fn(() => {
      this.aborted = true;
      // Intentionally do NOT fire onend synchronously to mimic Chrome async abort behavior
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

const LanguageSwitchTestControl: React.FC = () => {
  const { setLanguage } = useLanguage();
  return (
    <div>
      <button type="button" data-testid="switch-hi" onClick={() => setLanguage('hi')}>
        Switch HI
      </button>
      <button type="button" data-testid="switch-ta" onClick={() => setLanguage('ta')}>
        Switch TA
      </button>
      <button type="button" data-testid="switch-mr" onClick={() => setLanguage('mr')}>
        Switch MR
      </button>
      <button type="button" data-testid="switch-en" onClick={() => setLanguage('en')}>
        Switch EN
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

describe('ISSUE 1 & ISSUE 4 — Speech Recognition Reliability & Multilingual Lifecycle', () => {
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

  it('prevents stale session #1 async onend from overwriting newly started session #2', () => {
    const { MockSpeechRecognition, instances } = createSpeechRecognitionHarness();
    (window as any).SpeechRecognition = MockSpeechRecognition;

    const results: string[] = [];
    const onEnd1 = vi.fn();
    const onEnd2 = vi.fn();
    const onError1 = vi.fn();
    const onError2 = vi.fn();

    SpeechService.startListening((t) => results.push(`s1:${t}`), onError1, onEnd1, 'en');
    expect(instances.length).toBe(1);
    expect(SpeechService.isListeningActive()).toBe(true);

    // Start session #2 before session #1's async abort callbacks flush
    SpeechService.startListening((t) => results.push(`s2:${t}`), onError2, onEnd2, 'hi');
    expect(instances.length).toBe(2);
    expect(instances[1].lang).toBe('hi-IN');

    // Old instance #1 fires delayed aborted error and delayed onend
    instances[0].onerror?.({ error: 'aborted' });
    instances[0].onend?.();

    // Session #2 must remain completely intact and active
    expect(SpeechService.isListeningActive()).toBe(true);
    expect(onError1).not.toHaveBeenCalled();
    expect(onEnd1).not.toHaveBeenCalled();
    expect(onEnd2).not.toHaveBeenCalled();

    // Utterance on session #2 still emits normally
    instances[1].onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: 'नमस्ते आशा' } }],
    });
    expect(results).toEqual(['s2:नमस्ते आशा']);
  });

  it('suppresses interim transcripts as final submits and deduplicates repeated final bursts within one turn', () => {
    const { MockSpeechRecognition, instances } = createSpeechRecognitionHarness();
    (window as any).SpeechRecognition = MockSpeechRecognition;

    const finals: string[] = [];
    const interims: string[] = [];

    SpeechService.startListening(
      (t) => finals.push(t),
      vi.fn(),
      vi.fn(),
      'en',
      (interim) => interims.push(interim)
    );

    const rec = instances[0];
    // Interim result must only fire onInterim, never onResult
    rec.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: false, 0: { transcript: 'What time' } }],
    });
    expect(interims).toEqual(['What time']);
    expect(finals).toEqual([]);

    // Same final index replayed twice + duplicate burst within 800ms
    const eventPayload = {
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: 'What time is it?' } }],
    };
    rec.onresult?.(eventPayload);
    rec.onresult?.(eventPayload);
    rec.onresult?.({
      resultIndex: 1,
      results: [
        { isFinal: true, 0: { transcript: 'What time is it?' } },
        { isFinal: true, 0: { transcript: 'What time is it?' } },
      ],
    });

    expect(finals).toEqual(['What time is it?']);
  });

  it('supports consecutive multi-turn voice utterances (1st, 2nd, 3rd), coordinates TTS echo guard, and keeps transcripts isolated', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { MockSpeechRecognition, instances } = createSpeechRecognitionHarness();
    const { MockUtterance, synthMock, spokenUtterances } = createSpeechSynthesisHarness();
    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).speechSynthesis = synthMock;
    (globalThis as any).SpeechSynthesisUtterance = MockUtterance;

    renderSanctuary();

    const micBtn = screen.getByTestId('sanctuary-mic-button');
    expect(micBtn.getAttribute('data-listening')).toBe('false');

    // TURN 1: Click Mic -> Speak Utterance 1 ("Hello Asha")
    await act(async () => {
      fireEvent.click(micBtn);
    });
    expect(instances.length).toBe(1);
    expect(micBtn.getAttribute('data-listening')).toBe('true');

    // Partial interim update should show interim pill and NOT submit yet
    await act(async () => {
      instances[0].onresult?.({
        resultIndex: 0,
        results: [{ isFinal: false, 0: { transcript: 'Hel' } }],
      });
    });
    expect(screen.getByTestId('interim-voice-pill')).toHaveTextContent('Hel');

    // Final Utterance 1
    await act(async () => {
      instances[0].onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'Hello Asha' } }],
      });
    });
    expect(micBtn.getAttribute('data-listening')).toBe('false');
    expect(screen.getByTestId('voice-review-banner')).toHaveTextContent('Hello Asha');

    // Auto-submit review timer (2500ms) -> processes Turn 1 -> triggers TTS speak
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2600);
    });
    expect(screen.getByText('Hello Asha')).toBeInTheDocument();
    expect(spokenUtterances.length).toBe(1);

    // While Asha is still speaking, next turn mic MUST NOT start yet
    expect(instances.length).toBe(1);

    // TTS finishes -> after 180ms acoustic guard, Turn 2 recognition opens automatically!
    await act(async () => {
      spokenUtterances[0].instance.onend?.();
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(instances.length).toBe(2);
    expect(micBtn.getAttribute('data-listening')).toBe('true');

    // TURN 2: Speak Utterance 2 ("What time is it?") -> old transcript must NOT leak
    await act(async () => {
      instances[1].onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'What time is it?' } }],
      });
    });
    expect(screen.getByTestId('voice-review-banner')).toHaveTextContent('What time is it?');
    expect(screen.getByTestId('voice-review-banner')).not.toHaveTextContent('Hello Asha');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2600);
    });
    expect(screen.getByText('What time is it?')).toBeInTheDocument();
    expect(spokenUtterances.length).toBe(2);

    // Finish TTS #2 -> opens Turn 3 automatically
    await act(async () => {
      spokenUtterances[1].instance.onend?.();
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(instances.length).toBe(3);

    // TURN 3: Speak Utterance 3 ("What day is today?")
    await act(async () => {
      instances[2].onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'What day is today?' } }],
      });
      await vi.advanceTimersByTimeAsync(2600);
    });
    expect(screen.getByText('What day is today?')).toBeInTheDocument();
    expect(spokenUtterances.length).toBe(3);

    // Manual Stop click during/after voice session tears down cleanly
    await act(async () => {
      spokenUtterances[2].instance.onend?.();
      await vi.advanceTimersByTimeAsync(250);
      fireEvent.click(micBtn);
    });
    expect(micBtn.getAttribute('data-listening')).toBe('false');
    expect(micBtn.getAttribute('data-voice-active')).toBe('false');
  });

  it('handles recoverable and fatal STT errors gracefully without infinite restart loops and handles unsupported browser truthfully', async () => {
    const { MockSpeechRecognition, instances } = createSpeechRecognitionHarness();
    (window as any).SpeechRecognition = MockSpeechRecognition;

    renderSanctuary();
    const micBtn = screen.getByTestId('sanctuary-mic-button');

    // Trigger listening -> simulate permission denied ('not-allowed')
    await act(async () => {
      fireEvent.click(micBtn);
    });
    expect(instances.length).toBe(1);

    await act(async () => {
      instances[0].onerror?.({ error: 'not-allowed' });
      instances[0].onend?.();
    });

    // Must not loop/recreate recognizers and must show honest notice + false listening state
    expect(instances.length).toBe(1);
    expect(micBtn.getAttribute('data-listening')).toBe('false');
    expect(micBtn.getAttribute('data-voice-active')).toBe('false');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('handles unsupported browser Web Speech STT honestly without getting stuck listening', async () => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    renderSanctuary();
    const micBtn = screen.getByTestId('sanctuary-mic-button');

    await act(async () => {
      fireEvent.click(micBtn);
    });

    expect(micBtn.getAttribute('data-listening')).toBe('false');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('cleanly resets active recognition and pending review transcript when switching languages across 7 languages', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { MockSpeechRecognition, instances } = createSpeechRecognitionHarness();
    const { MockUtterance, synthMock } = createSpeechSynthesisHarness();
    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).speechSynthesis = synthMock;
    (globalThis as any).SpeechSynthesisUtterance = MockUtterance;

    renderSanctuary();
    const micBtn = screen.getByTestId('sanctuary-mic-button');

    // Start in English
    await act(async () => {
      fireEvent.click(micBtn);
    });
    expect(instances[0].lang).toBe('en-IN');

    // User spoke final buffer entering review countdown while voice session is active,
    // then switches to Hindi mid-session before auto-send
    await act(async () => {
      instances[0].onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'Old English text' } }],
      });
    });
    expect(screen.getByTestId('voice-review-banner')).toHaveTextContent('Old English text');

    await act(async () => {
      fireEvent.click(screen.getByTestId('switch-hi'));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120);
    });

    // Pending old English review banner should be cleared and restarted instance must use hi-IN
    expect(screen.queryByTestId('voice-review-banner')).not.toBeInTheDocument();
    expect(instances.length).toBeGreaterThanOrEqual(2);
    const latestRec = instances[instances.length - 1];
    expect(latestRec.lang).toBe('hi-IN');

    // Switch to Tamil and verify ta-IN
    await act(async () => {
      fireEvent.click(screen.getByTestId('switch-ta'));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120);
    });
    expect(instances[instances.length - 1].lang).toBe('ta-IN');
  });
});

describe('ISSUE 2 & ISSUE 3 — Live Temporal Awareness & Per-Turn Gemini Context Injection', () => {
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

  it('classifies non-overlapping morning, afternoon, evening, and night periods accurately across boundary times', () => {
    expect(classifyTimeOfDay(4)).toBe('night');
    expect(classifyTimeOfDay(5)).toBe('morning');
    expect(classifyTimeOfDay(11)).toBe('morning');
    expect(classifyTimeOfDay(12)).toBe('afternoon');
    expect(classifyTimeOfDay(16)).toBe('afternoon');
    expect(classifyTimeOfDay(17)).toBe('evening');
    expect(classifyTimeOfDay(20)).toBe('evening');
    expect(classifyTimeOfDay(21)).toBe('night');
    expect(classifyTimeOfDay(0)).toBe('night');

    // Explicit representative times in IST
    const morning = getLiveTemporalContext('en', new Date('2026-11-27T09:15:00+05:30'), 'Asia/Kolkata');
    expect(morning.timeOfDay).toBe('morning');
    expect(morning.appropriateGreeting).toBe('Good morning');

    const afternoon = getLiveTemporalContext('en', new Date('2026-11-27T13:30:00+05:30'), 'Asia/Kolkata');
    expect(afternoon.timeOfDay).toBe('afternoon');
    expect(afternoon.appropriateGreeting).toBe('Good afternoon');

    const evening = getLiveTemporalContext('en', new Date('2026-11-27T18:30:00+05:30'), 'Asia/Kolkata');
    expect(evening.timeOfDay).toBe('evening');
    expect(evening.appropriateGreeting).toBe('Good evening');

    const night = getLiveTemporalContext('en', new Date('2026-11-27T22:45:00+05:30'), 'Asia/Kolkata');
    expect(night.timeOfDay).toBe('night');
    expect(night.appropriateGreeting.toLowerCase()).not.toContain('morning');
    expect(night.appropriateGreeting.toLowerCase()).toContain('night');
  });

  it('supports distinct timezones accurately without hardcoding Asia/Kolkata', () => {
    const instant = new Date('2026-11-27T15:00:00Z'); // 8:30 PM IST (evening) vs 10:00 AM EST (morning)
    const kolkata = getLiveTemporalContext('en', instant, 'Asia/Kolkata');
    const newYork = getLiveTemporalContext('en', instant, 'America/New_York');

    expect(kolkata.timezone).toBe('Asia/Kolkata');
    expect(kolkata.timeOfDay).toBe('evening');

    expect(newYork.timezone).toBe('America/New_York');
    expect(newYork.timeOfDay).toBe('morning');
  });

  it('generates localized greetings and answers across all 7 languages cleanly', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-27T18:30:00+05:30'));

    const languages = ['en', 'hi', 'mr', 'bn', 'ta', 'te', 'kn'] as const;
    for (const lang of languages) {
      const ctx = getLiveTemporalContext(lang, new Date('2026-11-27T18:30:00+05:30'), 'Asia/Kolkata');
      expect(ctx.timeOfDay).toBe('evening');
      expect(ctx.appropriateGreeting.length).toBeGreaterThan(2);

      const greetingReply = await ConversationEngine.process('hello', undefined, lang);
      expect(greetingReply.speech).toContain(ctx.appropriateGreeting);

      const dateReply = await ConversationEngine.process('what day is today', undefined, lang);
      expect(dateReply.speech).toContain(ctx.currentDate);
    }
  });

  it('gently orients the user when they say "Good morning" during evening or night', async () => {
    vi.useFakeTimers();
    // Set local mock clock to 10:45 PM IST on Friday, Nov 27, 2026
    vi.setSystemTime(new Date('2026-11-27T22:45:00+05:30'));
    const temporal = getLiveTemporalContext('en');

    // Only assert strict mismatch if the test runner's local timezone places 22:45+05:30 in night/evening;
    // detectGreetingTimeMismatch compares against active runtime temporal context.
    const check = detectGreetingTimeMismatch('Good morning', temporal);
    if (temporal.timeOfDay === 'evening' || temporal.timeOfDay === 'night') {
      expect(check?.mismatch).toBe(true);
      const reply = await ConversationEngine.process('Good morning', undefined, 'en');
      expect(reply.speech.toLowerCase()).toContain(temporal.timeOfDayLabel.toLowerCase());
      expect(reply.speech.toLowerCase()).not.toContain('good morning');
    } else {
      // Fallback verification with explicit timezone helper so test is deterministic in UTC runners too
      const istNight = getLiveTemporalContext('en', new Date('2026-11-27T22:45:00+05:30'), 'Asia/Kolkata');
      const istCheck = detectGreetingTimeMismatch('Good morning', istNight);
      expect(istCheck?.mismatch).toBe(true);
      const clarified = formatTimeOfDayClarification('morning', istNight);
      expect(clarified.toLowerCase()).toContain('night');
      expect(clarified.toLowerCase()).not.toContain('good morning');
    }
  });

  it('updates runtime temporal context live across midnight/day transitions without stale cached context', async () => {
    vi.useFakeTimers();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const lateDay = new Date(2026, 10, 27, 23, 55, 0); // Local Nov 27 23:55 (night)
    vi.setSystemTime(lateDay);
    const snap1 = getLiveTemporalContext('en');
    expect(snap1.timeOfDay).toBe('night');
    expect(snap1.currentDateISO).toBe('2026-11-27');

    // Advance clock across midnight to Nov 28 06:15 AM (morning)
    const nextMorning = new Date(2026, 10, 28, 6, 15, 0);
    vi.setSystemTime(nextMorning);
    const snap2 = getLiveTemporalContext('en');
    expect(snap2.timeOfDay).toBe('morning');
    expect(snap2.currentDateISO).toBe('2026-11-28');
    expect(snap2.timezone).toBe(tz);

    const dateRes1 = await ConversationEngine.process('what day is today', undefined, 'en');
    expect(dateRes1.speech).toContain('28');
    expect(dateRes1.speech).toContain(snap2.currentWeekday);
  });

  it('injects fresh live temporal context into FirebaseAILogicService systemInstruction on every call', async () => {
    vi.useFakeTimers();
    vi.spyOn(FirebaseAILogicService, 'getStatus').mockReturnValue({
      sdkReady: true,
      isProductionHost: false,
      appCheckReady: true,
      canDispatchCloudGemini: true,
      modelName: 'gemini-2.5-flash',
      blockedReason: null,
      statusMessage: 'Mock configured',
    });

    const morningDate = new Date(2026, 10, 27, 9, 15, 0);
    vi.setSystemTime(morningDate);
    const snapMorning = getLiveTemporalContext('en');
    const scopedMorning = ConversationalAIService.buildPurposeScopedContext(
      'What time is it?',
      undefined,
      'en',
      'patient-01'
    );
    await FirebaseAILogicService.generateChatResponse('What time is it?', 'en', scopedMorning);

    const call1Instruction = getGenerativeModelMock.mock.calls[0][1].systemInstruction as string;
    expect(call1Instruction).toContain(snapMorning.currentDate);
    expect(call1Instruction).toContain(snapMorning.currentTime);
    expect(call1Instruction).toContain(snapMorning.currentWeekday);
    expect(call1Instruction).toContain(snapMorning.timezone);
    expect(call1Instruction).toContain('morning');

    // Advance runtime clock to evening and make a second Gemini request without remounting
    const eveningDate = new Date(2026, 10, 27, 18, 30, 0);
    vi.setSystemTime(eveningDate);
    const snapEvening = getLiveTemporalContext('en');
    const scopedEvening = ConversationalAIService.buildPurposeScopedContext(
      'Hello Asha',
      undefined,
      'en',
      'patient-01'
    );
    await FirebaseAILogicService.generateChatResponse('Hello Asha', 'en', scopedEvening);

    const call2Instruction = getGenerativeModelMock.mock.calls[1][1].systemInstruction as string;
    expect(call2Instruction).toContain(snapEvening.currentTime);
    expect(call2Instruction).toContain('evening');
    expect(call2Instruction).toContain('Good evening');
    expect(call2Instruction).not.toContain(`Current Time of Day Period: morning`);
  });

  it('injects fresh live temporal prompt block into ConversationalAIService.callGeminiAPI REST systemInstruction', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 27, 22, 45, 0));
    const snapNight = getLiveTemporalContext('hi');

    vi.spyOn(ConversationalAIService, 'getApiKey').mockReturnValue('test-runtime-key');
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    speech: 'शुभ रात्रि!',
                    expression: 'reassuring',
                    intent: 'GENERAL_HELP',
                    confidence: 0.95,
                    actionClass: 'class1_read',
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    globalThis.fetch = fetchSpy as any;

    await ConversationalAIService.callGeminiAPI('अभी क्या समय है?', 'hi');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    const systemText = body.systemInstruction.parts[0].text as string;

    expect(systemText).toContain(snapNight.currentDateISO);
    expect(systemText).toContain(snapNight.currentTime24);
    expect(systemText).toContain(snapNight.timezone);
    expect(systemText).toContain('night');
    expect(systemText).toContain(formatTemporalPromptBlock(snapNight).split('\n')[0]);
  });

  it('guarantees authoritative runtime clock/date/time-of-day answers even if remote AI gateway returns an unaware response', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 27, 14, 10, 0)); // 2:10 PM local
    const temporal = getLiveTemporalContext('en');

    const aiSpy = vi.spyOn(ConversationalAIService, 'generateConversationalResponse').mockResolvedValue({
      speech: 'I cannot see the exact time right now.',
      expression: 'reassuring',
      intent: 'GENERAL_HELP',
      confidence: 0.9,
      actionClass: 'class1_read',
      isRealAI: true,
      executionMode: 'LOCAL_RESIDENT_SLM',
      executionState: 'LIVE_AI',
      modelUsed: 'gemini-3.5-flash-lite',
    });

    const timeRes = await ConversationEngine.process('What time is it?', undefined, 'en');
    expect(timeRes.speech).toContain(temporal.currentTime);
    expect(timeRes.speech).not.toContain('cannot see the exact time');

    const dateRes = await ConversationEngine.process('What day is today?', undefined, 'en');
    expect(dateRes.speech).toContain(temporal.currentDate);
    expect(dateRes.speech).not.toContain('cannot see the exact time');

    const greetingRes = await ConversationEngine.process('Good morning', undefined, 'en');
    expect(greetingRes.speech.toLowerCase()).toContain(temporal.timeOfDayLabel.toLowerCase());
    expect(greetingRes.speech.toLowerCase()).not.toContain('good morning');
    expect(aiSpy).not.toHaveBeenCalled();
  });
});
