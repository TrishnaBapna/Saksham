import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { IntentRegistry } from '../features/ai-companion/services/intentRegistry.js';
import { AdaptiveSupportService } from '../features/adaptive/services/adaptiveSupportService.js';
import { PatientContext } from '../services/patientContextService.js';

describe('Stage 3 Phase B: ASHA Adaptive Support & Multilingual Intent Recognition', () => {
  const patientId = 'asha-test-patient-01';

  const mockContext = {
    patientId,
    patientName: 'Sunita Sharma',
    timezone: 'Asia/Kolkata',
    routines: {
      activeRoutine: {
        id: 'routine-03',
        title: 'Buttoning Shirt & Morning Dressing',
        scheduledTime: '09:00 AM',
        category: 'motor',
        period: 'morning',
        streakCount: 4,
        isCompleted: false,
        steps: [
          '1. Spread your shirt flat across your lap and take a slow breath.',
          '2. Line up the bottom button and hole carefully with both hands.',
          '3. Push the button through gently, resting hands after each button.',
        ],
      },
      completedCount: 1,
      totalCount: 3,
      progress: {
        completed: 1,
        total: 3,
        remaining: 2,
        percentage: 33,
      },
    },
    mindGames: {
      totalPlayed: 5,
    },
    lovedOnes: {
      lovedOnes: [
        {
          id: 'lo-01',
          name: 'Priya Sharma',
          relationship: 'Daughter / Primary Caregiver',
          phoneNumber: '+91 98765 43210',
        },
      ],
    },
  } as unknown as PatientContext;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    AdaptiveSupportService.clearCache();
  });

  describe('1. English Intent Recognition & Processing', () => {
    it('recognizes INSTRUCTION_REPEAT and repeats current step with guiding expression', async () => {
      const match = IntentRegistry.match('can you repeat the instruction please');
      expect(match.intent).toBe('INSTRUCTION_REPEAT');

      const res = await ConversationEngine.process('repeat the step', mockContext, 'en');
      expect(res.intent).toBe('INSTRUCTION_REPEAT');
      expect(res.expression).toBe('guiding');
      expect(res.speech).toContain('Spread your shirt flat across your lap');
      expect(res.speech).not.toMatch(/dementia|decline|impairment|deterioration/i);
    });

    it('recognizes ASSISTANCE_HINT and returns gentle, non-punitive hint', async () => {
      const match = IntentRegistry.match('give me a hint');
      expect(match.intent).toBe('ASSISTANCE_HINT');

      const res = await ConversationEngine.process('give me a hint please', mockContext, 'en');
      expect(res.intent).toBe('ASSISTANCE_HINT');
      expect(res.expression).toBe('encouraging');
      expect(res.speech).toContain('gentle hint');
    });

    it('recognizes ADAPTATION_MAKE_EASIER and adjusts to calmer level', async () => {
      const match = IntentRegistry.match('make this easier for me');
      expect(match.intent).toBe('ADAPTATION_MAKE_EASIER');

      const res = await ConversationEngine.process('this is too hard make it easier', mockContext, 'en');
      expect(res.intent).toBe('ADAPTATION_MAKE_EASIER');
      expect(res.expression).toBe('comforting');
      expect(res.speech).toContain('gentler, more peaceful pace');
    });

    it('recognizes ADAPTATION_KEEP_LEVEL and confirms familiar version', async () => {
      const match = IntentRegistry.match('keep the same level');
      expect(match.intent).toBe('ADAPTATION_KEEP_LEVEL');

      const res = await ConversationEngine.process('do not change level keep familiar', mockContext, 'en');
      expect(res.intent).toBe('ADAPTATION_KEEP_LEVEL');
      expect(res.expression).toBe('reassuring');
      expect(res.speech).toContain('familiar, comfortable level exactly as it is');
    });

    it('recognizes ADAPTATION_TRY_HARDER and offers optional next level without coercion', async () => {
      const match = IntentRegistry.match('i want to try something harder');
      expect(match.intent).toBe('ADAPTATION_TRY_HARDER');

      const res = await ConversationEngine.process('next level please', mockContext, 'en');
      expect(res.intent).toBe('ADAPTATION_TRY_HARDER');
      expect(res.expression).toBe('encouraging');
      expect(res.speech).toContain('You are very welcome to explore the next level');
    });

    it('recognizes WELLBEING_REST_BREAK and initiates two-minute rest', async () => {
      const match = IntentRegistry.match('take a break');
      expect(match.intent).toBe('WELLBEING_REST_BREAK');

      const res = await ConversationEngine.process('let me rest for two minutes', mockContext, 'en');
      expect(res.intent).toBe('WELLBEING_REST_BREAK');
      expect(res.expression).toBe('comforting');
      expect(res.speech).toContain('peaceful two-minute rest');
    });

    it('recognizes ADAPTATION_RESTORE_PREVIOUS and restores previous configuration', async () => {
      const match = IntentRegistry.match('restore the previous version');
      expect(match.intent).toBe('ADAPTATION_RESTORE_PREVIOUS');

      const res = await ConversationEngine.process('go back to how it was', mockContext, 'en');
      expect(res.intent).toBe('ADAPTATION_RESTORE_PREVIOUS');
      expect(res.expression).toBe('reassuring');
      expect(res.speech).toContain('restored your familiar configuration');
    });

    it('recognizes ADAPTATION_DECLINE_CHANGE and keeps routine intact', async () => {
      const match = IntentRegistry.match('do not change this activity');
      expect(match.intent).toBe('ADAPTATION_DECLINE_CHANGE');

      const res = await ConversationEngine.process('decline the change no change please', mockContext, 'en');
      expect(res.intent).toBe('ADAPTATION_DECLINE_CHANGE');
      expect(res.speech).toContain('No changes have been made');
    });

    it('recognizes QUERY_ACTIVITY_CHANGE_RATIONALE and explains calmly', async () => {
      const match = IntentRegistry.match('why is this different today');
      expect(match.intent).toBe('QUERY_ACTIVITY_CHANGE_RATIONALE');

      const res = await ConversationEngine.process('why did this change', mockContext, 'en');
      expect(res.intent).toBe('QUERY_ACTIVITY_CHANGE_RATIONALE');
      expect(res.speech).toContain('calmer and gentler');
    });
  });

  describe('2. Hindi Intent Recognition & Processing (Devanagari & Transliterated)', () => {
    it('recognizes Hindi instruction repeat in Devanagari and transliteration', async () => {
      const match1 = IntentRegistry.match('निर्देश दोबारा बताएं');
      expect(match1.intent).toBe('INSTRUCTION_REPEAT');

      const match2 = IntentRegistry.match('fir se bolo');
      expect(match2.intent).toBe('INSTRUCTION_REPEAT');

      const res = await ConversationEngine.process('निर्देश फिर से बताओ', mockContext, 'hi');
      expect(res.speech).toContain('बिल्कुल! यह है आपका अगला चरण');
    });

    it('recognizes Hindi hint request in Devanagari and transliteration', async () => {
      const match1 = IntentRegistry.match('मुझे एक संकेत दीजिए');
      expect(match1.intent).toBe('ASSISTANCE_HINT');

      const match2 = IntentRegistry.match('ek hint do');
      expect(match2.intent).toBe('ASSISTANCE_HINT');

      const res = await ConversationEngine.process('संकेत दो', mockContext, 'hi');
      expect(res.speech).toContain('चिंता मत कीजिए, यह रहा एक छोटा संकेत');
    });

    it('recognizes Hindi request to make activity easier', async () => {
      const match = IntentRegistry.match('इसे थोड़ा आसान बनाओ');
      expect(match.intent).toBe('ADAPTATION_MAKE_EASIER');

      const res = await ConversationEngine.process('thoda aasan karo', mockContext, 'hi');
      expect(res.speech).toContain('अधिक आसान और शांत बना दिया है');
    });

    it('recognizes Hindi request to keep familiar level', async () => {
      const match = IntentRegistry.match('यही स्तर रखो');
      expect(match.intent).toBe('ADAPTATION_KEEP_LEVEL');

      const res = await ConversationEngine.process('yahi level rakho', mockContext, 'hi');
      expect(res.speech).toContain('हम आपके जाने-पहचाने स्तर पर ही रहेंगे');
    });

    it('recognizes Hindi request for rest break', async () => {
      const match = IntentRegistry.match('थोड़ा विश्राम चाहिए');
      expect(match.intent).toBe('WELLBEING_REST_BREAK');

      const res = await ConversationEngine.process('break chahiye', mockContext, 'hi');
      expect(res.speech).toContain('दो मिनट का विश्राम लीजिए');
    });

    it('recognizes Hindi request to restore previous version', async () => {
      const match = IntentRegistry.match('पहले जैसा कर दो');
      expect(match.intent).toBe('ADAPTATION_RESTORE_PREVIOUS');

      const res = await ConversationEngine.process('pehle jaisa karo', mockContext, 'hi');
      expect(res.speech).toContain('सब कुछ पहले जैसा कर दिया है');
    });

    it('recognizes Hindi inquiry regarding activity change rationale', async () => {
      const match = IntentRegistry.match('आज यह अलग क्यों है');
      expect(match.intent).toBe('QUERY_ACTIVITY_CHANGE_RATIONALE');

      const res = await ConversationEngine.process('alag kyu hai', mockContext, 'hi');
      expect(res.speech).toContain('अधिक शांत और सरल बनाते हैं');
    });
  });

  describe('3. Marathi Intent Recognition & Processing (Devanagari & Transliterated)', () => {
    it('recognizes Marathi instruction repeat in Devanagari and transliteration', async () => {
      const match1 = IntentRegistry.match('सूचना परत सांगा');
      expect(match1.intent).toBe('INSTRUCTION_REPEAT');

      const match2 = IntentRegistry.match('punha sanga');
      expect(match2.intent).toBe('INSTRUCTION_REPEAT');

      const res = await ConversationEngine.process('पुन्हा सांगा', mockContext, 'mr');
      expect(res.speech).toContain('नक्की! ही आहे पुढची पायरी');
    });

    it('recognizes Marathi hint request', async () => {
      const match1 = IntentRegistry.match('मला एक संकेत द्या');
      expect(match1.intent).toBe('ASSISTANCE_HINT');

      const match2 = IntentRegistry.match('hint dya');
      expect(match2.intent).toBe('ASSISTANCE_HINT');

      const res = await ConversationEngine.process('क्लू सांगा', mockContext, 'mr');
      expect(res.speech).toContain('काळजी करू नका, हा घ्या एक लहानसा क्लू');
    });

    it('recognizes Marathi request to make activity easier', async () => {
      const match = IntentRegistry.match('हे थोडे सोपे करा');
      expect(match.intent).toBe('ADAPTATION_MAKE_EASIER');

      const res = await ConversationEngine.process('sope kara', mockContext, 'mr');
      expect(res.speech).toContain('अधिक सोपी आणि शांत केली आहे');
    });

    it('recognizes Marathi request to keep familiar level', async () => {
      const match = IntentRegistry.match('हीच पातळी ठेवा');
      expect(match.intent).toBe('ADAPTATION_KEEP_LEVEL');

      const res = await ConversationEngine.process('hich patali theva', mockContext, 'mr');
      expect(res.speech).toContain('आपल्या नेहमीच्या परिचयाच्या पातळीवरच राहू');
    });

    it('recognizes Marathi rest break request', async () => {
      const match = IntentRegistry.match('थोडा वेळ विश्रांती घेऊया');
      expect(match.intent).toBe('WELLBEING_REST_BREAK');

      const res = await ConversationEngine.process('vishranti dya', mockContext, 'mr');
      expect(res.speech).toContain('दोन मिनिटे विश्रांती घ्या');
    });

    it('recognizes Marathi request to restore previous configuration', async () => {
      const match = IntentRegistry.match('आधीसारखे करा');
      expect(match.intent).toBe('ADAPTATION_RESTORE_PREVIOUS');

      const res = await ConversationEngine.process('adhisarkhe kara', mockContext, 'mr');
      expect(res.speech).toContain('मी सर्व काही आधीसारखे पूर्ववत केले आहे');
    });
  });

  describe('4. Ambiguity, Clarification & Safety Guardrails', () => {
    it('returns clarifying options for ambiguous queries without executing changes', async () => {
      const match = IntentRegistry.match('show me that');
      expect(match.intent).toBe('AMBIGUOUS_QUERY');

      const res = await ConversationEngine.process('open that', mockContext, 'en');
      expect(res.intent).toBe('AMBIGUOUS_QUERY');
      expect(res.expression).toBe('clarifying');
      expect(res.clarificationOptions).toBeDefined();
      expect(res.clarificationOptions?.length).toBeGreaterThan(0);
    });

    it('returns unknown fallback with helpful safe choices for unrecognized queries', async () => {
      const res = await ConversationEngine.process('random gibberish xyz abc 123', mockContext, 'en');
      expect(res.intent).toBe('UNKNOWN_FALLBACK');
      expect(res.expression).toBe('reassuring');
      expect(res.clarificationOptions).toBeDefined();
    });

    it('never contains clinical or diagnostic disease progression labels in verbal responses', async () => {
      const queries = [
        'make this easier',
        'repeat the step',
        'give me a hint',
        'why did this change',
        'restore previous level',
      ];

      for (const q of queries) {
        const enRes = await ConversationEngine.process(q, mockContext, 'en');
        expect(enRes.speech).not.toMatch(/dementia|alzheimer|deteriorat|decline|impairment|deficit|score|failing/i);

        const hiRes = await ConversationEngine.process(q, mockContext, 'hi');
        expect(hiRes.speech).not.toMatch(/डिमेंशिया|अल्ज़ाइमर|गिरावट|बीमारी|कमजोरी/i);
      }
    });
  });
});
