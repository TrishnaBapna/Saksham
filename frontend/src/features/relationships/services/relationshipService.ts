import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import { AuthUser } from '../../auth/types/auth.types.js';
import {
  GovernanceUserRecord,
  shouldUseAdminSandbox,
} from '../../admin/services/adminGovernanceService.js';
import { isExplicitLocalDemo } from '../../auth/services/identityService.js';
import {
  CaregiverPatientRelationshipRecord,
  CaregiverRelationshipPermissions,
  ConsentBasis,
  DEFAULT_CAREGIVER_REL_PERMISSIONS,
  DoctorPatientRelationshipRecord,
  RelationshipAuditLogRecord,
  RelationshipCategory,
  RelationshipRemovalRequestRecord,
  RelationshipStatus,
  isRelationshipActive,
  normalizeRelationshipStatus,
} from '../types/relationship.types.js';

const LOCAL_REL_STORE_KEY = 'saksham_local_relationships_v2';

interface LocalRelationshipStore {
  doctorAssignments: DoctorPatientRelationshipRecord[];
  caregiverRelationships: CaregiverPatientRelationshipRecord[];
  auditLogs: RelationshipAuditLogRecord[];
  removalRequests: RelationshipRemovalRequestRecord[];
}

const DEFAULT_LOCAL_STORE: LocalRelationshipStore = {
  doctorAssignments: [
    {
      id: 'usr-003_usr-001',
      doctorId: 'usr-003',
      patientId: 'usr-001',
      relationshipType: 'primary_clinician',
      status: 'active',
      patientName: 'Sunita Sharma',
      patientEmail: 'sunita.sharma@saksham.care',
      doctorName: 'Dr. Raman Verma',
      doctorEmail: 'dr.raman.verma@saksham.care',
      doctorSpecialty: 'Memory Disorders & Neurology',
      doctorHospital: 'Saksham Partner Neuro Clinic',
      doctorLicenseNumber: 'NMC-DL-2015-4410',
      doctorQualification: 'MBBS, MD, DM (Neurology)',
      requestReason: 'Primary neurology cognitive evaluation and care plan oversight',
      requestedByUid: 'admin-demo-01',
      approvedByAdminUid: 'admin-demo-01',
      approvedByAdminName: 'System Security Administrator',
      approvedAt: '2026-10-16T08:00:00.000Z',
      reviewedByAdminUid: 'admin-demo-01',
      reviewedAt: '2026-10-16T08:00:00.000Z',
      reason: 'Confirmed clinical consent on file',
      consentBasis: 'patient_informed_consent',
      consentReference: 'CONS-2026-001',
      assignedAt: '2026-10-16T08:00:00.000Z',
      createdAt: '2026-10-16T07:45:00.000Z',
      updatedAt: '2026-10-16T08:00:00.000Z',
    },
    {
      id: 'demo-doctor-001_demo-patient-001',
      doctorId: 'demo-doctor-001',
      patientId: 'demo-patient-001',
      relationshipType: 'primary_clinician',
      status: 'active',
      patientName: 'Sunita Sharma',
      patientEmail: 'patient@saksham.care',
      doctorName: 'Dr. Raman Verma',
      doctorEmail: 'doctor@saksham.care',
      doctorSpecialty: 'Memory Disorders & Neurology',
      doctorHospital: 'Saksham Partner Neuro Clinic',
      doctorLicenseNumber: 'NMC-DL-2015-4410',
      doctorQualification: 'MBBS, MD, DM (Neurology)',
      requestReason: 'Primary neurology longitudinal tracking',
      requestedByUid: 'demo-admin-001',
      approvedByAdminUid: 'demo-admin-001',
      approvedByAdminName: 'System Security Administrator',
      approvedAt: '2026-10-16T08:00:00.000Z',
      reviewedByAdminUid: 'demo-admin-001',
      reviewedAt: '2026-10-16T08:00:00.000Z',
      reason: 'Verified patient consent',
      consentBasis: 'patient_informed_consent',
      consentReference: 'CONS-DEMO-001',
      assignedAt: '2026-10-16T08:00:00.000Z',
      createdAt: '2026-10-16T08:00:00.000Z',
      updatedAt: '2026-10-16T08:00:00.000Z',
    },
  ],
  caregiverRelationships: [
    {
      id: 'usr-002_usr-001',
      caregiverId: 'usr-002',
      patientId: 'usr-001',
      relationshipType: 'daughter',
      status: 'active',
      permissions: { ...DEFAULT_CAREGIVER_REL_PERMISSIONS },
      patientName: 'Sunita Sharma',
      patientEmail: 'sunita.sharma@saksham.care',
      caregiverName: 'Ananya Sharma',
      caregiverEmail: 'ananya.sharma@saksham.care',
      requestReason: 'Primary family caregiver assisting with daily routines and safe zone alerts',
      requestedByUid: 'admin-demo-01',
      approvedByAdminUid: 'admin-demo-01',
      approvedByAdminName: 'System Security Administrator',
      approvedAt: '2026-10-14T10:00:00.000Z',
      reviewedByAdminUid: 'admin-demo-01',
      reviewedAt: '2026-10-14T10:00:00.000Z',
      reason: 'Verified patient consent and family identity',
      consentBasis: 'patient_informed_consent',
      consentReference: 'CG-CONS-001',
      createdAt: '2026-10-14T09:30:00.000Z',
      updatedAt: '2026-10-14T10:00:00.000Z',
    },
    {
      id: 'usr-004_usr-001',
      caregiverId: 'usr-004',
      patientId: 'usr-001',
      relationshipType: 'relative',
      status: 'pending',
      permissions: { ...DEFAULT_CAREGIVER_REL_PERMISSIONS, canViewRestrictedClinical: false },
      patientName: 'Sunita Sharma',
      patientEmail: 'sunita.sharma@saksham.care',
      caregiverName: 'Rohan Mehta',
      caregiverEmail: 'rohan.mehta@care.org',
      requestReason: 'Secondary family support awaiting Admin verification',
      requestedByUid: 'usr-004',
      reason: 'Pending consent review',
      consentBasis: 'patient_informed_consent',
      consentReference: 'PENDING-REF-004',
      createdAt: '2026-11-02T09:00:00.000Z',
      updatedAt: '2026-11-02T09:00:00.000Z',
    },
    {
      id: 'demo-caregiver-001_demo-patient-001',
      caregiverId: 'demo-caregiver-001',
      patientId: 'demo-patient-001',
      relationshipType: 'daughter',
      status: 'active',
      permissions: { ...DEFAULT_CAREGIVER_REL_PERMISSIONS },
      patientName: 'Sunita Sharma',
      patientEmail: 'patient@saksham.care',
      caregiverName: 'Ananya Sharma',
      caregiverEmail: 'caregiver@saksham.care',
      requestReason: 'Primary family caregiver',
      requestedByUid: 'demo-admin-001',
      approvedByAdminUid: 'demo-admin-001',
      approvedByAdminName: 'System Security Administrator',
      approvedAt: '2026-10-14T10:00:00.000Z',
      reviewedByAdminUid: 'demo-admin-001',
      reviewedAt: '2026-10-14T10:00:00.000Z',
      reason: 'Verified patient consent',
      consentBasis: 'patient_informed_consent',
      consentReference: 'CG-DEMO-001',
      createdAt: '2026-10-14T10:00:00.000Z',
      updatedAt: '2026-10-14T10:00:00.000Z',
    },
  ],
  auditLogs: [
    {
      id: 'rel-audit-init-1',
      category: 'doctor_patient',
      relationshipId: 'usr-003_usr-001',
      patientId: 'usr-001',
      patientName: 'Sunita Sharma',
      counterpartyId: 'usr-003',
      counterpartyName: 'Dr. Raman Verma',
      counterpartyRole: 'doctor',
      action: 'RELATIONSHIP_APPROVED',
      requestedByUid: 'admin-demo-01',
      actorAdminUid: 'admin-demo-01',
      actorAdminName: 'System Security Administrator',
      previousStatus: 'pending',
      newStatus: 'active',
      reason: 'Confirmed clinical consent on file',
      consentReference: 'CONS-2026-001',
      timestamp: '2026-10-16T08:00:00.000Z',
    },
  ],
  removalRequests: [],
};

