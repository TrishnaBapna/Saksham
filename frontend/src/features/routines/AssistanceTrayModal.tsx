import React, { useState, useEffect } from 'react';
import { RoutineItem } from '../../types/index.js';
import { Sparkles, ThumbsUp, ThumbsDown, X, Clock, HelpCircle } from 'lucide-react';

interface AssistanceTrayModalProps {
  isOpen: boolean;
  routine: RoutineItem;
  onClose: () => void;
  onFeedback: (feedback: 'helpful' | 'not-for-me' | 'dismissed', attempts: number) => void;
}

export const AssistanceTrayModal: React.FC<AssistanceTrayModalProps> = ({
  isOpen,
  routine,
  onClose,
  onFeedback,
}) => {
  // Retain attempts & timer across opens/closes
  const [attemptLevel, setAttemptLevel] = useState<number>(1);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [feedbackGiven, setFeedbackGiven] = useState<string | null>(null);

  // Timer counter that increments while modal is open
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      timer = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const defaultCues = routine.recallCues || {
    hint1: 'Think about what you usually do right around 11:00 AM to keep your body energetic and hydrated.',
    hint2: 'Look towards the kitchen counter or bedside table. There is a tall glass of fresh water waiting.',
    hint3: 'Drink one tall glass of water and gently roll your shoulders back 5 times to loosen your neck.',
  };

  const getHintForLevel = (level: number) => {
    if (level === 1) return { title: 'First Gentle Hint', hint: defaultCues.hint1, tone: 'A soft reminder' };
    if (level === 2) return { title: 'Second Visual Clue', hint: defaultCues.hint2, tone: 'Looking around your home' };
    return { title: 'Direct Helpful Step', hint: defaultCues.hint3, tone: 'Clear action for right now' };
  };

  const currentHint = getHintForLevel(attemptLevel);

  const handleNextAttempt = () => {
    if (attemptLevel < 3) {
      setAttemptLevel((prev) => prev + 1);
    }
  };

  const handleUserFeedback = (type: 'helpful' | 'not-for-me') => {
    setFeedbackGiven(type);
    onFeedback(type, attemptLevel);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleDismiss = () => {
    onFeedback('dismissed', attemptLevel);
    onClose();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-saksham-darkText/40 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistance-tray-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-purple-200 relative">
        {/* Header with persistent state tags */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-100">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 id="assistance-tray-title" className="text-lg font-bold text-saksham-darkText">
                3-Chance Assisted Recall
              </h3>
              <p className="text-xs text-purple-600 font-medium">{routine.title}</p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
            aria-label="Dismiss assistance"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* State Bar: Attempt Level (1, 2, 3) & Timer Preservation */}
        <div className="flex items-center justify-between bg-lavender-50 rounded-2xl p-3 my-4 border border-purple-100">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-purple-900">Attempt:</span>
            <div className="flex space-x-1.5">
              {[1, 2, 3].map((lvl) => (
                <span
                  key={lvl}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    lvl === attemptLevel
                      ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-300'
                      : lvl < attemptLevel
                      ? 'bg-purple-200 text-purple-800'
                      : 'bg-white text-gray-400 border border-gray-200'
                  }`}
                >
                  {lvl}
                </span>
              ))}
            </div>
          </div>

          {/* Time spent */}
          <div className="flex items-center space-x-1.5 text-xs text-purple-700 font-medium">
            <Clock className="w-4 h-4 text-purple-500" />
            <span>Time: {formatTime(secondsElapsed)}</span>
          </div>
        </div>

        {/* Dynamic Clue Card */}
        <div className="bg-gradient-to-br from-lavender-100/70 to-pink-50/50 rounded-2xl p-5 border border-purple-200/80 mb-5 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-white/80 px-2.5 py-1 rounded-md border border-purple-200">
              {currentHint.title}
            </span>
            <span className="text-xs text-gray-500 italic">{currentHint.tone}</span>
          </div>
          <p className="text-base text-saksham-darkText font-medium leading-relaxed my-3">
            "{currentHint.hint}"
          </p>
        </div>

        {/* Actions Tray */}
        {feedbackGiven ? (
          <div className="text-center py-4 bg-emerald-50 rounded-2xl text-emerald-800 font-semibold text-sm border border-emerald-200 animate-in fade-in">
            ✓ Thank you! Your feedback helps us personalise your care cues.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Try More Assistance */}
            {attemptLevel < 3 && (
              <button
                onClick={handleNextAttempt}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-md transition-all"
              >
                <HelpCircle className="w-5 h-5" />
                <span>Need more help? Reveal Attempt {attemptLevel + 1} Clue</span>
              </button>
            )}

            {/* Feedback Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => handleUserFeedback('helpful')}
                className="flex items-center justify-center space-x-1.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs md:text-sm rounded-xl transition"
              >
                <ThumbsUp className="w-4 h-4 text-emerald-600" />
                <span>Helpful</span>
              </button>

              <button
                onClick={() => handleUserFeedback('not-for-me')}
                className="flex items-center justify-center space-x-1.5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-semibold text-xs md:text-sm rounded-xl transition"
              >
                <ThumbsDown className="w-4 h-4 text-gray-500" />
                <span>Not for me</span>
              </button>
            </div>

            {/* Dismiss */}
            <div className="text-center pt-2">
              <button
                onClick={handleDismiss}
                className="text-xs text-gray-500 hover:text-gray-700 underline font-medium"
              >
                Dismiss for now (Keeps your progress saved)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
