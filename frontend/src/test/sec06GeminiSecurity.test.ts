import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationalAIService } from '../features/ai-companion/services/conversationalAIService.js';
import { AuthService } from '../features/auth/services/authService.js';
import { DoctorAnalyticsService } from '../features/doctor/services/doctorAnalyticsService.js';

describe('SEC-06: Gemini API Key Exposure, Unicode De-Identification & Credential Lifecycle Hardening', () => {
  const MOCK_SYNTHETIC_API_KEY = 'AIzaSyMockSyntheticTestKey1234567890';

  beforeEach(() => {
    vi.clearAllMocks();
    ConversationalAIService.clearApiKey();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.clear();
    }
  });

  // =========================================================================
  // 1. UNICODE MULTILINGUAL DE-IDENTIFICATION (SCENARIOS A - G)
  // =========================================================================

  describe('1. Unicode Multilingual De-Identification (Scenarios A - G)', () => {
    it('Scenario A: correctly recognizes and redacts Hindi/Devanagari patient names', () => {
      const mockContext: any = {
        profile: { displayName: 'सुनीता शर्मा' },
      };
      const rawText = 'नमस्ते सुनीता जी, क्या आपने समय पर दवा ली?';
      const { anonymizedText, tokensRedacted } = ConversationalAIService.anonymizePrompt(rawText, mockContext);

      expect(tokensRedacted).toBeGreaterThan(0);
      expect(anonymizedText).not.toContain('सुनीता');
      expect(anonymizedText).toContain('[PATIENT_NAME]');
      expect(anonymizedText).toBe('नमस्ते [PATIENT_NAME] जी, क्या आपने समय पर दवा ली?');
    });

    it('Scenario B: correctly recognizes and redacts Tamil patient names', () => {
      const mockContext: any = {
        profile: { displayName: 'சுனிதா சர்மா' },
      };
      const rawText = 'வணக்கம் சுனிதா அம்மா, இன்று எப்படி உணர்கிறீர்கள்?';
      const { anonymizedText, tokensRedacted } = ConversationalAIService.anonymizePrompt(rawText, mockContext);

      expect(tokensRedacted).toBeGreaterThan(0);
      expect(anonymizedText).not.toContain('சுனிதா');
      expect(anonymizedText).toContain('[PATIENT_NAME]');
      expect(anonymizedText).toBe('வணக்கம் [PATIENT_NAME] அம்மா, இன்று எப்படி உணர்கிறீர்கள்?');
    });

    it('Scenario C: correctly recognizes and redacts Telugu patient names', () => {
      const mockContext: any = {
        profile: { displayName: 'సునీత శర్మ' },
      };
      const rawText = 'నమస్కారం సునీత గారు, ఈ రోజు ఎలా ఉన్నారు?';
      const { anonymizedText, tokensRedacted } = ConversationalAIService.anonymizePrompt(rawText, mockContext);

      expect(tokensRedacted).toBeGreaterThan(0);
      expect(anonymizedText).not.toContain('సునీత');
      expect(anonymizedText).toContain('[PATIENT_NAME]');
      expect(anonymizedText).toBe('నమస్కారం [PATIENT_NAME] గారు, ఈ రోజు ఎలా ఉన్నారు?');
    });

    it('Scenario D: correctly recognizes and redacts Kannada patient names', () => {
      const mockContext: any = {
        profile: { displayName: 'ಸುನೀತಾ ಶರ್ಮಾ' },
      };
      const rawText = 'ನಮಸ್ಕಾರ ಸುನೀತಾ ಅವರೇ, ಇಂದು ನೀವು ಹೇಗೆ ಭಾವಿಸುತ್ತೀರಿ?';
      const { anonymizedText, tokensRedacted } = ConversationalAIService.anonymizePrompt(rawText, mockContext);

      expect(tokensRedacted).toBeGreaterThan(0);
      expect(anonymizedText).not.toContain('ಸುನೀತಾ');
      expect(anonymizedText).toContain('[PATIENT_NAME]');
      expect(anonymizedText).toBe('ನಮಸ್ಕಾರ [PATIENT_NAME] ಅವರೇ, ಇಂದು ನೀವು ಹೇಗೆ ಭಾವಿಸುತ್ತೀರಿ?');
    });

    it('Scenario E: correctly recognizes and redacts Bengali patient names', () => {
      const mockContext: any = {
        profile: { displayName: 'সুনীতা শর্মা' },
      };
      const rawText = 'নমস্কার সুনীতা দেবী, আজ আপনি কেমন আছেন?';
      const { anonymizedText, tokensRedacted } = ConversationalAIService.anonymizePrompt(rawText, mockContext);

      expect(tokensRedacted).toBeGreaterThan(0);
      expect(anonymizedText).not.toContain('সুনীতা');
      expect(anonymizedText).toContain('[PATIENT_NAME]');
      expect(anonymizedText).toBe('নমস্কার [PATIENT_NAME] দেবী, আজ আপনি কেমন আছেন?');
    });

    it('Scenario F: preserves existing English and Latin-script name de-identification', () => {
      const mockContext: any = {
        profile: { displayName: 'Sunita Sharma' },
        lovedOnes: {
          sampleMembers: [
            { name: 'Ananya Sharma', relationship: 'Daughter' },
          ],
        },
      };
      const rawText = 'Hello Sunita Sharma, your daughter Ananya Sharma called earlier.';
      const { anonymizedText, tokensRedacted } = ConversationalAIService.anonymizePrompt(rawText, mockContext);

      expect(tokensRedacted).toBeGreaterThanOrEqual(2);
      expect(anonymizedText).not.toContain('Sunita');
      expect(anonymizedText).not.toContain('Ananya');
      expect(anonymizedText).toContain('[PATIENT_NAME]');
      expect(anonymizedText).toContain('[FAMILY_MEMBER]');
    });

    it('Scenario G: correctly handles punctuation, danda, multiword spacing, and avoids partial-word corruption', () => {
      const mockContext: any = {
        profile: { displayName: 'सुनीता शर्मा' },
      };
      // Test 1: Punctuation (danda, comma, exclamation)
      const textWithPunctuation = 'नमस्ते, सुनीता! आप कैसी हैं? हाँ, सुनीता शर्मा यहाँ थीं।';
      const res1 = ConversationalAIService.anonymizePrompt(textWithPunctuation, mockContext);
      expect(res1.anonymizedText).not.toContain('सुनीता');
      expect(res1.anonymizedText).toContain('[PATIENT_NAME]!');
      expect(res1.anonymizedText).toContain('[PATIENT_NAME] यहाँ');

      // Test 2: Irregular multiword spacing
      const textIrregularSpacing = 'सुनीता   शर्मा दवा ले रही हैं।';
      const res2 = ConversationalAIService.anonymizePrompt(textIrregularSpacing, mockContext);
      expect(res2.anonymizedText).not.toContain('सुनीता');
      expect(res2.anonymizedText).not.toContain('शर्मा');
      expect(res2.anonymizedText).toContain('[PATIENT_NAME]');

      // Test 3: Avoid partial-word corruption
      // 'असुनीतावती' contains 'सुनीता' as a substring, but must NOT be corrupted because it is part of a longer word
      const textPartialWord = 'असुनीतावती पुस्तक पढ़ रही हैं।';
      const res3 = ConversationalAIService.anonymizePrompt(textPartialWord, mockContext);
      expect(res3.anonymizedText).toContain('असुनीतावती');
      expect(res3.anonymizedText).not.toContain('[PATIENT_NAME]');
    });
  });

  // =========================================================================
  // 2. DIRECT GEMINI DISPATCH & CONTEXT HARDENING (SCENARIOS H - K)
  // =========================================================================

  describe('2. Direct Gemini Dispatch & Context Hardening (Scenarios H - K)', () => {
    it('Scenario H: direct invocation of callGeminiAPI with raw input enforces de-identification internally', async () => {
      ConversationalAIService.setApiKey(MOCK_SYNTHETIC_API_KEY);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ speech: 'Understood.', expression: 'reassuring', intent: 'GENERAL_HELP' }) }],
              },
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const mockContext: any = {
        profile: { displayName: 'Sunita Sharma' },
      };

      // Raw unredacted text passed directly to callGeminiAPI
      const rawSensitiveQuery = 'Sunita Sharma is taking Donepezil for Alzheimer disease at +91 98201 12345';
      const proposal = await ConversationalAIService.callGeminiAPI(rawSensitiveQuery, mockContext);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const requestOptions = mockFetch.mock.calls[0][1] as RequestInit;
      const requestBody = JSON.parse(requestOptions.body as string);
      const dispatchedText = requestBody.contents[0].parts[0].text;

      // Sensitive tokens must be redacted even on direct callGeminiAPI invocation
      expect(dispatchedText).not.toContain('Sunita');
      expect(dispatchedText).not.toContain('Donepezil');
      expect(dispatchedText).not.toContain('Alzheimer');
      expect(dispatchedText).not.toContain('98201 12345');
      expect(dispatchedText).toContain('[PATIENT_NAME]');
      expect(dispatchedText).toContain('[MEDICATION]');
      expect(dispatchedText).toContain('[CLINICAL_DIAGNOSIS]');
      expect(dispatchedText).toContain('[PHONE_REDACTED]');
      expect(proposal.tokensRedacted).toBeGreaterThan(0);
    });

    it('Scenario I: sensitive information in turnHistory.lastTopic is sanitized before transmission', async () => {
      ConversationalAIService.setApiKey(MOCK_SYNTHETIC_API_KEY);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ speech: 'Understood.', expression: 'reassuring', intent: 'GENERAL_HELP' }) }],
              },
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const mockContext: any = {
        profile: { displayName: 'Sunita Sharma' },
      };

      const turnHistory = {
        lastTopic: 'Discussion about Sunita Sharma and her Donepezil prescription',
        lastIntent: 'MEDICATION_REMINDER',
      };

      await ConversationalAIService.callGeminiAPI('What is next?', mockContext, turnHistory);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const requestOptions = mockFetch.mock.calls[0][1] as RequestInit;
      const requestBody = JSON.parse(requestOptions.body as string);

      // Context history entry in contents
      const contextMessage = requestBody.contents[0].parts[0].text;
      expect(contextMessage).not.toContain('Sunita');
      expect(contextMessage).not.toContain('Donepezil');
      expect(contextMessage).toContain('[PATIENT_NAME]');
      expect(contextMessage).toContain('[MEDICATION]');
    });

    it('Scenario J: malformed or sensitive turnHistory.lastIntent is sanitized to safe token', async () => {
      ConversationalAIService.setApiKey(MOCK_SYNTHETIC_API_KEY);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ speech: 'Understood.', expression: 'reassuring', intent: 'GENERAL_HELP' }) }],
              },
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const turnHistory = {
        lastTopic: 'Routine review',
        lastIntent: 'INJECTION_ATTEMPT_WITH_MALICIOUS_PROMPT_$$#@!',
      };

      await ConversationalAIService.callGeminiAPI('Hello', 'en', turnHistory);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const requestOptions = mockFetch.mock.calls[0][1] as RequestInit;
      const requestBody = JSON.parse(requestOptions.body as string);
      const contextMessage = requestBody.contents[0].parts[0].text;

      // Malicious or invalid intent token must default to safe GENERAL_HELP
      expect(contextMessage).toContain('intent=GENERAL_HELP');
      expect(contextMessage).not.toContain('INJECTION_ATTEMPT');
    });

    it('Scenario K: de-identifies phones, emails, diagnoses and drugs even when context is completely missing', () => {
      const rawText = 'Patient at +91 98201 12345 / care@hospital.in was diagnosed with Alzheimer disease and prescribed Memantine';
      const { anonymizedText, tokensRedacted } = ConversationalAIService.anonymizePrompt(rawText, undefined);

      expect(tokensRedacted).toBeGreaterThanOrEqual(4);
      expect(anonymizedText).not.toContain('98201 12345');
      expect(anonymizedText).not.toContain('care@hospital.in');
      expect(anonymizedText).not.toContain('Alzheimer');
      expect(anonymizedText).not.toContain('Memantine');
      expect(anonymizedText).toContain('[PHONE_REDACTED]');
      expect(anonymizedText).toContain('[EMAIL_REDACTED]');
      expect(anonymizedText).toContain('[CLINICAL_DIAGNOSIS]');
      expect(anonymizedText).toContain('[MEDICATION]');
    });
  });

  // =========================================================================
  // 3. SESSION LIFECYCLE, ACCOUNT ISOLATION & PURGE (SCENARIOS L - N)
  // =========================================================================

  describe('3. Session Lifecycle, Account Isolation & Purge (Scenarios L - N)', () => {
    it('Scenario L: User B cannot inherit or access User A runtime API key across account switch', () => {
      // User A sets a key bound to User A UID
      ConversationalAIService.setApiKey(MOCK_SYNTHETIC_API_KEY, 'uid-patient-user-A');

      // User A can access it
      expect(ConversationalAIService.getApiKey('uid-patient-user-A')).toBe(MOCK_SYNTHETIC_API_KEY);

      // User B attempts to access it -> Rejected (null)
      expect(ConversationalAIService.getApiKey('uid-patient-user-B')).toBeNull();

      // Account switch: User B logs in via AuthService -> Clears previous in-memory key
      AuthService.simulateDemoSignIn('caregiver@saksham.care', 'password123', 'caregiver');

      // Key is completely cleared from memory
      expect(ConversationalAIService.getApiKey()).toBeNull();
      expect(ConversationalAIService.hasApiKey()).toBe(false);
    });

    it('Scenario M: successful AuthService.signOut clears in-memory keys and localStorage', async () => {
      ConversationalAIService.setApiKey(MOCK_SYNTHETIC_API_KEY);
      window.localStorage.setItem('saksham_gemini_api_key', 'legacy-key-to-purge');

      await AuthService.signOut();

      expect(ConversationalAIService.getApiKey()).toBeNull();
      expect(ConversationalAIService.hasApiKey()).toBe(false);
      expect(window.localStorage.getItem('saksham_gemini_api_key')).toBeNull();
    });

    it('Scenario N: failed Firebase signOut still purges in-memory keys and storage via finally block', async () => {
      ConversationalAIService.setApiKey(MOCK_SYNTHETIC_API_KEY);
      window.localStorage.setItem('saksham_gemini_api_key', 'legacy-key-to-purge');
      window.localStorage.setItem('saksham_auth_user', JSON.stringify({ uid: 'patient-test' }));

      // Simulate a network failure or teardown error inside the signOut try-block
      vi.spyOn(DoctorAnalyticsService, 'clearClinicalSession').mockImplementationOnce(() => {
        throw new Error('Network timeout during auth teardown');
      });

      // Perform signOut - must catch error internally and proceed to finally
      await AuthService.signOut();

      // Finally block must have executed and cleared credentials regardless of the error
      expect(ConversationalAIService.getApiKey()).toBeNull();
      expect(ConversationalAIService.hasApiKey()).toBe(false);
      expect(window.localStorage.getItem('saksham_gemini_api_key')).toBeNull();
      expect(window.localStorage.getItem('saksham_auth_user')).toBeNull();
    });
  });

  // =========================================================================
  // 4. CREDENTIAL STORAGE & BUILD EXPOSURE HARDENING (SCENARIOS O - R)
  // =========================================================================

  describe('4. Credential Storage & Build Exposure Hardening (Scenarios O - R)', () => {
    it('Scenario O: Gemini credentials are NEVER written to localStorage or sessionStorage', () => {
      ConversationalAIService.setApiKey(MOCK_SYNTHETIC_API_KEY);

      expect(window.localStorage.getItem('saksham_gemini_api_key')).toBeNull();
      expect(window.sessionStorage.getItem('saksham_gemini_api_key')).toBeNull();
    });

    it('Scenario P: ambient build-time VITE_GEMINI_API_KEY is not accepted as production key in production builds', () => {
      // In production mode (when DEV is false), ambient build-time environment keys are rejected
      const originalDev = import.meta.env.DEV;
      try {
        (import.meta.env as any).DEV = false;
        ConversationalAIService.clearApiKey();

        // In production mode, getApiKey returns null even if ambient env exists
        const prodKey = ConversationalAIService.getApiKey();
        expect(prodKey).toBeNull();
      } finally {
        (import.meta.env as any).DEV = originalDev;
      }
    });

    it('Scenario Q: safe local fallback functions transparently when Gemini dispatch is absent or quota fails', async () => {
      ConversationalAIService.clearApiKey();
      expect(ConversationalAIService.hasApiKey()).toBe(false);

      // Without key: local deterministic fallback
      const proposal = await ConversationalAIService.generateConversationalResponse('What routine is next?');
      expect(proposal).toBeDefined();
      expect(proposal.executionMode).toBe('LOCAL_SIMULATION_FALLBACK');
      expect(typeof proposal.speech).toBe('string');
      expect(proposal.speech.length).toBeGreaterThan(0);
    });

    it('Scenario R: network errors and quota exhaustion do NOT expose credentials or query URLs in console logs', async () => {
      ConversationalAIService.setApiKey(MOCK_SYNTHETIC_API_KEY);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error with https://generativelanguage.googleapis.com'));
      global.fetch = mockFetch;

      const result = await ConversationalAIService.generateConversationalResponse('Help me please');

      expect(result.executionMode).toBe('LOCAL_SIMULATION_FALLBACK');
      expect(warnSpy).toHaveBeenCalled();

      const loggedMessages = warnSpy.mock.calls.map((call) => call.join(' ')).join(' ');
      expect(loggedMessages).not.toContain(MOCK_SYNTHETIC_API_KEY);
      expect(loggedMessages).not.toContain('?key=');

      warnSpy.mockRestore();
    });
  });
});
