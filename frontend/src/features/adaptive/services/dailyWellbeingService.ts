/**
 * SAKSHAM NEURO-CARE — PRIORITY 3: DAILY WELLBEING & ROUTINE ADAPTATION SERVICE
 * Evaluates patient's daily physical/cognitive condition ('energetic' | 'tired' | 'peaceful').
 *
 * CRITICAL CLINICAL SAFETY RULES:
 * 1. Protection for Essential Tasks: Sourced from patient-specific clinician-prescribed records
 *    (category: 'medication', isClinicianPrescribed, prescriptionRef, or isEssential).
 *    Essential tasks MUST NEVER be removed, auto-skipped, or postponed automatically.
 *    Globally hardcoded drug assumptions (e.g. Levodopa, Donepezil) have been strictly removed
 *    to enforce patient-specific prescription isolation.
 * 2. Flexible activities (recreational games, speech drills, optional tasks) can be gently postponed.
 * 3. 1-Tap 'Restore Familiar Routine' immediately reverts any condition-based schedule adaptation.
 * 4. 100% Spark Free Plan compliant — $0.00 cloud cost, strictly non-diagnostic.
 */

import { RoutineItem } from '../../../types/index.js';
import { getEffectivePatientId, notifyDataChange } from '../../auth/services/identityService.js';

export type DailyCondition = 'energetic' | 'tired' | 'peaceful';

export interface DailyWellbeingState {
  patientId: string;
  condition: DailyCondition;
  updatedAt: string;
  isAdaptedForFatigue: boolean;
  notes?: string;
}

export class DailyWellbeingService {
  private static getStorageKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_daily_wellbeing_${effectiveId}`;
  }

  private static safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Storage unavailable
    }
    return null;
  }

  private static safeSetItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Storage unavailable
    }
  }

  /**
   * Retrieves today's recorded condition for the patient (defaults to 'peaceful').
   */
  public static getDailyCondition(patientId: string = 'default-patient'): DailyCondition {
    const key = this.getStorageKey(patientId);
    const raw = this.safeGetItem(key);
    if (!raw) return 'peaceful';
    try {
      const parsed: DailyWellbeingState = JSON.parse(raw);
      // Validate recorded today
      const recordedDate = new Date(parsed.updatedAt).toDateString();
      const todayDate = new Date().toDateString();
      if (recordedDate === todayDate && parsed.condition) {
        return parsed.condition;
      }
    } catch {
      // Parse error
    }
    return 'peaceful';
  }

  /**
   * Updates today's condition.
   */
  public static setDailyCondition(
    patientId: string = 'default-patient',
    condition: DailyCondition,
    notes?: string
  ): DailyWellbeingState {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const isAdaptedForFatigue = condition === 'tired';
    const state: DailyWellbeingState = {
      patientId: effectiveId,
      condition,
      updatedAt: new Date().toISOString(),
      isAdaptedForFatigue,
      notes,
    };
    const key = this.getStorageKey(effectiveId);
    this.safeSetItem(key, JSON.stringify(state));
    notifyDataChange('daily_wellbeing', effectiveId);
    return state;
  }

  /**
   * Checks if fatigue adaptation is active.
   */
  public static isAdaptedForFatigue(patientId: string = 'default-patient'): boolean {
    return this.getDailyCondition(patientId) === 'tired';
  }

  /**
   * CLINICAL SAFETY RULE:
   * Doctor-prescribed medications and essential clinical care are NEVER flexible.
   * They must remain visible and scheduled at exact due times regardless of fatigue.
   *
   * Sourced directly from individual patient-specific clinician records:
   * - routine.category === 'medication'
   * - routine.isClinicianPrescribed === true
   * - routine.isEssential === true
   * - routine.prescriptionRef / prescriptionId
   *
   * Globally hardcoded drug names (Levodopa, Donepezil, Memantine, etc.) are strictly removed
   * in adherence to individual patient clinical safety.
   */
  public static isEssentialTask(routine: RoutineItem): boolean {
    if (!routine) return false;
    // Category check
    if (routine.category === 'medication') return true;
    // Explicit clinical prescription flags or prescription reference
    if (routine.isClinicianPrescribed === true) return true;
    if (routine.isEssential === true) return true;
    if (Boolean(routine.prescriptionRef || (routine as any).prescriptionId)) return true;
    return false;
  }

  /**
   * Adapts routine list for daily condition:
   * When 'tired':
   *  - Essential tasks stay scheduled and active with an essential badge.
   *  - Flexible tasks (recreation, optional walks) are marked as flexible, and can be deferred.
   */
  public static adaptRoutinesForDailyCondition(
    routines: RoutineItem[],
    condition: DailyCondition
  ): {
    adaptedRoutines: RoutineItem[];
    postponedCount: number;
    essentialCount: number;
  } {
    if (condition !== 'tired') {
      return {
        adaptedRoutines: routines.map((r) => ({
          ...r,
          isEssential: this.isEssentialTask(r),
        })),
        postponedCount: 0,
        essentialCount: routines.filter((r) => this.isEssentialTask(r)).length,
      };
    }

    let postponedCount = 0;
    let essentialCount = 0;

    const adaptedRoutines = routines.map((routine) => {
      const isEssential = this.isEssentialTask(routine);
      if (isEssential) {
        essentialCount++;
        return {
          ...routine,
          isEssential: true,
          // Prescribed meds NEVER postponed
          adaptedForFatigue: false,
        };
      } else {
        // Flexible non-clinical activity
        postponedCount++;
        return {
          ...routine,
          isEssential: false,
          adaptedForFatigue: true,
        };
      }
    });

    return {
      adaptedRoutines,
      postponedCount,
      essentialCount,
    };
  }

  /**
   * 1-Tap 'Restore Familiar Routine': resets daily condition to 'peaceful'
   * and clears fatigue adaptations immediately.
   */
  public static restoreFamiliarBaseline(patientId: string = 'default-patient'): DailyWellbeingState {
    return this.setDailyCondition(patientId, 'peaceful', 'Restored by patient tap');
  }
}
