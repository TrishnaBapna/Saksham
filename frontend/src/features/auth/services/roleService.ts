import { doc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../../../services/firebase.js';
import { UserRole, AccountStatus, AuthUser } from '../types/auth.types.js';
import {
  setLastRoleResolutionDiagnostic,
  normalizeAccountStatus,
  toDoctorVerificationStatus,
} from './roleDiagnosticService.js';

// Pre-configured role profiles for prototype and development verification
export const DEMO_USERS: Record<string, AuthUser> = {
  'patient@saksham.care': {
    uid: 'demo-patient-001',
    email: 'patient@saksham.care',
    displayName: 'Sunita Sharma',
    role: 'patient',
    status: 'verified',
    photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    phoneNumber: '+91 98765 43210'
  },
  'sunita.sharma@saksham.care': {
    uid: 'demo-patient-001',
    email: 'patient@saksham.care',
    displayName: 'Sunita Sharma',
    role: 'patient',
    status: 'verified',
    photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    phoneNumber: '+91 98765 43210'
  },
  'caregiver@saksham.care': {
    uid: 'demo-caregiver-001',
    email: 'caregiver@saksham.care',
    displayName: 'Ananya Sharma (Daughter)',
    role: 'caregiver',
    status: 'verified',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phoneNumber: '+91 98765 43211'
  },
  'ananya.sharma@saksham.care': {
    uid: 'demo-caregiver-001',
    email: 'caregiver@saksham.care',
    displayName: 'Ananya Sharma (Daughter)',
    role: 'caregiver',
    status: 'verified',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phoneNumber: '+91 98765 43211'
  },
  'doctor@saksham.care': {
    uid: 'demo-doctor-001',
    email: 'doctor@saksham.care',
    displayName: 'Dr. Raman Verma',
    role: 'doctor',
    status: 'verified',
    licenseNumber: 'MCI-DEL-2014-9843',
    specialty: 'Cognitive Neurology',
    hospital: 'Apollo Neurological Institute',
    photoURL: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=200&q=80'
  },
  'dr.raman.verma@saksham.care': {
    uid: 'demo-doctor-001',
    email: 'doctor@saksham.care',
    displayName: 'Dr. Raman Verma',
    role: 'doctor',
    status: 'verified',
    licenseNumber: 'MCI-DEL-2014-9843',
    specialty: 'Cognitive Neurology',
    hospital: 'Apollo Neurological Institute',
    photoURL: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=200&q=80'
  },
  'doctor.pending@saksham.care': {
    uid: 'demo-doctor-002',
    email: 'doctor.pending@saksham.care',
    displayName: 'Dr. Neha Sen (Pending Approval)',
    role: 'doctor',
    status: 'pending',
    licenseNumber: 'MCI-KAR-2022-1109',
    specialty: 'Neuropsychiatry',
    hospital: 'Fortis Hospital'
  },
  'admin@saksham.care': {
    uid: 'demo-admin-001',
    email: 'admin@saksham.care',
    displayName: 'System Security Administrator',
    role: 'admin',
    status: 'verified',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
  },
  'admin.ops@saksham.care': {
    uid: 'demo-admin-001',
    email: 'admin@saksham.care',
    displayName: 'System Security Administrator',
    role: 'admin',
    status: 'verified',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
  }
};

/**
 * Fetches the cryptographically verified or backend-managed role for a Firebase User.
 * Architecture Note (Spark Free-Tier Compliant):
 * On Firebase Spark plan without Cloud Functions, role records are stored in Firestore `users/{uid}`.
 * The Firestore Security Rules strictly prohibit clients from updating their own `role` or `isVerified` fields.
 */
export const getUserRoleRecord = async (user: User): Promise<AuthUser> => {
  // 1. Check custom claims if present (seamless path for Blaze plan later)
  try {
    const idTokenResult = await user.getIdTokenResult();
    if (idTokenResult.claims && idTokenResult.claims.role) {
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: idTokenResult.claims.role as UserRole,
        status: (idTokenResult.claims.status as AccountStatus) || 'verified',
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber
      };
    }
  } catch (err) {
    console.warn('Could not read custom claims, checking Firestore...', err);
  }

  // 2. Fetch from Firestore `users/{uid}` (Spark Free-Tier standard)
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const rawRole = typeof data.role === 'string' ? data.role.trim().toLowerCase() : 'patient';
      const resolvedRole: UserRole =
        rawRole === 'admin' || rawRole === 'doctor' || rawRole === 'caregiver' || rawRole === 'patient'
          ? rawRole
          : 'patient';
      const resolvedStatus = normalizeAccountStatus(data.status, data.verificationStatus);
      setLastRoleResolutionDiagnostic({
        uid: user.uid,
        email: user.email,
        source: 'firestore_profile',
        profileExists: true,
        resolvedRole,
        resolvedStatus,
        checkedAt: new Date().toISOString(),
      });
      return {
        uid: user.uid,
        email: user.email,
        displayName: data.displayName || user.displayName,
        role: resolvedRole,
        status: resolvedStatus,
        photoURL: data.photoURL || user.photoURL,
        phoneNumber: data.phoneNumber || user.phoneNumber,
        licenseNumber: data.licenseNumber,
        qualification: data.qualification,
        registrationAuthority: data.registrationAuthority,
        specialty: data.specialty,
        hospital: data.hospital,
        invitationCode: data.invitationCode,
        verificationStatus:
          data.verificationStatus ||
          (resolvedRole === 'doctor' ? toDoctorVerificationStatus(resolvedStatus) : undefined),
        verificationDocumentName: data.verificationDocumentName,
        verificationDocumentUrl: data.verificationDocumentUrl,
        verificationDocumentStatus: data.verificationDocumentStatus,
        reviewNotes: data.reviewNotes,
        reviewedBy: data.reviewedBy,
        reviewedAt: data.reviewedAt,
        applicantResponseNote: data.applicantResponseNote,
        resubmittedAt: data.resubmittedAt,
        verificationHistory: Array.isArray(data.verificationHistory)
          ? data.verificationHistory
          : undefined,
        profileProvisioned: true,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      };
    }

    setLastRoleResolutionDiagnostic({
      uid: user.uid,
      email: user.email,
      source: 'default_unprovisioned',
      profileExists: false,
      resolvedRole: 'patient',
      resolvedStatus: 'verified',
      checkedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    const code = err?.code || 'unknown';
    const message = err?.message || 'Firestore read error';
    setLastRoleResolutionDiagnostic({
      uid: user.uid,
      email: user.email,
      source: 'firestore_error',
      profileExists: false,
      resolvedRole: 'patient',
      resolvedStatus: 'verified',
      errorCode: code,
      errorMessage: message,
      checkedAt: new Date().toISOString(),
    });
    console.warn('Firestore read error, falling back to least-privilege profile:', err);
  }

  // 3. Fallback for demo emails ONLY when running in local development mode
  if (import.meta.env.DEV && user.email && DEMO_USERS[user.email]) {
    return DEMO_USERS[user.email];
  }

  // 4. In production builds: never simulate or assume demo roles
  // Default conservative profile with least privilege (patient)
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || 'Saksham User',
    role: 'patient',
    status: 'verified',
    photoURL: user.photoURL,
    phoneNumber: user.phoneNumber
  };
};

/**
 * Validates whether the verified role matches the user's selected portal.
 * NEVER trust the frontend portal selection!
 */
export const verifyRoleMatch = (
  verifiedRole: UserRole,
  selectedPortal: UserRole
): { matches: boolean; mismatchMessage?: string } => {
  if (verifiedRole === selectedPortal) {
    return { matches: true };
  }

  const roleNames: Record<UserRole, string> = {
    patient: 'Patient',
    caregiver: 'Caregiver',
    doctor: 'Doctor',
    admin: 'Administrator'
  };

  return {
    matches: false,
    mismatchMessage: `Account Role Mismatch: You logged in through the ${roleNames[selectedPortal]} portal, but your verified account role is "${roleNames[verifiedRole]}". Please use the ${roleNames[verifiedRole]} portal to sign in.`
  };
};
