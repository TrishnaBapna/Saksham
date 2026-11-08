import React, { useState, useEffect, useRef } from 'react';
import { RoutineItem, LovedOne } from '../../../types/index.js';
import { SpeechService } from '../../../services/speechService.js';
import { audioSynthesizer } from '../../../services/audioSynthesizerService.js';
import { RoutineService } from '../services/routineService.js';
import { LovedOnesService } from '../../lovedOnes/services/lovedOnesService.js';
import {
  X,
  Play,
  Pause,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Volume2,
  ListCheck,
  Layout,
  Check,
  Info,
  Clock,
  Phone,
  MessageSquare,
  Sparkles,
  Layers,
  Heart,
} from 'lucide-react';

interface GuidedTaskRunnerProps {
  routine: RoutineItem;
  isOpen: boolean;
  onClose: () => void;
  onFinish: (routineId: string) => void;
  defaultViewMode?: 'single' | 'checklist';
  language?: string;
  patientId?: string;
}

export const GuidedTaskRunner: React.FC<GuidedTaskRunnerProps> = ({
  routine,
  isOpen,
  onClose,
  onFinish,
  defaultViewMode = 'single',
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
          '1. Prepare & Relax Fingers: Lay loose shirt flat and perform 3 gentle finger stretches',
          '2. Fasten Bottom-Up: Fasten buttons starting from bottom upward, resting hands between buttons (or use adaptive button aid)',
          '3. Final Comfort & Posture Check: Smooth sleeves comfortably and breathe calmly (Caregiver co-assistance welcome if tremors are present)',
        ];

  // Dual View Mode: 'checklist' (all steps overview matching Screenshot 2) vs 'single'
  const [viewMode, setViewMode] = useState<'single' | 'checklist'>(defaultViewMode);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Modals state
  const [showStuckModal, setShowStuckModal] = useState<boolean>(false);
  const [stuckActiveTab, setStuckActiveTab] = useState<'main' | 'breakdown' | 'explain' | 'asha' | 'caregiver'>('main');
  const [stuckAdvice, setStuckAdvice] = useState<string | null>(null);
  const [showConfirmFinishModal, setShowConfirmFinishModal] = useState<boolean>(false);

  // 15-Minute Activity Timer (Strictly 900 seconds initial)
  const initialSeconds = 15 * 60;
  const [timerDuration, setTimerDuration] = useState<number>(initialSeconds);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [hasWarnedTwoMinutes, setHasWarnedTwoMinutes] = useState<boolean>(false);
  const lastTickRef = useRef<number>(Date.now());

  // Family caregivers linked to patient
  const caregivers: LovedOne[] = React.useMemo(() => {
    try {
      const all = LovedOnesService.getLovedOnes(patientId);
      return all.filter(
        (l) =>
          l.relationship.toLowerCase().includes('caregiver') ||
          Boolean(l.phoneNumber || l.whatsappNumber || l.phone)
      );
    } catch {
      return [];
    }
  }, [patientId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && secondsRemaining > 0) {
      lastTickRef.current = Date.now();
      interval = setInterval(() => {
        const now = Date.now();
        const deltaSeconds = Math.max(1, Math.round((now - lastTickRef.current) / 1000));
        lastTickRef.current = now;

        setSecondsRemaining((prev) => {
          const nextSecs = Math.max(0, prev - deltaSeconds);

          // Gentle 2-minute warning
          if (nextSecs <= 120 && nextSecs > 0 && !hasWarnedTwoMinutes) {
            setHasWarnedTwoMinutes(true);
            audioSynthesizer.playTone(523.25, 0.2);
            SpeechService.speak(
              'Gentle reminder: two minutes remaining. Take your comfortable time.',
              () => {},
              () => {},
              language === 'hi' ? 'hi-IN' : 'en-IN'
            );
          }

          // Timer expiry at 0:00:
          // Crucial rule: NEVER auto-completes task, NEVER auto-ticks steps, NEVER updates progress ring!
          if (nextSecs === 0) {
            setIsTimerRunning(false);
            audioSynthesizer.playChime('chime');
            SpeechService.speak(
              '15 minutes has completed. Take all the time you need to finish, or tap Complete when ready.',
              () => {},
              () => {},
              language === 'hi' ? 'hi-IN' : 'en-IN'
            );
            return 0;
          }

          return nextSecs;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsRemaining, hasWarnedTwoMinutes, language]);

  if (!isOpen) return null;

  const currentStepText = steps[currentStepIndex] || steps[0] || '1. Take a calm breath and begin.';

  // Helper to extract 2-3 micro-actions for the active step
  const getMicroActions = (stepText: string): string[] => {
    const text = stepText.toLowerCase();
    if (text.includes('button') || text.includes('shirt') || text.includes('dress')) {
      return [
        '1. Spread your shirt flat across your lap and take a slow breath.',
        '2. Line up the bottom button and hole carefully with both hands.',
        '3. Push the button through gently, resting hands after each button.',
      ];
    }
    if (text.includes('tea') || text.includes('water') || text.includes('hydrat') || text.includes('medication')) {
      return [
        '1. Place both feet firmly on the ground and rest hands on table.',
        '2. Grip the cup or glass with both hands for steady balance.',
        '3. Take three gentle sips slowly and breathe calmly.',
      ];
    }
    if (text.includes('walk') || text.includes('garden') || text.includes('stretch') || text.includes('feet')) {
      return [
        '1. Check that your shoes or slippers are securely fastened.',
        '2. Stand up slowly, holding onto a stable chair for 5 seconds.',
        '3. Take three slow, calm steps forward at your own comfortable pace.',
      ];
    }
    return [
      '1. Sit in a comfortable, supported chair and take a calm breath.',
      `2. Focus on just the first small part: "${stepText.replace(/^[0-9]+\.\s*/, '').slice(0, 50)}".`,
      '3. Pause and rest your hands whenever you feel any tension.',
    ];
  };

  const getSimplifiedExplanation = (stepText: string): string => {
    const clean = stepText.replace(/^[0-9]+\.\s*/, '');
    return `In simple words: Take your time with this step. ${clean}. There is no test or hurry at all.`;
  };

  const getAshaReassurance = (): string => {
    return `Namaste! Asha is here with you. You are doing wonderfully with "${routine.title}". Relax your shoulders, breathe in deeply, and remember each calm effort is a victory for your wellbeing.`;
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
    const totalSecs = mins * 60;
    setTimerDuration(totalSecs);
    setSecondsRemaining(totalSecs);
    setIsTimerRunning(true);
    setHasWarnedTwoMinutes(false);
    lastTickRef.current = Date.now();
    audioSynthesizer.playTone(440, 0.15);
  };

  const handleExtendTimer = (extraMins: number = 5) => {
    setTimerDuration((prev) => prev + extraMins * 60);
    setSecondsRemaining((prev) => prev + extraMins * 60);
    setIsTimerRunning(true);
    lastTickRef.current = Date.now();
    audioSynthesizer.playChime('chime');
  };

  // Open confirmation modal for finish
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

  const timerPercent = timerDuration > 0 ? (secondsRemaining / timerDuration) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="runner-task-title"
    >
      <div className="bg-white max-w-lg w-full rounded-3xl p-4 sm:p-6 shadow-2xl border-2 border-purple-200 my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">
        {/* Pinned Header (Screenshot 2) */}
        <div className="flex justify-between items-center border-b border-purple-100 pb-3 flex-shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-lg sm:text-xl shadow-xs shrink-0">
              <ListCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                {routine.category.toUpperCase()} • {routine.scheduledTime}
              </span>
              <span className="sr-only">Guided Step-by-Step Task Runner</span>
              <h3 id="runner-task-title" className="text-base sm:text-lg font-black text-slate-900 font-heading mt-0.5 leading-snug line-clamp-1">
                {routine.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-xl font-bold flex items-center justify-center transition shrink-0 cursor-pointer"
            aria-label="Close Task Runner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 space-y-3 pr-1 py-3" style={{ overscrollBehavior: 'contain' }}>
          {/* Reassurance Banner (Screenshot 2) */}
          <div className="p-3 bg-purple-50/80 rounded-2xl border border-purple-200 text-[11px] sm:text-xs text-purple-950 font-medium flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-700 shrink-0" />
            <span>
              Complete each guided step below. When all steps are ticked, your task will be recorded as completed with a green checkmark!
            </span>
          </div>

          {/* 15-Minute Countdown Timer & Progress Bar (Screenshot 2) */}
          <div className="bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 p-3.5 sm:p-4 rounded-2xl border border-purple-500/30 text-white shadow-md space-y-2.5">
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center space-x-2 shrink-0">
                <span className={`w-2.5 h-2.5 rounded-full ${isTimerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-[11px] sm:text-xs font-bold text-purple-200 uppercase tracking-wider">
                  15M ACTIVITY TIMER
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handlePresetTimer(10)}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-purple-400/40 hover:bg-white/10 text-purple-200 cursor-pointer"
                >
                  10m
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetTimer(15)}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-purple-400/60 bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 cursor-pointer"
                >
                  15m
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                  {formatTimer(secondsRemaining)}
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-purple-300">
                  {isTimerRunning ? 'Remaining' : 'Paused'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleExtendTimer(5)}
                  className="px-2.5 py-1 sm:py-1.5 bg-slate-700/80 hover:bg-slate-600 text-amber-300 rounded-xl text-xs font-bold border border-slate-600 flex items-center gap-1 cursor-pointer"
                  title="Extend timer by 5 minutes"
                >
                  <Clock className="w-3 h-3 text-amber-300" /> +5m
                </button>
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`px-2.5 py-1 sm:py-1.5 text-slate-950 rounded-xl text-xs font-black shadow transition flex items-center gap-1 cursor-pointer ${
                    isTimerRunning ? 'bg-amber-400 hover:bg-amber-300' : 'bg-emerald-400 hover:bg-emerald-300'
                  }`}
                  title={isTimerRunning ? 'Pause activity to rest' : 'Resume activity'}
                >
                  {isTimerRunning ? <Pause className="w-3 h-3 text-slate-950" /> : <Play className="w-3 h-3 text-slate-950" />}
                  <span>{isTimerRunning ? 'Pause' : 'Resume'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowStuckModal(true)}
                  className="px-2.5 py-1 sm:py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow transition flex items-center gap-1 cursor-pointer"
                  aria-label="Stuck? Or need assistance?"
                >
                  <HelpCircle className="w-3 h-3 text-white" />
                  <span className="sr-only">Stuck? Or need assistance?</span>
                  <span aria-hidden="true">Stuck?</span>
                </button>
              </div>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-400 to-indigo-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${timerPercent}%` }}
              />
            </div>

            {/* 2-Minute Gentle Warning Banner */}
            {secondsRemaining <= 120 && secondsRemaining > 0 && (
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>⏳ Gentle reminder: 2 minutes remaining. No rush at all.</span>
              </div>
            )}

            {/* Timer Expired Banner (Zero Auto-Complete) */}
            {secondsRemaining === 0 && (
              <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                <Info className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                <span>🔔 15-minute timer concluded. Take all the peaceful time you need to complete your steps.</span>
              </div>
            )}

            {/* Pause & Rest Banner */}
            {!isTimerRunning && secondsRemaining > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold flex items-center justify-between">
                <span>☕ Activity paused. Rest your hands and mind. Tap Resume when ready.</span>
              </div>
            )}
          </div>

          {/* Mode Switcher pill (Step-by-Step Card vs Full Checklist) */}
          <div className="flex items-center justify-between bg-purple-50/60 border border-purple-100 p-1 rounded-xl text-xs">
            <span className="text-[11px] font-bold text-purple-900/80 pl-1">Display Mode:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`py-1 px-2.5 rounded-lg font-bold text-xs transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'single'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-800 hover:text-purple-950'
                }`}
              >
                <Layout className="w-3 h-3" />
                <span>Step-by-Step Card</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('checklist')}
                className={`py-1 px-2.5 rounded-lg font-bold text-xs transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'checklist'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-800 hover:text-purple-950'
                }`}
              >
                <ListCheck className="w-3 h-3" />
                <span>Full Checklist</span>
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: Single Step Card */}
          {viewMode === 'single' && (
            <div className="bg-gradient-to-br from-purple-50/30 via-white to-purple-50/20 rounded-2xl p-4 sm:p-5 border border-purple-100 shadow-inner space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-800 bg-white px-2.5 py-1 rounded-md border border-purple-200 shadow-2xs">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
                <button
                  type="button"
                  onClick={() => handleReadAloud(currentStepText)}
                  className="px-2.5 py-1 text-xs font-bold text-purple-800 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition flex items-center gap-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Read Aloud</span>
                </button>
              </div>

              <p className="text-base sm:text-lg text-slate-900 font-bold leading-relaxed">
                "{currentStepText}"
              </p>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={currentStepIndex === 0}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 text-xs font-bold transition flex items-center gap-1"
                  aria-label="Previous Step"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous Step</span>
                </button>
                {currentStepIndex === steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleRequestFinish}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    aria-label="Finish Activity"
                  >
                    <span>Finish Activity</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1"
                    aria-label="Next Step"
                  >
                    <span>Next Step</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: Guided Steps Checklist (Screenshot 2) */}
          {viewMode === 'checklist' && (
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold text-slate-600 block pl-0.5">
                Tick each step as you complete it:
              </span>
              {steps.map((step, idx) => {
                const isChecked = completedSteps.has(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleStepCheckbox(idx)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 transition cursor-pointer select-none ${
                      isChecked
                        ? 'bg-purple-50/80 border-purple-200 text-purple-950 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-purple-200 text-slate-800 shadow-xs'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border-2 transition ${
                        isChecked
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div className="flex-1 text-xs sm:text-[13px] leading-relaxed font-semibold">
                      <span className={isChecked ? 'line-through text-slate-400' : 'text-slate-900'}>
                        {step.startsWith(`${idx + 1}.`) ? step : `${idx + 1}. ${step}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Advice / Assistance Feedback */}
          {stuckAdvice && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 flex items-start space-x-2.5 animate-in fade-in">
              <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-950 font-medium leading-relaxed">{stuckAdvice}</p>
            </div>
          )}
        </div>

        {/* Pinned Action Buttons Footer (Screenshot 2) */}
        <div className="pt-3 border-t border-purple-100 flex flex-col sm:flex-row justify-between items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => handleReadAloud(steps.join('. '))}
            className={`w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] ${
              isSpeaking
                ? 'bg-purple-600 text-white animate-pulse'
                : 'bg-slate-100 hover:bg-purple-50 text-slate-700'
            }`}
          >
            <Volume2 className="w-4 h-4 text-purple-700" />
            <span>Read Steps Aloud</span>
          </button>

          <button
            type="button"
            onClick={handleRequestFinish}
            className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 min-h-[42px]"
            aria-label="Complete Task & Auto-Tick"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-300" />
            <span>Complete Task & Auto-Tick</span>
          </button>
        </div>
      </div>

      {/* Diagnostic Stuck Assistance Modal */}
      {showStuckModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-stuck-title"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border-4 border-purple-300 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-purple-100 pb-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-600 shrink-0" />
                <h3 id="modal-stuck-title" className="text-base font-black text-slate-900 font-heading">
                  Where are you right now?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowStuckModal(false);
                  setStuckActiveTab('main');
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close assistance modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TAB 1: Main View with 4 Assistance Options + 4 Checkpoints */}
            {stuckActiveTab === 'main' && (
              <div className="space-y-4">
                {/* 4 Dedicated Assistance Options */}
                <div>
                  <span className="text-[11px] font-black text-purple-800 uppercase tracking-wider block mb-2">
                    Four Calming Ways to Get Help
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Option A: Break step down */}
                    <button
                      type="button"
                      onClick={() => setStuckActiveTab('breakdown')}
                      className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-left transition flex items-start gap-2 cursor-pointer"
                    >
                      <Layers className="w-4 h-4 text-purple-700 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-purple-950">1. Break Down</h4>
                        <p className="text-[10px] text-purple-800">3 simple steps</p>
                      </div>
                    </button>

                    {/* Option B: Explain again */}
                    <button
                      type="button"
                      onClick={() => setStuckActiveTab('explain')}
                      className="p-2.5 rounded-xl border border-sky-200 bg-sky-50/60 hover:bg-sky-100 text-left transition flex items-start gap-2 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4 text-sky-700 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-sky-950">2. Explain Again</h4>
                        <p className="text-[10px] text-sky-800">Simpler words</p>
                      </div>
                    </button>

                    {/* Option C: Ask Asha */}
                    <button
                      type="button"
                      onClick={() => setStuckActiveTab('asha')}
                      className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-left transition flex items-start gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-700 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-indigo-950">3. Ask Asha</h4>
                        <p className="text-[10px] text-indigo-800">Warm comfort</p>
                      </div>
                    </button>

                    {/* Option D: Ask Caregiver */}
                    <button
                      type="button"
                      onClick={() => setStuckActiveTab('caregiver')}
                      className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-left transition flex items-start gap-2 cursor-pointer"
                    >
                      <Heart className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-rose-950">4. Caregiver</h4>
                        <p className="text-[10px] text-rose-800">Reach loved one</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Quick Checkpoints for test compatibility & fast answers */}
                <div>
                  <p className="text-xs text-slate-600 font-medium mb-1.5">
                    Select the checkpoint that matches your situation:
                  </p>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => handleStuckResponse('started')}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-xs font-bold text-slate-800 transition cursor-pointer"
                    >
                      1. I have just started / Need to gather materials
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStuckResponse('step1')}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-xs font-bold text-slate-800 transition cursor-pointer"
                    >
                      2. I completed the first step, ready for the next
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStuckResponse('forgot')}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-xs font-bold text-slate-800 transition cursor-pointer"
                    >
                      3. I forgot what I was doing / Lost my place
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStuckResponse('caregiver')}
                      className="w-full text-left p-2.5 rounded-xl border border-rose-200 hover:border-rose-400 bg-rose-50/40 text-xs font-bold text-rose-900 transition cursor-pointer"
                    >
                      4. Need a caregiver or loved one to help me
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB A: Micro-Actions Breakdown */}
            {stuckActiveTab === 'breakdown' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-xs text-purple-800 font-bold">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>Micro-Actions for Step {currentStepIndex + 1}</span>
                </div>
                <div className="space-y-2 bg-purple-50/70 p-3.5 rounded-2xl border border-purple-200">
                  {getMicroActions(currentStepText).map((action, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs font-semibold text-purple-950">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span className="flex-1 leading-snug">{action}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleReadAloud(getMicroActions(currentStepText).join('. '))}
                    className="flex-1 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Read Aloud</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStuckActiveTab('main');
                      setShowStuckModal(false);
                    }}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Back to Task
                  </button>
                </div>
              </div>
            )}

            {/* TAB B: Explain Again */}
            {stuckActiveTab === 'explain' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-xs text-sky-800 font-bold">
                  <Volume2 className="w-4 h-4 text-sky-600" />
                  <span>Simpler Words</span>
                </div>
                <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200 text-xs sm:text-sm text-sky-950 font-medium leading-relaxed">
                  "{getSimplifiedExplanation(currentStepText)}"
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleReadAloud(getSimplifiedExplanation(currentStepText))}
                    className="flex-1 py-2 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Read Aloud</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStuckActiveTab('main');
                      setShowStuckModal(false);
                    }}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Back to Task
                  </button>
                </div>
              </div>
            )}

            {/* TAB C: Ask Asha */}
            {stuckActiveTab === 'asha' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-xs text-purple-800 font-bold">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Asha's Encouragement</span>
                </div>
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 text-xs sm:text-sm text-purple-950 font-medium leading-relaxed">
                  "{getAshaReassurance()}"
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleReadAloud(getAshaReassurance())}
                    className="flex-1 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Hear Asha</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStuckActiveTab('main');
                      setShowStuckModal(false);
                    }}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Back to Task
                  </button>
                </div>
              </div>
            )}

            {/* TAB D: Ask Caregiver */}
            {stuckActiveTab === 'caregiver' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-xs text-rose-800 font-bold">
                  <Heart className="w-4 h-4 text-rose-600" />
                  <span>Family Caregiver Support</span>
                </div>
                {caregivers.length > 0 ? (
                  <div className="space-y-2">
                    {caregivers.map((cg) => {
                      const phoneNum = cg.phoneNumber || cg.phone || '';
                      const cleanPhone = phoneNum.replace(/[^0-9]/g, '');
                      return (
                        <div
                          key={cg.id}
                          className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <h4 className="text-xs font-black text-slate-900">{cg.name}</h4>
                            <p className="text-[11px] text-rose-800 font-semibold">{cg.relationship}</p>
                            {phoneNum && (
                              <p className="text-[11px] text-slate-600 font-mono mt-0.5">{phoneNum}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {phoneNum && (
                              <a
                                href={`tel:${phoneNum}`}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Call</span>
                              </a>
                            )}
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-950 font-medium leading-relaxed">
                    No caregiver phone number is linked in Loved Ones yet. Take a peaceful resting breath, or ask your family caregiver in person.
                  </div>
                )}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStuckActiveTab('main');
                      setShowStuckModal(false);
                    }}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Back to Task
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal before marking complete */}
      {showConfirmFinishModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in zoom-in-95 duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-finish-title"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-purple-300 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-purple-600" />
            </div>

            <div className="space-y-1">
              <h3 id="confirm-finish-title" className="text-base font-black text-slate-900 font-heading">
                Complete "{routine.title}"?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you satisfied and ready to mark this routine activity completed for today?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmFinishModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition min-h-[44px] cursor-pointer"
              >
                Keep Working
              </button>
              <button
                type="button"
                onClick={handleConfirmFinish}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md transition min-h-[44px] cursor-pointer"
              >
                Yes, Complete!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
