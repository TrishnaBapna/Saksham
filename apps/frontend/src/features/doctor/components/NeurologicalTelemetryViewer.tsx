import React from 'react';
import type { TelemetryRecord } from '@/types/firestore';
import { Card } from '@/components/ui/Card';

interface NeurologicalTelemetryViewerProps {
  telemetry: TelemetryRecord[];
  patientName: string;
}

export const NeurologicalTelemetryViewer: React.FC<NeurologicalTelemetryViewerProps> = ({
  telemetry,
  patientName,
}) => {
  const latest = telemetry[0];

  return (
    <Card className="p-5 bg-white border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Neurological Biomarkers & Telemetry
          </h2>
          <p className="text-xs text-gray-500">
            Longitudinal sensor metrics, acoustic speech amplitude, and resting tremor monitoring for {patientName}
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
          Biomarker Telemetry
        </span>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-gradient-to-br from-purple-50/70 to-white border border-purple-100 p-3.5 rounded-2xl">
          <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">
            Tremor Amplitude
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-purple-950">
              {latest?.tremorAmplitudeCm ?? 0.8}
            </span>
            <span className="text-xs text-purple-600 font-medium">cm (resting)</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Baseline threshold: &lt; 1.0 cm (Stable)
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50/70 to-white border border-blue-100 p-3.5 rounded-2xl">
          <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
            Speech Acoustic Volume
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-blue-950">
              {latest?.speechDb ?? 64}
            </span>
            <span className="text-xs text-blue-600 font-medium">dB SPL</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Target threshold: &gt; 65 dB (Moderate hypophonia)
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50/70 to-white border border-emerald-100 p-3.5 rounded-2xl">
          <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            Interaction Latency
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-950">
              {latest?.latencyMinutes ?? 6.2}
            </span>
            <span className="text-xs text-emerald-600 font-medium">min delay</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Response to scheduled audio cues
          </p>
        </div>
      </div>

      {/* Observation Table */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100">
            <tr>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Routine Status</th>
              <th className="px-3 py-2.5">Tasks Done</th>
              <th className="px-3 py-2.5">Speech dB</th>
              <th className="px-3 py-2.5">Tremor Ampl</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {telemetry.map((t, idx) => (
              <tr key={t.id || `tel-${idx}`} className="hover:bg-gray-50/50">
                <td className="px-3 py-2.5 font-medium">{t.recordDate}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                      t.status === 'all_done'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {t.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-semibold">
                  {t.tasksCompleted} / {t.tasksTotal}
                </td>
                <td className="px-3 py-2.5">{t.speechDb ?? 64} dB</td>
                <td className="px-3 py-2.5">{t.tremorAmplitudeCm ?? 0.8} cm</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
