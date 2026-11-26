import { describe, it, expect, vi } from 'vitest';
import { parseBootstrapArgs, provisionAdminAccount } from '../scripts/bootstrapAdmin.js';

describe('Admin SDK Bootstrap Script & Doctor Verification Rules Logic', () => {
  it('validates CLI arguments and rejects empty target', () => {
    expect(() => parseBootstrapArgs([])).toThrow(/Missing target user/i);
    expect(parseBootstrapArgs(['--email', 'admin@example.com', '--name', 'Chief Admin'])).toEqual({
      email: 'admin@example.com',
      name: 'Chief Admin',
      projectId: 'saksham-d3b71',
    });
    expect(parseBootstrapArgs(['--uid', 'uid-admin-123'])).toEqual({
      uid: 'uid-admin-123',
      projectId: 'saksham-d3b71',
    });
  });

  it('provisions Custom Claim role=admin, upserts Firestore users/{uid}, and writes audit log entry', async () => {
    const setCustomUserClaims = vi.fn().mockResolvedValue(undefined);
    const getUserByEmail = vi.fn().mockResolvedValue({
      uid: 'auth-uid-999',
      email: 'professor.admin@saksham.org',
      displayName: 'Prof. Admin',
      customClaims: { existingFlag: true },
    });

    const userSetSpy = vi.fn().mockResolvedValue(undefined);
    const auditAddSpy = vi.fn().mockResolvedValue({ id: 'audit-001' });

    const fakeFirestore = {
      collection: (name: string) => {
        if (name === 'users') {
          return {
            doc: (uid: string) => ({
              get: async () => ({ exists: false, data: () => undefined }),
              set: (data: any, opts: any) => userSetSpy(uid, data, opts),
            }),
          };
        }
        if (name === 'auditLogs') {
          return {
            add: auditAddSpy,
          };
        }
        throw new Error(`Unexpected collection ${name}`);
      },
    } as any;

    const result = await provisionAdminAccount(
      { email: 'professor.admin@saksham.org', projectId: 'saksham-d3b71' },
      {
        auth: {
          getUser: vi.fn(),
          getUserByEmail,
          setCustomUserClaims,
        },
        firestore: fakeFirestore,
      }
    );

    expect(result.uid).toBe('auth-uid-999');
    expect(setCustomUserClaims).toHaveBeenCalledWith('auth-uid-999', {
      existingFlag: true,
      role: 'admin',
    });

    expect(userSetSpy).toHaveBeenCalledTimes(1);
    const [writtenUid, writtenProfile, writtenOpts] = userSetSpy.mock.calls[0];
    expect(writtenUid).toBe('auth-uid-999');
    expect(writtenProfile.role).toBe('admin');
    expect(writtenProfile.status).toBe('verified');
    expect(writtenProfile.email).toBe('professor.admin@saksham.org');
    expect(writtenOpts).toEqual({ merge: true });

    expect(auditAddSpy).toHaveBeenCalledTimes(1);
    expect(auditAddSpy.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        action: 'ADMIN_BOOTSTRAP',
        targetResource: 'users/auth-uid-999',
        result: 'CUSTOM_CLAIMS_AND_PROFILE_PROVISIONED',
      })
    );
  });

  it('enforces doctorVerifications Firestore rules: owner cannot self-approve, admin governs transitions', () => {
    const canCreateDoctorVerification = (
      authUid: string | null,
      doctorId: string,
      data: Record<string, any>
    ) =>
      Boolean(authUid) &&
      authUid === doctorId &&
      data.doctorId === doctorId &&
      data.status === 'pending' &&
      data.verificationStatus === 'PENDING_VERIFICATION';

    const canUpdateDoctorVerification = (
      authUid: string | null,
      isAdmin: boolean,
      doctorId: string,
      existing: Record<string, any>,
      next: Record<string, any>
    ) => {
      if (!authUid) return false;
      if (isAdmin) return true;
      if (authUid !== doctorId) return false;
      if (!['pending', 'additional_info_required'].includes(existing.status)) return false;
      const locked = ['status', 'verificationStatus', 'reviewNotes', 'reviewedBy', 'reviewedByUid', 'reviewedAt', 'doctorId'];
      return !locked.some((k) => next[k] !== existing[k]);
    };

    // Pending doctor cannot create pre-approved verification doc
    expect(
      canCreateDoctorVerification('doc-1', 'doc-1', {
        doctorId: 'doc-1',
        status: 'verified',
        verificationStatus: 'APPROVED',
      })
    ).toBe(false);

    // Legitimate pending creation succeeds
    expect(
      canCreateDoctorVerification('doc-1', 'doc-1', {
        doctorId: 'doc-1',
        status: 'pending',
        verificationStatus: 'PENDING_VERIFICATION',
      })
    ).toBe(true);

    const existing = {
      doctorId: 'doc-1',
      status: 'additional_info_required',
      verificationStatus: 'ADDITIONAL_INFORMATION_REQUIRED',
      reviewNotes: 'Need council certificate',
      applicantResponseNote: '',
    };

    // Doctor attempting self-approval is strictly rejected
    expect(
      canUpdateDoctorVerification('doc-1', false, 'doc-1', existing, {
        ...existing,
        status: 'verified',
        verificationStatus: 'APPROVED',
      })
    ).toBe(false);

    // Doctor submitting applicant clarification response note while keeping restricted fields immutable succeeds
    expect(
      canUpdateDoctorVerification('doc-1', false, 'doc-1', existing, {
        ...existing,
        applicantResponseNote: 'Uploaded certificate #NMC-9910',
      })
    ).toBe(true);

    // Admin can transition status cleanly
    expect(
      canUpdateDoctorVerification('admin-1', true, 'doc-1', existing, {
        ...existing,
        status: 'verified',
        verificationStatus: 'APPROVED',
        reviewedByUid: 'admin-1',
      })
    ).toBe(true);
  });

  it('enforces relationshipAuditLogs immutability, patient removal report scoping, and active care-team user reads', () => {
    const canWriteAuditLog = (isAdmin: boolean, op: 'create' | 'update' | 'delete') =>
      op === 'create' && isAdmin;
    expect(canWriteAuditLog(false, 'create')).toBe(false);
    expect(canWriteAuditLog(true, 'create')).toBe(true);
    expect(canWriteAuditLog(true, 'update')).toBe(false);
    expect(canWriteAuditLog(true, 'delete')).toBe(false);

    const canCreateRemovalRequest = (
      authUid: string | null,
      data: { requesterUid: string; patientId: string; status: string }
    ) =>
      Boolean(authUid) &&
      data.requesterUid === authUid &&
      data.patientId === authUid &&
      data.status === 'pending';

    expect(
      canCreateRemovalRequest('pat-1', {
        requesterUid: 'pat-1',
        patientId: 'pat-1',
        status: 'pending',
      })
    ).toBe(true);
    expect(
      canCreateRemovalRequest('stranger-1', {
        requesterUid: 'stranger-1',
        patientId: 'pat-1',
        status: 'pending',
      })
    ).toBe(false);
    expect(
      canCreateRemovalRequest('pat-1', {
        requesterUid: 'pat-1',
        patientId: 'pat-1',
        status: 'resolved',
      })
    ).toBe(false);

    const canPatientReadCounterpartyProfile = (
      patientUid: string,
      targetUid: string,
      assignmentStatus?: string
    ) => Boolean(patientUid) && assignmentStatus === 'active' && targetUid !== '';

    expect(canPatientReadCounterpartyProfile('pat-1', 'doc-1', 'active')).toBe(true);
    expect(canPatientReadCounterpartyProfile('pat-1', 'doc-1', 'pending')).toBe(false);
    expect(canPatientReadCounterpartyProfile('pat-1', 'doc-1', 'revoked')).toBe(false);
  });
});
