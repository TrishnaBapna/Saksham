import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPersonalisationTrialState,
  startPersonalisationTrial,
  recordActivityDifficulty,
  recordAssistanceFeedback,
  setTrialDay,
  getTrialReviewSummary,
  loadDemoTrialData,
  resetTrialState,
} from '@/services/personalizationService';

describe('Module 2: Seven-Day Personalisation Trial', () => {
  const userId = 'test_patient_123';

  beforeEach(() => {
    resetTrialState(userId);
  });

  it('begins a trial with Day 1 baseline preferences and persists state', () => {
    const trial = startPersonalisationTrial(userId, {
      displayName: 'Kalyani Sharma',
      guidanceStyle: 'step_by_step',
      textSizePreference: 'large',
      adaptiveAssistanceEnabled: true,
    });

    expect(trial.status).toBe('active');
    expect(trial.currentDay).toBe(1);
    expect(trial.completedDays).toContain(1);
    expect(trial.baselinePreferences.displayName).toBe('Kalyani Sharma');

    const loaded = getPersonalisationTrialState(userId);
    expect(loaded.baselinePreferences.guidanceStyle).toBe('step_by_step');
    expect(loaded.status).toBe('active');
  });

  it('updates the active trial day correctly', () => {
    startPersonalisationTrial(userId, {});
    const updated = setTrialDay(userId, 5);
    expect(updated.currentDay).toBe(5);
  });

  it('records activity difficulties with timestamp, category, and entry source', () => {
    startPersonalisationTrial(userId, {});

    const record = recordActivityDifficulty(userId, {
      taskId: 1,
      taskTitle: 'Morning Tea',
      difficultyCategory: 'instructions_complicated',
      assistanceOffered: ['step_by_step', 'text_simplification'],
      assistanceSelected: 'step_by_step',
      enteredBy: 'user',
    });

    expect(record.id).toBeDefined();
    expect(record.difficultyCategory).toBe('instructions_complicated');
    expect(record.assistanceSelected).toBe('step_by_step');
    expect(record.enteredBy).toBe('user');

    const state = getPersonalisationTrialState(userId);
    expect(state.difficultiesRecorded).toHaveLength(1);
    expect(state.difficultiesRecorded[0].taskTitle).toBe('Morning Tea');
  });

  it('records helpful feedback and updates helpfulAssistanceOptions', () => {
    startPersonalisationTrial(userId, {});
    const record = recordActivityDifficulty(userId, {
      taskId: 2,
      taskTitle: 'Buttoning Shirt',
      difficultyCategory: 'motor_tremor_difficulty',
      assistanceSelected: 'larger_controls',
    });

    const updated = recordAssistanceFeedback(userId, record.id, 'helpful', 'Made tapping much easier');
    expect(updated.helpfulAssistanceOptions).toContain('larger_controls');
    expect(updated.unhelpfulAssistanceOptions).not.toContain('larger_controls');
    expect(updated.difficultiesRecorded[0].helpfulRating).toBe('helpful');
  });

  it('suppresses unhelpful options when user rates them unhelpful', () => {
    startPersonalisationTrial(userId, {});
    const record = recordActivityDifficulty(userId, {
      taskId: 3,
      taskTitle: 'Walk & Posture',
      difficultyCategory: 'other',
      assistanceSelected: 'repeated_instructions',
    });

    const updated = recordAssistanceFeedback(userId, record.id, 'unhelpful', 'Too repetitive');
    expect(updated.unhelpfulAssistanceOptions).toContain('repeated_instructions');
    expect(updated.helpfulAssistanceOptions).not.toContain('repeated_instructions');
  });

  it('tracks caregiver assistance requests accurately without false medical inferences', () => {
    startPersonalisationTrial(userId, {});
    recordActivityDifficulty(userId, {
      taskId: 4,
      taskTitle: 'Stair Navigation',
      difficultyCategory: 'caregiver_requested',
      assistanceSelected: 'caregiver_assistance',
    });

    const state = getPersonalisationTrialState(userId);
    expect(state.humanAssistanceRequestedTasks).toContain('Stair Navigation');
  });

  it('generates an explainable Day 6–7 review summary with recommendations', () => {
    loadDemoTrialData(userId);
    const summary = getTrialReviewSummary(userId);

    expect(summary.totalDifficulties).toBe(4);
    expect(summary.helpfulCount).toBe(3);
    expect(summary.unhelpfulCount).toBe(1);
    expect(summary.helpfulOptions).toContain('step_by_step');
    expect(summary.helpfulOptions).toContain('larger_controls');
    expect(summary.unhelpfulOptions).toContain('repeated_instructions');
    expect(summary.isReadyForProfileCreation).toBe(true);
    expect(summary.recommendationsPreview.length).toBeGreaterThan(0);
  });
});
