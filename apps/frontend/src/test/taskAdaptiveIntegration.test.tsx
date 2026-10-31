import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from '@/features/patient/components/TaskCard';
import type { Task } from '@/types/firestore';
import {
  resetTrialState,
  recordActivityDifficulty,
  recordAssistanceFeedback,
  getPersonalisationTrialState,
} from '@/services/personalizationService';
import { offlineSyncService } from '@/services/offlineSyncService';

describe('Priority 1: TaskCard Adaptive Assistance Integration', () => {
  const testUserId = 'test_patient_adaptive_101';
  const mockTask: Task = {
    id: 101,
    uid: 'uid_123',
    icon: '💊',
    time: '08:00 AM',
    label: 'Morning Medication & Water',
    status: 'pending',
    notes: 'Take with full glass of water',
  };

  beforeEach(() => {
    localStorage.clear();
    resetTrialState(testUserId);
    vi.restoreAllMocks();
  });

  // Criterion 1: No recommendation appears when there is insufficient feedback
  it('1. No recommendation appears when there is insufficient feedback', () => {
    render(
      <TaskCard
        task={mockTask}
        userId={testUserId}
        onComplete={() => {}}
        onSnooze={() => {}}
      />
    );

    expect(screen.queryByTestId('adaptive-assistance-tray')).toBeNull();
    expect(screen.queryByText(/Assistance Available/i)).toBeNull();
  });

  // Criterion 2: An appropriate recommendation appears when trial feedback indicates a difficulty
  it('2. An appropriate recommendation appears when trial feedback indicates a difficulty', () => {
    // Record feedback for step_by_step
    recordActivityDifficulty(testUserId, {
      activityId: '101',
      difficultyType: 'sequence',
      assistanceOption: 'step_by_step',
      helpfulRating: 'helpful',
      notes: 'Difficult to remember the order',
    });

    render(
      <TaskCard
        task={mockTask}
        userId={testUserId}
        onComplete={() => {}}
        onSnooze={() => {}}
      />
    );

    const tray = screen.getByTestId('adaptive-assistance-tray');
    expect(tray).toBeDefined();
    expect(screen.getByText(/Assistance Available: 1-Step-At-A-Time Guidance/i)).toBeDefined();
  });

  // Criterion 3 & 4: Recommendation matches context and displays explainability text
  it('3 & 4. Recommendation matches task context and displays correct explainability text', () => {
    recordAssistanceFeedback(testUserId, {
      activityId: '101',
      assistanceCategory: 'larger_controls',
      helpfulRating: 'helpful',
    });

    render(
      <TaskCard
        task={mockTask}
        userId={testUserId}
        onComplete={() => {}}
        onSnooze={() => {}}
      />
    );

    expect(screen.getByText(/Why suggested:/i)).toBeDefined();
    expect(screen.getByText(/Enlarge buttons and spacing to make tapping comfortable/i)).toBeDefined();
  });

  // Criterion 5: "Try Assistance" applies the assistance option to the task
  it('5. "Try Assistance" applies the assistance option to the task', () => {
    recordAssistanceFeedback(testUserId, {
      activityId: '101',
      assistanceCategory: 'step_by_step',
      helpfulRating: 'helpful',
    });

    render(
      <TaskCard
        task={mockTask}
        userId={testUserId}
        onComplete={() => {}}
        onSnooze={() => {}}
      />
    );

    const tryBtn = screen.getByRole('button', { name: /Try Assistance/i });
    fireEvent.click(tryBtn);

    expect(screen.getByText(/Step-by-Step Breakdown:/i)).toBeDefined();
    expect(screen.getByText(/Assistance applied: step by step/i)).toBeDefined();
  });

  // Criterion 6: Rating as "Helpful" records feedback and increases confidence
  it('6. Rating as "Helpful" records feedback and updates trial state', () => {
    recordAssistanceFeedback(testUserId, {
      activityId: '101',
      assistanceCategory: 'voice_guidance',
      helpfulRating: 'helpful',
    });

    render(
      <TaskCard
        task={mockTask}
        userId={testUserId}
        onComplete={() => {}}
        onSnooze={() => {}}
      />
    );

    const helpfulBtn = screen.getByRole('button', { name: /👍 Helpful/i });
    fireEvent.click(helpfulBtn);

    const state = getPersonalisationTrialState(testUserId);
    expect(state.helpfulAssistanceOptions).toContain('voice_guidance');
  });

  // Criterion 7: Rating as "Not for me" suppresses the recommendation
  it('7. Rating as "Not for me" suppresses the recommendation for that activity', () => {
    recordAssistanceFeedback(testUserId, {
      activityId: '101',
      assistanceCategory: 'visual_cues',
      helpfulRating: 'helpful',
    });

    const { rerender } = render(
      <TaskCard
        task={mockTask}
        userId={testUserId}
        onComplete={() => {}}
        onSnooze={() => {}}
      />
    );

    expect(screen.getByTestId('adaptive-assistance-tray')).toBeDefined();

    const notForMeBtn = screen.getByRole('button', { name: /👎 Not for me/i });
    fireEvent.click(notForMeBtn);

    // Should be dismissed/suppressed immediately
    expect(screen.queryByTestId('adaptive-assistance-tray')).toBeNull();

    // Rerendering fresh also confirms suppression
    rerender(
      <TaskCard
        task={mockTask}
        userId={testUserId}
        onComplete={() => {}}
        onSnooze={() => {}}
      />
    );
    expect(screen.queryByTestId('adaptive-assistance-tray')).toBeNull();
  });

  // Criterion 8: Dismissing removes the recommendation without negative feedback
  it('8. Dismissing removes the recommendation without recording negative feedback', () => {
    recordAssistanceFeedback(testUserId, {
      activityId: '101',
      assistanceCategory: 'step_by_step',
      helpfulRating: 'helpful',
    });

    render(
      <TaskCard
        task={mockTask}
        userId={testUserId}
        onComplete={() => {}}
        onSnooze={() => {}}
      />
    );

    const dismissBtn = screen.getByRole('button', { name: /Dismiss recommendation/i });
    fireEvent.click(dismissBtn);

    expect(screen.queryByTestId('adaptive-assistance-tray')).toBeNull();

    const state = getPersonalisationTrialState(testUserId);
    expect(state.unhelpfulAssistanceOptions).not.toContain('step_by_step');
  });

  // Criterion 9: Recommendations persist across reload when stored locally
  it('9. Recommendations persist across reload when stored in localStorage', () => {
    recordActivityDifficulty(testUserId, {
      activityId: '101',
      difficultyType: 'motor',
      assistanceOption: 'larger_controls',
      helpfulRating: 'helpful',
      notes: 'Shaky hands',
    });

    // Simulate page reload by mounting a brand new TaskCard component instance
    const { unmount } = render(
      <TaskCard
        task={mockTask}
        userId={testUserId}
        onComplete={() => {}}
        onSnooze={() => {}}
      />
    );

    expect(screen.getByText(/Assistance Available: Larger Touch Targets/i)).toBeDefined();
    unmount();

    // Mount fresh
    render(
      <TaskCard
        task={mockTask}
        userId={testUserId}
        onComplete={() => {}}
        onSnooze={() => {}}
      />
    );
    expect(screen.getByText(/Assistance Available: Larger Touch Targets/i)).toBeDefined();
  });

  // Criterion 10: Recommendations and difficulty reports work offline and queue in offlineSyncService
  it('10. Operates offline and enqueues sync operations', () => {
    render(
      <TaskCard
        task={mockTask}
        userId={testUserId}
        onComplete={() => {}}
        onSnooze={() => {}}
      />
    );

    const troubleBtn = screen.getByRole('button', { name: /Having trouble with this task\?/i });
    fireEvent.click(troubleBtn);

    const submitBtn = screen.getByRole('button', { name: /Save & Adapt/i });
    fireEvent.click(submitBtn);

    // Verify offline queue has recorded the operation
    const queue = offlineSyncService.getQueue(testUserId);
    expect(queue.length).toBeGreaterThan(0);
    const hasDifficultyOp = queue.some((op) => op.recordType === 'difficulty');
    expect(hasDifficultyOp).toBe(true);
  });
});
