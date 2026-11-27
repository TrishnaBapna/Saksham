import React, { useState, useEffect, useRef } from 'react';
import { GameAdaptiveParameters, GameDifficulty, GamePacing, GameRunMetrics } from '../../../../types/index.js';
import { audioSynthesizer } from '../../../../services/audioSynthesizerService.js';
import { useLanguage } from '../../../../context/LanguageContext.js';
import { useOptionalAccessibility } from '../../../../context/AccessibilityContext.js';
import { buildGameRunMetrics } from '../../utils/adaptiveRunMetrics.js';
import { resolveAdaptiveGameplay } from '../../utils/adaptiveMechanics.js';
import { Compass, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, HelpCircle } from 'lucide-react';

interface MiniMazeGameProps {
  difficulty: GameDifficulty;
  pacing?: GamePacing;
  adaptiveParams?: GameAdaptiveParameters;
  onComplete: (metrics?: GameRunMetrics) => void;
}

export const MiniMazeGame: React.FC<MiniMazeGameProps> = ({
  difficulty,
  adaptiveParams,
  onComplete,
}) => {
  const { t, language } = useLanguage();
  const preferences = useOptionalAccessibility()?.preferences;
  const resolvedGameplay = resolveAdaptiveGameplay(difficulty, adaptiveParams, preferences);
  const requiresKeyWaypoint =
    resolvedGameplay.mechanics.multiStepStages >= 2 &&
    (difficulty === 'Stimulating' || resolvedGameplay.mechanics.requiresRecallWithoutRef);
  const showPathBreadcrumbsDefault = resolvedGameplay.mechanics.showFirstAnchor;
  const mazeUi = (
    {
      hi: {
        pond: 'वहाँ एक शांत बागीचे का तालाब है! आराम से उसके किनारे से चलें 🌸',
        boundary: 'उधर बाड़ है! कोई दूसरी शांत दिशा चुनें।',
        walking: 'सुंदर रास्ते पर आगे बढ़ रहे हैं...',
        badge: (diff: string, sz: number) => `${t('games_runner.maze_title')} • ${diff} (${sz}x${sz})`,
        stepsLabel: (n: number) => `कदम चले: ${n} • मंजिल: प्यारा घर 🏡`,
        playerAria: 'आपका स्थान',
        homeAria: 'घर का लक्ष्य',
        pondAria: 'बागीचे का तालाब',
        pathAria: 'रास्ता',
        up: 'ऊपर चलें',
        left: 'बाएँ चलें',
        right: 'दाएँ चलें',
        down: 'नीचे चलें',
        restart: 'रास्ता फिर से शुरू करें',
      },
      mr: {
        pond: 'तिथे बागेतील शांत तळे आहे! त्याच्या कडेने हळूच पुढे चला 🌸',
        boundary: 'ती सीमा आहे! दुसरी शांत दिशा निवडा.',
        walking: 'शांत वाटेवरून पुढे चालत आहोत...',
        badge: (diff: string, sz: number) => `${t('games_runner.maze_title')} • ${diff} (${sz}x${sz})`,
        stepsLabel: (n: number) => `पावले: ${n} • ध्येय: आपले घर 🏡`,
        playerAria: 'तुमची जागा',
        homeAria: 'घराचे ध्येय',
        pondAria: 'बागेतील तळे',
        pathAria: 'वाट',
        up: 'वर जा',
        left: 'डावीकडे जा',
        right: 'उजवीकडे जा',
        down: 'खाली जा',
        restart: 'पुन्हा सुरू करा',
      },
      bn: {
        pond: 'ওখানে একটি শান্ত বাগানের পুকুর আছে! পাশ দিয়ে ধীরে এগিয়ে যান 🌸',
        boundary: 'ওদিকে সীমানা! অন্য শান্ত দিক বেছে নিন।',
        walking: 'সুন্দর পথ ধরে হাঁটছি...',
        badge: (diff: string, sz: number) => `${t('games_runner.maze_title')} • ${diff} (${sz}x${sz})`,
        stepsLabel: (n: number) => `ধাপ নেওয়া হয়েছে: ${n} • গন্তব্য: প্রিয় বাড়ি 🏡`,
        playerAria: 'আপনার অবস্থান',
        homeAria: 'বাড়ির গন্তব্য',
        pondAria: 'বাগানের পুকুর',
        pathAria: 'হাঁটার পথ',
        up: 'উপরে যান',
        left: 'বামে যান',
        right: 'ডানে যান',
        down: 'নিচে যান',
        restart: 'নতুন করে শুরু করুন',
      },
      ta: {
        pond: 'அங்கே அமைதியான தோட்டக் குளம் உள்ளது! மெதுவாக அதைச் சுற்றிச் செல்லுங்கள் 🌸',
        boundary: 'அந்தப் பக்கம் எல்லை! வேறு அமைதியான திசையைத் தேர்ந்தெடுங்கள்.',
        walking: 'அமைதியான பாதையில் நடக்கிறோம்...',
        badge: (diff: string, sz: number) => `${t('games_runner.maze_title')} • ${diff} (${sz}x${sz})`,
        stepsLabel: (n: number) => `எடுத்த அடிகள்: ${n} • இலக்கு: இனிய இல்லம் 🏡`,
        playerAria: 'உங்கள் இடம்',
        homeAria: 'இல்ல இலக்கு',
        pondAria: 'தோட்டக் குளம்',
        pathAria: 'பாதை',
        up: 'மேலே செல்',
        left: 'இடதுபுறம் செல்',
        right: 'வலதுபுறம் செல்',
        down: 'கீழே செல்',
        restart: 'பாதையை மீண்டும் தொடங்கு',
      },
      te: {
        pond: 'అక్కడ ప్రశాంతమైన తోట చెరువు ఉంది! నెమ్మదిగా దాని చుట్టూ నడవండి 🌸',
        boundary: 'ఆ వైపు సరిహద్దు ఉంది! మరో ప్రశాంతమైన దిశను ఎంచుకోండి.',
        walking: 'ప్రశాంతమైన దారిలో నడుస్తున్నాము...',
        badge: (diff: string, sz: number) => `${t('games_runner.maze_title')} • ${diff} (${sz}x${sz})`,
        stepsLabel: (n: number) => `వేసిన అడుగులు: ${n} • గమ్యం: మన ఇల్లు 🏡`,
        playerAria: 'మీ స్థానం',
        homeAria: 'ఇంటి గమ్యం',
        pondAria: 'తోట చెరువు',
        pathAria: 'దారి',
        up: 'పైకి కదలండి',
        left: 'ఎడమకు కదలండి',
        right: 'కుడికి కదలండి',
        down: 'కిందకు కదలండి',
        restart: 'మళ్లీ ప్రారంభించండి',
      },
      kn: {
        pond: 'ಅಲ್ಲಿ ಶಾಂತವಾದ ಉದ್ಯಾನ ಕೊಳವಿದೆ! ನಿಧಾನವಾಗಿ ಅದರ ಸುತ್ತಲೂ ನಡೆದು ಹೋಗಿ 🌸',
        boundary: 'ಆ ಕಡೆ ಗಡಿ ಇದೆ! ಬೇರೆ ಶಾಂತ ದಿಕ್ಕನ್ನು ಆರಿಸಿ.',
        walking: 'ಶಾಂತ ದಾರಿಯಲ್ಲಿ ನಡೆಯುತ್ತಿದ್ದೇವೆ...',
        badge: (diff: string, sz: number) => `${t('games_runner.maze_title')} • ${diff} (${sz}x${sz})`,
        stepsLabel: (n: number) => `ಹಾಕಿದ ಹೆಜ್ಜೆಗಳು: ${n} • ಗುರಿ: ಸುಂದರ ಮನೆ 🏡`,
        playerAria: 'ನಿಮ್ಮ ಸ್ಥಾನ',
        homeAria: 'ಮನೆಯ ಗುರಿ',
        pondAria: 'ಉದ್ಯಾನ ಕೊಳ',
        pathAria: 'ದಾರಿ',
        up: 'ಮೇಲೆ ಹೋಗಿ',
        left: 'ಎಡಕ್ಕೆ ಹೋಗಿ',
        right: 'ಬಲಕ್ಕೆ ಹೋಗಿ',
        down: 'ಕೆಳಗೆ ಹೋಗಿ',
        restart: 'ಮತ್ತೆ ಪ್ರಾರಂಭಿಸಿ',
      },
    } as Record<string, any>
  )[language] || {
    pond: 'A peaceful garden pond is there! Walk gently around it 🌸',
    boundary: 'That way is a boundary! Try another peaceful direction.',
    walking: 'Walking along the gentle path...',
    badge: (diff: string, sz: number) => `${t('games_runner.maze_title')} • ${diff} (${sz}x${sz})`,
    stepsLabel: (n: number) => `Steps taken: ${n} • Target destination: Cozy Home 🏡`,
    playerAria: 'Player position',
    homeAria: 'Home destination',
    pondAria: 'Garden pond obstacle',
    pathAria: 'Path tile',
    up: 'Move Up',
    left: 'Move Left',
    right: 'Move Right',
    down: 'Move Down',
    restart: 'Restart Maze',
  };
  const localizedDiff = t(`games.difficulty_${difficulty.toLowerCase()}` as any) || difficulty;
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [stepsTaken, setStepsTaken] = useState<number>(0);
  const [hasKey, setHasKey] = useState<boolean>(!requiresKeyWaypoint);
  const [showPathBreadcrumbs, setShowPathBreadcrumbs] = useState<boolean>(showPathBreadcrumbsDefault);
  const [feedbackKey, setFeedbackKey] = useState<'intro' | 'arrived' | 'walking' | 'pond' | 'boundary' | 'key_found' | 'locked_home'>('intro');
  const bumpsRef = useRef(0);
  const hintsRef = useRef(0);
  const startRef = useRef(Date.now());

  const getGridSize = (diff: GameDifficulty) => {
    if (adaptiveParams?.gridSize) {
      return Math.max(3, Math.min(5, adaptiveParams.gridSize));
    }
    switch (diff) {
      case 'Gentle':
        return 3; // 3x3 open garden
      case 'Moderate':
        return 4; // 4x4 gentle pathway
      case 'Stimulating':
        return 4; // 4x4 with a peaceful pond obstacle
      default:
        return 3;
    }
  };

  const gridSize = getGridSize(difficulty);
  const goalPos = { x: gridSize - 1, y: gridSize - 1 };
  const keyPos = { x: 0, y: gridSize - 1 };

  const isObstacle = (x: number, y: number) => {
    if (difficulty === 'Stimulating' || (adaptiveParams && adaptiveParams.distractorCount > 0)) {
      return (x === 1 && y === 1) || (requiresKeyWaypoint && x === 2 && y === 2);
    }
    if (difficulty === 'Moderate') {
      return x === 2 && y === 1;
    }
    return false;
  };

  useEffect(() => {
    setPlayerPos({ x: 0, y: 0 });
    setStepsTaken(0);
    setHasKey(!requiresKeyWaypoint);
    setShowPathBreadcrumbs(showPathBreadcrumbsDefault);
    setFeedbackKey('intro');
    bumpsRef.current = 0;
    hintsRef.current = 0;
    startRef.current = Date.now();
  }, [difficulty, adaptiveParams?.gridSize, adaptiveParams?.tier]);

  const move = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    let newX = playerPos.x;
    let newY = playerPos.y;

    if (dir === 'UP' && playerPos.y > 0) newY--;
    if (dir === 'DOWN' && playerPos.y < gridSize - 1) newY++;
    if (dir === 'LEFT' && playerPos.x > 0) newX--;
    if (dir === 'RIGHT' && playerPos.x < gridSize - 1) newX++;

    // Check obstacle collision
    if (isObstacle(newX, newY)) {
      bumpsRef.current += 1;
      audioSynthesizer.playTone(280, 0.12);
      setFeedbackKey('pond');
      return;
    }

    // Check boundary
    if (newX === playerPos.x && newY === playerPos.y) {
      bumpsRef.current += 1;
      audioSynthesizer.playTone(300, 0.1);
      setFeedbackKey('boundary');
      return;
    }

    audioSynthesizer.playTone(400 + (newX + newY) * 50, 0.15);
    setPlayerPos({ x: newX, y: newY });
    const nextSteps = stepsTaken + 1;
    setStepsTaken(nextSteps);

    let unlockedNow = hasKey;
    if (requiresKeyWaypoint && !hasKey && newX === keyPos.x && newY === keyPos.y) {
      unlockedNow = true;
      setHasKey(true);
      audioSynthesizer.playChime('bell');
      setFeedbackKey('key_found');
      return;
    }

    if (newX === goalPos.x && newY === goalPos.y) {
      if (!unlockedNow) {
        setFeedbackKey('locked_home');
        return;
      }
      audioSynthesizer.playChime('fanfare');
      setFeedbackKey('arrived');
      const metrics = buildGameRunMetrics({
        correctAnswers: Math.max(nextSteps, 1),
        incorrectAnswers: bumpsRef.current,
        hintsUsed: hintsRef.current,
        reactionTimesMs: [Date.now() - startRef.current],
        completionStatus: 'completed',
        mechanicMode: resolvedGameplay.mode,
        appliedMechanics: resolvedGameplay.mechanics.appliedMechanicsSummary,
      });
      setTimeout(() => {
        onComplete(metrics);
      }, 1000);
    } else {
      setFeedbackKey('walking');
    }
  };

  const handleRestart = () => {
    setPlayerPos({ x: 0, y: 0 });
    setStepsTaken(0);
    setHasKey(!requiresKeyWaypoint);
    setFeedbackKey('intro');
  };

  const feedbackText =
    feedbackKey === 'arrived'
      ? t('games_runner.maze_arrived')
      : feedbackKey === 'key_found'
      ? '🗝️ Golden Key collected! The Cozy Home garden gate is now open!'
      : feedbackKey === 'locked_home'
      ? '🔒 Collect the Golden Key 🗝️ in the bottom-left corner first!'
      : feedbackKey === 'pond'
      ? mazeUi.pond
      : feedbackKey === 'boundary'
      ? mazeUi.boundary
      : feedbackKey === 'walking'
      ? mazeUi.walking
      : t('games_runner.maze_intro', { size: gridSize });

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-purple-200 shadow-soft-purple space-y-5 text-center animate-fadeIn">
      {/* Title */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
          <Compass className="w-3.5 h-3.5 text-teal-600" />
          <span>{mazeUi.badge(localizedDiff, gridSize)}</span>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-saksham-darkText" aria-live="polite">
          {feedbackText}
        </h3>
        <p className="text-xs text-gray-500 font-semibold">
          {mazeUi.stepsLabel(stepsTaken)}
        </p>
        {requiresKeyWaypoint && (
          <div
            data-testid="maze-waypoint-status"
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              hasKey ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}
          >
            {hasKey ? '🗝️ Key Collected • Gate Open' : '🗝️ Stage 1: Reach Golden Key before Home'}
          </div>
        )}
        {!showPathBreadcrumbsDefault && !showPathBreadcrumbs && (
          <div>
            <button
              type="button"
              onClick={() => {
                hintsRef.current += 1;
                setShowPathBreadcrumbs(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[11px] font-bold transition cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
              <span>Show Path Breadcrumbs</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid Maze */}
      <div
        className={`grid gap-2 mx-auto p-3 bg-lavender-50/70 rounded-3xl border border-purple-100 ${
          gridSize === 3 ? 'grid-cols-3 max-w-[240px]' : 'grid-cols-4 max-w-[300px]'
        }`}
      >
        {Array.from({ length: gridSize }).map((_, y) =>
          Array.from({ length: gridSize }).map((_, x) => {
            const isPlayer = playerPos.x === x && playerPos.y === y;
            const isHome = x === goalPos.x && y === goalPos.y;
            const isPrimaryPond = x === 1 && y === 1 && isObstacle(x, y);
            const isPond = isObstacle(x, y);
            const isKey = requiresKeyWaypoint && !hasKey && x === keyPos.x && y === keyPos.y;
            const isBreadcrumb =
              showPathBreadcrumbs && !isPlayer && !isHome && !isPond && !isKey && (y === 0 || x === gridSize - 1);

            return (
              <div
                key={`${x}-${y}`}
                className={`${gridSize === 3 ? 'h-16' : 'h-13'} rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 shadow-2xs border ${
                  isPlayer
                    ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white border-rose-300 ring-2 ring-rose-200 scale-105'
                    : isHome
                    ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white border-teal-300'
                    : isKey
                    ? 'bg-amber-100 border-amber-300 text-amber-800'
                    : isPond
                    ? 'bg-blue-100 border-blue-300 text-blue-600'
                    : isBreadcrumb
                    ? 'bg-amber-50/60 border-amber-200 text-amber-500'
                    : 'bg-white border-purple-100'
                }`}
                aria-label={
                  isPlayer
                    ? mazeUi.playerAria
                    : isHome
                    ? mazeUi.homeAria
                    : isKey
                    ? 'Golden Garden Key'
                    : isPrimaryPond
                    ? mazeUi.pondAria
                    : isPond
                    ? `${mazeUi.pondAria} (${x + 1},${y + 1})`
                    : mazeUi.pathAria
                }
              >
                {isPlayer ? '🏃' : isHome ? (hasKey ? '🏡' : '🔒') : isKey ? '🗝️' : isPond ? '🪷' : isBreadcrumb ? '·' : ''}
              </div>
            );
          })
        )}
      </div>

      {/* Direction Controls */}
      <div className="space-y-2 max-w-[240px] mx-auto pt-1">
        <button
          type="button"
          onClick={() => move('UP')}
          className="w-16 h-12 mx-auto bg-lavender-100 hover:bg-lavender-200 text-purple-900 rounded-2xl flex items-center justify-center border border-purple-200 shadow-2xs transition active:scale-95 cursor-pointer"
          aria-label={mazeUi.up}
        >
          <ArrowUp className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => move('LEFT')}
            className="w-16 h-12 bg-lavender-100 hover:bg-lavender-200 text-purple-900 rounded-2xl flex items-center justify-center border border-purple-200 shadow-2xs transition active:scale-95 cursor-pointer"
            aria-label={mazeUi.left}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleRestart}
            className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition shadow-2xs"
            title={mazeUi.restart}
            aria-label={mazeUi.restart}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => move('RIGHT')}
            className="w-16 h-12 bg-lavender-100 hover:bg-lavender-200 text-purple-900 rounded-2xl flex items-center justify-center border border-purple-200 shadow-2xs transition active:scale-95 cursor-pointer"
            aria-label={mazeUi.right}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => move('DOWN')}
          className="w-16 h-12 mx-auto bg-lavender-100 hover:bg-lavender-200 text-purple-900 rounded-2xl flex items-center justify-center border border-purple-200 shadow-2xs transition active:scale-95 cursor-pointer"
          aria-label={mazeUi.down}
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
