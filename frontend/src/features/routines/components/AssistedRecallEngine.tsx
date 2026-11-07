import React, { useState } from 'react';
import { RoutineItem } from '../../../types/index.js';
import { SpeechService } from '../../../services/speechService.js';
import { audioSynthesizer } from '../../../services/audioSynthesizerService.js';
import {
  Sparkles,
  Volume2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  SkipForward,
  PlayCircle,
  Heart,
} from 'lucide-react';

interface AssistedRecallEngineProps {
  routines: RoutineItem[];
  currentIndex: number;
  onNavigateIndex: (index: number) => void;
  onComplete: (routineId: string) => void;
  onLaunchTaskRunner: (routine: RoutineItem) => void;
  onRecordAttempt: (routineId: string, attemptsUsed: number, skipped: boolean, completed: boolean) => void;
  language?: 'en' | 'hi';
}

export const AssistedRecallEngine: React.FC<AssistedRecallEngineProps> = ({
  routines,
  currentIndex,
  onNavigateIndex,
  onComplete,
  onLaunchTaskRunner,
  onRecordAttempt,
  language = 'en',
}) => {
  const activeRoutine = routines[currentIndex] || routines[0];

  const [attemptCount, setAttemptCount] = useState<number>(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'hint' | 'revealed'>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!activeRoutine) {
    return (
      <div className="bg-white rounded-3xl p-6 text-center text-gray-500 border border-purple-100">
        No scheduled routines available for Assisted Recall.
      </div>
    );
  }

  const defaultQuestion =
    activeRoutine.recallQuestion ||
    `What activity is planned for your care at ${activeRoutine.scheduledTime}?`;

  const defaultOptions = activeRoutine.recallOptions || [
    activeRoutine.title,
    'Watch television in the lounge',
    'Water the front courtyard garden',
  ];

  const correctIndex = activeRoutine.correctOptionIndex ?? 0;

  const defaultCues = activeRoutine.recallCues || {
    hint1: 'Think about what keeps you feeling healthy and comfortable around this hour.',
    hint2: 'Look around your home or bedside table for the related items.',
    hint3: activeRoutine.title,
  };

  const getHintForAttempt = (lvl: number): string => {
    if (lvl === 1) return defaultCues.hint1;
    if (lvl === 2) return defaultCues.hint2;
    return defaultCues.hint3;
  };

  // Reset when navigating to another routine
  const handleSelectRoutine = (newIdx: number) => {
    SpeechService.cancelSpeech();
    setIsSpeaking(false);
    setAttemptCount(1);
    setSelectedOption(null);
    setFeedbackState('idle');
    onNavigateIndex(newIdx);
  };

  // Read question and current hint aloud
  const handleReadAloud = (text: string) => {
    setIsSpeaking(true);
    SpeechService.speak(
      text,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      language === 'hi' ? 'hi-IN' : 'en-IN'
    );
  };

  // Submit an answer option
  const handleChooseOption = (optionIndex: number) => {
    setSelectedOption(optionIndex);

    if (optionIndex === correctIndex) {
      setFeedbackState('correct');
      audioSynthesizer.playChime('fanfare');
      onRecordAttempt(activeRoutine.id, attemptCount, false, true);
      handleReadAloud('Wonderful! That is exactly right.');
    } else {
      if (attemptCount < 3) {
        setAttemptCount((prev) => prev + 1);
        setFeedbackState('hint');
        audioSynthesizer.playChime('bell');
        handleReadAloud(`Let's think together. Here is a helpful clue: ${getHintForAttempt(attemptCount)}`);
      } else {
        setFeedbackState('revealed');
        audioSynthesizer.playChime('chime');
        onRecordAttempt(activeRoutine.id, 3, false, false);
        handleReadAloud(`Thank you for trying! The activity is: ${activeRoutine.title}`);
      }
    }
  };

  // Explicit Request Hint
  const handleRequestHint = () => {
    if (attemptCount < 3) {
      const nextLvl = attemptCount + 1;
      setAttemptCount(nextLvl);
      setFeedbackState('hint');
      audioSynthesizer.playChime('bell');
      handleReadAloud(`Here is a gentle hint: ${getHintForAttempt(attemptCount)}`);
    } else {
      setFeedbackState('revealed');
      audioSynthesizer.playChime('chime');
    }
  };

  // Skip question without penalty
  const handleSkip = () => {
    SpeechService.cancelSpeech();
    onRecordAttempt(activeRoutine.id, attemptCount, true, false);
    if (currentIndex < routines.length - 1) {
      handleSelectRoutine(currentIndex + 1);
    } else {
      handleSelectRoutine(0);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Navigator: Prev, Routine Index, Next */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-purple-100 shadow-soft-purple">
        <button
          onClick={() => handleSelectRoutine(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="p-2 rounded-xl border border-gray-200 text-purple-700 hover:bg-purple-50 disabled:opacity-30 disabled:hover:bg-transparent transition"
          aria-label="Previous Activity"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
            Activity {currentIndex + 1} of {routines.length}
          </span>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            {activeRoutine.scheduledTime} • <span className="capitalize">{activeRoutine.category}</span>
          </p>
        </div>

        <button
          onClick={() => handleSelectRoutine(Math.min(routines.length - 1, currentIndex + 1))}
          disabled={currentIndex === routines.length - 1}
          className="p-2 rounded-xl border border-gray-200 text-purple-700 hover:bg-purple-50 disabled:opacity-30 disabled:hover:bg-transparent transition"
          aria-label="Next Activity"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Main Recall Card */}
      <div className="bg-gradient-to-br from-white via-lavender-50/50 to-pink-50/30 rounded-3xl p-6 border-2 border-purple-200 shadow-soft-purple relative">
        {/* Attempt Indicators (3 Hearts & Numbers 1, 2, 3) */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-100 flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-purple-900">Gentle Attempt:</span>
            {/* 3 Hearts Progression: ❤️❤️❤️ -> ❤️❤️🤍 -> ❤️🤍🤍 */}
            <div
              className="flex items-center space-x-1"
              aria-label={`3 hearts attempt indicator: ${4 - attemptCount} hearts remaining`}
            >
              {[1, 2, 3].map((heartIndex) => {
                // Heart 1 remains filled for attempts 1, 2, 3
                // Heart 2 remains filled for attempts 1, 2
                // Heart 3 remains filled for attempt 1
                const isHeartActive = (4 - attemptCount) >= heartIndex;
                return (
                  <Heart
                    key={heartIndex}
                    className={`w-5 h-5 transition-all duration-300 ${
                      isHeartActive
                        ? 'text-rose-500 fill-rose-500 scale-110 drop-shadow-xs'
                        : 'text-gray-300 fill-transparent'
                    }`}
                    aria-hidden="true"
                  />
                );
              })}
            </div>

            <div className="flex space-x-1">
              {[1, 2, 3].map((lvl) => (
                <span
                  key={lvl}
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    lvl === attemptCount
                      ? 'bg-purple-600 text-white ring-2 ring-purple-300 shadow-xs'
                      : lvl < attemptCount
                      ? 'bg-purple-200 text-purple-800'
                      : 'bg-white text-gray-300 border border-gray-200'
                  }`}
                >
                  {lvl}
                </span>
              ))}
            </div>
          </div>

          {/* Read Aloud Button */}
          <button
            onClick={() => handleReadAloud(defaultQuestion)}
            className={`p-2 rounded-xl border flex items-center space-x-1 text-xs font-bold transition ${
              isSpeaking
                ? 'bg-purple-600 text-white border-purple-600 animate-pulse'
                : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
            }`}
            title="Read Question Aloud"
            aria-label="Read Question Aloud"
          >
            <Volume2 className="w-4 h-4" />
            <span className="hidden sm:inline">Read Aloud</span>
          </button>
        </div>

        {/* Question Prompt */}
        <div className="mb-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100">
            Cognitive Memory Question
          </span>
          <h2 className="text-lg md:text-xl font-bold text-saksham-darkText mt-2 leading-relaxed">
            {defaultQuestion}
          </h2>
        </div>

        {/* Progressive Clue Box (Shown when attempt > 1 or hint requested) */}
        {(feedbackState === 'hint' || attemptCount > 1) && feedbackState !== 'correct' && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 mb-5 shadow-xs animate-in fade-in duration-300">
            <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>
                {attemptCount === 2 ? 'First Gentle Clue' : 'Detailed Helpful Hint'}
              </span>
            </div>
            <p className="text-sm text-amber-900 font-medium leading-relaxed">
              "{getHintForAttempt(attemptCount - 1)}"
            </p>
          </div>
        )}

        {/* Correct Celebration Box */}
        {feedbackState === 'correct' && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 mb-5 shadow-sm text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-emerald-900">
              Wonderful Memory Recall!
            </h3>
            <p className="text-xs text-emerald-700 mt-1">
              You recognized your activity: <strong>{activeRoutine.title}</strong>
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => onComplete(activeRoutine.id)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                Mark Activity Complete
              </button>
              <button
                onClick={() => onLaunchTaskRunner(activeRoutine)}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Start Step-by-Step</span>
              </button>
            </div>
          </div>
        )}

        {/* Revealed Solution Box after 3 attempts */}
        {feedbackState === 'revealed' && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5 mb-5 text-center animate-in fade-in duration-200">
            <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-xs">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-purple-900">
              We Are Right Here With You
            </h3>
            <p className="text-xs text-purple-700 mt-1">
              Your scheduled activity is: <strong>{activeRoutine.title}</strong>
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => onComplete(activeRoutine.id)}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                Mark as Done
              </button>
              <button
                onClick={() => onLaunchTaskRunner(activeRoutine)}
                className="px-4 py-2.5 bg-white border border-purple-300 text-purple-700 text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Guided Instructions</span>
              </button>
            </div>
          </div>
        )}

        {/* Multiple Choice Options (Large accessible buttons) */}
        {feedbackState !== 'correct' && feedbackState !== 'revealed' && (
          <div className="space-y-3 mb-5">
            <span className="text-xs text-gray-500 font-semibold px-1">
              Select your answer with no rush:
            </span>
            {defaultOptions.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleChooseOption(idx)}
                className={`w-full text-left p-4 rounded-2xl border-2 font-medium text-sm md:text-base transition-all duration-200 flex items-center justify-between min-h-[56px] ${
                  selectedOption === idx
                    ? 'border-purple-600 bg-purple-100/80 text-purple-950 font-bold shadow-xs'
                    : 'border-purple-100 bg-white hover:bg-purple-50/70 hover:border-purple-300 text-saksham-darkText shadow-2xs'
                }`}
              >
                <span className="pr-2">{opt}</span>
                <span className="w-6 h-6 rounded-full border border-purple-300 flex items-center justify-center text-xs font-bold text-purple-700 flex-shrink-0">
                  {idx + 1}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Bottom Actions Tray: Request Hint, Skip, Guided Runner */}
        <div className="flex items-center justify-between pt-3 border-t border-purple-100 gap-2">
          {/* Need Hint Button */}
          {feedbackState !== 'correct' && feedbackState !== 'revealed' && (
            <button
              onClick={handleRequestHint}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition"
              aria-label="Request another hint"
            >
              <HelpCircle className="w-4 h-4 text-purple-600" />
              <span>Need a Hint?</span>
            </button>
          )}

          {/* Direct Step-by-Step Task Runner */}
          <button
            onClick={() => onLaunchTaskRunner(activeRoutine)}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-purple-50 text-purple-700 font-bold text-xs border border-purple-200 transition ml-auto"
            aria-label="Open Step-by-step Guided Task Runner"
          >
            <PlayCircle className="w-4 h-4 text-purple-600" />
            <span>Step-by-Step Guide</span>
          </button>

          {/* Skip Question Button */}
          <button
            onClick={handleSkip}
            className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 font-medium text-xs transition"
            aria-label="Skip to next question"
          >
            <span>Skip</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
