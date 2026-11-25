import React from 'react';
import { RecurringTask, DailyTaskInstance } from '../types/taskLifecycle.types.js';
import { Calendar, Pause } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getTranslatedRoutineTitle } from '../utils/routineTranslation.js';

interface WeeklyRoutineViewProps {
  recurringTasks: RecurringTask[];
  recentInstances?: DailyTaskInstance[];
  language?: string;
  onSelectTask?: (task: RecurringTask) => void;
}

export const WeeklyRoutineView: React.FC<WeeklyRoutineViewProps> = ({
  recurringTasks,
  onSelectTask,
}) => {
  const { t } = useLanguage();
  const activeTasks = recurringTasks.filter((t) => t.lifecycleStatus === 'active');
  const pausedTasks = recurringTasks.filter((t) => t.lifecycleStatus === 'paused');

  return (
    <div className="space-y-4 text-left" data-testid="weekly-routine-view">
      <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200">
        <h4 className="text-xs font-black text-purple-900 uppercase tracking-wide flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-purple-700" />
          {t('routines.weekly_title')}
        </h4>
        <p className="text-[11px] text-purple-800 mt-0.5 leading-relaxed">
          {t('routines.weekly_subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeTasks.map((task) => {
          return (
            <div
              key={task.id}
              onClick={() => onSelectTask?.(task)}
              className="bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-sm transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    {task.period} • {task.scheduledTime}
                  </span>
                  {task.isClinicianPrescribed && (
                    <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-300">
                      {t('routines.weekly_prescribed')}
                    </span>
                  )}
                </div>
                <h5 className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">
                  {getTranslatedRoutineTitle(task.title, t)}
                </h5>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                  {task.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-[11px] text-slate-600">
                <span>{task.durationMinutes} mins</span>
                <span className="text-purple-600 font-semibold hover:underline">
                  {t('routines.weekly_view_details')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {pausedTasks.length > 0 && (
        <div className="pt-2">
          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Pause className="w-3.5 h-3.5 text-amber-600" />
            {t('routines.weekly_paused_title', { count: pausedTasks.length })}
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pausedTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTask?.(task)}
                className="bg-amber-50/50 p-3 rounded-2xl border border-amber-200 hover:border-amber-300 transition cursor-pointer flex items-center justify-between"
              >
                <div>
                  <h6 className="text-xs font-bold text-amber-950">{getTranslatedRoutineTitle(task.title, t)}</h6>
                  <span className="text-[10px] text-amber-800">
                    Paused at your preference • Tap to resume
                  </span>
                </div>
                <span className="text-xs text-amber-700 font-bold">{t('routines.weekly_resume_arrow')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
