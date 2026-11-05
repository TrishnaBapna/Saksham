import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssistanceTrayModal } from '../features/routines/AssistanceTrayModal.js';
import { RoutineItem } from '../types/index.js';

describe('AssistanceTrayModal (3-Chance Assisted Recall)', () => {
  const mockRoutine: RoutineItem = {
    id: 'routine-test-11am',
    title: 'Morning Hydration & Gentle Stretches',
    scheduledTime: '11:00 AM',
    category: 'exercise',
    streakCount: 3,
    isCompleted: false,
    enableAssistedRecall: true,
    recallCues: {
      hint1: 'Gentle clue number 1 for hydration',
      hint2: 'Visual clue number 2 showing water glass',
      hint3: 'Direct instruction number 3 to drink water',
    },
  };

  it('renders level 1 hint initially and displays the routine title', () => {
    const handleClose = vi.fn();
    const handleFeedback = vi.fn();

    render(
      <AssistanceTrayModal
        isOpen={true}
        routine={mockRoutine}
        onClose={handleClose}
        onFeedback={handleFeedback}
      />
    );

    expect(screen.getByText('3-Chance Assisted Recall')).toBeInTheDocument();
    expect(screen.getByText('Morning Hydration & Gentle Stretches')).toBeInTheDocument();
    expect(screen.getByText(/Gentle clue number 1 for hydration/i)).toBeInTheDocument();
  });

  it('advances through progressive assistance levels (1 -> 2 -> 3)', () => {
    const handleClose = vi.fn();
    const handleFeedback = vi.fn();

    render(
      <AssistanceTrayModal
        isOpen={true}
        routine={mockRoutine}
        onClose={handleClose}
        onFeedback={handleFeedback}
      />
    );

    // Initial is attempt 1
    const needMoreHelpBtn = screen.getByText(/Reveal Attempt 2 Clue/i);
    fireEvent.click(needMoreHelpBtn);

    // Now attempt 2 hint should be shown
    expect(screen.getByText(/Visual clue number 2 showing water glass/i)).toBeInTheDocument();

    // Advance to attempt 3
    const revealAttempt3Btn = screen.getByText(/Reveal Attempt 3 Clue/i);
    fireEvent.click(revealAttempt3Btn);

    // Now attempt 3 hint should be shown
    expect(screen.getByText(/Direct instruction number 3 to drink water/i)).toBeInTheDocument();
  });

  it('records helpful feedback properly', () => {
    const handleClose = vi.fn();
    const handleFeedback = vi.fn();

    render(
      <AssistanceTrayModal
        isOpen={true}
        routine={mockRoutine}
        onClose={handleClose}
        onFeedback={handleFeedback}
      />
    );

    const helpfulBtn = screen.getByText('Helpful');
    fireEvent.click(helpfulBtn);

    expect(handleFeedback).toHaveBeenCalledWith('helpful', 1);
  });
});
