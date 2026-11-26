export type UserRole = 'patient' | 'caregiver' | 'doctor' | 'admin';

export type AccountStatus =
  | 'verified'
  | 'pending'
  | 'rejected'
  | 'additional_info_required'
  | 'suspended';

export type DoctorVerificationStatus =
  | 'PENDING_VERIFICATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'ADDITIONAL_INFORMATION_REQUIRED'
  | 'SUSPENDED';

export interface VerificationHistoryEntry {
  status: DoctorVerificationStatus;
  accountStatus: AccountStatus;
  timestamp: string;
  reviewedByUid?: string;
  reviewedByName?: string;
  note?: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  status: AccountStatus;
  photoURL?: string | null;
  phoneNumber?: string | null;
  licenseNumber?: string; // For doctors
  qualification?: string; // For doctors (e.g. MBBS, MD Neurology)
  registrationAuthority?: string; // For doctors (e.g. NMC / State Medical Council)
  specialty?: string;     // For doctors
  hospital?: string;      // For doctors
  invitationCode?: string;// For caregivers
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
  profileProvisioned?: boolean;
  createdAt?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface PatientRegistrationData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;
  preferredName?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  companionChoice: 'asha' | 'kabir';
}

export interface CaregiverRegistrationData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  relationshipToPatient: string;
  patientInvitationCode?: string;
}

export interface DoctorRegistrationData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  qualification?: string;
  licenseNumber: string;
  registrationAuthority?: string;
  specialty: string;
  hospitalAffiliation: string;
  verificationDocumentFile?: File | null;
  verificationDocumentName?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
