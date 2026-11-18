/**
 * SAKSHAM NEURO-CARE — REAL PATIENT-CARE JOURNEY SIMULATION
 * Verifies a complete 13-step patient journey using synthetic accounts and clinical workflows:
 * 1. Patient signs in (synthetic profile).
 * 2. ASHA welcomes the patient warmly.
 * 3. Patient asks a repeated question ("What day is today?").
 * 4. ASHA responds warmly without frustration or correction (calm tone, non-punitive).
 * 5. Patient asks a memory question ("Who is coming today?" / "Who is Priya?").
 * 6. ASHA retrieves Priya from Personal Memory Graph and provides reassuring anchor.
 * 7. Patient reviews family memories and category filters (People, Places, Songs).
 * 8. Patient listens to audio narration for a personal memory.
 * 9. Patient starts a cognitive game (Card Matching).
 * 10. ASHA offers a gentle hint without penalty when requested.
 * 11. Patient transitions to daily routines and begins a guided task.
 * 12. Patient activates the 2-minute rest pause for calming breathing.
 * 13. Patient completes task (patient-controlled confirmation) and checks Home Guide.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { PersonalMemoryGraphEditor } from '../features/memory/components/PersonalMemoryGraphEditor.js';
import { CardMatchingGame } from '../features/games/components/runners/CardMatchingGame.js';
import { GuidedTaskRunner } from '../features/routines/components/GuidedTaskRunner.js';
import { NavigationService } from '../features/safety/services/navigationService.js';
import { LovedOnesService } from '../features/lovedOnes/services/lovedOnesService.js';
import { SpeechService } from '../services/speechService.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { RoutineItem } from '../types/index.js';

describe('Real Patient-Care Journey Simulation (13-Step Synthetic Flow)', () => {
  const SYNTHETIC_PATIENT_ID = 'patient-journey-sunita';
  const SYNTHETIC_PATIENT_NAME = 'Sunita Sharma';

  const mockLovedOnesData = [
    {
      id: 'lo-priya',
      name: 'Priya Sharma',
      relationship: 'Daughter',
      nickname: 'Guddi',
      primaryPhotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      voicePrompt: 'Priya visits every Sunday and brings cardamom tea.',
      cues: ['Daughter', 'Cardamom tea', 'Sunday morning visits', 'Warm hug'],
      isCoreAnchor: true,
      notes: 'Lives in Indiranagar, 15 minutes away.',
      sharedMemories: ['Sunday garden teas in Bengaluru'],
    },
  ];

  const mockRoutineTask: RoutineItem = {
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

  const syntheticPatientContext: any = {
    patientId: SYNTHETIC_PATIENT_ID,
    timestamp: Date.now(),
    profile: {
      uid: SYNTHETIC_PATIENT_ID,
      displayName: SYNTHETIC_PATIENT_NAME,
      isGuest: false,
    },
    routines: {
      routines: [mockRoutineTask],
      currentRoutine: mockRoutineTask,
      completedTodayCount: 0,
      totalTodayCount: 3,
    },
    lovedOnes: {
      lovedOnes: mockLovedOnesData,
      coreAnchors: mockLovedOnesData,
    },
    recentMemories: [],
    cognitiveBaseline: {
      lastScore: 85,
      streakDays: 4,
    },
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 50 }),
    }) as any;

    vi.spyOn(SpeechService, 'speak').mockImplementation(() => {});
    vi.spyOn(SpeechService, 'cancelSpeech').mockImplementation(() => {});
    LovedOnesService.saveLovedOnes(SYNTHETIC_PATIENT_ID, mockLovedOnesData as any, false);
    LovedOnesService.saveLovedOnes('default-patient', mockLovedOnesData as any, false);
  });

  // -------------------------------------------------------------
  // Step 1 & 2: Patient Authentication & Asha Warm Welcome
  // -------------------------------------------------------------
  it('Step 1 & 2: Welcomes patient warmly on sign-in without clinical intimidation', () => {
    const greetingResult = ConversationEngine.process('Hello Asha', syntheticPatientContext, 'en');

    expect(greetingResult.intent).toBe('GREETING');
    expect(greetingResult.expression).toBe('happy');
    expect(greetingResult.speech).toBeDefined();
    expect(greetingResult.speech.length).toBeGreaterThan(5);
  });

  // -------------------------------------------------------------
  // Step 3 & 4: Repeated Questions Handled Non-Punitively
  // -------------------------------------------------------------
  it('Step 3 & 4: Answers repeated question ("What day is today?") without impatience or correction', () => {
    // First query
    const res1 = ConversationEngine.process('What day is today?', syntheticPatientContext, 'en');
    expect(res1.intent).toBe('REPEATED_DATE_QUERY');
    expect(res1.clinicalState).toBe('Reassuring');
    expect(res1.speech).toContain('no rush at all');

    // Second repeated query - same question asked again
    const res2 = ConversationEngine.process('What day is today?', syntheticPatientContext, 'en');
    expect(res2.clinicalState).toBe('Reassuring');
    // Non-punitive: must NOT reprimand the patient
    expect(res2.speech.toLowerCase()).not.toContain('already told');
    expect(res2.speech.toLowerCase()).not.toContain('already asked');
    expect(res2.speech.toLowerCase()).not.toContain('as i said');
  });

  // -------------------------------------------------------------
  // Step 5 & 6: Memory Query & Personal Memory Graph Retrieval
  // -------------------------------------------------------------
  it('Step 5 & 6: Resolves memory query ("Who is coming today?") with warm grounded context and zero hallucination', () => {
    const res = ConversationEngine.process('Who is coming today?', syntheticPatientContext, 'en');

    expect(res.intent).toBe('REPEATED_FAMILY_QUERY');
    expect(res.clinicalState).toBe('Reassuring');
    expect(res.speech).toContain('Priya');
    expect(res.speech).toContain('warmly cared for');

    // Negative check: query for unrecorded entity returns respectful orientation, not false stories
    const unknownRes = ConversationEngine.process('Who is Ramesh from New York?', syntheticPatientContext, 'en');
    expect(unknownRes.speech).not.toContain('New York');
  });

  // -------------------------------------------------------------
  // Step 7: Personal Memory Graph Category Filtering
  // -------------------------------------------------------------
  it('Step 7: Displays Personal Memory Graph with categories (People, Places, Songs)', async () => {
    render(
      <AccessibilityProvider>
        <LanguageProvider>
          <PersonalMemoryGraphEditor
            patientId={SYNTHETIC_PATIENT_ID}
            isCaregiver={true}
          />
        </LanguageProvider>
      </AccessibilityProvider>
    );

    // Header & zero hallucination banner
    expect(screen.getByRole('heading', { name: /Personal Memory Graph/i })).toBeInTheDocument();
    expect(screen.getByText(/Zero Hallucination/i)).toBeInTheDocument();

    // Default graph has Priya Sharma
    expect(screen.getByText(/Priya Sharma/i)).toBeInTheDocument();

    // Filter by People tab
    const peopleTab = screen.getByRole('tab', { name: /People/i });
    expect(peopleTab).toBeInTheDocument();
    fireEvent.click(peopleTab);

    expect(screen.getByText(/Priya Sharma/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------
  // Step 8: Audio Narration of Personal Memory
  // -------------------------------------------------------------
  it('Step 8: Plays audio narration for personal memory when requested', async () => {
    const speakSpy = vi.spyOn(SpeechService, 'speak').mockImplementation((_text, onStart, _onEnd) => {
      onStart?.();
    });

    render(
      <AccessibilityProvider>
        <LanguageProvider>
          <PersonalMemoryGraphEditor
            patientId={SYNTHETIC_PATIENT_ID}
            isCaregiver={true}
          />
        </LanguageProvider>
      </AccessibilityProvider>
    );

    const priyaCard = screen.getByText(/Priya Sharma/i);
    fireEvent.click(priyaCard);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Listen to Asha narrate memory/i })).toBeInTheDocument();
    });

    const narrateBtn = screen.getByRole('button', { name: /Listen to Asha narrate memory/i });
    fireEvent.click(narrateBtn);

    expect(speakSpy).toHaveBeenCalled();
  });

  // -------------------------------------------------------------
  // Step 9 & 10: Cognitive Game & Asha Gentle Hint Without Penalty
  // -------------------------------------------------------------
  it('Step 9 & 10: Runs Card Matching Game and provides Asha Gentle Hint without penalizing patient', async () => {
    const onComplete = vi.fn();
    const onRequestHint = vi.fn();

    render(
      <LanguageProvider>
        <AccessibilityProvider>
          <CardMatchingGame
            difficulty="Gentle"
            onComplete={onComplete}
            onRequestHint={onRequestHint}
          />
        </AccessibilityProvider>
      </LanguageProvider>
    );

    // Game is active with card pairs counter
    expect(screen.getByText(/Tap cards to find pairs/i)).toBeInTheDocument();
    expect(screen.getByText(/Matched:/i)).toBeInTheDocument();

    // Asha Gentle Hint button is visible
    const hintButton = screen.getByRole('button', { name: /Asha's Gentle Hint/i });
    expect(hintButton).toBeInTheDocument();

    // Click hint button
    fireEvent.click(hintButton);
    expect(onRequestHint).toHaveBeenCalled();

    // Verify hint state is active
    expect(screen.getByText(/Asha is softly highlighting a pair.../i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------
  // Step 11 & 12: Daily Routine Guided Task & 2-Minute Rest Pause
  // -------------------------------------------------------------
  it('Step 11 & 12: Starts guided routine task and allows 2-minute calming rest pause', async () => {
    render(
      <LanguageProvider>
        <AccessibilityProvider>
          <GuidedTaskRunner
            routine={mockRoutineTask}
            isOpen={true}
            onClose={vi.fn()}
            onFinish={vi.fn()}
            defaultViewMode="single"
            patientId={SYNTHETIC_PATIENT_ID}
          />
        </AccessibilityProvider>
      </LanguageProvider>
    );

    expect(screen.getByText(/Step 1 Guidance/i)).toBeInTheDocument();

    // Locate "Take a 2-Minute Rest" button
    const restButton = screen.getByRole('button', { name: /Take a 2-Minute Rest/i });
    expect(restButton).toBeInTheDocument();

    // Trigger rest pause
    fireEvent.click(restButton);

    // Calming 2-minute rest region appears
    expect(screen.getByRole('region', { name: /2-Minute Calming Rest Active/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resume Now/i })).toBeInTheDocument();
  });

  // -------------------------------------------------------------
  // Step 13: Physical Completion Confirmation & Home Guide Guidance
  // -------------------------------------------------------------
  it('Step 13: Completes task with patient confirmation and checks Home Guide navigation', () => {
    const onFinishMock = vi.fn();

    render(
      <LanguageProvider>
        <AccessibilityProvider>
          <GuidedTaskRunner
            routine={mockRoutineTask}
            isOpen={true}
            onClose={vi.fn()}
            onFinish={onFinishMock}
            defaultViewMode="single"
            patientId={SYNTHETIC_PATIENT_ID}
          />
        </AccessibilityProvider>
      </LanguageProvider>
    );

    // Advance to final step
    const nextBtn = screen.getByRole('button', { name: /Next Step/i });
    fireEvent.click(nextBtn); // step 2
    fireEvent.click(nextBtn); // step 3

    // Finish button
    const finishBtn = screen.getByRole('button', { name: /Finish Activity/i });
    expect(finishBtn).toBeInTheDocument();
    fireEvent.click(finishBtn);

    // Verify confirmation modal appears (strictly patient-controlled)
    expect(screen.getByText(/Are you satisfied and ready to mark this routine activity completed/i)).toBeInTheDocument();
    expect(onFinishMock).not.toHaveBeenCalled();

    // Patient clicks explicit confirmation
    const confirmBtn = screen.getByRole('button', { name: /Yes, Complete!/i });
    fireEvent.click(confirmBtn);
    expect(onFinishMock).toHaveBeenCalledWith('routine-morning-tea');

    // Check Home Guide navigation computation
    const guidance = NavigationService.computeHomeGuidance(
      { latitude: 12.9720, longitude: 77.6415, accuracyMeters: 10, heading: 0 },
      { latitude: 12.9716, longitude: 77.6412, addressLabel: 'Indiranagar Sanctuary' },
      'en'
    );

    expect(guidance.distanceMeters).toBeLessThan(100);
    expect(guidance.spokenGuidance).toContain('metres from home');
    expect(guidance.isAccuracyDegraded).toBe(false);
  });
});
