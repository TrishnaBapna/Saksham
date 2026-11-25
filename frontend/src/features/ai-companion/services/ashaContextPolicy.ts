/**
 * SAKSHAM NEURO-CARE — PHASE 3.9
 * ASHA CONTEXT PERMISSION & PRIVACY POLICY SERVICE
 *
 * Enforces:
 * 1. Session verification & strict patient ownership boundary.
 * 2. Complete exclusion of formal clinician assessments (MMSE, MoCA, HMSE) from patient chat context.
 * 3. Doctor sharing consent enforcement (sharedWithDoctor === false stays patient_private).
 * 4. Stored text sanitization: strips prompt injection keywords and malicious payloads before context injection.
 * 5. Fail-closed security architecture.
 *
 * 100% Spark Free Plan compliant ($0.00 cloud cost, deterministic local policy).
 */

import { SecurityUtils } from '../../../utils/securityUtils.js';
import {
  ContextSharingStatus,
  ContextFreshness,
  PermissionDecision,
  ContextProvenanceRecord,
} from '../types/ashaContext.types.js';

export class AshaContextPolicy {
  /**
   * Injection keywords to neutralize from stored notes, task titles, or descriptions
   * before they enter Asha's conversational context.
   */
  private static readonly INJECTION_STRIP_REGEX =
    /(?:\b(?:ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions?|system\s+override|developer\s+mode|dan\s+mode|jailbreak|reveal\s+(?:private\s+)?caregiver\s+notes?|show\s+another\s+patient|change\s+(?:my\s+)?diagnosis|mark\s+every\s+task\s+complete|bypass\s+doctor)\b|(?:पिछले\s*निर्देश\s*भूल|सिस्टम\s*ओवरराइड|डेवलपर\s*मोड))/gi;

  /**
   * Cleans untrusted stored text: strips HTML, clamp bounds, neutralizes prompt injection payloads.
   */
  public static sanitizeStoredText(raw: string | undefined | null, maxLength: number = 500): string {
    if (!raw) return '';
    let clean = SecurityUtils.sanitizePlainText(raw, maxLength);
    // Neutralize prompt injection phrases so stored context cannot act as adversarial instructions
    clean = clean.replace(this.INJECTION_STRIP_REGEX, '[redacted_instruction]');
    return clean.trim();
  }

  /**
   * Validates whether a patient identity is authorized to access records.
   * Cross-UID guard: caller UID must match record UID.
   */
  public static isPatientOwner(callerPatientId: string, recordPatientId: string): boolean {
    if (!callerPatientId || !recordPatientId) return false;
    return callerPatientId.trim() === recordPatientId.trim();
  }

  /**
   * Determines permission decision for patient-facing Asha conversational context.
   * Formal clinical assessments (MMSE, HMSE, clinical stage) are strictly BLOCKED from patient chat.
   */
  public static evaluateRecordPermission(
    callerPatientId: string,
    recordPatientId: string,
    sharingStatus: ContextSharingStatus
  ): PermissionDecision {
    // 1. Cross-UID Isolation Guard
    if (!this.isPatientOwner(callerPatientId, recordPatientId)) {
      return 'blocked_unassigned';
    }

    // 2. Formal Clinician Assessment Guard:
    // Standardized scores & external instruments must NEVER be injected into patient companion chat
    if (sharingStatus === 'clinical_only') {
      return 'blocked_privacy';
    }

    // 3. Permitted patient-private and caregiver-shared context
    if (
      sharingStatus === 'patient_private' ||
      sharingStatus === 'caregiver_shared' ||
      sharingStatus === 'doctor_consented' ||
      sharingStatus === 'system_internal'
    ) {
      return 'authorized_for_asha';
    }

    // Fail closed
    return 'blocked_privacy';
  }

  /**
   * Wraps an item with an immutable context provenance envelope.
   */
  public static createProvenanceEnvelope<T>(
    data: T,
    sourceService: string,
    callerPatientId: string,
    recordPatientId: string,
    authorOrReporter: 'patient' | 'caregiver' | 'doctor' | 'system',
    sharingStatus: ContextSharingStatus,
    freshness: ContextFreshness = 'today'
  ): ContextProvenanceRecord<T> {
    const decision = this.evaluateRecordPermission(callerPatientId, recordPatientId, sharingStatus);

    return {
      data,
      sourceService,
      patientId: recordPatientId,
      authorOrReporter,
      timestamp: new Date().toISOString(),
      sharingStatus,
      freshness,
      permissionDecision: decision,
    };
  }
}
