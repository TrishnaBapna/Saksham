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
import { PatternMatchGame } from '../features/games/components/runners/PatternMatchGame.js';
import { WordGardenGame } from '../features/games/components/runners/WordGardenGame.js';
import { LovedOnesMemoryGame } from '../features/games/components/runners/LovedOnesMemoryGame.js';
import { MiniMazeGame } from '../features/games/components/runners/MiniMazeGame.js';
import { WordUnscrambleGame } from '../features/games/components/runners/WordUnscrambleGame.js';
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
      expect(screen.queryByText(/Peaceful Nature Card Matching \(Gentle Level\)/i)).toBeNull();
      expect(screen.getByText(/You finished your game/i)).toBeInTheDocument();
      expect(screen.getByText(/Peaceful Nature Card Matching/i)).toBeInTheDocument();

      // Friendly non-punitive options
      expect(screen.getByText('That felt comfortable')).toBeInTheDocument();
      expect(screen.getByText('Comfortable rhythm')).toBeInTheDocument();
      expect(screen.getByText('I’d like something easier')).toBeInTheDocument();
      expect(screen.getByText('Loved this activity')).toBeInTheDocument();
    });
  });

  /* ========================================================================= */
  /* PART D: 7 Progression Safeguard Scenarios (AdaptiveDifficultyService)     */
  /* ========================================================================= */
  describe('Part D: 7 Progression Safeguard Scenarios', () => {
    const testPatient = 'patient-safeguard-remediation';

    it('Scenario 1: One comfortable session plus "too easy" feedback does NOT step up', () => {
      const result = AdaptiveDifficultyService.evaluateSession(testPatient, {
        gameId: 'game-matching',
        durationSeconds: 65,
        completed: true,
        accuracy: 1.0,
        mistakesCount: 0,
        patientFeedback: 'Too easy'
      });

      expect(result.currentDifficulty).toBe('Gentle');
      expect(result.consecutiveComfortableSessions).toBe(1);
      expect(result.adaptationRationale).toContain('1/3 toward gradual progression');
    });

    it('Scenario 2: Two comfortable sessions plus "more challenge" feedback does NOT step up', () => {
      // Session 1
      AdaptiveDifficultyService.evaluateSession(testPatient, {
        gameId: 'game-matching',
        durationSeconds: 60,
        completed: true,
        accuracy: 1.0
      });

      // Session 2 with "more challenge" feedback
      const result = AdaptiveDifficultyService.evaluateSession(testPatient, {
        gameId: 'game-word-garden',
        durationSeconds: 55,
        completed: true,
        accuracy: 1.0,
        patientFeedback: 'I would like more challenge'
      });

      expect(result.currentDifficulty).toBe('Gentle');
      expect(result.consecutiveComfortableSessions).toBe(2);
      expect(result.adaptationRationale).toContain('2/3 toward gradual progression');
    });

    it('Scenario 3: Three distinct completed comfortable sessions triggers step-up to Moderate (and 3 more to Stimulating)', () => {
      // 3 completed comfortable sessions from Gentle -> Moderate
      AdaptiveDifficultyService.evaluateSession(testPatient, {
        gameId: 'g1',
        durationSeconds: 70,
        completed: true,
        accuracy: 0.95
      });
      AdaptiveDifficultyService.evaluateSession(testPatient, {
        gameId: 'g2',
        durationSeconds: 65,
        completed: true,
        accuracy: 0.95
      });
      const stepToModerate = AdaptiveDifficultyService.evaluateSession(testPatient, {
        gameId: 'g3',
        durationSeconds: 80,
        completed: true,
        accuracy: 0.95
      });

      expect(stepToModerate.currentDifficulty).toBe('Moderate');
      expect(stepToModerate.pacing).toBe('balanced');
      expect(stepToModerate.consecutiveComfortableSessions).toBe(0);

      // 3 more distinct completed comfortable sessions from Moderate -> Stimulating
      AdaptiveDifficultyService.evaluateSession(testPatient, {
        gameId: 'g4',
        durationSeconds: 80,
        completed: true,
        accuracy: 0.9
      });
      AdaptiveDifficultyService.evaluateSession(testPatient, {
        gameId: 'g5',
        durationSeconds: 75,
        completed: true,
        accuracy: 0.9
      });
      const stepToStimulating = AdaptiveDifficultyService.evaluateSession(testPatient, {
        gameId: 'g6',
        durationSeconds: 90,
        completed: true,
        accuracy: 0.9
      });

      expect(stepToStimulating.currentDifficulty).toBe('Stimulating');
      expect(stepToStimulating.pacing).toBe('agile');
      expect(stepToStimulating.consecutiveComfortableSessions).toBe(0);
    });

    it('Scenario 4: Struggle signal immediately resets progression counter and drops difficulty to Gentle', () => {
      // Set to Moderate with 2 comfortable sessions accrued
      AdaptiveDifficultyService.saveProfile({
        patientId: testPatient,
        currentDifficulty: 'Moderate',
        pacing: 'balanced',
        consecutiveComfortableSessions: 2,
        consecutiveStruggleSessions: 0,
        adaptationRationale: 'Currently Moderate',
        updatedAt: new Date().toISOString()
      });

      const struggleResult = AdaptiveDifficultyService.evaluateSession(testPatient, {
        gameId: 'game-matching',
        durationSeconds: 120,
        completed: false,
        mistakesCount: 3,
        accuracy: 0.4
      });

      expect(struggleResult.currentDifficulty).toBe('Gentle');
      expect(struggleResult.pacing).toBe('calm');
      expect(struggleResult.consecutiveComfortableSessions).toBe(0);
      expect(struggleResult.consecutiveStruggleSessions).toBe(1);
    });

    it('Scenario 5: "Easier" feedback immediately relaxes difficulty and resets comfortable progression count', () => {
      // Set to Stimulating
      AdaptiveDifficultyService.saveProfile({
        patientId: testPatient,
        currentDifficulty: 'Stimulating',
        pacing: 'agile',
        consecutiveComfortableSessions: 2,
        consecutiveStruggleSessions: 0,
        adaptationRationale: 'Currently Stimulating',
        updatedAt: new Date().toISOString()
      });

      const reliefResult = AdaptiveDifficultyService.evaluateSession(testPatient, {
        gameId: 'game-matching',
        durationSeconds: 90,
        completed: true,
        patientFeedback: 'I’d like something easier'
      });

      expect(reliefResult.currentDifficulty).toBe('Moderate');
      expect(reliefResult.pacing).toBe('balanced');
      expect(reliefResult.consecutiveComfortableSessions).toBe(0);
    });

    it('Scenario 6: Hints used and pauses do NOT penalize or block comfortable progression', () => {
      const result = AdaptiveDifficultyService.evaluateSession(testPatient, {
        gameId: 'game-matching',
        durationSeconds: 240, // 4 minutes
        completed: true,
        hintsUsedCount: 5,
        pauseCount: 4,
        mistakesCount: 0,
        accuracy: 1.0,
        patientFeedback: 'Comfortable rhythm'
      });

      expect(result.currentDifficulty).toBe('Gentle');
      expect(result.consecutiveComfortableSessions).toBe(1);
      expect(result.consecutiveStruggleSessions).toBe(0);
    });

    it('Scenario 7: Abandoned/incomplete session (>60s, incomplete, 0 pauses) resets progression counter', () => {
      // Pre-seed 2 comfortable sessions
      AdaptiveDifficultyService.saveProfile({
        patientId: testPatient,
        currentDifficulty: 'Gentle',
        pacing: 'calm',
        consecutiveComfortableSessions: 2,
        consecutiveStruggleSessions: 0,
        adaptationRationale: 'Two comfortable sessions',
        updatedAt: new Date().toISOString()
      });

      const abandonedResult = AdaptiveDifficultyService.evaluateSession(testPatient, {
        gameId: 'game-matching',
        durationSeconds: 75,
        completed: false,
        pauseCount: 0,
        accuracy: 0.2
      });

      expect(abandonedResult.consecutiveComfortableSessions).toBe(0);
      expect(abandonedResult.consecutiveStruggleSessions).toBe(1);
    });
  });

  /* ========================================================================= */
  /* PART E: Genuine Gameplay Parameter Adaptations in 6 Activities             */
  /* ========================================================================= */
  describe('Part E: Genuine Gameplay Parameter Adaptations in 6 Activities', () => {
    it('20. PatternMatchGame: adapts sequence length and choice count by difficulty', () => {
      const { rerender } = render(
        <PatternMatchGame difficulty="Gentle" onComplete={vi.fn()} />
      );

      // Gentle: 4-element sequence (🔵 🔺 🔵 🔺) with 3 choice buttons
      expect(screen.getByText(/Adaptive Rhythm • Gentle \(4-step sequence\)/i)).toBeInTheDocument();
      const choiceButtonsGentle = screen.getAllByRole('button', { name: /Option \d:/i });
      expect(choiceButtonsGentle.length).toBe(3);

      // Moderate: 5-element tri-color sequence (🌸 🌿 ☕ 🌸 🌿)
      rerender(<PatternMatchGame difficulty="Moderate" onComplete={vi.fn()} />);
      expect(screen.getByText(/Adaptive Rhythm • Moderate \(5-step sequence\)/i)).toBeInTheDocument();

      // Stimulating: 4 choice options and 6-step sequence
      rerender(<PatternMatchGame difficulty="Stimulating" onComplete={vi.fn()} />);
      expect(screen.getByText(/Adaptive Rhythm • Stimulating \(6-step sequence\)/i)).toBeInTheDocument();
      const choiceButtonsStim = screen.getAllByRole('button', { name: /Option \d:/i });
      expect(choiceButtonsStim.length).toBe(4);
    });

    it('21. WordGardenGame: adapts word length and letter choices by difficulty', () => {
      const { rerender } = render(
        <WordGardenGame difficulty="Gentle" onComplete={vi.fn()} />
      );

      // Gentle: 3 options
      const gentleChoiceButtons = screen.getAllByRole('button', { name: /^Letter /i });
      expect(gentleChoiceButtons.length).toBe(3);

      // Moderate: 4 options
      rerender(<WordGardenGame difficulty="Moderate" onComplete={vi.fn()} />);
      const moderateChoiceButtons = screen.getAllByRole('button', { name: /^Letter /i });
      expect(moderateChoiceButtons.length).toBe(4);
    });

    it('22. LovedOnesMemoryGame: adapts choice count and relationship hints by difficulty', () => {
      const { rerender } = render(
        <LovedOnesMemoryGame difficulty="Gentle" patientId="p1" onComplete={vi.fn()} />
      );

      // Gentle: 2 choices, automatic relationship hint visible
      expect(screen.getByText(/Gentle Hint: Someone you have saved as your/i)).toBeInTheDocument();

      // Moderate: hint button available on demand
      rerender(<LovedOnesMemoryGame difficulty="Moderate" patientId="p1" onComplete={vi.fn()} />);
      expect(
        screen.getByRole('button', { name: /Gentle Memory Clue|Relationship Clue/i })
      ).toBeInTheDocument();
    });

    it('23. MiniMazeGame: adapts grid dimensions and obstacles by difficulty', () => {
      const { rerender } = render(
        <MiniMazeGame difficulty="Gentle" onComplete={vi.fn()} />
      );

      // Gentle: 3x3 open garden
      expect(screen.getByText(/3x3 garden/i)).toBeInTheDocument();

      // Moderate: 4x4 open garden
      rerender(<MiniMazeGame difficulty="Moderate" onComplete={vi.fn()} />);
      expect(screen.getByText(/4x4 garden/i)).toBeInTheDocument();

      // Stimulating: 4x4 with pond obstacle
      rerender(<MiniMazeGame difficulty="Stimulating" onComplete={vi.fn()} />);
      expect(screen.getByLabelText('Garden pond obstacle')).toBeInTheDocument();
    });

    it('24. WordUnscrambleGame: adapts word length and anchor hints by difficulty', () => {
      const { rerender } = render(
        <WordUnscrambleGame difficulty="Gentle" onComplete={vi.fn()} />
      );

      // Gentle: 4-letter word with first letter anchor
      expect(screen.getByText('Word Unscramble • Gentle (4 Letters)')).toBeInTheDocument();
      expect(screen.getByText(/🌱 First Letter Anchor: Starts with "C"/i)).toBeInTheDocument();

      // Moderate: 5-letter word
      rerender(<WordUnscrambleGame difficulty="Moderate" onComplete={vi.fn()} />);
      expect(screen.getByText('Word Unscramble • Moderate (5 Letters)')).toBeInTheDocument();

      // Stimulating: 6-letter word
      rerender(<WordUnscrambleGame difficulty="Stimulating" onComplete={vi.fn()} />);
      expect(screen.getByText('Word Unscramble • Stimulating (6 Letters)')).toBeInTheDocument();
    });

    it('25. HomeObservationExplorer: adapts visible options count and proactive clue tier by difficulty', () => {
      const { rerender } = render(
        <BrowserRouter>
          <HomeObservationExplorer difficulty="Gentle" onComplete={vi.fn()} />
        </BrowserRouter>
      );

      // Gentle: 2 options and auto-expanded clue 1
      const gentleOptions = screen.getAllByRole('button', { name: /Resting on the wooden bedside table|Inside the closed wardrobe/i });
      expect(gentleOptions.length).toBe(2);
      expect(screen.getByText(/Look near the head of the bed on the bedside furniture/i)).toBeInTheDocument();

      // Moderate: 3 options
      rerender(
        <BrowserRouter>
          <HomeObservationExplorer difficulty="Moderate" onComplete={vi.fn()} />
        </BrowserRouter>
      );
      const moderateOptions = screen.getAllByRole('button', { name: /Resting on the wooden bedside table|Inside the closed wardrobe|On the floor under the bed/i });
      expect(moderateOptions.length).toBe(3);
    });
  });
});
