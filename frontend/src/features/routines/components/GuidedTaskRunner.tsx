import React, { useState, useEffect } from 'react';
import { RoutineItem } from '../../../types/index.js';
import { SpeechService } from '../../../services/speechService.js';
import { audioSynthesizer } from '../../../services/audioSynthesizerService.js';
import { RoutineService } from '../services/routineService.js';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Volume2,
  Sparkles,
  Heart,
  PhoneCall,
  ListCheck,
  Layout,
  Plus,
  Check,
} from 'lucide-react';

interface GuidedTaskRunnerProps {
  routine: RoutineItem;
  isOpen: boolean;
  onClose: () => void;
  onFinish: (routineId: string) => void;
  language?: 'en' | 'hi';
  patientId?: string;
}

export const GuidedTaskRunner: React.FC<GuidedTaskRunnerProps> = ({
  routine,
  isOpen,
  onClose,
  onFinish,
  language = 'en',
  patientId = 'default-patient',
}) => {
  const steps: string[] =
    routine.steps && routine.steps.length > 0
      ? routine.steps.map((s: any) =>
          typeof s === 'string'
            ? s
            : s && typeof s === 'object' && 'instruction' in s
            ? s.instruction
            : s && typeof s === 'object' && 'title' in s
            ? s.title
            : String(s)
        )
      : [
          `Prepare your surroundings for ${routine.title}.`,
          'Take a calming breath and focus gently on the activity.',
          'Complete the activity at your own peaceful pace.',
          'Take a moment to enjoy feeling refreshed and satisfied.',
        ];

  // Dual View Mode: 'single' (one-instruction-at-a-time) vs 'checklist' (all steps)
  const [viewMode, setViewMode] = useState<'single' | 'checklist'>('single');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Modals state
  const [showStuckModal, setShowStuckModal] = useState<boolean>(false);
  const [stuckAdvice, setStuckAdvice] = useState<string | null>(null);
  const [showConfirmFinishModal, setShowConfirmFinishModal] = useState<boolean>(false);

  // Countdown timer with 10m/15m presets and +5m extend
  const initialSeconds = (routine.timerMinutes || 15) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerExpired, setTimerExpired] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setTimerExpired(true);
            setIsTimerRunning(false);
            audioSynthesizer.playChime('chime');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsRemaining]);

  if (!isOpen) return null;

  const currentStepText = steps[currentStepIndex];

  const handleReadAloud = (text: string) => {
    setIsSpeaking(true);
    SpeechService.speak(
      text,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      language === 'hi' ? 'hi-IN' : 'en-IN'
    );
  };

  const handleNextStep = () => {
    SpeechService.cancelSpeech();
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    SpeechService.cancelSpeech();
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const toggleStepCheckbox = (idx: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
        audioSynthesizer.playTone(587.33, 0.2);
      }
      return next;
    });
  };

  const handlePresetTimer = (mins: number) => {
    setIsTimerRunning(false);
    setSecondsRemaining(mins * 60);
    setTimerExpired(false);
    audioSynthesizer.playTone(440, 0.15);
  };

  const handleExtendTimer = (extraMins: number = 5) => {
    setSecondsRemaining((prev) => prev + extraMins * 60);
    setTimerExpired(false);
    setIsTimerRunning(true);
    audioSynthesizer.playChime('chime');
  };

  // Open confirmation modal for finish (never auto-completes)
  const handleRequestFinish = () => {
    SpeechService.cancelSpeech();
    setShowConfirmFinishModal(true);
  };

  const handleConfirmFinish = () => {
    SpeechService.cancelSpeech();
    audioSynthesizer.playChime('fanfare');
    onFinish(routine.id);
    setShowConfirmFinishModal(false);
    onClose();
  };

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Diagnostic Checkpoint ("Stuck?") answers
  const handleStuckResponse = (choice: 'started' | 'step1' | 'step2' | 'forgot' | 'caregiver') => {
    RoutineService.recordDifficultyFeedback(patientId, routine.id, choice);

    switch (choice) {
      case 'started':
        setCurrentStepIndex(0);
        setStuckAdvice("No worries at all! Let's begin fresh with the very first step together.");
        handleReadAloud("No worries at all! Let's begin fresh with the very first step together.");
        break;
      case 'step1':
        setCurrentStepIndex(1);
        setStuckAdvice('Great work completing the first step! Now focus gently on step two.');
        handleReadAloud('Great work completing the first step! Now focus gently on step two.');
        break;
      case 'step2':
        setCurrentStepIndex(Math.min(2, steps.length - 1));
        setStuckAdvice("You're making wonderful progress. Here is the next instruction.");
        handleReadAloud("You're making wonderful progress. Here is the next instruction.");
        break;
      case 'forgot':
        setStuckAdvice(
          `You are doing "${routine.title}". Right now, all you need to do is: "${currentStepText}". Take your time.`
        );
        handleReadAloud(
          `You are doing ${routine.title}. Right now, all you need to do is: ${currentStepText}. Take your time.`
        );
        break;
      case 'caregiver':
        setStuckAdvice(
          'We are here for you. You can take a peaceful pause or ask your family caregiver for a hand.'
        );
        handleReadAloud(
          'We are here for you. You can take a peaceful pause or ask your family caregiver for a hand.'
        );
        break;
    }
    setShowStuckModal(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-runner-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border-2 border-purple-200 relative my-auto max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 uppercase tracking-wider">
                Guided Step-by-Step Task Runner
              </span>
              <span className="text-xs text-gray-400 capitalize">{routine.category}</span>
            </div>
            <h2 id="guided-runner-title" className="text-base sm:text-lg font-black text-saksham-darkText mt-0.5">
              {routine.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition shrink-0"
            aria-label="Close Task Runner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode Switcher: One-at-a-time vs Full Checklist */}
        <div className="flex items-center gap-1.5 bg-lavender-100/60 p-1 rounded-2xl my-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('single')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              viewMode === 'single'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-800 hover:text-purple-900'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Step-by-Step Card</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('checklist')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              viewMode === 'checklist'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-800 hover:text-purple-900'
            }`}
          >
            <ListCheck className="w-3.5 h-3.5" />
            <span>Full Checklist</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-3">
          {/* Step Progress Tracker */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-purple-900 mb-1">
              <span>
                {viewMode === 'single'
                  ? `Step ${currentStepIndex + 1} of ${steps.length}`
                  : `${completedSteps.size} of ${steps.length} steps checked`}
              </span>
              <span className="text-gray-500 font-medium">
                {Math.round(
                  viewMode === 'single'
                    ? ((currentStepIndex + 1) / steps.length) * 100
                    : (completedSteps.size / steps.length) * 100
                )}
                % complete
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-purple-100 h-2 rounded-full overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${
                    viewMode === 'single'
                      ? ((currentStepIndex + 1) / steps.length) * 100
                      : (completedSteps.size / steps.length) * 100
                  }%`,
                }}
              />
            </div>
          </div>

          {/* VIEW MODE 1: One-Instruction-At-A-Time */}
          {viewMode === 'single' && (
            <div className="bg-gradient-to-br from-lavender-50 via-purple-50 to-pink-50/40 rounded-2xl p-4 sm:p-5 border border-purple-200 shadow-inner space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-800 bg-white px-2.5 py-1 rounded-md border border-purple-100 shadow-2xs">
                  Instruction {currentStepIndex + 1}
                </span>

                <button
                  type="button"
                  onClick={() => handleReadAloud(currentStepText)}
                  className={`px-3 py-1.5 rounded-xl border flex items-center space-x-1 text-xs font-bold transition ${
                    isSpeaking
                      ? 'bg-purple-600 text-white border-purple-600 animate-pulse'
                      : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                  }`}
                  aria-label="Read instruction aloud"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Read Aloud</span>
                </button>
              </div>

              <p className="text-base sm:text-lg text-saksham-darkText font-bold leading-relaxed">
                "{currentStepText}"
              </p>
            </div>
          )}

          {/* VIEW MODE 2: Full Checklist of All Steps */}
          {viewMode === 'checklist' && (
            <div className="space-y-2 bg-purple-50/40 p-3 rounded-2xl border border-purple-100">
              <span className="text-[11px] font-bold text-purple-900 block mb-1">
                Tick each step as you complete it:
              </span>
              {steps.map((step, idx) => {
                const isChecked = completedSteps.has(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleStepCheckbox(idx)}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                      isChecked
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-white border-purple-100 hover:border-purple-300 text-gray-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition ${
                        isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div className="flex-1 text-xs leading-relaxed font-semibold">
                      <span className={isChecked ? 'line-through text-gray-500' : ''}>
                        {idx + 1}. {step}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Asha Reassuring Advice Box */}
          {stuckAdvice && (
            <div className="bg-purple-100/70 border border-purple-300 rounded-2xl p-3 flex items-start space-x-2.5 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-purple-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-purple-900 font-medium leading-relaxed">{stuckAdvice}</p>
            </div>
          )}

          {/* Timer with 10m/15m Presets and +5m Extension */}
          <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 p-3.5 rounded-2xl text-white shadow-md space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isTimerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'
                  }`}
                />
                <span className="text-[11px] font-bold text-lavender-200 uppercase tracking-wider">
                  Activity Timer
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePresetTimer(10)}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-purple-500/40 bg-purple-500/20 text-purple-200 hover:bg-purple-500/30"
                >
                  10m
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetTimer(15)}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-purple-500/40 bg-purple-500/20 text-purple-200 hover:bg-purple-500/30"
                >
                  15m
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight">
                  {formatTimer(secondsRemaining)}
                </span>
                <span className="text-[11px] font-bold text-lavender-300">
                  {isTimerRunning ? 'Running' : 'Paused'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleExtendTimer(5)}
                  className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-amber-300 rounded-xl text-xs font-bold border border-white/20 flex items-center gap-1 transition"
                  title="Extend timer by 5 minutes"
                >
                  <Plus className="w-3 h-3" />
                  <span>+5m</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isTimerRunning ? 'Pause' : 'Resume'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsTimerRunning(false);
                    setSecondsRemaining(initialSeconds);
                    setTimerExpired(false);
                  }}
                  className="p-1.5 text-gray-400 hover:text-white rounded-xl transition"
                  title="Reset Timer"
                  aria-label="Reset Timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {timerExpired && (
              <p className="text-center text-[11px] text-amber-300 font-semibold bg-white/10 p-1.5 rounded-lg border border-amber-300/30">
                ⏰ Timer finished gently. Take all the peaceful time you need!
              </p>
            )}
          </div>
        </div>

        {/* Footer Navigation & Finish Actions */}
        <div className="pt-3 border-t border-purple-100 flex-shrink-0 space-y-2">
          {viewMode === 'single' ? (
            <div className="flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
                className="flex-1 flex items-center justify-center space-x-1 py-3 px-3 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent font-bold text-xs transition min-h-[48px]"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Step</span>
              </button>

              {currentStepIndex < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 flex items-center justify-center space-x-1 py-3 px-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition min-h-[48px]"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestFinish}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition min-h-[48px]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finish Activity</span>
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="w-full flex items-center justify-center space-x-1.5 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition min-h-[48px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finish Activity & Confirm</span>
            </button>
          )}

          {/* "Stuck?" Checkpoint Button */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowStuckModal(true)}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3.5 py-1.5 rounded-xl border border-purple-200 transition"
            >
              <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
              <span>Stuck? Or need assistance?</span>
            </button>
          </div>
        </div>
      </div>

      {/* Explicit Completion Confirmation Modal */}
      {showConfirmFinishModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in zoom-in-95 duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-finish-title"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-emerald-300 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 id="confirm-finish-title" className="text-base font-bold text-saksham-darkText">
                Complete "{routine.title}"?
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Are you satisfied and ready to mark this routine activity completed for today?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmFinishModal(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition min-h-[44px]"
              >
                Keep Working
              </button>
              <button
                type="button"
                onClick={handleConfirmFinish}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition min-h-[44px]"
              >
                Yes, Complete!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostic Checkpoint Modal */}
      {showStuckModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in zoom-in-95 duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border-2 border-purple-200">
            <div className="flex items-center justify-between pb-2 border-b border-purple-100 mb-3">
              <h3 className="text-sm font-bold text-saksham-darkText flex items-center space-x-1.5">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>Where are you right now?</span>
              </h3>
              <button
                onClick={() => setShowStuckModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              Tell Asha what is happening, and she will gently guide you forward:
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleStuckResponse('started')}
                className="w-full text-left p-2.5 rounded-xl border border-purple-100 hover:border-purple-300 hover:bg-purple-50 text-xs font-medium text-purple-900 transition"
              >
                🌱 I have just started
              </button>
              <button
                type="button"
                onClick={() => handleStuckResponse('step1')}
                className="w-full text-left p-2.5 rounded-xl border border-purple-100 hover:border-purple-300 hover:bg-purple-50 text-xs font-medium text-purple-900 transition"
              >
                ✓ I completed the first step
              </button>
              <button
                type="button"
                onClick={() => handleStuckResponse('step2')}
                className="w-full text-left p-2.5 rounded-xl border border-purple-100 hover:border-purple-300 hover:bg-purple-50 text-xs font-medium text-purple-900 transition"
              >
                ✓ I completed the second step
              </button>
              <button
                type="button"
                onClick={() => handleStuckResponse('forgot')}
                className="w-full text-left p-2.5 rounded-xl border border-purple-100 hover:border-purple-300 hover:bg-purple-50 text-xs font-medium text-purple-900 transition"
              >
                💭 I forgot what I was doing
              </button>
              <button
                type="button"
                onClick={() => handleStuckResponse('caregiver')}
                className="w-full text-left p-2.5 rounded-xl border border-rose-200 hover:border-rose-300 hover:bg-rose-50 text-xs font-medium text-rose-900 transition flex items-center space-x-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
                <span>I need someone to help me</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
