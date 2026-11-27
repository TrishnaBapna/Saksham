import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { useAccessibility } from '../../context/AccessibilityContext.js';
import {
  GameAdaptiveParameters,
  GameCategory,
  GameDifficulty,
  GameItem,
  GamePacing,
  GamePatientFeedback,
  GameRunMetrics,
  GameSessionRecord,
} from '../../types/index.js';
import { GamesService } from '../../features/games/services/gamesService.js';
import { AdaptiveDifficultyService } from '../../features/games/services/adaptiveDifficultyService.js';
import {
  getEffectivePatientId,
  subscribeToDataChanges,
} from '../../features/auth/services/identityService.js';
import { SpeechService } from '../../services/speechService.js';
import { GameCard } from '../../features/games/components/GameCard.js';
import { GameCategoryFilter } from '../../features/games/components/GameCategoryFilter.js';
import { GameHeader } from '../../features/games/components/GameHeader.js';
import { AshaGameCompanion } from '../../features/games/components/AshaGameCompanion.js';
import { GameSessionFeedbackModal } from '../../features/games/components/GameSessionFeedbackModal.js';

// Interactive game runners (Original 7 + Legacy 8)
import { CardMatchingGame } from '../../features/games/components/runners/CardMatchingGame.js';
import { DailySequenceGame } from '../../features/games/components/runners/DailySequenceGame.js';
import { VisualSearchGame } from '../../features/games/components/runners/VisualSearchGame.js';
import { PatternMatchGame } from '../../features/games/components/runners/PatternMatchGame.js';
import { WordGardenGame } from '../../features/games/components/runners/WordGardenGame.js';
import { RoomMemoryActivity } from '../../features/games/components/runners/RoomMemoryActivity.js';
import { LovedOnesMemoryGame } from '../../features/games/components/runners/LovedOnesMemoryGame.js';

import { ColorSequenceGame } from '../../features/games/components/runners/ColorSequenceGame.js';
import { ShapeMatchGame } from '../../features/games/components/runners/ShapeMatchGame.js';
import { AlternatingTapsGame } from '../../features/games/components/runners/AlternatingTapsGame.js';
import { TargetCatchGame } from '../../features/games/components/runners/TargetCatchGame.js';
import { MiniMazeGame } from '../../features/games/components/runners/MiniMazeGame.js';
import { WordUnscrambleGame } from '../../features/games/components/runners/WordUnscrambleGame.js';
import { MelodyRecallGame } from '../../features/games/components/runners/MelodyRecallGame.js';
import { MathSprintGame } from '../../features/games/components/runners/MathSprintGame.js';
import { WarmObjectRecallGame } from '../../features/games/components/runners/WarmObjectRecallGame.js';
import { SpotDifferenceGame } from '../../features/games/components/runners/SpotDifferenceGame.js';
import { SymbolHarmonyGame } from '../../features/games/components/runners/SymbolHarmonyGame.js';
import { HouseholdRiddlesGame } from '../../features/games/components/runners/HouseholdRiddlesGame.js';
import { EverydayHelpersGame } from '../../features/games/components/runners/EverydayHelpersGame.js';

import {
  ArrowLeft,
  Search,
  ShieldCheck,
  History,
  Clock,
  Sparkles,
  Info,
  CheckCircle,
  X,
  RotateCcw,
  Award,
  Flame,
  Dices,
  HelpCircle,
} from 'lucide-react';

