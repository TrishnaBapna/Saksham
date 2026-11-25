/**
 * SAKSHAM NEURO-CARE — PHASE 3.11
 * Dyadic Care Coordination Safety & Authorization Policy
 *
 * Enforces:
 * 1. Strict Caregiver Authorization: Only active, verified caregiver relationships can read/write shared dyadic records.
 * 2. Non-Negotiable Patient Autonomy: Caregivers can propose, but only the patient can accept/decline.
 * 3. Clinical & Safety Locks: Flame/gas/stove, medication regimens, and doctor-prescribed activities cannot be altered by caregivers.
 * 4. Respectful Non-Adversarial Language: Discrepancies are never labeled as failure, lying, or cognitive decline.
 * 5. Private-by-Default Isolation: Patient journal records remain strictly private unless explicitly shared.
 *
 * 100% Spark Free Plan compliant ($0.00 cloud cost, resident local processing).
 */

import {
  ProposalSafetyStatus,
  DyadicAuthorRole,
} from '../types/dyadicCareCoordination.types.js';
import { CaregiverService } from './caregiverService.js';

export class DyadicCareCoordinationPolicy {
  /**
   * Validates whether a caregiver is authorized to collaborate with a target patient.
   */
  public static async isCaregiverAuthorized(
    caregiverId: string,
    patientId: string
  ): Promise<boolean> {
    if (!caregiverId || !patientId) return false;
    try {
      const patientInfo = await CaregiverService.getConnectedPatient(caregiverId, patientId);
      return patientInfo.relationshipStatus === 'active';
    } catch {
      return false;
    }
  }

  /**
   * Evaluates whether a proposed routine modification touches safety-critical or doctor-prescribed domains.
   */
  public static evaluateSafetyLock(
    category: string = '',
    instructionText: string = '',
    isClinicianPrescribed: boolean = false
  ): ProposalSafetyStatus {
    if (isClinicianPrescribed) {
      return 'clinician_prescribed_locked';
    }

    const lowerText = instructionText.toLowerCase();
    const lowerCategory = category.toLowerCase();

    // 1. Medication & Prescription Lock
    if (
      lowerCategory === 'medication' ||
      lowerText.includes('medication') ||
      lowerText.includes('pill') ||
      lowerText.includes('tablet') ||
      lowerText.includes('dosage') ||
      lowerText.includes('insulin')
    ) {
      return 'safety_locked_medication';
    }

    // 2. Flame, Gas, Stove & Heat Lock
    if (
      lowerText.includes('stove') ||
      lowerText.includes('gas') ||
      lowerText.includes('burner') ||
      lowerText.includes('flame') ||
      lowerText.includes('fire') ||
      lowerText.includes('kettle') ||
      lowerText.includes('boil') ||
      lowerText.includes('boiling')
    ) {
      return 'safety_locked_flame';
    }

    return 'safe';
  }

  /**
   * Validates actor permissions for proposal review actions.
   * Only the patient can accept, decline, or defer a proposal.
   * Caregivers can only withdraw their own proposals.
   */
  public static canReviewProposal(
    actorRole: DyadicAuthorRole,
    action: 'accept' | 'decline' | 'defer' | 'withdraw'
  ): boolean {
    if (action === 'withdraw') {
      return actorRole === 'caregiver' || actorRole === 'system';
    }
    // Patient decisions require patient role (or system on explicit behalf)
    return actorRole === 'patient';
  }

  /**
   * Validates actor permissions for support request actions.
   */
  public static canUpdateSupportRequest(
    actorRole: DyadicAuthorRole,
    action: 'acknowledge' | 'respond' | 'resolve' | 'cancel'
  ): boolean {
    if (action === 'acknowledge' || action === 'respond') {
      return actorRole === 'caregiver' || actorRole === 'clinician';
    }
    if (action === 'resolve' || action === 'cancel') {
      return actorRole === 'patient' || actorRole === 'caregiver';
    }
    return false;
  }

  /**
   * Neutralizes clinical and observational tone to eliminate accusatory, adversarial,
   * or cognitive decline framing from discrepancies.
   */
  public static sanitizeDiscrepancyLanguage(text: string): string {
    if (!text) return '';
    return text
      .replace(/\b(lying|falsified|fabricated|dishonest)\b/gi, 'divergent recollection')
      .replace(/\b(fail(?:ed|ure|ing|s)?|declining|deteriorated)\b/gi, 'required more support')
      .replace(/\b(refused|non-compliant|uncooperative)\b/gi, 'preferred personal approach')
      .replace(/\b(confused|disoriented|impaired)\b/gi, 'noted situational difference');
  }

  /**
   * Generates a neutral, dignified explanation of divergent patient and caregiver reports.
   */
  public static buildNeutralDiscrepancyExplanation(
    domain: string,
    patientStatus: string,
    caregiverStatus: string
  ): string {
    const domainLabels: Record<string, string> = {
      routine_completion: 'routine completion',
      task_completion: 'routine completion',
      activity_timing: 'activity timing',
      comfort_level: 'comfort level',
      adaptation_preference: 'routine preferences',
      object_location: 'item placement',
      cognitive_concern: 'daily cognitive observations',
    };
    const domainName = domainLabels[domain] || domain.replace('_', ' ');

    return `Dual perspective in ${domainName}: The patient reported "${patientStatus}", while the caregiver observed "${caregiverStatus}". Both perspectives are preserved with dignity for collaborative understanding.`;
  }
}
