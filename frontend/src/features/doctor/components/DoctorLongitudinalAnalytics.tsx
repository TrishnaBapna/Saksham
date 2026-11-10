import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  CalendarCheck2,
  Clock,
  Gamepad2,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  DoctorAnalyticsService,
  RoutineAdherenceAnalytics,
  AssistedRecallCueAnalytics,
  GameDifficultyAnalytics,
} from '../services/doctorAnalyticsService.js';

interface DoctorLongitudinalAnalyticsProps {
  doctorId: string;
  patientId: string;
  patientName: string;
}

export const DoctorLongitudinalAnalytics: React.FC<DoctorLongitudinalAnalyticsProps> = ({
  doctorId,
  patientId,
  patientName,
}) => {
  const [adherenceData, setAdherenceData] = useState<RoutineAdherenceAnalytics | null>(null);
  const [cueData, setCueData] = useState<AssistedRecallCueAnalytics | null>(null);
  const [gameData, setGameData] = useState<GameDifficultyAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [adh, cues, games] = await Promise.all([
        DoctorAnalyticsService.get30DayRoutineAdherence(patientId, doctorId),
        DoctorAnalyticsService.get30DayAssistedRecallCueDistribution(patientId, doctorId),
        DoctorAnalyticsService.get30DayGameDifficultyActivity(patientId, doctorId),
      ]);

      setAdherenceData(adh);
      setCueData(cues);
      setGameData(games);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn('[DoctorLongitudinalAnalytics] Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [doctorId, patientId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-blue-100 shadow-soft-purple text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-gray-700">Loading 30-Day Patient Analytics...</p>
        <p className="text-xs text-gray-400">Aggregating authentic routine and session records</p>
      </div>
    );
  }

  // Unauthorized State (Doctor not actively assigned to this patient)
  if (adherenceData && !adherenceData.isAuthorized) {
    return (
      <section
        data-testid="doctor-unauthorized-section"
        className="bg-white rounded-3xl p-6 border border-amber-200 shadow-soft-purple"
      >
        <div className="flex items-start space-x-3 text-amber-800">
          <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-base">Clinical Access Restricted</h3>
            <p className="text-xs text-amber-700">
              Active administrative assignment to {patientName}'s clinical profile is required to
              access longitudinal analytics. Your assignment status is currently pending or inactive.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="doctor-longitudinal-analytics-section"
      className="space-y-6"
    >
      {/* Section Header & 30-Day Window Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-3xl p-6 border border-blue-100 shadow-soft-purple">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-blue-800 text-xs font-bold uppercase tracking-wider">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>Longitudinal Behavioral Portal</span>
          </div>
          <h2 className="text-xl font-bold text-saksham-darkText">
            30-Day Activity & Adherence Analytics
          </h2>
          <p className="text-xs text-gray-500">
            Measured records for {patientName} • Observation window:{' '}
            <span className="font-semibold text-gray-700">
              {adherenceData?.startDate} to {adherenceData?.endDate}
            </span>
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-center">
          {lastUpdated && (
            <span className="text-2xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              Updated {lastUpdated}
            </span>
          )}
          <button
            type="button"
            onClick={loadAnalytics}
            aria-label="Refresh longitudinal analytics"
            className="p-2 rounded-xl border border-gray-200 hover:bg-blue-50 hover:text-blue-700 text-gray-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: 30-Day Routine Adherence */}
        <div
          data-testid="doctor-routine-adherence-card"
          className="bg-white rounded-3xl p-6 border border-blue-100 shadow-soft-purple space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarCheck2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-base text-saksham-darkText">
                30-Day Routine Adherence
              </h3>
            </div>
            <span className="text-2xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Recorded Data
            </span>
          </div>

          {/* Metric Summary */}
          {adherenceData?.status === 'no-records' ? (
            <div className="py-8 text-center bg-gray-50 rounded-2xl border border-gray-200">
              <p className="text-sm font-semibold text-gray-600">No routine records found</p>
              <p className="text-xs text-gray-400 mt-1">
                No routine activities were recorded in the past 30 days.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-saksham-darkText">
                    {adherenceData?.adherencePercentage}%
                  </span>
                  <span className="text-xs text-gray-500 ml-2 font-medium">adherence rate</span>
                </div>
                <span className="text-xs font-semibold text-gray-600">
                  {adherenceData?.completedTasks} / {adherenceData?.totalRecordedTasks} tasks
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${adherenceData?.adherencePercentage || 0}%` }}
                />
              </div>

              {/* Recorded Days Subtitle */}
              <div className="text-xs text-gray-500 flex items-center justify-between pt-1">
                <span>Active observation:</span>
                <span className="font-bold text-gray-700">
                  {adherenceData?.recordedDaysCount} of 30 calendar days logged
                </span>
              </div>

              {/* 30-Day Heatmap / Timeline Grid */}
              <div className="pt-2">
                <span className="text-2xs font-bold uppercase text-gray-400 block mb-2">
                  Daily Completion Status (Last 30 Days)
                </span>
                <div className="grid grid-cols-10 gap-1.5">
                  {adherenceData?.dailyTrend.map((day) => {
                    let bg = 'bg-gray-100 border-gray-200';
                    let tooltip = `${day.dayLabel}: No records logged`;

                    if (day.status === 'completed') {
                      bg = 'bg-emerald-500 border-emerald-600';
                      tooltip = `${day.dayLabel}: All tasks completed (${day.completedCount}/${day.totalCount})`;
                    } else if (day.status === 'partial') {
                      bg = 'bg-amber-400 border-amber-500';
                      tooltip = `${day.dayLabel}: Partially completed (${day.completedCount}/${day.totalCount})`;
                    } else if (day.status === 'incomplete') {
                      bg = 'bg-red-400 border-red-500';
                      tooltip = `${day.dayLabel}: Incomplete (${day.completedCount}/${day.totalCount})`;
                    }

                    return (
                      <div
                        key={day.date}
                        className={`h-5 rounded-md border text-center transition-transform hover:scale-110 cursor-pointer ${bg}`}
                        title={tooltip}
                      />
                    );
                  })}
                </div>
                {/* Heatmap Legend */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-3xs text-gray-500 mt-2">
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                    <span>Completed</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block" />
                    <span>Partial</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-gray-200 inline-block" />
                    <span>No data recorded</span>
                  </span>
                </div>
              </div>

              {adherenceData?.status === 'insufficient-history' && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <span>
                    Limited observation: Fewer than 3 days recorded. Additional active days required
                    for reliable longitudinal baseline.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Honest Reporting Disclaimer */}
          <p className="text-3xs text-gray-400 leading-normal border-t border-gray-100 pt-3">
            Note: Days without records reflect intervals when the app was not opened; they are not
            inferred as medication omissions or non-compliance.
          </p>
        </div>

        {/* Card 2: Assisted Recall Cue Usage Distribution */}
        <div
          data-testid="doctor-assisted-recall-card"
          className="bg-white rounded-3xl p-6 border border-purple-100 shadow-soft-purple space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-saksham-darkText">
                  Assisted Recall Cue Distribution
                </h3>
              </div>
              <span className="text-2xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Cognitive Guidance
              </span>
            </div>

            {cueData?.status === 'no-records' ? (
              <div className="py-8 text-center bg-gray-50 rounded-2xl border border-gray-200">
                <p className="text-sm font-semibold text-gray-600">No recall attempts recorded</p>
                <p className="text-xs text-gray-400 mt-1">
                  Zero assisted recall prompts were executed in the past 30 days.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-gray-600 font-semibold">
                  Total prompt attempts evaluated:{' '}
                  <span className="font-bold text-gray-900">{cueData?.totalAttempts}</span>
                </div>

                {/* Cue Level Breakdown */}
                <div className="space-y-2.5">
                  {cueData?.distribution.map((cue) => {
                    let barColor = 'bg-blue-500';
                    if (cue.level === 2) barColor = 'bg-purple-500';
                    if (cue.level === 3) barColor = 'bg-amber-500';

                    return (
                      <div key={cue.level} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-800">{cue.label}</span>
                          <span className="font-bold text-gray-900">
                            {cue.count} ({cue.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`${barColor} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${cue.percentage}%` }}
                          />
                        </div>
                        <p className="text-3xs text-gray-500">{cue.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Non-assessment Disclaimer */}
          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl text-2xs text-purple-900 leading-relaxed">
            <span className="font-bold">Clinical Transparency: </span>
            {cueData?.disclaimer}
          </div>
        </div>
      </div>

      {/* Card 3: Adaptive Game Difficulty Activity & Stability */}
      <div
        data-testid="doctor-adaptive-game-activity-card"
        className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-soft-purple space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Gamepad2 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base text-saksham-darkText">
              Adaptive Game Engagement & Pacing Activity
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xs bg-indigo-50 text-indigo-800 font-bold px-3 py-1 rounded-full border border-indigo-200">
              Active Difficulty: {gameData?.currentDifficulty} ({gameData?.pacing} pacing)
            </span>
          </div>
        </div>

        {gameData?.status === 'no-records' ? (
          <div className="py-6 text-center bg-gray-50 rounded-2xl border border-gray-200">
            <p className="text-sm font-semibold text-gray-600">No game sessions recorded</p>
            <p className="text-xs text-gray-400 mt-1">
              Patient has not engaged in mind games during this 30-day window.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
              <span className="text-2xs font-bold text-indigo-700 uppercase tracking-wider block">
                Total Sessions (30D)
              </span>
              <span className="text-2xl font-black text-indigo-950 mt-1 block">
                {gameData?.totalSessions}
              </span>
              <span className="text-2xs text-gray-500 mt-0.5 block">
                Recreational memory games
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-2xs font-bold text-gray-600 uppercase tracking-wider block">
                Difficulty Breakdown
              </span>
              <div className="text-xs text-gray-800 mt-1 space-y-0.5">
                <div>Gentle: <strong className="text-indigo-900">{gameData?.difficultyCounts.gentle}</strong></div>
                <div>Moderate: <strong className="text-indigo-900">{gameData?.difficultyCounts.moderate}</strong></div>
                <div>Stimulating: <strong className="text-indigo-900">{gameData?.difficultyCounts.stimulating}</strong></div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-2xs font-bold text-gray-600 uppercase tracking-wider block">
                Observed Pacing Trend
              </span>
              <p className="text-xs text-gray-700 mt-1 leading-relaxed font-medium">
                {gameData?.stabilitySummary}
              </p>
            </div>
          </div>
        )}

        {/* Clinical Non-Inference Disclaimer Notice */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start space-x-2.5 text-2xs text-amber-900 leading-relaxed">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold">Non-Inference Safeguard: </span>
            {gameData?.clinicalNonInferenceNotice}
          </div>
        </div>
      </div>
    </section>
  );
};
