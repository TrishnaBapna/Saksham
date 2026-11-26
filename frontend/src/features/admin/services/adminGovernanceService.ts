import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import {
  AccountStatus,
  AuthUser,
  DoctorVerificationStatus,
  UserRole,
  VerificationHistoryEntry,
} from '../../auth/types/auth.types.js';
import { isLocalDemoEnvironment } from '../../auth/services/identityService.js';
import {
  getLocalRegistryOverrides,
  saveLocalRegistryOverride,
} from '../../auth/services/doctorCredentialService.js';
import {
  normalizeAccountStatus,
  toDoctorVerificationStatus,
} from '../../auth/services/roleDiagnosticService.js';

export interface GovernanceUserRecord {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  verificationStatus?: DoctorVerificationStatus;
  phoneNumber?: string;
  qualification?: string;
  licenseNumber?: string;
  registrationAuthority?: string;
  specialty?: string;
  hospital?: string;
  verificationDocumentName?: string;
  verificationDocumentUrl?: string;
  verificationDocumentStatus?: 'uploaded' | 'storage_rules_pending' | 'not_provided';
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  applicantResponseNote?: string;
  resubmittedAt?: string;
  verificationHistory?: VerificationHistoryEntry[];
  joined: string;
  createdAt?: string;
}

export interface GovernanceDoctorAssignment {
  id: string;
  doctorId: string;
  patientId: string;
  status: 'active' | 'revoked' | 'pending';
  assignedAt: string;
  notes?: string;
}

export interface GovernanceAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  result: string;
  note?: string;
}

const LOCAL_ASSIGNMENTS_KEY = 'saksham_local_admin_assignments';
const LOCAL_AUDIT_KEY = 'saksham_local_admin_audit_logs';

export const isSandboxGovernanceUser = (user?: AuthUser | null): boolean => {
  if (!user?.uid) return true;
  return user.uid.startsWith('demo-') || user.uid === 'admin-demo-01';
};

export const shouldUseAdminSandbox = (user?: AuthUser | null): boolean => {
  if (!isFirebaseConfigured) return true;
  if (!isLocalDemoEnvironment()) return false;
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
  return isSandboxGovernanceUser(user);
};

const DEFAULT_DEMO_USERS: GovernanceUserRecord[] = [
  {
    id: 'usr-001',
    uid: 'usr-001',
    name: 'Sunita Sharma',
    email: 'sunita.sharma@saksham.care',
    role: 'patient',
    status: 'verified',
    joined: 'Oct 12, 2026',
    createdAt: '2026-10-12T08:00:00.000Z',
  },
  {
    id: 'usr-002',
    uid: 'usr-002',
    name: 'Ananya Sharma',
    email: 'ananya.sharma@saksham.care',
    role: 'caregiver',
    status: 'verified',
    joined: 'Oct 14, 2026',
    createdAt: '2026-10-14T08:00:00.000Z',
  },
  {
    id: 'usr-003',
    uid: 'usr-003',
    name: 'Dr. Raman Verma',
    email: 'dr.raman.verma@saksham.care',
    role: 'doctor',
    status: 'verified',
    verificationStatus: 'APPROVED',
    phoneNumber: '+91 98110 22334',
    qualification: 'MBBS, MD, DM (Neurology)',
    licenseNumber: 'NMC-DL-2015-4410',
    registrationAuthority: 'National Medical Commission (Delhi)',
    specialty: 'Memory Disorders & Neurology',
    hospital: 'Saksham Partner Neuro Clinic',
    verificationDocumentName: 'NMC_Registration_Verma.pdf',
    verificationDocumentStatus: 'uploaded',
    reviewedBy: 'System Security Administrator',
    reviewedAt: '2026-10-15T10:00:00.000Z',
    verificationHistory: [
      {
        status: 'APPROVED',
        accountStatus: 'verified',
        timestamp: '2026-10-15T10:00:00.000Z',
        reviewedByName: 'System Security Administrator',
        note: 'Verified active neurology registration with Delhi Medical Council.',
      },
    ],
    joined: 'Oct 15, 2026',
    createdAt: '2026-10-15T09:00:00.000Z',
  },
  {
    id: 'doc-pending-01',
    uid: 'doc-pending-01',
    name: 'Dr. Neha Sen',
    email: 'doctor.pending@saksham.care',
    role: 'doctor',
    status: 'pending',
    verificationStatus: 'PENDING_VERIFICATION',
    phoneNumber: '+91 98301 55210',
    qualification: 'MBBS, MD (Geriatric Medicine)',
    licenseNumber: 'WBMC-2021-8891',
    registrationAuthority: 'West Bengal Medical Council',
    specialty: 'Cognitive Care & Geriatrics',
    hospital: 'Kolkata Neuro Wellness Centre',
    verificationDocumentName: 'WBMC_License_Sen.pdf',
    verificationDocumentStatus: 'uploaded',
    verificationHistory: [
      {
        status: 'PENDING_VERIFICATION',
        accountStatus: 'pending',
        timestamp: '2026-11-20T09:30:00.000Z',
        note: 'Application submitted for administrative credential review.',
      },
    ],
    joined: 'Nov 20, 2026',
    createdAt: '2026-11-20T09:30:00.000Z',
  },
  {
    id: 'usr-004',
    uid: 'usr-004',
    name: 'Rohan Mehta',
    email: 'rohan.mehta@care.org',
    role: 'caregiver',
    status: 'pending',
    joined: 'Nov 02, 2026',
    createdAt: '2026-11-02T09:00:00.000Z',
  },
];

