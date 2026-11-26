import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, isFirebaseConfigured } from '../../../services/firebase.js';
import {
  AccountStatus,
  DoctorRegistrationData,
  DoctorVerificationStatus,
  VerificationHistoryEntry,
} from '../types/auth.types.js';
import { isLocalDemoEnvironment } from './identityService.js';
import { DEMO_USERS } from './roleService.js';
import { toDoctorVerificationStatus } from './roleDiagnosticService.js';

const LOCAL_REGISTRY_KEY = 'saksham_local_user_registry_overrides';

export interface LocalUserOverride {
  uid: string;
  email: string;
  displayName: string;
  role: 'patient' | 'caregiver' | 'doctor' | 'admin';
  status: AccountStatus;
  phoneNumber?: string;
  qualification?: string;
  licenseNumber?: string;
  registrationAuthority?: string;
  specialty?: string;
  hospital?: string;
  verificationStatus?: DoctorVerificationStatus;
  verificationDocumentName?: string;
  verificationDocumentUrl?: string;
  verificationDocumentStatus?: 'uploaded' | 'storage_rules_pending' | 'not_provided';
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  applicantResponseNote?: string;
  resubmittedAt?: string;
  verificationHistory?: VerificationHistoryEntry[];
  createdAt?: string;
  updatedAt?: string;
  deletedFromRegistry?: boolean;
}

export const getLocalRegistryOverrides = (): Record<string, LocalUserOverride> => {
  if (!isLocalDemoEnvironment()) return {};
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(LOCAL_REGISTRY_KEY);
      if (raw) {
        return JSON.parse(raw) as Record<string, LocalUserOverride>;
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return {};
};

export const saveLocalRegistryOverride = (override: LocalUserOverride): void => {
  if (!isLocalDemoEnvironment()) return;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existing = getLocalRegistryOverrides();
      existing[override.uid] = {
        ...existing[override.uid],
        ...override,
      };
      window.localStorage.setItem(LOCAL_REGISTRY_KEY, JSON.stringify(existing));
    }
  } catch {
    // Ignore storage write errors
  }
};

export const findLocalDoctorByEmail = (email: string): LocalUserOverride | null => {
  if (!isLocalDemoEnvironment() || !email) return null;
  const clean = email.trim().toLowerCase();
  const overrides = getLocalRegistryOverrides();
  for (const item of Object.values(overrides)) {
    if (item.email && item.email.toLowerCase() === clean) {
      return item;
    }
  }
  const demoMatch = DEMO_USERS[clean];
  if (demoMatch && demoMatch.uid && overrides[demoMatch.uid]) {
    return overrides[demoMatch.uid];
  }
  return null;
};

export interface CredentialUploadResult {
  documentName?: string;
  documentUrl?: string;
  documentStatus: 'uploaded' | 'storage_rules_pending' | 'not_provided';
  notice?: string;
}

const MAX_CREDENTIAL_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CREDENTIAL_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
]);

export const validateCredentialFile = (file: File | null | undefined): string | null => {
  if (!file) return null;
  if (file.size > MAX_CREDENTIAL_FILE_BYTES) {
    return 'Verification document exceeds the 5 MB maximum size limit.';
  }
  if (file.type && !ALLOWED_CREDENTIAL_MIME.has(file.type.toLowerCase())) {
    return 'Verification document must be a PDF, JPG, or PNG file.';
  }
  return null;
};

