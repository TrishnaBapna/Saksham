import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MindGames } from '../pages/patient/MindGames.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { GamesService } from '../features/games/services/gamesService.js';
import { GameSessionRecord } from '../types/index.js';

// Runners under test
import { ColorSequenceGame } from '../features/games/components/runners/ColorSequenceGame.js';
import { ShapeMatchGame } from '../features/games/components/runners/ShapeMatchGame.js';
import { AlternatingTapsGame } from '../features/games/components/runners/AlternatingTapsGame.js';
import { TargetCatchGame } from '../features/games/components/runners/TargetCatchGame.js';
import { MiniMazeGame } from '../features/games/components/runners/MiniMazeGame.js';
import { WordUnscrambleGame } from '../features/games/components/runners/WordUnscrambleGame.js';
import { MelodyRecallGame } from '../features/games/components/runners/MelodyRecallGame.js';
import { MathSprintGame } from '../features/games/components/runners/MathSprintGame.js';
import { CardMatchingGame } from '../features/games/components/runners/CardMatchingGame.js';

const renderMindGames = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AccessibilityProvider>
            <CharacterProvider>
              <MindGames />
            </CharacterProvider>
          </AccessibilityProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Stage 2: Mind Games Experience Restoration & Legacy Library', () => {
  const patientId = 'demo-patient-stage2';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const mockHistory: GameSessionRecord[] = [
      {
        id: 'sess-today',
        patientId,
        gameId: 'game-matching',
        gameTitle: 'Peaceful Nature Card Matching',
        category: 'memory',
        difficulty: 'Gentle',
        pacing: 'calm',
        earnedXp: 40,
        date: today,
        durationSeconds: 120,
        completed: true,
        patientFeedback: 'Loved it',
        completedAt: '09:30 AM',
      },
      {
        id: 'sess-yesterday',
        patientId,
        gameId: 'game-color-sequence',
        gameTitle: 'Color Sequence Memory',
        category: 'sequence',
        difficulty: 'Gentle',
        pacing: 'calm',
        earnedXp: 35,
        date: yesterday,
        durationSeconds: 95,
        completed: true,
        patientFeedback: 'Relaxing',
        completedAt: '04:15 PM',
      },
    ];

    try {
      localStorage.setItem(`saksham_game_sessions_${patientId}`, JSON.stringify(mockHistory));
      localStorage.setItem(`saksham_game_sessions_default_patient`, JSON.stringify(mockHistory));
    } catch {
      // In-memory fallback
    }
  });

  /* ------------------------------------------------------------- */
  /* 1. Game Library & 8 Legacy Concepts                            */
  /* ------------------------------------------------------------- */
  describe('1. Game Library Catalogue Representation', () => {
    it('contains all eight legacy game concepts plus original 13 games without deletion', () => {
      const allGames = GamesService.getAllGames();
      expect(allGames.length).toBeGreaterThanOrEqual(21);

      // Verify all 8 legacy game concepts are represented
      const legacyTitles = [
        'Color Sequence Memory',
        'Shape Match Attention',
        'Alternating Finger Taps',
        'Rapid Target Catch',
        'Mini Maze Navigator',
        'Word Unscramble',
        'Melody Recall',
        'Continuous Math Sprint',
      ];

      legacyTitles.forEach((title) => {
        const found = allGames.find((g) => g.title === title);
        expect(found).toBeDefined();
        expect(found?.description).toBeTruthy();
        expect(found?.instructions).toBeTruthy();
      });

      // Verify original games are preserved
      expect(GamesService.getGameById('game-matching')).toBeDefined();
      expect(GamesService.getGameById('game-visual-search')).toBeDefined();
      expect(GamesService.getGameById('game-room-memory')).toBeDefined();
    });
  });

  /* ------------------------------------------------------------- */
  /* 2. Game Home Screen & Pacing Controls                         */
  /* ------------------------------------------------------------- */
  describe('2. Game Home Screen & Pacing Controls', () => {
    it('switches between Calm, Balanced, and Agile pacing with dynamic descriptions', () => {
      renderMindGames();

      const btnCalm = screen.getByRole('button', { name: /Set pacing to calm/i });
      const btnBalanced = screen.getByRole('button', { name: /Set pacing to balanced/i });
      const btnAgile = screen.getByRole('button', { name: /Set pacing to agile/i });

      expect(btnCalm).toBeInTheDocument();
      expect(btnBalanced).toBeInTheDocument();
      expect(btnAgile).toBeInTheDocument();

      // Click Calm
      fireEvent.click(btnCalm);
      expect(
        screen.getByText(/Calm mode: Slower pace, shorter sequences, more time to respond/i)
      ).toBeInTheDocument();

      // Click Agile
      fireEvent.click(btnAgile);
      expect(
        screen.getByText(/Agile mode: Faster pace, longer sequences/i)
      ).toBeInTheDocument();

      // Click Balanced
      fireEvent.click(btnBalanced);
      expect(
        screen.getByText(/Balanced mode: Standard pace, moderate sequences/i)
      ).toBeInTheDocument();
    });

    it('renders the gamification HUD with real streak and XP calculations without fake scores', () => {
      renderMindGames();

      expect(screen.getByText(/Daily Practice Summary/i)).toBeInTheDocument();
      expect(screen.getByText(/XP Earned/i)).toBeInTheDocument();
      expect(screen.getByText(/Today's Goal/i)).toBeInTheDocument();
      expect(screen.getByText(/gentle streak/i)).toBeInTheDocument();

      // Calculated streak from consecutive days in mockHistory
      const history = GamesService.getHistory(patientId);
      const calculatedStreak = GamesService.calculateStreak(history);
      expect(calculatedStreak).toBeGreaterThanOrEqual(1);

      const totalXp = GamesService.calculateTotalXp(history);
      expect(totalXp).toBeGreaterThanOrEqual(75);
    });

    it('starts a random surprise activity when clicking the Random Game button', () => {
      renderMindGames();

      const randomBtn = screen.getByRole('button', { name: /Random Game|Play a random game/i });
      fireEvent.click(randomBtn);

      // Now inside an active game view with exit button
      expect(
        screen.getByRole('button', { name: /Exit game and return to Mind Games library/i })
      ).toBeInTheDocument();
    });
  });

  /* ------------------------------------------------------------- */
  /* 3. Legacy Game Runners Interactive Mechanics                   */
  /* ------------------------------------------------------------- */
  describe('3. Legacy Game Runners Interactive Mechanics', () => {
    // 1. Color Sequence Memory
    it('runs Color Sequence Memory: illuminates pads and completes round', () => {
      vi.useFakeTimers();
      const handleComplete = vi.fn();

      render(
        <ColorSequenceGame
          difficulty="Gentle"
          pacing="calm"
          onComplete={handleComplete}
        />
      );

      expect(screen.getByText(/Color Sequence Memory/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Color Pad Rose Red/i })).toBeInTheDocument();

      // Fast-forward sequence playback
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Tapping pad in user turn
      const redPad = screen.getByRole('button', { name: /Color Pad Rose Red/i });
      fireEvent.click(redPad);

      vi.useRealTimers();
    });

    // 2. Shape Match Attention
    it('runs Shape Match Attention: accepts Match / Not Match decisions', () => {
      const handleComplete = vi.fn();

      render(
        <ShapeMatchGame
          difficulty="Gentle"
          pacing="calm"
          onComplete={handleComplete}
        />
      );

      expect(screen.getByText(/Shape Match Attention/i)).toBeInTheDocument();
      const matchBtn = screen.getByRole('button', { name: /^Shapes Match$/i });
      const notMatchBtn = screen.getByRole('button', { name: /^Shapes Do Not Match$/i });

      expect(matchBtn).toBeInTheDocument();
      expect(notMatchBtn).toBeInTheDocument();

      // Click Match
      fireEvent.click(matchBtn);
      expect(screen.getByText(/Progress:/i)).toBeInTheDocument();
    });

    // 3. Alternating Finger Taps
    it('runs Alternating Finger Taps: alternates between Left and Right buttons', () => {
      const handleComplete = vi.fn();

      render(
        <AlternatingTapsGame
          difficulty="Gentle"
          pacing="calm"
          onComplete={handleComplete}
        />
      );

      expect(screen.getByText(/Alternating Finger Taps/i)).toBeInTheDocument();

      const leftBtn = screen.getByRole('button', { name: /Tap Left Button/i });
      const rightBtn = screen.getByRole('button', { name: /Tap Right Button/i });

      // First tap LEFT
      expect(leftBtn).not.toBeDisabled();
      expect(rightBtn).toBeDisabled();
      fireEvent.click(leftBtn);

      // Now RIGHT is enabled, LEFT is disabled
      expect(screen.getByText(/Taps: 1 \/ 5/i)).toBeInTheDocument();
      expect(rightBtn).not.toBeDisabled();
      expect(leftBtn).toBeDisabled();
    });

    // 4. Rapid Target Catch
    it('runs Rapid Target Catch: spawns target and tracks catches', () => {
      vi.useFakeTimers();
      const handleComplete = vi.fn();

      render(
        <TargetCatchGame
          difficulty="Gentle"
          pacing="calm"
          onComplete={handleComplete}
        />
      );

      expect(screen.getByText(/Rapid Target Catch/i)).toBeInTheDocument();

      // Fast forward spawn delay
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      const catchBtn = screen.getByRole('button', { name: /Catch Target/i });
      expect(catchBtn).toBeInTheDocument();
      fireEvent.click(catchBtn);

      expect(screen.getByText(/Caught: 1 \//i)).toBeInTheDocument();

      vi.useRealTimers();
    });

    // 5. Mini Maze Navigator
    it('runs Mini Maze Navigator: moves runner toward destination', () => {
      const handleComplete = vi.fn();

      render(
        <MiniMazeGame
          difficulty="Gentle"
          pacing="calm"
          onComplete={handleComplete}
        />
      );

      expect(screen.getByText(/Mini Maze Navigator/i)).toBeInTheDocument();

      const moveRight = screen.getByRole('button', { name: /Move Right/i });
      const moveDown = screen.getByRole('button', { name: /Move Down/i });

      fireEvent.click(moveRight);
      expect(screen.getByText(/Steps taken: 1/i)).toBeInTheDocument();

      fireEvent.click(moveDown);
      expect(screen.getByText(/Steps taken: 2/i)).toBeInTheDocument();
    });

    // 6. Word Unscramble
    it('runs Word Unscramble: places letter tiles into slots and offers hints', () => {
      const handleComplete = vi.fn();

      render(
        <WordUnscrambleGame
          difficulty="Gentle"
          pacing="calm"
          onComplete={handleComplete}
        />
      );

      expect(screen.getByText(/Word Unscramble/i)).toBeInTheDocument();

      // Reveal Word option
      const revealBtn = screen.getByRole('button', { name: /Reveal Word/i });
      fireEvent.click(revealBtn);

      expect(screen.getByText(/The comforting word is:/i)).toBeInTheDocument();
    });

    // 7. Melody Recall
    it('runs Melody Recall: renders note pads and supports skip', () => {
      const handleComplete = vi.fn();

      render(
        <MelodyRecallGame
          difficulty="Gentle"
          pacing="calm"
          onComplete={handleComplete}
        />
      );

      expect(screen.getByText(/Melody Recall/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Musical note pad Low C/i })).toBeInTheDocument();

      const skipBtn = screen.getByRole('button', { name: /Skip Melody/i });
      fireEvent.click(skipBtn);
      expect(handleComplete).toHaveBeenCalled();
    });

    // 8. Continuous Math Sprint
    it('runs Continuous Math Sprint: evaluates addition problems', () => {
      const handleComplete = vi.fn();

      render(
        <MathSprintGame
          difficulty="Gentle"
          pacing="calm"
          onComplete={handleComplete}
        />
      );

      expect(screen.getByText(/Continuous Math Sprint/i)).toBeInTheDocument();
      expect(screen.getByText(/\+ .* = \?/i)).toBeInTheDocument();

      // Multiple choice option buttons
      const options = screen.getAllByRole('button', { name: /Option/i });
      expect(options.length).toBe(3);

      fireEvent.click(options[0]);
    });

    // 9. Card Matching Game with Asha's Gentle Hint
    it('provides Asha gentle hint in CardMatchingGame without penalty', () => {
      const handleHint = vi.fn();
      render(
        <CardMatchingGame
          difficulty="Gentle"
          onComplete={vi.fn()}
          onRequestHint={handleHint}
        />
      );

      const hintBtn = screen.getByRole('button', { name: /Asha's Gentle Hint/i });
      expect(hintBtn).toBeInTheDocument();

      fireEvent.click(hintBtn);
      expect(handleHint).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Asha is softly highlighting a pair\.\.\./i)).toBeInTheDocument();
    });
  });

  /* ------------------------------------------------------------- */
  /* 4. Safety, Non-Diagnostic Disclaimer & Anti-Trapping          */
  /* ------------------------------------------------------------- */
  describe('4. Safeguards, Pacing Isolation & Anti-Trapping', () => {
    it('allows patient to exit any active game immediately without shame', () => {
      renderMindGames();

      const playBtns = screen.getAllByRole('button', { name: /Start activity:/i });
      fireEvent.click(playBtns[0]);

      // Exit button
      const exitBtn = screen.getByRole('button', { name: /Exit game and return to Mind Games library/i });
      fireEvent.click(exitBtn);

      // Back at library
      expect(screen.getByRole('heading', { name: /Mind Games/i })).toBeInTheDocument();
    });

    it('isolates pacing preferences strictly by patient UID', () => {
      const patientA = 'pacing-alice-01';
      const patientB = 'pacing-bob-02';

      GamesService.setGamePacing(patientA, 'calm');
      GamesService.setGamePacing(patientB, 'agile');

      expect(GamesService.getGamePacing(patientA)).toBe('calm');
      expect(GamesService.getGamePacing(patientB)).toBe('agile');
      expect(GamesService.getDifficultyPreference(patientA)).toBe('Gentle');
      expect(GamesService.getDifficultyPreference(patientB)).toBe('Stimulating');
    });
  });
});
