export type RelationshipStatus =
  | 'pending'
  | 'active'
  | 'additional_info_required'
  | 'rejected'
  | 'suspended'
  | 'revoked';

export type RelationshipCategory = 'doctor_patient' | 'caregiver_patient';

export type DoctorPatientRelationshipType =
  | 'primary_clinician'
  | 'consulting_neurologist'
  | 'geriatric_specialist'
  | 'rehabilitation_physician';

export type CaregiverPatientRelationshipType =
  | 'daughter'
  | 'son'
  | 'spouse'
  | 'family_member'
  | 'relative'
  | 'legal_representative'
  | 'professional_caregiver';

export type ConsentBasis =
  | 'patient_informed_consent'
  | 'legal_representative_authorization'
  | 'hospital_clinical_referral';

export interface CaregiverRelationshipPermissions {
  canViewDashboard: boolean;
  canManageRoutines: boolean;
  canMonitorActivities: boolean;
  canReceiveAlerts: boolean;
  canAssistMemoryCues: boolean;
  canCommunicateWithDoctor: boolean;
  canViewRestrictedClinical: boolean;
  canReadCalendar: boolean;
  canCreateCalendarEvents: boolean;
  canEditCalendarEvents: boolean;
  canDeleteCalendarEvents: boolean;
}

export interface DoctorPatientRelationshipRecord {
  id: string; // `${doctorId}_${patientId}`
  doctorId: string;
  patientId: string;
  relationshipType: DoctorPatientRelationshipType | string;
  status: RelationshipStatus;
  patientName?: string;
  patientEmail?: string;
  doctorName?: string;
  doctorEmail?: string;
  doctorSpecialty?: string;
  doctorHospital?: string;
  doctorLicenseNumber?: string;
  doctorQualification?: string;
  requestReason?: string;
  requestedByUid?: string;
  approvedByAdminUid?: string;
  approvedByAdminName?: string;
  approvedAt?: string;
  reviewedByAdminUid?: string;
  reviewedAt?: string;
  reason?: string;
  notes?: string;
  consentBasis?: ConsentBasis;
  consentReference?: string;
  assignedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaregiverPatientRelationshipRecord {
  id: string; // `${caregiverId}_${patientId}`
  caregiverId: string;
  patientId: string;
  relationshipType: CaregiverPatientRelationshipType | string;
  status: RelationshipStatus;
  permissions: CaregiverRelationshipPermissions;
  patientName?: string;
  patientEmail?: string;
  caregiverName?: string;
  caregiverEmail?: string;
  requestReason?: string;
  requestedByUid?: string;
  approvedByAdminUid?: string;
  approvedByAdminName?: string;
  approvedAt?: string;
  reviewedByAdminUid?: string;
  reviewedAt?: string;
  reason?: string;
  consentBasis: ConsentBasis;
  consentReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipAuditLogRecord {
  id: string;
  category: RelationshipCategory;
  relationshipId: string;
  patientId: string;
  patientName?: string;
  counterpartyId: string;
  counterpartyName?: string;
  counterpartyRole: 'doctor' | 'caregiver';
  action:
    | 'RELATIONSHIP_CREATED'
    | 'RELATIONSHIP_APPROVED'
    | 'RELATIONSHIP_REJECTED'
    | 'RELATIONSHIP_INFO_REQUESTED'
    | 'RELATIONSHIP_SUSPENDED'
    | 'RELATIONSHIP_REVOKED'
    | 'DOCTOR_REASSIGNED'
    | 'PERMISSIONS_UPDATED'
    | 'REMOVAL_REPORT_RESOLVED';
  requestedByUid?: string;
  actorAdminUid: string;
  actorAdminName?: string;
  previousStatus: RelationshipStatus | 'none';
  newStatus: RelationshipStatus;
  reason?: string;
  consentReference?: string;
  timestamp: string;
}

export interface RelationshipRemovalRequestRecord {
  id: string;
  relationshipId: string;
  category: RelationshipCategory;
  patientId: string;
  patientName?: string;
  counterpartyId: string;
  counterpartyName?: string;
  counterpartyRole: 'doctor' | 'caregiver';
  requestType: 'incorrect_connection_report' | 'removal_request' | 'connection_request';
  reason: string;
  requesterUid: string;
  status: 'pending' | 'resolved' | 'dismissed';
  adminResolutionNote?: string;
  resolvedByAdminUid?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const isRelationshipActive = (status: unknown): boolean => {
  if (typeof status !== 'string') return false;
  const s = status.trim().toLowerCase();
  return s === 'active';
};

export const normalizeRelationshipStatus = (raw: unknown): RelationshipStatus => {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (s === 'active' || s === 'approved') return 'active';
  if (s === 'additional_info_required' || s === 'additional_information_required') {
    return 'additional_info_required';
  }
  if (s === 'rejected') return 'rejected';
  if (s === 'suspended') return 'suspended';
  if (s === 'revoked' || s === 'cancelled') return 'revoked';
  return 'pending';
};

export const DEFAULT_CAREGIVER_REL_PERMISSIONS: CaregiverRelationshipPermissions = {
  canViewDashboard: true,
  canManageRoutines: true,
  canMonitorActivities: true,
  canReceiveAlerts: true,
  canAssistMemoryCues: true,
  canCommunicateWithDoctor: true,
  canViewRestrictedClinical: false,
  canReadCalendar: true,
  canCreateCalendarEvents: true,
  canEditCalendarEvents: true,
  canDeleteCalendarEvents: true,
};
