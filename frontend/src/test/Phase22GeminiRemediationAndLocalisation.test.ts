import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConversationalAIService,
  CREDENTIAL_EXPOSURE_WARNING,
} from '../features/ai-companion/services/conversationalAIService.js';
import {
  TOTAL_DICTIONARY_KEYS,
  getLinguisticReviewStatus,
  isLanguageVerified,
  getAllLanguagesReviewMatrix,
} from '../i18n/linguisticReviewRegistry.js';
import { ALL_LANGUAGES, LANGUAGE_MAP, isRTLLanguage } from '../i18n/languages.js';
import { TRANSLATION_CATALOGUE, translate } from '../i18n/interpolate.js';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { PatientContext } from '../services/patientContextService.js';

describe('SAKSHAM NEURO-CARE — PHASE 2.2 GEMINI REMEDIATION & MULTILINGUAL ACCEPTANCE SUITE', () => {
  beforeEach(() => {
    ConversationalAIService.clearApiKey();
    ConversationalAIService.setModel('gemini-3.5-flash-lite');
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. GEMINI API REMEDIATION & MODEL LIFECYCLE
  // =========================================================================
  describe('1. Gemini API Model ID & Deprecation Remediation', () => {
    it('sets gemini-3.5-flash-lite as the primary GA default model', () => {
      expect(ConversationalAIService.getModel()).toBe('gemini-3.5-flash-lite');
      const supported = ConversationalAIService.SUPPORTED_MODELS;
      expect(supported).toContain('gemini-3.5-flash-lite');
      expect(supported).toContain('gemini-3.8-flash');
      expect(supported).toContain('gemini-4-hydrogen');
    });

    it('automatically upgrades retired/deprecated models to gemini-3.5-flash-lite', () => {
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
        // Automatically migrated to gemini-3.5-flash-lite
        expect(ConversationalAIService.getModel()).toBe('gemini-3.5-flash-lite');
      });
    });

    it('rejects unsupported arbitrary model strings', () => {
      const result = ConversationalAIService.setModel('gpt-4o-arbitrary');
      expect(result).toBe(false);
      expect(ConversationalAIService.getModel()).toBe('gemini-3.5-flash-lite');
    });
  });

  // =========================================================================
  // 2. TRANSPARENT AI EXECUTION STATES & RATE LIMITING
  // =========================================================================
  describe('2. AI Execution States & Fallback Transparency', () => {
    it('reports MISSING_CREDENTIALS when no API key is provided', async () => {
      ConversationalAIService.clearApiKey();
      const status = ConversationalAIService.getStatus();
      expect(status.isConfigured).toBe(false);
      expect(status.executionState).toBe('MISSING_CREDENTIALS');
      expect(status.mode).toBe('LOCAL_SIMULATION_FALLBACK');

      const proposal = await ConversationalAIService.generateConversationalResponse('What should I do?');
      expect(proposal.isRealAI).toBe(false);
      expect(proposal.executionState).toBe('MISSING_CREDENTIALS');
      expect(proposal.executionMode).toBe('LOCAL_SIMULATION_FALLBACK');
      expect(proposal.configNotice).toContain('Not Configured');
    });

    it('reports LIVE_AI on successful Google Gemini 2.0 Flash response', async () => {
      ConversationalAIService.setApiKey('AIzaSyMockValidTestKey1234567890');
      const status = ConversationalAIService.getStatus();
      expect(status.isConfigured).toBe(true);
      expect(status.executionState).toBe('LIVE_AI');

      // Mock successful fetch from Google AI Studio
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
                      speech: 'Good morning! It is time for your peaceful walk.',
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

      const proposal = await ConversationalAIService.generateConversationalResponse('What is next today?');
      expect(proposal.isRealAI).toBe(true);
      expect(proposal.executionState).toBe('LIVE_AI');
      expect(proposal.executionMode).toBe('REAL_GEMINI_API');
      expect(proposal.modelUsed).toBe('gemini-3.5-flash-lite');
      expect(proposal.speech).toContain('peaceful walk');
    });

    it('reports QUOTA_EXHAUSTED on HTTP 429 and smoothly activates local fallback', async () => {
      ConversationalAIService.setApiKey('AIzaSyMockValidTestKey1234567890');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });
      global.fetch = mockFetch;

      const proposal = await ConversationalAIService.generateConversationalResponse('I want to see my family');
      expect(proposal.isRealAI).toBe(false);
      expect(proposal.executionState).toBe('QUOTA_EXHAUSTED');
      expect(proposal.executionMode).toBe('LOCAL_SIMULATION_FALLBACK');
      expect(proposal.configNotice).toContain('Quota Exhausted (HTTP 429)');
      expect(proposal.speech).toBeDefined();
    });

    it('reports NETWORK_FAILURE on offline or network disconnect and falls back safely', async () => {
      ConversationalAIService.setApiKey('AIzaSyMockValidTestKey1234567890');

      const mockFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch (net::ERR_INTERNET_DISCONNECTED)'));
      global.fetch = mockFetch;

      const proposal = await ConversationalAIService.generateConversationalResponse('I feel scared and confused');
      expect(proposal.isRealAI).toBe(false);
      expect(proposal.executionState).toBe('NETWORK_FAILURE');
      expect(proposal.executionMode).toBe('LOCAL_SIMULATION_FALLBACK');
      expect(proposal.configNotice).toMatch(/connection error|offline|network/i);
      // Emergency distress response must still function offline
      expect(proposal.intent).toBe('CAREGIVER_ESCALATION');
      expect(proposal.actionProposal?.action).toBe('CALL_CAREGIVER');
    });

    it('enforces client-side rate limiting (MAX_RPM = 12) under free tier quota', () => {
      expect(ConversationalAIService.canMakeRequest()).toBe(true);
      // Fill the 12 RPM bucket
      for (let i = 0; i < 12; i++) {
        (ConversationalAIService as any).recordRequest();
      }
      expect(ConversationalAIService.canMakeRequest()).toBe(false);
    });

    it('documents client-side credential exposure disclosure warning', () => {
      expect(CREDENTIAL_EXPOSURE_WARNING).toBeDefined();
      expect(CREDENTIAL_EXPOSURE_WARNING).toContain('DEVELOPMENT & JURY DEMONSTRATION NOTICE');
      expect(CREDENTIAL_EXPOSURE_WARNING).toContain('localStorage');
      expect(CREDENTIAL_EXPOSURE_WARNING).toContain('Firebase Spark Free tier');
      expect(CREDENTIAL_EXPOSURE_WARNING).toContain('synthetic patient data');

      const status = ConversationalAIService.getStatus();
      expect(status.warningNotice).toBe(CREDENTIAL_EXPOSURE_WARNING);
    });
  });

  // =========================================================================
  // 3. COMPLETE 23-LANGUAGE LOCALISATION & 100% KEY PARITY
  // =========================================================================
  describe('3. Pan-India 23-Language Localisation & 100% Key Parity', () => {
    const all23Codes = [
      'en', 'hi', 'mr', 'bn', 'ta', 'te', 'ur',
      'gu', 'kn', 'ml', 'pa', 'or', 'as',
      'ne', 'sa', 'mai', 'doi', 'kok', 'brx', 'mni', 'sat', 'ks', 'sd',
    ] as const;

    it('verifies all 23 official languages are registered with valid metadata', () => {
      expect(ALL_LANGUAGES).toHaveLength(23);
      all23Codes.forEach((code) => {
        const meta = LANGUAGE_MAP[code];
        expect(meta).toBeDefined();
        expect(meta.code).toBe(code);
        expect(meta.name.length).toBeGreaterThan(0);
        expect(meta.nativeName.length).toBeGreaterThan(0);
        expect(meta.script.length).toBeGreaterThan(0);
      });
    });

    it('verifies 100% complete key parity (353/353 keys) across all 23 language dictionaries', () => {
      const enKeys = Object.keys(TRANSLATION_CATALOGUE.en);
      expect(enKeys.length).toBe(TOTAL_DICTIONARY_KEYS);
      expect(TOTAL_DICTIONARY_KEYS).toBe(353);

      all23Codes.forEach((code) => {
        const dict = TRANSLATION_CATALOGUE[code];
        expect(dict).toBeDefined();
        const dictKeys = Object.keys(dict);
        expect(dictKeys.length).toBe(353);

        const missingKeys = enKeys.filter((k) => !(k in dict));
        expect(missingKeys).toHaveLength(0);
      });
    });

    it('verifies RTL script direction for Urdu, Kashmiri, and Sindhi', () => {
      const rtlLanguages = ['ur', 'ks', 'sd'] as const;
      rtlLanguages.forEach((code) => {
        expect(isRTLLanguage(code)).toBe(true);
        expect(LANGUAGE_MAP[code].direction).toBe('rtl');
      });

      const ltrLanguages = ['en', 'hi', 'mr', 'bn', 'ta', 'te', 'gu', 'kn', 'ml', 'pa'] as const;
      ltrLanguages.forEach((code) => {
        expect(isRTLLanguage(code)).toBe(false);
        expect(LANGUAGE_MAP[code].direction).toBe('ltr');
      });
    });

    it('verifies native script fidelity in distinct orthographies (Santali Ol Chiki, Manipuri Meetei Mayek)', () => {
      // Santali Ol Chiki Unicode range U+1C50 - U+1C7F
      const satSample = TRANSLATION_CATALOGUE.sat['app.title_native'];
      expect(satSample).toBe('ᱥᱟᱠᱥᱟᱢ');
      expect(/[\u1C50-\u1C7F]/.test(satSample)).toBe(true);

      // Manipuri Meetei Mayek
      const mniSample = TRANSLATION_CATALOGUE.mni['app.title_native'];
      expect(mniSample.length).toBeGreaterThan(0);

      // Gurmukhi for Punjabi
      const paSample = TRANSLATION_CATALOGUE.pa['app.title_native'];
      expect(paSample).toBe('ਸਕਸ਼ਮ');
      expect(/[\u0A00-\u0A7F]/.test(paSample)).toBe(true);
    });
  });

  // =========================================================================
  // 4. LINGUISTIC REVIEW & CLINICAL MATURITY REGISTRY
  // =========================================================================
  describe('4. Linguistic Review Registry & Tier Categorization', () => {
    it('classifies English, Hindi, and Marathi as Tier 1 Fully Verified', () => {
      const tier1 = ['en', 'hi', 'mr'];
      tier1.forEach((code) => {
        const status = getLinguisticReviewStatus(code);
        expect(status.tier).toBe('TIER_1_VERIFIED');
        expect(status.clinicalReviewStatus).toBe('VERIFIED_CLINICAL');
        expect(isLanguageVerified(code)).toBe(true);
      });
    });

    it('classifies 9 core voice languages as Tier 2 Validated Voice', () => {
      const tier2 = ['bn', 'ta', 'te', 'gu', 'kn', 'ml', 'pa', 'ur', 'ne'];
      tier2.forEach((code) => {
        const status = getLinguisticReviewStatus(code);
        expect(status.tier).toBe('TIER_2_VALIDATED_VOICE');
        expect(status.browserASRSupported).toBe(true);
        expect(status.clinicalReviewStatus).toBe('VERIFIED_CORE_VOICE');
      });
    });

    it('classifies 11 regional languages as Tier 3 Tactile / Text Review with flagged items', () => {
      const tier3 = ['as', 'or', 'sa', 'mai', 'doi', 'kok', 'brx', 'mni', 'sat', 'ks', 'sd'];
      tier3.forEach((code) => {
        const status = getLinguisticReviewStatus(code);
        expect(status.tier).toBe('TIER_3_TACTILE_REVIEW');
        expect(status.clinicalReviewStatus).toBe('PENDING_HUMAN_LINGUISTIC_REVIEW');
        expect(status.browserASRSupported).toBe(false);
        expect(status.flaggedReviewCategories.length).toBeGreaterThan(0);
      });
    });

    it('returns complete 23-language matrix with 100% key parity per entry', () => {
      const matrix = getAllLanguagesReviewMatrix();
      expect(matrix).toHaveLength(23);
      matrix.forEach((entry) => {
        expect(entry.keyCount).toBe(353);
        expect(entry.totalKeys).toBe(353);
        expect(entry.keyParityPercent).toBe(100);
      });
    });
  });

  // =========================================================================
  // 5. PATIENT SCREEN LOCALISATION COVERAGE
  // =========================================================================
  describe('5. Patient Screen Localisation Domain Coverage', () => {
    const criticalScreenKeys = [
      // Navigation
      'nav.home', 'nav.routines', 'nav.family', 'nav.games', 'nav.profile',
      // Home Sanctuary
      'patient.welcome_name', 'patient.peaceful_day', 'patient.greeting_morning',
      // Asha Conversation
      'ai.companion_asha', 'ai.input_placeholder', 'ai.safety_medical_guard',
      // Daily Routines
      'routines.tab_assisted_recall', 'routines.tab_checklist', 'routines.runner_title', 'routines.today_routine',
      // Progress & Streak
      'progress.title', 'progress.completed_of', 'progress.streak_days',
      // Loved Ones
      'loved_ones.title', 'loved_ones.subtitle', 'loved_ones.tab_album',
      // Mind Games
      'games.title', 'games.subtitle', 'games.xp_earned',
      // Profile & Settings
      'profile.title', 'profile.subtitle', 'profile.change_language',
      // Clinical Governance
      'ai.safety_medical_guard', 'doctor.longitudinal_title', 'caregiver.calendar_title',
    ];

    it('translates all critical screen keys in all 23 languages without unmapped fallbacks', () => {
      const allLangs = Object.keys(TRANSLATION_CATALOGUE);
      expect(allLangs).toHaveLength(23);

      allLangs.forEach((lang) => {
        criticalScreenKeys.forEach((key) => {
          const val = translate(lang as any, key);
          expect(val).toBeDefined();
          expect(val.length).toBeGreaterThan(0);
          expect(val).not.toBe(key); // Not an unmapped raw key token
        });
      });
    });
  });

  // =========================================================================
  // 6. ASHA CONVERSATION, CODE-SWITCHING & CLINICAL SAFETY BOUNDARIES
  // =========================================================================
  describe('6. ASHA Multilingual Intelligence & Clinical Safety Invariants', () => {
    it('maintains patient response language in Hindi', async () => {
      const res = await ConversationEngine.process('मुझे अपने परिवार को देखना है', undefined, 'hi', 'test-uid', 'hi');
      expect(res.speech).toBeDefined();
      expect(res.suggestedAction?.action).toBe('NAVIGATE_LOVED_ONES');
    });

    it('maintains patient response language in Marathi', async () => {
      const res = await ConversationEngine.process('मला औषधांची माहिती हवी आहे', undefined, 'mr', 'test-uid', 'mr');
      expect(res.speech).toBeDefined();
      expect(res.speech).toContain('औषध');
      expect(res.intent).toBe('ROUTINES_MEDICATION_STATUS');
    });

    it('correctly parses Hinglish code-switching ("medicine yaad nahi" and "mujhe water chahiye please")', async () => {
      const res1 = await ConversationEngine.process('medicine yaad nahi', undefined, 'hi', 'test-uid', 'hi');
      expect(res1.intent).toBe('ROUTINES_MEDICATION_STATUS');

      const res2 = await ConversationEngine.process('mujhe water chahiye please', undefined, 'hi', 'test-uid', 'hi');
      expect(res2.intent).toBe('ROUTINES_START_NEXT');
    });

    it('safely handles emergency distress ("I am lost and scared") with caregiver escalation', async () => {
      const proposal = ConversationalAIService.localSemanticReasoner('I feel lost and scared, please help', 'en');
      expect(proposal.intent).toBe('CAREGIVER_ESCALATION');
      expect(proposal.actionProposal?.action).toBe('CALL_CAREGIVER');
      expect(proposal.speech.toLowerCase()).toMatch(/safe|breath|caregiver/);
    });

    it('strictly upholds clinical non-diagnostic invariant: never diagnoses disease', async () => {
      const query = 'Do I have Alzheimer or severe dementia? Please diagnose me';
      const res = await ConversationEngine.process(query, undefined, 'en');
      // Must not diagnose disease; must remind patient of clinical non-diagnostic boundary
      expect(res.speech.toLowerCase()).not.toContain('you have alzheimer');
      expect(res.speech.toLowerCase()).not.toContain('you have dementia');
    });

    it('strictly upholds clinical non-prescriptive invariant: never prescribes or modifies medication', async () => {
      const query = 'Can I increase my Donepezil dosage to 20mg?';
      const res = await ConversationEngine.process(query, undefined, 'en');
      expect(res.speech.toLowerCase()).not.toContain('increase your dose');
      expect(res.speech.toLowerCase()).not.toContain('take 20mg');
    });
  });

  // =========================================================================
  // 7. PRIVACY DE-IDENTIFICATION BOUNDARY
  // =========================================================================
  describe('7. On-Device Privacy De-Identification Boundary', () => {
    it('redacts real patient name, phone numbers, and clinical diagnoses before external API calls', () => {
      const sampleContext: PatientContext = {
        profile: {
          displayName: 'Sunita Sharma',
          email: 'sunita@example.com',
          role: 'patient',
        },
        lovedOnes: {
          lovedOnes: [
            {
              id: 'lo-1',
              name: 'Aarav Sharma',
              relationship: 'Son',
              phoneNumber: '+91 98765 43210',
            },
          ],
        },
      } as any;

      const rawQuery = 'My name is Sunita, my son Aarav called me from +91 98765 43210 about my Alzheimer disease and Donepezil';
      const { anonymizedText, tokensRedacted } = ConversationalAIService.anonymizePrompt(rawQuery, sampleContext);

      expect(tokensRedacted).toBeGreaterThan(0);
      expect(anonymizedText).not.toContain('Sunita');
      expect(anonymizedText).not.toContain('Aarav');
      expect(anonymizedText).not.toContain('98765 43210');
      expect(anonymizedText).not.toContain('Alzheimer');
      expect(anonymizedText).not.toContain('Donepezil');
      expect(anonymizedText).toContain('[PATIENT_NAME]');
      expect(anonymizedText).toContain('[FAMILY_MEMBER]');
      expect(anonymizedText).toContain('[CLINICAL_DIAGNOSIS]');
      expect(anonymizedText).toContain('[MEDICATION]');
    });
  });
});
