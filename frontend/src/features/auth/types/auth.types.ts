export type UserRole = 'patient' | 'caregiver' | 'doctor' | 'admin';

export type AccountStatus = 'verified' | 'pending' | 'suspended';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  status: AccountStatus;
  photoURL?: string | null;
  phoneNumber?: string | null;
  licenseNumber?: string; // For doctors
  specialty?: string;     // For doctors
  hospital?: string;      // For doctors
  invitationCode?: string;// For caregivers
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
  licenseNumber: string;
  specialty: string;
  hospitalAffiliation: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
