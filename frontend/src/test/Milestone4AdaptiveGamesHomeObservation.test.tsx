import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import {
  AdaptiveDifficultyService,
  SessionEvaluationMetrics
} from '../features/games/services/adaptiveDifficultyService.js';
import { GamesService } from '../features/games/services/gamesService.js';
import { HomeObservationExplorer, HOME_ZONES } from '../features/games/components/runners/RoomMemoryActivity.js';
import { GameHeader } from '../features/games/components/GameHeader.js';
import { GameSessionFeedbackModal } from '../features/games/components/GameSessionFeedbackModal.js';
import { GameItem, GameSessionRecord } from '../types/index.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('Milestone 4: Mind Games Adaptive Difficulty & Home Observation Explorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    AdaptiveDifficultyService.clearAll();
  });

  /* ========================================================================= */
  /* PART A: Adaptive Difficulty Engine Tests                                  */
  /* ========================================================================= */
  describe('Part A: Adaptive Difficulty Engine (AdaptiveDifficultyService)', () => {
    const patientA = 'test-patient-adaptive-alpha';
    const patientB = 'test-patient-adaptive-beta';

    it('1. safe default: starts at Gentle difficulty and calm pacing for new patients', () => {
      const profile = AdaptiveDifficultyService.getProfile(patientA);
      expect(profile.currentDifficulty).toBe('Gentle');
      expect(profile.pacing).toBe('calm');
      expect(profile.consecutiveComfortableSessions).toBe(0);
      expect(profile.consecutiveStruggleSessions).toBe(0);
      expect(profile.adaptationRationale).toContain('Gentle');
    });

    it('2. gradual progression: a single comfortable session NEVER jumps difficulty', () => {
      const metrics: SessionEvaluationMetrics = {
        gameId: 'game-matching',
        durationSeconds: 90,
        completed: true,
        accuracy: 1.0,
        mistakesCount: 0,
        hintsUsedCount: 0,
        patientFeedback: 'Loved it'
      };

      const updated = AdaptiveDifficultyService.evaluateSession(patientA, metrics, []);
      expect(updated.currentDifficulty).toBe('Gentle');
      expect(updated.pacing).toBe('calm');
      expect(updated.consecutiveComfortableSessions).toBe(1);
    });

    it('3. multi-session rolling progression: steps to Moderate only after >= 3 comfortable sessions', () => {
      const mockHistory: GameSessionRecord[] = [
        {
          id: 's-1',
          patientId: patientA,
          gameId: 'game-matching',
          gameTitle: 'Nature Match',
          category: 'memory',
          difficulty: 'Gentle',
          date: '2026-11-08',
          durationSeconds: 85,
          completed: true
        },
        {
          id: 's-2',
          patientId: patientA,
          gameId: 'game-sequence',
          gameTitle: 'Story Order',
          category: 'sequence',
          difficulty: 'Gentle',
          date: '2026-11-08',
          durationSeconds: 90,
          completed: true
        }
      ];

      // Session 1
      AdaptiveDifficultyService.evaluateSession(
        patientA,
        { gameId: 'g1', durationSeconds: 80, completed: true, accuracy: 0.9, patientFeedback: 'Relaxing' },
        mockHistory
      );
      // Session 2
      AdaptiveDifficultyService.evaluateSession(
        patientA,
        { gameId: 'g2', durationSeconds: 80, completed: true, accuracy: 0.9, patientFeedback: 'Just right' },
        mockHistory
      );
      // Session 3
      const session3 = AdaptiveDifficultyService.evaluateSession(
        patientA,
        { gameId: 'g3', durationSeconds: 80, completed: true, accuracy: 0.9, patientFeedback: 'Loved it' },
        mockHistory
      );

      expect(session3.currentDifficulty).toBe('Moderate');
      expect(session3.pacing).toBe('balanced');
      expect(session3.adaptationRationale).toContain('Moderate');
    });

    it('4. struggle response: relaxes difficulty immediately if patient struggles or has repeated mistakes', () => {
      // Set to Moderate first
      AdaptiveDifficultyService.saveProfile({
        patientId: patientA,
        currentDifficulty: 'Moderate',
        pacing: 'balanced',
        consecutiveComfortableSessions: 2,
        consecutiveStruggleSessions: 0,
        adaptationRationale: 'Currently Moderate',
        updatedAt: new Date().toISOString()
      });

      // Session with struggle signals (3 mistakes, low accuracy)
      const struggleResult = AdaptiveDifficultyService.evaluateSession(patientA, {
        gameId: 'game-matching',
        durationSeconds: 150,
        completed: false,
        mistakesCount: 3,
        accuracy: 0.4
      });

      expect(struggleResult.currentDifficulty).toBe('Gentle');
      expect(struggleResult.pacing).toBe('calm');
      expect(struggleResult.consecutiveComfortableSessions).toBe(0);
      expect(struggleResult.consecutiveStruggleSessions).toBe(1);
    });

    it('5. explicit patient feedback response: relaxes when patient requests easier pace', () => {
      AdaptiveDifficultyService.saveProfile({
        patientId: patientA,
        currentDifficulty: 'Moderate',
        pacing: 'balanced',
        consecutiveComfortableSessions: 1,
        consecutiveStruggleSessions: 0,
        adaptationRationale: 'Currently Moderate',
        updatedAt: new Date().toISOString()
      });

      const result = AdaptiveDifficultyService.evaluateSession(patientA, {
        gameId: 'game-matching',
        durationSeconds: 100,
        completed: true,
        patientFeedback: 'I would like something easier'
      });

      expect(result.currentDifficulty).toBe('Gentle');
      expect(result.pacing).toBe('calm');
    });

    it('6. support safeguard: pauses, hints, and slow responses are NOT penalized', () => {
      const result = AdaptiveDifficultyService.evaluateSession(patientA, {
        gameId: 'game-matching',
        durationSeconds: 300, // Patient took their time (5 minutes)
        completed: true,
        pauseCount: 3, // Paused 3 times to rest
        hintsUsedCount: 4, // Used multiple reassuring hints
        mistakesCount: 0,
        accuracy: 1.0,
        patientFeedback: 'Relaxing'
      });

      // Must count as comfortable session, NOT a struggle!
      expect(result.currentDifficulty).toBe('Gentle');
      expect(result.consecutiveComfortableSessions).toBe(1);
      expect(result.consecutiveStruggleSessions).toBe(0);
    });

    it('7. patient UID isolation: profiles are strictly separated per patient', () => {
      AdaptiveDifficultyService.saveProfile({
        patientId: patientA,
        currentDifficulty: 'Gentle',
        pacing: 'calm',
        consecutiveComfortableSessions: 0,
        consecutiveStruggleSessions: 0,
        adaptationRationale: 'Patient A Profile',
        updatedAt: new Date().toISOString()
      });

      AdaptiveDifficultyService.saveProfile({
        patientId: patientB,
        currentDifficulty: 'Stimulating',
        pacing: 'agile',
        consecutiveComfortableSessions: 3,
        consecutiveStruggleSessions: 0,
        adaptationRationale: 'Patient B Profile',
        updatedAt: new Date().toISOString()
      });

      expect(AdaptiveDifficultyService.getProfile(patientA).currentDifficulty).toBe('Gentle');
      expect(AdaptiveDifficultyService.getProfile(patientB).currentDifficulty).toBe('Stimulating');
    });

    it('8. guest patient isolation: guest profile operates locally without cloud collision', () => {
      const guestId = 'guest_temp_999';
      const guestProfile = AdaptiveDifficultyService.getProfile(guestId);
      expect(guestProfile.patientId).toContain('guest');
      expect(guestProfile.currentDifficulty).toBe('Gentle');
    });

    it('9. gamesService integration: recordSession feeds adaptive evaluation automatically', async () => {
      const evalSpy = vi.spyOn(AdaptiveDifficultyService, 'evaluateSession');

      await GamesService.recordSession(patientA, {
        gameId: 'game-matching',
        gameTitle: 'Peaceful Nature Card Matching',
        category: 'memory',
        difficulty: 'Gentle',
        date: '2026-11-08',
        durationSeconds: 70,
        completed: true,
        patientFeedback: 'Loved it'
      });

      expect(evalSpy).toHaveBeenCalled();
      evalSpy.mockRestore();
    });

    it('10. respectful rationale: explanations are encouraging and never use stigmatizing jargon', () => {
      const profile = AdaptiveDifficultyService.getProfile(patientA);
      expect(profile.adaptationRationale).not.toMatch(/dementia|alzheimer|impairment|deficit|decline|iq/i);
    });
  });

  /* ========================================================================= */
  /* PART B: Home Observation Explorer Component Tests                        */
  /* ========================================================================= */
  describe('Part B: Home Observation Explorer (HomeObservationExplorer)', () => {
    it('11. renders 3 distinct home zones: Bedroom, Living Room, Kitchen tabs', () => {
      render(
        <BrowserRouter>
          <HomeObservationExplorer onComplete={vi.fn()} />
        </BrowserRouter>
      );

      expect(screen.getByRole('button', { name: /Explore Master Bedroom/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Explore Living Room/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Explore Kitchen/i })).toBeInTheDocument();
    });

    it('12. displays mandatory observation safeguard note and reference photo pill', () => {
      render(
        <BrowserRouter>
          <HomeObservationExplorer onComplete={vi.fn()} />
        </BrowserRouter>
      );

      expect(screen.getByText(/Observation Safeguard Note:/i)).toBeInTheDocument();
      expect(screen.getByText(/This is an archived reference photograph/i)).toBeInTheDocument();
      expect(screen.getByText(/It does not represent real-time room status/i)).toBeInTheDocument();
      expect(screen.getByText(/Reference Photo • Master Bedroom/i)).toBeInTheDocument();
    });

    it('13. provides 3-tier progressive memory clues: Area, Daily Anchor, and Exact Spot', () => {
      render(
        <BrowserRouter>
          <HomeObservationExplorer onComplete={vi.fn()} />
        </BrowserRouter>
      );

      const clue1Btn = screen.getByRole('button', { name: /Clue 1: Room Area/i });
      const clue2Btn = screen.getByRole('button', { name: /Clue 2: Daily Anchor/i });
      const clue3Btn = screen.getByRole('button', { name: /Clue 3: Exact Spot/i });

      expect(clue1Btn).toBeInTheDocument();
      expect(clue2Btn).toBeInTheDocument();
      expect(clue3Btn).toBeInTheDocument();

      // Tap Clue 1
      fireEvent.click(clue1Btn);
      expect(screen.getByText(/Look near the head of the bed on the bedside furniture/i)).toBeInTheDocument();

      // Tap Clue 2
      fireEvent.click(clue2Btn);
      expect(screen.getByText(/You use these glasses every morning/i)).toBeInTheDocument();

      // Tap Clue 3
      fireEvent.click(clue3Btn);
      expect(screen.getByText(/Resting on the polished wooden bedside table/i)).toBeInTheDocument();
    });

    it('14. supports reassuring answer reveal without shame or failure', () => {
      render(
        <BrowserRouter>
          <HomeObservationExplorer onComplete={vi.fn()} />
        </BrowserRouter>
      );

      const revealBtn = screen.getByRole('button', { name: /Show answer reassuringly/i });
      fireEvent.click(revealBtn);

      expect(screen.getByText(/Here is where it rests:/i)).toBeInTheDocument();
      expect(screen.getByText(/Take all the time you need to observe/i)).toBeInTheDocument();
    });

    it('15. allows switching between home zones and updates questions and photos', () => {
      render(
        <BrowserRouter>
          <HomeObservationExplorer onComplete={vi.fn()} />
        </BrowserRouter>
      );

      // Switch to Kitchen
      const kitchenTab = screen.getByRole('button', { name: /Explore Kitchen/i });
      fireEvent.click(kitchenTab);

      expect(screen.getByText(/Reference Photo • Warm Morning Kitchen/i)).toBeInTheDocument();
      expect(screen.getByText(/Target Object: Stainless Steel Tea Kettle/i)).toBeInTheDocument();
      expect(screen.getByText(/Where is the stainless steel tea kettle kept on the kitchen counter\?/i)).toBeInTheDocument();

      // Switch to Living Room
      const livingTab = screen.getByRole('button', { name: /Explore Living Room/i });
      fireEvent.click(livingTab);

      expect(screen.getByText(/Reference Photo • Family Living Sanctuary/i)).toBeInTheDocument();
      expect(screen.getByText(/Target Object: Wooden Mantle Clock/i)).toBeInTheDocument();
      expect(screen.getByText(/Where is the wooden mantle clock located in the living room\?/i)).toBeInTheDocument();
    });

    it('16. connects familiar objects to Daily Routines with Open Guided Activity button', () => {
      render(
        <BrowserRouter>
          <HomeObservationExplorer onComplete={vi.fn()} />
        </BrowserRouter>
      );

      expect(screen.getByText(/Connected Daily Routine/i)).toBeInTheDocument();
      expect(screen.getByText('Morning Reading & Cognitive Focus')).toBeInTheDocument();

      const openRoutineBtn = screen.getByRole('button', { name: /Open Guided Activity \(15m\)/i });
      fireEvent.click(openRoutineBtn);

      // Navigates to patient sanctuary workspace without auto-completing
      expect(mockNavigate).toHaveBeenCalledWith('/patient/home');
    });

    it('17. verifies all 3 home zones contain 5 items each (15 total objects)', () => {
      expect(HOME_ZONES.bedroom.questions.length).toBe(5);
      expect(HOME_ZONES.living.questions.length).toBe(5);
      expect(HOME_ZONES.kitchen.questions.length).toBe(5);
    });
  });

  /* ========================================================================= */
  /* PART C: Patient UI Alignment & Removal of Manual Difficulty Controls      */
  /* ========================================================================= */
  describe('Part C: Patient UI Alignment & Removal of Manual Difficulty Controls', () => {
    const mockGame: GameItem = {
      id: 'game-matching',
      title: 'Peaceful Nature Card Matching',
      category: 'memory',
      categoryLabel: 'Memory & Recall',
      difficulty: 'Gentle',
      description: 'Find matching pairs',
      iconName: 'Sparkles',
      estimatedMinutes: 3,
      instructions: 'Tap to flip',
      benefits: ['Focus']
    };

    it('18. GameHeader: displays Auto-Adaptive badge without visible patient difficulty toggle button', () => {
      render(
        <GameHeader
          game={mockGame}
          currentDifficulty="Gentle"
          onChangeDifficulty={vi.fn()}
          isPaused={false}
          onTogglePause={vi.fn()}
          onRestart={vi.fn()}
          onExit={vi.fn()}
          elapsedSeconds={45}
        />
      );

      // Auto-Adaptive visual badge
      expect(screen.getByText('Auto-Adaptive')).toBeInTheDocument();

      // Difficulty cycler button is hidden with sr-only from visual layout
      const srButton = screen.getByRole('button', { name: /Current difficulty: Gentle/i });
      expect(srButton).toHaveClass('sr-only');
    });

    it('19. GameSessionFeedbackModal: removes (Gentle Level) from title and offers gentle feedback choices', () => {
      render(
        <GameSessionFeedbackModal
          game={mockGame}
          difficulty="Gentle"
          elapsedSeconds={90}
          onPlayAgain={vi.fn()}
          onFinish={vi.fn()}
        />
      );

      // Does not contain (Gentle Level) in the title text
      expect(screen.queryByText(/You completed Peaceful Nature Card Matching \(Gentle Level\)/i)).toBeNull();
      expect(screen.getByText(/You completed Peaceful Nature Card Matching/i)).toBeInTheDocument();

      // Friendly non-punitive options
      expect(screen.getByText('That felt comfortable')).toBeInTheDocument();
      expect(screen.getByText('Comfortable rhythm')).toBeInTheDocument();
      expect(screen.getByText('I’d like something easier')).toBeInTheDocument();
      expect(screen.getByText('Loved this activity')).toBeInTheDocument();
    });
  });
});