const readLocalStore = (): LocalRelationshipStore => {
  if (!isExplicitLocalDemo()) {
    return { doctorAssignments: [], caregiverRelationships: [], auditLogs: [], removalRequests: [] };
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(LOCAL_REL_STORE_KEY);
      if (raw) {
        return JSON.parse(raw) as LocalRelationshipStore;
      }
    }
  } catch {
    // Fallback below
  }
  return {
    doctorAssignments: [...DEFAULT_LOCAL_STORE.doctorAssignments],
    caregiverRelationships: [...DEFAULT_LOCAL_STORE.caregiverRelationships],
    auditLogs: [...DEFAULT_LOCAL_STORE.auditLogs],
    removalRequests: [...DEFAULT_LOCAL_STORE.removalRequests],
  };
};

const writeLocalStore = (store: LocalRelationshipStore): void => {
  if (!isExplicitLocalDemo()) return;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_REL_STORE_KEY, JSON.stringify(store));
    }
  } catch {
    // Ignore storage error
  }
};

const assertAdminCaller = (adminUser: AuthUser | null): AuthUser => {
  if (!adminUser || adminUser.role !== 'admin') {
    throw new Error('Administrator authorisation is required for relationship management.');
  }
  if (adminUser.status !== 'verified') {
    throw new Error('Administrator account must be verified and active.');
  }
  return adminUser;
};

const shouldUseRelationshipSandbox = (callerUser?: AuthUser | null): boolean => {
  if (shouldUseAdminSandbox(callerUser)) return true;
  if (!isExplicitLocalDemo()) return false;
  try {
    if (
      typeof window !== 'undefined' &&
      window.localStorage?.getItem('saksham_force_live_firestore') === 'true'
    ) {
      return false;
    }
  } catch {
    // Ignore storage error
  }
  return (
    !callerUser?.uid ||
    callerUser.uid.startsWith('demo-') ||
    callerUser.uid.startsWith('local-') ||
    import.meta.env.MODE === 'test'
  );
};

const toIso = (val: any): string => {
  if (!val) return '';
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  return String(val);
};

const extractCaregiverPermissions = (data: Record<string, any>): CaregiverRelationshipPermissions => {
  const perms = data?.permissions || {};
  return {
    canViewDashboard: perms.canViewDashboard !== false,
    canManageRoutines: perms.canManageRoutines !== false,
    canMonitorActivities: perms.canMonitorActivities !== false,
    canReceiveAlerts: perms.canReceiveAlerts !== false,
    canAssistMemoryCues: perms.canAssistMemoryCues !== false,
    canCommunicateWithDoctor: perms.canCommunicateWithDoctor !== false,
    canViewRestrictedClinical: Boolean(perms.canViewRestrictedClinical),
    canReadCalendar: Boolean(data.canReadCalendar ?? perms.canReadCalendar ?? true),
    canCreateCalendarEvents: Boolean(data.canCreateCalendarEvents ?? perms.canCreateCalendarEvents ?? true),
    canEditCalendarEvents: Boolean(data.canEditCalendarEvents ?? perms.canEditCalendarEvents ?? true),
    canDeleteCalendarEvents: Boolean(data.canDeleteCalendarEvents ?? perms.canDeleteCalendarEvents ?? true),
  };
};

