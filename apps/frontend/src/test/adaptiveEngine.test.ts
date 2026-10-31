import { describe, it, expect } from 'vitest';
import { getAdaptiveAssistanceRecommendations } from '@/services/adaptiveAssistanceEngine';
import type { ReportedDifficultyRecord } from '@/types/firestore';

describe('Module 3: Adaptive Assistance Engine', () => {
  it('recommends options with high confidence based on user-approved helpful feedback', () => {
    const feedback: ReportedDifficultyRecord[] = [
      {
        id: '1',
        userId: 'u1',
        timestamp: new Date().toISOString(),
        difficultyCategory: 'instructions_complicated',
        assistanceSelected: 'step_by_step',
        helpfulRating: 'helpful',
        enteredBy: 'user',
      },
      {
        id: '2',
        userId: 'u1',
        timestamp: new Date().toISOString(),
        difficultyCategory: 'instructions_complicated',
        assistanceSelected: 'step_by_step',
        helpfulRating: 'helpful',
        enteredBy: 'user',
      },
    ];

    const result = getAdaptiveAssistanceRecommendations({
      task: { label: 'Medication Prep' },
      userProfile: { adaptiveAssistanceEnabled: true },
      recordedFeedback: feedback,
    });

    expect(result.adaptiveEnabled).toBe(true);
    expect(result.recommendedOptions.length).toBeGreaterThan(0);
    expect(result.primaryRecommendation?.category).toBe('step_by_step');
    expect(result.primaryRecommendation?.confidence).toBeGreaterThan(0.7);
    expect(result.primaryRecommendation?.explanation).toContain('rated this helpful on 2 past');
  });

  it('filters out assistance options the user explicitly rated unhelpful', () => {
    const feedback: ReportedDifficultyRecord[] = [
      {
        id: '1',
        userId: 'u1',
        timestamp: new Date().toISOString(),
        difficultyCategory: 'other',
        assistanceSelected: 'repeated_instructions',
        helpfulRating: 'unhelpful',
        enteredBy: 'user',
      },
    ];

    const result = getAdaptiveAssistanceRecommendations({
      task: { label: 'Walking Routine' },
      userProfile: { adaptiveAssistanceEnabled: true },
      recordedFeedback: feedback,
    });

    const categories = result.recommendedOptions.map((o) => o.category);
    expect(categories).not.toContain('repeated_instructions');
  });

  it('honors user toggle to disable adaptive assistance', () => {
    const result = getAdaptiveAssistanceRecommendations({
      task: { label: 'Water Intake' },
      userProfile: { adaptiveAssistanceEnabled: false },
    });

    expect(result.adaptiveEnabled).toBe(false);
    expect(result.recommendedOptions).toHaveLength(0);
    expect(result.explanation).toContain('disabled');
  });
});
