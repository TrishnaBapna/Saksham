import React from 'react';
import type { Task } from '@/types/firestore';
import { Card } from '@/components/ui/Card';

interface PatientRoutineMonitorProps {
  tasks: Task[];
  loading: boolean;
  patientName: string;
}

export const PatientRoutineMonitor: React.FC<PatientRoutineMonitorProps> = ({
  tasks,
  loading,
  patientName,
}) => {
  if (loading) {
    return (
      <Card className="p-5">
        <div className="h-6 w-48 bg-gray-100 animate-pulse rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-50 animate-pulse rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  const completed = tasks.filter((t) => t.status === 'done').length;
  const snoozed = tasks.filter((t) => t.status === 'snoozed').length;
  const pending = tasks.length - completed - snoozed;
  const percentage = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  return (
    <Card className="p-5 bg-white border border-gray-100 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            {patientName}'s Daily Routine
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time status of scheduled neurological routine & care tasks
          </p>
        </div>

        {/* Progress pill */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200/80 px-3 py-1.5 rounded-2xl self-start sm:self-auto">
          <span className="text-xs font-bold text-gray-700">Adherence: {percentage}%</span>
          <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metric badges */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-2.5 text-center">
          <p className="text-lg font-bold text-emerald-800">{completed}</p>
          <p className="text-[11px] font-semibold text-emerald-600">Completed</p>
        </div>
        <div className="bg-amber-50/80 border border-amber-100 rounded-2xl p-2.5 text-center">
          <p className="text-lg font-bold text-amber-800">{snoozed}</p>
          <p className="text-[11px] font-semibold text-amber-600">Snoozed</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-center">
          <p className="text-lg font-bold text-slate-800">{pending}</p>
          <p className="text-[11px] font-semibold text-slate-500">Upcoming</p>
        </div>
      </div>

      {/* Tasks table / list */}
      <div className="space-y-2">
        {tasks.map((task) => {
          const isDone = task.status === 'done';
          const isSnoozed = task.status === 'snoozed';
          return (
            <div
              key={task.id}
              className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-colors ${
                isDone
                  ? 'bg-emerald-50/50 border-emerald-100 text-gray-700'
                  : isSnoozed
                  ? 'bg-amber-50/60 border-amber-100 text-amber-900'
                  : 'bg-white border-gray-100 text-gray-800'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg shrink-0" aria-hidden="true">{task.icon || '📌'}</span>
                <span className="font-semibold truncate">{task.label}</span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-gray-400 font-medium">{task.time}</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                    isDone
                      ? 'bg-emerald-100 text-emerald-800'
                      : isSnoozed
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {task.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
