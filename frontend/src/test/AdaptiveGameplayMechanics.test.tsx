/**
 * SAKSHAM NEURO-CARE — ADAPTIVE GAMEPLAY MECHANICS TRANSFORMATION SUITE
 * Verifies:
 * 1. Removal of cluttered banners in Mind Games lobby (Today's Activity, Asha Guide banner, Gentle Adaptive Pacing box).
 * 2. True gameplay mechanic transformation across ALL 21 catalogue games (not merely labels/badges).
 * 3. Direct mounting of all 5 newly dedicated runners + Melody Sequence bell variant inside MindGames.
 * 4. Accessibility preference preservation (reducedMotion, reducedVisualClutter).
 * 5. Patient progress persistence + Caregiver & Doctor mechanic transition reporting + strict authorization & non-diagnostic safety.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { MindGames } from '../pages/patient/MindGames.js';
import { GamesService, GAME_CATALOGUE } from '../features/games/services/gamesService.js';
import { AdaptiveDifficultyService } from '../features/games/services/adaptiveDifficultyService.js';
import {
  formatMechanicModeLabel,
  resolveAdaptiveGameplay,
} from '../features/games/utils/adaptiveMechanics.js';
import { CardMatchingGame } from '../features/games/components/runners/CardMatchingGame.js';
import { WarmObjectRecallGame } from '../features/games/components/runners/WarmObjectRecallGame.js';
import { LovedOnesMemoryGame } from '../features/games/components/runners/LovedOnesMemoryGame.js';
import { VisualSearchGame } from '../features/games/components/runners/VisualSearchGame.js';
import { SpotDifferenceGame } from '../features/games/components/runners/SpotDifferenceGame.js';
import { DailySequenceGame } from '../features/games/components/runners/DailySequenceGame.js';
import { ColorSequenceGame } from '../features/games/components/runners/ColorSequenceGame.js';
import { PatternMatchGame } from '../features/games/components/runners/PatternMatchGame.js';
import { SymbolHarmonyGame } from '../features/games/components/runners/SymbolHarmonyGame.js';
import { WordGardenGame } from '../features/games/components/runners/WordGardenGame.js';
import { HouseholdRiddlesGame } from '../features/games/components/runners/HouseholdRiddlesGame.js';
import { EverydayHelpersGame } from '../features/games/components/runners/EverydayHelpersGame.js';
import { HomeObservationExplorer } from '../features/games/components/runners/RoomMemoryActivity.js';
import { ShapeMatchGame } from '../features/games/components/runners/ShapeMatchGame.js';
import { AlternatingTapsGame } from '../features/games/components/runners/AlternatingTapsGame.js';
import { TargetCatchGame } from '../features/games/components/runners/TargetCatchGame.js';
import { MiniMazeGame } from '../features/games/components/runners/MiniMazeGame.js';
import { WordUnscrambleGame } from '../features/games/components/runners/WordUnscrambleGame.js';
import { MelodyRecallGame } from '../features/games/components/runners/MelodyRecallGame.js';
import { MathSprintGame } from '../features/games/components/runners/MathSprintGame.js';
import { CaregiverReportService } from '../features/caregiver/services/caregiverReportService.js';
import { CaregiverObservationReport } from '../features/caregiver/components/CaregiverObservationReport.js';
import { DoctorAnalyticsService } from '../features/doctor/services/doctorAnalyticsService.js';
import { DoctorLongitudinalAnalytics } from '../features/doctor/components/DoctorLongitudinalAnalytics.js';
import { GameRunMetrics } from '../types/index.js';

const patientA = 'patient-mechanics-alpha';
const patientB = 'patient-mechanics-beta';
const assignedDoc = 'doc-mechanics-1';
const unassignedDoc = 'doc-mechanics-unassigned';

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AccessibilityProvider>{ui}</AccessibilityProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('Adaptive Gameplay Mechanics Transformation (21 Games + Decluttered Lobby)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    AdaptiveDifficultyService.resetProfile(patientA);
    AdaptiveDifficultyService.resetProfile(patientB);
    GamesService.clearPatientCache(patientA);
    GamesService.clearPatientCache(patientB);
  });

  it('1. removes the 3 decluttered cards from Mind Games lobby while preserving library & launch', () => {
    renderWithProviders(<MindGames />);

    expect(screen.getByRole('heading', { name: /^Mind Games$/i })).toBeInTheDocument();

    // Verify all 3 screenshot clutter blocks are completely gone
    expect(screen.queryByText(/TODAY'S ACTIVITY/i)).toBeNull();
    expect(screen.queryByText(/Recommended:\s*Peaceful Nature Card Matching/i)).toBeNull();
    expect(screen.queryByText(/Activity Guide/i)).toBeNull();
    expect(
      screen.queryByText(/Welcome to Mind Games! These activities are here for your enjoyment/i)
    ).toBeNull();
    expect(screen.queryByText(/Gentle Adaptive Pacing/i)).toBeNull();
    expect(screen.queryByText(/Auto-Adaptive Active/i)).toBeNull();
    expect(screen.queryByText(/Comfort-Attuned/i)).toBeNull();

    // Library of all 21 games remains intact
    const playBtns = screen.getAllByRole('button', { name: /(Play Game|Start activity):/i });
    expect(playBtns.length).toBe(21);
  });

  it('2. launches dedicated runners for previously disconnected catalogue entries directly inside MindGames', () => {
    renderWithProviders(<MindGames />);

    // Warm Object Recall
    fireEvent.click(screen.getByRole('button', { name: /Play Game: Warm Object Recall/i }));
    expect(screen.getByText(/I am Ready to Recall/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Exit game and return to Mind Games library/i }));

    // Spot the Difference
    fireEvent.click(screen.getByRole('button', { name: /Play Game: Spot the Peaceful Change/i }));
    expect(screen.getByText(/Scene A • Peaceful Morning/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Exit game and return to Mind Games library/i }));

    // Symmetric Symbol Harmony
    fireEvent.click(screen.getByRole('button', { name: /Play Game: Symmetric Symbol Harmony/i }));
    expect(screen.getByText(/Target Rangoli Motif/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Exit game and return to Mind Games library/i }));

    // Household Word Riddles
    fireEvent.click(screen.getByRole('button', { name: /Play Game: Household Word Riddles/i }));
    expect(screen.getByText(/Show Helpful Clue/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Exit game and return to Mind Games library/i }));

    // Everyday Helpers
    fireEvent.click(screen.getByRole('button', { name: /Play Game: Everyday Object Helpers/i }));
    expect(screen.getByText(/Task: Reading the morning newspaper/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Exit game and return to Mind Games library/i }));

    // Musical Color Chimes variant (game-melody-sequence)
    fireEvent.click(screen.getByRole('button', { name: /Play Game: Gentle Color Sequence/i }));
    expect(screen.getByText(/Musical Color Chimes/i)).toBeInTheDocument();
  });

  it('3. produces distinct GameMechanicProfile configurations for all 21 catalogue games across Gentle, Moderate, and Stimulating', () => {
    expect(GAME_CATALOGUE.length).toBe(21);

    for (const game of GAME_CATALOGUE) {
      const gentle = AdaptiveDifficultyService.getAdaptedGameParameters(patientA, game.id, 'Gentle');
      const moderate = AdaptiveDifficultyService.getAdaptedGameParameters(patientA, game.id, 'Moderate');
      const stimulating = AdaptiveDifficultyService.getAdaptedGameParameters(
        patientA,
        game.id,
        'Stimulating'
      );

      expect(gentle.mechanics).toBeDefined();
      expect(moderate.mechanics).toBeDefined();
      expect(stimulating.mechanics).toBeDefined();

      expect(gentle.mechanics!.clueLevel).toBe('automatic');
      expect(moderate.mechanics!.clueLevel).toBe('on_demand');
      expect(stimulating.mechanics!.clueLevel).toBe('minimal');
      expect(stimulating.mechanics!.distractorSimilarity).toBe('similar');
      expect(stimulating.mechanics!.ruleComplexity).toBeGreaterThanOrEqual(
        gentle.mechanics!.ruleComplexity
      );
      expect(stimulating.mechanics!.appliedMechanicsSummary.length).toBeGreaterThan(0);
    }
  });

  it('4. preserves accessibility settings without allowing difficulty progression to strip safety caps', () => {
    const stimParams = AdaptiveDifficultyService.getAdaptedGameParameters(
      patientA,
      'game-matching',
      'Stimulating'
    );
    const gentleParams = AdaptiveDifficultyService.getAdaptedGameParameters(
      patientA,
      'game-matching',
      'Gentle'
    );

    const calmGentle = resolveAdaptiveGameplay('Gentle', gentleParams, {
      reducedMotion: true,
      reducedVisualClutter: true,
      highContrast: true,
      largeTouchTargets: true,
    });
    expect(calmGentle.mechanics.previewDurationMs).toBeGreaterThanOrEqual(2400);
    expect(calmGentle.avoidFastTransitions).toBe(true);
    expect(calmGentle.highContrastBoost).toBe(true);
    expect(calmGentle.largeHitTargets).toBe(true);

    const clutterCappedStim = resolveAdaptiveGameplay('Stimulating', stimParams, {
      reducedVisualClutter: true,
    });
    expect(clutterCappedStim.distractorCap).toBe(2);
    expect(clutterCappedStim.mechanics.clueLevel).toBe('on_demand');

    // VisualSearch under reducedVisualClutter keeps 9 items max cleanly
    const stimVisualParams = AdaptiveDifficultyService.getAdaptedGameParameters(
      patientA,
      'game-visual-search',
      'Stimulating'
    );
    const stimSpotParams = AdaptiveDifficultyService.getAdaptedGameParameters(
      patientA,
      'game-spot-difference',
      'Stimulating'
    );
    const { rerender } = render(
      <VisualSearchGame difficulty="Stimulating" adaptiveParams={stimVisualParams} onComplete={vi.fn()} />
    );
    expect(screen.getAllByRole('button', { name: /Item:/i }).length).toBe(stimVisualParams.gridSize);
    rerender(
      <SpotDifferenceGame difficulty="Stimulating" adaptiveParams={stimSpotParams} onComplete={vi.fn()} />
    );
    expect(screen.getAllByRole('button', { name: /Scene B tile/i }).length).toBe(9);
  });

  it('5. CardMatchingGame, WarmObjectRecallGame, and LovedOnesMemoryGame transform core memory mechanics', () => {
    // 5a. CardMatchingGame: Quick Preview + Memory Anchor in Gentle -> Fine Visual Pairs & No Preview in Stimulating
    const gentleMatch = AdaptiveDifficultyService.getAdaptedGameParameters(
      patientA,
      'game-matching',
      'Gentle'
    );
    const stimMatch = AdaptiveDifficultyService.getAdaptedGameParameters(
      patientA,
      'game-matching',
      'Stimulating'
    );
    const { rerender } = render(
      <CardMatchingGame difficulty="Gentle" adaptiveParams={gentleMatch} onComplete={vi.fn()} />
    );
    expect(screen.getByTestId('card-matching-first-anchor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quick Preview/i })).toBeInTheDocument();

    rerender(
      <CardMatchingGame difficulty="Stimulating" adaptiveParams={stimMatch} onComplete={vi.fn()} />
    );
    expect(screen.queryByTestId('card-matching-first-anchor')).toBeNull();
    expect(screen.queryByRole('button', { name: /Quick Preview/i })).toBeNull();
    expect(screen.getByTestId('card-matching-high-similarity-badge')).toHaveTextContent(
      /Fine Visual Pairs/i
    );

    // 5b. WarmObjectRecallGame: 4 labeled tray -> 5 covered-tray recall -> 6 change-detection recall
    rerender(<WarmObjectRecallGame difficulty="Gentle" onComplete={vi.fn()} />);
    expect(screen.getByText(/Guided Observation \(4 items\)/i)).toBeInTheDocument();
    expect(screen.getByText('Tea Kettle')).toBeInTheDocument();

    rerender(<WarmObjectRecallGame difficulty="Stimulating" onComplete={vi.fn()} />);
    expect(screen.getByText(/Change-Detection Recall \(Spot 2 New\)/i)).toBeInTheDocument();
    expect(screen.queryByText('Tea Kettle')).toBeNull(); // Labels veiled during study in Stimulating

    // 5c. LovedOnesMemoryGame: named choices at Gentle -> name-veiled 2-stage recall at Stimulating
    rerender(<LovedOnesMemoryGame difficulty="Stimulating" patientId="demo-patient-001" onComplete={vi.fn()} />);
    expect(screen.getByText(/Names veiled for gentle recall/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Tap portrait to identify/i).length).toBeGreaterThanOrEqual(2);
  });

  it('6. DailySequenceGame, PatternMatchGame, ColorSequenceGame, and SymbolHarmonyGame alter clues, clock visibility & multi-stage symmetry', () => {
    // 6a. DailySequenceGame: Timeline Guide at Gentle -> Veiled Clock Timestamps at Stimulating
    const { rerender } = render(<DailySequenceGame difficulty="Gentle" onComplete={vi.fn()} />);
    expect(screen.getByTestId('daily-sequence-timeline-guide')).toBeInTheDocument();
    expect(screen.getByText(/07:00 AM/i)).toBeInTheDocument();

    rerender(<DailySequenceGame difficulty="Stimulating" onComplete={vi.fn()} />);
    expect(screen.getByTestId('daily-sequence-clock-veiled')).toBeInTheDocument();
    expect(screen.queryByText(/07:00 AM/i)).toBeNull();
    expect(
      screen.getAllByText(/Routine event \(recall sequence without clock cue\)/i).length
    ).toBeGreaterThanOrEqual(3);

    // 6b. PatternMatchGame: Guided A <-> B Rhythm at Gentle -> Multi-step Stage at Stimulating
    rerender(<PatternMatchGame difficulty="Gentle" onComplete={vi.fn()} />);
    expect(screen.getByText(/Guided A ↔ B Rhythm/i)).toBeInTheDocument();
    rerender(<PatternMatchGame difficulty="Stimulating" onComplete={vi.fn()} />);
    expect(screen.queryByText(/Guided A ↔ B Rhythm/i)).toBeNull();
    expect(screen.getByText(/Step 1\/2/i)).toBeInTheDocument();

    // 6c. ColorSequenceGame & Melody Bells: Visual trail in Gentle -> Cycle 1/2 extending in Stimulating
    rerender(<ColorSequenceGame difficulty="Gentle" variant="melody_bells" onComplete={vi.fn()} />);
    expect(screen.getByText(/Musical Color Chimes/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Visual sequence guide')).toBeInTheDocument();
    rerender(<ColorSequenceGame difficulty="Stimulating" variant="color_pads" onComplete={vi.fn()} />);
    expect(screen.getByText(/Cycle 1\/2/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Visual sequence guide')).toBeNull();

    // 6d. SymbolHarmonyGame: Direct Pair Match -> Mirrored 2x2 Quadrant Symmetry
    rerender(<SymbolHarmonyGame difficulty="Gentle" onComplete={vi.fn()} />);
    expect(screen.getByText(/Direct Pair Match/i)).toBeInTheDocument();
    rerender(<SymbolHarmonyGame difficulty="Stimulating" onComplete={vi.fn()} />);
    expect(screen.getByText(/Complete the Symmetrical 2×2 Rangoli/i)).toBeInTheDocument();
  });

  it('7. WordGarden, HouseholdRiddles, EverydayHelpers, WordUnscramble, and RoomMemory transform language & recall mechanics', () => {
    // 7a. WordGarden: Starter Anchor at Gentle -> Dual-Blank Sequential Fill at Stimulating
    const onWordDone = vi.fn<(metrics?: GameRunMetrics) => void>();
    const { rerender } = render(<WordGardenGame difficulty="Gentle" onComplete={onWordDone} />);
    expect(screen.getByTestId('word-garden-starter-anchor')).toBeInTheDocument();

    vi.useFakeTimers();
    rerender(<WordGardenGame difficulty="Stimulating" onComplete={onWordDone} />);
    expect(screen.getByTestId('word-garden-dual-blank-indicator')).toHaveTextContent(
      'Filling Blank 1 of 2'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Letter F' }));
    expect(screen.getByTestId('word-garden-dual-blank-indicator')).toHaveTextContent(
      'Filling Blank 2 of 2'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Letter R' }));
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(onWordDone).toHaveBeenCalledTimes(1);
    expect(onWordDone.mock.calls[0][0]?.mechanicMode).toBe('independent_challenge');
    vi.useRealTimers();

    // 7b. HouseholdRiddles: Emoji + Clue at Gentle -> Text-only 3-stage close distractors at Stimulating
    rerender(<HouseholdRiddlesGame difficulty="Gentle" onComplete={vi.fn()} />);
    expect(screen.getByText(/Riddle 1 \/ 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Second Clue:/i)).toBeInTheDocument();
    rerender(<HouseholdRiddlesGame difficulty="Stimulating" onComplete={vi.fn()} />);
    expect(screen.getByText(/Riddle 1 \/ 3/i)).toBeInTheDocument();
    expect(screen.queryByText(/Second Clue:/i)).toBeNull();

    // 7c. EverydayHelpers: Guided single task -> Connect 3 pairs -> 2-object kit
    rerender(<EverydayHelpersGame difficulty="Moderate" onComplete={vi.fn()} />);
    expect(screen.getByText(/Connect 3 Pairs/i)).toBeInTheDocument();
    rerender(<EverydayHelpersGame difficulty="Stimulating" onComplete={vi.fn()} />);
    expect(screen.getByText(/2-Object Kit \(0\/2\)/i)).toBeInTheDocument();

    // 7d. WordUnscramble: Extra decoy letter in Stimulating (7 tiles for 6-letter HEALTH)
    rerender(<WordUnscrambleGame difficulty="Stimulating" onComplete={vi.fn()} />);
    expect(screen.getByTestId('unscramble-decoy-notice')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Letter tile/i }).length).toBe(7);

    // 7e. RoomMemoryActivity: Study & Veil Photo toggle active at Stimulating
    rerender(
      <BrowserRouter>
        <HomeObservationExplorer difficulty="Stimulating" onComplete={vi.fn()} />
      </BrowserRouter>
    );
    const veilBtn = screen.getByTestId('room-memory-veil-btn');
    fireEvent.click(veilBtn);
    expect(screen.getByTestId('room-memory-photo-veiled')).toBeInTheDocument();
  });

  it('8. AlternatingTaps, TargetCatch, MiniMaze, MelodyRecall, ShapeMatch, MathSprint, and VisualSearch transform motor/attention rules', () => {
    // 8a. AlternatingTaps: 2 buttons (L<->R) -> 3 buttons (L->C->R)
    const { rerender } = render(<AlternatingTapsGame difficulty="Moderate" onComplete={vi.fn()} />);
    expect(screen.getByTestId('taps-rhythm-pattern')).toHaveTextContent('LEFT → LEFT → RIGHT');
    rerender(<AlternatingTapsGame difficulty="Stimulating" onComplete={vi.fn()} />);
    expect(screen.getByTestId('taps-rhythm-pattern')).toHaveTextContent('LEFT → CENTER → RIGHT');
    expect(screen.getByRole('button', { name: /Tap Center Button/i })).toBeInTheDocument();

    // 8b. TargetCatch: Drifting distractors in Moderate + Phase rule shift in Stimulating
    vi.useFakeTimers();
    rerender(<TargetCatchGame difficulty="Stimulating" onComplete={vi.fn()} />);
    expect(screen.getByTestId('target-catch-phase-rule')).toHaveTextContent('Phase 1: Catch 🦋');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getAllByRole('button', { name: /Drifting leaf distractor/i }).length).toBeGreaterThanOrEqual(1);
    vi.useRealTimers();

    // 8c. MiniMaze: Golden Key Waypoint mandatory in Stimulating + Breadcrumbs in Gentle
    rerender(<MiniMazeGame difficulty="Stimulating" onComplete={vi.fn()} />);
    expect(screen.getByLabelText('Golden Garden Key')).toBeInTheDocument();
    expect(screen.getByTestId('maze-waypoint-status')).toHaveTextContent(
      /Reach Golden Key before Home/i
    );

    // 8d. MelodyRecall: Visual note trail in Gentle -> 2-Phrase Call & Response in Stimulating
    rerender(<MelodyRecallGame difficulty="Gentle" onComplete={vi.fn()} />);
    expect(screen.getByTestId('melody-visual-trail')).toBeInTheDocument();
    rerender(<MelodyRecallGame difficulty="Stimulating" onComplete={vi.fn()} />);
    expect(screen.queryByTestId('melody-visual-trail')).toBeNull();
    expect(screen.getByText(/Phrase 1\/2/i)).toBeInTheDocument();

    // 8e. ShapeMatch: Gentle visible side-by-side -> 1-Back Memory veil after delay in Moderate
    vi.useFakeTimers();
    rerender(<ShapeMatchGame difficulty="Moderate" onComplete={vi.fn()} />);
    expect(screen.queryByText('1-Back Memory')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(screen.getByText('1-Back Memory')).toBeInTheDocument();
    vi.useRealTimers();

    // 8f. MathSprint: Visual counting dots in Gentle -> Missing-Number Algebraic Recall in Stimulating
    rerender(<MathSprintGame difficulty="Gentle" onComplete={vi.fn()} />);
    expect(screen.getByTestId('math-counting-dots')).toBeInTheDocument();
    rerender(<MathSprintGame difficulty="Stimulating" onComplete={vi.fn()} />);
    expect(screen.queryByTestId('math-counting-dots')).toBeNull();
    expect(screen.getByText(/Find the Missing Number/i)).toBeInTheDocument();

    // 8g. VisualSearch: Automatic Row Clue appears after non-target tap in Gentle
    rerender(<VisualSearchGame difficulty="Gentle" onComplete={vi.fn()} />);
    const itemBtns = screen.getAllByRole('button', { name: /Item:/i });
    const targetHeading = screen.getByRole('heading', { level: 3 }).textContent || '';
    const nonTarget = itemBtns.find((b) => !targetHeading.includes(b.textContent || '___'));
    if (nonTarget) {
      fireEvent.click(nonTarget);
      expect(screen.getByText(/Gentle Scanning Clue: Look across Row/i)).toBeInTheDocument();
    }
  });

  it('9. caregiver & doctor portals report adaptive mechanic transitions accurately with strict authorization & non-diagnostic safety', async () => {
    const today = new Date().toISOString().split('T')[0];

    // Simulate 3 comfortable sessions stepping Gentle -> Moderate and emitting mechanicMode + appliedMechanics
    await GamesService.recordSession(patientA, {
      id: 'mech-sess-1',
      gameId: 'game-matching',
      gameTitle: 'Peaceful Nature Card Matching',
      category: 'memory',
      difficulty: 'Gentle',
      date: today,
      durationSeconds: 70,
      completed: true,
      accuracy: 0.96,
      score: 96,
      hintsUsed: 0,
      mechanicMode: 'guided_preview',
      appliedMechanics: ['2.2s visual preview', 'Distinct symbols', 'Auto-hint on hesitation'],
    });
    await GamesService.recordSession(patientA, {
      id: 'mech-sess-2',
      gameId: 'game-matching',
      gameTitle: 'Peaceful Nature Card Matching',
      category: 'memory',
      difficulty: 'Gentle',
      date: today,
      durationSeconds: 65,
      completed: true,
      accuracy: 0.95,
      score: 95,
      hintsUsed: 0,
      mechanicMode: 'guided_preview',
      appliedMechanics: ['2.2s visual preview', 'Distinct symbols'],
    });
    await GamesService.recordSession(patientA, {
      id: 'mech-sess-3',
      gameId: 'game-matching',
      gameTitle: 'Peaceful Nature Card Matching',
      category: 'memory',
      difficulty: 'Gentle',
      date: today,
      durationSeconds: 62,
      completed: true,
      accuracy: 0.98,
      score: 98,
      hintsUsed: 0,
      mechanicMode: 'standard_recall',
      appliedMechanics: ['Balanced recall', 'On-demand hint'],
    });

    // Incomplete session must NOT penalize patient progression
    await GamesService.recordSession(patientA, {
      id: 'mech-sess-incomplete',
      gameId: 'game-matching',
      gameTitle: 'Peaceful Nature Card Matching',
      category: 'memory',
      difficulty: 'Moderate',
      date: today,
      durationSeconds: 18,
      completed: false,
      completionStatus: 'incomplete',
    });

    const profile = AdaptiveDifficultyService.getGameProfile(patientA, 'game-matching');
    expect(profile.currentDifficulty).toBe('Moderate');

    // Caregiver Observation Report surfaces mechanic labels and mode
    const caregiverData = CaregiverReportService.generateWeeklyReport(patientA, 'Meera Rao', [], []);
    expect(
      caregiverData.clinicalObservations.some((line) =>
        /Observed adaptive gameplay mechanics across played activities/i.test(line)
      )
    ).toBe(true);
    expect(caregiverData.cognitiveEngagement.perGameProgress[0].currentMechanicMode).toBeDefined();

    render(
      <CaregiverObservationReport
        patientId={patientA}
        patientName="Meera Rao"
        routines={[]}
        history={[]}
      />
    );
    await waitFor(() => {
      const box = screen.getByTestId('caregiver-adaptive-game-progress');
      expect(box).toHaveTextContent(/Peaceful Nature Card Matching/i);
      expect(box).toHaveTextContent(
        new RegExp(formatMechanicModeLabel(caregiverData.cognitiveEngagement.perGameProgress[0].currentMechanicMode), 'i')
      );
      expect(box).toHaveTextContent(/Active mechanics:/i);
    });
    cleanup();

    // Unassigned doctor MUST be denied cleanly
    const denied = await DoctorAnalyticsService.get30DayGameDifficultyActivity(patientA, unassignedDoc);
    expect(denied.isAuthorized).toBe(false);
    expect(denied.perGameProgress).toEqual([]);

    // Authorized doctor receives mechanic progress + mandatory non-inference notice
    vi.spyOn(DoctorAnalyticsService, 'getDoctorAssignment').mockResolvedValue({
      isAssigned: true,
      status: 'active',
      doctorId: assignedDoc,
      patientId: patientA,
      patientName: 'Meera Rao',
    });
    vi.spyOn(DoctorAnalyticsService, 'subscribeToDoctorAssignment').mockImplementation(
      (_d, _p, cb) => {
        cb({
          isAssigned: true,
          status: 'active',
          doctorId: assignedDoc,
          patientId: patientA,
          patientName: 'Meera Rao',
        });
        return () => {};
      }
    );

    const allowed = await DoctorAnalyticsService.get30DayGameDifficultyActivity(patientA, assignedDoc);
    expect(allowed.isAuthorized).toBe(true);
    expect(allowed.perGameProgress[0].appliedMechanics?.length).toBeGreaterThan(0);
    expect(allowed.clinicalNonInferenceNotice).toMatch(/NOT be used to infer/i);

    render(
      <BrowserRouter>
        <DoctorLongitudinalAnalytics
          doctorId={assignedDoc}
          patientId={patientA}
          patientName="Meera Rao"
        />
      </BrowserRouter>
    );
    await waitFor(() => {
      const box = screen.getByTestId('doctor-per-game-progression');
      expect(box).toHaveTextContent(/Active mechanics:/i);
      expect(box).toHaveTextContent(/Moderate/i);
    });
  });
});
