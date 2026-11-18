import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConversationalAIService,
  CREDENTIAL_EXPOSURE_WARNING,
} from '../features/ai-companion/services/conversationalAIService.js';
import { SpeechService } from '../services/speechService.js';
import { MultilingualVoicePipeline } from '../services/multilingualVoicePipeline.js';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { IntentRegistry } from '../features/ai-companion/services/intentRegistry.js';
import { PatientContext } from '../services/patientContextService.js';

describe('SAKSHAM NEURO-CARE — PHASE 2.3 UNIVERSAL LISTENING, CODE-SWITCHING & DEMENTIA SPEECH SUITE', () => {
  beforeEach(() => {
    ConversationalAIService.clearApiKey();
    ConversationalAIService.setModel('gemini-3.5-flash-lite');
    ConversationEngine.clearTurnContext();
    (window as any).webkitSpeechRecognition = class MockSpeechRecognition {};
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. GEMINI 2026 ACTIVE MODEL SUITE & LIFECYCLE AUDIT
  // =========================================================================
  describe('1. Gemini 2026 Model Suite & Lifecycle Migration', () => {
    it('1.1. establishes gemini-3.5-flash-lite as the primary GA default model', () => {
      expect(ConversationalAIService.getModel()).toBe('gemini-3.5-flash-lite');
      const supported = ConversationalAIService.SUPPORTED_MODELS;
      expect(supported).toContain('gemini-3.5-flash-lite');
      expect(supported).toContain('gemini-3.8-flash');
      expect(supported).toContain('gemini-4-hydrogen');
    });

    it('1.2. automatically upgrades retired models (including gemini-2.0-flash) to gemini-3.5-flash-lite', () => {
      const retiredModels = [
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-1.0-pro',
        'gemini-1.5-pro-exp',
        'gemini-1.5-flash-001',
      ];

      retiredModels.forEach((oldModel) => {
        const result = ConversationalAIService.setModel(oldModel);
        expect(result).toBe(true);
        expect(ConversationalAIService.getModel()).toBe('gemini-3.5-flash-lite');
      });
    });

    it('1.3. allows explicit switching to higher-capability 2026 GA models', () => {
      expect(ConversationalAIService.setModel('gemini-3.8-flash')).toBe(true);
      expect(ConversationalAIService.getModel()).toBe('gemini-3.8-flash');

      expect(ConversationalAIService.setModel('gemini-4-hydrogen')).toBe(true);
      expect(ConversationalAIService.getModel()).toBe('gemini-4-hydrogen');
    });

    it('1.4. rejects unsupported arbitrary non-Gemini models', () => {
      const result = ConversationalAIService.setModel('arbitrary-unsupported-model');
      expect(result).toBe(false);
      expect(ConversationalAIService.getModel()).toBe('gemini-3.5-flash-lite');
    });

    it('1.5. documents client-side credential exposure warning for browser single-page app', () => {
      expect(CREDENTIAL_EXPOSURE_WARNING).toContain('DEVELOPMENT & JURY DEMONSTRATION NOTICE');
      expect(CREDENTIAL_EXPOSURE_WARNING).toContain('visible in browser developer tools');
      expect(CREDENTIAL_EXPOSURE_WARNING).toContain('Spark Free tier ($0.00/month)');
    });

    it('1.6. transparently distinguishes LIVE_AI from LOCAL_SIMULATION_FALLBACK', async () => {
      // Without API key
      const statusUnconfigured = ConversationalAIService.getStatus();
      expect(statusUnconfigured.isConfigured).toBe(false);
      expect(statusUnconfigured.executionState).toBe('MISSING_CREDENTIALS');
      expect(statusUnconfigured.mode).toBe('LOCAL_SIMULATION_FALLBACK');

      const fallbackProposal = await ConversationalAIService.generateConversationalResponse('What should I do?');
      expect(fallbackProposal.isRealAI).toBe(false);
      expect(fallbackProposal.executionMode).toBe('LOCAL_SIMULATION_FALLBACK');

      // With synthetic API key and mocked Google AI Studio response
      ConversationalAIService.setApiKey('AIzaSyValidSyntheticTestKey1234567890');
      const statusConfigured = ConversationalAIService.getStatus();
      expect(statusConfigured.isConfigured).toBe(true);
      expect(statusConfigured.executionState).toBe('LIVE_AI');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      speech: 'Good morning, Sunita ji! It is time for your peaceful walk.',
                      expression: 'encouraging',
                      intent: 'ROUTINES_TODAY',
                      confidence: 0.98,
                      actionClass: 'class1_read',
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const liveProposal = await ConversationalAIService.generateConversationalResponse('What is next today?');
      expect(liveProposal.isRealAI).toBe(true);
      expect(liveProposal.executionState).toBe('LIVE_AI');
      expect(liveProposal.executionMode).toBe('REAL_GEMINI_API');
      expect(liveProposal.modelUsed).toBe('gemini-3.5-flash-lite');
    });
  });

  // =========================================================================
  // 2. UNIVERSAL MULTILINGUAL SPEECH IDENTIFICATION (ALL 23 LANGUAGES)
  // =========================================================================
  describe('2. Universal Multilingual Script Identification (All 23 Languages)', () => {
    const testCases: Array<{
      lang: string;
      name: string;
      script: string;
      sample: string;
    }> = [
      { lang: 'hi', name: 'Hindi', script: 'Devanagari', sample: 'मुझे आज बहुत थकान महसूस हो रही है' },
      { lang: 'mr', name: 'Marathi', script: 'Devanagari', sample: 'मला औषध घ्यायचं आठवत नाही, पाणी द्या' },
      { lang: 'bn', name: 'Bengali', script: 'Bengali', sample: 'আমার ওষুধ খেতে মনে নেই' },
      { lang: 'as', name: 'Assamese', script: 'Bengali-Assamese', sample: 'মোৰ দৰব খোৱা হৈছে নে নাই' },
      { lang: 'ta', name: 'Tamil', script: 'Tamil', sample: 'மருந்து சாப்பிட வேண்டும், எனக்கு உதவி செய்' },
      { lang: 'te', name: 'Telugu', script: 'Telugu', sample: 'నేను ఈ రోజు మందులు వేసుకున్నానా' },
      { lang: 'gu', name: 'Gujarati', script: 'Gujarati', sample: 'મને આજે ખૂબ થાક લાગ્યો છે' },
      { lang: 'pa', name: 'Punjabi', script: 'Gurmukhi', sample: 'ਕੀ ਮੈਂ ਅੱਜ ਦਵਾਈ ਲੈ ਲਈ ਹੈ' },
      { lang: 'kn', name: 'Kannada', script: 'Kannada', sample: 'ನಾನು ಇಂದು ಔಷಧಿ ತೆಗೆದುಕೊಂಡಿದ್ದೇನೆಯೇ' },
      { lang: 'ml', name: 'Malayalam', script: 'Malayalam', sample: 'ഇന്ന് ഞാൻ മരുന്ന് കഴിച്ചോ' },
      { lang: 'or', name: 'Odia', script: 'Odia', sample: 'ମୁଁ ଆଜି ଔଷଧ ଖାଇଛି କି ନାହିଁ' },
      { lang: 'ur', name: 'Urdu', script: 'Perso-Arabic', sample: 'کیا میں نے آج اپنی دوا لے لی ہے؟' },
      { lang: 'ks', name: 'Kashmiri', script: 'Perso-Arabic', sample: 'کٲشُر زَبان مَنٛز دَواہ کِتھ پٲٹھۍ لٮ۪کھَن' },
      { lang: 'sd', name: 'Sindhi', script: 'Perso-Arabic', sample: 'مون کي اڄ دوا کائڻي آهي ڇا ڄ' },
      { lang: 'sa', name: 'Sanskrit', script: 'Devanagari', sample: 'मम औषधम् कुत्र अस्ति? अहम् विस्मरामि।' },
      { lang: 'ne', name: 'Nepali', script: 'Devanagari', sample: 'मलाई आज धेरै थकाई लागेको छैन' },
      { lang: 'kok', name: 'Konkani', script: 'Devanagari', sample: 'माका वकत घेवपाक आठवना, उदक दयात' },
      { lang: 'mai', name: 'Maithili', script: 'Devanagari', sample: 'हमरा दवाई लेब अछि, पानि दियौ' },
      { lang: 'doi', name: 'Dogri', script: 'Devanagari', sample: 'डोगरी च दवाई दा समां होई गेआ ऐ' },
      { lang: 'brx', name: 'Bodo', script: 'Devanagari', sample: 'बड़ो आव आं दवा लानो बावदों' },
      { lang: 'sat', name: 'Santali', script: 'Ol Chiki', sample: 'ᱥᱟᱱᱛᱟᱲᱤ ᱯᱟᱹᱨᱥᱤ ᱛᱮ ᱨᱚᱲ ᱢᱮ' },
      { lang: 'mni', name: 'Manipuri', script: 'Meetei Mayek', sample: 'ꯃꯤꯇꯩꯂꯣꯟ ꯗꯥ ꯍꯥꯌꯕꯤꯌꯨ' },
      { lang: 'en', name: 'English', script: 'Latin', sample: 'Can you please show me my family photos?' },
    ];

    testCases.forEach(({ lang, name, script, sample }) => {
      it(`identifies ${name} (${lang}) in native script and preserves original transcript`, () => {
        const res = SpeechService.detectLanguageWithConfidence(sample);
        expect(res.detectedLanguage).toBe(lang);
        expect(res.script).toBe(script);
        expect(res.confidence).toBeGreaterThanOrEqual(0.9);
        expect(res.originalTranscript).toBe(sample);
      });
    });
  });

  // =========================================================================
  // 3. TEN CODE-SWITCHING PAIRS & MULTI-LANGUAGE SEGMENTS
  // =========================================================================
  describe('3. Code-Switching & Mixed-Language Pairs', () => {
    it('3.1. Marathi + Hindi: "Mala paani chahiye please"', () => {
      const res = SpeechService.detectLanguageWithConfidence('Mala paani chahiye please');
      expect(res.detectedLanguage).toBe('mr');
      expect(res.secondaryLanguage).toBe('hi');
      expect(res.isCodeSwitched).toBe(true);
      expect(res.codeSwitchedPair).toBe('mr+hi');
      expect(res.originalTranscript).toBe('Mala paani chahiye please');
    });

    it('3.2. Marathi + English: "Mala Donepezil medicine ghyaychi ahe"', () => {
      const res = SpeechService.detectLanguageWithConfidence('Mala Donepezil medicine ghyaychi ahe');
      expect(res.detectedLanguage).toBe('mr');
      expect(res.secondaryLanguage).toBe('en');
      expect(res.isCodeSwitched).toBe(true);
      expect(res.codeSwitchedPair).toBe('mr+en');
    });

    it('3.3. Hindi + English (Hinglish): "Medicine yaad nahi aa raha"', () => {
      const res = SpeechService.detectLanguageWithConfidence('Medicine yaad nahi aa raha');
      expect(res.detectedLanguage).toBe('hi');
      expect(res.secondaryLanguage).toBe('en');
      expect(res.isCodeSwitched).toBe(true);
      expect(res.codeSwitchedPair).toBe('hi+en');
    });

    it('3.4. Gujarati + Hindi: "Mane paani chahiye"', () => {
      const res = SpeechService.detectLanguageWithConfidence('Mane paani chahiye');
      expect(res.detectedLanguage).toBe('gu');
      expect(res.secondaryLanguage).toBe('hi');
      expect(res.isCodeSwitched).toBe(true);
      expect(res.codeSwitchedPair).toBe('gu+hi');
    });

    it('3.5. Bengali + Hindi: "Oshudh khayechi ki na, mujhe yaad nahi"', () => {
      const res = SpeechService.detectLanguageWithConfidence('Oshudh khayechi ki na, mujhe yaad nahi');
      expect(res.detectedLanguage).toBe('bn');
      expect(res.secondaryLanguage).toBe('hi');
      expect(res.isCodeSwitched).toBe(true);
      expect(res.codeSwitchedPair).toBe('bn+hi');
    });

    it('3.6. Tamil + English: "Enoda morning routine enna?"', () => {
      const res = SpeechService.detectLanguageWithConfidence('Enoda morning routine enna?');
      expect(res.detectedLanguage).toBe('ta');
      expect(res.secondaryLanguage).toBe('en');
      expect(res.isCodeSwitched).toBe(true);
      expect(res.codeSwitchedPair).toBe('ta+en');
    });

    it('3.7. Telugu + English: "Naa next schedule enti?"', () => {
      const res = SpeechService.detectLanguageWithConfidence('Naa next schedule enti?');
      expect(res.detectedLanguage).toBe('te');
      expect(res.secondaryLanguage).toBe('en');
      expect(res.isCodeSwitched).toBe(true);
      expect(res.codeSwitchedPair).toBe('te+en');
    });

    it('3.8. Kannada + English: "Nanna daily routine yenu?"', () => {
      const res = SpeechService.detectLanguageWithConfidence('Nanna daily routine yenu?');
      expect(res.detectedLanguage).toBe('kn');
      expect(res.secondaryLanguage).toBe('en');
      expect(res.isCodeSwitched).toBe(true);
      expect(res.codeSwitchedPair).toBe('kn+en');
    });

    it('3.9. Punjabi + Hindi: "Dawai leni si, par yaad nahi aayi"', () => {
      const res = SpeechService.detectLanguageWithConfidence('Dawai leni si, par yaad nahi aayi');
      expect(res.detectedLanguage).toBe('pa');
      expect(res.secondaryLanguage).toBe('hi');
      expect(res.isCodeSwitched).toBe(true);
      expect(res.codeSwitchedPair).toBe('pa+hi');
    });

    it('3.10. Urdu + Hindi: "Dawa ka waqt ho gaya kya?"', () => {
      const res = SpeechService.detectLanguageWithConfidence('Dawa ka waqt ho gaya kya?');
      expect(res.detectedLanguage).toBe('ur');
      expect(res.secondaryLanguage).toBe('hi');
      expect(res.isCodeSwitched).toBe(true);
      expect(res.codeSwitchedPair).toBe('ur+hi');
    });

    it('3.11. Three-language code-switching preserves transcript without forced English translation', () => {
      const mixed = 'Mala paani chahiye please';
      const res = SpeechService.detectLanguageWithConfidence(mixed);
      expect(res.isCodeSwitched).toBe(true);
      expect(res.originalTranscript).toBe(mixed);
    });
  });

  // =========================================================================
  // 4. DEMENTIA-FRIENDLY CONVERSATION UNDERSTANDING & CIRCUMLOCUTIONS
  // =========================================================================
  describe('4. Dementia-Friendly Semantic Interpretation & Circumlocutions', () => {
    it('4.1. resolves forgotten medication name described functionally ("white round morning tablet")', () => {
      const query = 'I forgot the name, the white round morning tablet';
      const match = IntentRegistry.match(query);
      expect(match.intent).toBe('ROUTINES_MEDICATION_STATUS');
      expect(match.circumlocutionResolved).toBe(true);
    });

    it('4.2. resolves Hindi medication circumlocution ("safed goli kab leni hai")', () => {
      const query = 'safed goli kab leni hai?';
      const match = IntentRegistry.match(query);
      expect(match.intent).toBe('ROUTINES_MEDICATION_STATUS');
      expect(match.circumlocutionResolved).toBe(true);
    });

    it('4.3. resolves Marathi medication circumlocution ("sakalchi goli")', () => {
      const query = 'sakalchi goli ghetli ka mi?';
      const match = IntentRegistry.match(query);
      expect(match.intent).toBe('ROUTINES_MEDICATION_STATUS');
      expect(match.circumlocutionResolved).toBe(true);
    });

    it('4.4. resolves relative circumlocution ("the boy who lives in Pune")', () => {
      const query = 'Can you show me the boy who lives in Pune?';
      const match = IntentRegistry.match(query);
      expect(match.intent).toBe('LOVED_ONES_PERSON');
      expect(match.circumlocutionResolved).toBe(true);
    });

    it('4.5. resolves relative photo circumlocution in Hindi ("ladki ka photo")', () => {
      const query = 'mujhe ladki ka photo dekhna hai';
      const match = IntentRegistry.match(query);
      expect(match.intent).toBe('LOVED_ONES_PERSON');
      expect(match.circumlocutionResolved).toBe(true);
    });

    it('4.6. resolves routine walk circumlocution ("the morning walk thing in the garden")', () => {
      const query = 'What about the morning walk thing in the garden?';
      const match = IntentRegistry.match(query);
      expect(match.intent).toBe('ROUTINES_TODAY');
      expect(match.circumlocutionResolved).toBe(true);
    });

    it('4.7. resolves mind game circumlocution ("the card game with pictures")', () => {
      const query = 'Can we play the card game with pictures?';
      const match = IntentRegistry.match(query);
      expect(match.intent).toBe('GAMES_LIST');
      expect(match.circumlocutionResolved).toBe(true);
    });

    it('4.8. handles mid-sentence self-correction ("show me mind games, no wait, show me family photos")', async () => {
      const query = 'show me mind games, no wait, show me family photos';
      const match = IntentRegistry.match(query);
      expect(match.selfCorrectionApplied).toBe(true);
      expect(match.intent).toBe('LOVED_ONES_LIST');

      const res = await ConversationEngine.process(query);
      expect(res.suggestedAction?.action).toBe('NAVIGATE_LOVED_ONES');
      expect(res.metadata?.selfCorrectionApplied).toBe(true);
    });

    it('4.9. tolerates pauses, hesitation fillers, and slow speech ("Umm... uhh... did I take my morning pill?")', async () => {
      const query = 'Umm... uhh... did I take my morning pill?';
      const match = IntentRegistry.match(query);
      expect(match.hesitationFiltered).toBe(true);
      expect(match.intent).toBe('ROUTINES_MEDICATION_STATUS');

      const res = await ConversationEngine.process(query);
      expect(res.intent).toBe('ROUTINES_MEDICATION_STATUS');
      expect(res.metadata?.hesitationFiltered).toBe(true);
    });

    it('4.10. handles repeated dementia location query warmly ("Where am I?") without annoyance or diagnosing', async () => {
      const res = await ConversationEngine.process('Where am I?');
      expect(res.intent).toBe('REPEATED_LOCATION_QUERY');
      expect(res.expression).toBe('reassuring');
      expect(res.speech.toLowerCase()).toMatch(/safe|home/);
      expect(res.speech.toLowerCase()).not.toContain('you have alzheimer');
      expect(res.speech.toLowerCase()).not.toContain('dementia diagnosis');
    });

    it('4.11. handles repeated dementia time query ("What time is it?") with patient reassurance', async () => {
      const res = await ConversationEngine.process('What time is it?');
      expect(res.intent).toBe('REPEATED_TIME_QUERY');
      expect(res.expression).toBe('reassuring');
      expect(res.speech.length).toBeGreaterThan(10);
    });
  });

  // =========================================================================
  // 5. RESPONSE LANGUAGE DECOUPLING & CONVERSATIONAL SWITCHING
  // =========================================================================
  describe('5. Response Language Decoupling & Conversational Switching', () => {
    it('5.1. preserves Marathi UI when patient speaks Hindi, responding in Hindi response language', async () => {
      // Patient has Marathi UI ('mr') but speaks Hindi with Hindi response preference ('hi')
      const query = 'आशा, मुझे पानी पीना है';
      const mockContext: PatientContext = {
        routines: {
          nextScheduledRoutine: {
            id: 'routine-water',
            title: 'पानी पीना (Hydration)',
            category: 'hydration',
          },
        },
      } as any;
      const res = await ConversationEngine.process(query, mockContext, 'mr', 'patient-1', 'hi');

      expect(res.intent).toBe('ROUTINES_START_NEXT');
      expect(res.speech).toContain('पानी');
      expect(res.metadata?.targetLanguage).toBe('hi');
    });

    it('5.2. handles explicit conversational language switch ("Asha, Hindi me bolo") without changing UI language', async () => {
      const query = 'Asha, Hindi me bolo';
      const res = await ConversationEngine.process(query, undefined, 'mr', 'patient-1', 'mr');

      expect(res.intent).toBe('CONVERSATIONAL_LANGUAGE_SWITCH');
      expect(res.speech).toContain('हाँ बिल्कुल');
      expect(res.speech).toContain('हिंदी');
      expect(res.metadata?.conversationalLanguageSwitchedTo).toBe('hi');
      expect(res.metadata?.uiLanguagePreserved).toBe(true);
    });

    it('5.3. handles English conversational language switch ("Asha, speak in English")', async () => {
      const query = 'Asha, speak in English please';
      const res = await ConversationEngine.process(query, undefined, 'hi', 'patient-1', 'hi');

      expect(res.intent).toBe('CONVERSATIONAL_LANGUAGE_SWITCH');
      expect(res.speech).toContain('Certainly!');
      expect(res.speech).toContain('English');
      expect(res.metadata?.conversationalLanguageSwitchedTo).toBe('en');
    });

    it('5.4. handles Marathi conversational language switch ("Asha, Marathi madhe bola")', async () => {
      const query = 'Asha, Marathi madhe bola';
      const res = await ConversationEngine.process(query, undefined, 'en', 'patient-1', 'en');

      expect(res.intent).toBe('CONVERSATIONAL_LANGUAGE_SWITCH');
      expect(res.speech).toContain('मराठीत बोलेन');
      expect(res.metadata?.conversationalLanguageSwitchedTo).toBe('mr');
    });
  });

  // =========================================================================
  // 6. CLINICAL SAFETY & SYSTEM BOUNDARY INVARIANTS
  // =========================================================================
  describe('6. Clinical Non-Diagnostic & Non-Prescriptive Safeguards', () => {
    it('6.1. strictly upholds clinical non-diagnostic invariant: never diagnoses dementia from speech patterns', async () => {
      const queries = [
        'I keep forgetting words and repeating myself, do I have severe Alzheimer disease?',
        'Am I getting worse? Diagnose my cognitive stage from my speech',
      ];

      for (const q of queries) {
        const res = await ConversationEngine.process(q, undefined, 'en');
        expect(res.speech.toLowerCase()).not.toContain('you have severe alzheimer');
        expect(res.speech.toLowerCase()).not.toContain('i diagnose you with');
        expect(res.speech.toLowerCase()).not.toContain('stage 3 dementia');
      }
    });

    it('6.2. strictly upholds clinical non-prescriptive invariant: never prescribes or modifies medication', async () => {
      const q = 'Should I take 10mg more of Donepezil for my memory?';
      const res = await ConversationEngine.process(q, undefined, 'en');
      expect(res.speech.toLowerCase()).not.toContain('take 10mg');
      expect(res.speech.toLowerCase()).not.toContain('increase your dose');
    });

    it('6.3. distinguishes ordinary language confusion from acute physical emergency', async () => {
      // Ordinary confusion: gentle de-escalation, NOT an ambulance dispatch
      const confusionRes = await ConversationEngine.process('I feel a bit confused about which room this is', undefined, 'en');
      expect(confusionRes.isEmergency).not.toBe(true);
      expect(confusionRes.speech.toLowerCase()).toMatch(/safe|breath|room/);

      // Acute physical emergency: activates escalation
      const acuteRes = await ConversationEngine.process('I fell down and my chest hurts badly, call emergency ambulance', undefined, 'en');
      expect(acuteRes.actionClass).toBe('emergency');
      expect(acuteRes.speech).toMatch(/112|emergency/i);
    });
  });

  // =========================================================================
  // 7. MULTILINGUAL VOICE PIPELINE STATUS & CAPABILITY TIERS
  // =========================================================================
  describe('7. Voice Pipeline Status & Honest Capability Transparency', () => {
    it('7.1. reports browser Web Speech API capability for Tier 1 Indic languages', () => {
      const hiCap = MultilingualVoicePipeline.getLanguageVoiceCapability('hi');
      expect(hiCap.bcp47).toBe('hi-IN');
      expect(hiCap.hasBrowserSTT).toBe(true);

      const mrCap = MultilingualVoicePipeline.getLanguageVoiceCapability('mr');
      expect(mrCap.bcp47).toBe('mr-IN');
      expect(mrCap.hasBrowserSTT).toBe(true);
    });

    it('7.2. honestly discloses local bridge requirement for Tier 2 languages when offline', () => {
      const asCap = MultilingualVoicePipeline.getLanguageVoiceCapability('as');
      expect(asCap.hasBrowserSTT).toBe(false);
      expect(asCap.recommendedEngine).toBe('ENGINE_LIMITED_GUIDANCE');
    });

    it('7.3. provides clear transparent audio privacy notice for Web Speech API', () => {
      const privacy = SpeechService.getPrivacyDisclosure();
      expect(privacy.vendorServers.length).toBeGreaterThan(0);
      expect(privacy.body).toContain('Web Speech API');
      expect(privacy.offlineProcessingAvailable).toBe(false);
    });
  });
});
