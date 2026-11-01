/**
 * Saksham 3.0 — Multi-Persona Synthetic Telemetry Event Generator
 * Generates rich, realistic synthetic telemetry datasets for QA analysis.
 * Strictly synthetic data. No real patient data.
 */

import { TELEMETRY_EVENT_TYPES, TELEMETRY_CATEGORIES, PERSONA_TIERS } from './schema.mjs';

export class SyntheticTelemetryGenerator {
  constructor(options = {}) {
    this.seed = options.seed || 42;
    this.startDate = options.startDate ? new Date(options.startDate) : new Date(Date.now() - 14 * 86400000);
    this.daysCount = options.daysCount || 14;
  }

  /**
   * Deterministic pseudo-random number generator
   */
  _random() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  _randomInt(min, max) {
    return Math.floor(this._random() * (max - min + 1)) + min;
  }

  _randomItem(array) {
    return array[this._randomInt(0, array.length - 1)];
  }

  /**
   * Generates a comprehensive synthetic telemetry dataset across all personas.
   */
  generateDataset() {
    const events = [];
    let eventCounter = 1000;

    const makeId = () => `SYN-EVT-${++eventCounter}`;

    for (let day = 0; day < this.daysCount; day++) {
      const currentDate = new Date(this.startDate.getTime() + day * 86400000);
      const dateStr = currentDate.toISOString().split('T')[0];

      // -----------------------------------------------------------------------
      // 1. Kalyani ji (Senior Persona, 68y, Parkinson's, Tremor Damping)
      // -----------------------------------------------------------------------
      const kalyaniBaseTime = new Date(`${dateStr}T08:30:00Z`);

      // 1a. Morning Levodopa Routine
      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.REMINDER_DISPATCHED,
        category: TELEMETRY_CATEGORIES.REMINDER,
        timestamp: new Date(kalyaniBaseTime.getTime()).toISOString(),
        personaId: 'synthetic_senior_kalyani_001',
        personaTier: PERSONA_TIERS.SENIOR,
        journey: 'daily_routine',
        taskId: 'syn-task-1',
        taskTitle: 'Morning Levodopa Medication',
        metadata: { soundEnabled: true, priority: 'critical', scheduledTime: '08:30 AM' }
      });

