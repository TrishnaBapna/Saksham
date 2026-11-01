/**
 * Saksham 3.0 — Synthetic Telemetry Schema & Event Definitions
 * Strictly synthetic QA telemetry. Zero patient PII.
 */

export const TELEMETRY_EVENT_TYPES = {
  // Task & Routine Events
  TASK_INITIATED: 'task_initiated',
  TASK_STEP_ADVANCED: 'task_step_advanced',
  TASK_COMPLETED: 'task_completed',
  TASK_ABANDONED: 'task_abandoned',
  TASK_DIFFICULTY_RATED: 'task_difficulty_rated',

  // Assisted Recall & Cues
  ASSISTED_RECALL_ATTEMPT: 'assisted_recall_attempt',
  ASSISTED_RECALL_HINT_USED: 'assisted_recall_hint_used',
  ASSISTED_RECALL_COMPLETED: 'assisted_recall_completed',

  // User Interaction & Motor Friction
  CLICK_INTERACTIVE: 'click_interactive',
  CLICK_NON_INTERACTIVE: 'click_non_interactive', // Dead clicks / misclicks
  CLICK_RAPID_REPEAT: 'click_rapid_repeat',       // Rage clicks or tremor repeats
  TREMOR_DEBOUNCE_INTERVENTION: 'tremor_debounce_intervention',

  // Navigation & Flow
  NAVIGATION_TAB_SWITCH: 'navigation_tab_switch',
  NAVIGATION_BACKTRACK: 'navigation_backtrack',
  NAVIGATION_GATED_REDIRECT: 'navigation_gated_redirect',

  // Reminders & Notifications
  REMINDER_DISPATCHED: 'reminder_dispatched',
  REMINDER_VIEWED: 'reminder_viewed',
  REMINDER_SNOOZED: 'reminder_snoozed',
  REMINDER_COMPLETED: 'reminder_completed',
  REMINDER_DISMISSED: 'reminder_dismissed',
  REMINDER_QUIET_HOURS_SUPPRESSED: 'reminder_quiet_hours_suppressed',

  // Cognitive Games
  GAME_SESSION_STARTED: 'game_session_started',
  GAME_MOVE_ATTEMPTED: 'game_move_attempted',
  GAME_SESSION_COMPLETED: 'game_session_completed',
  GAME_SESSION_ABANDONED: 'game_session_abandoned',

  // Accessibility & System
  A11Y_TARGET_UNDERSIZED: 'a11y_target_undersized',
  A11Y_CONTRAST_DEFICIT: 'a11y_contrast_deficit',
  A11Y_REDUCED_MOTION_ENGAGED: 'a11y_reduced_motion_engaged',

  // Role Gate & Security
  ROLE_GATE_PIN_ENTERED: 'role_gate_pin_entered',
  ROLE_GATE_PIN_FAILED: 'role_gate_pin_failed'
};

export const TELEMETRY_CATEGORIES = {
  TASK: 'task',
  RECALL: 'recall',
  MOTOR: 'motor',
  NAVIGATION: 'navigation',
  REMINDER: 'reminder',
  COGNITIVE: 'cognitive',
  ACCESSIBILITY: 'accessibility',
  SECURITY: 'security'
};

export const PERSONA_TIERS = {
  SENIOR: 'senior',
  ADULT: 'adult',
  CAREGIVER: 'caregiver',
  CLINICIAN: 'clinician'
};

/**
 * Validates whether an event object satisfies the required synthetic schema.
 * @param {object} event 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTelemetryEvent(event) {
  const errors = [];
  if (!event.id || typeof event.id !== 'string') errors.push('Missing or invalid event id');
  if (!event.type || !Object.values(TELEMETRY_EVENT_TYPES).includes(event.type)) {
    errors.push(`Invalid event type: ${event.type}`);
  }
  if (!event.timestamp || typeof event.timestamp !== 'string') errors.push('Missing or invalid timestamp');
  if (!event.personaId || typeof event.personaId !== 'string') errors.push('Missing personaId');
  if (!event.personaTier || !Object.values(PERSONA_TIERS).includes(event.personaTier)) {
    errors.push(`Invalid personaTier: ${event.personaTier}`);
  }
  if (typeof event.durationMs !== 'undefined' && typeof event.durationMs !== 'number') {
    errors.push('durationMs must be a number');
  }
  return { valid: errors.length === 0, errors };
}
