import React, { useState } from 'react';
import {
  MemoryChallengeConfig,
  MemoryChallengeResult,
  MemoryChallengeType,
} from '../types/taskLifecycle.types.js';
import { TaskLifecycleService } from '../services/taskLifecycleService.js';
import {
  Sparkles,
  HelpCircle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { SpeechService } from '../../../services/speechService.js';
import { audioSynthesizer } from '../../../services/audioSynthesizerService.js';
import { useLanguage } from '../../../context/LanguageContext.js';

interface MemoryChallengeCardProps {
  taskId: string;
  taskTitle?: string;
  config: MemoryChallengeConfig;
  patientId: string;
  language?: string;
  onChallengeComplete?: (result: MemoryChallengeResult) => void;
  onDecline?: () => void;
}

export const MemoryChallengeCard: React.FC<MemoryChallengeCardProps> = ({
  taskId,
  config,
  patientId,
  language: propLanguage,
  onChallengeComplete,
  onDecline,
}) => {
  const { t, language: ctxLanguage } = useLanguage();
  const language = propLanguage || ctxLanguage || 'en';
  const [cueLevel, setCueLevel] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [hintsRequested, setHintsRequested] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isDeclined, setIsDeclined] = useState<boolean>(false);

  if (isDeclined) return null;

  const challengeType: MemoryChallengeType = config.challengeType || 'next_step';

  const defaultQuestion =
    config.promptQuestion ||
    (challengeType === 'next_step'
      ? t('routines.challenge_q_next')
      : challengeType === 'location_recall'
      ? `Where do you usually keep your ${config.groundedItemKey || 'item'}?`
      : challengeType === 'delayed_recall'
      ? 'Can you remember which item we planned to use for this activity?'
      : 'What gentle step comes next in this routine?');

  const getCueText = (level: 0 | 1 | 2 | 3 | 4): string => {
    switch (level) {
      case 0:
        return 'Take a quiet moment. There is no hurry at all.';
      case 1:
        return config.groundedLocationHint
          ? `🌱 Orientation: Look around the room where you rest, such as near your bedside or desk.`
          : '🌱 Orientation: Think about where this activity normally takes place in your home.';
      case 2:
        return config.groundedLocationHint
          ? `🔍 Contextual Clue: It is placed on or near the ${config.groundedLocationHint}.`
          : '🔍 Contextual Clue: Focus on the everyday tools or mug you use for this.';
      case 3:
        return config.groundedLocationHint
          ? `✋ Guided Answer: It is recorded at: "${config.groundedLocationHint}".`
          : config.stepOptions && config.stepOptions.length > 0
          ? `✋ Guided Answer: The recommended step is: "${config.stepOptions[0]}".`
          : '✋ Guided Answer: Take one slow breath and start with the simplest motion.';
      case 4:
        return '🤝 Supported Completion: Asha is right here. We can complete this together with full audio guidance.';
    }
  };

  const handleRequestHint = () => {
    const nextLevel = Math.min(cueLevel + 1, 4) as 0 | 1 | 2 | 3 | 4;
    setCueLevel(nextLevel);
    setHintsRequested((h) => h + 1);
    audioSynthesizer.playTone(523.25, 0.15);

    const hintMsg = getCueText(nextLevel);
    SpeechService.speak(hintMsg, () => {}, () => {}, SpeechService.getBCP47(language));
  };

  const handleSelectOption = (idx: number) => {
    const isCorrect = config.correctOptionIndex !== undefined ? idx === config.correctOptionIndex : true;

    if (isCorrect) {
      audioSynthesizer.playTone(587.33, 0.2);
    }

    const result: MemoryChallengeResult = {
      challengeType,
      attempted: true,
      declined: false,
      cueLevelUsed: cueLevel,
      hintsRequested,
      completed: true,
      caregiverSupported: cueLevel === 4,
      recordedAt: new Date().toISOString(),
      nonDiagnosticNotice: 'Gentle cognitive exercise outcome for activity support. Strictly non-diagnostic.',
    };

    setIsCompleted(true);
    TaskLifecycleService.recordChallengeOutcome(patientId, taskId, result);
    onChallengeComplete?.(result);
  };

  const handleDeclineChallenge = () => {
    setIsDeclined(true);
    const result: MemoryChallengeResult = {
      challengeType,
      attempted: false,
      declined: true,
      cueLevelUsed: 0,
      hintsRequested: 0,
      completed: false,
      caregiverSupported: false,
      recordedAt: new Date().toISOString(),
      nonDiagnosticNotice: 'Patient declined optional recall exercise with zero penalty.',
    };
    TaskLifecycleService.recordChallengeOutcome(patientId, taskId, result);
    onDecline?.();
  };

  return (
    <div
      className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50/50 rounded-2xl border-2 border-purple-200 shadow-xs space-y-3 text-left animate-in fade-in"
      data-testid="memory-challenge-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-purple-100" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-purple-800 bg-purple-100/70 px-2 py-0.5 rounded-full border border-purple-200">
              {t('routines.challenge_optional_badge')}
            </span>
            <h4 className="text-xs font-black text-slate-900 mt-0.5">
              {defaultQuestion}
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDeclineChallenge}
          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          title="Skip challenge with zero penalty"
        >
          {t('routines.challenge_skip')}
        </button>
      </div>

      {/* Options if available */}
      {config.stepOptions && config.stepOptions.length > 0 && !isCompleted && (
        <div className="space-y-1.5 pt-1">
          {config.stepOptions.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectOption(idx)}
              className="w-full text-left p-2.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-100/60 text-slate-800 text-xs font-semibold transition flex items-center justify-between gap-2 min-h-[40px] cursor-pointer shadow-2xs"
            >
              <span>{opt}</span>
              <ChevronRight className="w-4 h-4 text-purple-500 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Current Cue Level Message */}
      {cueLevel > 0 && (
        <div className="p-2.5 bg-white/80 rounded-xl border border-purple-200 text-xs text-purple-950 font-medium">
          {getCueText(cueLevel)}
        </div>
      )}

      {/* Action Row */}
      {!isCompleted ? (
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={handleRequestHint}
            className="flex-1 py-2 px-3 bg-white hover:bg-purple-50 border border-purple-300 text-purple-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer min-h-[38px]"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>
              {cueLevel === 0
                ? t('routines.challenge_hint_0')
                : cueLevel === 1
                ? t('routines.challenge_hint_1')
                : cueLevel === 2
                ? t('routines.challenge_hint_2')
                : t('routines.challenge_hint_3')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectOption(0)}
            className="py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer min-h-[38px]"
          >
            {t('routines.challenge_remember')}
          </button>
        </div>
      ) : (
        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {t('routines.challenge_done')}
          </span>
          <span className="text-[10px] text-emerald-700 font-normal">
            (Zero penalty / Non-diagnostic)
          </span>
        </div>
      )}
    </div>
  );
};
