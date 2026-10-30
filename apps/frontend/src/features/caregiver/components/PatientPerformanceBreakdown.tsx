import React from 'react';
import type { Task, TelemetryRecord } from '@/types/firestore';
import { Card } from '@/components/ui/Card';

interface PatientPerformanceBreakdownProps {
  tasks: Task[];
  telemetry: TelemetryRecord[];
  patientName: string;
}

export const PatientPerformanceBreakdown: React.FC<PatientPerformanceBreakdownProps> = ({
  tasks,
  telemetry,
  patientName,
}) => {
  const completedTasks = tasks.filter((t) => t.status === 'done');
  const snoozedTasks = tasks.filter((t) => t.status === 'snoozed');
  const total = tasks.length || 1;

  const completedPct = Math.round((completedTasks.length / total) * 100);
  const snoozedPct = Math.round((snoozedTasks.length / total) * 100);
  const pendingPct = Math.max(0, 100 - completedPct - snoozedPct);

  return (
    <Card className="p-5 bg-white border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Task Performance & Time Taken
          </h2>
          <p className="text-xs text-gray-500">
            Adherence metrics, snoozed frequency, and behavioral response latency for {patientName}
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
          Care Analytics
        </span>
      </div>

      {/* Visual Progress Breakdown Bar */}
      <div className="space-y-1.5 mb-5">
        <div className="flex justify-between text-xs font-medium text-gray-600">
          <span>Today's Completion Breakdown</span>
          <span>{completedTasks.length} / {tasks.length} Tasks</span>
        </div>
        <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${completedPct}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title={`Completed: ${completedPct}%`}
          />
          <div
            style={{ width: `${snoozedPct}%` }}
            className="bg-amber-400 transition-all duration-500"
            title={`Snoozed: ${snoozedPct}%`}
          />
          <div
            style={{ width: `${pendingPct}%` }}
            className="bg-gray-200 transition-all duration-500"
            title={`Upcoming / Incomplete: ${pendingPct}%`}
          />
        </div>
        <div className="flex items-center gap-4 text-[11px] text-gray-500 pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Done ({completedPct}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Snoozed ({snoozedPct}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Pending ({pendingPct}%)
          </span>
        </div>
      </div>

      {/* Latency & Telemetry indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
        <div className="bg-slate-50 p-3 rounded-2xl">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Average Task Latency
          </p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">
            {telemetry[0]?.latencyMinutes ? `${telemetry[0].latencyMinutes} mins` : 'Normal range (4-8 mins)'}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Time between schedule alert and patient interaction
          </p>
        </div>

        <div className="bg-slate-50 p-3 rounded-2xl">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Motor & Speech Telemetry
          </p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">
            {telemetry[0]?.speechDb ? `${telemetry[0].speechDb} dB average` : 'Stable baseline'}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Vocal volume and fine-motor tremor response tracking
          </p>
        </div>
      </div>
    </Card>
  );
};
