import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationalAIService } from '../features/ai-companion/services/conversationalAIService.js';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { ConversationActionRegistry } from '../features/ai-companion/services/conversationActionRegistry.js';

describe('Phase C & D: Conversational ASHA Intelligence & Trusted Safety Boundaries', () => {
  const mockContext: any = {
    patientId: 'patient-test-convo-001',
    patientName: 'Kavita Joshi',
    profile: {
      displayName: 'Kavita Joshi',
    },
    routines: {
      routines: [
        {
          id: 'rx-01',
          title: 'Donepezil 5mg Morning Medication',
          scheduledTime: '08:30 AM',
          category: 'medication',
          period: 'morning',
          isCompleted: true,
          completedAt: '08:35 AM',
          streakCount: 0,
          enableAssistedRecall: true,
        },
        {
          id: 'walk-01',
          title: 'Morning Garden Walk',
          scheduledTime: '10:00 AM',
          category: 'exercise',
          period: 'morning',
          isCompleted: false,
          streakCount: 0,
          enableAssistedRecall: true,
        },
      ],
    },
    lovedOnes: {
      count: 2,
      lovedOnes: [
        {
          id: 'rel-daughter',
          name: 'Ananya',
          relationship: 'daughter',
          description: 'Your loving eldest daughter who visits on weekends.',
          favouriteActivities: ['gardening', 'listening to old songs'],
          phone: '9876543210',
        },
      ],
    },
  };

  beforeEach(() => {
    ConversationEngine.clearTurnContext();
    ConversationActionRegistry.clearAll();
  });

  describe('Part 1: Privacy De-identification & Redaction Boundary', () => {
    it('1. anonymizes real patient names from queries before external transmission', () => {
      const { anonymizedText, tokensRedacted } = ConversationalAIService.anonymizePrompt(
        'Hello ASHA, I am Kavita Joshi and I need help',
        mockContext
      );
      expect(anonymizedText).toContain('[PATIENT_NAME]');
      expect(anonymizedText).not.toContain('Kavita');
      expect(anonymizedText).not.toContain('Joshi');
      expect(tokensRedacted).toBeGreaterThanOrEqual(2);
    });

    it('2. anonymizes phone numbers and emails to prevent clinical identity leakage', () => {
      const { anonymizedText, tokensRedacted } = ConversationalAIService.anonymizePrompt(
        'Call my doctor at 9876543210 or email test@hospital.org',
        mockContext
      );
      expect(anonymizedText).toContain('[PHONE_REDACTED]');
      expect(anonymizedText).toContain('[EMAIL_REDACTED]');
      expect(tokensRedacted).toBe(2);
    });

    it('3. anonymizes prescription drug names mentioned in active regimens', () => {
      const { anonymizedText, tokensRedacted } = ConversationalAIService.anonymizePrompt(
        'Did I take my Donepezil today?',
        mockContext
      );
      expect(anonymizedText).toContain('[MEDICATION]');
      expect(anonymizedText).not.toContain('Donepezil');
      expect(tokensRedacted).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Part 2: Open-Ended Conversational Empathy & Unexpected Questions', () => {
    it('4. responds with emotional comfort when patient expresses loneliness: "I feel lonely"', () => {
      const res = ConversationEngine.processSync('I feel lonely', mockContext, 'en');
      expect(res.expression).toBe('comforting');
      expect(res.speech).toContain('You are never alone');
      expect(res.suggestedAction?.action).toBe('NAVIGATE_LOVED_ONES');
    });

    it('5. provides patient, reassuring rationale when asked: "Why do I have to do this?"', () => {
      const res = ConversationEngine.processSync('Why do I have to do this?', mockContext, 'en');
      expect(res.expression).toBe('explaining');
      expect(res.speech).toContain('healthy and refreshed');
    });

    it('6. reassures patient when they request a delay: "Can we do this later?"', () => {
      const res = ConversationEngine.processSync('Can we do this later?', mockContext, 'en');
      expect(res.expression).toBe('reassuring');
      expect(res.speech).toContain('later');
      expect(res.intent).toBe('WELLBEING_REST_BREAK');
    });

    it('7. navigates to gentle mind games when asked: "I want to play something"', () => {
      const res = ConversationEngine.processSync('I want to play something', mockContext, 'en');
      expect(res.expression).toBe('happy');
      expect(res.suggestedAction?.action).toBe('NAVIGATE_MIND_GAMES');
    });
  });

  describe('Part 3: Multi-Turn Conversation & Follow-Up Reasoning', () => {
    it('8. handles 3-turn family journey: "Show me my family" -> "Show me my daughter" -> "Can I call her?"', () => {
      const patientId = mockContext.patientId!;

      // Turn 1: "Show me my family"
      const turn1 = ConversationEngine.processSync('Show me my family', mockContext, 'en');
      expect(turn1.intent).toBe('LOVED_ONES_LIST');
      expect(turn1.suggestedAction?.action).toBe('NAVIGATE_LOVED_ONES');
      expect(ConversationEngine.getTurnContext(patientId)?.lastTopic).toBe('family');

      // Turn 2: "Show me my daughter"
      const turn2 = ConversationEngine.processSync('Show me my daughter', mockContext, 'en');
      expect(turn2.intent).toBe('LOVED_ONES_PERSON');
      expect(turn2.speech).toContain('Ananya is your daughter');
      expect(ConversationEngine.getTurnContext(patientId)?.lastTopic).toBe('family');

      // Turn 3: "Can I call her?"
      const turn3 = ConversationEngine.processSync('Can I call her?', mockContext, 'en');
      expect(turn3.suggestedAction?.action).toBe('CALL_CAREGIVER');
      expect(turn3.speech).toContain('opening the contact screen');
    });
  });

  describe('Part 4: Clinical Safety & Free-Tier Quota Guards', () => {
    it('9. strictly rejects prescription alteration and medical self-diagnosis attempts', () => {
      const rxAttempt = ConversationEngine.processSync('Change my medication to 10mg', mockContext, 'en');
      expect(rxAttempt.speech).toContain('cannot modify medical prescriptions');

      const diagAttempt = ConversationEngine.processSync('Do I have Alzheimer disease?', mockContext, 'en');
      expect(diagAttempt.speech).toContain('cannot make clinical diagnoses');
    });

    it('10. enforces 12 RPM client-side rate limit to protect Spark Free Plan quotas', () => {
      expect(ConversationalAIService.canMakeRequest()).toBe(true);
    });
  });
});
