import React, { useEffect } from 'react';
import { RoutineItem } from '../../../types/index.js';
import { audioSynthesizer } from '../../../services/audioSynthesizerService.js';
import { Bell, ListCheck, Check } from 'lucide-react';

interface ActivityReminderModalProps {
  isOpen: boolean;
  task: RoutineItem | null;
  onClose: () => void;
  onOpenGuidedSteps: (task: RoutineItem) => void;
  onMarkCompleted?: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
  onSnooze: (task: RoutineItem, minutes: number) => void;
}

export const ActivityReminderModal: React.FC<ActivityReminderModalProps> = ({
  isOpen,
  task,
  onClose,
  onOpenGuidedSteps,
  onMarkCompleted,
  onComplete,
  onSnooze,
}) => {
  const handleCompleteAction = (id: string) => {
    if (onMarkCompleted) onMarkCompleted(id);
    if (onComplete) onComplete(id);
  };
  useEffect(() => {
    if (isOpen) {
      audioSynthesizer.playChime('bell');
    }
  }, [isOpen]);

  if (!isOpen || !task) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-reminder-title"
    >
      <div className="bg-white max-w-sm w-full rounded-3xl border-4 border-purple-300 p-6 text-center shadow-2xl space-y-4 my-auto animate-gentle-alert">
        {/* Animated Bell Icon */}
        <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
          <Bell className="w-8 h-8 text-purple-600 fill-purple-600 animate-bounce" />
        </div>

        {/* Title and Badge */}
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 bg-purple-100 px-3 py-1 rounded-full border border-purple-300">
            Activity Reminder
          </span>
          <h3
            id="activity-reminder-title"
            className="text-lg sm:text-xl font-black text-slate-900 mt-2.5 font-heading leading-snug"
          >
            {task.title}
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Asha Companion: "Gentle reminder for your {task.title}."
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenGuidedSteps(task);
            }}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 min-h-[44px]"
          >
            <ListCheck className="w-4 h-4 text-purple-200" />
            <span>Open Guided Steps (15m Timer)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleCompleteAction(task.id);
              onClose();
            }}
            className="w-full py-2.5 bg-purple-800 hover:bg-purple-900 text-white font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 min-h-[40px]"
          >
            <Check className="w-4 h-4 mr-0.5" />
            <span>Mark Completed</span>
          </button>

          {/* Snooze Row */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => {
                onSnooze(task, 3);
                onClose();
              }}
              className="py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-lg text-xs font-bold border border-amber-300 transition cursor-pointer"
              title="Snooze 3 minutes"
            >
              ⏰ 3 Mins
            </button>
            <button
              type="button"
              onClick={() => {
                onSnooze(task, 5);
                onClose();
              }}
              className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-200 transition cursor-pointer"
              title="Snooze 5 minutes"
            >
              +5 Mins
            </button>
            <button
              type="button"
              onClick={() => {
                onSnooze(task, 15);
                onClose();
              }}
              className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-200 transition cursor-pointer"
              title="Snooze 15 minutes"
            >
              +15 Mins
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold border border-rose-200 transition cursor-pointer"
            >
              Not Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
