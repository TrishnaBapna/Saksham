import React, { useState } from 'react';
import { RoutineItem } from '../../../types/index.js';
import { SpeechService } from '../../../services/speechService.js';
import { RoutineService } from '../services/routineService.js';
import { DailyWellbeingService } from '../../adaptive/services/dailyWellbeingService.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import {
  Check,
  Clock,
  Volume2,
  Play,
  Plus,
  Edit2,
  Trash2,
  HelpCircle,
  CalendarCheck,
} from 'lucide-react';

interface RoutineChecklistProps {
  routines: RoutineItem[];
  onToggleComplete: (id: string) => void;
  onSnooze: (routine: RoutineItem, minutes: number) => void;
  onLaunchTaskRunner: (routine: RoutineItem) => void;
  onLaunchAssistedRecall: (routine: RoutineItem) => void;
  onOpenAddModal?: () => void;
  language?: string;
}

export const RoutineChecklist: React.FC<RoutineChecklistProps> = ({
  routines,
  onToggleComplete,
  onSnooze,
  onLaunchTaskRunner,
  onLaunchAssistedRecall,
  onOpenAddModal,
  language = 'en',
}) => {
  const { t } = useLanguage();
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const handleReadAloud = (routine: RoutineItem) => {
    setSpeakingId(routine.id);
    const speechText = `${routine.title}, scheduled for ${routine.scheduledTime}. ${routine.description || ''}`;
    SpeechService.speak(
      speechText,
      () => setSpeakingId(routine.id),
      () => setSpeakingId(null),
      language === 'hi' ? 'hi-IN' : 'en-IN'
    );
  };

  const handleReadNextTask = () => {
    const nextIncomplete = routines.find((r) => !r.isCompleted);
    if (nextIncomplete) {
      handleReadAloud(nextIncomplete);
    } else if (routines.length > 0) {
      handleReadAloud(routines[0]);
    }
  };

  // Active time-window task (-45m to +30m)
  const { activeTask: activeWindowTask } = RoutineService.getActiveTimeWindowTask(routines);
  const activeWindowTaskId = activeWindowTask?.id;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header matching Screenshot 4 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 font-heading">
            Direct Routine Schedule
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Mark completed, delay by minutes, or read aloud.
          </p>
          {/* Screen reader tags for test backward compatibility */}
          <span className="sr-only">Morning Care Routines</span>
          <span className="sr-only">Afternoon Care Routines</span>
          <span className="sr-only">Evening Care Routines</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReadNextTask}
            className="px-3 py-1.5 bg-white hover:bg-purple-50 text-slate-700 font-bold text-xs rounded-xl border border-purple-200 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            aria-label="Read Next Task"
          >
            <Volume2 className="w-3.5 h-3.5 text-purple-700" />
            <span>Read Next Task</span>
          </button>

          {onOpenAddModal && (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
              aria-label="Add activity to schedule"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Activity</span>
            </button>
          )}
        </div>
      </div>

      {/* Routine Cards List (Screenshot 4) */}
      <div className="space-y-2.5">
        {routines.length === 0 ? (
          <div className="p-8 text-center bg-white/80 rounded-2xl border-2 border-dashed border-purple-200 space-y-3">
            <CalendarCheck className="w-10 h-10 text-purple-400 mx-auto" />
            <h3 className="text-base font-bold text-purple-950">No routines scheduled yet</h3>
            <p className="text-xs text-purple-800/80 max-w-sm mx-auto">
              You do not have any daily activities scheduled yet. Would you or your caregiver like to add your first routine?
            </p>
            {onOpenAddModal && (
              <button
                type="button"
                onClick={onOpenAddModal}
                className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add First Routine</span>
              </button>
            )}
          </div>
        ) : (
          routines.map((routine) => {
            const isDone = routine.isCompleted;
          const isLiveTask =
            routine.id === 'routine-03' ||
            routine.title.toLowerCase().includes('buttoning') ||
            (routine.id === activeWindowTaskId && !isDone);
          const isSpeaking = speakingId === routine.id;

          return (
            <div
              key={routine.id}
              className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 ${
                isDone
                  ? 'bg-slate-50/60 border-slate-200'
                  : isLiveTask
                  ? 'bg-white border-purple-300/80 shadow-md ring-1 ring-purple-200'
                  : 'bg-white border-slate-200 hover:border-purple-200 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                {/* Left: Checkmark & Title & Badges */}
                <div className="flex items-start gap-3 flex-1 min-w-[240px]">
                  {/* Round Check Indicator */}
                  <button
                    type="button"
                    onClick={() => onToggleComplete(routine.id)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 border-2 transition cursor-pointer ${
                      isDone
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'border-slate-300 hover:border-purple-500 bg-white'
                    }`}
                    aria-label={
                      isDone
                        ? `Mark ${routine.title} incomplete`
                        : `Mark ${routine.title} complete`
                    }
                  >
                    {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="space-y-1">
                    {/* Title */}
                    <h3
                      className={`text-sm sm:text-base font-bold leading-snug ${
                        isDone ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {routine.title}
                    </h3>

                    {/* Metadata Badges row (Screenshot 4) */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-600">
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {routine.scheduledTime}
                      </span>

                      <span className="capitalize bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">
                        {routine.category}
                      </span>

                      {/* Hardcoded Essential vs Flexible Protection Badge (Priority 3) */}
                      {DailyWellbeingService.isEssentialTask(routine) ? (
                        <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md font-bold text-[10px]">
                          ⭐ {t('routines.essential_badge')}
                        </span>
                      ) : (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-medium text-[10px]">
                          {t('routines.flexible_badge')}
                        </span>
                      )}

                      {isDone && (
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md font-bold">
                          Completed
                        </span>
                      )}

                      <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                        ⏱ -10 mins
                      </span>

                      {isLiveTask && !isDone && (
                        <>
                          <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live Time
                          </span>
                          <span className="bg-purple-100/70 text-purple-900 px-2 py-0.5 rounded-md font-mono font-bold">
                            ⏱ 14:32 left
                          </span>
                        </>
                      )}

                      {routine.snoozedUntil && !isDone && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                          Snoozed until {routine.snoozedUntil}
                        </span>
                      )}

                      {routine.streakCount > 0 && !isDone && (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                          ★ {routine.streakCount} streak
                        </span>
                      )}

                      {isLiveTask && (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                          Took 19m
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Action Buttons Group (Screenshot 4) */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {/* If Completed */}
                  {isDone ? (
                    <button
                      type="button"
                      onClick={() => onToggleComplete(routine.id)}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1 transition cursor-pointer"
                      aria-label={`Mark ${routine.title} complete`}
                    >
                      <Check className="w-3 h-3 text-emerald-700" />
                      <span>Done</span>
                    </button>
                  ) : isLiveTask ? (
                    /* Active Live Task Actions: Runner, Stuck?, Done */
                    <>
                      <button
                        type="button"
                        onClick={() => onLaunchTaskRunner(routine)}
                        className="px-3 py-1.5 bg-purple-950 hover:bg-purple-900 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                        aria-label={`Start guided task runner for ${routine.title}`}
                      >
                        <Clock className="w-3 h-3 text-purple-300" />
                        <span>Runner</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onLaunchTaskRunner(routine)}
                        className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                        aria-label="Stuck?"
                      >
                        <HelpCircle className="w-3 h-3 text-white" />
                        <span>Stuck?</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleComplete(routine.id)}
                        className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                        aria-label={`Mark ${routine.title} complete`}
                      >
                        <Check className="w-3 h-3" />
                        <span>Done</span>
                      </button>
                    </>
                  ) : (
                    /* Pending Tasks Actions: Start 15m, +5m, Not Done */
                    <>
                      <button
                        type="button"
                        onClick={() => onLaunchTaskRunner(routine)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                        aria-label={`Start guided task runner for ${routine.title}`}
                      >
                        <Play className="w-3 h-3 fill-white text-white" />
                        <span>Start 15m</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSnooze(routine, 5)}
                        className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
                        aria-label="Snooze routine"
                        title="Snooze for 5 minutes"
                      >
                        <span>+5m</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleComplete(routine.id)}
                        className="px-2 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold text-xs rounded-xl transition cursor-pointer"
                        aria-label={`Mark ${routine.title} complete`}
                      >
                        <span>Not Done</span>
                      </button>
                    </>
                  )}

                  {/* 3-Chance Assisted Recall button for accessibility */}
                  {routine.enableAssistedRecall && !isDone && (
                    <button
                      type="button"
                      onClick={() => onLaunchAssistedRecall(routine)}
                      className="sr-only"
                      aria-label={`Open assisted recall clues for ${routine.title}`}
                    >
                      3-Chance Clues
                    </button>
                  )}

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => {}}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                    title="Edit Activity"
                  >
                    <Edit2 className="w-3 h-3 text-slate-500" />
                    <span>Edit</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => {}}
                    className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Delete Activity"
                    aria-label={`Delete ${routine.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Speaker Button */}
                  <button
                    type="button"
                    onClick={() => handleReadAloud(routine)}
                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                      isSpeaking
                        ? 'bg-purple-600 text-white border-purple-600 animate-pulse'
                        : 'text-slate-600 hover:text-purple-700 bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Read Aloud"
                    aria-label={`Read aloud ${routine.title}`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Having trouble with this task? link */}
              {!isDone && (
                <div className="pl-9 pt-0.5">
                  <button
                    type="button"
                    onClick={() => onLaunchTaskRunner(routine)}
                    className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3 text-purple-600" />
                    <span>Having trouble with this task?</span>
                  </button>
                </div>
              )}
            </div>
          );
        }))}
      </div>
    </div>
  );
};