export const uploadDoctorVerificationDocument = async (
  uid: string,
  file: File | null | undefined
): Promise<CredentialUploadResult> => {
  if (!file) {
    return { documentStatus: 'not_provided' };
  }

  const validationError = validateCredentialFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  if (isLocalDemoEnvironment() && !isFirebaseConfigured) {
    return {
      documentName: file.name,
      documentStatus: 'uploaded',
    };
  }

  if (!isFirebaseConfigured || !auth.currentUser) {
    return {
      documentName: file.name,
      documentStatus: 'storage_rules_pending',
      notice: 'Document metadata recorded; binary file upload requires Firebase Storage rule activation.',
    };
  }

  try {
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `doctorVerifications/${uid}/${Date.now()}_${safeFileName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file, {
      contentType: file.type || 'application/pdf',
    });
    const downloadUrl = await getDownloadURL(storageRef);
    return {
      documentName: file.name,
      documentUrl: downloadUrl,
      documentStatus: 'uploaded',
    };
  } catch (err: any) {
    // Deployed storage.rules default-deny custom paths until rules are deployed.
    // Never abort clinician registration when metadata is recorded safely.
    return {
      documentName: file.name,
      documentStatus: 'storage_rules_pending',
      notice:
        err?.code === 'storage/unauthorized'
          ? 'Verification document metadata saved. Deploy updated storage.rules to store attachment binaries in Firebase Storage.'
          : 'Verification document metadata saved locally; Storage upload deferred.',
    };
  }
};

export const persistExtendedDoctorCredentials = async (
  uid: string,
  data: DoctorRegistrationData,
  uploadResult: CredentialUploadResult
): Promise<void> => {
  const nowIso = new Date().toISOString();
  const initialHistory: VerificationHistoryEntry[] = [
    {
      status: 'PENDING_VERIFICATION',
      accountStatus: 'pending',
      timestamp: nowIso,
      note: 'Application submitted for administrative credential review.',
    },
  ];

  // Local sandbox persistence (dev / localhost tests only)
  if (isLocalDemoEnvironment()) {
    saveLocalRegistryOverride({
      uid,
      email: data.email.trim(),
      displayName: data.fullName.trim(),
      role: 'doctor',
      status: 'pending',
      phoneNumber: data.phoneNumber.trim(),
      qualification: data.qualification?.trim(),
      licenseNumber: data.licenseNumber.trim(),
      registrationAuthority: data.registrationAuthority?.trim(),
      specialty: data.specialty.trim(),
      hospital: data.hospitalAffiliation.trim(),
      verificationStatus: 'PENDING_VERIFICATION',
      verificationDocumentName: uploadResult.documentName || data.verificationDocumentName,
      verificationDocumentUrl: uploadResult.documentUrl,
      verificationDocumentStatus: uploadResult.documentStatus,
      verificationHistory: initialHistory,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  if (!isFirebaseConfigured || !auth.currentUser || auth.currentUser.uid !== uid) {
    return;
  }

  // Update owner-editable credential metadata on users/{uid} (compatible with deployed firestore.rules)
  // Note: owner update intentionally does NOT touch restricted keys ('role', 'status', 'verificationStatus', 'licenseNumber', 'uid').
  try {
    await updateDoc(doc(db, 'users', uid), {
      qualification: data.qualification?.trim() || '',
      registrationAuthority: data.registrationAuthority?.trim() || '',
      verificationDocumentName: uploadResult.documentName || data.verificationDocumentName || '',
      verificationDocumentUrl: uploadResult.documentUrl || '',
      verificationDocumentStatus: uploadResult.documentStatus,
      credentialSubmittedAt: nowIso,
      verificationHistory: initialHistory,
    });
  } catch (err) {
    console.warn('[DoctorCredentialService] Non-blocking update of extended user fields:', err);
  }

  // Best-effort write to doctorVerifications/{uid} when updated firestore.rules are deployed
  try {
    await setDoc(doc(db, 'doctorVerifications', uid), {
      doctorId: uid,
      email: data.email.trim(),
      displayName: data.fullName.trim(),
      phoneNumber: data.phoneNumber.trim(),
      qualification: data.qualification?.trim() || '',
      licenseNumber: data.licenseNumber.trim(),
      registrationAuthority: data.registrationAuthority?.trim() || '',
      specialty: data.specialty.trim(),
      hospital: data.hospitalAffiliation.trim(),
      verificationStatus: toDoctorVerificationStatus('pending'),
      status: 'pending',
      verificationDocumentName: uploadResult.documentName || data.verificationDocumentName || '',
      verificationDocumentUrl: uploadResult.documentUrl || '',
      verificationDocumentStatus: uploadResult.documentStatus,
      submittedAt: nowIso,
      history: initialHistory,
    });
  } catch {
    // Tolerated cleanly if firestore.rules for doctorVerifications/{uid} has not been deployed yet
  }
};

export const submitDoctorClarificationNote = async (
  uid: string,
  note: string,
  additionalFields?: {
    qualification?: string;
    registrationAuthority?: string;
    hospital?: string;
  }
): Promise<void> => {
  const cleanNote = note.trim();
  if (!cleanNote) {
    throw new Error('Please enter a clarification response note for the administrator.');
  }
  const nowIso = new Date().toISOString();

  if (isLocalDemoEnvironment()) {
    const existing = getLocalRegistryOverrides()[uid];
    saveLocalRegistryOverride({
      uid,
      email: existing?.email || '',
      displayName: existing?.displayName || 'Clinician Applicant',
      role: 'doctor',
      status: 'additional_info_required',
      qualification: additionalFields?.qualification?.trim() || existing?.qualification,
      registrationAuthority:
        additionalFields?.registrationAuthority?.trim() || existing?.registrationAuthority,
      hospital: additionalFields?.hospital?.trim() || existing?.hospital,
      applicantResponseNote: cleanNote,
      resubmittedAt: nowIso,
      updatedAt: nowIso,
    });
  }

  if (isFirebaseConfigured && auth.currentUser && auth.currentUser.uid === uid) {
    const payload: Record<string, any> = {
      applicantResponseNote: cleanNote,
      resubmittedAt: nowIso,
    };
    if (additionalFields?.qualification?.trim()) {
      payload.qualification = additionalFields.qualification.trim();
    }
    if (additionalFields?.registrationAuthority?.trim()) {
      payload.registrationAuthority = additionalFields.registrationAuthority.trim();
    }
    if (additionalFields?.hospital?.trim()) {
      payload.hospital = additionalFields.hospital.trim();
    }
    await updateDoc(doc(db, 'users', uid), payload);
  }
};
