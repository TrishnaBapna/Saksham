import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GuidedTaskRunner } from '../features/routines/components/GuidedTaskRunner.js';
import { SpeechService } from '../services/speechService.js';
import { RoutineItem } from '../types/index.js';

describe('Phase 2.7: Adaptive Independence Challenge Engine Validation', () => {
  const mockRoutine: RoutineItem = {
    id: 'routine-morning-tea',
    title: 'Morning Cardamom Tea',
    description: 'Brew and enjoy a warm cup of cardamom tea peacefully.',
    scheduledTime: '08:30 AM',
    period: 'morning',
    category: 'activity',
    isCompleted: false,
    streakCount: 3,
    enableAssistedRecall: true,
    steps: [
      '1. Place tea cup and saucer steadily on the veranda table.',
      '2. Pour warm tea gently into the cup using both hands.',
      '3. Sit comfortably and sip slowly while looking at the garden.',
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(SpeechService, 'speak').mockImplementation(() => {});
    vi.spyOn(SpeechService, 'cancelSpeech').mockImplementation(() => {});
  });

  it('1. renders all 4 independence level buttons: Supported, Guided, Independent, Challenge', () => {
    render(
      <BrowserRouter>
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={() => {}}
          onFinish={() => {}}
          defaultViewMode="single"
          patientId="sunita_01"
        />
      </BrowserRouter>
    );

    expect(screen.getByTestId('ind-level-supported')).toBeInTheDocument();
    expect(screen.getByTestId('ind-level-guided')).toBeInTheDocument();
    expect(screen.getByTestId('ind-level-independent')).toBeInTheDocument();
    expect(screen.getByTestId('ind-level-challenge')).toBeInTheDocument();
  });

  it('2. switching to Supported mode opens detailed micro-action breakdown', () => {
    render(
      <BrowserRouter>
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={() => {}}
          onFinish={() => {}}
          defaultViewMode="single"
          patientId="sunita_01"
        />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId('ind-level-supported'));
    expect(screen.getByText(/Supported Mode: Full step breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/Detailed Step Breakdown/i)).toBeInTheDocument();
  });

  it('3. switching to Independent mode displays initiative banner with on-demand clue toggle', () => {
    render(
      <BrowserRouter>
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={() => {}}
          onFinish={() => {}}
          defaultViewMode="single"
          patientId="sunita_01"
        />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId('ind-level-independent'));
    expect(screen.getByText(/Independent Practice: Try taking initiative/i)).toBeInTheDocument();
    
    // Toggle clue
    const clueBtn = screen.getByRole('button', { name: /Need a Clue/i });
    expect(clueBtn).toBeInTheDocument();
    fireEvent.click(clueBtn);
    expect(screen.getByText(/Gentle Practice Clue/i)).toBeInTheDocument();
  });

  it('4. switching to Challenge mode displays goal memory banner', () => {
    render(
      <BrowserRouter>
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={() => {}}
          onFinish={() => {}}
          defaultViewMode="single"
          patientId="sunita_01"
        />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId('ind-level-challenge'));
    expect(screen.getByText(/Flexible Challenge: Try recalling this step/i)).toBeInTheDocument();
  });

  it('5. +5m button extends the active routine timer calmly', () => {
    render(
      <BrowserRouter>
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={() => {}}
          onFinish={() => {}}
          defaultViewMode="single"
          patientId="sunita_01"
        />
      </BrowserRouter>
    );

    const plus5Btn = screen.getByRole('button', { name: /\+5m/i });
    expect(plus5Btn).toBeInTheDocument();
    fireEvent.click(plus5Btn);
  });

  it('6. Rest 2m button initiates calming rest break to prevent cognitive fatigue', () => {
    render(
      <BrowserRouter>
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={() => {}}
          onFinish={() => {}}
          defaultViewMode="single"
          patientId="sunita_01"
        />
      </BrowserRouter>
    );

    const restBtn = screen.getByRole('button', { name: /Rest 2m|Take a 2-Minute Rest/i });
    expect(restBtn).toBeInTheDocument();
    fireEvent.click(restBtn);
    expect(screen.getByTestId('calming-rest-banner')).toBeInTheDocument();
  });

  it('7. enforces zero auto-complete: requires explicit confirmation dialog click before onFinish fires', () => {
    const mockOnFinish = vi.fn();
    render(
      <BrowserRouter>
        <GuidedTaskRunner
          routine={mockRoutine}
          isOpen={true}
          onClose={() => {}}
          onFinish={mockOnFinish}
          defaultViewMode="single"
          patientId="sunita_01"
        />
      </BrowserRouter>
    );

    // Click Complete Task
    const finishBtn = screen.getByRole('button', { name: /Complete Task/i });
    fireEvent.click(finishBtn);

    // Modal pops up, onFinish has NOT been called yet
    expect(screen.getByText(/Are you satisfied and ready to mark this routine activity completed/i)).toBeInTheDocument();
    expect(mockOnFinish).not.toHaveBeenCalled();

    // Confirm explicitly
    const confirmBtn = screen.getByRole('button', { name: /Yes, Complete!/i });
    fireEvent.click(confirmBtn);

    expect(mockOnFinish).toHaveBeenCalledWith('routine-morning-tea');
  });
});
