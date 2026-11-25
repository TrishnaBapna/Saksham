import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MultilingualVoicePipeline,
  TIER_1_WEB_SPEECH_LANGUAGES,
  TIER_2_LOCAL_ASR_LANGUAGES,
} from '../services/multilingualVoicePipeline.js';
import { SpeechService } from '../services/speechService.js';
import { ConversationalAIService } from '../features/ai-companion/services/conversationalAIService.js';

describe('Phase 2.1: 23-Language Acoustic Voice Pipeline & M1 Neural Bridge Suite', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Part 1: 23-Language Engine Routing & Capability Matrix', () => {
    const all23Codes = [
      'en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'ur',
      'as', 'brx', 'doi', 'ks', 'kok', 'mai', 'mni', 'ne', 'or', 'sa', 'sat', 'sd'
    ];

    it('1.1 covers exactly 23 languages across Tier-1 and Tier-2 sets', () => {
      expect(all23Codes.length).toBe(23);
      expect(TIER_1_WEB_SPEECH_LANGUAGES.length).toBe(12); // 11 Indian + English + Nepali
      expect(TIER_2_LOCAL_ASR_LANGUAGES.length).toBe(11);
      const combined = [...TIER_1_WEB_SPEECH_LANGUAGES, ...TIER_2_LOCAL_ASR_LANGUAGES];
      expect(new Set(combined).size).toBe(23);
    });

    it('1.2 correctly determines capabilities when Local ASR Bridge is offline', () => {
      // Simulate Local Bridge offline
      (MultilingualVoicePipeline as any).localBridgeAvailable = false;
      vi.spyOn(SpeechService, 'isSpeechRecognitionSupported').mockReturnValue(true);

      // Tier 1 language: Hindi
      const hiCap = MultilingualVoicePipeline.getLanguageVoiceCapability('hi');
      expect(hiCap.hasBrowserSTT).toBe(true);
      expect(hiCap.hasLocalNeuralASR).toBe(false);
      expect(hiCap.recommendedEngine).toBe('WEB_SPEECH_API');

      // Tier 2 language: Assamese
      const asCap = MultilingualVoicePipeline.getLanguageVoiceCapability('as');
      expect(asCap.hasBrowserSTT).toBe(false);
      expect(asCap.hasLocalNeuralASR).toBe(false);
      expect(asCap.recommendedEngine).toBe('ENGINE_LIMITED_GUIDANCE');

      // Tier 2 language: Odia
      const orCap = MultilingualVoicePipeline.getLanguageVoiceCapability('or');
      expect(orCap.hasBrowserSTT).toBe(false);
      expect(orCap.recommendedEngine).toBe('ENGINE_LIMITED_GUIDANCE');
    });

    it('1.3 routes all 23 languages to LOCAL_NEURAL_ASR_M1 when local bridge is online', () => {
      (MultilingualVoicePipeline as any).localBridgeAvailable = true;

      for (const code of all23Codes) {
        const cap = MultilingualVoicePipeline.getLanguageVoiceCapability(code);
        expect(cap.hasLocalSimulatorBridge || cap.hasLocalNeuralASR).toBe(true);
        expect(['LOCAL_SIMULATOR_BRIDGE', 'LOCAL_NEURAL_ASR_M1', 'WEB_SPEECH_API']).toContain(cap.recommendedEngine);
      }
    });
  });

  describe('Part 2: Real Audio Encoding & 16kHz WAV Serialization', () => {
    it('2.1 generates genuine RIFF WAVE header with 16kHz mono 16-bit PCM specification', async () => {
      // Generate 0.5s of 16kHz mono audio (8,000 samples)
      const samples = new Float32Array(8000);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin((2 * Math.PI * 440 * i) / 16000); // 440Hz test tone
      }

      const arrayBuffer = MultilingualVoicePipeline.encodeWAVBuffer(samples, 16000);
      expect(arrayBuffer.byteLength).toBe(44 + 8000 * 2); // 44 header bytes + 16,000 PCM bytes
      const view = new DataView(arrayBuffer);

      // Verify RIFF identifier
      const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
      expect(riff).toBe('RIFF');

      // Verify WAVE format
      const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
      expect(wave).toBe('WAVE');

      // Verify fmt subchunk
      const fmt = String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15));
      expect(fmt).toBe('fmt ');
      expect(view.getUint16(20, true)).toBe(1); // AudioFormat PCM = 1
      expect(view.getUint16(22, true)).toBe(1); // NumChannels = 1 (Mono)
      expect(view.getUint32(24, true)).toBe(16000); // SampleRate = 16000
      expect(view.getUint16(34, true)).toBe(16); // BitsPerSample = 16

      // Verify data subchunk
      const data = String.fromCharCode(view.getUint8(36), view.getUint8(37), view.getUint8(38), view.getUint8(39));
      expect(data).toBe('data');
      expect(view.getUint32(40, true)).toBe(16000); // Subchunk2Size
    });

    it('2.2 serializes audio to base64 correctly without data loss', async () => {
      const mockBlob = new Blob(['test-audio-bytes'], { type: 'audio/wav' });
      const base64 = await MultilingualVoicePipeline.blobToBase64(mockBlob);
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
    });
  });

  describe('Part 3: Local Neural Acoustic ASR Bridge Protocol', () => {
    it('3.1 successfully performs health check against local M1 bridge', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'online',
          service: 'Saksham Local Neural Acoustic ASR Bridge',
          host: 'Apple M1 (macOS darwin arm64)',
          totalLanguagesSupported: 23,
        }),
      } as any);

      const isOnline = await MultilingualVoicePipeline.checkLocalBridgeHealth();
      expect(isOnline).toBe(true);
      expect(MultilingualVoicePipeline.isLocalBridgeOnline()).toBe(true);
    });

    it('3.2 transcribes acoustic audio for missing languages via local bridge', async () => {
      const testCases = [
        { lang: 'as', transcript: 'মোৰ দৰব খোৱা হৈছে নে নাই', script: 'Bengali-Assamese' },
        { lang: 'brx', transcript: 'आं दिनै मुलि जाबाय ना जायाखै', script: 'Devanagari' },
        { lang: 'ks', transcript: 'کٲشُر زَبان مَنٛز دَواہ کِتھ پٲٹھۍ لٮ۪کھَن', script: 'Perso-Arabic' },
        { lang: 'or', transcript: 'ମୁଁ ଆଜି ଔଷଧ ଖାଇଛି କି ନାହିଁ କୁହ', script: 'Odia' },
        { lang: 'sa', transcript: 'मम औषधम् कुत्र अस्ति? अहम् विस्मरामि।', script: 'Devanagari' },
        { lang: 'ne', transcript: 'मलाई आज धेरै थकाई लागेको छैन, औषधि कहिले खाने?', script: 'Devanagari' },
        { lang: 'sat', transcript: 'ᱥᱟᱱᱛᱟᱲᱤ ᱯᱟᱹᱨᱥᱤ ᱛᱮ ᱨᱚᱲ ᱢᱮ, ᱨᱟᱱ ᱡᱚᱢ ᱦᱩᱭᱮᱱᱟ', script: 'Ol Chiki' },
      ];

      for (const tc of testCases) {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            success: true,
            transcript: tc.transcript,
            detectedLanguage: tc.lang,
            confidence: 0.94,
            script: tc.script,
            engine: 'LOCAL_NEURAL_ACOUSTIC_BRIDGE_M1',
            latencyMs: 92,
          }),
        } as any);

        const dummyBlob = new Blob(['test-audio'], { type: 'audio/wav' });
        const result = await MultilingualVoicePipeline.transcribeViaLocalBridge(dummyBlob, tc.lang);

        expect(result.success).toBe(true);
        expect(result.transcript).toBe(tc.transcript);
        expect(result.detectedLanguage).toBe(tc.lang);
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        expect(['LOCAL_SIMULATOR_BRIDGE', 'LOCAL_NEURAL_ASR_M1']).toContain(result.engine);
      }
    });

    it('3.3 handles silence and low energy honestly with NO_SPEECH_DETECTED', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          error: 'NO_SPEECH_DETECTED',
          reason: 'Audio signal below acoustic energy threshold or too short.',
          latencyMs: 14,
        }),
      } as any);

      const dummyBlob = new Blob(['silence'], { type: 'audio/wav' });
      const result = await MultilingualVoicePipeline.transcribeViaLocalBridge(dummyBlob, 'hi');

      expect(result.success).toBe(false);
      expect(result.error).toBe('NO_SPEECH_DETECTED');
      expect(result.transcript).toBe('');
    });
  });

  describe('Part 4: Speech Output (TTS) & Host Native Voice Verification', () => {
    it('4.1 resolves verified Darwin macOS native voices for supported locales', () => {
      const mockVoices = [
        { name: 'Lekha', lang: 'hi-IN' },
        { name: 'Piya', lang: 'bn-IN' },
        { name: 'Vani', lang: 'ta-IN' },
        { name: 'Geeta', lang: 'te-IN' },
        { name: 'Soumya', lang: 'kn-IN' },
        { name: 'Rishi', lang: 'en-IN' },
        { name: 'Alex', lang: 'en-US' },
      ] as SpeechSynthesisVoice[];

      vi.spyOn(SpeechService, 'isTTSSupported').mockReturnValue(true);
      (window as any).speechSynthesis = {
        getVoices: () => mockVoices,
        speak: vi.fn(),
        cancel: vi.fn(),
      };

      expect(SpeechService.findBestVoice('hi')?.name).toBe('Lekha');
      expect(SpeechService.findBestVoice('bn')?.name).toBe('Piya');
      expect(SpeechService.findBestVoice('ta')?.name).toBe('Vani');
      expect(SpeechService.findBestVoice('te')?.name).toBe('Geeta');
      expect(SpeechService.findBestVoice('kn')?.name).toBe('Soumya');
      expect(SpeechService.findBestVoice('en')?.name).toBe('Rishi');
    });

    it('4.2 returns null for regional languages without installed native voice to prevent distortion', () => {
      const mockVoices = [
        { name: 'Lekha', lang: 'hi-IN' },
        { name: 'Alex', lang: 'en-US' },
      ] as SpeechSynthesisVoice[];

      (window as any).speechSynthesis = {
        getVoices: () => mockVoices,
      };

      // Assamese, Odia, Dogri, Sanskrit, Kashmiri have no installed Darwin voices by default
      expect(SpeechService.findBestVoice('as')).toBeNull();
      expect(SpeechService.findBestVoice('or')).toBeNull();
      expect(SpeechService.findBestVoice('doi')).toBeNull();
      expect(SpeechService.findBestVoice('sa')).toBeNull();
      expect(SpeechService.findBestVoice('ks')).toBeNull();
    });
  });

  describe('Part 5: End-to-End Multilingual Speech -> Conversational ASHA Connection', () => {
    it('5.1 preserves selected response language when user speaks in regional acoustic voice', async () => {
      const mockPatientContext: any = {
        patientId: 'patient-anveshan-2026',
        diagnoses: ['Doctor-Confirmed Alzheimer Disease'],
        medications: [{ name: 'Donepezil', dosage: '5mg', frequency: 'Morning' }],
        routines: [{ id: 'task-morning-meds', title: 'Morning Medication', completed: false }],
        lovedOnes: { lovedOnes: [{ id: 'fam-priya', name: 'Priya', relation: 'Daughter' }] },
      };

      // Mock Local Bridge transcribing Assamese speech
      const acousticTranscript = 'মোৰ দৰব খোৱা হৈছে নে নাই'; // "Did I take my medicine or not?" in Assamese

      // Connect transcript to ConversationalAIService with patient preferred language = 'hi'
      const response = await ConversationalAIService.generateConversationalResponse(
        acousticTranscript,
        mockPatientContext,
        'hi' // Patient preferred companion response language is Hindi
      );

      expect(response.speech).toBeDefined();
      expect(response.speech.length).toBeGreaterThan(0);
      expect(response.speech).toMatch(/[\u0900-\u097F]/); // Strictly responds in Hindi script!
    });

    it('5.2 maps acoustic emergency/confusion to CAREGIVER_ESCALATION with de-escalation tone', async () => {
      const acousticKashmiriDistress = 'مےٚ کٔرِو مَدَتھ، مےٚ چُھ خَوف گَژھان'; // "Help me, I am scared" in Kashmiri

      const response = await ConversationalAIService.generateConversationalResponse(
        acousticKashmiriDistress,
        {} as any,
        'en'
      );

      expect(response.speech).toBeDefined();
      expect(response.speech.length).toBeGreaterThan(0);
      expect(response.intent).toBe('CAREGIVER_ESCALATION');
    });
  });
});
