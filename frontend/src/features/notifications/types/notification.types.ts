/**
 * SAKSHAM — STAGE 3 PHASE C: IN-APP NOTIFICATIONS
 * Lightweight, dignity-preserving in-app notification schemas.
 * 100% Spark Free Plan compliant — zero FCM, zero external push SDKs.
 */

export type InAppNotificationType =
  | 'PROPOSAL_AWAITING_REVIEW'
  | 'PATIENT_ACCEPTED_ADJUSTMENT'
  | 'PATIENT_KEPT_FAMILIAR'
  | 'CAREGIVER_APPROVED'
  | 'CAREGIVER_DECLINED'
  | 'CONFIGURATION_ACTIVATED'
  | 'CONFIGURATION_REVERTED'
  | 'SYNC_FAILED';

export interface InAppNotification {
  id: string;
  patientId: string;
  recipientRole: 'patient' | 'caregiver' | 'doctor' | 'all';
  type: InAppNotificationType;
  title: string;
  message: string;
  activityId?: string;
  activityTitle?: string;
  proposalId?: string;
  read: boolean;
  createdAt: string; // ISO 8601
  readAt?: string;
  actionUrl?: string;
}