const DEFAULT_DEMO_ASSIGNMENTS: GovernanceDoctorAssignment[] = [
  {
    id: 'usr-003_usr-001',
    doctorId: 'usr-003',
    patientId: 'usr-001',
    status: 'active',
    assignedAt: '2026-10-16T08:00:00.000Z',
    notes: 'Primary cognitive neurology supervision',
  },
];

const DEFAULT_DEMO_AUDIT: GovernanceAuditEntry[] = [
  {
    id: 'log-101',
    timestamp: 'Today at 09:42 AM',
    actor: 'caregiver-demo-01',
    action: 'LOCATION_ACCESS_CHECK',
    resource: 'patients/patient-demo-01',
    result: 'PERMITTED_WITH_CONSENT',
  },
  {
    id: 'log-102',
    timestamp: 'Today at 08:32 AM',
    actor: 'patient-demo-01',
    action: 'ROUTINE_COMPLETION',
    resource: 'routines/routine-01',
    result: 'SUCCESS',
  },
  {
    id: 'log-103',
    timestamp: 'Yesterday at 05:15 PM',
    actor: 'admin-demo-01',
    action: 'DOCTOR_CREDENTIAL_VERIFIED',
    resource: 'users/usr-003',
    result: 'APPROVED',
  },
  {
    id: 'log-104',
    timestamp: 'Nov 03 at 11:20 AM',
    actor: 'unauth-client',
    action: 'DIRECT_FIRESTORE_WRITE',
    resource: 'auditLogs/any',
    result: 'BLOCKED_BY_SECURITY_RULES',
  },
];

export const mapDecisionToAccountStatus = (
  decision: DoctorVerificationStatus
): AccountStatus => {
  switch (decision) {
    case 'APPROVED':
      return 'verified';
    case 'REJECTED':
      return 'rejected';
    case 'ADDITIONAL_INFORMATION_REQUIRED':
      return 'additional_info_required';
    case 'SUSPENDED':
      return 'suspended';
    case 'PENDING_VERIFICATION':
    default:
      return 'pending';
  }
};

const readLocalJson = <T,>(key: string, fallback: T): T => {
  if (!isLocalDemoEnvironment()) return fallback;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    }
  } catch {
    // Ignore storage read error
  }
  return fallback;
};

const writeLocalJson = <T,>(key: string, val: T): void => {
  if (!isLocalDemoEnvironment()) return;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(val));
    }
  } catch {
    // Ignore storage write error
  }
};

const appendLocalAuditLog = (entry: GovernanceAuditEntry): void => {
  if (!isLocalDemoEnvironment()) return;
  const current = readLocalJson<GovernanceAuditEntry[]>(LOCAL_AUDIT_KEY, DEFAULT_DEMO_AUDIT);
  writeLocalJson(LOCAL_AUDIT_KEY, [entry, ...current]);
};

