import {
  AccountStatus,
  DoctorVerificationStatus,
  UserRole,
} from '../types/auth.types.js';

export interface RoleResolutionDiagnostic {
  uid: string;
  email: string | null;
  source:
    | 'custom_claim'
    | 'firestore_profile'
    | 'demo_fixture'
    | 'default_unprovisioned'
    | 'firestore_error';
  profileExists: boolean;
  resolvedRole: UserRole;
  resolvedStatus: AccountStatus;
  errorCode?: string;
  errorMessage?: string;
  checkedAt: string;
}

let lastRoleDiagnostic: RoleResolutionDiagnostic | null = null;

export const setLastRoleResolutionDiagnostic = (
  diagnostic: RoleResolutionDiagnostic | null
): void => {
  lastRoleDiagnostic = diagnostic;
};

export const getLastRoleResolutionDiagnostic = (): RoleResolutionDiagnostic | null =>
  lastRoleDiagnostic;

export const normalizeAccountStatus = (
  rawStatus: unknown,
  verificationStatus?: unknown
): AccountStatus => {
  const s = typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : '';
  if (s === 'active' || s === 'verified' || s === 'approved') return 'verified';
  if (s === 'pending' || s === 'pending_verification') return 'pending';
  if (s === 'rejected') return 'rejected';
  if (
    s === 'additional_info_required' ||
    s === 'additional_information_required' ||
    s === 'info_required'
  ) {
    return 'additional_info_required';
  }
  if (s === 'suspended' || s === 'deactivated' || s === 'disabled') return 'suspended';

  const vs =
    typeof verificationStatus === 'string'
      ? verificationStatus.trim().toUpperCase()
      : '';
  if (vs === 'APPROVED') return 'verified';
  if (vs === 'REJECTED') return 'rejected';
  if (vs === 'ADDITIONAL_INFORMATION_REQUIRED') return 'additional_info_required';
  if (vs === 'SUSPENDED') return 'suspended';
  if (vs === 'PENDING_VERIFICATION') return 'pending';
  return 'verified';
};

export const toDoctorVerificationStatus = (
  status: AccountStatus
): DoctorVerificationStatus => {
  switch (status) {
    case 'verified':
      return 'APPROVED';
    case 'rejected':
      return 'REJECTED';
    case 'additional_info_required':
      return 'ADDITIONAL_INFORMATION_REQUIRED';
    case 'suspended':
      return 'SUSPENDED';
    case 'pending':
    default:
      return 'PENDING_VERIFICATION';
  }
};

export const isAdminStatusActive = (status: unknown): boolean => {
  const s = typeof status === 'string' ? status.trim().toLowerCase() : '';
  return s === 'verified' || s === 'active' || s === 'approved';
};

export const buildAdminProvisioningHelpMessage = (
  diagnostic: RoleResolutionDiagnostic | null
): string | null => {
  if (!diagnostic) return null;
  if (diagnostic.source === 'default_unprovisioned' && diagnostic.uid) {
    return (
      `Administrator Access Not Provisioned: Firebase Authentication verified your credentials ` +
      `(UID: ${diagnostic.uid}), but no Firestore administrator profile exists at ` +
      `"users/${diagnostic.uid}" and no Custom Claim role="admin" is assigned. ` +
      `For strict zero-trust security, unprovisioned accounts default to least-privilege Patient access. ` +
      `Provision Firestore document users/${diagnostic.uid} with role="admin" and status="verified" ` +
      `(see the Administrator Account Bootstrap Guide below) and sign in again.`
    );
  }
  if (diagnostic.source === 'firestore_error' && diagnostic.uid) {
    return (
      `Administrator Role Verification Blocked: Signed in (UID: ${diagnostic.uid}), ` +
      `but reading Firestore users/${diagnostic.uid} failed (${diagnostic.errorCode || 'unknown'}). ` +
      `Check Firestore security rules and Firebase App Check configuration.`
    );
  }
  return null;
};
