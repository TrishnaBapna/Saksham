import React, { useEffect } from 'react';
import { RoutineItem } from '../../../types/index.js';
import { CharacterVisualizer } from '../../ai-companion/CharacterVisualizer.js';
import { audioSynthesizer } from '../../../services/audioSynthesizerService.js';
import { Play, Clock, Check, X, Bell } from 'lucide-react';

interface CompanionReminderBannerProps {
  task: RoutineItem;
  onStartActivity: (task: RoutineItem) => void;
  onSnooze: (task: RoutineItem, minutes: number) => void;
  onComplete: (taskId: string) => void;
  onDismiss: () => void;
  soundEnabled?: boolean;
  className?: string;
}

export const CompanionReminderBanner: React.FC<CompanionReminderBannerProps> = ({
  task,
  onStartActivity,
  onSnooze,
  onComplete,
  onDismiss,
  soundEnabled = true,
  className = '',
}) => {
  useEffect(() => {
    if (soundEnabled) {
      audioSynthesizer.playChime('reminder');
    }
  }, [task.id, soundEnabled]);

  return (
    <div
      role="region"
      aria-label={`Companion reminder for ${task.title}`}
      className={`bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 rounded-3xl border-2 border-purple-400/80 shadow-soft-purple flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn ${className}`}
    >
      <div className="flex items-center gap-3.5 max-w-xl">
        <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center bg-white/10 rounded-2xl border border-white/20 p-1">
          <CharacterVisualizer characterId="asha" state="reminder" size={56} />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-200 bg-purple-500/30 px-2.5 py-0.5 rounded-full border border-purple-400/40 flex items-center gap-1">
              <Bell className="w-3 h-3 text-amber-300" />
              <span>Companion Nudge</span>
            </span>
            <span className="text-xs font-bold text-lavender-200">
              {task.snoozedUntil ? `Snoozed to ${task.snoozedUntil}` : `Due Now (${task.scheduledTime})`}
            </span>
          </div>

          <h4 className="text-sm sm:text-base font-extrabold text-white leading-snug">
            Gentle reminder: {task.title}
          </h4>
          <p className="text-xs text-lavender-100 leading-relaxed">
            Ready when you are! Or tap snooze and Asha will check back in 3 minutes.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 justify-end pt-1 sm:pt-0">
        <button
          type="button"
          onClick={() => onStartActivity(task)}
          className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
          aria-label={`Start activity ${task.title}`}
        >
          <Play className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
          <span>Let's Do It! 🌟</span>
        </button>

        <button
          type="button"
          onClick={() => onSnooze(task, 3)}
          className="flex-1 sm:flex-none px-3.5 py-2.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs rounded-xl border border-white/20 transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
          title="Remind me in 3 minutes"
          aria-label="Snooze for 3 minutes"
        >
          <Clock className="w-3.5 h-3.5 text-lavender-200" />
          <span>Remind me in 3 mins ⏰</span>
        </button>

        <button
          type="button"
          onClick={() => onComplete(task.id)}
          className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl border border-emerald-400 transition cursor-pointer flex items-center justify-center min-h-[44px] min-w-[44px]"
          title="Mark Task Done"
          aria-label={`Mark ${task.title} completed`}
        >
          <Check className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-base font-bold flex items-center justify-center transition cursor-pointer"
          title="Dismiss banner"
          aria-label="Dismiss companion reminder"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
