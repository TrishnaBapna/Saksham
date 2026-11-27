import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  CalendarCheck2,
  Gamepad2,
  RefreshCw,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  DoctorAnalyticsService,
  RoutineAdherenceAnalytics,
  AssistedRecallCueAnalytics,
  GameDifficultyAnalytics,
} from '../services/doctorAnalyticsService.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getClinicianUi } from '../../portals/utils/clinicianTranslation.js';
import { formatMechanicModeLabel } from '../../games/utils/adaptiveMechanics.js';

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
  const { language } = useLanguage();
  const ui = getClinicianUi(language);
  const [adherenceData, setAdherenceData] = useState<RoutineAdherenceAnalytics | null>(null);
  const [cueData, setCueData] = useState<AssistedRecallCueAnalytics | null>(null);
  const [gameData, setGameData] = useState<GameDifficultyAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Request generation token to cancel/invalidate stale or late async responses
  const requestGenRef = useRef<number>(0);
  const isAuthorizedRef = useRef<boolean>(true);

  const loadAnalytics = useCallback(async () => {
    const currentGen = ++requestGenRef.current;
    setIsRefreshing(true);
    try {
      const [adh, cues, games] = await Promise.all([
        DoctorAnalyticsService.get30DayRoutineAdherence(patientId, doctorId),
        DoctorAnalyticsService.get30DayAssistedRecallCueDistribution(patientId, doctorId),
        DoctorAnalyticsService.get30DayGameDifficultyActivity(patientId, doctorId),
      ]);

      // If superseded by a newer request or if authorization was revoked while in-flight, discard results!
      if (currentGen !== requestGenRef.current || !isAuthorizedRef.current) {
        return;
      }

      setAdherenceData(adh);
      setCueData(cues);
      setGameData(games);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn('[DoctorLongitudinalAnalytics] Failed to load analytics:', err);
    } finally {
      if (currentGen === requestGenRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [doctorId, patientId]);

  // Priority 3: Observe doctor assignment live. If revoked or pending, immediately clear analytics!
  useEffect(() => {
    let isSubscribed = true;

    const unsubscribe = DoctorAnalyticsService.subscribeToDoctorAssignment(
      doctorId,
      patientId,
      (info) => {
        if (!isSubscribed) return;

        if (!info.isAssigned) {
          // Immediately invalidate in-flight requests and clear displayed analytics
          isAuthorizedRef.current = false;
          requestGenRef.current += 1;
          setAdherenceData({
            isAuthorized: false,
            status: 'unauthorized',
            startDate: '',
            endDate: '',
            totalRecordedTasks: 0,
            completedTasks: 0,
            attemptCompletionRate: 0,
            adherencePercentage: 0,
            recordedDaysCount: 0,
            dailyTrend: [],
            message: 'Clinical assignment is inactive, pending, or revoked.',
          });
          setCueData(null);
          setGameData(null);
          setIsLoading(false);
          setIsRefreshing(false);
        } else {
          isAuthorizedRef.current = true;
          loadAnalytics();
        }
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [doctorId, patientId, loadAnalytics]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-blue-100 shadow-soft-purple text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-gray-700">{ui.analyticsLoading}</p>
        <p className="text-xs text-gray-400">{ui.analyticsLoadingSub}</p>
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
            <h3 className="font-bold text-base">{ui.clinicalAccessRestricted}</h3>
            <p className="text-xs text-amber-700">
              {ui.clinicalRestrictedBodyPrefix} {patientName}{ui.clinicalRestrictedBodySuffix}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const completionRate = adherenceData?.attemptCompletionRate ?? adherenceData?.adherencePercentage ?? 0;

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
            <span>{ui.longitudinalBadge}</span>
          </div>
          <h2 className="text-xl font-bold text-saksham-darkText">
            {ui.analyticsTitle}
          </h2>
          <p className="text-xs text-gray-500">
            {ui.measuredRecordsFor} {patientName} • {ui.observationWindow}{' '}
            <span className="font-semibold text-gray-700">
              {adherenceData?.startDate} {ui.toWord} {adherenceData?.endDate}
            </span>
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-center">
          {lastUpdated && (
            <span className="text-2xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              {ui.updatedPrefix} {lastUpdated}
            </span>
          )}
          <button
            type="button"
            onClick={loadAnalytics}
            aria-label={ui.refreshAnalyticsAria}
            className="p-2 rounded-xl border border-gray-200 hover:bg-blue-50 hover:text-blue-700 text-gray-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: 30-Day Routine Attempt Completion Rate */}
        <div
          data-testid="doctor-routine-adherence-card"
          className="bg-white rounded-3xl p-6 border border-blue-100 shadow-soft-purple space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarCheck2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-base text-saksham-darkText">
                {ui.routineAdherenceTitle}
              </h3>
            </div>
            <span className="text-2xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {ui.recordedAttemptData}
            </span>
          </div>

          {/* Metric Summary */}
          {adherenceData?.status === 'no-records' ? (
            <div className="py-8 text-center bg-gray-50 rounded-2xl border border-gray-200">
              <p className="text-sm font-semibold text-gray-600">{ui.noRoutineRecords}</p>
              <p className="text-xs text-gray-400 mt-1">
                {ui.noRoutineRecordsSub}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-saksham-darkText">
                    {completionRate}%
                  </span>
                  <span className="text-xs text-gray-500 ml-2 font-medium">{ui.completionRateLabel}</span>
                </div>
                <span className="text-xs font-semibold text-gray-600">
                  {adherenceData?.completedTasks} / {adherenceData?.totalRecordedTasks} {ui.tasksAttemptedSuffix}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>

              {/* Recorded Days Subtitle */}
              <div className="text-xs text-gray-500 flex items-center justify-between pt-1">
                <span>{ui.activeObservation}</span>
                <span className="font-bold text-gray-700">
                  {adherenceData?.recordedDaysCount} {ui.daysLoggedOf30Suffix}
                </span>
              </div>

              {/* 30-Day Heatmap / Timeline Grid */}
              <div className="pt-2">
                <span className="text-2xs font-bold uppercase text-gray-400 block mb-2">
                  {ui.dailyCompletionLast30}
                </span>
                <div className="grid grid-cols-10 gap-1.5">
                  {adherenceData?.dailyTrend.map((day) => {
                    let bg = 'bg-gray-100 border-gray-200';
                    let tooltip = `${day.dayLabel}: No activity logged`;

                    if (day.status === 'completed') {
                      bg = 'bg-emerald-500 border-emerald-600';
                      tooltip = `${day.dayLabel}: All attempted tasks completed (${day.completedCount}/${day.totalCount})`;
                    } else if (day.status === 'partial') {
                      bg = 'bg-amber-400 border-amber-500';
                      tooltip = `${day.dayLabel}: Some attempted tasks completed (${day.completedCount}/${day.totalCount})`;
                    } else if (day.status === 'incomplete') {
                      bg = 'bg-red-400 border-red-500';
                      tooltip = `${day.dayLabel}: Attempted but incomplete (${day.completedCount}/${day.totalCount})`;
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
                    <span>{ui.legendCompleted}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block" />
                    <span>{ui.legendPartial}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-red-400 inline-block" />
                    <span>{ui.legendIncomplete}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-gray-200 inline-block" />
                    <span>{ui.legendNoData}</span>
                  </span>
                </div>
              </div>

              {adherenceData?.status === 'insufficient-history' && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <span>{ui.limitedObservationNotice}</span>
                </div>
              )}
            </div>
          )}

          {/* Honest Reporting Disclaimer */}
          <p className="text-3xs text-gray-400 leading-normal border-t border-gray-100 pt-3">
            {ui.adherenceDisclaimer}
          </p>
        </div>

        {/* Card 2: Assisted Recall Cue Usage Distribution */}
        <div
          data-testid="doctor-assisted-recall-card"
          className="bg-white rounded-3xl p-6 border border-purple-100 shadow-soft-purple space-y-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-saksham-darkText">
                {ui.cueUsageTitle}
              </h3>
              <span className="text-2xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                {ui.cognitivePromptingBadge}
              </span>
            </div>

            {cueData?.status === 'no-records' ? (
              <div className="py-8 text-center bg-gray-50 rounded-2xl border border-gray-200 mt-4">
                <p className="text-sm font-semibold text-gray-600">{ui.noCueAttempts}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {ui.noCueAttemptsSub}
                </p>
              </div>
            ) : (
              <div className="space-y-4 pt-3">
                <div className="text-xs text-gray-500 flex justify-between">
                  <span>{ui.totalPromptsEvaluated}</span>
                  <span className="font-bold text-gray-800">{cueData?.totalAttempts || 0} {ui.promptsWord}</span>
                </div>

                {/* Stacked Cue Bars */}
                <div className="space-y-3">
                  {cueData?.distribution.map((cue) => {
                    let barColor = 'bg-blue-600';
                    let badgeBg = 'bg-blue-50 text-blue-700';
                    if (cue.level === 2) {
                      barColor = 'bg-amber-500';
                      badgeBg = 'bg-amber-50 text-amber-700';
                    } else if (cue.level === 3) {
                      barColor = 'bg-purple-600';
                      badgeBg = 'bg-purple-50 text-purple-700';
                    }

                    return (
                      <div key={cue.level} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-saksham-darkText flex items-center space-x-1.5">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-2xs ${badgeBg}`}>
                              {cue.label}
                            </span>
                          </span>
                          <span className="font-bold text-gray-700">
                            {cue.percentage}% ({cue.count})
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`${barColor} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${cue.percentage}%` }}
                          />
                        </div>
                        <p className="text-3xs text-gray-500 leading-tight">
                          {cue.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <p className="text-3xs text-gray-400 leading-normal border-t border-gray-100 pt-3 mt-4">
            {ui.cueNotice}
          </p>
        </div>

        {/* Card 3: Adaptive Cognitive Game Difficulty Activity */}
        <div
          data-testid="doctor-adaptive-game-activity-card"
          className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-soft-purple space-y-4 lg:col-span-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Gamepad2 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-base text-saksham-darkText">
                {ui.gameActivityTitle}
              </h3>
            </div>
            <span className="text-2xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {ui.interactivePacingBadge}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Pacing Metric */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
              <span className="text-2xs text-gray-400 uppercase font-bold block">{ui.currentPacingLabel}</span>
              <span className="text-lg font-bold text-saksham-darkText capitalize">
                {gameData?.pacing || ui.gentleShort} {ui.pacingWord}
              </span>
              <p className="text-3xs text-gray-500">
                {ui.currentDiffLabel}{' '}
                <strong className="text-gray-700">{gameData?.currentDifficulty || ui.gentleShort}</strong>
              </p>
            </div>

            {/* Sessions Breakdown */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
              <span className="text-2xs text-gray-400 uppercase font-bold block">{ui.days30SessionsLabel}</span>
              <span className="text-lg font-bold text-saksham-darkText">
                {gameData?.totalSessions || 0} {ui.sessionsWord}
              </span>
              <div className="flex items-center space-x-2 text-3xs text-gray-600 pt-1">
                <span>{ui.gentleShort}: <strong>{gameData?.difficultyCounts.gentle || 0}</strong></span>
                <span>•</span>
                <span>{ui.modShort}: <strong>{gameData?.difficultyCounts.moderate || 0}</strong></span>
                <span>•</span>
                <span>{ui.stimShort}: <strong>{gameData?.difficultyCounts.stimulating || 0}</strong></span>
              </div>
              <p className="text-3xs text-gray-500 pt-0.5">
                {gameData?.completedSessions || 0} completed • {gameData?.incompleteSessions || 0} paused • {gameData?.totalHintsUsed || 0} clues
                {gameData?.averageAccuracyPercent !== null && gameData?.averageAccuracyPercent !== undefined
                  ? ` • ${gameData.averageAccuracyPercent}% avg accuracy`
                  : ''}
              </p>
            </div>

            {/* Stability Summary */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
              <span className="text-2xs text-gray-400 uppercase font-bold block">{ui.stabilityProfileLabel}</span>
              <p className="text-xs font-semibold text-gray-700 line-clamp-2">
                {gameData?.stabilitySummary || ui.noRecentSessionHist}
              </p>
              <p className="text-3xs text-gray-400">
                {ui.rationalePrefix} {gameData?.adaptationRationale || ui.comfortFirstDefault}
              </p>
            </div>
          </div>

          {/* Per-Game Adaptive Progression Breakdown */}
          {gameData && gameData.perGameProgress.length > 0 && (
            <div
              data-testid="doctor-per-game-progression"
              className="space-y-2.5 pt-2 border-t border-gray-100"
            >
              <span className="text-2xs uppercase font-bold text-gray-500 block">
                Per-Activity Pacing & Adaptive Adjustments
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {gameData.perGameProgress.map((item) => (
                  <div
                    key={item.gameId}
                    className="p-3 rounded-2xl bg-indigo-50/40 border border-indigo-100 text-xs space-y-1"
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
                          {item.currentDifficulty} (Tier {item.currentTier})
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      {item.completedSessions}/{item.totalSessions} completed
                      {item.averageAccuracyPercent !== null ? ` • ${item.averageAccuracyPercent}% accuracy` : ''}
                      {item.totalHintsUsed > 0 ? ` • ${item.totalHintsUsed} clues` : ''}
                    </p>
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
            </div>
          )}

          {/* Mandatory Clinical Non-Inference Notice */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start space-x-2.5 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">{ui.nonInferenceLabel} </span>
              {gameData?.clinicalNonInferenceNotice}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