const assertAdminCaller = (adminUser: AuthUser | null): AuthUser => {
  if (!adminUser || adminUser.role !== 'admin') {
    throw new Error('Administrator authorization is required to perform this action.');
  }
  if (adminUser.status !== 'verified') {
    throw new Error('Administrator account must be verified and active.');
  }
  return adminUser;
};

const formatDateLabel = (raw: any): string => {
  if (!raw) return '';
  try {
    if (typeof raw?.toDate === 'function') {
      return raw.toDate().toLocaleDateString();
    }
    const parsed = new Date(String(raw));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString();
    }
  } catch {
    // Fallback below
  }
  return String(raw);
};

export const AdminGovernanceService = {
  async fetchGovernanceData(callerUser?: AuthUser | null): Promise<{
    users: GovernanceUserRecord[];
    assignments: GovernanceDoctorAssignment[];
    auditLogs: GovernanceAuditEntry[];
  }> {
    if (shouldUseAdminSandbox(callerUser)) {
      const overrides = getLocalRegistryOverrides();
      const mergedMap = new Map<string, GovernanceUserRecord>();

      for (const u of DEFAULT_DEMO_USERS) {
        mergedMap.set(u.id, u);
      }

      for (const ov of Object.values(overrides)) {
        if (ov.deletedFromRegistry) {
          mergedMap.delete(ov.uid);
          continue;
        }
        const existing = mergedMap.get(ov.uid);
        mergedMap.set(ov.uid, {
          id: ov.uid,
          uid: ov.uid,
          name: ov.displayName || existing?.name || ov.email || ov.uid,
          email: ov.email || existing?.email || '',
          role: ov.role || existing?.role || 'patient',
          status: normalizeAccountStatus(ov.status, ov.verificationStatus),
          verificationStatus:
            ov.verificationStatus ||
            (ov.role === 'doctor' || existing?.role === 'doctor'
              ? toDoctorVerificationStatus(normalizeAccountStatus(ov.status, ov.verificationStatus))
              : undefined),
          phoneNumber: ov.phoneNumber || existing?.phoneNumber,
          qualification: ov.qualification || existing?.qualification,
          licenseNumber: ov.licenseNumber || existing?.licenseNumber,
          registrationAuthority: ov.registrationAuthority || existing?.registrationAuthority,
          specialty: ov.specialty || existing?.specialty,
          hospital: ov.hospital || existing?.hospital,
          verificationDocumentName: ov.verificationDocumentName || existing?.verificationDocumentName,
          verificationDocumentUrl: ov.verificationDocumentUrl || existing?.verificationDocumentUrl,
          verificationDocumentStatus:
            ov.verificationDocumentStatus || existing?.verificationDocumentStatus,
          reviewNotes: ov.reviewNotes ?? existing?.reviewNotes,
          reviewedBy: ov.reviewedBy ?? existing?.reviewedBy,
          reviewedAt: ov.reviewedAt ?? existing?.reviewedAt,
          applicantResponseNote: ov.applicantResponseNote ?? existing?.applicantResponseNote,
          resubmittedAt: ov.resubmittedAt ?? existing?.resubmittedAt,
          verificationHistory: ov.verificationHistory || existing?.verificationHistory,
          joined: formatDateLabel(ov.createdAt) || existing?.joined || 'Recent',
          createdAt: ov.createdAt || existing?.createdAt,
        });
      }

      const assignments = readLocalJson<GovernanceDoctorAssignment[]>(
        LOCAL_ASSIGNMENTS_KEY,
        DEFAULT_DEMO_ASSIGNMENTS
      );
      const auditLogs = readLocalJson<GovernanceAuditEntry[]>(LOCAL_AUDIT_KEY, DEFAULT_DEMO_AUDIT);

      return {
        users: Array.from(mergedMap.values()),
        assignments,
        auditLogs,
      };
    }

    if (!isFirebaseConfigured) {
      return { users: [], assignments: [], auditLogs: [] };
    }

    const usersSnap = await getDocs(collection(db, 'users'));
    const fetchedUsers: GovernanceUserRecord[] = usersSnap.docs.map((d) => {
      const data = d.data() || {};
      const roleRaw = typeof data.role === 'string' ? data.role.trim().toLowerCase() : 'patient';
      const role: UserRole =
        roleRaw === 'admin' || roleRaw === 'doctor' || roleRaw === 'caregiver' || roleRaw === 'patient'
          ? roleRaw
          : 'patient';
      const status = normalizeAccountStatus(data.status, data.verificationStatus);
      return {
        id: d.id,
        uid: data.uid || d.id,
        name: String(data.displayName || data.email || d.id),
        email: String(data.email || ''),
        role,
        status,
        verificationStatus:
          data.verificationStatus ||
          (role === 'doctor' ? toDoctorVerificationStatus(status) : undefined),
        phoneNumber: data.phoneNumber || undefined,
        qualification: data.qualification || undefined,
        licenseNumber: data.licenseNumber || undefined,
        registrationAuthority: data.registrationAuthority || undefined,
        specialty: data.specialty || undefined,
        hospital: data.hospital || undefined,
        verificationDocumentName: data.verificationDocumentName || undefined,
        verificationDocumentUrl: data.verificationDocumentUrl || undefined,
        verificationDocumentStatus: data.verificationDocumentStatus || undefined,
        reviewNotes: data.reviewNotes || undefined,
        reviewedBy: data.reviewedBy || undefined,
        reviewedAt: formatDateLabel(data.reviewedAt) ? String(data.reviewedAt) : undefined,
        applicantResponseNote: data.applicantResponseNote || undefined,
        resubmittedAt: data.resubmittedAt || undefined,
        verificationHistory: Array.isArray(data.verificationHistory)
          ? data.verificationHistory
          : undefined,
        joined: formatDateLabel(data.createdAt),
        createdAt:
          typeof data.createdAt?.toDate === 'function'
            ? data.createdAt.toDate().toISOString()
            : typeof data.createdAt === 'string'
            ? data.createdAt
            : undefined,
      };
    });

    let fetchedAssignments: GovernanceDoctorAssignment[] = [];
    try {
      const assignSnap = await getDocs(collection(db, 'doctorAssignments'));
      fetchedAssignments = assignSnap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          doctorId: String(data.doctorId || ''),
          patientId: String(data.patientId || ''),
          status:
            data.status === 'active' || data.status === 'revoked' || data.status === 'pending'
              ? data.status
              : 'pending',
          assignedAt:
            typeof data.assignedAt?.toDate === 'function'
              ? data.assignedAt.toDate().toISOString()
              : String(data.assignedAt || ''),
          notes: data.notes ? String(data.notes) : undefined,
        };
      });
    } catch {
      fetchedAssignments = [];
    }

    let fetchedLogs: GovernanceAuditEntry[] = [];
    try {
      const auditSnap = await getDocs(collection(db, 'auditLogs'));
      fetchedLogs = auditSnap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          timestamp: String(data.timestamp || ''),
          actor: String(data.actorUid || data.actor || ''),
          action: String(data.action || ''),
          resource: String(data.targetResource || data.resource || ''),
          result: String(data.result || 'LOGGED'),
        };
      });
    } catch {
      fetchedLogs = [];
    }

    // Derive review audit entries from verificationHistory across doctors when server /auditLogs are client-locked
    const historyAuditEntries: GovernanceAuditEntry[] = [];
    for (const u of fetchedUsers) {
      if (u.verificationHistory && u.verificationHistory.length > 0) {
        for (let idx = 0; idx < u.verificationHistory.length; idx++) {
          const entry = u.verificationHistory[idx];
          historyAuditEntries.push({
            id: `hist-${u.id}-${idx}`,
            timestamp: entry.timestamp,
            actor: entry.reviewedByName || entry.reviewedByUid || u.email,
            action: `DOCTOR_VERIFICATION_${entry.status}`,
            resource: `users/${u.id}`,
            result: entry.status,
            note: entry.note,
          });
        }
      }
    }

    const mergedLogs = [...historyAuditEntries, ...fetchedLogs].sort((a, b) =>
      String(b.timestamp || '').localeCompare(String(a.timestamp || ''))
    );

    return {
      users: fetchedUsers,
      assignments: fetchedAssignments,
      auditLogs: mergedLogs,
    };
  },

  async reviewDoctorApplication(
    adminUser: AuthUser | null,
    targetDoctor: GovernanceUserRecord,
    decision: DoctorVerificationStatus,
    reviewNote: string
  ): Promise<GovernanceUserRecord> {
    const admin = assertAdminCaller(adminUser);
    const trimmedNote = reviewNote.trim();

    if (
      (decision === 'REJECTED' || decision === 'ADDITIONAL_INFORMATION_REQUIRED') &&
      !trimmedNote
    ) {
      throw new Error(
        'A review note explaining the reason or requested information is required.'
      );
    }

    const nextStatus = mapDecisionToAccountStatus(decision);
    const nowIso = new Date().toISOString();
    const reviewerLabel = admin.displayName || admin.email || admin.uid;

    const nextHistoryEntry: VerificationHistoryEntry = {
      status: decision,
      accountStatus: nextStatus,
      timestamp: nowIso,
      reviewedByUid: admin.uid,
      reviewedByName: reviewerLabel,
      note:
        trimmedNote ||
        (decision === 'APPROVED'
          ? 'Medical license and credentials verified.'
          : undefined),
    };

    const updatedHistory = [
      nextHistoryEntry,
      ...(targetDoctor.verificationHistory || []),
    ];

    if (shouldUseAdminSandbox(admin)) {
      saveLocalRegistryOverride({
        uid: targetDoctor.id,
        email: targetDoctor.email,
        displayName: targetDoctor.name,
        role: 'doctor',
        status: nextStatus,
        verificationStatus: decision,
        reviewNotes: nextHistoryEntry.note,
        reviewedBy: reviewerLabel,
        reviewedAt: nowIso,
        verificationHistory: updatedHistory,
        updatedAt: nowIso,
      });

      appendLocalAuditLog({
        id: `audit-${Date.now()}`,
        timestamp: nowIso,
        actor: admin.uid,
        action: `DOCTOR_VERIFICATION_${decision}`,
        resource: `users/${targetDoctor.id}`,
        result: decision,
        note: nextHistoryEntry.note,
      });

      return {
        ...targetDoctor,
        status: nextStatus,
        verificationStatus: decision,
        reviewNotes: nextHistoryEntry.note,
        reviewedBy: reviewerLabel,
        reviewedAt: nowIso,
        verificationHistory: updatedHistory,
      };
    }

    const updatePayload: Record<string, any> = {
      status: nextStatus,
      verificationStatus: decision,
      reviewNotes: nextHistoryEntry.note || '',
      reviewedBy: reviewerLabel,
      reviewedByUid: admin.uid,
      reviewedAt: nowIso,
      verificationHistory: updatedHistory,
    };

    await updateDoc(doc(db, 'users', targetDoctor.id), updatePayload);

    // Best-effort update to doctorVerifications/{uid} if rules exist
    try {
      await setDoc(
        doc(db, 'doctorVerifications', targetDoctor.id),
        {
          doctorId: targetDoctor.id,
          status: nextStatus,
          verificationStatus: decision,
          reviewNotes: nextHistoryEntry.note || '',
          reviewedBy: reviewerLabel,
          reviewedByUid: admin.uid,
          reviewedAt: nowIso,
          history: updatedHistory,
        },
        { merge: true }
      );
    } catch {
      // Tolerated if doctorVerifications rule is not deployed yet; users/{uid} remains authoritative
    }

    return {
      ...targetDoctor,
      status: nextStatus,
      verificationStatus: decision,
      reviewNotes: nextHistoryEntry.note,
      reviewedBy: reviewerLabel,
      reviewedAt: nowIso,
      verificationHistory: updatedHistory,
    };
  },

  async updateUserAccountStatus(
    adminUser: AuthUser | null,
    targetUser: GovernanceUserRecord,
    nextStatus: 'verified' | 'suspended',
    reason?: string
  ): Promise<GovernanceUserRecord> {
    const admin = assertAdminCaller(adminUser);
    if (targetUser.id === admin.uid) {
      throw new Error('Administrators cannot suspend or deactivate their own active account.');
    }
    if (targetUser.role === 'admin' && nextStatus === 'suspended') {
      throw new Error('System administrator accounts cannot be suspended from the client console.');
    }

    const nowIso = new Date().toISOString();
    const reviewerLabel = admin.displayName || admin.email || admin.uid;
    const verificationStatus: DoctorVerificationStatus | undefined =
      targetUser.role === 'doctor' ? toDoctorVerificationStatus(nextStatus) : undefined;

    const note =
      reason?.trim() ||
      (nextStatus === 'suspended'
        ? 'Account suspended by system administrator.'
        : 'Account verified and activated by system administrator.');

    const updatedHistory =
      targetUser.role === 'doctor' && verificationStatus
        ? [
            {
              status: verificationStatus,
              accountStatus: nextStatus,
              timestamp: nowIso,
              reviewedByUid: admin.uid,
              reviewedByName: reviewerLabel,
              note,
            },
            ...(targetUser.verificationHistory || []),
          ]
        : targetUser.verificationHistory;

    if (shouldUseAdminSandbox(admin)) {
      saveLocalRegistryOverride({
        uid: targetUser.id,
        email: targetUser.email,
        displayName: targetUser.name,
        role: targetUser.role,
        status: nextStatus,
        verificationStatus,
        reviewNotes: note,
        reviewedBy: reviewerLabel,
        reviewedAt: nowIso,
        verificationHistory: updatedHistory,
        updatedAt: nowIso,
      });
      appendLocalAuditLog({
        id: `audit-${Date.now()}`,
        timestamp: nowIso,
        actor: admin.uid,
        action: nextStatus === 'suspended' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_ACTIVATED',
        resource: `users/${targetUser.id}`,
        result: nextStatus.toUpperCase(),
        note,
      });
      return {
        ...targetUser,
        status: nextStatus,
        verificationStatus,
        reviewNotes: note,
        reviewedBy: reviewerLabel,
        reviewedAt: nowIso,
        verificationHistory: updatedHistory,
      };
    }

    const updatePayload: Record<string, any> = {
      status: nextStatus,
      reviewNotes: note,
      reviewedBy: reviewerLabel,
      reviewedAt: nowIso,
    };
    if (verificationStatus) {
      updatePayload.verificationStatus = verificationStatus;
    }
    if (updatedHistory) {
      updatePayload.verificationHistory = updatedHistory;
    }

    await updateDoc(doc(db, 'users', targetUser.id), updatePayload);

    return {
      ...targetUser,
      status: nextStatus,
      verificationStatus,
      reviewNotes: note,
      reviewedBy: reviewerLabel,
      reviewedAt: nowIso,
      verificationHistory: updatedHistory,
    };
  },

  async assignDoctorToPatient(
    adminUser: AuthUser | null,
    doctor: GovernanceUserRecord,
    patient: GovernanceUserRecord,
    notes = 'Assigned via Saksham Admin Governance Hub'
  ): Promise<GovernanceDoctorAssignment> {
    assertAdminCaller(adminUser);
    if (doctor.role !== 'doctor' || doctor.status !== 'verified') {
      throw new Error('Only an approved, verified doctor can be assigned to a patient.');
    }
    if (patient.role !== 'patient') {
      throw new Error('Target user for clinical assignment must have the Patient role.');
    }

    const nowIso = new Date().toISOString();
    const assignmentId = `${doctor.id}_${patient.id}`;
    const record: GovernanceDoctorAssignment = {
      id: assignmentId,
      doctorId: doctor.id,
      patientId: patient.id,
      status: 'active',
      assignedAt: nowIso,
      notes: notes.trim() || 'Primary clinical supervision',
    };

    if (shouldUseAdminSandbox(adminUser)) {
      const current = readLocalJson<GovernanceDoctorAssignment[]>(
        LOCAL_ASSIGNMENTS_KEY,
        DEFAULT_DEMO_ASSIGNMENTS
      );
      const filtered = current.filter((a) => a.id !== assignmentId);
      writeLocalJson(LOCAL_ASSIGNMENTS_KEY, [record, ...filtered]);
      appendLocalAuditLog({
        id: `audit-${Date.now()}`,
        timestamp: nowIso,
        actor: adminUser!.uid,
        action: 'DOCTOR_PATIENT_ASSIGNED',
        resource: `doctorAssignments/${assignmentId}`,
        result: 'ACTIVE',
      });
      return record;
    }

    // Strict adherence to firestore.rules line 711 allowed keys:
    // ['doctorId', 'patientId', 'status', 'assignedAt', 'notes']
    await setDoc(doc(db, 'doctorAssignments', assignmentId), {
      doctorId: doctor.id,
      patientId: patient.id,
      status: 'active',
      assignedAt: nowIso,
      notes: record.notes,
    });

    return record;
  },

  async revokeDoctorAssignment(
    adminUser: AuthUser | null,
    assignment: GovernanceDoctorAssignment
  ): Promise<void> {
    assertAdminCaller(adminUser);
    const nowIso = new Date().toISOString();

    if (shouldUseAdminSandbox(adminUser)) {
      const current = readLocalJson<GovernanceDoctorAssignment[]>(
        LOCAL_ASSIGNMENTS_KEY,
        DEFAULT_DEMO_ASSIGNMENTS
      );
      const next = current.map((a) =>
        a.id === assignment.id ? { ...a, status: 'revoked' as const } : a
      );
      writeLocalJson(LOCAL_ASSIGNMENTS_KEY, next);
      appendLocalAuditLog({
        id: `audit-${Date.now()}`,
        timestamp: nowIso,
        actor: adminUser!.uid,
        action: 'DOCTOR_PATIENT_REVOKED',
        resource: `doctorAssignments/${assignment.id}`,
        result: 'REVOKED',
      });
      return;
    }

    await updateDoc(doc(db, 'doctorAssignments', assignment.id), {
      status: 'revoked',
    });
  },

  async removeUserProfileFromRegistry(
    adminUser: AuthUser | null,
    targetUser: GovernanceUserRecord,
    activeAssignments: GovernanceDoctorAssignment[]
  ): Promise<{ firestoreProfileDeleted: boolean; revokedAssignmentsCount: number }> {
    const admin = assertAdminCaller(adminUser);
    if (targetUser.id === admin.uid) {
      throw new Error('Administrators cannot delete their own active account.');
    }
    if (targetUser.role === 'admin') {
      throw new Error('System administrator accounts cannot be deleted from the client UI.');
    }

    const nowIso = new Date().toISOString();
    const relatedAssignments = activeAssignments.filter(
      (a) =>
        (a.doctorId === targetUser.id || a.patientId === targetUser.id) &&
        a.status === 'active'
    );

    if (shouldUseAdminSandbox(admin)) {
      saveLocalRegistryOverride({
        uid: targetUser.id,
        email: targetUser.email,
        displayName: targetUser.name,
        role: targetUser.role,
        status: 'suspended',
        deletedFromRegistry: true,
        updatedAt: nowIso,
      });

      if (relatedAssignments.length > 0) {
        const current = readLocalJson<GovernanceDoctorAssignment[]>(
          LOCAL_ASSIGNMENTS_KEY,
          DEFAULT_DEMO_ASSIGNMENTS
        );
        const ids = new Set(relatedAssignments.map((a) => a.id));
        writeLocalJson(
          LOCAL_ASSIGNMENTS_KEY,
          current.map((a) => (ids.has(a.id) ? { ...a, status: 'revoked' as const } : a))
        );
      }

      appendLocalAuditLog({
        id: `audit-${Date.now()}`,
        timestamp: nowIso,
        actor: admin.uid,
        action: 'FIRESTORE_PROFILE_REMOVED',
        resource: `users/${targetUser.id}`,
        result: 'PROFILE_DELETED_AUTH_REQUIRES_CONSOLE',
      });

      return {
        firestoreProfileDeleted: true,
        revokedAssignmentsCount: relatedAssignments.length,
      };
    }

    // 1. Delete Firestore `users/{uid}` (explicitly permitted for isAdmin() in firestore.rules)
    await deleteDoc(doc(db, 'users', targetUser.id));

    // 2. Revoke related doctorAssignments
    let revokedCount = 0;
    for (const assign of relatedAssignments) {
      try {
        await updateDoc(doc(db, 'doctorAssignments', assign.id), { status: 'revoked' });
        revokedCount++;
      } catch {
        // Non-blocking cleanup
      }
    }

    // Note: Firebase Auth login deletion is server/Admin-SDK-only on Spark Free and is never faked here.
    return {
      firestoreProfileDeleted: true,
      revokedAssignmentsCount: revokedCount,
    };
  },
};
