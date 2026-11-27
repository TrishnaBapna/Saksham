import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MindGames } from '../pages/patient/MindGames.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { GamesService } from '../features/games/services/gamesService.js';
import { GameSessionFeedbackModal } from '../features/games/components/GameSessionFeedbackModal.js';
import { GameSessionRecord } from '../types/index.js';

// Locale imports for key parity testing
import { enTranslations } from '../i18n/locales/en.js';
import { hiTranslations } from '../i18n/locales/hi.js';
import { mrTranslations } from '../i18n/locales/mr.js';
import { taTranslations } from '../i18n/locales/ta.js';
import { teTranslations } from '../i18n/locales/te.js';
import { knTranslations } from '../i18n/locales/kn.js';
import { bnTranslations } from '../i18n/locales/bn.js';

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

describe('Phase 3.20: Games Experience Simplification & Cognitive Accessibility Suite', () => {
  const patientId = 'phase320-demo-patient';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    const today = new Date().toISOString().split('T')[0];
    const mockHistory: GameSessionRecord[] = [
      {
        id: 'sess-p320-1',
        patientId,
        gameId: 'game-matching',
        gameTitle: 'Peaceful Nature Card Matching',
        category: 'memory',
        difficulty: 'Gentle',
        pacing: 'calm',
        earnedXp: 30,
        date: today,
        durationSeconds: 110,
        completed: true,
        patientFeedback: 'Relaxing',
        completedAt: '10:00 AM',
      },
    ];

    try {
      localStorage.setItem(`saksham_game_sessions_${patientId}`, JSON.stringify(mockHistory));
      localStorage.setItem(`saksham_game_sessions_default_patient`, JSON.stringify(mockHistory));
      localStorage.setItem(`saksham_game_sessions_demo-patient-001`, JSON.stringify(mockHistory));
    } catch {
      // In-memory fallback
    }
  });

  /* ------------------------------------------------------------- */
  /* 1. Landing Screen Dignified Presentation & Structure          */
  /* ------------------------------------------------------------- */
  describe('1. Landing Screen Dignified Presentation & Stable Recommendation', () => {
    it('renders dignified welcoming heading and subtitle without clinical or infantilizing labels', () => {
      renderMindGames();

      // Dignified heading elements
      const headingElements = screen.getAllByText(/Let's play/i);
      expect(headingElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Take your time\. Choose something you enjoy\./i)).toBeInTheDocument();

      // Retains accessible name for screen readers & backwards compatibility
      expect(screen.getByRole('heading', { name: /^Mind Games$/i })).toBeInTheDocument();

      // Cognitive wellness non-diagnostic safe space banner
      expect(screen.getByText(/Cognitive Wellness Safe Space/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Performance is never a medical test, IQ score, or diagnostic evaluation/i)
      ).toBeInTheDocument();
    });

    it('displays a decluttered landing view focusing directly on cognitive games without redundant banners', () => {
      renderMindGames();

      // Decluttered landing omits redundant banner cards per user refinement
      expect(screen.queryByText(/Today's Activity/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Recommended:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Gentle Adaptive Pacing/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Activity Guide/i)).not.toBeInTheDocument();

      // Core game selection and safety banner remain intact
      expect(screen.getByText(/Choose another game/i)).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /(Play Game|Start activity):/i }).length).toBeGreaterThanOrEqual(21);
    });

    it('renders the "Choose another game" section and all 21 existing catalogue games', () => {
      renderMindGames();

      expect(screen.getByText(/Choose another game/i)).toBeInTheDocument();

      const allGames = GamesService.getAllGames();
      expect(allGames.length).toBeGreaterThanOrEqual(21);

      // Verify representative sample of games exist
      expect(screen.getByText('Peaceful Nature Card Matching')).toBeInTheDocument();
      expect(screen.getByText('Daily Routine Story Order')).toBeInTheDocument();
      expect(screen.getByText('Find the Hidden Blossom')).toBeInTheDocument();
      expect(screen.getByText('Complete the Shape Pattern')).toBeInTheDocument();
      expect(screen.getByText('Color Sequence Memory')).toBeInTheDocument();
      expect(screen.getByText('Mini Maze Navigator')).toBeInTheDocument();
    });

    it('ensures game cards have clear labels, short descriptions, and omit cognitive score rankings', () => {
      renderMindGames();

      const card = screen.getByRole('article', {
        name: /Peaceful Nature Card Matching - Memory & Recall/i,
      });
      expect(card).toBeInTheDocument();

      // Verify no deficit or clinical score rankings on card
      expect(card.textContent).not.toMatch(/IQ|clinical impairment|deficit|failure/i);

      // Verify large activation target
      const playBtns = screen.getAllByRole('button', {
        name: /(Play Game|Start activity): Peaceful Nature Card Matching/i,
      });
      expect(playBtns.length).toBeGreaterThan(0);
    });
  });

  /* ------------------------------------------------------------- */
  /* 2. Contextual Reorientation & Help Modal                       */
  /* ------------------------------------------------------------- */
  describe('2. Contextual Reorientation & Help Modal', () => {
    it('opens landing reorientation help modal explaining location and actions in plain language', () => {
      renderMindGames();

      const helpBtn = screen.getByRole('button', { name: /Help and orientation/i });
      expect(helpBtn).toBeInTheDocument();

      fireEvent.click(helpBtn);

      // Reorientation modal visible
      expect(screen.getByRole('dialog', { name: /Need Help Finding Your Way\?/i })).toBeInTheDocument();
      expect(
        screen.getByText(
          /You're in the games section\. You can choose a game to play or go back to Home\./i
        )
      ).toBeInTheDocument();

      // Close modal
      const gotItBtn = screen.getByRole('button', { name: /Got it/i });
      fireEvent.click(gotItBtn);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens in-game reorientation modal explaining active game and exit option', () => {
      renderMindGames();

      const playBtns = screen.getAllByRole('button', { name: /(Play Game|Start activity):/i });
      fireEvent.click(playBtns[0]); // Starts Peaceful Nature Card Matching

      // In-game header Help button
      const inGameHelpBtn = screen.getByRole('button', { name: /Help and orientation/i });
      fireEvent.click(inGameHelpBtn);

      // Active game reorientation text
      expect(
        screen.getByText(
          /You're playing Peaceful Nature Card Matching\. You can continue, ask for a hint, or return to the games screen\./i
        )
      ).toBeInTheDocument();

      // Dismiss help via Continue Playing
      const continueBtn = screen.getByRole('button', { name: /Continue playing/i });
      fireEvent.click(continueBtn);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  /* ------------------------------------------------------------- */
  /* 3. Active Game UI, Predictable Exit & Accidental Recovery      */
  /* ------------------------------------------------------------- */
  describe('3. Active Game Interface, Predictable Exit & Accidental Exit Recovery', () => {
    it('provides clear, unambiguous exit button labeled "Back to games"', () => {
      renderMindGames();

      const playBtns = screen.getAllByRole('button', { name: /(Play Game|Start activity):/i });
      fireEvent.click(playBtns[0]);

      const exitBtn = screen.getByRole('button', {
        name: /Exit game and return to Mind Games library/i,
      });
      expect(exitBtn).toBeInTheDocument();
      expect(exitBtn).toHaveTextContent(/Back to games/i);
    });

    it('exits immediately without shame when duration is short (<15s)', () => {
      renderMindGames();

      const playBtns = screen.getAllByRole('button', { name: /(Play Game|Start activity):/i });
      fireEvent.click(playBtns[0]);

      const exitBtn = screen.getByRole('button', {
        name: /Exit game and return to Mind Games library/i,
      });
      fireEvent.click(exitBtn);

      // Immediately back at library without blocking dialog
      expect(screen.getByRole('heading', { name: /^Mind Games$/i })).toBeInTheDocument();
    });

    it('displays gentle confirmation dialog when exiting after substantial engagement (>=15s)', () => {
      vi.useFakeTimers();

      renderMindGames();

      const playBtns = screen.getAllByRole('button', { name: /(Play Game|Start activity):/i });
      fireEvent.click(playBtns[0]);

      // Advance time by 20 seconds to simulate real play
      act(() => {
        vi.advanceTimersByTime(20000);
      });

      const exitBtn = screen.getByRole('button', {
        name: /Exit game and return to Mind Games library/i,
      });
      fireEvent.click(exitBtn);

      // Confirmation dialog appears
      expect(screen.getByText(/Would you like to leave this game\?/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Your progress in this round will be saved\. You can always come back anytime\./i)
      ).toBeInTheDocument();

      // User chooses "Continue playing" -> stays in game
      const continueBtn = screen.getByRole('button', { name: /Continue playing/i });
      fireEvent.click(continueBtn);
      expect(screen.queryByText(/Would you like to leave this game\?/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pause game/i })).toBeInTheDocument();

      // User clicks exit again and selects "Leave game" -> returns cleanly
      fireEvent.click(exitBtn);
      const leaveBtn = screen.getByRole('button', { name: /Leave game/i });
      fireEvent.click(leaveBtn);

      expect(screen.getByRole('heading', { name: /^Mind Games$/i })).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('shows calm elapsed timer without high-pressure countdowns', () => {
      renderMindGames();

      const playBtns = screen.getAllByRole('button', { name: /(Play Game|Start activity):/i });
      fireEvent.click(playBtns[0]);

      // Elapsed time is rendered
      const timeDisplay = screen.getByLabelText(/Time elapsed:/i);
      expect(timeDisplay).toBeInTheDocument();
      expect(timeDisplay).toHaveTextContent(/0:00/i);

      // Verify no countdown or pressure labels
      expect(screen.queryByText(/Time's up|Hurry|Countdown|Game Over/i)).toBeNull();
    });
  });

  /* ------------------------------------------------------------- */
  /* 4. Gentle Completion Screen                                   */
  /* ------------------------------------------------------------- */
  describe('4. Gentle Completion Experience', () => {
    it('renders gentle, non-punitive completion modal with "Well done!" and actions', () => {
      const handlePlayAgain = vi.fn();
      const handleFinish = vi.fn();
      const mockGame = GamesService.getGameById('game-matching')!;

      render(
        <LanguageProvider>
          <GameSessionFeedbackModal
            game={mockGame}
            difficulty="Gentle"
            elapsedSeconds={90}
            onPlayAgain={handlePlayAgain}
            onFinish={handleFinish}
          />
        </LanguageProvider>
      );

      // Gentle celebration heading & message
      expect(screen.getByText(/Well done!/i)).toBeInTheDocument();
      expect(
        screen.getByText(/You finished your game\. Thank you for playing\./i)
      ).toBeInTheDocument();

      // Non-diagnostic wellness note
      expect(screen.getByText(/Cognitive Wellness Note:/i)).toBeInTheDocument();
      expect(
        screen.getByText(
          /This activity is designed purely for supportive mental engagement and enjoyment\. It is not an IQ test or clinical assessment\./i
        )
      ).toBeInTheDocument();

      // Primary and secondary actions
      const playAgainBtn = screen.getByRole('button', { name: /Play again/i });
      const goHomeBtn = screen.getByRole('button', { name: /Go home/i });

      expect(playAgainBtn).toBeInTheDocument();
      expect(goHomeBtn).toBeInTheDocument();

      // Click Go Home
      fireEvent.click(goHomeBtn);
      expect(handleFinish).toHaveBeenCalledWith('Relaxing');
    });

    it('allows restarting game from completion screen', () => {
      const handlePlayAgain = vi.fn();
      const handleFinish = vi.fn();
      const mockGame = GamesService.getGameById('game-matching')!;

      render(
        <LanguageProvider>
          <GameSessionFeedbackModal
            game={mockGame}
            difficulty="Gentle"
            elapsedSeconds={60}
            onPlayAgain={handlePlayAgain}
            onFinish={handleFinish}
          />
        </LanguageProvider>
      );

      const playAgainBtn = screen.getByRole('button', { name: /Play again/i });
      fireEvent.click(playAgainBtn);
      expect(handlePlayAgain).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------- */
  /* 5. Localization Key Parity Across 7 Indic Languages           */
  /* ------------------------------------------------------------- */
  describe('5. Localization Key Parity Across 7 Official Indic Languages', () => {
    const p320Keys = [
      'games.lets_play',
      'games.lets_play_subtitle',
      'games.todays_activity',
      'games.choose_another_game',
      'games.reorientation_help_title',
      'games.reorientation_help_landing',
      'games.reorientation_help_active',
      'games.confirm_exit_title',
      'games.confirm_exit_message',
      'games.continue_playing',
      'games.leave_game',
      'games.completion_well_done',
      'games.completion_message',
      'games.play_again',
      'games.go_home',
      'games.help_button',
    ];

    const dictionaries: { lang: string; dict: Record<string, string> }[] = [
      { lang: 'English (en)', dict: enTranslations },
      { lang: 'Hindi (hi)', dict: hiTranslations },
      { lang: 'Marathi (mr)', dict: mrTranslations },
      { lang: 'Tamil (ta)', dict: taTranslations },
      { lang: 'Telugu (te)', dict: teTranslations },
      { lang: 'Kannada (kn)', dict: knTranslations },
      { lang: 'Bengali (bn)', dict: bnTranslations },
    ];

    dictionaries.forEach(({ lang, dict }) => {
      it(`verifies 100% key parity and non-empty translation for ${lang}`, () => {
        p320Keys.forEach((key) => {
          expect(dict[key], `Missing key "${key}" in ${lang}`).toBeDefined();
          expect(typeof dict[key]).toBe('string');
          expect(dict[key].trim().length).toBeGreaterThan(0);
        });
      });
    });
  });
});
