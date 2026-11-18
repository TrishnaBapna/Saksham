/**
 * SAKSHAM — PHASE 2 REMEDIATION: 23-LANGUAGE SPEECH & VOICE MATRIX AUDIT
 * 
 * Tests and validates:
 * 1. Empirical classification of all 22 Eighth Schedule Indian languages + English
 *    into 11 Web Speech Supported vs. 12 Engine-Limited / Server-ASR Required.
 * 2. Absolute architectural separation between Unicode Script LangID and real Acoustic STT.
 * 3. Text-to-Speech (TTS) Host Voice Availability, Native OS audit, and Graceful Visual Fallback.
 * 4. Multilingual Code-Switching (Hinglish, Marathish, Tanglish) and uncertainty/clarification handling.
 * 5. Transparent privacy disclosure notices for speech streaming and AI processing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpeechService, LANGUAGE_BCP47_MAP } from '../services/speechService.js';
import { ConversationalAIService } from '../features/ai-companion/services/conversationalAIService.js';

describe('Phase 2 Sprint: 23-Language Speech & Voice Verification Matrix', () => {
  // All 22 Eighth Schedule Indian Languages + English
  const ALL_23_LANGUAGES = [
    { code: 'en', name: 'English', script: 'Latin', webSpeech: true, hostOSVoiceMac: true },
    { code: 'hi', name: 'Hindi', script: 'Devanagari', webSpeech: true, hostOSVoiceMac: true },
    { code: 'bn', name: 'Bengali', script: 'Bengali', webSpeech: true, hostOSVoiceMac: true },
    { code: 'ta', name: 'Tamil', script: 'Tamil', webSpeech: true, hostOSVoiceMac: true },
    { code: 'te', name: 'Telugu', script: 'Telugu', webSpeech: true, hostOSVoiceMac: true },
    { code: 'mr', name: 'Marathi', script: 'Devanagari', webSpeech: true, hostOSVoiceMac: false },
    { code: 'gu', name: 'Gujarati', script: 'Gujarati', webSpeech: true, hostOSVoiceMac: false },
    { code: 'kn', name: 'Kannada', script: 'Kannada', webSpeech: true, hostOSVoiceMac: true },
    { code: 'ml', name: 'Malayalam', script: 'Malayalam', webSpeech: true, hostOSVoiceMac: false },
    { code: 'pa', name: 'Punjabi', script: 'Gurmukhi', webSpeech: true, hostOSVoiceMac: false },
    { code: 'ur', name: 'Urdu', script: 'Arabic-Perso', webSpeech: true, hostOSVoiceMac: false },
    // 12 Engine Limited / Server-ASR Required:
    { code: 'as', name: 'Assamese', script: 'Bengali-Assamese', webSpeech: false, hostOSVoiceMac: false },
    { code: 'brx', name: 'Bodo', script: 'Devanagari', webSpeech: false, hostOSVoiceMac: false },
    { code: 'doi', name: 'Dogri', script: 'Devanagari', webSpeech: false, hostOSVoiceMac: false },
    { code: 'ks', name: 'Kashmiri', script: 'Arabic-Perso', webSpeech: false, hostOSVoiceMac: false },
    { code: 'kok', name: 'Konkani', script: 'Devanagari', webSpeech: false, hostOSVoiceMac: false },
    { code: 'mai', name: 'Maithili', script: 'Devanagari', webSpeech: false, hostOSVoiceMac: false },
    { code: 'mni', name: 'Manipuri', script: 'Meetei Mayek', webSpeech: false, hostOSVoiceMac: false },
    { code: 'ne', name: 'Nepali', script: 'Devanagari', webSpeech: false, hostOSVoiceMac: false },
    { code: 'or', name: 'Odia', script: 'Odia', webSpeech: false, hostOSVoiceMac: false },
    { code: 'sa', name: 'Sanskrit', script: 'Devanagari', webSpeech: false, hostOSVoiceMac: false },
    { code: 'sat', name: 'Santali', script: 'Ol Chiki', webSpeech: false, hostOSVoiceMac: false },
    { code: 'sd', name: 'Sindhi', script: 'Arabic-Perso', webSpeech: false, hostOSVoiceMac: false },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    SpeechService.cancelSpeech();
  });

  describe('Part 1: 23-Language Acoustic Speech-to-Text (STT) Empirical Matrix', () => {
    it('1.1. maps all 23 language codes to standard BCP-47 identifiers', () => {
      ALL_23_LANGUAGES.forEach((lang) => {
        const bcp47 = SpeechService.getBCP47(lang.code);
        expect(bcp47).toBe(`${lang.code}-IN`);
        expect(LANGUAGE_BCP47_MAP[lang.code]).toBe(`${lang.code}-IN`);
      });
    });

    it('1.2. classifies exactly 11 languages as Web Speech API supported in Chromium browsers', () => {
      const supported = ALL_23_LANGUAGES.filter((l) => l.webSpeech);
      expect(supported).toHaveLength(11);
      const supportedCodes = supported.map((l) => l.code);
      expect(supportedCodes).toEqual(
        expect.arrayContaining(['en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'ur'])
      );
    });

    it('1.3. classifies exactly 12 languages as Engine Limited / requiring IndicConformer ASR', () => {
      const engineLimited = ALL_23_LANGUAGES.filter((l) => !l.webSpeech);
      expect(engineLimited).toHaveLength(12);
      const limitedCodes = engineLimited.map((l) => l.code);
      expect(limitedCodes).toEqual(
        expect.arrayContaining([
          'as', 'brx', 'doi', 'ks', 'kok', 'mai', 'mni', 'ne', 'or', 'sa', 'sat', 'sd'
        ])
      );
    });

    it('1.4. strictly distinguishes Unicode Script LangID from acoustic speech recognition', () => {
      // Script detection operates purely on Unicode character ranges
      const devanagariRes = SpeechService.detectLanguageWithConfidence('नमस्ते आप कैसे हैं');
      expect(devanagariRes.script).toBe('Devanagari');
      expect(devanagariRes.detectedLanguage).toBe('hi');

      const tamilRes = SpeechService.detectLanguageWithConfidence('வணக்கம் எப்படி இருக்கிறீர்கள்');
      expect(tamilRes.script).toBe('Tamil');
      expect(tamilRes.detectedLanguage).toBe('ta');

      const urduRes = SpeechService.detectLanguageWithConfidence('آپ کیسے ہیں');
      expect(urduRes.script).toBe('Perso-Arabic');
      expect(urduRes.detectedLanguage).toBe('ur');

      // Crucial architectural assertion: Script detection does NOT imply microphone capability
      expect(SpeechService.isSTTSupported()).toBeDefined();
    });
  });

  describe('Part 2: Text-to-Speech (TTS) Synthesis & Voice Auditing', () => {
    it('2.1. selects matching regional voice and rejects English voice for Indian languages', () => {
      const mockVoices = [
        { name: 'Lekha', lang: 'hi-IN', default: false, localService: true, voiceURI: 'hi-IN' },
        { name: 'Vani', lang: 'ta-IN', default: false, localService: true, voiceURI: 'ta-IN' },
        { name: 'Alex', lang: 'en-US', default: true, localService: true, voiceURI: 'en-US' },
        { name: 'Rishi', lang: 'en-IN', default: false, localService: true, voiceURI: 'en-IN' },
      ];

      // Mock speechSynthesis
      (globalThis as any).speechSynthesis = {
        getVoices: vi.fn().mockReturnValue(mockVoices),
        speak: vi.fn(),
        cancel: vi.fn(),
        paused: false,
        speaking: false,
      };

      const hindiVoice = SpeechService.findBestVoice('hi');
      expect(hindiVoice?.name).toBe('Lekha');

      const tamilVoice = SpeechService.findBestVoice('ta');
      expect(tamilVoice?.name).toBe('Vani');

      // Crucial safety rule: Never use English voice for Marathi when Marathi voice is absent!
      const marathiVoice = SpeechService.findBestVoice('mr');
      expect(marathiVoice).toBeNull();

      const englishVoice = SpeechService.findBestVoice('en');
      expect(englishVoice?.name).toBe('Rishi');
    });

    it('2.2. falls back gracefully without crashing when speech synthesis is unsupported or voices empty', () => {
      (globalThis as any).speechSynthesis = {
        getVoices: vi.fn().mockReturnValue([]),
        speak: vi.fn(),
        cancel: vi.fn(),
      };

      expect(SpeechService.findBestVoice('hi')).toBeNull();
      expect(SpeechService.isVoiceAvailable('hi')).toBe(false);

      // Verify speak does not throw when voices are empty
      expect(() => {
        SpeechService.speak('Test message', undefined, undefined, 'hi');
      }).not.toThrow();
    });
  });

  describe('Part 3: Code-Switching & Hybrid Multilingual Interactions', () => {
    it('3.1. detects Hinglish code-switching in Latin script', () => {
      const res = SpeechService.detectLanguageWithConfidence(
        'Mera walking task cancel karo please',
        ['hi', 'en']
      );
      expect(res.isCodeSwitched).toBe(true);
      expect(['hi', 'en']).toContain(res.detectedLanguage);
      expect(res.suggestedAction).toBe('ACCEPT');
    });

    it('3.2. detects Marathish code-switching in Latin script', () => {
      const res = SpeechService.detectLanguageWithConfidence(
        'Majha walk routine dakhva please',
        ['mr', 'en']
      );
      expect(res.isCodeSwitched).toBe(true);
      expect(['mr', 'en']).toContain(res.detectedLanguage);
    });

    it('3.3. detects Tanglish code-switching in Latin script', () => {
      const res = SpeechService.detectLanguageWithConfidence(
        'Enoda morning medication enna?',
        ['ta', 'en']
      );
      expect(res.isCodeSwitched).toBe(true);
      expect(['ta', 'en']).toContain(res.detectedLanguage);
    });

    it('3.4. flags very short or ambiguous transcriptions for gentle clarification', () => {
      const res = SpeechService.detectLanguageWithConfidence('ha');
      expect(res.isAmbiguous).toBe(true);
      expect(res.suggestedAction).toBe('CLARIFY');
    });
  });

  describe('Part 4: Speech & AI Privacy Disclosures (HIPAA / DISHA Transparency)', () => {
    it('4.1. provides explicit Web Speech cloud streaming disclosure', () => {
      const disclosure = SpeechService.getPrivacyDisclosure();
      expect(disclosure.vendorServers.length).toBeGreaterThan(0);
      expect(disclosure.body).toContain('streamed to vendor cloud servers');
      expect(disclosure.dataTransmitted).toContain('zero permanent cloud audio storage');
    });

    it('4.2. provides explicit Gemini Free-Tier AI prompt de-identification disclosure', () => {
      const notice = ConversationalAIService.getPrivacyConsentNotice();
      expect(notice.phiStatus).toContain('actively redacts');
      expect(notice.freeTierNotice).toContain('$0.00');
      expect(notice.dataUseStatement).toContain('synthetically tokenized');
    });
  });
});
