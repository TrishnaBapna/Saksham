import React, { useState } from 'react';
import { GameItem, GameDifficulty, GamePatientFeedback, GameRunMetrics } from '../../../types/index.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { Sparkles, Heart, RotateCcw, Home, ShieldCheck, Clock } from 'lucide-react';

interface GameSessionFeedbackModalProps {
  game: GameItem;
  difficulty: GameDifficulty;
  elapsedSeconds: number;
  runMetrics?: GameRunMetrics;
  hintsUsed?: number;
  onPlayAgain: (feedback?: GamePatientFeedback) => void;
  onFinish: (feedback?: GamePatientFeedback) => void;
}

export const GameSessionFeedbackModal: React.FC<GameSessionFeedbackModalProps> = ({
  game,
  difficulty: _difficulty,
  elapsedSeconds,
  runMetrics,
  hintsUsed,
  onPlayAgain,
  onFinish
}) => {
  const { t } = useLanguage();
  const [selectedFeedback, setSelectedFeedback] = useState<GamePatientFeedback | undefined>('Relaxing');

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s} ${t('games.seconds') || 'seconds'}`;
    return `${m} ${t('games.minutes_short') || 'min'} ${s > 0 ? `${s}s` : ''}`;
  };

  const feedbackOptions: {
    value: GamePatientFeedback;
    label: string;
    icon: string;
    desc: string;
  }[] = [
    {
      value: 'Relaxing',
      label: t('games.fb_relaxing_label') || 'Relaxing',
      icon: '🌿',
      desc: t('games.fb_relaxing_desc') || 'That felt comfortable',
    },
    {
      value: 'Just right',
      label: t('games.fb_just_right_label') || 'Just right',
      icon: '👍',
      desc: t('games.fb_just_right_desc') || 'Comfortable rhythm',
    },
    {
      value: 'A bit tricky',
      label: t('games.fb_tricky_label') || 'A bit tricky',
      icon: '🤔',
      desc: t('games.fb_tricky_desc') || 'I’d like something easier',
    },
    {
      value: 'Loved it',
      label: t('games.fb_loved_label') || 'Loved it',
      icon: '❤️',
      desc: t('games.fb_loved_desc') || 'Loved this activity',
    },
  ];

  const quickComfortPills: { value: GamePatientFeedback; label: string; icon: string }[] = [
    { value: 'Too easy', label: t('games.fb_too_easy') || 'Too easy', icon: '✨' },
    { value: 'Too difficult', label: t('games.fb_too_difficult') || 'Too difficult', icon: '🌱' },
    { value: 'I enjoyed this', label: t('games.fb_enjoyed') || 'I enjoyed this', icon: '😊' },
    { value: "I don't like this", label: t('games.fb_dislike') || "I don't like this", icon: '💭' },
    { value: 'I need help', label: t('games.fb_need_help') || 'I need help', icon: '🤝' },
    { value: 'I want a break', label: t('games.fb_want_break') || 'I want a break', icon: '☕' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={t('games.celebration_dialog_aria') || 'Activity Completed Celebration'}
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-purple-200 shadow-2xl space-y-4 text-center my-auto">
        {/* Celebration Visual */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center mx-auto shadow-md">
          <Sparkles className="w-8 h-8 text-yellow-200" aria-hidden="true" />
        </div>

        {/* Gentle, Dignified Completion Message */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-saksham-darkText">
            {t('games.completion_well_done') || 'Well done!'}
          </h2>
          <p className="text-sm text-purple-900 font-medium">
            {t('games.completion_message') || 'You finished your game. Thank you for playing.'}
          </p>
          <p className="text-xs text-gray-500 pt-0.5">
            {t(`game.${game.id}.title`) !== `game.${game.id}.title` ? t(`game.${game.id}.title`) : game.title}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <div className="inline-flex items-center space-x-1.5 text-xs text-gray-500 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
              <Clock className="w-3.5 h-3.5 text-purple-500" aria-hidden="true" />
              <span>{t('games.time_enjoying') || 'Time spent enjoying:'} {formatTime(elapsedSeconds)}</span>
            </div>
            {(hintsUsed !== undefined && hintsUsed > 0) && (
              <span className="inline-flex items-center text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 font-semibold">
                {t('games.helpful_clues_used', { count: String(hintsUsed) }) !== 'games.helpful_clues_used'
                  ? t('games.helpful_clues_used', { count: String(hintsUsed) })
                  : `Helpful clues: ${hintsUsed}`}
              </span>
            )}
            {runMetrics?.score !== undefined && (
              <span className="inline-flex items-center text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-semibold">
                {t('games.calm_progress_badge') !== 'games.calm_progress_badge'
                  ? t('games.calm_progress_badge')
                  : 'Pace attuned for next round'}
              </span>
            )}
          </div>
        </div>

        {/* Clinical Non-Diagnostic Disclaimer */}
        <div className="bg-lavender-50 p-3 rounded-2xl border border-purple-200 text-[11px] text-purple-900 flex items-start space-x-2 text-left">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong>{t('games.wellness_note_title') || 'Cognitive Wellness Note:'}</strong>{' '}
            {t('games.wellness_note_desc') || 'This activity is designed purely for supportive mental engagement and enjoyment. It is not an IQ test or clinical assessment.'}
          </span>
        </div>

        {/* Optional Gentle Attunement */}
        <div className="space-y-2 text-left">
          <label className="block text-xs font-bold text-gray-700 flex items-center space-x-1">
            <Heart className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
            <span>{t('games.how_did_it_feel') || 'How did this activity feel for you? (Optional)'}</span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            {feedbackOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedFeedback(opt.value)}
                className={`p-2.5 rounded-2xl border text-xs font-bold transition flex items-center space-x-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                  selectedFeedback === opt.value
                    ? 'border-purple-600 bg-purple-100 text-purple-950 ring-2 ring-purple-300'
                    : 'border-purple-100 bg-white hover:bg-lavender-50 text-gray-700'
                }`}
              >
                <span className="text-base" aria-hidden="true">{opt.icon}</span>
                <div className="text-left leading-tight">
                  <div>{opt.label}</div>
                  <div className="text-[10px] text-gray-500 font-normal">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="pt-1.5 space-y-1.5">
            <span className="text-[11px] font-bold text-gray-600 block">
              {t('games.quick_feedback_label') || 'Quick comfort feedback:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickComfortPills.map((pill) => (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setSelectedFeedback(pill.value)}
                  className={`px-3 py-1.5 min-h-[36px] rounded-xl border text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                    selectedFeedback === pill.value
                      ? 'border-purple-600 bg-purple-600 text-white shadow-xs'
                      : 'border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-900'
                  }`}
                >
                  <span aria-hidden="true">{pill.icon}</span>
                  <span>{pill.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clear Action Targets (Play Again vs Go Home) */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => onPlayAgain(selectedFeedback)}
            className="flex-1 py-3 px-4 min-h-[48px] rounded-2xl bg-lavender-100 hover:bg-lavender-200 text-purple-900 font-bold text-sm flex items-center justify-center space-x-2 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>{t('games.play_again') || 'Play again'}</span>
          </button>

          <button
            type="button"
            onClick={() => onFinish(selectedFeedback)}
            className="flex-1 py-3 px-4 min-h-[48px] rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>{t('games.go_home') || 'Go home'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
