import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import {
  GameItem,
  GameCategory,
  GameDifficulty,
  GamePacing,
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

import {
  ArrowLeft,
  Search,
  ShieldCheck,
  Volume2,
  VolumeX,
  History,
  Clock,
  Sparkles,
  Info,
  CheckCircle,
  X,
  Play,
  RotateCcw,
  Award,
  Flame,
  Dices,
} from 'lucide-react';

export const MindGames: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
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
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isAshaSpeaking, setIsAshaSpeaking] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial catalogue, pacing preference, and history, plus sync from Firestore
  useEffect(() => {
    setAllGames(GamesService.getAllGames());
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

    GamesService.syncHistoryFromFirestore(patientUid).then((cloudHistory) => {
      if (cloudHistory && cloudHistory.length > 0) {
        setHistory(cloudHistory);
      }
    });

    const unsubscribe = subscribeToDataChanges(({ module, patientId: changedId }) => {
      if (changedId === patientUid && (module === 'games' || module === 'all')) {
        setHistory(GamesService.getHistory(patientUid));
        setCurrentDifficulty(GamesService.getDifficultyPreference(patientUid));
        setCurrentPacing(GamesService.getGamePacing(patientUid));
      }
    });

    // Check for direct activity deep-link via query parameter (?game=...)
    const targetGameId = searchParams.get('game') || searchParams.get('activity');
    if (targetGameId) {
      const found = GamesService.getGameById(targetGameId);
      if (found) {
        setActiveGame(found);
        setElapsedSeconds(0);
        setIsPaused(false);
        setShowCelebration(false);
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
    setActiveGame(game);
    setElapsedSeconds(0);
    setIsPaused(false);
    setShowCelebration(false);
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

  const handleExitGame = () => {
    SpeechService.cancelSpeech();
    if (activeGame && elapsedSeconds >= 10) {
      // Record partial engagement without shame
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
      });
      setHistory(GamesService.getHistory(patientUid));
    }
    setActiveGame(null);
    setActiveSessionId(null);
    setElapsedSeconds(0);
  };

  const handleRestartGame = () => {
    setElapsedSeconds(0);
    setIsPaused(false);
    setShowCelebration(false);
    setActiveSessionId(`sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  };

  const handleGameComplete = () => {
    setShowCelebration(true);
  };

  const handleFinishSession = (
    feedback?: 'Loved it' | 'Relaxing' | 'Just right' | 'A bit tricky'
  ) => {
    if (activeGame) {
      const earnedXp = currentPacing === 'calm' ? 30 : currentPacing === 'agile' ? 50 : 40;
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
        patientFeedback: feedback,
      });
      setHistory(GamesService.getHistory(patientUid));
      setActiveSessionId(null);

      // Automated Dynamic Difficulty Adjustment (DDA)
      if (feedback === 'A bit tricky') {
        setCurrentDifficulty('Gentle');
        setCurrentPacing('calm');
        GamesService.setDifficultyPreference(patientUid, 'Gentle');
        GamesService.setGamePacing(patientUid, 'calm');
      } else if (feedback === 'Loved it' || feedback === 'Relaxing') {
        if (currentDifficulty === 'Gentle' && history.length >= 2) {
          setCurrentDifficulty('Moderate');
          GamesService.setDifficultyPreference(patientUid, 'Moderate');
        }
      }
    }
    setShowCelebration(false);
    setActiveGame(null);
  };

  const handleAshaGreeting = () => {
    if (isAshaSpeaking) {
      SpeechService.cancelSpeech();
      setIsAshaSpeaking(false);
      return;
    }

    const greetingText = t('games.asha_welcome');

    SpeechService.speak(
      greetingText,
      () => setIsAshaSpeaking(true),
      () => setIsAshaSpeaking(false),
      language
    );
  };

  // Gamification metrics calculated strictly from real history
  const totalXp = GamesService.calculateTotalXp(history);
  const streak = GamesService.calculateStreak(history);
  const dailyCount = GamesService.getDailyCount(history);
  const badges = GamesService.getEarnedBadges(history);
  const recentlyPlayed = GamesService.getRecentlyPlayed(patientUid, 3);
  const recommendation = GamesService.getAdaptiveRecommendation(patientUid);
  const recommendedGame = GamesService.getRecommendedGame(patientUid);

  // Filtered games
  const filteredGames = allGames.filter((g) => {
    const matchesCategory = activeCategory === 'all' || g.category === activeCategory;
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
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
          {/* In-Game Header */}
          <GameHeader
            game={activeGame}
            currentDifficulty={currentDifficulty}
            onChangeDifficulty={(diff) => {
              setCurrentDifficulty(diff);
              GamesService.setDifficultyPreference(patientUid, diff);
            }}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(!isPaused)}
            onRestart={handleRestartGame}
            onExit={handleExitGame}
            elapsedSeconds={elapsedSeconds}
          />

          {/* In-Game Asha Companion */}
          <AshaGameCompanion
            instructions={activeGame.instructions}
            hint="Take your time and look for familiar shapes, colors, or memories."
            onTakeBreak={() => setIsPaused(true)}
          />

          {/* Interactive Game Runner Selection */}
          {!isPaused && (
            <div className="pt-1">
              {/* Existing 7 Game Runners */}
              {activeGame.id === 'game-matching' && (
                <CardMatchingGame
                  difficulty={currentDifficulty}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-daily-sequence' && (
                <DailySequenceGame
                  difficulty={currentDifficulty}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-visual-search' && (
                <VisualSearchGame
                  difficulty={currentDifficulty}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-pattern-completion' && (
                <PatternMatchGame
                  difficulty={currentDifficulty}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-word-garden' && (
                <WordGardenGame
                  difficulty={currentDifficulty}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-room-memory' && (
                <RoomMemoryActivity
                  difficulty={currentDifficulty}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-loved-ones-cues' && (
                <LovedOnesMemoryGame
                  difficulty={currentDifficulty}
                  patientId={patientUid}
                  onComplete={handleGameComplete}
                />
              )}

              {/* Legacy 8 Game Runners */}
              {(activeGame.id === 'game-color-sequence' ||
                activeGame.id === 'game-melody-sequence') && (
                <ColorSequenceGame
                  difficulty={currentDifficulty}
                  pacing={currentPacing}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-shape-match' && (
                <ShapeMatchGame
                  difficulty={currentDifficulty}
                  pacing={currentPacing}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-alternating-taps' && (
                <AlternatingTapsGame
                  difficulty={currentDifficulty}
                  pacing={currentPacing}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-target-catch' && (
                <TargetCatchGame
                  difficulty={currentDifficulty}
                  pacing={currentPacing}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-mini-maze' && (
                <MiniMazeGame
                  difficulty={currentDifficulty}
                  pacing={currentPacing}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-word-unscramble' && (
                <WordUnscrambleGame
                  difficulty={currentDifficulty}
                  pacing={currentPacing}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-melody-recall' && (
                <MelodyRecallGame
                  difficulty={currentDifficulty}
                  pacing={currentPacing}
                  onComplete={handleGameComplete}
                />
              )}

              {activeGame.id === 'game-math-sprint' && (
                <MathSprintGame
                  difficulty={currentDifficulty}
                  pacing={currentPacing}
                  onComplete={handleGameComplete}
                />
              )}

              {/* Fallback runner for other catalogue games */}
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
                  onComplete={handleGameComplete}
                />
              )}
            </div>
          )}

          {/* Feedback Celebration Modal */}
          {showCelebration && (
            <GameSessionFeedbackModal
              game={activeGame}
              difficulty={currentDifficulty}
              elapsedSeconds={elapsedSeconds}
              onPlayAgain={() => {
                setShowCelebration(false);
                handleRestartGame();
              }}
              onFinish={handleFinishSession}
            />
          )}
        </div>
      ) : (
        /* Catalogue & History View */
        <div className="space-y-5 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/patient')}
                className="p-2.5 rounded-2xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-xs cursor-pointer"
                aria-label="Back to Patient Home"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-saksham-darkText">
                  {t('games.title')}
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  {t('games.subtitle')}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Random Game Action */}
              <button
                type="button"
                onClick={handleRandomGame}
                className="px-3 py-1.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
                title={t('games.random_game')}
                aria-label={t('games.random_game')}
              >
                <Dices className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('games.random_game')}</span>
              </button>

              <div className="flex items-center space-x-1 text-xs font-bold text-purple-700 bg-white px-3 py-1.5 rounded-2xl border border-purple-200 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                <span>{t('games.activities_count').replace('{count}', String(allGames.length))}</span>
              </div>
            </div>
          </div>

          {/* Gamification Progress HUD (Earned XP, Streak, Daily Practice) */}
          <div className="bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 rounded-3xl p-5 text-white shadow-soft-purple space-y-3 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-lavender-200 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-300" />
                <span>{t('games.daily_practice_summary')}</span>
              </span>

              <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-bold text-amber-300 border border-white/20 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
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
                <span className="text-lg sm:text-xl font-black block leading-none capitalize">{currentPacing}</span>
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

          {/* Asha Companion Warm Banner */}
          <div className="bg-gradient-to-r from-lavender-100 via-purple-50 to-pink-50 p-4 rounded-3xl border border-purple-200 shadow-soft-purple flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-2xl shadow-xs flex-shrink-0">
                🌸
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-purple-950">Asha AI Companion</span>
                  <span className="text-[10px] font-bold text-purple-700 bg-white/80 px-2 py-0.5 rounded-full border border-purple-200">
                    Activity Guide
                  </span>
                </div>
                <p className="text-xs text-purple-900 mt-0.5 leading-relaxed">
                  "{t('games.asha_welcome')}"
                </p>
              </div>
            </div>

            <button
              onClick={handleAshaGreeting}
              className={`p-2.5 rounded-2xl transition ml-2 flex-shrink-0 ${
                isAshaSpeaking
                  ? 'bg-purple-600 text-white animate-pulse'
                  : 'bg-white text-purple-700 hover:bg-purple-100 border border-purple-200 shadow-2xs'
              }`}
              title="Listen to Asha"
              aria-label={isAshaSpeaking ? 'Stop Asha voice' : 'Listen to Asha greeting'}
            >
              {isAshaSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Automated Dynamic Difficulty & Pacing */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-purple-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-saksham-darkText">Gentle Adaptive Pacing</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                    🌱 Auto-Adaptive Active
                  </span>
                  {AdaptiveDifficultyService.getProfile(patientUid).syncStatus === 'synced' && (
                    <span className="bg-sky-50 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-200 flex items-center gap-1">
                      ☁️ {t('games.sync_synced')}
                    </span>
                  )}
                  {AdaptiveDifficultyService.getProfile(patientUid).syncStatus === 'offline-pending' && (
                    <span className="bg-amber-50 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                      ⏳ {t('games.sync_offline_pending')}
                    </span>
                  )}
                  {AdaptiveDifficultyService.getProfile(patientUid).syncStatus === 'sync-failed' && (
                    <span className="bg-rose-50 text-rose-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                      ⚠️ {t('games.sync_saved_locally')}
                    </span>
                  )}
                  {AdaptiveDifficultyService.getProfile(patientUid).syncStatus === 'local-only' && (
                    <span className="bg-gray-50 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 flex items-center gap-1">
                      💾 {t('games.sync_device_only')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Activities adapt smoothly to your personal rhythm and comfort. No rush, no timers, and no pressure.
                </p>
              </div>

              {/* Accessible Pacing Switches for test harnesses & caregiver overrides */}
              <div className="sr-only">
                {(['calm', 'balanced', 'agile'] as GamePacing[]).map((p) => {
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePacingChange(p)}
                      aria-label={`Set pacing to ${p}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pacing description (for screen readers and assistive announcements) */}
            <div className="sr-only" aria-live="polite">
              {currentPacing === 'calm' && 'Calm mode: Slower pace, shorter sequences, more time to respond, and gentle hints.'}
              {currentPacing === 'balanced' && 'Balanced mode: Standard pace, moderate sequences, and comfortable response times.'}
              {currentPacing === 'agile' && 'Agile mode: Faster pace, longer sequences, and more lively target catches.'}
            </div>

            {/* Adaptive Level Advice */}
            <div className="pt-2 border-t border-purple-100 flex items-center justify-between text-xs">
              <span className="text-gray-600 flex items-center space-x-1">
                <span>🌱</span>
                <span>{recommendation.reason}</span>
              </span>
              <span className="font-semibold text-purple-800 bg-lavender-50 px-2.5 py-0.5 rounded-full border border-purple-200 text-[11px]">
                Comfort-Attuned
              </span>
            </div>
          </div>

          {/* Recommended Game Spotlight Card */}
          {recommendedGame && activeCategory !== 'history' && !searchQuery && (
            <div className="bg-gradient-to-r from-purple-50 via-lavender-50 to-pink-50 p-4 rounded-3xl border border-purple-200 shadow-soft-purple flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                  Recommended For You
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-saksham-darkText">
                  Recommended: {recommendedGame.title}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed max-w-md">
                  {recommendedGame.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleStartGame(recommendedGame)}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0 min-h-[44px]"
                aria-label={`Start recommended activity: ${recommendedGame.title}`}
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Play Now</span>
              </button>
            </div>
          )}

          {/* Recently Played Section (if any) */}
          {recentlyPlayed.length > 0 && activeCategory !== 'history' && !searchQuery && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                Recently Played Activities
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {recentlyPlayed.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => handleStartGame(g)}
                    className="p-3 bg-white hover:bg-purple-50/60 rounded-2xl border border-purple-100 shadow-2xs transition cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-bold text-saksham-darkText truncate">Recent: {g.title}</h4>
                      <span className="text-[10px] text-gray-400 capitalize">{g.categoryLabel}</span>
                    </div>
                    <button
                      type="button"
                      className="p-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 shrink-0"
                      aria-label={`Play again: ${g.title}`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cognitive Wellness Safeguard Banner */}
          <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-2xs">
            <div className="flex items-start space-x-2.5 text-xs text-purple-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px] text-gray-700">
                <span className="font-bold text-purple-900">Cognitive Wellness Safe Space:</span>{' '}
                Activities are designed for relaxation and memory engagement. Performance is never a medical test, IQ score, or diagnostic evaluation.
              </div>
            </div>
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
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search activities by name or category (e.g., matching, sequence, words)..."
                className="w-full pl-10 pr-10 py-3 bg-white rounded-2xl border border-purple-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-inner"
                aria-label="Search mind games"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Clear search"
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
                {filteredGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onPlay={handleStartGame}
                  />
                ))}
              </div>

              {filteredGames.length === 0 && (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-purple-200 p-6 space-y-3">
                  <Info className="w-10 h-10 text-purple-400 mx-auto" />
                  <p className="text-sm font-bold text-gray-700">
                    No activities found matching "{searchQuery}"
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('all');
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition"
                  >
                    View All Activities
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Participation History View */
            <div className="bg-white rounded-3xl p-5 border border-purple-200 shadow-soft-purple space-y-4">
              <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                <div className="flex items-center space-x-2 text-purple-950 font-bold text-sm">
                  <History className="w-4 h-4 text-purple-600" />
                  <span>Your Personal Engagement History</span>
                </div>
                <span className="text-xs text-gray-500">
                  {history.length} {history.length === 1 ? 'activity' : 'activities'} enjoyed
                </span>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                Saksham celebrates your participation and personal calm moments. There are no competitive scores or rankings.
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
                          {record.gameTitle}
                        </h4>
                        {record.completed && (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3 mr-0.5" />
                            Completed
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center space-x-2">
                        <span>{record.date} at {record.completedAt}</span>
                        <span>•</span>
                        <span>Level: {record.difficulty}</span>
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
                          {record.patientFeedback === 'Loved it' && '❤️ Loved it'}
                          {record.patientFeedback === 'Relaxing' && '🌿 Relaxing'}
                          {record.patientFeedback === 'Just right' && '👍 Just right'}
                          {record.patientFeedback === 'A bit tricky' && '🤔 Tricky'}
                        </span>
                      )}
                      <div className="text-[10px] text-gray-400 mt-0.5 flex items-center justify-end space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{Math.round(record.durationSeconds / 60)} min</span>
                      </div>
                    </div>
                  </div>
                ))}

                {history.length === 0 && (
                  <div className="text-center py-8 text-xs text-gray-500">
                    No activities recorded yet. Choose an activity above to start!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
