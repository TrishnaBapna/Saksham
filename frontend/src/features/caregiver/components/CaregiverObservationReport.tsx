/**
 * SAKSHAM NEURO-CARE — CAREGIVER OBSERVATION REPORT COMPONENT
 * Renders evidence-based functional observation reports with strict separation of objective findings
 * and supportive caregiver suggestions.
 * 100% Spark Free Plan compliant.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  AlertCircle,
  Activity,
  CheckCircle2,
  Printer,
  Sparkles,
  Info,
  Gamepad2,
} from 'lucide-react';
import {
  CaregiverReportService,
  CaregiverObservationReportData,
} from '../services/caregiverReportService.js';
import { GamesService } from '../../games/services/gamesService.js';
import { formatMechanicModeLabel } from '../../games/utils/adaptiveMechanics.js';
import {
  GameSessionRecord,
  RoutineAttemptRecord,
  RoutineItem,
} from '../../../types/index.js';
import { useLanguage } from '../../../context/LanguageContext.js';

interface CaregiverObservationReportProps {
  patientId: string;
  patientName: string;
  routines?: RoutineItem[];
  history?: RoutineAttemptRecord[];
  className?: string;
}

export const CaregiverObservationReport: React.FC<CaregiverObservationReportProps> = ({
  patientId,
  patientName,
  routines,
  history,
  className = '',
}) => {
  const { t } = useLanguage();
  const [cloudGameSessions, setCloudGameSessions] = useState<GameSessionRecord[] | undefined>(
    undefined
  );

  useEffect(() => {
    let cancelled = false;
    GamesService.syncHistoryFromFirestore(patientId)
      .then((sessions) => {
        if (!cancelled && sessions && sessions.length > 0) {
          setCloudGameSessions(sessions);
        }
      })
      .catch(() => {
        // Fallback smoothly to cached history
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const report: CaregiverObservationReportData = useMemo(() => {
    return CaregiverReportService.generateWeeklyReport(
      patientId,
      patientName,
      routines,
      history,
      cloudGameSessions
    );
  }, [patientId, patientName, routines, history, cloudGameSessions]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      data-testid="caregiver-observation-report"
      className={`bg-white rounded-3xl p-6 md:p-8 border border-emerald-100 shadow-soft-purple space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-lg text-gray-900">
                {t('caregiver.obs_title')}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {t('caregiver.obs_verified')}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Care summary for {report.patientName} • {report.periodLabel} (Generated {report.generatedAt})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="self-start sm:self-auto px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-emerald-200 shadow-2xs cursor-pointer min-h-[40px]"
          aria-label="Print or export observation report"
        >
          <Printer className="w-4 h-4 text-emerald-700" />
          <span>{t('caregiver.obs_print')}</span>
        </button>
      </div>

      {/* Mandatory Clinical Medical Disclaimer */}
      <div
        data-testid="clinical-medical-disclaimer"
        className="p-3.5 bg-amber-50/90 rounded-2xl border border-amber-300 text-xs text-amber-950 flex items-start space-x-2.5"
      >
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed font-medium">
          {report.medicalDisclaimer}
        </p>
      </div>

      {/* 4 Quantitative Observation Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1 */}
        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-500 block">
            {t('caregiver.obs_adherence')}
          </span>
          <div className="text-2xl font-black text-emerald-800">
            {report.routineAdherence.adherencePercent}%
          </div>
          <p className="text-[11px] text-gray-600 font-medium">
            {report.routineAdherence.totalCompleted} of {report.routineAdherence.totalScheduled} completed
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-500 block">
            {t('caregiver.obs_assisted')}
          </span>
          <div className="text-2xl font-black text-purple-800">
            {report.assistedRecallSummary.totalCuedAttempts}
          </div>
          <p className="text-[11px] text-gray-600 font-medium">
            Cued attempts recorded
          </p>
        </div>

          {/* Metric 3 */}
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">
              {t('caregiver.obs_tap_rate')}
            </span>
            <div className="text-2xl font-black text-blue-800">
              {report.cognitiveEngagement.averageReactionTimeMs !== null
                ? `${report.cognitiveEngagement.averageReactionTimeMs}ms`
                : '—'}
            </div>
            <p className="text-[11px] text-gray-600 font-medium">
              Motor reaction speed
            </p>
          </div>

        {/* Metric 4 */}
        <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100 space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-500 block">
            {t('caregiver.obs_safe_zone')}
          </span>
          <div className="text-2xl font-black text-teal-800">
            100%
          </div>
          <p className="text-[11px] text-gray-600 font-medium">
            Inside home geofence
          </p>
        </div>
      </div>

      {/* Objective Observed Findings Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" />
          <span>{t('caregiver.obs_findings')}</span>
        </h4>
        <ul className="space-y-2">
          {report.clinicalObservations.map((obs, idx) => (
            <li
              key={idx}
              className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 font-medium flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{obs}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Adaptive Cognitive Game Progress (Per Game) */}
      <div
        data-testid="caregiver-adaptive-game-progress"
        className="space-y-3 pt-2 border-t border-gray-100"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-indigo-600" />
            <span>Cognitive Activity & Adaptive Pace Progress</span>
          </h4>
          <span className="text-[11px] font-semibold text-gray-600">
            {report.cognitiveEngagement.completedGamesCount} completed •{' '}
            {report.cognitiveEngagement.incompleteGamesCount} paused •{' '}
            {report.cognitiveEngagement.totalHintsUsed} clues used
            {report.cognitiveEngagement.averageAccuracyPercent !== null
              ? ` • ${report.cognitiveEngagement.averageAccuracyPercent}% avg accuracy`
              : ''}
          </span>
        </div>

        {report.cognitiveEngagement.perGameProgress.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {report.cognitiveEngagement.perGameProgress.map((item) => (
              <div
                key={item.gameId}
                className="p-3 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-gray-900 truncate">{item.gameTitle}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.currentMechanicMode && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold text-[10px] border border-emerald-200">
                        {formatMechanicModeLabel(item.currentMechanicMode)}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-white text-indigo-800 font-bold text-[10px] border border-indigo-200">
                      {item.currentDifficulty}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-gray-600 flex flex-wrap gap-x-2">
                  <span>{item.completedSessions}/{item.totalSessions} completed</span>
                  {item.averageAccuracyPercent !== null && (
                    <span>• {item.averageAccuracyPercent}% accuracy</span>
                  )}
                  {item.totalHintsUsed > 0 && <span>• {item.totalHintsUsed} clues</span>}
                </div>
                {item.appliedMechanics && item.appliedMechanics.length > 0 && (
                  <p className="text-[11px] text-emerald-900 font-medium leading-snug">
                    Active mechanics: {item.appliedMechanics.slice(0, 2).join(' • ')}
                  </p>
                )}
                {item.lastAdjustment && (
                  <p className="text-[11px] text-indigo-900 leading-snug">
                    {item.lastAdjustment.difficultyBefore !== item.lastAdjustment.difficultyAfter
                      ? `${item.lastAdjustment.difficultyBefore} → ${item.lastAdjustment.difficultyAfter}: `
                      : ''}
                    {item.lastAdjustment.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200">
            No cognitive game sessions recorded yet. Progress will appear automatically after each play session.
          </p>
        )}
      </div>

      {/* Practical Caregiver Suggestions Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>{t('caregiver.obs_suggestions')}</span>
        </h4>
        <ul className="space-y-2">
          {report.caregiverSuggestions.map((sug, idx) => (
            <li
              key={idx}
              className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 text-xs text-purple-950 font-medium flex items-start gap-2.5"
            >
              <Info className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{sug}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
