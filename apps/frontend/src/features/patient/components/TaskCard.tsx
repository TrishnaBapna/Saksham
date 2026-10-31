import React, { useState, useEffect, useCallback } from 'react';
import type { Task } from '@/types/firestore';
import { Button } from '@/components/ui/Button';
import { VoiceReadButton } from '@/components/voice/VoiceReadButton';
import {
  getAdaptiveAssistanceRecommendations,
  type AssistanceRecommendationResult,
  type AssistanceCategory,
} from '@/services/adaptiveAssistanceEngine';
import {
  getPersonalisationTrialState,
  recordAssistanceFeedback,
  recordActivityDifficulty,
} from '@/services/personalizationService';

export interface TaskCardProps {
  task: Task;
  userId?: string;
  onComplete: (taskId: number) => void;
  onSnooze: (taskId: number) => void;
  onDifficultyReported?: (taskId: number, difficulty: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  userId = 'default-patient',
  onComplete,
  onSnooze,
  onDifficultyReported,
}) => {
  const isDone = task.status === 'done';
  const isSnoozed = task.status === 'snoozed';
  const speechText = `Task: ${task.label} at ${task.time}. Status: ${task.status}. ${task.notes || ''}`;

  // Adaptive Assistance State
  const [recommendationResult, setRecommendationResult] = useState<AssistanceRecommendationResult | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [activeAssistance, setActiveAssistance] = useState<AssistanceCategory | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'unhelpful' | null>(null);

  // In-Task Difficulty State
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [difficultyType, setDifficultyType] = useState<string>('sequence');
  const [assistanceOption, setAssistanceOption] = useState<AssistanceCategory>('step_by_step');
  const [difficultyNotes, setDifficultyNotes] = useState('');

  // Load recommendations deterministically based on trial feedback
  const refreshRecommendations = useCallback(() => {
    try {
      const trialState = getPersonalisationTrialState(userId);
      const result = getAdaptiveAssistanceRecommendations({
        task,
        userProfile: trialState.baselinePreferences,
        recordedFeedback: trialState.difficultiesRecorded,
        helpfulAssistanceOptions: trialState.helpfulAssistanceOptions,
        unhelpfulAssistanceOptions: trialState.unhelpfulAssistanceOptions,
      });
      setRecommendationResult(result);
    } catch {
      setRecommendationResult(null);
    }
  }, [userId, task]);

  useEffect(() => {
    refreshRecommendations();
  }, [refreshRecommendations]);

  const primaryRecommendation = recommendationResult?.primaryRecommendation;
  const showBanner = !isDone && !isDismissed && Boolean(primaryRecommendation);

  // Apply assistance
  const handleTryAssistance = () => {
    if (!primaryRecommendation) return;
    const cat = primaryRecommendation.category;
    setActiveAssistance(cat);

    if (cat === 'voice_guidance') {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(speechText);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Record feedback (Helpful / Not for me)
  const handleFeedback = (rating: 'helpful' | 'unhelpful') => {
    if (!primaryRecommendation) return;
    const cat = primaryRecommendation.category;
    setFeedbackGiven(rating);

    recordAssistanceFeedback(userId, {
      activityId: task.id.toString(),
      assistanceCategory: cat,
      helpfulRating: rating,
      taskLabel: task.label,
    });

    if (rating === 'unhelpful') {
      setIsDismissed(true);
      setActiveAssistance(null);
    }
    refreshRecommendations();
  };

  // Submit in-task difficulty report
  const handleSubmitDifficulty = (e: React.FormEvent) => {
    e.preventDefault();
    recordActivityDifficulty(userId, {
      taskId: task.id,
      taskTitle: task.label,
      difficultyCategory: difficultyType as any,
      difficultyType,
      assistanceOption,
      assistanceSelected: assistanceOption,
      notes: difficultyNotes || `Difficulty with ${task.label}`,
    });

    if (onDifficultyReported) {
      onDifficultyReported(task.id, difficultyType);
    }

    setShowDifficultyModal(false);
    setDifficultyNotes('');
    refreshRecommendations();
  };

  const isLargerControls = activeAssistance === 'larger_controls' || primaryRecommendation?.category === 'larger_controls';

  return (
    <div
      data-testid={`task-card-${task.id}`}
      className={`flex flex-col rounded-2xl border-2 transition-all p-4 gap-3 ${
        isDone
          ? 'bg-emerald-50/70 border-emerald-200 opacity-80'
          : isSnoozed
          ? 'bg-amber-50/70 border-amber-200'
          : 'bg-white border-gray-100 shadow-sm hover:border-teal-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="text-3xl shrink-0 p-2 rounded-xl bg-gray-50/80" aria-hidden="true">
            {task.icon || '📌'}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={`text-base font-semibold truncate ${
                  isDone ? 'line-through text-gray-500' : 'text-gray-900'
                } ${isLargerControls ? 'text-lg font-bold' : ''}`}
              >
                {task.label}
              </h3>
              <VoiceReadButton textToRead={speechText} ariaLabel={`Read aloud task ${task.label}`} />
              {isDone && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  Done ✓
                </span>
              )}
              {isSnoozed && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  Snoozed ⏰
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-gray-500 mt-0.5 flex items-center gap-1.5">
              <span>🕒 {task.time}</span>
              {task.notes && <span className="truncate text-xs">· {task.notes}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {!isDone && (
            <>
              <Button
                variant="ghost"
                size={isLargerControls ? 'md' : 'sm'}
                onClick={() => onSnooze(task.id)}
                className={`text-amber-700 hover:bg-amber-100/60 ${isLargerControls ? 'min-h-[48px] px-4 font-bold' : ''}`}
                aria-label={`Snooze ${task.label}`}
              >
                Snooze
              </Button>
              <Button
                variant="primary"
                size={isLargerControls ? 'lg' : 'md'}
                onClick={() => onComplete(task.id)}
                className={`bg-emerald-600 hover:bg-emerald-700 text-white ${
                  isLargerControls ? 'min-h-[54px] px-6 text-base font-black shadow-md' : 'min-h-touch px-5'
                }`}
                aria-label={`Mark ${task.label} as complete`}
              >
                Complete ✓
              </Button>
            </>
          )}
          {isDone && (
            <span className="text-sm font-semibold text-emerald-700 px-3 py-1.5">
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Adaptive Assistance Tray */}
      {showBanner && primaryRecommendation && (
        <div
          data-testid="adaptive-assistance-tray"
          className="mt-1 p-3.5 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200 text-sm space-y-2 animate-fadeIn"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-teal-900 flex items-center gap-1.5">
              <span>💡</span>
              <span>Assistance Available: {primaryRecommendation.label}</span>
            </span>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              aria-label="Dismiss recommendation"
              className="text-gray-400 hover:text-gray-600 text-xs font-semibold px-2 py-0.5 rounded cursor-pointer"
            >
              Dismiss ✕
            </button>
          </div>

          <p className="text-xs text-teal-800 leading-relaxed">
            <strong className="font-semibold">Why suggested:</strong> {primaryRecommendation.description}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleTryAssistance}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              Try Assistance
            </button>

            <button
              type="button"
              onClick={() => handleFeedback('helpful')}
              disabled={feedbackGiven === 'helpful'}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                feedbackGiven === 'helpful'
                  ? 'bg-emerald-200 border-emerald-300 text-emerald-900 font-bold'
                  : 'bg-white border-teal-200 text-teal-800 hover:bg-teal-100'
              }`}
            >
              👍 Helpful
            </button>

            <button
              type="button"
              onClick={() => handleFeedback('unhelpful')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            >
              👎 Not for me
            </button>
          </div>
        </div>
      )}

      {/* Step Breakdown Guidance when active */}
      {activeAssistance === 'step_by_step' && (
        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs space-y-1.5">
          <p className="font-bold text-blue-900 flex items-center gap-1">
            <span>📋</span> Step-by-Step Breakdown:
          </p>
          <ol className="list-decimal list-inside text-blue-800 space-y-1 pl-1">
            <li>Prepare your space and sit comfortably.</li>
            <li>Take one item or movement at a time.</li>
            <li>Rest if needed, then tap Complete ✓ when done.</li>
          </ol>
        </div>
      )}

      {/* In-Task Difficulty Reporting Trigger */}
      {!isDone && (
        <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100/80">
          <button
            type="button"
            onClick={() => setShowDifficultyModal(true)}
            className="text-gray-500 hover:text-teal-700 font-medium underline flex items-center gap-1 cursor-pointer transition"
          >
            <span>Having trouble with this task?</span>
          </button>
          {activeAssistance && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Assistance applied: {activeAssistance.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      )}

      {/* Difficulty Modal */}
      {showDifficultyModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h4 className="font-bold text-gray-900 text-sm">Report Task Difficulty</h4>
              <button
                type="button"
                onClick={() => setShowDifficultyModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDifficulty} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  What kind of difficulty did you experience?
                </label>
                <select
                  value={difficultyType}
                  onChange={(e) => setDifficultyType(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-800"
                >
                  <option value="memory">Memory / Remembering</option>
                  <option value="motor">Motor / Movement / Tremor</option>
                  <option value="sequence">Steps / Sequencing</option>
                  <option value="sensory">Vision / Sensory</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  What assistance would help you most?
                </label>
                <select
                  value={assistanceOption}
                  onChange={(e) => setAssistanceOption(e.target.value as any)}
                  className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-800"
                >
                  <option value="step_by_step">Step-by-step guidance</option>
                  <option value="voice_guidance">Voice readout</option>
                  <option value="larger_controls">Larger buttons / controls</option>
                  <option value="picture_prompt">Picture prompt</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Optional note
                </label>
                <input
                  type="text"
                  value={difficultyNotes}
                  onChange={(e) => setDifficultyNotes(e.target.value)}
                  placeholder="e.g. Buttons were hard to press"
                  className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDifficultyModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="bg-teal-700 text-white">
                  Save &amp; Adapt
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
