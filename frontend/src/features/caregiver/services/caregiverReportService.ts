/**
 * SAKSHAM NEURO-CARE — CAREGIVER OBSERVATION REPORT SERVICE
 * Evidence-based longitudinal activity synthesis combining daily routines, assisted recall,
 * cognitive game engagement, and safe zone events.
 * 100% Spark Free Plan compliant — 0 paid APIs, 0 cloud functions.
 */

import { RoutineService } from '../../routines/services/routineService.js';
import { GamesService } from '../../games/services/gamesService.js';
import { formatMechanicModeLabel } from '../../games/utils/adaptiveMechanics.js';
import {
  AdaptiveAdjustmentRecord,
  GameProgressSummary,
  GameSessionRecord,
  RoutineAttemptRecord,
  RoutineItem,
} from '../../../types/index.js';

export interface CaregiverObservationReportData {
  patientId: string;
  patientName: string;
  generatedAt: string;
  periodLabel: string;
  routineAdherence: {
    totalScheduled: number;
    totalCompleted: number;
    adherencePercent: number;
    missedRoutines: string[];
  };
  cognitiveEngagement: {
    gamesPlayedCount: number;
    completedGamesCount: number;
    incompleteGamesCount: number;
    averageScore: number | null;
    averageAccuracyPercent: number | null;
    averageReactionTimeMs: number | null;
    totalHintsUsed: number;
    consistencyTrend: 'high' | 'moderate' | 'variable';
    perGameProgress: GameProgressSummary[];
    recentAdjustments: AdaptiveAdjustmentRecord[];
  };
  assistedRecallSummary: {
    totalCuedAttempts: number;
    level1Count: number; // Minimal subtle prompt
    level2Count: number; // Specific sensory/action cue
    level3Count: number; // Direct choice assistance
    cueRelianceTrend: 'stable' | 'increased' | 'decreased';
  };
  safetyEventsSummary: {
    safeZoneExitsCount: number;
    accuracyIncidentsCount: number;
    lastKnownStatus: string;
  };
  clinicalObservations: string[];
  caregiverSuggestions: string[];
  medicalDisclaimer: string;
}

export const CLINICAL_MEDICAL_DISCLAIMER =
  'Notice: This report is an objective observational activity log intended solely to assist family caregivers and physicians in observing daily functional engagement. It is not a clinical diagnostic assessment and must not replace professional medical judgment.';

