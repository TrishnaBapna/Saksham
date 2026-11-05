import React, { useState, useEffect } from 'react';
import { RoutineItem } from '../../../types/index.js';
import { SpeechService } from '../../../services/speechService.js';
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
  Clock,
  Sparkles,
  Heart,
  PhoneCall,
} from 'lucide-react';

interface GuidedTaskRunnerProps {
  routine: RoutineItem;
  isOpen: boolean;
  onClose: () => void;
  onFinish: (routineId: string) => void;
  language?: 'en' | 'hi';
}

export const GuidedTaskRunner: React.FC<GuidedTaskRunnerProps> = ({
  routine,
  isOpen,
  onClose,
  onFinish,
  language = 'en',
}) => {
  const steps = routine.steps && routine.steps.length > 0
    ? routine.steps
    : [
        `Prepare your surroundings for ${routine.title}.`,
        'Take a calming breath and focus gently on the activity.',
        'Complete the activity at your own peaceful pace.',
        'Take a moment to enjoy feeling refreshed and satisfied.'
      ];

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [showStuckModal, setShowStuckModal] = useState<boolean>(false);
  const [stuckAdvice, setStuckAdvice] = useState<string | null>(null);

  // Optional countdown timer
  const initialSeconds = (routine.timerMinutes || 5) * 60;
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

  const handleFinish = () => {
    SpeechService.cancelSpeech();
    onFinish(routine.id);
    onClose();
  };

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Diagnostic Checkpoint ("Stuck?") answers
  const handleStuckResponse = (choice: 'started' | 'step1' | 'step2' | 'forgot' | 'caregiver') => {
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
        setStuckAdvice(`You are doing "${routine.title}". Right now, all you need to do is: "${currentStepText}". Take your time.`);
        handleReadAloud(`You are doing ${routine.title}. Right now, all you need to do is: ${currentStepText}. Take your time.`);
        break;
      case 'caregiver':
        setStuckAdvice('We are here for you. You can take a peaceful pause or ask your family caregiver for a hand.');
        handleReadAloud('We are here for you. You can take a peaceful pause or ask your family caregiver for a hand.');
        break;
    }
    setShowStuckModal(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-saksham-darkText/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-runner-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-purple-200 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-100">
          <div>
            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-100 uppercase tracking-wider">
              Guided Step-by-Step Task Runner
            </span>
            <h2 id="guided-runner-title" className="text-lg font-bold text-saksham-darkText mt-1">
              {routine.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
            aria-label="Close Task Runner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="my-4">
          <div className="flex items-center justify-between text-xs font-bold text-purple-900 mb-1.5">
            <span>Step {currentStepIndex + 1} of {steps.length}</span>
            <span className="text-gray-500 font-medium">
              {Math.round(((currentStepIndex + 1) / steps.length) * 100)}% complete
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-purple-100 h-2.5 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-purple-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Instruction Display Box */}
        <div className="bg-gradient-to-br from-lavender-50 via-purple-50 to-pink-50/40 rounded-2xl p-5 border border-purple-200 shadow-inner my-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-800 bg-white px-2.5 py-1 rounded-md border border-purple-100 shadow-2xs">
              Instruction {currentStepIndex + 1}
            </span>

            <button
              onClick={() => handleReadAloud(currentStepText)}
              className={`p-2 rounded-xl border flex items-center space-x-1 text-xs font-bold transition ${
                isSpeaking
                  ? 'bg-purple-600 text-white border-purple-600 animate-pulse'
                  : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
              }`}
              title="Read instruction aloud"
              aria-label="Read instruction aloud"
            >
              <Volume2 className="w-4 h-4" />
              <span>Read Aloud</span>
            </button>
          </div>

          <p className="text-base md:text-lg text-saksham-darkText font-semibold leading-relaxed my-3">
            "{currentStepText}"
          </p>
        </div>

        {/* Asha Reassuring Advice Box (If Stuck assistance was given) */}
        {stuckAdvice && (
          <div className="bg-purple-100/70 border border-purple-300 rounded-2xl p-3 mb-3 flex items-start space-x-2.5 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-purple-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-purple-900 font-medium leading-relaxed">
              {stuckAdvice}
            </p>
          </div>
        )}

        {/* Optional Activity Countdown Timer */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-purple-100 shadow-xs mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-gray-700">Gentle Timer:</span>
            <span className="text-sm font-extrabold text-purple-900 font-mono">
              {formatTimer(secondsRemaining)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="p-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition text-xs font-semibold flex items-center space-x-1"
            >
              {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isTimerRunning ? 'Pause' : 'Start'}</span>
            </button>
            <button
              onClick={() => {
                setIsTimerRunning(false);
                setSecondsRemaining(initialSeconds);
                setTimerExpired(false);
              }}
              className="p-1.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
              title="Reset Timer"
              aria-label="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {timerExpired && (
          <p className="text-center text-xs text-purple-700 font-medium bg-purple-50 p-2 rounded-xl border border-purple-100 mb-3">
            ✨ Timer finished gently. Take all the extra time you need!
          </p>
        )}

        {/* Step Navigation Controls (Prev, Next / Finish) */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-purple-100">
          <button
            onClick={handlePrevStep}
            disabled={currentStepIndex === 0}
            className="flex-1 flex items-center justify-center space-x-1 py-3 px-3 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent font-bold text-xs transition min-h-[48px]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Step</span>
          </button>

          {currentStepIndex < steps.length - 1 ? (
            <button
              onClick={handleNextStep}
              className="flex-1 flex items-center justify-center space-x-1 py-3 px-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition min-h-[48px]"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex-1 flex items-center justify-center space-x-1.5 py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition min-h-[48px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finish Activity</span>
            </button>
          )}
        </div>

        {/* "Stuck? Need Help?" Button */}
        <div className="text-center mt-3">
          <button
            onClick={() => setShowStuckModal(true)}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3.5 py-2 rounded-xl border border-purple-200 transition"
          >
            <HelpCircle className="w-4 h-4 text-purple-600" />
            <span>Stuck? Or need assistance?</span>
          </button>
        </div>
      </div>

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
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              Tell Asha what is happening, and she will gently guide you forward:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleStuckResponse('started')}
                className="w-full text-left p-2.5 rounded-xl border border-purple-100 hover:border-purple-300 hover:bg-purple-50 text-xs font-medium text-purple-900 transition"
              >
                🌱 I have just started
              </button>
              <button
                onClick={() => handleStuckResponse('step1')}
                className="w-full text-left p-2.5 rounded-xl border border-purple-100 hover:border-purple-300 hover:bg-purple-50 text-xs font-medium text-purple-900 transition"
              >
                ✓ I completed the first step
              </button>
              <button
                onClick={() => handleStuckResponse('step2')}
                className="w-full text-left p-2.5 rounded-xl border border-purple-100 hover:border-purple-300 hover:bg-purple-50 text-xs font-medium text-purple-900 transition"
              >
                ✓ I completed the second step
              </button>
              <button
                onClick={() => handleStuckResponse('forgot')}
                className="w-full text-left p-2.5 rounded-xl border border-purple-100 hover:border-purple-300 hover:bg-purple-50 text-xs font-medium text-purple-900 transition"
              >
                💭 I forgot what I was doing
              </button>
              <button
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