      // Kalyani opens app 4 minutes later
      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.TASK_INITIATED,
        category: TELEMETRY_CATEGORIES.TASK,
        timestamp: new Date(kalyaniBaseTime.getTime() + 240000).toISOString(),
        personaId: 'synthetic_senior_kalyani_001',
        personaTier: PERSONA_TIERS.SENIOR,
        journey: 'daily_routine',
        taskId: 'syn-task-1',
        taskTitle: 'Morning Levodopa Medication',
        durationMs: 0
      });

      // 3-Chance Assisted Recall: Chance 1 incorrect, Chance 2 used hint, Chance 3 completed
      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.ASSISTED_RECALL_ATTEMPT,
        category: TELEMETRY_CATEGORIES.RECALL,
        timestamp: new Date(kalyaniBaseTime.getTime() + 265000).toISOString(),
        personaId: 'synthetic_senior_kalyani_001',
        personaTier: PERSONA_TIERS.SENIOR,
        journey: 'daily_routine',
        taskId: 'syn-task-1',
        metadata: { chanceNumber: 1, correct: false, selectedOption: 'Water only' }
      });

      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.ASSISTED_RECALL_HINT_USED,
        category: TELEMETRY_CATEGORIES.RECALL,
        timestamp: new Date(kalyaniBaseTime.getTime() + 285000).toISOString(),
        personaId: 'synthetic_senior_kalyani_001',
        personaTier: PERSONA_TIERS.SENIOR,
        journey: 'daily_routine',
        taskId: 'syn-task-1',
        metadata: { hintText: 'Check the yellow pill organiser compartment marked AM' }
      });

      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.ASSISTED_RECALL_COMPLETED,
        category: TELEMETRY_CATEGORIES.RECALL,
        timestamp: new Date(kalyaniBaseTime.getTime() + 310000).toISOString(),
        personaId: 'synthetic_senior_kalyani_001',
        personaTier: PERSONA_TIERS.SENIOR,
        journey: 'daily_routine',
        taskId: 'syn-task-1',
        metadata: { chanceNumber: 2, correct: true, totalAssistanceLevel: 'hint_guided' }
      });

      // Tremor Damping: 2 rapid clicks intercepted
      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.TREMOR_DEBOUNCE_INTERVENTION,
        category: TELEMETRY_CATEGORIES.MOTOR,
        timestamp: new Date(kalyaniBaseTime.getTime() + 311200).toISOString(),
        personaId: 'synthetic_senior_kalyani_001',
        personaTier: PERSONA_TIERS.SENIOR,
        journey: 'daily_routine',
        metadata: { intervalMs: 140, targetSelector: 'button#btnMarkDone' }
      });

      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.TASK_COMPLETED,
        category: TELEMETRY_CATEGORIES.TASK,
        timestamp: new Date(kalyaniBaseTime.getTime() + 315000).toISOString(),
        personaId: 'synthetic_senior_kalyani_001',
        personaTier: PERSONA_TIERS.SENIOR,
        journey: 'daily_routine',
        taskId: 'syn-task-1',
        taskTitle: 'Morning Levodopa Medication',
        durationMs: 75000 // 75 seconds from initiation
      });

      // 1b. Buttoning Shirt & Dressing (Fine Motor Routine)
      const dressingTime = new Date(`${dateStr}T09:05:00Z`);
      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.TASK_INITIATED,
        category: TELEMETRY_CATEGORIES.TASK,
        timestamp: dressingTime.toISOString(),
        personaId: 'synthetic_senior_kalyani_001',
        personaTier: PERSONA_TIERS.SENIOR,
        journey: 'daily_routine',
        taskId: 'syn-task-2',
        taskTitle: 'Buttoning Shirt & Morning Dressing'
      });

      // Long duration & multiple steps
      const dressingDuration = this._randomInt(280000, 390000); // 4.5 to 6.5 minutes!
      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.TASK_COMPLETED,
        category: TELEMETRY_CATEGORIES.TASK,
        timestamp: new Date(dressingTime.getTime() + dressingDuration).toISOString(),
        personaId: 'synthetic_senior_kalyani_001',
        personaTier: PERSONA_TIERS.SENIOR,
        journey: 'daily_routine',
        taskId: 'syn-task-2',
        taskTitle: 'Buttoning Shirt & Morning Dressing',
        durationMs: dressingDuration
      });

      // High difficulty feedback rated by Kalyani
      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.TASK_DIFFICULTY_RATED,
        category: TELEMETRY_CATEGORIES.TASK,
        timestamp: new Date(dressingTime.getTime() + dressingDuration + 5000).toISOString(),
        personaId: 'synthetic_senior_kalyani_001',
        personaTier: PERSONA_TIERS.SENIOR,
        journey: 'daily_routine',
        taskId: 'syn-task-2',
        metadata: { rating: 4, difficulty: 'hard', reason: 'Fingers stiff with small top button' }
      });

      // 1c. Navigation Friction: Gated tab click (Parkinson condition clicking Loved Ones Vault)
      if (day % 2 === 0) {
        events.push({
          id: makeId(),
          type: TELEMETRY_EVENT_TYPES.NAVIGATION_TAB_SWITCH,
          category: TELEMETRY_CATEGORIES.NAVIGATION,
          timestamp: new Date(dressingTime.getTime() + dressingDuration + 20000).toISOString(),
          personaId: 'synthetic_senior_kalyani_001',
          personaTier: PERSONA_TIERS.SENIOR,
          journey: 'navigation',
          metadata: { targetHash: '#view-vault', tabLabel: '3. Loved Ones & Peace' }
        });
        events.push({
          id: makeId(),
          type: TELEMETRY_EVENT_TYPES.NAVIGATION_GATED_REDIRECT,
          category: TELEMETRY_CATEGORIES.NAVIGATION,
          timestamp: new Date(dressingTime.getTime() + dressingDuration + 20050).toISOString(),
          personaId: 'synthetic_senior_kalyani_001',
          personaTier: PERSONA_TIERS.SENIOR,
          journey: 'navigation',
          metadata: {
            requestedHash: '#view-vault',
            redirectedHash: '#routine',
            condition: 'parkinsons',
            toastShown: false // Silent redirect without informative reason
          }
        });
      }

      // 1d. Floating Companion Emotion Touch Target Friction
      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.A11Y_TARGET_UNDERSIZED,
        category: TELEMETRY_CATEGORIES.ACCESSIBILITY,
        timestamp: new Date(dressingTime.getTime() + dressingDuration + 40000).toISOString(),
        personaId: 'synthetic_senior_kalyani_001',
        personaTier: PERSONA_TIERS.SENIOR,
        journey: 'companion',
        metadata: {
          selector: '.companion-emotion-btn',
          targetWidth: 32,
          targetHeight: 32,
          minimumRecommended: 44,
          violation: 'Touch target smaller than 44px for tremor-damping profile'
        }
      });

      // -----------------------------------------------------------------------
      // 2. Aarav (Adult Persona, 34y, Routine Checklist Pacing)
      // -----------------------------------------------------------------------
      const aaravBaseTime = new Date(`${dateStr}T08:00:00Z`);

      // Aarav prefers Direct Schedule Checklist over Memory Cues
      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.NAVIGATION_TAB_SWITCH,
        category: TELEMETRY_CATEGORIES.NAVIGATION,
        timestamp: new Date(aaravBaseTime.getTime() + 10000).toISOString(),
        personaId: 'synthetic_adult_aarav_002',
        personaTier: PERSONA_TIERS.ADULT,
        journey: 'daily_routine',
        metadata: { subtab: 'checklist', label: '2. Direct Schedule Checklist' }
      });

      // Aarav completes routines quickly (30s)
      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.TASK_COMPLETED,
        category: TELEMETRY_CATEGORIES.TASK,
        timestamp: new Date(aaravBaseTime.getTime() + 45000).toISOString(),
        personaId: 'synthetic_adult_aarav_002',
        personaTier: PERSONA_TIERS.ADULT,
        journey: 'daily_routine',
        taskId: 'syn-task-aarav-1',
        taskTitle: 'Deep Breathing & Focus',
        durationMs: 35000
      });

      // Subtab State Reset Friction: Tomorrow, Aarav has to click subtab 2 AGAIN because preference is not saved
      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.CLICK_INTERACTIVE,
        category: TELEMETRY_CATEGORIES.NAVIGATION,
        timestamp: new Date(aaravBaseTime.getTime() + 50000).toISOString(),
        personaId: 'synthetic_adult_aarav_002',
        personaTier: PERSONA_TIERS.ADULT,
        journey: 'daily_routine',
        metadata: { action: 'toggle_subtab_checklist', recurrentRepetitions: day + 1 }
      });

      // Aarav Snooze pattern: Snoozes hydration by 10m
      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.REMINDER_SNOOZED,
        category: TELEMETRY_CATEGORIES.REMINDER,
        timestamp: new Date(`${dateStr}T09:30:00Z`).toISOString(),
        personaId: 'synthetic_adult_aarav_002',
        personaTier: PERSONA_TIERS.ADULT,
        journey: 'daily_routine',
        taskId: 'syn-task-aarav-2',
        metadata: { durationMinutes: 10, source: 'notification_action' }
      });

      // -----------------------------------------------------------------------
      // 3. Sunita (Caregiver Persona, Daughter)
      // -----------------------------------------------------------------------
      const caregiverTime = new Date(`${dateStr}T12:30:00Z`);

      // Sunita enters PIN to view Caregiver Portal
      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.ROLE_GATE_PIN_ENTERED,
        category: TELEMETRY_CATEGORIES.SECURITY,
        timestamp: caregiverTime.toISOString(),
        personaId: 'synthetic_caregiver_sunita_003',
        personaTier: PERSONA_TIERS.CAREGIVER,
        journey: 'caregiver_portal',
        metadata: { success: true, targetRole: 'caregiver' }
      });

      // Repeated PIN Friction: Sunita clicks to view Patient routine, then returns to Caregiver portal 3 minutes later and must re-enter PIN!
      events.push({
        id: makeId(),
        type: TELEMETRY_EVENT_TYPES.ROLE_GATE_PIN_ENTERED,
        category: TELEMETRY_CATEGORIES.SECURITY,
        timestamp: new Date(caregiverTime.getTime() + 180000).toISOString(),
        personaId: 'synthetic_caregiver_sunita_003',
        personaTier: PERSONA_TIERS.CAREGIVER,
        journey: 'caregiver_portal',
        metadata: { success: true, targetRole: 'caregiver', rePromptWithinSession: true, elapsedSinceLastPinMs: 180000 }
      });

      // -----------------------------------------------------------------------
      // 4. Dr. Verma (Clinician Persona)
      // -----------------------------------------------------------------------
      if (day % 3 === 0) {
        const doctorTime = new Date(`${dateStr}T17:00:00Z`);
        events.push({
          id: makeId(),
          type: TELEMETRY_EVENT_TYPES.ROLE_GATE_PIN_ENTERED,
          category: TELEMETRY_CATEGORIES.SECURITY,
          timestamp: doctorTime.toISOString(),
          personaId: 'synthetic_doctor_verma_004',
          personaTier: PERSONA_TIERS.CLINICIAN,
          journey: 'doctor_portal',
          metadata: { success: true, targetRole: 'doctor' }
        });

        // Reviews tremor damping telemetry & clinical trial data
        events.push({
          id: makeId(),
          type: TELEMETRY_EVENT_TYPES.CLICK_INTERACTIVE,
          category: TELEMETRY_CATEGORIES.TASK,
          timestamp: new Date(doctorTime.getTime() + 60000).toISOString(),
          personaId: 'synthetic_doctor_verma_004',
          personaTier: PERSONA_TIERS.CLINICIAN,
          journey: 'doctor_portal',
          metadata: { action: 'export_clinical_summary', patient: 'Kalyani' }
        });
      }
    }

    return events;
  }
}