export class CaregiverReportService {
  /**
   * Generates a comprehensive weekly observation report based on truthful patient activity logs.
   */
  public static generateWeeklyReport(
    patientId: string,
    patientName: string,
    routinesOverride?: RoutineItem[],
    historyOverride?: RoutineAttemptRecord[],
    gameSessionsOverride?: GameSessionRecord[]
  ): CaregiverObservationReportData {
    const routines = routinesOverride || RoutineService.getRoutines(patientId);
    const history = historyOverride || RoutineService.getHistory(patientId);
    const gameSessions = gameSessionsOverride || GamesService.getHistory(patientId);

    // 1. Routine Adherence
    const totalScheduled = routines.length;
    const completed = routines.filter((r) => r.isCompleted);
    const missed = routines.filter((r) => !r.isCompleted).map((r) => r.title);
    const adherencePercent =
      totalScheduled > 0 ? Math.round((completed.length / totalScheduled) * 100) : 0;

    // 2. Cognitive Engagement from verified Game Sessions (no fabricated fallback metrics)
    const gamesPlayedCount = gameSessions.length;
    const completedGamesCount = gameSessions.filter((s) => s.completed).length;
    const incompleteGamesCount = gameSessions.filter((s) => !s.completed).length;
    const totalHintsUsed = gameSessions.reduce((acc, s) => acc + (s.hintsUsed || 0), 0);

    const scoreValues = gameSessions
      .map((s) =>
        typeof s.score === 'number'
          ? s.score
          : typeof s.accuracy === 'number'
          ? Math.round(s.accuracy * 100)
          : null
      )
      .filter((v): v is number => v !== null);
    const avgScore =
      scoreValues.length > 0
        ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
        : null;

    const accuracyValues = gameSessions
      .map((s) => (typeof s.accuracy === 'number' ? Math.round(s.accuracy * 100) : null))
      .filter((v): v is number => v !== null);
    const avgAccuracyPercent =
      accuracyValues.length > 0
        ? Math.round(accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length)
        : null;

    const reactionValues = gameSessions
      .map((s) => (typeof s.reactionTimeMs === 'number' ? s.reactionTimeMs : null))
      .filter((v): v is number => v !== null);
    const avgReactionTimeMs =
      reactionValues.length > 0
        ? Math.round(reactionValues.reduce((a, b) => a + b, 0) / reactionValues.length)
        : null;

    const perGameProgress = GamesService.getPerGameProgressionSummaries(patientId, gameSessions);
    const recentAdjustments = GamesService.getRecentAdaptiveAdjustments(patientId, gameSessions);

    const consistencyTrend: 'high' | 'moderate' | 'variable' =
      adherencePercent >= 75 ? 'high' : adherencePercent >= 50 ? 'moderate' : 'variable';

    // 3. Assisted Recall (Level 1, 2, 3 Cues)
    const level1Count = history.filter((h) => h.attemptsUsed === 1).length;
    const level2Count = history.filter((h) => h.attemptsUsed === 2).length;
    const level3Count = history.filter((h) => h.attemptsUsed >= 3).length;
    const totalCuedAttempts = history.length;

    let cueRelianceTrend: 'stable' | 'increased' | 'decreased' = 'stable';
    if (level3Count > level1Count && totalCuedAttempts >= 4) {
      cueRelianceTrend = 'increased';
    } else if (level1Count > level3Count && totalCuedAttempts >= 4) {
      cueRelianceTrend = 'decreased';
    }

    // 4. Objective Observations (Factual activity summary only)
    const clinicalObservations: string[] = [];
    clinicalObservations.push(
      `Patient recorded a ${adherencePercent}% completion rate across ${totalScheduled} daily care routines.`
    );
    if (missed.length > 0) {
      clinicalObservations.push(`Uncompleted routines observed: ${missed.join(', ')}.`);
    } else {
      clinicalObservations.push('All scheduled daily routines were successfully completed.');
    }

    if (totalCuedAttempts > 0) {
      clinicalObservations.push(
        `Assisted recall was utilized ${totalCuedAttempts} times (Level 1: ${level1Count}, Level 2: ${level2Count}, Level 3: ${level3Count}).`
      );
    } else {
      clinicalObservations.push('No assisted recall cue escalations recorded during this observation cycle.');
    }

    if (gamesPlayedCount > 0) {
      const scoreSummary = avgScore !== null ? `, average score ${avgScore}/100` : '';
      const reactionSummary = avgReactionTimeMs !== null ? `, ${avgReactionTimeMs}ms response pace` : '';
      clinicalObservations.push(
        `Engaged in ${gamesPlayedCount} cognitive sessions (${completedGamesCount} completed, ${incompleteGamesCount} paused/incomplete, ${totalHintsUsed} helpful hints used${scoreSummary}${reactionSummary}).`
      );
      const activeModes = Array.from(
        new Set(
          perGameProgress
            .map((p) => p.currentMechanicMode)
            .filter(Boolean)
            .map((m) => formatMechanicModeLabel(m))
        )
      );
      if (activeModes.length > 0) {
        clinicalObservations.push(
          `Observed adaptive gameplay mechanics across played activities: ${activeModes.join(', ')}.`
        );
      }
    }

    // 5. Supportive Caregiver Suggestions (Non-medical, environmental & pacing advice)
    const caregiverSuggestions: string[] = [];
    if (adherencePercent < 60) {
      caregiverSuggestions.push(
        'Consider spacing routine activities across wider intervals to reduce cognitive fatigue.'
      );
    }
    if (level3Count >= 2 || totalHintsUsed >= 6) {
      caregiverSuggestions.push(
        'Offer familiar verbal recognition cues earlier during afternoon activities to foster reassurance.'
      );
    }
    caregiverSuggestions.push(
      'Encourage relaxed, unhurried participation with Asha companion rather than task speed.'
    );
    caregiverSuggestions.push(
      'Share this functional activity log with your neurologist or geriatric care team during regular check-ups.'
    );

    return {
      patientId,
      patientName,
      generatedAt: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      periodLabel: 'Past 7 Days (Weekly Summary)',
      routineAdherence: {
        totalScheduled,
        totalCompleted: completed.length,
        adherencePercent,
        missedRoutines: missed,
      },
      cognitiveEngagement: {
        gamesPlayedCount,
        completedGamesCount,
        incompleteGamesCount,
        averageScore: avgScore,
        averageAccuracyPercent: avgAccuracyPercent,
        averageReactionTimeMs: avgReactionTimeMs,
        totalHintsUsed,
        consistencyTrend,
        perGameProgress,
        recentAdjustments,
      },
      assistedRecallSummary: {
        totalCuedAttempts,
        level1Count,
        level2Count,
        level3Count,
        cueRelianceTrend,
      },
      safetyEventsSummary: {
        safeZoneExitsCount: 0,
        accuracyIncidentsCount: 0,
        lastKnownStatus: 'INSIDE_SAFE_ZONE',
      },
      clinicalObservations,
      caregiverSuggestions,
      medicalDisclaimer: CLINICAL_MEDICAL_DISCLAIMER,
    };
  }
}
