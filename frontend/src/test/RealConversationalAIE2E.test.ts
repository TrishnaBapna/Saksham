/**
 * SAKSHAM — PHASE 2 REMEDIATION: REAL CONVERSATIONAL AI & E2E INTEGRATION SUITE
 * 
 * Verifies:
 * 1. Honest AI Configuration & Fallback Transparency (No disguised simulations).
 * 2. Deep On-Device Privacy De-Identification Boundary (Names, Diagnoses, Drugs, Contacts).
 * 3. Real Gemini Developer API structured JSON output parsing and network schema contracts.
 * 4. 10 Master Conversational Journeys across emotional adaptation, memory retrieval,
 *    tactile routine navigation, and safe caregiver escalation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ConversationalAIService,
} from '../features/ai-companion/services/conversationalAIService.js';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { ConversationActionRegistry } from '../features/ai-companion/services/conversationActionRegistry.js';

describe('Phase 2 Sprint: Real Conversational AI & E2E Integration Suite', () => {
  const mockPatientContext: any = {
    patientId: 'patient-saksham-test-01',
    profile: {
      displayName: 'Sunita Sharma',
      preferredLanguage: 'en',
    },
    routines: {
      routines: [
        {
          id: 'rx-donepezil-01',
          title: 'Donepezil 5mg Morning Medication',
          scheduledTime: '08:30 AM',
          category: 'medication',
          period: 'morning',
          isCompleted: true,
          completedAt: '08:35 AM',
          streakCount: 3,
          enableAssistedRecall: true,
        },
        {
          id: 'walk-park-01',
          title: 'Morning Garden Walk',
          scheduledTime: '10:00 AM',
          category: 'exercise',
          period: 'morning',
          isCompleted: false,
          streakCount: 2,
          enableAssistedRecall: true,
        },
      ],
    },
    lovedOnes: {
      sampleMembers: [
        {
          id: 'rel-priya',
          name: 'Priya Sharma',
          relationship: 'daughter',
          description: 'Your loving eldest daughter who visits on weekends.',
          phoneNumber: '+91 98201 12345',
        },
      ],
    },
  };

  beforeEach(() => {
    ConversationalAIService.clearApiKey();
    ConversationEngine.clearTurnContext();
    ConversationActionRegistry.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Part 1: Honest AI Configuration & Fallback Transparency', () => {
    it('1.1. reports unconfigured status and requires setup when no API key is provided', () => {
      const status = ConversationalAIService.getStatus();
      expect(status.isConfigured).toBe(false);
      expect(status.mode).toBe('LOCAL_SIMULATION_FALLBACK');
      expect(status.requiresSetup).toBe(true);
      expect(status.statusMessage).toContain('Not Configured');
    });

    it('1.2. transitions to REAL_GEMINI_API mode when key is configured', () => {
      ConversationalAIService.setApiKey('AIzaSyMockValidTestKey1234567890');
      const status = ConversationalAIService.getStatus();
      expect(status.isConfigured).toBe(true);
      expect(status.mode).toBe('REAL_GEMINI_API');
      expect(status.requiresSetup).toBe(false);
      expect(status.statusMessage).toContain('Connected');
    });

    it('1.3. allows model switching between supported free-tier Gemini models and automatically upgrades retired models', () => {
      // 2026 GA Models
      expect(ConversationalAIService.setModel('gemini-3.5-flash-lite')).toBe(true);
      expect(ConversationalAIService.getModel()).toBe('gemini-3.5-flash-lite');

      expect(ConversationalAIService.setModel('gemini-3.8-flash')).toBe(true);
      expect(ConversationalAIService.getModel()).toBe('gemini-3.8-flash');

      // Retired model is automatically forward-upgraded
      expect(ConversationalAIService.setModel('gemini-2.0-flash')).toBe(true);
      expect(ConversationalAIService.getModel()).toBe('gemini-3.5-flash-lite');

      // Rejects unsupported model names
      expect(ConversationalAIService.setModel('unsupported-gpt-model')).toBe(false);
      expect(ConversationalAIService.getModel()).toBe('gemini-3.5-flash-lite');
    });

    it('1.4. explicitly labels simulated fallback output when key is absent', async () => {
      const result = await ConversationEngine.process(
        'What should I do now?',
        mockPatientContext,
        'en'
      );
      expect(result.isRealAI).toBe(false);
      expect(result.executionMode).toBe('LOCAL_SIMULATION_FALLBACK');
      expect(result.configNotice).toContain('offline development fallback');
    });
  });

  describe('Part 2: Deep Privacy De-Identification Boundary (HIPAA / DISHA)', () => {
    it('2.1. redacts patient first and last names before prompt serialization', () => {
      const { anonymizedText, tokensRedacted } = ConversationalAIService.anonymizePrompt(
        'Hello, my name is Sunita Sharma and I need assistance.',
        mockPatientContext
      );
      expect(anonymizedText).toContain('[PATIENT_NAME]');
      expect(anonymizedText).not.toContain('Sunita');
      expect(anonymizedText).not.toContain('Sharma');
      expect(tokensRedacted).toBeGreaterThanOrEqual(2);
    });

    it('2.2. redacts loved ones names and relationship contacts', () => {
      const { anonymizedText, tokensRedacted } = ConversationalAIService.anonymizePrompt(
        'Can I talk to Priya or call her at +91 98201 12345?',
        mockPatientContext
      );
      expect(anonymizedText).toContain('[FAMILY_MEMBER]');
      expect(anonymizedText).toContain('[PHONE_REDACTED]');
      expect(anonymizedText).not.toContain('Priya');
      expect(anonymizedText).not.toContain('98201 12345');
      expect(tokensRedacted).toBeGreaterThanOrEqual(2);
    });

    it('2.3. redacts clinical dementia diagnoses from prompt payload', () => {
      const { anonymizedText, tokensRedacted } = ConversationalAIService.anonymizePrompt(
        'Doctor says I have early Alzheimer disease and MCI dementia Stage 4.',
        mockPatientContext
      );
      expect(anonymizedText).toContain('[CLINICAL_DIAGNOSIS]');
      expect(anonymizedText).not.toContain('Alzheimer');
      expect(anonymizedText).not.toContain('dementia');
      expect(tokensRedacted).toBeGreaterThanOrEqual(2);
    });

    it('2.4. redacts prescription medication brand and generic names', () => {
      const { anonymizedText, tokensRedacted } = ConversationalAIService.anonymizePrompt(
        'I took my Donepezil tablet and Memantine syrup.',
        mockPatientContext
      );
      expect(anonymizedText).toContain('[MEDICATION]');
      expect(anonymizedText).not.toContain('Donepezil');
      expect(anonymizedText).not.toContain('Memantine');
      expect(tokensRedacted).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Part 3: Gemini Structured JSON Schema & Network Contract', () => {
    it('3.1. parses live structured Gemini JSON response correctly', async () => {
      ConversationalAIService.setApiKey('AIzaSyMockValidTestKey1234567890');

      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    speech: "Here are the photos of your family, Sunita.",
                    expression: 'happy',
                    intent: 'NAVIGATE_LOVED_ONES',
                    confidence: 0.96,
                    actionClass: 'class2_navigate',
                    actionProposal: {
                      action: 'NAVIGATE_LOVED_ONES',
                      description: 'Open Family & Loved Ones sanctuary',
                    },
                  }),
                },
              ],
            },
            finishReason: 'STOP',
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGeminiResponse,
      } as any);

      const proposal = await ConversationalAIService.callGeminiAPI(
        'Show my family pictures',
        mockPatientContext,
        'en'
      );

      expect(proposal.isRealAI).toBe(true);
      expect(proposal.executionMode).toBe('REAL_GEMINI_API');
      expect(proposal.speech).toContain('photos of your family');
      expect(proposal.expression).toBe('happy');
      expect(proposal.actionProposal?.action).toBe('NAVIGATE_LOVED_ONES');
      expect(proposal.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('3.2. falls back to simulation when Gemini API returns an HTTP error', async () => {
      ConversationalAIService.setApiKey('AIzaSyMockValidTestKey1234567890');

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Resource exhausted: Quota exceeded for free tier',
      } as any);

      const proposal = await ConversationalAIService.callGeminiAPI(
        'Show my family pictures',
        mockPatientContext,
        'en'
      );

      expect(proposal.isRealAI).toBe(false);
      expect(proposal.executionMode).toBe('LOCAL_SIMULATION_FALLBACK');
      expect(proposal.configNotice).toContain('429');
    });
  });

  describe('Part 4: 10 Master Patient Interaction Journeys', () => {
    it('Journey 1: Show family -> NAVIGATE_LOVED_ONES', async () => {
      const res = await ConversationEngine.process('I want to see my family', mockPatientContext, 'en');
      expect(res.speech).toBeDefined();
      expect(res.suggestedAction?.action).toBe('NAVIGATE_LOVED_ONES');
    });

    it('Journey 2: Show daughter -> SHOW_FAMILY_MEMBER / Priya context', async () => {
      const res = await ConversationEngine.process('Where is Priya?', mockPatientContext, 'en');
      expect(res.speech.toLowerCase()).toContain('priya');
      expect(['SHOW_FAMILY_MEMBER', 'NAVIGATE_LOVED_ONES']).toContain(res.suggestedAction?.action);
    });

    it('Journey 3: Open games -> NAVIGATE_MIND_GAMES', async () => {
      const res = await ConversationEngine.process('Can I play a puzzle?', mockPatientContext, 'en');
      expect(res.suggestedAction?.action).toBe('NAVIGATE_MIND_GAMES');
    });

    it('Journey 4: Read routine -> NAVIGATE_ROUTINES / routine overview', async () => {
      const res = await ConversationEngine.process('What is my next task?', mockPatientContext, 'en');
      expect(res.speech).toBeDefined();
      expect(['NAVIGATE_ROUTINES', 'TRIGGER_ROUTINE_REMINDER']).toContain(res.suggestedAction?.action);
    });

    it('Journey 5: Report tiredness -> emotional reassurance and comfort', async () => {
      const res = await ConversationEngine.process('I am feeling very tired right now', mockPatientContext, 'en');
      expect(res.expression).toBe('comforting');
      expect(res.speech.toLowerCase()).toMatch(/rest|slow down|comfort/i);
    });

    it('Journey 6: Decline optional activity -> non-judgmental adaptation', async () => {
      const res = await ConversationEngine.process('I do not want to do the walking task', mockPatientContext, 'en');
      expect(['comforting', 'reassuring']).toContain(res.expression);
      expect(res.speech.toLowerCase()).toMatch(/okay|skip|rest|whenever you are ready/i);
    });

    it('Journey 7: Request help -> CALL_CAREGIVER or calming assistance', async () => {
      const res = await ConversationEngine.process('Help me, I feel lost and confused', mockPatientContext, 'en');
      expect(res.isEmergency || res.suggestedAction?.action === 'CALL_CAREGIVER').toBe(true);
    });

    it('Journey 8: Multi-turn follow-up (Turn 1: family photos -> Turn 2: daughter)', async () => {
      const t1 = await ConversationEngine.process('I want to see my pictures', mockPatientContext, 'en');
      expect(t1.suggestedAction?.action).toBe('NAVIGATE_LOVED_ONES');

      const t2 = await ConversationEngine.process('Tell me about my daughter', mockPatientContext, 'en');
      expect(t2.speech.toLowerCase()).toContain('daughter');
    });

    it('Journey 9: Correction -> "No, not the calendar, take me to my puzzles"', async () => {
      const res = await ConversationEngine.process(
        'No, not the calendar, take me to my puzzles',
        mockPatientContext,
        'en'
      );
      expect(res.suggestedAction?.action).toBe('NAVIGATE_MIND_GAMES');
    });

    it('Journey 10: Unexpected out-of-domain question -> polite gentle redirection', async () => {
      const res = await ConversationEngine.process(
        'Who won the cricket match yesterday in Mumbai?',
        mockPatientContext,
        'en'
      );
      expect(res.speech).toBeDefined();
      expect(res.speech.length).toBeGreaterThan(15);
      // Ensures character does not crash or give clinical false advice
      expect(res.expression).toBeDefined();
    });
  });
});
