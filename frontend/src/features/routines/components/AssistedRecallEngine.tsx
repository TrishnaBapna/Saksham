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

export interface RecallSessionState {
  attemptCount: number;
  selectedOption: number | null;
  feedbackState: 'idle' | 'correct' | 'hint' | 'revealed';
  isHintExpanded: boolean;
}

interface AssistedRecallEngineProps {
  routines: RoutineItem[];
  currentIndex: number;
  onNavigateIndex: (index: number) => void;
  onComplete: (routineId: string) => void;
  onLaunchTaskRunner: (routine: RoutineItem) => void;
  onRecordAttempt: (routineId: string, attemptsUsed: number, skipped: boolean, completed: boolean) => void;
  onLaunchAssistanceTray?: (routine: RoutineItem) => void;
  language?: string;
  session?: RecallSessionState;
  onUpdateSession?: (routineId: string, session: RecallSessionState) => void;
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
  session,
  onUpdateSession,
}) => {
  const activeRoutine = routines[currentIndex] || routines[0];

  const [attemptCount, setAttemptCount] = useState<number>(() => session?.attemptCount ?? 1);
  const [selectedOption, setSelectedOption] = useState<number | null>(() => session?.selectedOption ?? null);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'hint' | 'revealed'>(
    () => session?.feedbackState ?? 'idle'
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isHintExpanded, setIsHintExpanded] = useState<boolean>(() => session?.isHintExpanded ?? false);
  const [isAutoLaunching, setIsAutoLaunching] = useState(false);
  const hasAutoLaunchedRef = React.useRef(false);

  React.useEffect(() => {
    hasAutoLaunchedRef.current = false;
    setIsAutoLaunching(false);
    if (session) {
      setAttemptCount(session.attemptCount);
      setSelectedOption(session.selectedOption);
      setFeedbackState(session.feedbackState);
      setIsHintExpanded(session.isHintExpanded);
    } else {
      setAttemptCount(1);
      setSelectedOption(null);
      setFeedbackState('idle');
      setIsHintExpanded(false);
    }
  }, [activeRoutine?.id, session?.attemptCount, session?.feedbackState]);

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
      language || 'en'
    );
  };

  const handleChooseOption = (optionIndex: number) => {
    if (isAutoLaunching) return;
    setSelectedOption(optionIndex);

    if (optionIndex === correctIndex) {
      setFeedbackState('correct');
      audioSynthesizer.playChime('fanfare');
      onRecordAttempt(activeRoutine.id, attemptCount, false, true);
      handleReadAloud('Wonderful! That is exactly right.');
      onUpdateSession?.(activeRoutine.id, {
        attemptCount,
        selectedOption: optionIndex,
        feedbackState: 'correct',
        isHintExpanded,
      });
    } else {
      if (attemptCount === 1) {
        // 1st mistake: 1 heart broken (❤️❤️🤍, 2 Left)
        const nextAttempt = 2;
        setAttemptCount(nextAttempt);
        setFeedbackState('hint');
        audioSynthesizer.playChime('bell');
        handleReadAloud(`First chance missed. Take a calm breath! Here is a gentle clue: ${getHintForAttempt(1)}`);
        onUpdateSession?.(activeRoutine.id, {
          attemptCount: nextAttempt,
          selectedOption: optionIndex,
          feedbackState: 'hint',
          isHintExpanded: false,
        });
      } else if (attemptCount === 2) {
        // 2nd mistake: 2 hearts broken (❤️🤍🤍, 1 Left), clinical hint automatically revealed
        const nextAttempt = 3;
        setAttemptCount(nextAttempt);
        setIsHintExpanded(true);
        setFeedbackState('hint');
        audioSynthesizer.playChime('bell');
        handleReadAloud(`Let's think together. Here is a helpful hint: ${getHintForAttempt(2)}`);
        onUpdateSession?.(activeRoutine.id, {
          attemptCount: nextAttempt,
          selectedOption: optionIndex,
          feedbackState: 'hint',
          isHintExpanded: true,
        });
      } else {
        // 3rd mistake: 3 hearts broken (🤍🤍🤍, Guided), solution revealed + automatic 15-minute task runner timer
        const nextAttempt = 4;
        setAttemptCount(nextAttempt);
        setFeedbackState('revealed');
        setIsHintExpanded(true);
        audioSynthesizer.playChime('chime');
        onRecordAttempt(activeRoutine.id, 3, false, false);
        handleReadAloud(`Let's learn together! The scheduled activity is: ${activeRoutine.title}. Starting your 15-minute guided timer now.`);
        onUpdateSession?.(activeRoutine.id, {
          attemptCount: nextAttempt,
          selectedOption: optionIndex,
          feedbackState: 'revealed',
          isHintExpanded: true,
        });

        // Launch Lock: Ensure GuidedTaskRunner triggers exactly once
        if (!hasAutoLaunchedRef.current) {
          hasAutoLaunchedRef.current = true;
          setIsAutoLaunching(true);
          setTimeout(() => {
            onLaunchTaskRunner(activeRoutine);
          }, 1200);
        }
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
      onUpdateSession?.(activeRoutine.id, {
        attemptCount: nextLvl,
        selectedOption,
        feedbackState: 'hint',
        isHintExpanded: true,
      });
    } else {
      setFeedbackState('revealed');
      audioSynthesizer.playChime('chime');
      onUpdateSession?.(activeRoutine.id, {
        attemptCount: 4,
        selectedOption,
        feedbackState: 'revealed',
        isHintExpanded: true,
      });
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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-purple-100 pb-4">
        <div>
          <span className="text-xs font-black text-purple-700 uppercase tracking-wider">
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
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-bold border border-purple-200 transition flex items-center gap-1.5 cursor-pointer min-h-[38px]"
            title="Read Question Aloud"
            aria-label="Read Question"
          >
            <Volume2 className="w-3.5 h-3.5 text-purple-700" />
            <span>Read Question</span>
          </button>

          {/* Chances Hearts Display Badge */}
          <div
            className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-extrabold flex items-center gap-1 min-h-[38px]"
            aria-label={`3 hearts attempt indicator: ${chancesRemaining} hearts remaining`}
          >
            <span>Chances:</span>
            <span className="text-rose-600 tracking-wider">
              {heartsString}
            </span>
            <span className="text-rose-800 font-bold text-[11px]">
              ({chancesRemaining > 0 ? `${chancesRemaining} Left` : 'Guided'})
            </span>
          </div>
        </div>
      </div>

      {/* Question Card Box (Screenshot 1) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-purple-50/40 via-white to-purple-50/30 border border-purple-100 space-y-4 shadow-2xs">
        {/* Scheduled Time & Status Pill */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-purple-800 bg-purple-100/80 px-2.5 py-1 rounded-lg border border-purple-200">
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
            <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
              <button
                type="button"
                onClick={() => onComplete(activeRoutine.id)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Mark Activity Complete
              </button>
              <button
                type="button"
                onClick={() => onLaunchTaskRunner(activeRoutine)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                aria-label={`Start Guided Task (15m)`}
              >
                <Play className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Start Guided Task (15m)</span>
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
            <div className="inline-flex items-center gap-1.5 text-xs text-purple-700 font-semibold bg-white px-3 py-1 rounded-full border border-purple-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
              <span>Starting 15-minute guided task runner...</span>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onComplete(activeRoutine.id)}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Mark as Done
              </button>
              <button
                type="button"
                onClick={() => onLaunchTaskRunner(activeRoutine)}
                className="px-4 py-2 bg-white border border-purple-300 text-purple-800 font-bold text-xs rounded-xl transition cursor-pointer"
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
                  disabled={isAutoLaunching}
                  onClick={() => handleChooseOption(idx)}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-xl border-2 font-medium text-xs sm:text-sm transition flex items-center gap-3 cursor-pointer min-h-[50px] ${
                    isAutoLaunching ? 'opacity-60 cursor-not-allowed' : ''
                  } ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50/80 text-purple-950 font-bold shadow-xs'
                      : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/30 text-slate-800 shadow-2xs'
                  }`}
                >
                  <span className="w-6 h-6 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-xs font-black flex items-center justify-center shrink-0">
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
              className="text-purple-700 hover:text-purple-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
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
                  ? 'bg-purple-600 text-white border-purple-600 animate-pulse'
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
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer min-h-[36px]"
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
          <strong className="text-purple-700 font-black">
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
