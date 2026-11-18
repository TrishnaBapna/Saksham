import { describe, it, expect, beforeEach } from 'vitest';
import { DailyWellbeingService } from '../features/adaptive/services/dailyWellbeingService.js';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { RoutineItem } from '../types/index.js';

describe('Phase E: Adaptive Daily Routine System & Inviolable Clinical Tasks', () => {
  const patientId = 'patient-adaptive-e-001';

  const sample8TaskRoutine: RoutineItem[] = [
    {
      id: 'morning-meds',
      title: 'Morning Blood Pressure & Memory Medication',
      scheduledTime: '08:00 AM',
      category: 'medication',
      period: 'morning',
      isCompleted: false,
      isClinicianPrescribed: true,
      isEssential: true,
      prescriptionRef: 'rx-cardio-01',
      streakCount: 0,
      enableAssistedRecall: true,
    },
    {
      id: 'gentle-walk',
      title: 'Gentle Garden Walk',
      scheduledTime: '09:30 AM',
      category: 'exercise',
      period: 'morning',
      isCompleted: false,
      isClinicianPrescribed: false,
      isEssential: false,
      streakCount: 0,
      enableAssistedRecall: true,
    },
    {
      id: 'midday-hydration',
      title: 'Hydration & Herbal Tea',
      scheduledTime: '11:30 AM',
      category: 'wellness',
      period: 'morning',
      isCompleted: false,
      isEssential: false,
      streakCount: 0,
      enableAssistedRecall: true,
    },
    {
      id: 'lunch-nourishment',
      title: 'Nutritious Lunch',
      scheduledTime: '01:00 PM',
      category: 'wellness',
      period: 'afternoon',
      isCompleted: false,
      isEssential: false,
      streakCount: 0,
      enableAssistedRecall: true,
    },
    {
      id: 'brain-exercise',
      title: 'Pattern Tap & Word Recall Mind Games',
      scheduledTime: '03:30 PM',
      category: 'cognitive',
      period: 'afternoon',
      isCompleted: false,
      isEssential: false,
      streakCount: 0,
      enableAssistedRecall: true,
    },
    {
      id: 'memory-reflection',
      title: 'Loved Ones Photo Album Reflection',
      scheduledTime: '05:00 PM',
      category: 'wellness',
      period: 'evening',
      isCompleted: false,
      isEssential: false,
      streakCount: 0,
      enableAssistedRecall: true,
    },
    {
      id: 'evening-meds',
      title: 'Evening Doctor-Prescribed Medication',
      scheduledTime: '08:00 PM',
      category: 'medication',
      period: 'evening',
      isCompleted: false,
      isClinicianPrescribed: true,
      isEssential: true,
      prescriptionRef: 'rx-neuro-02',
      streakCount: 0,
      enableAssistedRecall: true,
    },
    {
      id: 'night-rest',
      title: 'Calming Bedtime Preparation & Sleep Meditation',
      scheduledTime: '09:30 PM',
      category: 'wellness',
      period: 'evening',
      isCompleted: false,
      isEssential: false,
      streakCount: 0,
      enableAssistedRecall: true,
    },
  ];

  const mockContext: any = {
    patientId,
    patientName: 'Shanti Devi',
    profile: {
      displayName: 'Shanti Devi',
    },
    routines: {
      routines: sample8TaskRoutine,
    },
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    DailyWellbeingService.restoreFamiliarBaseline(patientId);
  });

  describe('1. Natural Wellbeing Statements & Adaptation', () => {
    it('adapts routines for fatigue when patient reports tiredness: "I am tired today"', () => {
      // Patient expresses fatigue
      const res = ConversationEngine.processSync('I am tired today', mockContext, 'en');
      expect(res.intent).toBe('WELLBEING_TIRED');
      expect(res.speech).toContain('rest comfortably');

      // Update condition to tired
      DailyWellbeingService.setDailyCondition(patientId, 'tired', 'Patient stated tiredness to ASHA');
      expect(DailyWellbeingService.isAdaptedForFatigue(patientId)).toBe(true);

      const adapted = DailyWellbeingService.adaptRoutinesForDailyCondition(sample8TaskRoutine, 'tired');
      expect(adapted.essentialCount).toBe(2); // Exactly morning and evening meds
      expect(adapted.postponedCount).toBe(6);  // 6 optional tasks flexible

      // Clinician prescribed tasks are NEVER postponed
      const morningMed = adapted.adaptedRoutines.find((r) => r.id === 'morning-meds');
      expect(morningMed?.isEssential).toBe(true);
      expect(morningMed?.adaptedForFatigue).toBe(false);

      // Optional walk is marked flexible
      const walk = adapted.adaptedRoutines.find((r) => r.id === 'gentle-walk');
      expect(walk?.isEssential).toBe(false);
      expect(walk?.adaptedForFatigue).toBe(true);
    });

    it('celebrates energy and suggests cognitive activity when patient says: "I feel energetic"', () => {
      const res = ConversationEngine.processSync('I feel energetic today', mockContext, 'en');
      expect(res.intent).toBe('ADAPTATION_TRY_HARDER');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);

      DailyWellbeingService.setDailyCondition(patientId, 'energetic');
      expect(DailyWellbeingService.getDailyCondition(patientId)).toBe('energetic');

      const adapted = DailyWellbeingService.adaptRoutinesForDailyCondition(sample8TaskRoutine, 'energetic');
      expect(adapted.postponedCount).toBe(0); // No tasks postponed
    });

    it('reassures patient when they refuse an optional activity: "I don\'t feel like walking"', () => {
      const res = ConversationEngine.processSync("I don't feel like walking today", mockContext, 'en');
      expect(res.intent).toBe('WELLBEING_REST_BREAK');
      expect(res.expression).toBe('comforting');
    });

    it('accepts delay request without guilt: "Can we do this after lunch?"', () => {
      const res = ConversationEngine.processSync('Can we do this after lunch?', mockContext, 'en');
      expect(res.speech).toContain('later');
      expect(res.expression).toBe('reassuring');
    });
  });

  describe('2. Inviolable Protection of Clinician-Prescribed Medication', () => {
    it('identifies clinician-prescribed tasks with 100% precision using patient-specific records', () => {
      const morningMed = sample8TaskRoutine[0];
      const gardenWalk = sample8TaskRoutine[1];
      const eveningMed = sample8TaskRoutine[6];

      expect(DailyWellbeingService.isEssentialTask(morningMed)).toBe(true);
      expect(DailyWellbeingService.isEssentialTask(eveningMed)).toBe(true);
      expect(DailyWellbeingService.isEssentialTask(gardenWalk)).toBe(false);
    });

    it('refuses to alter or drop medication even when fatigue is extreme', () => {
      const adapted = DailyWellbeingService.adaptRoutinesForDailyCondition(sample8TaskRoutine, 'tired');
      const medRoutines = adapted.adaptedRoutines.filter((r) => r.category === 'medication');

      expect(medRoutines).toHaveLength(2);
      medRoutines.forEach((med) => {
        expect(med.isEssential).toBe(true);
        expect(med.adaptedForFatigue).toBe(false);
      });
    });

    it('honestly reports completed medication status when queried: "Did I take my pills?"', () => {
      const completedContext: any = {
        ...mockContext,
        routines: {
          routines: [
            {
              ...sample8TaskRoutine[0],
              isCompleted: true,
              completedAt: '08:15 AM',
            },
            ...sample8TaskRoutine.slice(1),
          ],
        },
      };

      const res = ConversationEngine.processSync('Did I take my pills?', completedContext, 'en');
      expect(res.intent).toBe('ROUTINES_MEDICATION_STATUS');
      expect(res.speech).toContain('Yes!');
      expect(res.speech).toContain('08:15 AM');
    });
  });

  describe('3. Reversible Routine Challenges with 1-Tap Instant Restore', () => {
    it('restores baseline schedule in 1 tap without data loss', () => {
      // Step 1: Set tired
      DailyWellbeingService.setDailyCondition(patientId, 'tired');
      expect(DailyWellbeingService.isAdaptedForFatigue(patientId)).toBe(true);

      // Step 2: 1-Tap Instant Restore
      const restored = DailyWellbeingService.restoreFamiliarBaseline(patientId);
      expect(restored.condition).toBe('peaceful');
      expect(restored.isAdaptedForFatigue).toBe(false);
      expect(DailyWellbeingService.isAdaptedForFatigue(patientId)).toBe(false);

      const baseline = DailyWellbeingService.adaptRoutinesForDailyCondition(sample8TaskRoutine, 'peaceful');
      expect(baseline.postponedCount).toBe(0);
    });
  });
});
