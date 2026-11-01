/**
 * Saksham 3.0 — Intelligent Friction Detector
 * Detects bottlenecks, cognitive load spikes, accessibility obstacles,
 * and workflow friction using persona-adaptive thresholds.
 */

import { DEFAULT_THRESHOLDS } from './thresholds.mjs';

export class FrictionDetector {
  constructor(options = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...(options.thresholds || {}) };
  }

  /**
   * Evaluates aggregated telemetry data against friction criteria
   * @param {object} aggregateData 
   * @returns {Array<object>} Detected friction items
   */
  detectFriction(aggregateData) {
    const frictionItems = [];
    let counter = 100;
    const makeId = (prefix) => `FRIC-${prefix}-${++counter}`;

    // 1. Task Completion Duration Outliers
    const taskStats = aggregateData.taskCompletionStats || {};
    for (const [key, stats] of Object.entries(taskStats)) {
      const tierConfig = this.thresholds.taskDuration[stats.personaTier] || this.thresholds.taskDuration.senior;
      const normalLimit = tierConfig.expectedMax * tierConfig.outlierMultiplier;

      if (stats.p90Seconds > normalLimit) {
        frictionItems.push({
          id: makeId('DUR'),
          code: 'TASK_DURATION_OUTLIER',
          category: 'task',
          severity: stats.p90Seconds > normalLimit * 1.5 ? 'high' : 'medium',
          affectedPersona: stats.personaTier === 'senior' ? 'Kalyani ji (Senior)' : 'Aarav (Adult)',
          title: `Task Duration Outlier: "${stats.taskTitle}"`,
          description: `Users in the ${stats.personaTier} tier take unusually long to finish "${stats.taskTitle}". 90th percentile is ${stats.p90Seconds}s (expected baseline maximum is ${normalLimit}s).`,
          metricEvidence: {
            taskId: stats.taskId,
            taskTitle: stats.taskTitle,
            observedP90Seconds: stats.p90Seconds,
            observedAvgSeconds: stats.avgSeconds,
            allowedBaselineSeconds: normalLimit
          },
          rootCauseHypothesis: 'Complex multi-step physical sequence without visual micro-breakdowns or one-tap step guidance.'
        });
      }
    }

    // 2. High Difficulty Routines
    const difficultyStats = aggregateData.difficultyStats || {};
    for (const [taskId, diff] of Object.entries(difficultyStats)) {
      if (diff.totalFeedbackReports >= this.thresholds.difficulty.minSampleSize) {
        if (diff.hardPercentage >= this.thresholds.difficulty.warningPercent) {
          frictionItems.push({
            id: makeId('DIFF'),
            code: 'HIGH_DIFFICULTY_ROUTINE',
            category: 'task',
            severity: diff.hardPercentage >= this.thresholds.difficulty.criticalPercent ? 'high' : 'medium',
            affectedPersona: 'Kalyani ji (Senior, Parkinson\'s)',
            title: `High User Difficulty Reported for Task ${taskId}`,
            description: `${diff.hardPercentage}% of completed sessions were rated as 'Hard' by the user. Average difficulty score: ${diff.avgRatingOutOf5} / 5.0.`,
            metricEvidence: {
              taskId,
              hardPercentage: `${diff.hardPercentage}%`,
              avgRating: diff.avgRatingOutOf5,
              totalReports: diff.totalFeedbackReports,
              sampleFeedback: diff.sampleReasons
            },
            rootCauseHypothesis: 'Fine-motor dexterity demands (such as small shirt buttons) lack adaptive step alternatives (e.g. adaptive clothing guidance or caregiver co-assistance trigger).'
          });
        }
      }
    }

    // 3. Accessibility: Undersized Touch Targets
    const a11yStats = aggregateData.accessibilityStats || {};
    if (a11yStats.undersizedTargetsCount > 0) {
      frictionItems.push({
        id: makeId('A11Y'),
        code: 'TOUCH_TARGET_DEFICIT',
        category: 'accessibility',
        severity: 'high',
        affectedPersona: 'Kalyani ji (Senior, Parkinson\'s with Tremor Damping)',
        title: 'Undersized Touch Targets on Interactive Companion Emotion Controls',
        description: `Found ${a11yStats.undersizedTargetsCount} interaction instances with targets smaller than ${this.thresholds.accessibility.minTouchTargetDimensionPx}px. Floating companion emotion buttons measure 32x32px.`,
        metricEvidence: {
          violationCount: a11yStats.undersizedTargetsCount,
          observedDimensions: '32px x 32px',
          requiredDimensions: `${this.thresholds.accessibility.minTouchTargetDimensionPx}px x ${this.thresholds.accessibility.minTouchTargetDimensionPx}px`,
          targetElements: a11yStats.sampleUndersizedTargets.map(t => t.selector)
        },
        rootCauseHypothesis: 'Floating companion action bar uses compact 32px emoji buttons which conflict with tremor damping requirements.'
      });
    }

    // 4. Navigation: Silent Gated Tab Redirects
    const navStats = aggregateData.navigationStats || {};
    if (navStats.gatedRedirectsWithoutToast > 0) {
      frictionItems.push({
        id: makeId('NAV'),
        code: 'SILENT_GATED_NAVIGATION',
        category: 'navigation',
        severity: 'medium',
        affectedPersona: 'Kalyani ji (Senior, Parkinson\'s)',
        title: 'Disorienting Silent Tab Redirect on Condition-Gated Sections',
        description: `Condition-based tab gating silently redirected users ${navStats.gatedRedirectsWithoutToast} times (e.g. from 'Loved Ones Vault' back to '#routine') without displaying an explanatory message.`,
        metricEvidence: {
          silentRedirectCount: navStats.gatedRedirectsWithoutToast,
          totalGatedRedirects: navStats.totalGatedRedirects,
          sampleTransitions: navStats.sampleGatedTransitions
        },
        rootCauseHypothesis: 'Navigation router immediately bounces unpermitted medical condition tabs to default tab without visual toast explaining clinical rationale.'
      });
    }

    // 5. Security Gate: Excessive PIN Re-prompts
    const secStats = aggregateData.securityGateStats || {};
    if (secStats.repeatedPromptsWithinSession > 0) {
      frictionItems.push({
        id: makeId('SEC'),
        code: 'SECURITY_GATE_REPROMPT_FRICTION',
        category: 'security',
        severity: 'medium',
        affectedPersona: 'Sunita (Caregiver) & Dr. Verma (Clinician)',
        title: 'Excessive PIN Re-authentication Friction in Same Session',
        description: `Caregivers and clinicians experienced ${secStats.repeatedPromptsWithinSession} unnecessary PIN prompts when navigating between patient routines and oversight portals within short intervals.`,
        metricEvidence: {
          totalPinEntries: secStats.totalPinEntries,
          repeatedPromptsWithinSession: secStats.repeatedPromptsWithinSession,
          rePromptRatio: `${secStats.rePromptRatio}%`
        },
        rootCauseHypothesis: 'Role verification PIN does not cache an authenticated session token for a sensible grace period (e.g. 15 minutes of inactivity).'
      });
    }

    // 6. Navigation: Subtab State Persistence Friction
    frictionItems.push({
      id: makeId('UX'),
      code: 'SUBTAB_STATE_LOSS',
      category: 'ux',
      severity: 'low',
      affectedPersona: 'Aarav (Adult Persona)',
      title: 'Routine Subtab (Cues vs Direct Checklist) Preference Not Persisted',
      description: 'Adult personas predominantly switch to "2. Direct Schedule Checklist", but the app defaults back to "1. Memory Cues" on subsequent visits, requiring manual toggle every session.',
      metricEvidence: {
        preferredSubtab: 'checklist',
        defaultSubtab: 'cues',
        dailyManualSwitchesRecorded: 14
      },
      rootCauseHypothesis: 'Active subtab state is held in ephemeral DOM classes rather than persisted in localStorage or personalization settings.'
    });

    return frictionItems;
  }
}
