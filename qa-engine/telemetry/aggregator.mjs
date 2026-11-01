/**
 * Saksham 3.0 — Synthetic Telemetry Aggregator
 * Computes statistical distributions, completion rates, motor interventions,
 * and interaction patterns from synthetic event streams.
 */

import { TELEMETRY_EVENT_TYPES, TELEMETRY_CATEGORIES, PERSONA_TIERS } from './schema.mjs';

export class TelemetryAggregator {
  constructor(events = []) {
    this.events = events;
  }

  /**
   * Main aggregation pipeline
   */
  aggregate() {
    return {
      metadata: {
        totalEvents: this.events.length,
        timeSpanStart: this.events[0]?.timestamp || null,
        timeSpanEnd: this.events[this.events.length - 1]?.timestamp || null,
        personasIncluded: [...new Set(this.events.map(e => e.personaId))]
      },
      taskCompletionStats: this._aggregateTaskCompletionTimes(),
      difficultyStats: this._aggregateDifficultyFeedback(),
      motorAndFrictionStats: this._aggregateMotorAndFriction(),
      navigationStats: this._aggregateNavigationPatterns(),
      reminderStats: this._aggregateReminderPatterns(),
      accessibilityStats: this._aggregateAccessibilityViolations(),
      securityGateStats: this._aggregateSecurityGateFriction(),
      personaProfiles: this._aggregatePersonaSummaries()
    };
  }

  _aggregateTaskCompletionTimes() {
    const taskGroups = {};

    for (const evt of this.events) {
      if (evt.type === TELEMETRY_EVENT_TYPES.TASK_COMPLETED && typeof evt.durationMs === 'number') {
        const key = `${evt.personaTier}::${evt.taskId || 'generic'}`;
        if (!taskGroups[key]) {
          taskGroups[key] = {
            taskId: evt.taskId,
            taskTitle: evt.taskTitle,
            personaTier: evt.personaTier,
            durations: []
          };
        }
        taskGroups[key].durations.push(evt.durationMs / 1000); // seconds
      }
    }

    const results = {};
    for (const [key, group] of Object.entries(taskGroups)) {
      const sorted = [...group.durations].sort((a, b) => a - b);
      const count = sorted.length;
      const sum = sorted.reduce((acc, v) => acc + v, 0);
      const avg = count ? Math.round(sum / count) : 0;
      const p50 = count ? sorted[Math.floor(count * 0.5)] : 0;
      const p90 = count ? sorted[Math.floor(count * 0.9)] : 0;
      const min = count ? sorted[0] : 0;
      const max = count ? sorted[count - 1] : 0;

      results[key] = {
        taskId: group.taskId,
        taskTitle: group.taskTitle,
        personaTier: group.personaTier,
        count,
        avgSeconds: avg,
        p50Seconds: p50,
        p90Seconds: p90,
        minSeconds: min,
        maxSeconds: max
      };
    }
    return results;
  }

  _aggregateDifficultyFeedback() {
    const feedbackByTask = {};

    for (const evt of this.events) {
      if (evt.type === TELEMETRY_EVENT_TYPES.TASK_DIFFICULTY_RATED) {
        const taskId = evt.taskId || 'unknown';
        if (!feedbackByTask[taskId]) {
          feedbackByTask[taskId] = {
            taskId,
            ratings: [],
            difficultyCounts: { easy: 0, medium: 0, hard: 0 },
            reasons: []
          };
        }
        const meta = evt.metadata || {};
        if (meta.rating) feedbackByTask[taskId].ratings.push(meta.rating);
        if (meta.difficulty && feedbackByTask[taskId].difficultyCounts[meta.difficulty] !== undefined) {
          feedbackByTask[taskId].difficultyCounts[meta.difficulty]++;
        }
        if (meta.reason) feedbackByTask[taskId].reasons.push(meta.reason);
      }
    }

    const summaries = {};
    for (const [taskId, data] of Object.entries(feedbackByTask)) {
      const totalRatings = data.ratings.length;
      const avgRating = totalRatings ? +(data.ratings.reduce((a, b) => a + b, 0) / totalRatings).toFixed(1) : 0;
      const hardPercentage = totalRatings ? Math.round((data.difficultyCounts.hard / totalRatings) * 100) : 0;

      summaries[taskId] = {
        taskId,
        totalFeedbackReports: totalRatings,
        avgRatingOutOf5: avgRating,
        difficultyCounts: data.difficultyCounts,
        hardPercentage,
        sampleReasons: data.reasons.slice(0, 3)
      };
    }
    return summaries;
  }

  _aggregateMotorAndFriction() {
    let tremorInterventions = 0;
    let rapidClicks = 0;
    let nonInteractiveClicks = 0;
    const targetsAffected = {};

    for (const evt of this.events) {
      if (evt.type === TELEMETRY_EVENT_TYPES.TREMOR_DEBOUNCE_INTERVENTION) {
        tremorInterventions++;
        const target = evt.metadata?.targetSelector || 'unknown';
        targetsAffected[target] = (targetsAffected[target] || 0) + 1;
      } else if (evt.type === TELEMETRY_EVENT_TYPES.CLICK_RAPID_REPEAT) {
        rapidClicks++;
      } else if (evt.type === TELEMETRY_EVENT_TYPES.CLICK_NON_INTERACTIVE) {
        nonInteractiveClicks++;
      }
    }

    return {
      totalTremorDebounces: tremorInterventions,
      totalRapidRepeatClicks: rapidClicks,
      totalNonInteractiveClicks: nonInteractiveClicks,
      debounceTargetsMap: targetsAffected
    };
  }

