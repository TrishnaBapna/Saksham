import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { GameItem, GameCategory, GameDifficulty, GameSessionRecord } from '../../types/index.js';
import { GamesService } from '../../features/games/services/gamesService.js';
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

// Interactive game runners
import { CardMatchingGame } from '../../features/games/components/runners/CardMatchingGame.js';
import { DailySequenceGame } from '../../features/games/components/runners/DailySequenceGame.js';
import { VisualSearchGame } from '../../features/games/components/runners/VisualSearchGame.js';
import { PatternMatchGame } from '../../features/games/components/runners/PatternMatchGame.js';
import { WordGardenGame } from '../../features/games/components/runners/WordGardenGame.js';
import { RoomMemoryActivity } from '../../features/games/components/runners/RoomMemoryActivity.js';
import { LovedOnesMemoryGame } from '../../features/games/components/runners/LovedOnesMemoryGame.js';

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
  X
} from 'lucide-react';

export const MindGames: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const patientUid = getEffectivePatientId(currentUser);

  // Navigation & Category Filtering
  const [activeCategory, setActiveCategory] = useState<GameCategory | 'all' | 'history'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [allGames, setAllGames] = useState<GameItem[]>([]);
  const [history, setHistory] = useState<GameSessionRecord[]>([]);

  // Active Game State
  const [activeGame, setActiveGame] = useState<GameItem | null>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState<GameDifficulty>('Gentle');
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isAshaSpeaking, setIsAshaSpeaking] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial catalogue, difficulty preference, and history, plus sync from Firestore
  useEffect(() => {
    setAllGames(GamesService.getAllGames());
    setHistory(GamesService.getHistory(patientUid));
    setCurrentDifficulty(GamesService.getDifficultyPreference(patientUid));

    GamesService.syncHistoryFromFirestore(patientUid).then((cloudHistory) => {
      if (cloudHistory && cloudHistory.length > 0) {
        setHistory(cloudHistory);
      }
    });

    const unsubscribe = subscribeToDataChanges(({ module, patientId: changedId }) => {
      if (changedId === patientUid && (module === 'games' || module === 'all')) {
        setHistory(GamesService.getHistory(patientUid));
        setCurrentDifficulty(GamesService.getDifficultyPreference(patientUid));
      }
    });

    return () => unsubscribe();
  }, [patientUid]);

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
  };

  const handleExitGame = () => {
    SpeechService.cancelSpeech();
    if (activeGame && elapsedSeconds >= 10) {
      // Record partial engagement without shame
      GamesService.recordSession(patientUid, {
        gameId: activeGame.id,
        gameTitle: activeGame.title,
        category: activeGame.category,
        difficulty: currentDifficulty,
        date: new Date().toISOString().split('T')[0],
        durationSeconds: elapsedSeconds,
        completed: false
      });
      setHistory(GamesService.getHistory(patientUid));
    }
    setActiveGame(null);
    setElapsedSeconds(0);
  };

  const handleRestartGame = () => {
    setElapsedSeconds(0);
    setIsPaused(false);
    setShowCelebration(false);
  };

  const handleGameComplete = () => {
    setShowCelebration(true);
  };

  const handleFinishSession = (
    feedback?: 'Loved it' | 'Relaxing' | 'Just right' | 'A bit tricky'
  ) => {
    if (activeGame) {
      GamesService.recordSession(patientUid, {
        gameId: activeGame.id,
        gameTitle: activeGame.title,
        category: activeGame.category,
        difficulty: currentDifficulty,
        date: new Date().toISOString().split('T')[0],
        durationSeconds: elapsedSeconds,
        completed: true,
        patientFeedback: feedback
      });
      setHistory(GamesService.getHistory(patientUid));
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

    const greetingText =
      "Welcome to Mind Games! These activities are here for your enjoyment and calm focus. Pick whatever you feel like playing, and take all the time you need.";

    SpeechService.speak(
      greetingText,
      () => setIsAshaSpeaking(true),
      () => setIsAshaSpeaking(false)
    );
  };

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

  const recommendation = GamesService.getAdaptiveRecommendation(patientUid);

  return (
    <div className="pb-28 pt-4 px-4 max-w-2xl mx-auto space-y-5">
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

              {/* Fallback runner for other catalogue games */}
              {![
                'game-matching',
                'game-daily-sequence',
                'game-visual-search',
                'game-pattern-completion',
                'game-word-garden',
                'game-room-memory',
                'game-loved-ones-cues'
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
                className="p-2.5 rounded-2xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-xs"
                aria-label="Back to Patient Home"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-saksham-darkText">
                  Mind Games
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  Cognitive Wellness & Supportive Engagement
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-bold text-purple-700 bg-white px-3 py-1.5 rounded-2xl border border-purple-200 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              <span>{allGames.length} Activities</span>
            </div>
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
                  "Welcome to Mind Games! These activities are here for your enjoyment. Take all the time you need."
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

          {/* Adaptive Difficulty & Wellness Safeguard Banner */}
          <div className="bg-white p-4 rounded-3xl border border-purple-100 shadow-2xs space-y-2.5">
            <div className="flex items-start space-x-2.5 text-xs text-purple-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px] text-gray-700">
                <span className="font-bold text-purple-900">Cognitive Wellness Safe Space:</span>{' '}
                Activities are designed for relaxation and memory engagement. Performance is never a medical test, IQ score, or diagnostic evaluation.
              </div>
            </div>

            {/* Adaptive Level Advice */}
            <div className="pt-2 border-t border-purple-100 flex items-center justify-between text-xs">
              <span className="text-gray-600 flex items-center space-x-1">
                <span>🌱</span>
                <span>{recommendation.reason}</span>
              </span>
              <span className="font-bold text-purple-800 bg-lavender-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Level: {currentDifficulty}
              </span>
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
