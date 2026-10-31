import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { TaskCard } from '@/features/patient/components/TaskCard';
import type { Task } from '@/types/firestore';
import {
  resetTrialState,
  recordActivityDifficulty,
  recordAssistanceFeedback,
  getPersonalisationTrialState,
} from '@/services/personalizationService';
import { offlineSyncService } from '@/services/offlineSyncService';
import { getAdaptiveAssistanceRecommendations } from '@/services/adaptiveAssistanceEngine';

describe('Priority 2: In-Task Difficulty Reporting & Feedback Workflow', () => {
  const testUserId = 'test_patient_difficulty_202';
  const mockTask: Task = {
    id: 202,
    uid: 'uid_202',
    icon: '🍵',
    time: '09:00 AM',
    label: 'Morning Herbal Tea Preparation',
    status: 'pending',
    notes: 'Boil water and steep for 3 minutes',
  };

  beforeEach(() => {
    localStorage.clear();
    resetTrialState(testUserId);
    offlineSyncService.clearQueueForTesting();
    vi.restoreAllMocks();
  });

  // 1. Opening and cancelling the difficulty modal
  it('1. Opens difficulty modal and closes cleanly on cancel without saving', () => {
    render(
      <TaskCard
        task={mockTask}
        userId={testUserId}
        onComplete={() => {}}
        onSnooze={() => {}}
      />
    );

    // Initial state: modal is closed
    expect(screen.queryByRole('dialog')).toBeNull();

    // Click trigger
    const triggerBtn = screen.getByRole('button', { name: /Having trouble with this task\?/i });
    fireEvent.click(triggerBtn);

    // Modal is now open
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(screen.getByText(/Report Task Difficulty/i)).toBeDefined();
    expect(within(dialog).getByText(/Morning Herbal Tea Preparation/i)).toBeDefined();

    // Click cancel
    const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i });
    fireEvent.click(cancelBtn);

    // Modal closed
    expect(screen.queryByRole('dialog')).toBeNull();

    // Verify nothing was recorded
    const state = getPersonalisationTrialState(testUserId);
    expect(state.difficultiesRecorded.length).toBe(0);
  });

  // 2. Submitting each supported difficulty category
  const categories = [
    { value: 'memory', expectedDbCat: 'instructions_complicated', label: 'Memory' },
    { value: 'motor', expectedDbCat: 'buttons_hard_to_tap', label: 'Motor' },
    { value: 'sequence', expectedDbCat: 'sequence_hard_to_remember', label: 'Sequence' },
    { value: 'sensory', expectedDbCat: 'text_too_small', label: 'Sensory' },
    { value: 'other', expectedDbCat: 'other', label: 'Other' },
  ];

  categories.forEach(({ value, expectedDbCat, label }) => {
    it(`2. Submits difficulty category: ${label} (${value})`, () => {
      render(
        <TaskCard
          task={mockTask}
          userId={testUserId}
          onComplete={() => {}}
          onSnooze={() => {}}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Having trouble with this task\?/i }));

      // Select category
      const catSelect = screen.getByLabelText(/Difficulty category/i);
      fireEvent.change(catSelect, { target: { value } });

      // Enter note
      const notesInput = screen.getByLabelText(/Optional description/i);
      fireEvent.change(notesInput, { target: { value: `Felt difficulty in ${label}` } });

      // Select reporter
      const reporterSelect = screen.getByLabelText(/Reported by/i);
      fireEvent.change(reporterSelect, { target: { value: 'user' } });

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /Save & Adapt/i }));

      // Confirmation banner displayed
      const confirmation = screen.getByTestId('difficulty-save-confirmation');
      expect(confirmation).toBeDefined();
      expect(confirmation.textContent).toContain('Difficulty report saved successfully');

      // Verify saved state
      const state = getPersonalisationTrialState(testUserId);
      expect(state.difficultiesRecorded.length).toBe(1);
      const record = state.difficultiesRecorded[0];
      expect(record.taskId).toBe(202);
      expect(record.taskTitle).toBe('Morning Herbal Tea Preparation');
      expect(record.difficultyCategory).toBe(expectedDbCat);
      expect(record.notes).toBe(`Felt difficulty in ${label}`);
      expect(record.enteredBy).toBe('user');
    });
  });

  // 3. Saving correct task context, timestamp, and reporter
  it('3. Saves correct task context, valid timestamp, and caregiver reporter', () => {
    render(
      <TaskCard
        task={mockTask}
        userId={testUserId}
        onComplete={() => {}}
        onSnooze={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Having trouble with this task\?/i }));

    const reporterSelect = screen.getByLabelText(/Reported by/i);
    fireEvent.change(reporterSelect, { target: { value: 'caregiver' } });

    fireEvent.click(screen.getByRole('button', { name: /Save & Adapt/i }));

    const state = getPersonalisationTrialState(testUserId);
    const record = state.difficultiesRecorded[0];
    expect(record.taskId).toBe(202);
    expect(record.taskTitle).toBe('Morning Herbal Tea Preparation');
    expect(record.enteredBy).toBe('caregiver');

    // Valid ISO timestamp
    const date = new Date(record.timestamp);
    expect(isNaN(date.getTime())).toBe(false);
  });

  // 4. Persistence across reload
  it('4. Difficulty report survives page reload / re-mount', () => {
    recordActivityDifficulty(testUserId, {
      taskId: 202,
      taskTitle: 'Morning Herbal Tea Preparation',
      difficultyCategory: 'sequence_hard_to_remember',
      notes: 'Lost track of timer',
      enteredBy: 'user',
    });

    const { unmount } = render(
      <TaskCard
        task={mockTask}
        userId={testUserId}
        onComplete={() => {}}
        onSnooze={() => {}}
      />
    );
    unmount();

    // Re-mount (simulates reload)
    render(
      <TaskCard
        task={mockTask}
        userId={testUserId}
        onComplete={() => {}}
        onSnooze={() => {}}
      />
    );

    const reloadedState = getPersonalisationTrialState(testUserId);
    expect(reloadedState.difficultiesRecorded.length).toBe(1);
    expect(reloadedState.difficultiesRecorded[0].notes).toBe('Lost track of timer');
  });

  // 5. Offline report creation and later synchronization without duplicates
  it('5. Operates offline and synchronizes without duplicate records', async () => {
    // Start explicitly offline
    offlineSyncService.setOnlineStatusForTesting(false);

    // Record difficulty offline
    const record = recordActivityDifficulty(testUserId, {
      taskId: 202,
      taskTitle: 'Morning Herbal Tea Preparation',
      difficultyCategory: 'motor_tremor_difficulty',
      notes: 'Hand tremor during pouring',
    });

    // Check offline status
    expect(record.synced).toBe(false);
    const queue = offlineSyncService.getQueue(testUserId);
    expect(queue.length).toBe(1);
    expect(queue[0].status).toBe('pending');
    expect(queue[0].recordType).toBe('difficulty');

    // Enqueueing the same operationId again must deduplicate
    offlineSyncService.enqueueOperation(testUserId, 'difficulty', 'create', record, record.id);
    expect(offlineSyncService.getQueue(testUserId).length).toBe(1);

    // Process sync when online
    offlineSyncService.setOnlineStatusForTesting(true);
    await offlineSyncService.processQueue();

    // Queue operation is synced
    const syncedQueue = offlineSyncService.getQueue(testUserId);
    expect(syncedQueue[0].status).toBe('synced');

    // Record in local trial state is updated to synced: true
    const updatedState = getPersonalisationTrialState(testUserId);
    expect(updatedState.difficultiesRecorded.length).toBe(1);
    expect(updatedState.difficultiesRecorded[0].synced).toBe(true);
  });

  // 6. Difficulty reports reaching the adaptive engine and driving recommendations
  it('6. Difficulty report reaches adaptive engine and drives relevant recommendation upon feedback', () => {
    // Initial: no helpful feedback, engine returns no recommendation
    const initialRecs = getAdaptiveAssistanceRecommendations({
      task: mockTask,
      difficultyReports: [],
      recordedFeedback: [],
    });
    expect(initialRecs.recommendedOptions.length).toBe(0);

    // Record difficulty with step_by_step and confirmed helpful rating
    recordActivityDifficulty(testUserId, {
      taskId: 202,
      taskTitle: 'Morning Herbal Tea Preparation',
      difficultyCategory: 'sequence_hard_to_remember',
      assistanceOption: 'step_by_step',
      helpfulRating: 'helpful',
      notes: 'Step breakdown helps with timing',
    });

    const trialState = getPersonalisationTrialState(testUserId);
    const recs = getAdaptiveAssistanceRecommendations({
      task: mockTask,
      difficultyReports: trialState.difficultiesRecorded,
      recordedFeedback: trialState.difficultiesRecorded,
      helpfulAssistanceOptions: trialState.helpfulAssistanceOptions,
    });

    expect(recs.recommendedOptions.length).toBeGreaterThan(0);
    expect(recs.primaryRecommendation?.category).toBe('step_by_step');
    expect(recs.primaryRecommendation?.confidence).toBeGreaterThanOrEqual(0.75);
    expect(recs.primaryRecommendation?.description).toContain('Break task down');
  });

  // 7. Insufficient feedback does not produce fabricated recommendations
  it('7. Insufficient feedback does not produce fabricated recommendations', () => {
    // Record difficulty without helpful rating (unrated)
    recordActivityDifficulty(testUserId, {
      taskId: 202,
      taskTitle: 'Morning Herbal Tea Preparation',
      difficultyCategory: 'instructions_complicated',
      assistanceOption: 'text_simplification',
      helpfulRating: 'unrated',
    });

    const trialState = getPersonalisationTrialState(testUserId);
    const recs = getAdaptiveAssistanceRecommendations({
      task: mockTask,
      difficultyReports: trialState.difficultiesRecorded,
      recordedFeedback: trialState.difficultiesRecorded,
      userProfile: { adaptiveAssistanceEnabled: true },
    });

    expect(recs.recommendedOptions.length).toBe(0);
    expect(recs.primaryRecommendation).toBeUndefined();
  });

  // 8. Rejected assistance is suppressed and not recommended again
  it('8. Rejected assistance is suppressed and not recommended again', () => {
    recordAssistanceFeedback(testUserId, {
      activityId: '202',
      assistanceCategory: 'voice_guidance',
      helpfulRating: 'unhelpful',
      notes: 'Audio was too loud',
    });

    const trialState = getPersonalisationTrialState(testUserId);
    const recs = getAdaptiveAssistanceRecommendations({
      task: mockTask,
      difficultyReports: trialState.difficultiesRecorded,
      recordedFeedback: trialState.difficultiesRecorded,
      helpfulAssistanceOptions: trialState.helpfulAssistanceOptions,
      unhelpfulAssistanceOptions: trialState.unhelpfulAssistanceOptions,
    });

    const voiceCandidate = recs.recommendedOptions.find((o) => o.category === 'voice_guidance');
    expect(voiceCandidate).toBeUndefined();
  });

  // 9. Existing task completion still works after difficulty reporting
  it('9. Existing task completion still works correctly after reporting difficulty', () => {
    let completedTaskId: number | null = null;
    let snoozedTaskId: number | null = null;

    render(
      <TaskCard
        task={mockTask}
        userId={testUserId}
        onComplete={(id) => {
          completedTaskId = id;
        }}
        onSnooze={(id) => {
          snoozedTaskId = id;
        }}
      />
    );

    // Report a difficulty
    fireEvent.click(screen.getByRole('button', { name: /Having trouble with this task\?/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save & Adapt/i }));

    // Task is not marked completed yet
    expect(completedTaskId).toBeNull();

    // Click Complete
    const completeBtn = screen.getByRole('button', { name: /Mark Morning Herbal Tea Preparation as complete/i });
    fireEvent.click(completeBtn);
    expect(completedTaskId).toBe(202);

    // Click Snooze
    const snoozeBtn = screen.getByRole('button', { name: /Snooze Morning Herbal Tea Preparation/i });
    fireEvent.click(snoozeBtn);
    expect(snoozedTaskId).toBe(202);
  });
});