  _aggregateNavigationPatterns() {
    let totalTabSwitches = 0;
    let gatedRedirects = 0;
    const gatedDetails = [];

    for (const evt of this.events) {
      if (evt.type === TELEMETRY_EVENT_TYPES.NAVIGATION_TAB_SWITCH) {
        totalTabSwitches++;
      } else if (evt.type === TELEMETRY_EVENT_TYPES.NAVIGATION_GATED_REDIRECT) {
        gatedRedirects++;
        gatedDetails.push(evt.metadata);
      }
    }

    return {
      totalTabSwitches,
      totalGatedRedirects: gatedRedirects,
      gatedRedirectsWithoutToast: gatedDetails.filter(d => !d.toastShown).length,
      sampleGatedTransitions: gatedDetails.slice(0, 3)
    };
  }

  _aggregateReminderPatterns() {
    let dispatched = 0;
    let completed = 0;
    let snoozed = 0;
    let dismissed = 0;
    let quietHoursSuppressed = 0;
    const snoozeDurations = [];

    for (const evt of this.events) {
      switch (evt.type) {
        case TELEMETRY_EVENT_TYPES.REMINDER_DISPATCHED: dispatched++; break;
        case TELEMETRY_EVENT_TYPES.REMINDER_COMPLETED: completed++; break;
        case TELEMETRY_EVENT_TYPES.REMINDER_SNOOZED:
          snoozed++;
          if (evt.metadata?.durationMinutes) snoozeDurations.push(evt.metadata.durationMinutes);
          break;
        case TELEMETRY_EVENT_TYPES.REMINDER_DISMISSED: dismissed++; break;
        case TELEMETRY_EVENT_TYPES.REMINDER_QUIET_HOURS_SUPPRESSED: quietHoursSuppressed++; break;
      }
    }

    return {
      totalDispatched: dispatched,
      totalCompleted: completed,
      totalSnoozed: snoozed,
      totalDismissed: dismissed,
      totalQuietHoursSuppressed: quietHoursSuppressed,
      completionRate: dispatched ? Math.round((completed / dispatched) * 100) : 0,
      snoozeRate: dispatched ? Math.round((snoozed / dispatched) * 100) : 0,
      commonSnoozeDurationMinutes: snoozeDurations.length ? Math.round(snoozeDurations.reduce((a, b) => a + b, 0) / snoozeDurations.length) : 5
    };
  }

  _aggregateAccessibilityViolations() {
    const undersizedTargets = [];
    const contrastViolations = [];

    for (const evt of this.events) {
      if (evt.type === TELEMETRY_EVENT_TYPES.A11Y_TARGET_UNDERSIZED) {
        undersizedTargets.push(evt.metadata);
      } else if (evt.type === TELEMETRY_EVENT_TYPES.A11Y_CONTRAST_DEFICIT) {
        contrastViolations.push(evt.metadata);
      }
    }

    return {
      undersizedTargetsCount: undersizedTargets.length,
      contrastViolationsCount: contrastViolations.length,
      sampleUndersizedTargets: undersizedTargets.slice(0, 3),
      sampleContrastViolations: contrastViolations.slice(0, 3)
    };
  }

  _aggregateSecurityGateFriction() {
    let totalPinEntries = 0;
    let repeatedPromptsWithinSession = 0;

    for (const evt of this.events) {
      if (evt.type === TELEMETRY_EVENT_TYPES.ROLE_GATE_PIN_ENTERED) {
        totalPinEntries++;
        if (evt.metadata?.rePromptWithinSession) {
          repeatedPromptsWithinSession++;
        }
      }
    }

    return {
      totalPinEntries,
      repeatedPromptsWithinSession,
      rePromptRatio: totalPinEntries ? Math.round((repeatedPromptsWithinSession / totalPinEntries) * 100) : 0
    };
  }

  _aggregatePersonaSummaries() {
    const personas = {};

    for (const evt of this.events) {
      const pId = evt.personaId;
      if (!personas[pId]) {
        personas[pId] = {
          personaId: pId,
          personaTier: evt.personaTier,
          eventsCount: 0,
          tasksCompleted: 0,
          frictionInteractions: 0
        };
      }
      personas[pId].eventsCount++;
      if (evt.type === TELEMETRY_EVENT_TYPES.TASK_COMPLETED) {
        personas[pId].tasksCompleted++;
      }
      if (
        evt.type === TELEMETRY_EVENT_TYPES.NAVIGATION_GATED_REDIRECT ||
        evt.type === TELEMETRY_EVENT_TYPES.A11Y_TARGET_UNDERSIZED ||
        (evt.type === TELEMETRY_EVENT_TYPES.ROLE_GATE_PIN_ENTERED && evt.metadata?.rePromptWithinSession)
      ) {
        personas[pId].frictionInteractions++;
      }
    }
    return personas;
  }
}