export const MindGames: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { preferences } = useAccessibility();
  const patientUid = getEffectivePatientId(currentUser);

  // Navigation & Category Filtering
  const [activeCategory, setActiveCategory] = useState<GameCategory | 'all' | 'history'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [allGames, setAllGames] = useState<GameItem[]>([]);
  const [history, setHistory] = useState<GameSessionRecord[]>([]);

  // Pacing & Difficulty State
  const [currentDifficulty, setCurrentDifficulty] = useState<GameDifficulty>('Gentle');
  const [currentPacing, setCurrentPacing] = useState<GamePacing>('balanced');

  // Active Game State
  const [activeGame, setActiveGame] = useState<GameItem | null>(null);
  const [activeAdaptedParams, setActiveAdaptedParams] = useState<GameAdaptiveParameters | undefined>(undefined);
  const [pendingRunMetrics, setPendingRunMetrics] = useState<GameRunMetrics | undefined>(undefined);
  const [activeHintsUsed, setActiveHintsUsed] = useState(0);
  const [pauseCount, setPauseCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Phase 3.20: Cognitive Accessibility State (Help Reorientation & Exit Confirmation)
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial catalogue, pacing preference, and history, plus sync from Firestore
  useEffect(() => {
    const games = GamesService.getAllGames();
    setAllGames(games);
    setHistory(GamesService.getHistory(patientUid));
    setCurrentDifficulty(GamesService.getDifficultyPreference(patientUid));
    setCurrentPacing(GamesService.getGamePacing(patientUid));

    // Connect remote sync with conflict protection and pending sync queue
    AdaptiveDifficultyService.syncPendingProfile(patientUid);
    AdaptiveDifficultyService.syncProfileFromFirestore(patientUid).then((synced) => {
      if (synced && synced.currentDifficulty) {
        setCurrentDifficulty(synced.currentDifficulty);
        setCurrentPacing(synced.pacing);
      }
    });
    AdaptiveDifficultyService.syncAllGameProfilesFromFirestore(patientUid);

    GamesService.syncHistoryFromFirestore(patientUid).then((cloudHistory) => {
      if (cloudHistory && cloudHistory.length > 0) {
        setHistory(cloudHistory);
      }
    });

    const unsubscribe = subscribeToDataChanges(({ module, patientId: changedId }) => {
      if (changedId === patientUid && (module === 'games' || module === 'all')) {
        setHistory(GamesService.getHistory(patientUid));
        if (!activeGame) {
          setCurrentDifficulty(GamesService.getDifficultyPreference(patientUid));
          setCurrentPacing(GamesService.getGamePacing(patientUid));
        }
      }
    });

    // Check for direct activity deep-link via query parameter (?game=...)
    const targetGameId = searchParams.get('game') || searchParams.get('activity');
    if (targetGameId) {
      const found = GamesService.getGameById(targetGameId);
      if (found) {
        const gameProfile = AdaptiveDifficultyService.getGameProfile(patientUid, found.id);
        const adapted = GamesService.getAdaptedParametersForGame(
          patientUid,
          found.id,
          gameProfile.currentDifficulty
        );
        setActiveGame(found);
        setCurrentDifficulty(gameProfile.currentDifficulty);
        setCurrentPacing(gameProfile.pacing);
        setActiveAdaptedParams(adapted);
        setPendingRunMetrics(undefined);
        setActiveHintsUsed(0);
        setPauseCount(0);
        setElapsedSeconds(0);
        setIsPaused(false);
        setShowCelebration(false);
        setShowExitConfirmation(false);
        setShowHelpModal(false);
        setActiveSessionId(`sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
      }
    }

    return () => unsubscribe();
  }, [patientUid, searchParams]);

  // Clean up timer & speech on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      SpeechService.cancelSpeech();
    };
  }, []);

  // Timer runner for active game
  useEffect(() => {
    if (activeGame && !isPaused && !showCelebration) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeGame, isPaused, showCelebration]);

  const handleStartGame = (game: GameItem) => {
    const gameProfile = AdaptiveDifficultyService.getGameProfile(patientUid, game.id);
    const adapted = GamesService.getAdaptedParametersForGame(
      patientUid,
      game.id,
      gameProfile.currentDifficulty
    );
    setActiveGame(game);
    setCurrentDifficulty(gameProfile.currentDifficulty);
    setCurrentPacing(gameProfile.pacing);
    setActiveAdaptedParams(adapted);
    setPendingRunMetrics(undefined);
    setActiveHintsUsed(0);
    setPauseCount(0);
    setElapsedSeconds(0);
    setIsPaused(false);
    setShowCelebration(false);
    setShowExitConfirmation(false);
    setShowHelpModal(false);
    setActiveSessionId(`sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  };

  const handleRandomGame = () => {
    const randomGame = GamesService.getRandomGame();
    handleStartGame(randomGame);
  };

  const handlePacingChange = (pacing: GamePacing) => {
    setCurrentPacing(pacing);
    GamesService.setGamePacing(patientUid, pacing);
    const diff = GamesService.getDifficultyPreference(patientUid);
    setCurrentDifficulty(diff);
  };

  // Phase 3.20: User requests to exit active game
  const handleRequestExit = () => {
    // If user has substantial engagement (>= 15s) or has action confirmations enabled with active engagement (>= 5s), prompt politely
    if (activeGame && (elapsedSeconds >= 15 || (preferences?.requireActionConfirmations && elapsedSeconds >= 5))) {
      setShowExitConfirmation(true);
    } else {
      performExitGame();
    }
  };

  // Execute clean exit and record progress neutrally without shame or penalty
  const performExitGame = () => {
    SpeechService.cancelSpeech();
    setShowExitConfirmation(false);
    setShowHelpModal(false);
    if (activeGame && elapsedSeconds >= 10) {
      GamesService.recordSession(patientUid, {
        id: activeSessionId || undefined,
        gameId: activeGame.id,
        gameTitle: activeGame.title,
        category: activeGame.category,
        difficulty: currentDifficulty,
        pacing: currentPacing,
        date: new Date().toISOString().split('T')[0],
        durationSeconds: elapsedSeconds,
        completed: false,
        completionStatus: 'incomplete',
        hintsUsed: activeHintsUsed,
        pauseCount,
      });
      setHistory(GamesService.getHistory(patientUid));
    }
    setActiveGame(null);
    setActiveAdaptedParams(undefined);
    setPendingRunMetrics(undefined);
    setActiveHintsUsed(0);
    setPauseCount(0);
    setActiveSessionId(null);
    setElapsedSeconds(0);
  };

  const handleRestartGame = () => {
    if (activeGame) {
      const gp = AdaptiveDifficultyService.getGameProfile(patientUid, activeGame.id);
      const nextParams = GamesService.getAdaptedParametersForGame(
        patientUid,
        activeGame.id,
        gp.currentDifficulty
      );
      setCurrentDifficulty(gp.currentDifficulty);
      setCurrentPacing(gp.pacing);
      setActiveAdaptedParams(nextParams);
    }
    setPendingRunMetrics(undefined);
    setActiveHintsUsed(0);
    setPauseCount(0);
    setElapsedSeconds(0);
    setIsPaused(false);
    setShowCelebration(false);
    setShowExitConfirmation(false);
    setActiveSessionId(`sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  };

  const handleGameComplete = (metrics?: GameRunMetrics) => {
    setPendingRunMetrics(metrics);
    if (typeof metrics?.hintsUsed === 'number') {
      setActiveHintsUsed((prev) => Math.max(prev, metrics.hintsUsed || 0));
    }
    setShowCelebration(true);
  };

  const recordCompletedActiveGame = (feedback?: GamePatientFeedback) => {
    if (!activeGame) return null;
    const earnedXp = currentPacing === 'calm' ? 30 : currentPacing === 'agile' ? 50 : 40;
    const totalHints = Math.max(activeHintsUsed, pendingRunMetrics?.hintsUsed || 0);

    GamesService.recordSession(patientUid, {
      id: activeSessionId || undefined,
      gameId: activeGame.id,
      gameTitle: activeGame.title,
      category: activeGame.category,
      difficulty: currentDifficulty,
      pacing: currentPacing,
      earnedXp,
      date: new Date().toISOString().split('T')[0],
      durationSeconds: elapsedSeconds,
      completed: true,
      completionStatus: 'completed',
      patientFeedback: feedback,
      hintsUsed: totalHints,
      pauseCount,
      score: pendingRunMetrics?.score,
      correctAnswers: pendingRunMetrics?.correctAnswers,
      incorrectAnswers: pendingRunMetrics?.incorrectAnswers,
      attempts: pendingRunMetrics?.attempts,
      mistakesCount: pendingRunMetrics?.mistakesCount,
      accuracy: pendingRunMetrics?.accuracy,
      reactionTimeMs: pendingRunMetrics?.reactionTimeMs,
      mechanicMode: pendingRunMetrics?.mechanicMode || activeAdaptedParams?.mechanics?.mode,
      appliedMechanics:
        pendingRunMetrics?.appliedMechanics ||
        activeAdaptedParams?.mechanics?.appliedMechanicsSummary,
    });

    setHistory(GamesService.getHistory(patientUid));
    setActiveSessionId(null);
    setPendingRunMetrics(undefined);
    setActiveHintsUsed(0);
    setPauseCount(0);

    const updatedGameProfile = AdaptiveDifficultyService.getGameProfile(patientUid, activeGame.id);
    setCurrentDifficulty(updatedGameProfile.currentDifficulty);
    setCurrentPacing(updatedGameProfile.pacing);
    return updatedGameProfile;
  };

  const handlePlayAgainSession = (feedback?: GamePatientFeedback) => {
    recordCompletedActiveGame(feedback);
    setShowCelebration(false);
    handleRestartGame();
  };

  const handleFinishSession = (feedback?: GamePatientFeedback) => {
    recordCompletedActiveGame(feedback);
    setShowCelebration(false);
    setActiveGame(null);
    setActiveAdaptedParams(undefined);
  };

  // Gamification metrics calculated strictly from real history
  const totalXp = GamesService.calculateTotalXp(history);
  const streak = GamesService.calculateStreak(history);
  const dailyCount = GamesService.getDailyCount(history);
  const badges = GamesService.getEarnedBadges(history);
  const recentlyPlayed = GamesService.getRecentlyPlayed(patientUid, 3);

  // Filtered games
  const filteredGames = allGames.filter((g) => {
    const matchesCategory = activeCategory === 'all' || g.category === activeCategory;
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const localizedTitle = (t(`game.${g.id}.title`) || g.title).toLowerCase();
    const localizedDesc = (t(`game.${g.id}.desc`) || g.description).toLowerCase();
    const localizedCat = (t(`game.category.${g.category}`) || g.categoryLabel).toLowerCase();
    return (
      localizedTitle.includes(q) ||
      localizedCat.includes(q) ||
      localizedDesc.includes(q) ||
      g.title.toLowerCase().includes(q) ||
      g.categoryLabel.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.benefits.some((b) => b.toLowerCase().includes(q))
    );
  });

  return (
    <div className="pb-28 pt-4 px-4 max-w-2xl mx-auto space-y-5 animate-fadeIn">
      {/* Active Game Mode */}
      {activeGame ? (
        <div className="space-y-4 animate-fadeIn">
          {/* In-Game Header with Predictable Exit & Help */}
          <GameHeader
            game={activeGame}
            currentDifficulty={currentDifficulty}
            onChangeDifficulty={(diff) => {
              setCurrentDifficulty(diff);
              const targetId = activeGame.id;
              GamesService.setDifficultyPreference(patientUid, diff, targetId);
              setActiveAdaptedParams(
                GamesService.getAdaptedParametersForGame(patientUid, targetId, diff)
              );
            }}
            isPaused={isPaused}
            onTogglePause={() => {
              if (!isPaused) setPauseCount((c) => c + 1);
              setIsPaused(!isPaused);
            }}
            onRestart={handleRestartGame}
            onExit={handleRequestExit}
            elapsedSeconds={elapsedSeconds}
            onHelp={() => setShowHelpModal(true)}
          />

          {/* In-Game Asha Companion */}
          <AshaGameCompanion
            instructions={
              t(`game.${activeGame.id}.instructions`) !== `game.${activeGame.id}.instructions`
                ? t(`game.${activeGame.id}.instructions`)
                : activeGame.instructions
            }
            gameTitle={t(`game.${activeGame.id}.title`) || activeGame.title}
            difficulty={currentDifficulty}
            hint={t('games.default_hint')}
            onTakeBreak={() => {
              setPauseCount((c) => c + 1);
              setIsPaused(true);
            }}
            onNeedHelp={() => {
              setActiveHintsUsed((h) => h + 1);
              setShowHelpModal(true);
            }}
            onFeedback={(fb) => {
              if (fb === 'I need help') setActiveHintsUsed((h) => h + 1);
              if (fb === 'I want a break') {
                setPauseCount((c) => c + 1);
                setIsPaused(true);
              }
            }}
          />

          {/* Interactive Game Runner Selection */}
          {!isPaused && (
            <div key={activeSessionId || activeGame.id} className="pt-1">
              {/* Existing 7 Game Runners */}
              {activeGame.id === 'game-matching' && (
                <CardMatchingGame
                  difficulty={currentDifficulty}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                  onRequestHint={() => setActiveHintsUsed((h) => h + 1)}
                />
              )}

              {activeGame.id === 'game-daily-sequence' && (
                <DailySequenceGame
                  difficulty={currentDifficulty}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-visual-search' && (
                <VisualSearchGame
                  difficulty={currentDifficulty}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-pattern-completion' && (
                <PatternMatchGame
                  difficulty={currentDifficulty}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-word-garden' && (
                <WordGardenGame
                  difficulty={currentDifficulty}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-room-memory' && (
                <RoomMemoryActivity
                  difficulty={currentDifficulty}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-loved-ones-cues' && (
                <LovedOnesMemoryGame
                  difficulty={currentDifficulty}
                  adaptiveParams={activeAdaptedParams}
                  patientId={patientUid}
                  onComplete={handleGameComplete}
                  onRequestHint={() => setActiveHintsUsed((h) => h + 1)}
                />
              )}

              {/* Legacy & Musical Sequence Runners */}
              {(activeGame.id === 'game-color-sequence' ||
                activeGame.id === 'game-melody-sequence') && (
                <ColorSequenceGame
                  difficulty={currentDifficulty}
                  pacing={currentPacing}
                  adaptiveParams={activeAdaptedParams}
                  variant={activeGame.id === 'game-melody-sequence' ? 'melody_bells' : 'color_pads'}
                  onComplete={handleGameComplete}
                  onRequestHint={() => setActiveHintsUsed((h) => h + 1)}
                />
              )}

              {/* Dedicated Runners for the Remaining 5 Catalogue Activities */}
              {activeGame.id === 'game-objects-recall' && (
                <WarmObjectRecallGame
                  difficulty={currentDifficulty}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                  onRequestHint={() => setActiveHintsUsed((h) => h + 1)}
                />
              )}

              {activeGame.id === 'game-spot-difference' && (
                <SpotDifferenceGame
                  difficulty={currentDifficulty}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                  onRequestHint={() => setActiveHintsUsed((h) => h + 1)}
                />
              )}

              {activeGame.id === 'game-symbol-matching' && (
                <SymbolHarmonyGame
                  difficulty={currentDifficulty}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                  onRequestHint={() => setActiveHintsUsed((h) => h + 1)}
                />
              )}

              {activeGame.id === 'game-object-riddles' && (
                <HouseholdRiddlesGame
                  difficulty={currentDifficulty}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                  onRequestHint={() => setActiveHintsUsed((h) => h + 1)}
                />
              )}

              {activeGame.id === 'game-household-uses' && (
                <EverydayHelpersGame
                  difficulty={currentDifficulty}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                  onRequestHint={() => setActiveHintsUsed((h) => h + 1)}
                />
              )}

              {activeGame.id === 'game-shape-match' && (
                <ShapeMatchGame
                  difficulty={currentDifficulty}
                  pacing={currentPacing}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                  onRequestHint={() => setActiveHintsUsed((h) => h + 1)}
                />
              )}

              {activeGame.id === 'game-alternating-taps' && (
                <AlternatingTapsGame
                  difficulty={currentDifficulty}
                  pacing={currentPacing}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-target-catch' && (
                <TargetCatchGame
                  difficulty={currentDifficulty}
                  pacing={currentPacing}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-mini-maze' && (
                <MiniMazeGame
                  difficulty={currentDifficulty}
                  pacing={currentPacing}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-word-unscramble' && (
                <WordUnscrambleGame
                  difficulty={currentDifficulty}
                  pacing={currentPacing}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                  onRequestHint={() => setActiveHintsUsed((h) => h + 1)}
                />
              )}

              {activeGame.id === 'game-melody-recall' && (
                <MelodyRecallGame
                  difficulty={currentDifficulty}
                  pacing={currentPacing}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-math-sprint' && (
                <MathSprintGame
                  difficulty={currentDifficulty}
                  pacing={currentPacing}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                />
              )}

              {/* Fallback safety runner only if an external unknown ID is opened */}
              {![
                'game-matching',
                'game-daily-sequence',
                'game-visual-search',
                'game-pattern-completion',
                'game-word-garden',
                'game-room-memory',
                'game-loved-ones-cues',
                'game-color-sequence',
                'game-melody-sequence',
                'game-objects-recall',
                'game-spot-difference',
                'game-symbol-matching',
                'game-object-riddles',
                'game-household-uses',
                'game-shape-match',
                'game-alternating-taps',
                'game-target-catch',
                'game-mini-maze',
                'game-word-unscramble',
                'game-melody-recall',
                'game-math-sprint',
              ].includes(activeGame.id) && (
                <CardMatchingGame
                  difficulty={currentDifficulty}
                  adaptiveParams={activeAdaptedParams}
                  onComplete={handleGameComplete}
                  onRequestHint={() => setActiveHintsUsed((h) => h + 1)}
                />
              )}
            </div>
          )}

          {/* Gentle Completion Modal */}
          {showCelebration && (
            <GameSessionFeedbackModal
              game={activeGame}
              difficulty={currentDifficulty}
              elapsedSeconds={elapsedSeconds}
              runMetrics={pendingRunMetrics}
              hintsUsed={activeHintsUsed}
              onPlayAgain={handlePlayAgainSession}
              onFinish={handleFinishSession}
            />
          )}

          {/* Phase 3.20: Exit Confirmation Dialog */}
          {showExitConfirmation && (
            <div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-exit-title"
            >
              <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-purple-200 shadow-2xl space-y-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-2xs">
                  <ArrowLeft className="w-7 h-7" aria-hidden="true" />
                </div>
                <h3 id="confirm-exit-title" className="text-lg sm:text-xl font-bold text-saksham-darkText">
                  {t('games.confirm_exit_title') || 'Would you like to leave this game?'}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {t('games.confirm_exit_message') ||
                    'Your progress in this round will be saved. You can always come back anytime.'}
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                  <button
                    type="button"
                    onClick={() => setShowExitConfirmation(false)}
                    className="flex-1 py-3 px-5 min-h-[48px] rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-sm transition cursor-pointer focus:outline-none focus:ring-4 focus:ring-purple-300"
                  >
                    {t('games.continue_playing') || 'Continue playing'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExitConfirmation(false);
                      performExitGame();
                    }}
                    className="flex-1 py-3 px-5 min-h-[48px] rounded-2xl bg-lavender-100 hover:bg-lavender-200 text-purple-900 font-bold text-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    {t('games.leave_game') || 'Leave game'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Catalogue & History View */
        <div className="space-y-5 animate-fadeIn">
          {/* Phase 3.20 Dignified Welcoming Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-3.5">
              <button
                type="button"
                onClick={() => navigate('/patient')}
                className="p-3 rounded-2xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-xs cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-purple-400"
                aria-label="Back to Patient Home"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </button>
              <div>
                <h1
                  className="text-2xl sm:text-3xl font-black text-saksham-darkText tracking-tight leading-none"
                  aria-label="Mind Games"
                >
                  {t('games.lets_play') || "Let's play"}
                </h1>
                <p className="text-xs sm:text-sm text-purple-900 font-medium mt-1">
                  {t('games.lets_play_subtitle') || "Take your time. Choose something you enjoy."}
                </p>
                <span className="sr-only">
                  {t('games.subtitle')}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Contextual Reorientation / Help Action */}
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="px-3.5 py-2 min-h-[44px] rounded-2xl bg-lavender-50 hover:bg-lavender-100 text-purple-900 font-bold text-xs flex items-center space-x-1.5 border border-purple-200 shadow-2xs transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400"
                aria-label="Help and orientation"
                title="Need help finding your way?"
              >
                <HelpCircle className="w-4 h-4 text-purple-700" aria-hidden="true" />
                <span>{t('games.help_button') || 'Help'}</span>
              </button>

              {/* Random Game Surprise Action */}
              <button
                type="button"
                onClick={handleRandomGame}
                className="px-3.5 py-2 min-h-[44px] rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400"
                title={t('games.random_game')}
                aria-label={t('games.random_game')}
              >
                <Dices className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t('games.random_game')}</span>
              </button>

              <div className="flex items-center space-x-1 text-xs font-bold text-purple-700 bg-white px-3 py-2 rounded-2xl border border-purple-200 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500" aria-hidden="true" />
                <span>{t('games.activities_count').replace('{count}', String(allGames.length))}</span>
              </div>
            </div>
          </div>

          {/* Cognitive Wellness Safeguard Banner */}
          <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-2xs">
            <div className="flex items-start space-x-2.5 text-xs text-purple-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="leading-relaxed text-[11px] text-gray-700">
                <span className="font-bold text-purple-900">{t('games.wellness_space_title') || 'Cognitive Wellness Safe Space:'}</span>{' '}
                {t('games.wellness_space_desc') || 'Activities are designed for relaxation and memory engagement. Performance is never a medical test, IQ score, or diagnostic evaluation.'}
              </div>
            </div>
          </div>

          {/* Gamification Progress HUD (Streak & XP) */}
          <div className="bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 rounded-3xl p-5 text-white shadow-soft-purple space-y-3 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-lavender-200 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-300" aria-hidden="true" />
                <span>{t('games.daily_practice_summary')}</span>
              </span>

              <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-bold text-amber-300 border border-white/20 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                <span>{t('games.streak_days').replace('{count}', String(streak))}</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-white/10 rounded-2xl p-2.5 border border-white/15">
                <span className="text-lg sm:text-xl font-black block leading-none">{totalXp}</span>
                <span className="text-[10px] text-lavender-200 font-semibold mt-0.5 block">{t('games.xp_earned')}</span>
              </div>

              <div className="bg-white/10 rounded-2xl p-2.5 border border-white/15">
                <span className="text-lg sm:text-xl font-black block leading-none">{dailyCount} / 3</span>
                <span className="text-[10px] text-lavender-200 font-semibold mt-0.5 block">{t('games.todays_goal')}</span>
              </div>

              <div className="bg-white/10 rounded-2xl p-2.5 border border-white/15">
                <span className="text-lg sm:text-xl font-black block leading-none capitalize">
                  {t(`games.pacing_${currentPacing}`) !== `games.pacing_${currentPacing}`
                    ? t(`games.pacing_${currentPacing}`)
                    : currentPacing}
                </span>
                <span className="text-[10px] text-lavender-200 font-semibold mt-0.5 block">{t('games.active_pacing')}</span>
              </div>
            </div>

            {/* Badges strip */}
            {badges.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {badges.map((b) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold border border-white/20"
                    title={b.description}
                  >
                    <span>{b.icon}</span>
                    <span>{b.title}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Screen-reader accessible pacing switches & announcements preserved */}
          <div className="sr-only">
            {(['calm', 'balanced', 'agile'] as GamePacing[]).map((p) => {
              const pacingLabel =
                t(`games.pacing_${p}`) !== `games.pacing_${p}` ? t(`games.pacing_${p}`) : p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePacingChange(p)}
                  aria-label={
                    t('games.set_pacing_aria') !== 'games.set_pacing_aria'
                      ? t('games.set_pacing_aria', { pacing: pacingLabel })
                      : `Set pacing to ${pacingLabel}`
                  }
                >
                  {pacingLabel}
                </button>
              );
            })}
          </div>
          <div className="sr-only" aria-live="polite">
            {currentPacing === 'calm' && (t('games.pacing_calm_desc') !== 'games.pacing_calm_desc' ? t('games.pacing_calm_desc') : 'Calm mode: Slower pace, shorter sequences, more time to respond, and gentle hints.')}
            {currentPacing === 'balanced' && (t('games.pacing_balanced_desc') !== 'games.pacing_balanced_desc' ? t('games.pacing_balanced_desc') : 'Balanced mode: Standard pace, moderate sequences, and comfortable response times.')}
            {currentPacing === 'agile' && (t('games.pacing_agile_desc') !== 'games.pacing_agile_desc' ? t('games.pacing_agile_desc') : 'Agile mode: Faster pace, longer sequences, and more lively target catches.')}
          </div>

          {/* Recently Played Section (if any) */}
          {recentlyPlayed.length > 0 && activeCategory !== 'history' && !searchQuery && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                {t('games.recently_played') || 'Recently Played Activities'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {recentlyPlayed.map((g) => {
                  const localizedTitle =
                    t(`game.${g.id}.title`) !== `game.${g.id}.title` ? t(`game.${g.id}.title`) : g.title;
                  return (
                  <div
                    key={g.id}
                    onClick={() => handleStartGame(g)}
                    className="p-3 bg-white hover:bg-purple-50/60 rounded-2xl border border-purple-100 shadow-2xs transition cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-bold text-saksham-darkText truncate">{t('games.recent') || 'Recent'}: {localizedTitle}</h4>
                      <span className="text-[10px] text-gray-400 capitalize">{t(`game.category.${g.category}`) || g.categoryLabel}</span>
                    </div>
                    <button
                      type="button"
                      className="p-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 shrink-0"
                      aria-label={t('games.play_again_aria', { title: localizedTitle })}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Phase 3.20: Browse Existing Games ("Choose another game") */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-extrabold text-saksham-darkText flex items-center gap-2">
                <span>{t('games.choose_another_game') || 'Choose another game'}</span>
              </h2>

              {/* Simple toggle for participation history */}
              <button
                type="button"
                onClick={() => setActiveCategory(activeCategory === 'history' ? 'all' : 'history')}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 underline flex items-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-300 rounded-lg p-1"
                aria-label={activeCategory === 'history' ? t('games.all_activities') : t('games.past_activities', { count: history.length })}
              >
                <History className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{activeCategory === 'history' ? t('games.all_activities') : t('games.past_activities', { count: history.length })}</span>
              </button>
            </div>

            {/* Category Filter Tabs */}
            <GameCategoryFilter
              activeCategory={activeCategory}
              onSelectCategory={(cat) => setActiveCategory(cat)}
              historyCount={history.length}
            />

            {/* Search Bar (When not viewing history) */}
            {activeCategory !== 'history' && (
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('games.search_placeholder')}
                  className="w-full pl-10 pr-10 py-3 bg-white rounded-2xl border border-purple-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-inner"
                  aria-label={t('games.search_aria')}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                    aria-label={t('games.clear_search_aria')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Games Catalogue Cards */}
            {activeCategory !== 'history' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredGames.map((game) => {
                    const perGameProfile = AdaptiveDifficultyService.getGameProfile(patientUid, game.id);
                    const completedCount = history.filter((h) => h.gameId === game.id && h.completed).length;
                    return (
                      <GameCard
                        key={game.id}
                        game={game}
                        adaptiveLevel={perGameProfile.currentDifficulty}
                        completedSessionsCount={completedCount}
                        onPlay={handleStartGame}
                      />
                    );
                  })}
                </div>

                {filteredGames.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-purple-200 p-6 space-y-3">
                    <Info className="w-10 h-10 text-purple-400 mx-auto" aria-hidden="true" />
                    <p className="text-sm font-bold text-gray-700">
                      {t('games.no_match', { query: searchQuery })}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setActiveCategory('all');
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition cursor-pointer"
                    >
                      {t('games.view_all_activities')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Participation History View */
              <div className="bg-white rounded-3xl p-5 border border-purple-200 shadow-soft-purple space-y-4">
                <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                  <div className="flex items-center space-x-2 text-purple-950 font-bold text-sm">
                    <History className="w-4 h-4 text-purple-600" aria-hidden="true" />
                    <span>{t('games.history_heading')}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {t('games.history_count', { count: history.length })}
                  </span>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">
                  {t('games.history_subtitle')}
                </p>

                <div className="space-y-2.5">
                  {history.map((record) => (
                    <div
                      key={record.id}
                      className="p-3.5 bg-lavender-50/60 rounded-2xl border border-purple-100 flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs sm:text-sm font-bold text-saksham-darkText">
                            {t(`game.${record.gameId}.title`) !== `game.${record.gameId}.title`
                              ? t(`game.${record.gameId}.title`)
                              : record.gameTitle}
                          </h4>
                          {record.completed ? (
                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3 mr-0.5" aria-hidden="true" />
                              {t('games.completed_badge')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                              {t('games.paused_badge') !== 'games.paused_badge'
                                ? t('games.paused_badge')
                                : 'Paused gently'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span>{record.date} • {record.completedAt}</span>
                          <span>•</span>
                          <span>
                            {t('games.level_label')}{' '}
                            {t(`games.difficulty_${(record.difficulty || 'gentle').toLowerCase()}`) !==
                            `games.difficulty_${(record.difficulty || 'gentle').toLowerCase()}`
                              ? t(`games.difficulty_${(record.difficulty || 'gentle').toLowerCase()}`)
                              : record.difficulty}
                          </span>
                          {typeof record.score === 'number' && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold">{record.score}/100</span>
                            </>
                          )}
                          {typeof record.hintsUsed === 'number' && record.hintsUsed > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-700 font-semibold">{record.hintsUsed} clues</span>
                            </>
                          )}
                          {record.earnedXp && (
                            <>
                              <span>•</span>
                              <span className="text-purple-700 font-bold">+{record.earnedXp} XP</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        {record.patientFeedback && (
                          <span className="inline-block px-2.5 py-1 rounded-xl bg-white border border-purple-200 text-xs font-bold text-purple-800 shadow-2xs">
                            {record.patientFeedback === 'Loved it' && `❤️ ${t('games.fb_loved_label')}`}
                            {record.patientFeedback === 'Relaxing' && `🌿 ${t('games.fb_relaxing_label')}`}
                            {record.patientFeedback === 'Just right' && `👍 ${t('games.fb_just_right_label')}`}
                            {record.patientFeedback === 'A bit tricky' && `🤔 ${t('games.fb_tricky_label')}`}
                            {record.patientFeedback === 'Too easy' && `✨ ${t('games.fb_too_easy')}`}
                            {record.patientFeedback === 'Too difficult' && `🌱 ${t('games.fb_too_difficult')}`}
                            {record.patientFeedback === 'I enjoyed this' && `😊 ${t('games.fb_enjoyed')}`}
                            {record.patientFeedback === "I don't like this" && `💭 ${t('games.fb_dislike')}`}
                            {record.patientFeedback === 'I need help' && `🤝 ${t('games.fb_need_help')}`}
                            {record.patientFeedback === 'I want a break' && `☕ ${t('games.fb_want_break')}`}
                          </span>
                        )}
                        <div className="text-[10px] text-gray-400 mt-0.5 flex items-center justify-end space-x-1">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          <span>{Math.round(record.durationSeconds / 60)} {t('games.minutes_short')}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {history.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-500">
                      {t('games.history_empty')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phase 3.20: Reorientation & Help Modal */}
      {showHelpModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reorientation-help-title"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-purple-200 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-lavender-100 text-purple-700 flex items-center justify-center mx-auto shadow-2xs">
              <HelpCircle className="w-7 h-7" aria-hidden="true" />
            </div>
            <h3 id="reorientation-help-title" className="text-lg sm:text-xl font-bold text-saksham-darkText">
              {t('games.reorientation_help_title') || 'Need Help Finding Your Way?'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              {activeGame
                ? (t('games.reorientation_help_active') ||
                    "You're playing {gameTitle}. You can continue, ask for a hint, or return to the games screen."
                  ).replace('{gameTitle}', t(`game.${activeGame.id}.title`) || activeGame.title)
                : t('games.reorientation_help_landing') ||
                  "You're in the games section. You can choose a game to play or go back to Home."}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
              {activeGame ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(false)}
                    className="flex-1 py-3 px-5 min-h-[48px] rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-sm transition cursor-pointer focus:outline-none focus:ring-4 focus:ring-purple-300"
                  >
                    {t('games.continue_playing') || 'Continue playing'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowHelpModal(false);
                      performExitGame();
                    }}
                    className="flex-1 py-3 px-5 min-h-[48px] rounded-2xl bg-lavender-100 hover:bg-lavender-200 text-purple-900 font-bold text-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    {t('games.back_to_games') || 'Back to games'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(false)}
                    className="flex-1 py-3 px-5 min-h-[48px] rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-sm transition cursor-pointer focus:outline-none focus:ring-4 focus:ring-purple-300"
                  >
                    {t('games.got_it') || 'Got it'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowHelpModal(false);
                      navigate('/patient');
                    }}
                    className="flex-1 py-3 px-5 min-h-[48px] rounded-2xl bg-lavender-100 hover:bg-lavender-200 text-purple-900 font-bold text-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    {t('games.go_home') || 'Go home'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