const mapDoctorAssignmentDoc = (id: string, data: Record<string, any>): DoctorPatientRelationshipRecord => {
  const status = normalizeRelationshipStatus(data.status);
  const createdAt = toIso(data.createdAt || data.assignedAt);
  const updatedAt = toIso(data.updatedAt || data.reviewedAt || data.assignedAt || createdAt);
  return {
    id,
    doctorId: String(data.doctorId || ''),
    patientId: String(data.patientId || ''),
    relationshipType: String(data.relationshipType || 'primary_clinician'),
    status,
    patientName: data.patientName ? String(data.patientName) : undefined,
    patientEmail: data.patientEmail ? String(data.patientEmail) : undefined,
    doctorName: data.doctorName ? String(data.doctorName) : undefined,
    doctorEmail: data.doctorEmail ? String(data.doctorEmail) : undefined,
    doctorSpecialty: data.doctorSpecialty ? String(data.doctorSpecialty) : undefined,
    doctorHospital: data.doctorHospital ? String(data.doctorHospital) : undefined,
    doctorLicenseNumber: data.doctorLicenseNumber ? String(data.doctorLicenseNumber) : undefined,
    doctorQualification: data.doctorQualification ? String(data.doctorQualification) : undefined,
    requestReason: data.requestReason ? String(data.requestReason) : undefined,
    requestedByUid: data.requestedByUid ? String(data.requestedByUid) : undefined,
    approvedByAdminUid: data.approvedByAdminUid ? String(data.approvedByAdminUid) : undefined,
    approvedByAdminName: data.approvedByAdminName ? String(data.approvedByAdminName) : undefined,
    approvedAt: data.approvedAt ? toIso(data.approvedAt) : undefined,
    reviewedByAdminUid: data.reviewedByAdminUid ? String(data.reviewedByAdminUid) : undefined,
    reviewedAt: data.reviewedAt ? toIso(data.reviewedAt) : undefined,
    reason: data.reason ? String(data.reason) : undefined,
    notes: data.notes ? String(data.notes) : undefined,
    consentBasis: data.consentBasis as ConsentBasis | undefined,
    consentReference: data.consentReference ? String(data.consentReference) : undefined,
    assignedAt: toIso(data.assignedAt || data.approvedAt || createdAt),
    createdAt,
    updatedAt,
  };
};

const mapCaregiverRelationshipDoc = (
  id: string,
  data: Record<string, any>
): CaregiverPatientRelationshipRecord => {
  const status = normalizeRelationshipStatus(data.status);
  const createdAt = toIso(data.createdAt);
  const updatedAt = toIso(data.updatedAt || data.reviewedAt || createdAt);
  return {
    id,
    caregiverId: String(data.caregiverId || ''),
    patientId: String(data.patientId || ''),
    relationshipType: String(data.relationshipType || 'family_member'),
    status,
    permissions: extractCaregiverPermissions(data),
    patientName: data.patientName ? String(data.patientName) : undefined,
    patientEmail: data.patientEmail ? String(data.patientEmail) : undefined,
    caregiverName: data.caregiverName ? String(data.caregiverName) : undefined,
    caregiverEmail: data.caregiverEmail ? String(data.caregiverEmail) : undefined,
    requestReason: data.requestReason ? String(data.requestReason) : undefined,
    requestedByUid: data.requestedByUid ? String(data.requestedByUid) : undefined,
    approvedByAdminUid: data.approvedByAdminUid ? String(data.approvedByAdminUid) : undefined,
    approvedByAdminName: data.approvedByAdminName ? String(data.approvedByAdminName) : undefined,
    approvedAt: data.approvedAt ? toIso(data.approvedAt) : undefined,
    reviewedByAdminUid: data.reviewedByAdminUid ? String(data.reviewedByAdminUid) : undefined,
    reviewedAt: data.reviewedAt ? toIso(data.reviewedAt) : undefined,
    reason: data.reason ? String(data.reason) : undefined,
    consentBasis: (data.consentBasis as ConsentBasis) || 'patient_informed_consent',
    consentReference: data.consentReference ? String(data.consentReference) : undefined,
    createdAt,
    updatedAt,
  };
};

const statusActionMap = (
  previousStatus: RelationshipStatus | 'none',
  nextStatus: RelationshipStatus
): RelationshipAuditLogRecord['action'] => {
  if (nextStatus === 'active') return 'RELATIONSHIP_APPROVED';
  if (nextStatus === 'rejected') return 'RELATIONSHIP_REJECTED';
  if (nextStatus === 'additional_info_required') return 'RELATIONSHIP_INFO_REQUESTED';
  if (nextStatus === 'suspended') return 'RELATIONSHIP_SUSPENDED';
  if (nextStatus === 'revoked') return 'RELATIONSHIP_REVOKED';
  if (previousStatus === 'none') return 'RELATIONSHIP_CREATED';
  return 'RELATIONSHIP_CREATED';
};

