import React from 'react';
import type { Task } from '@/types/firestore';
import { Button } from '@/components/ui/Button';
import { VoiceReadButton } from '@/components/voice/VoiceReadButton';

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: number) => void;
  onSnooze: (taskId: number) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onComplete, onSnooze }) => {
  const isDone = task.status === 'done';
  const isSnoozed = task.status === 'snoozed';
  const speechText = `Task: ${task.label} at ${task.time}. Status: ${task.status}. ${task.notes || ''}`;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border-2 transition-all gap-4 ${
        isDone
          ? 'bg-emerald-50/70 border-emerald-200 opacity-80'
          : isSnoozed
          ? 'bg-amber-50/70 border-amber-200'
          : 'bg-white border-gray-100 shadow-sm hover:border-teal-200'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="text-3xl shrink-0 p-2 rounded-xl bg-gray-50/80" aria-hidden="true">
          {task.icon || '📌'}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`text-base font-semibold truncate ${
                isDone ? 'line-through text-gray-500' : 'text-gray-900'
              }`}
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
              size="sm"
              onClick={() => onSnooze(task.id)}
              className="text-amber-700 hover:bg-amber-100/60"
              aria-label={`Snooze ${task.label}`}
            >
              Snooze
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => onComplete(task.id)}
              className="bg-emerald-600 hover:bg-emerald-700 min-h-touch px-5 text-white"
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
  );
};
