import React, { useState } from 'react';
import { RoutineItem } from '../../../types/index.js';
import { SpeechService } from '../../../services/speechService.js';
import { audioSynthesizer } from '../../../services/audioSynthesizerService.js';
import {
  Volume2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  Play,
  Heart,
} from 'lucide-react';

interface AssistedRecallEngineProps {
  routines: RoutineItem[];
  currentIndex: number;
  onNavigateIndex: (index: number) => void;
  onComplete: (routineId: string) => void;
  onLaunchTaskRunner: (routine: RoutineItem) => void;
  onRecordAttempt: (routineId: string, attemptsUsed: number, skipped: boolean, completed: boolean) => void;
  onLaunchAssistanceTray?: (routine: RoutineItem) => void;
  language?: string;
}

export const AssistedRecallEngine: React.FC<AssistedRecallEngineProps> = ({
  routines,
  currentIndex,
  onNavigateIndex,
  onComplete,
  onLaunchTaskRunner,
  onRecordAttempt,
  onLaunchAssistanceTray,
  language = 'en',
}) => {
  const activeRoutine = routines[currentIndex] || routines[0];

  const [attemptCount, setAttemptCount] = useState<number>(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'hint' | 'revealed'>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isHintExpanded, setIsHintExpanded] = useState(false);

  if (!activeRoutine) {
    return (
      <div className="bg-white rounded-3xl p-6 text-center text-gray-500 border border-slate-200">
        No scheduled routines available for Assisted Recall.
      </div>
    );
  }

  const defaultQuestion =
    activeRoutine.recallQuestion ||
    `It is ${activeRoutine.scheduledTime}. What ${activeRoutine.category} activity prepares you for a fresh day?`;

  const defaultOptions = activeRoutine.recallOptions || [
    activeRoutine.title,
    'Running outdoors without shoes',
    'Leaving clothes untouched',
  ];

  const correctIndex = activeRoutine.correctOptionIndex ?? 0;

  const defaultCues = activeRoutine.recallCues || {
    hint1: `Taking 15-20 calm minutes for ${activeRoutine.title.toLowerCase()} keeps coordination sharp.`,
    hint2: 'Look around your home or bedside table for the related items.',
    hint3: activeRoutine.title,
  };

  const getHintForAttempt = (lvl: number): string => {
    if (lvl === 1) return defaultCues.hint1;
    if (lvl === 2) return defaultCues.hint2;
    return defaultCues.hint3;
  };

  const handleSelectRoutine = (newIdx: number) => {
    SpeechService.cancelSpeech();
    setIsSpeaking(false);
    setAttemptCount(1);
    setSelectedOption(null);
    setFeedbackState('idle');
    setIsHintExpanded(false);
    onNavigateIndex(newIdx);
  };

  const handleReadAloud = (text: string) => {
    setIsSpeaking(true);
    SpeechService.speak(
      text,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      language === 'hi' ? 'hi-IN' : 'en-IN'
    );
  };

  const handleChooseOption = (optionIndex: number) => {
    setSelectedOption(optionIndex);

    if (optionIndex === correctIndex) {
      setFeedbackState('correct');
      audioSynthesizer.playChime('fanfare');
      onRecordAttempt(activeRoutine.id, attemptCount, false, true);
      handleReadAloud('Wonderful! That is exactly right.');
    } else {
      if (attemptCount === 1) {
        // 1st mistake: 1 heart broken (❤️❤️🤍)
        setAttemptCount(2);
        setFeedbackState('hint');
        audioSynthesizer.playChime('bell');
        handleReadAloud(`First chance missed. Take a calm breath! Here is a gentle clue: ${getHintForAttempt(1)}`);
      } else if (attemptCount === 2) {
        // 2nd mistake: 2 hearts broken (❤️🤍🤍), clinical hint automatically revealed
        setAttemptCount(3);
        setIsHintExpanded(true);
        setFeedbackState('hint');
        audioSynthesizer.playChime('bell');
        handleReadAloud(`Let's think together. Here is a helpful hint: ${getHintForAttempt(2)}`);
      } else {
        // 3rd mistake: 3 hearts broken (🤍🤍🤍), solution revealed + automatic 15-minute task runner timer
        setAttemptCount(4);
        setFeedbackState('revealed');
        audioSynthesizer.playChime('chime');
        onRecordAttempt(activeRoutine.id, 3, false, false);
        handleReadAloud(`Let's learn together! The scheduled activity is: ${activeRoutine.title}. Starting your 15-minute guided timer now.`);
        setTimeout(() => {
          onLaunchTaskRunner(activeRoutine);
        }, 1200);
      }
    }
  };

  const handleRequestHint = () => {
    setIsHintExpanded(true);
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

  const chancesRemaining = Math.max(0, 4 - attemptCount);
  const heartsString =
    attemptCount === 1
      ? '❤️❤️❤️'
      : attemptCount === 2
      ? '❤️❤️🤍'
      : attemptCount === 3
      ? '❤️🤍🤍'
      : '🤍🤍🤍';

  return (
    <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-200">
      {/* Header (Screenshot 1) */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-black text-teal-700 uppercase tracking-wider">
            STEP-BY-STEP TASK INITIATION
          </span>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5 font-heading">
            Interactive Activity Cues (3-Chance Assisted Recall)
          </h3>
          <span className="sr-only">Cognitive Memory Question</span>
          <span className="sr-only">Gentle Attempt:</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Read Question Button */}
          <button
            type="button"
            onClick={() => handleReadAloud(defaultQuestion)}
            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold border border-teal-200 transition flex items-center gap-1.5 cursor-pointer min-h-[38px]"
            title="Read Question Aloud"
            aria-label="Read Question"
          >
            <Volume2 className="w-3.5 h-3.5 text-teal-700" />
            <span>Read Question</span>
          </button>

          {/* Chances Hearts Display Badge */}
          <div
            className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-extrabold flex items-center gap-1 min-h-[38px]"
            aria-label={`3 hearts attempt indicator: ${chancesRemaining} hearts remaining`}
          >
            <span>Chances:</span>
            <span className="text-rose-600 tracking-wider">
              {heartsString}
            </span>
            <span className="text-amber-800 font-bold text-[11px]">
              ({chancesRemaining > 0 ? `${chancesRemaining} Left` : 'Guided'})
            </span>
          </div>
        </div>
      </div>

      {/* Question Card Box (Screenshot 1) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-50 border border-slate-200 space-y-4 shadow-2xs">
        {/* Scheduled Time & Status Pill */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-teal-800 bg-teal-100/80 px-2.5 py-1 rounded-lg border border-teal-200">
            SCHEDULED: {activeRoutine.scheduledTime} ({activeRoutine.category.toUpperCase()})
          </span>
          <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
            {activeRoutine.isCompleted ? '✓ Completed' : 'Pending Action'}
          </span>
        </div>

        {/* Question Prompt */}
        <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed font-heading">
          "{defaultQuestion}"
        </h4>

        {/* Hint banner if expanded */}
        {(feedbackState === 'hint' || isHintExpanded || attemptCount > 1) && feedbackState !== 'correct' && feedbackState !== 'revealed' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 font-medium leading-relaxed animate-in fade-in">
            <span className="font-extrabold text-amber-800 mr-1.5">
              {attemptCount === 2 ? 'First Gentle Clue:' : 'Detailed Helpful Hint:'}
            </span>
            "{getHintForAttempt(attemptCount - 1)}"
          </div>
        )}

        {/* Correct celebration */}
        {feedbackState === 'correct' && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-2 animate-in zoom-in-95">
            <div className="flex items-center justify-center gap-2 text-emerald-900 font-extrabold text-sm sm:text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Wonderful Memory Recall!</span>
            </div>
            <p className="text-xs text-emerald-700">
              You correctly identified: <strong>{activeRoutine.title}</strong>
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onComplete(activeRoutine.id)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition"
              >
                Mark Activity Complete
              </button>
              <button
                type="button"
                onClick={() => onLaunchTaskRunner(activeRoutine)}
                className="px-4 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Start Step-by-Step</span>
              </button>
            </div>
          </div>
        )}

        {/* Solution revealed after 3 attempts */}
        {feedbackState === 'revealed' && (
          <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-2xl text-center space-y-2 animate-in fade-in">
            <div className="flex items-center justify-center gap-2 text-purple-900 font-extrabold text-sm">
              <Heart className="w-4 h-4 text-purple-600 fill-purple-600" />
              <span>We Are Right Here With You</span>
            </div>
            <p className="text-xs text-purple-800">
              Your scheduled activity is: <strong>{activeRoutine.title}</strong>
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onComplete(activeRoutine.id)}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl transition"
              >
                Mark as Done
              </button>
              <button
                type="button"
                onClick={() => onLaunchTaskRunner(activeRoutine)}
                className="px-4 py-2 bg-white border border-purple-300 text-purple-800 font-bold text-xs rounded-xl transition"
              >
                Guided Instructions
              </button>
            </div>
          </div>
        )}

        {/* Options list A, B, C (Screenshot 1) */}
        {feedbackState !== 'correct' && feedbackState !== 'revealed' && (
          <div className="space-y-2.5 pt-1">
            {defaultOptions.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx); // A, B, C
              const isSelected = selectedOption === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChooseOption(idx)}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-xl border-2 font-medium text-xs sm:text-sm transition flex items-center gap-3 cursor-pointer min-h-[50px] ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/80 text-teal-950 font-bold shadow-xs'
                      : 'border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50/30 text-slate-800 shadow-2xs'
                  }`}
                >
                  <span className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-black flex items-center justify-center shrink-0">
                    {letter}
                  </span>
                  <span className="flex-1 leading-snug">{opt}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Bottom Controls Bar inside Card (Screenshot 1) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/80">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <button
              type="button"
              onClick={handleRequestHint}
              className="text-teal-700 hover:text-teal-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              aria-label="Request another hint"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Need a clue? Tap for hint</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                if (onLaunchAssistanceTray) {
                  onLaunchAssistanceTray(activeRoutine);
                } else {
                  handleRequestHint();
                }
              }}
              className="text-slate-500 hover:text-slate-800 font-medium hover:underline cursor-pointer"
            >
              Having trouble with this task?
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleReadAloud(defaultQuestion)}
              className={`px-3 py-1.5 font-bold text-xs rounded-xl border transition flex items-center gap-1 cursor-pointer ${
                isSpeaking
                  ? 'bg-teal-700 text-white border-teal-700 animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Speak Question"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Speak</span>
            </button>

            <button
              type="button"
              onClick={() => onLaunchTaskRunner(activeRoutine)}
              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer min-h-[36px]"
              aria-label={`Start 15m Task ${activeRoutine.title}`}
            >
              <Play className="w-3 h-3 text-amber-300 fill-amber-300" />
              <span>Start 15m Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Routine Progress and Pager (Screenshot 1 bottom) */}
      <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
        <span className="font-bold">
          <span className="sr-only">Activity {currentIndex + 1} of {routines.length}</span>
          Routine Progress:{' '}
          <strong className="text-teal-700 font-black">
            {currentIndex + 1} of {routines.length}
          </strong>
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleSelectRoutine(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            aria-label="Previous Activity"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectRoutine(Math.min(routines.length - 1, currentIndex + 1))}
            disabled={currentIndex === routines.length - 1}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            aria-label="Skip to next question"
          >
            <span>Next Cue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