export const RelationshipManagementService = {
  async fetchAllRelationshipsAndLogs(callerUser?: AuthUser | null): Promise<{
    doctorAssignments: DoctorPatientRelationshipRecord[];
    caregiverRelationships: CaregiverPatientRelationshipRecord[];
    auditLogs: RelationshipAuditLogRecord[];
    removalRequests: RelationshipRemovalRequestRecord[];
  }> {
    if (shouldUseRelationshipSandbox(callerUser)) {
      const store = readLocalStore();
      return {
        doctorAssignments: [...store.doctorAssignments].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt)
        ),
        caregiverRelationships: [...store.caregiverRelationships].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt)
        ),
        auditLogs: [...store.auditLogs].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
        removalRequests: [...store.removalRequests].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt)
        ),
      };
    }

    if (!isFirebaseConfigured) {
      return {
        doctorAssignments: [],
        caregiverRelationships: [],
        auditLogs: [],
        removalRequests: [],
      };
    }

    const [docSnap, cgSnap, auditSnap, reqSnap] = await Promise.all([
      getDocs(collection(db, 'doctorAssignments')),
      getDocs(collection(db, 'relationships')),
      getDocs(collection(db, 'relationshipAuditLogs')).catch(() => null),
      getDocs(collection(db, 'relationshipRequests')).catch(() => null),
    ]);

    const doctorAssignments = docSnap.docs
      .map((d) => mapDoctorAssignmentDoc(d.id, d.data() || {}))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const caregiverRelationships = cgSnap.docs
      .map((d) => mapCaregiverRelationshipDoc(d.id, d.data() || {}))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const auditLogs: RelationshipAuditLogRecord[] = auditSnap
      ? auditSnap.docs
          .map((d) => ({ ...(d.data() as RelationshipAuditLogRecord), id: d.id }))
          .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
      : [];

    const removalRequests: RelationshipRemovalRequestRecord[] = reqSnap
      ? reqSnap.docs
          .map((d) => ({ ...(d.data() as RelationshipRemovalRequestRecord), id: d.id }))
          .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
      : [];

    return {
      doctorAssignments,
      caregiverRelationships,
      auditLogs,
      removalRequests,
    };
  },

  async writeAuditLog(
    adminUser: AuthUser | null,
    entry: Omit<RelationshipAuditLogRecord, 'id' | 'actorAdminUid' | 'actorAdminName' | 'timestamp'>
  ): Promise<RelationshipAuditLogRecord> {
    const admin = assertAdminCaller(adminUser);
    const nowIso = new Date().toISOString();
    const record: RelationshipAuditLogRecord = {
      ...entry,
      id: `rel-audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      actorAdminUid: admin.uid,
      actorAdminName: admin.displayName || admin.email || admin.uid,
      timestamp: nowIso,
    };

    if (shouldUseAdminSandbox(admin)) {
      const store = readLocalStore();
      store.auditLogs = [record, ...store.auditLogs];
      writeLocalStore(store);
      return record;
    }

    if (isFirebaseConfigured) {
      try {
        const ref = await addDoc(collection(db, 'relationshipAuditLogs'), {
          ...record,
        });
        record.id = ref.id;
      } catch (err) {
        console.warn('[RelationshipManagementService] Could not persist audit log:', err);
      }
    }
    return record;
  },

  async createOrUpdateDoctorAssignment(
    adminUser: AuthUser | null,
    params: {
      doctor: GovernanceUserRecord;
      patient: GovernanceUserRecord;
      relationshipType: string;
      initialStatus: 'pending' | 'active';
      reason: string;
      consentBasis: ConsentBasis;
      consentReference?: string;
      requestedByUid?: string;
      previousStatus?: RelationshipStatus | 'none';
    }
  ): Promise<DoctorPatientRelationshipRecord> {
    const admin = assertAdminCaller(adminUser);
    const {
      doctor,
      patient,
      relationshipType,
      initialStatus,
      reason,
      consentBasis,
      consentReference,
      requestedByUid,
      previousStatus = 'none',
    } = params;

    if (doctor.role !== 'doctor') {
      throw new Error('Selected clinician account must have the Doctor role.');
    }
    if (patient.role !== 'patient') {
      throw new Error('Selected recipient account must have the Patient role.');
    }
    if (initialStatus === 'active' && doctor.status !== 'verified') {
      throw new Error('Only a verified and approved doctor can receive an active patient assignment.');
    }
    if (!reason.trim()) {
      throw new Error('A justification or clinical assignment reason is required.');
    }
    if (consentBasis === 'legal_representative_authorization' && !consentReference?.trim()) {
      throw new Error('Documented legal/representative authorisation reference is required.');
    }

    const nowIso = new Date().toISOString();
    const id = `${doctor.id}_${patient.id}`;
    const adminName = admin.displayName || admin.email || admin.uid;

    const record: DoctorPatientRelationshipRecord = {
      id,
      doctorId: doctor.id,
      patientId: patient.id,
      relationshipType: relationshipType.trim() || 'primary_clinician',
      status: initialStatus,
      patientName: patient.name,
      patientEmail: patient.email,
      doctorName: doctor.name,
      doctorEmail: doctor.email,
      doctorSpecialty: doctor.specialty || '',
      doctorHospital: doctor.hospital || '',
      doctorLicenseNumber: doctor.licenseNumber || '',
      doctorQualification: doctor.qualification || '',
      requestReason: reason.trim(),
      requestedByUid: requestedByUid || admin.uid,
      approvedByAdminUid: initialStatus === 'active' ? admin.uid : undefined,
      approvedByAdminName: initialStatus === 'active' ? adminName : undefined,
      approvedAt: initialStatus === 'active' ? nowIso : undefined,
      reviewedByAdminUid: admin.uid,
      reviewedAt: nowIso,
      reason: reason.trim(),
      notes: reason.trim(),
      consentBasis,
      consentReference: consentReference?.trim() || '',
      assignedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (shouldUseAdminSandbox(admin)) {
      const store = readLocalStore();
      store.doctorAssignments = [
        record,
        ...store.doctorAssignments.filter((d) => d.id !== id),
      ];
      writeLocalStore(store);
    } else if (isFirebaseConfigured) {
      await setDoc(doc(db, 'doctorAssignments', id), record);
    }

    await this.writeAuditLog(admin, {
      category: 'doctor_patient',
      relationshipId: id,
      patientId: patient.id,
      patientName: patient.name,
      counterpartyId: doctor.id,
      counterpartyName: doctor.name,
      counterpartyRole: 'doctor',
      action: statusActionMap(previousStatus, initialStatus),
      requestedByUid: record.requestedByUid,
      previousStatus,
      newStatus: initialStatus,
      reason: record.reason,
      consentReference: record.consentReference,
    });

    return record;
  },

  async transitionDoctorAssignmentStatus(
    adminUser: AuthUser | null,
    existing: DoctorPatientRelationshipRecord,
    nextStatus: RelationshipStatus,
    reason: string,
    doctorAccountStatus?: string
  ): Promise<DoctorPatientRelationshipRecord> {
    const admin = assertAdminCaller(adminUser);
    const cleanReason = reason.trim();
    if (
      ['rejected', 'additional_info_required', 'suspended', 'revoked'].includes(nextStatus) &&
      !cleanReason
    ) {
      throw new Error('Please enter a reason when rejecting, requesting info, suspending, or revoking.');
    }
    if (nextStatus === 'active' && doctorAccountStatus && doctorAccountStatus !== 'verified') {
      throw new Error('Cannot activate assignment while the doctor credential status is not verified.');
    }

    const nowIso = new Date().toISOString();
    const adminName = admin.displayName || admin.email || admin.uid;
    const prevStatus = existing.status;

    const updated: DoctorPatientRelationshipRecord = {
      ...existing,
      status: nextStatus,
      reviewedByAdminUid: admin.uid,
      reviewedAt: nowIso,
      approvedByAdminUid: nextStatus === 'active' ? admin.uid : existing.approvedByAdminUid,
      approvedByAdminName: nextStatus === 'active' ? adminName : existing.approvedByAdminName,
      approvedAt: nextStatus === 'active' ? nowIso : existing.approvedAt,
      reason: cleanReason || existing.reason || 'Updated by Administrator',
      updatedAt: nowIso,
    };

    if (shouldUseAdminSandbox(admin)) {
      const store = readLocalStore();
      store.doctorAssignments = [
        updated,
        ...store.doctorAssignments.filter((d) => d.id !== existing.id),
      ];
      writeLocalStore(store);
    } else if (isFirebaseConfigured) {
      await updateDoc(doc(db, 'doctorAssignments', existing.id), {
        status: nextStatus,
        reviewedByAdminUid: admin.uid,
        reviewedAt: nowIso,
        approvedByAdminUid: updated.approvedByAdminUid || null,
        approvedByAdminName: updated.approvedByAdminName || null,
        approvedAt: updated.approvedAt || null,
        reason: updated.reason || '',
        updatedAt: nowIso,
      });
    }

    await this.writeAuditLog(admin, {
      category: 'doctor_patient',
      relationshipId: existing.id,
      patientId: existing.patientId,
      patientName: existing.patientName,
      counterpartyId: existing.doctorId,
      counterpartyName: existing.doctorName,
      counterpartyRole: 'doctor',
      action: statusActionMap(prevStatus, nextStatus),
      requestedByUid: existing.requestedByUid,
      previousStatus: prevStatus,
      newStatus: nextStatus,
      reason: cleanReason || updated.reason,
      consentReference: existing.consentReference,
    });

    return updated;
  },

  async reassignPatientDoctor(
    adminUser: AuthUser | null,
    params: {
      previousAssignment: DoctorPatientRelationshipRecord;
      newDoctor: GovernanceUserRecord;
      patient: GovernanceUserRecord;
      reason: string;
      consentBasis?: ConsentBasis;
      consentReference?: string;
    }
  ): Promise<{
    revokedPrevious: DoctorPatientRelationshipRecord;
    activatedNew: DoctorPatientRelationshipRecord;
  }> {
    const admin = assertAdminCaller(adminUser);
    const {
      previousAssignment,
      newDoctor,
      patient,
      reason,
      consentBasis = previousAssignment.consentBasis || 'patient_informed_consent',
      consentReference = previousAssignment.consentReference,
    } = params;

    if (newDoctor.id === previousAssignment.doctorId) {
      throw new Error('Please choose a different verified doctor for reassignment.');
    }
    if (newDoctor.role !== 'doctor' || newDoctor.status !== 'verified') {
      throw new Error('Replacement clinician must be a verified, approved doctor.');
    }
    const cleanReason = reason.trim();
    if (!cleanReason) {
      throw new Error('Please provide a reason for reassigning the patient.');
    }

    const revokedPrevious = await this.transitionDoctorAssignmentStatus(
      admin,
      previousAssignment,
      'revoked',
      `Reassigned to ${newDoctor.name}: ${cleanReason}`
    );

    const activatedNew = await this.createOrUpdateDoctorAssignment(admin, {
      doctor: newDoctor,
      patient,
      relationshipType: previousAssignment.relationshipType || 'primary_clinician',
      initialStatus: 'active',
      reason: cleanReason,
      consentBasis,
      consentReference,
      requestedByUid: admin.uid,
    });

    await this.writeAuditLog(admin, {
      category: 'doctor_patient',
      relationshipId: activatedNew.id,
      patientId: patient.id,
      patientName: patient.name,
      counterpartyId: newDoctor.id,
      counterpartyName: newDoctor.name,
      counterpartyRole: 'doctor',
      action: 'DOCTOR_REASSIGNED',
      requestedByUid: admin.uid,
      previousStatus: 'none',
      newStatus: 'active',
      reason: `Replaced ${previousAssignment.doctorName || previousAssignment.doctorId}: ${cleanReason}`,
      consentReference,
    });

    return { revokedPrevious, activatedNew };
  },

  async createOrUpdateCaregiverConnection(
    adminUser: AuthUser | null,
    params: {
      caregiver: GovernanceUserRecord;
      patient: GovernanceUserRecord;
      relationshipType: string;
      initialStatus: 'pending' | 'active';
      consentBasis: ConsentBasis;
      consentReference?: string;
      permissions: CaregiverRelationshipPermissions;
      reason: string;
      requestedByUid?: string;
      previousStatus?: RelationshipStatus | 'none';
    }
  ): Promise<CaregiverPatientRelationshipRecord> {
    const admin = assertAdminCaller(adminUser);
    const {
      caregiver,
      patient,
      relationshipType,
      initialStatus,
      consentBasis,
      consentReference,
      permissions,
      reason,
      requestedByUid,
      previousStatus = 'none',
    } = params;

    if (caregiver.role !== 'caregiver') {
      throw new Error('Selected caregiver account must have the Caregiver role.');
    }
    if (patient.role !== 'patient') {
      throw new Error('Selected patient account must have the Patient role.');
    }
    if (!reason.trim()) {
      throw new Error('A review justification or connection reason is required.');
    }
    if (consentBasis === 'legal_representative_authorization' && !consentReference?.trim()) {
      throw new Error(
        'Documented legal or representative authorisation reference is required when patient cannot provide informed consent.'
      );
    }

    const nowIso = new Date().toISOString();
    const id = `${caregiver.id}_${patient.id}`;
    const adminName = admin.displayName || admin.email || admin.uid;

    const record: CaregiverPatientRelationshipRecord = {
      id,
      caregiverId: caregiver.id,
      patientId: patient.id,
      relationshipType: relationshipType.trim() || 'family_member',
      status: initialStatus,
      permissions,
      patientName: patient.name,
      patientEmail: patient.email,
      caregiverName: caregiver.name,
      caregiverEmail: caregiver.email,
      requestReason: reason.trim(),
      requestedByUid: requestedByUid || admin.uid,
      approvedByAdminUid: initialStatus === 'active' ? admin.uid : undefined,
      approvedByAdminName: initialStatus === 'active' ? adminName : undefined,
      approvedAt: initialStatus === 'active' ? nowIso : undefined,
      reviewedByAdminUid: admin.uid,
      reviewedAt: nowIso,
      reason: reason.trim(),
      consentBasis,
      consentReference: consentReference?.trim() || '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (shouldUseAdminSandbox(admin)) {
      const store = readLocalStore();
      store.caregiverRelationships = [
        record,
        ...store.caregiverRelationships.filter((c) => c.id !== id),
      ];
      writeLocalStore(store);
    } else if (isFirebaseConfigured) {
      await setDoc(doc(db, 'relationships', id), {
        ...record,
        canReadCalendar: permissions.canReadCalendar,
        canCreateCalendarEvents: permissions.canCreateCalendarEvents,
        canEditCalendarEvents: permissions.canEditCalendarEvents,
        canDeleteCalendarEvents: permissions.canDeleteCalendarEvents,
      });
    }

    await this.writeAuditLog(admin, {
      category: 'caregiver_patient',
      relationshipId: id,
      patientId: patient.id,
      patientName: patient.name,
      counterpartyId: caregiver.id,
      counterpartyName: caregiver.name,
      counterpartyRole: 'caregiver',
      action: statusActionMap(previousStatus, initialStatus),
      requestedByUid: record.requestedByUid,
      previousStatus,
      newStatus: initialStatus,
      reason: record.reason,
      consentReference: record.consentReference,
    });

    return record;
  },

  async transitionCaregiverConnectionStatus(
    adminUser: AuthUser | null,
    existing: CaregiverPatientRelationshipRecord,
    nextStatus: RelationshipStatus,
    reason: string,
    updatedPermissions?: CaregiverRelationshipPermissions
  ): Promise<CaregiverPatientRelationshipRecord> {
    const admin = assertAdminCaller(adminUser);
    const cleanReason = reason.trim();
    if (
      ['rejected', 'additional_info_required', 'suspended', 'revoked'].includes(nextStatus) &&
      !cleanReason
    ) {
      throw new Error('Please enter a reason when rejecting, requesting info, suspending, or revoking.');
    }

    const nowIso = new Date().toISOString();
    const adminName = admin.displayName || admin.email || admin.uid;
    const prevStatus = existing.status;
    const nextPermissions = updatedPermissions || existing.permissions;

    const updated: CaregiverPatientRelationshipRecord = {
      ...existing,
      status: nextStatus,
      permissions: nextPermissions,
      reviewedByAdminUid: admin.uid,
      reviewedAt: nowIso,
      approvedByAdminUid: nextStatus === 'active' ? admin.uid : existing.approvedByAdminUid,
      approvedByAdminName: nextStatus === 'active' ? adminName : existing.approvedByAdminName,
      approvedAt: nextStatus === 'active' ? nowIso : existing.approvedAt,
      reason: cleanReason || existing.reason || 'Updated by Administrator',
      updatedAt: nowIso,
    };

    if (shouldUseAdminSandbox(admin)) {
      const store = readLocalStore();
      store.caregiverRelationships = [
        updated,
        ...store.caregiverRelationships.filter((c) => c.id !== existing.id),
      ];
      writeLocalStore(store);
    } else if (isFirebaseConfigured) {
      await updateDoc(doc(db, 'relationships', existing.id), {
        status: nextStatus,
        permissions: nextPermissions,
        canReadCalendar: nextPermissions.canReadCalendar,
        canCreateCalendarEvents: nextPermissions.canCreateCalendarEvents,
        canEditCalendarEvents: nextPermissions.canEditCalendarEvents,
        canDeleteCalendarEvents: nextPermissions.canDeleteCalendarEvents,
        reviewedByAdminUid: admin.uid,
        reviewedAt: nowIso,
        approvedByAdminUid: updated.approvedByAdminUid || null,
        approvedByAdminName: updated.approvedByAdminName || null,
        approvedAt: updated.approvedAt || null,
        reason: updated.reason || '',
        updatedAt: nowIso,
      });
    }

    await this.writeAuditLog(admin, {
      category: 'caregiver_patient',
      relationshipId: existing.id,
      patientId: existing.patientId,
      patientName: existing.patientName,
      counterpartyId: existing.caregiverId,
      counterpartyName: existing.caregiverName,
      counterpartyRole: 'caregiver',
      action:
        prevStatus === nextStatus && updatedPermissions
          ? 'PERMISSIONS_UPDATED'
          : statusActionMap(prevStatus, nextStatus),
      requestedByUid: existing.requestedByUid,
      previousStatus: prevStatus,
      newStatus: nextStatus,
      reason: cleanReason || updated.reason,
      consentReference: existing.consentReference,
    });

    return updated;
  },

  async fetchPatientCareTeam(
    patientId: string,
    callerUser?: AuthUser | null
  ): Promise<{
    assignedDoctors: DoctorPatientRelationshipRecord[];
    connectedCaregivers: CaregiverPatientRelationshipRecord[];
    pendingReports: RelationshipRemovalRequestRecord[];
  }> {
    if (!patientId) {
      return { assignedDoctors: [], connectedCaregivers: [], pendingReports: [] };
    }

    if (shouldUseRelationshipSandbox(callerUser) && isExplicitLocalDemo()) {
      const store = readLocalStore();
      const targetIds = patientId === 'demo-patient-001' ? ['demo-patient-001', 'usr-001'] : [patientId];
      const assignedDoctors = store.doctorAssignments.filter(
        (d) => targetIds.includes(d.patientId) && isRelationshipActive(d.status)
      );
      const connectedCaregivers = store.caregiverRelationships.filter(
        (c) => targetIds.includes(c.patientId) && isRelationshipActive(c.status)
      );
      const pendingReports = store.removalRequests.filter(
        (r) => targetIds.includes(r.patientId) && r.status === 'pending'
      );
      return { assignedDoctors, connectedCaregivers, pendingReports };
    }

    if (!isFirebaseConfigured) {
      return { assignedDoctors: [], connectedCaregivers: [], pendingReports: [] };
    }

    const [docSnap, cgSnap, reqSnap] = await Promise.all([
      getDocs(query(collection(db, 'doctorAssignments'), where('patientId', '==', patientId))).catch(
        () => null
      ),
      getDocs(query(collection(db, 'relationships'), where('patientId', '==', patientId))).catch(
        () => null
      ),
      getDocs(query(collection(db, 'relationshipRequests'), where('patientId', '==', patientId))).catch(
        () => null
      ),
    ]);

    const rawDoctors = docSnap
      ? docSnap.docs
          .map((d) => mapDoctorAssignmentDoc(d.id, d.data() || {}))
          .filter((r) => isRelationshipActive(r.status))
      : [];

    // Enrich missing doctor metadata via permitted read of users/{doctorId}
    const assignedDoctors = await Promise.all(
      rawDoctors.map(async (item) => {
        if (item.doctorName && item.doctorSpecialty) return item;
        try {
          const uSnap = await getDoc(doc(db, 'users', item.doctorId));
          if (uSnap.exists()) {
            const u = uSnap.data() || {};
            return {
              ...item,
              doctorName: item.doctorName || u.displayName || u.email,
              doctorEmail: item.doctorEmail || u.email,
              doctorSpecialty: item.doctorSpecialty || u.specialty,
              doctorHospital: item.doctorHospital || u.hospital,
              doctorLicenseNumber: item.doctorLicenseNumber || u.licenseNumber,
              doctorQualification: item.doctorQualification || u.qualification,
            };
          }
        } catch {
          // Graceful fallback if rules do not expose doctor profile
        }
        return item;
      })
    );

    const rawCaregivers = cgSnap
      ? cgSnap.docs
          .map((d) => mapCaregiverRelationshipDoc(d.id, d.data() || {}))
          .filter((r) => isRelationshipActive(r.status))
      : [];

    const connectedCaregivers = await Promise.all(
      rawCaregivers.map(async (item) => {
        if (item.caregiverName) return item;
        try {
          const uSnap = await getDoc(doc(db, 'users', item.caregiverId));
          if (uSnap.exists()) {
            const u = uSnap.data() || {};
            return {
              ...item,
              caregiverName: item.caregiverName || u.displayName || u.email,
              caregiverEmail: item.caregiverEmail || u.email,
            };
          }
        } catch {
          // Fallback safely
        }
        return item;
      })
    );

    const pendingReports = reqSnap
      ? reqSnap.docs
          .map((d) => ({ ...(d.data() as RelationshipRemovalRequestRecord), id: d.id }))
          .filter((r) => r.status === 'pending')
      : [];

    return { assignedDoctors, connectedCaregivers, pendingReports };
  },

  async fetchActiveAssignmentsForDoctor(
    doctorId: string,
    callerUser?: AuthUser | null
  ): Promise<DoctorPatientRelationshipRecord[]> {
    if (!doctorId) return [];

    if (shouldUseRelationshipSandbox(callerUser) && isExplicitLocalDemo()) {
      const store = readLocalStore();
      return store.doctorAssignments.filter(
        (d) => d.doctorId === doctorId && isRelationshipActive(d.status)
      );
    }

    if (!isFirebaseConfigured) return [];

    const snap = await getDocs(
      query(
        collection(db, 'doctorAssignments'),
        where('doctorId', '==', doctorId),
        where('status', '==', 'active')
      )
    );

    const records = snap.docs
      .map((d) => mapDoctorAssignmentDoc(d.id, d.data() || {}))
      .filter((r) => isRelationshipActive(r.status));

    return await Promise.all(
      records.map(async (rec) => {
        if (rec.patientName) return rec;
        try {
          const pSnap = await getDoc(doc(db, 'users', rec.patientId));
          if (pSnap.exists()) {
            const p = pSnap.data() || {};
            return {
              ...rec,
              patientName: p.displayName || p.email || rec.patientId,
              patientEmail: p.email,
            };
          }
        } catch {
          // Preserve baseline record if profile read fails
        }
        return rec;
      })
    );
  },

  async fetchAuthorizedCaregiversForPatient(
    patientId: string,
    callerUser?: AuthUser | null
  ): Promise<CaregiverPatientRelationshipRecord[]> {
    if (!patientId) return [];

    if (shouldUseRelationshipSandbox(callerUser) && isExplicitLocalDemo()) {
      const store = readLocalStore();
      const targetIds = patientId === 'demo-patient-001' ? ['demo-patient-001', 'usr-001'] : [patientId];
      return store.caregiverRelationships.filter(
        (c) => targetIds.includes(c.patientId) && isRelationshipActive(c.status)
      );
    }

    if (!isFirebaseConfigured) return [];

    try {
      const snap = await getDocs(
        query(
          collection(db, 'relationships'),
          where('patientId', '==', patientId),
          where('status', '==', 'active')
        )
      );
      return snap.docs
        .map((d) => mapCaregiverRelationshipDoc(d.id, d.data() || {}))
        .filter((r) => isRelationshipActive(r.status));
    } catch {
      return [];
    }
  },

  async fetchActiveConnectionsForCaregiver(
    caregiverId: string,
    callerUser?: AuthUser | null
  ): Promise<CaregiverPatientRelationshipRecord[]> {
    if (!caregiverId) return [];

    if (shouldUseRelationshipSandbox(callerUser) && isExplicitLocalDemo()) {
      const store = readLocalStore();
      return store.caregiverRelationships.filter(
        (c) => c.caregiverId === caregiverId && isRelationshipActive(c.status)
      );
    }

    if (!isFirebaseConfigured) return [];

    const snap = await getDocs(
      query(
        collection(db, 'relationships'),
        where('caregiverId', '==', caregiverId),
        where('status', '==', 'active')
      )
    );

    const records = snap.docs
      .map((d) => mapCaregiverRelationshipDoc(d.id, d.data() || {}))
      .filter((r) => isRelationshipActive(r.status));

    return await Promise.all(
      records.map(async (rec) => {
        if (rec.patientName) return rec;
        try {
          const pSnap = await getDoc(doc(db, 'users', rec.patientId));
          if (pSnap.exists()) {
            const p = pSnap.data() || {};
            return {
              ...rec,
              patientName: p.displayName || p.email || rec.patientId,
              patientEmail: p.email,
            };
          }
        } catch {
          // Keep existing summary
        }
        return rec;
      })
    );
  },

  async submitPatientRemovalReport(
    patientUser: AuthUser | null,
    params: {
      relationshipId: string;
      category: RelationshipCategory;
      counterpartyId: string;
      counterpartyName?: string;
      counterpartyRole: 'doctor' | 'caregiver';
      reason: string;
    }
  ): Promise<RelationshipRemovalRequestRecord> {
    if (!patientUser?.uid) {
      throw new Error('Authentication required to report a connection.');
    }
    const cleanReason = params.reason.trim();
    if (!cleanReason) {
      throw new Error('Please explain why you are reporting or requesting removal of this connection.');
    }
    const nowIso = new Date().toISOString();
    const record: RelationshipRemovalRequestRecord = {
      id: `rel-req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      relationshipId: params.relationshipId,
      category: params.category,
      patientId: patientUser.uid,
      patientName: patientUser.displayName || patientUser.email || patientUser.uid,
      counterpartyId: params.counterpartyId,
      counterpartyName: params.counterpartyName,
      counterpartyRole: params.counterpartyRole,
      requestType: 'incorrect_connection_report',
      reason: cleanReason,
      requesterUid: patientUser.uid,
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (shouldUseRelationshipSandbox(patientUser) && isExplicitLocalDemo()) {
      const store = readLocalStore();
      store.removalRequests = [record, ...store.removalRequests];
      writeLocalStore(store);
      return record;
    }

    if (isFirebaseConfigured) {
      await setDoc(doc(db, 'relationshipRequests', record.id), record);
    }

    return record;
  },

  async resolveRemovalRequest(
    adminUser: AuthUser | null,
    report: RelationshipRemovalRequestRecord,
    action: 'approve_removal' | 'dismiss',
    resolutionNote: string,
    existingDoctorAssignments: DoctorPatientRelationshipRecord[],
    existingCaregiverRelationships: CaregiverPatientRelationshipRecord[]
  ): Promise<RelationshipRemovalRequestRecord> {
    const admin = assertAdminCaller(adminUser);
    const cleanNote = resolutionNote.trim();
    if (!cleanNote) {
      throw new Error('Please enter an administrative resolution note.');
    }

    const nowIso = new Date().toISOString();
    if (action === 'approve_removal') {
      if (report.category === 'doctor_patient') {
        const target = existingDoctorAssignments.find((d) => d.id === report.relationshipId);
        if (target && target.status !== 'revoked') {
          await this.transitionDoctorAssignmentStatus(
            admin,
            target,
            'revoked',
            `Removed per patient report: ${cleanNote}`
          );
        }
      } else {
        const target = existingCaregiverRelationships.find((c) => c.id === report.relationshipId);
        if (target && target.status !== 'revoked') {
          await this.transitionCaregiverConnectionStatus(
            admin,
            target,
            'revoked',
            `Removed per patient report: ${cleanNote}`
          );
        }
      }
    }

    const updated: RelationshipRemovalRequestRecord = {
      ...report,
      status: action === 'approve_removal' ? 'resolved' : 'dismissed',
      adminResolutionNote: cleanNote,
      resolvedByAdminUid: admin.uid,
      resolvedAt: nowIso,
      updatedAt: nowIso,
    };

    if (shouldUseAdminSandbox(admin)) {
      const store = readLocalStore();
      store.removalRequests = store.removalRequests.map((r) =>
        r.id === report.id ? updated : r
      );
      writeLocalStore(store);
    } else if (isFirebaseConfigured) {
      await updateDoc(doc(db, 'relationshipRequests', report.id), {
        status: updated.status,
        adminResolutionNote: cleanNote,
        resolvedByAdminUid: admin.uid,
        resolvedAt: nowIso,
        updatedAt: nowIso,
      });
    }

    await this.writeAuditLog(admin, {
      category: report.category,
      relationshipId: report.relationshipId,
      patientId: report.patientId,
      patientName: report.patientName,
      counterpartyId: report.counterpartyId,
      counterpartyName: report.counterpartyName,
      counterpartyRole: report.counterpartyRole,
      action: 'REMOVAL_REPORT_RESOLVED',
      requestedByUid: report.requesterUid,
      previousStatus: action === 'approve_removal' ? 'active' : 'pending',
      newStatus: action === 'approve_removal' ? 'revoked' : 'active',
      reason: cleanNote,
    });

    return updated;
  },
};
