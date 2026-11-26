import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as firestore from 'firebase/firestore';
import { User } from 'firebase/auth';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute.js';
import { RegistrationForm } from '../features/auth/components/RegistrationForm.js';
import { AdminBootstrapGuide } from '../features/auth/components/AdminBootstrapGuide.js';
import { AdminDashboard } from '../pages/admin/AdminDashboard.js';
import { DoctorDashboard } from '../pages/doctor/DoctorDashboard.js';
import { getUserRoleRecord, DEMO_USERS } from '../features/auth/services/roleService.js';
import {
  getLastRoleResolutionDiagnostic,
  buildAdminProvisioningHelpMessage,
  normalizeAccountStatus,
  toDoctorVerificationStatus,
} from '../features/auth/services/roleDiagnosticService.js';
import {
  validateCredentialFile,
  submitDoctorClarificationNote,
} from '../features/auth/services/doctorCredentialService.js';
import { AdminGovernanceService } from '../features/admin/services/adminGovernanceService.js';
import { getGovernanceUi, GovernanceLangCode } from '../features/portals/utils/governanceTranslation.js';
import * as AuthContextModule from '../context/AuthContext.js';

const ALL_7_CODES: GovernanceLangCode[] = ['en', 'hi', 'mr', 'bn', 'ta', 'te', 'kn'];

describe('Admin Access Bootstrap, Doctor Verification Workflow & User Management', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('1. Administrator Access & Unprovisioned Auth Account Diagnostics', () => {
    it('never grants admin to Firebase Auth-only account lacking users/{uid} and records exact UID diagnostic', async () => {
      const fakeAuthUser = {
        uid: 'admin-auth-only-uid-42',
        email: 'unprovisioned.admin@hospital.org',
        displayName: 'New Admin',
        getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
      } as unknown as User;

      vi.spyOn(firestore, 'getDoc').mockResolvedValue({
        exists: () => false,
        data: () => undefined,
      } as any);

      const resolved = await getUserRoleRecord(fakeAuthUser);
      expect(resolved.role).toBe('patient');
      expect(resolved.profileProvisioned).toBeUndefined();

      const diagnostic = getLastRoleResolutionDiagnostic();
      expect(diagnostic).not.toBeNull();
      expect(diagnostic?.source).toBe('default_unprovisioned');
      expect(diagnostic?.uid).toBe('admin-auth-only-uid-42');
      expect(diagnostic?.profileExists).toBe(false);

      const helpMsg = buildAdminProvisioningHelpMessage(diagnostic);
      expect(helpMsg).toContain('admin-auth-only-uid-42');
      expect(helpMsg).toContain('users/admin-auth-only-uid-42');
      expect(helpMsg).toContain('role="admin"');
    });

    it('recognizes provisioned Firestore admin profile cleanly (status verified or active)', async () => {
      const adminAuthUser = {
        uid: 'real-admin-uid-01',
        email: 'prof.admin@saksham.org',
        displayName: 'Prof. Admin',
        getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
      } as unknown as User;

      vi.spyOn(firestore, 'getDoc').mockResolvedValue({
        exists: () => true,
        data: () => ({
          uid: 'real-admin-uid-01',
          email: 'prof.admin@saksham.org',
          displayName: 'Prof. Admin',
          role: 'admin',
          status: 'active',
        }),
      } as any);

      const resolved = await getUserRoleRecord(adminAuthUser);
      expect(resolved.role).toBe('admin');
      expect(resolved.status).toBe('verified');
      expect(resolved.profileProvisioned).toBe(true);
      expect(getLastRoleResolutionDiagnostic()?.source).toBe('firestore_profile');
    });

    it('records firestore_error diagnostic safely without granting privilege when Firestore read fails', async () => {
      const fakeUser = {
        uid: 'uid-err-99',
        email: 'blocked@saksham.org',
        getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
      } as unknown as User;

      vi.spyOn(firestore, 'getDoc').mockRejectedValue({ code: 'permission-denied', message: 'Missing or insufficient permissions' });

      const resolved = await getUserRoleRecord(fakeUser);
      expect(resolved.role).toBe('patient');

      const diag = getLastRoleResolutionDiagnostic();
      expect(diag?.source).toBe('firestore_error');
      expect(diag?.errorCode).toBe('permission-denied');
      expect(buildAdminProvisioningHelpMessage(diag)).toContain('permission-denied');
    });

    it('renders AdminBootstrapGuide with exact Firestore setup details without exposing secrets', () => {
      render(
        <LanguageProvider>
          <AdminBootstrapGuide />
        </LanguageProvider>
      );

      fireEvent.click(screen.getByText(/Administrator Provisioning & Bootstrap Guide/i));
      expect(screen.getByText(/Document ID:/i)).toBeInTheDocument();
      expect(screen.getByText('"admin"')).toBeInTheDocument();
      expect(screen.getByText('"verified"')).toBeInTheDocument();
    });
  });

  describe('2. Doctor Registration Credentials & Strict Route Verification Gates', () => {
    it('validates complete doctor credentials and rejects invalid/oversized files', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <LanguageProvider>
          <RegistrationForm role="doctor" onSubmit={onSubmit} isLoading={false} errorMessage={null} />
        </LanguageProvider>
      );

      fireEvent.change(screen.getByPlaceholderText('e.g., Sunita Sharma'), { target: { value: 'Dr. Kavita Rao' } });
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'dr.kavita@clinic.org' } });
      const pwInputs = screen.getAllByPlaceholderText('••••••••');
      fireEvent.change(pwInputs[0], { target: { value: 'StrongPass123' } });
      fireEvent.change(pwInputs[1], { target: { value: 'StrongPass123' } });

      // Missing phone/qualification/authority should fail validation
      fireEvent.change(screen.getByPlaceholderText('e.g. MCI-2015-8492'), { target: { value: 'NMC-KA-9921' } });
      fireEvent.change(screen.getByPlaceholderText('e.g. Neurology, Geriatrics'), { target: { value: 'Neurology' } });
      fireEvent.click(screen.getByRole('button', { name: /Submit Doctor Application/i }));
      expect(onSubmit).not.toHaveBeenCalled();

      // Fill remaining required credential fields
      fireEvent.change(screen.getByPlaceholderText('+91 98765 43210'), { target: { value: '+91 99887 76655' } });
      fireEvent.change(screen.getByPlaceholderText('e.g. MBBS, MD (Neurology)'), { target: { value: 'MBBS, DM (Neurology)' } });
      fireEvent.change(screen.getByPlaceholderText('e.g. NMC / Karnataka Medical Council'), { target: { value: 'Karnataka Medical Council' } });
      fireEvent.change(screen.getByPlaceholderText('e.g. Apollo Hospitals, Indiranagar Clinic'), { target: { value: 'NIMHANS Bengaluru' } });

      fireEvent.click(screen.getByRole('button', { name: /Submit Doctor Application/i }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Dr. Kavita Rao',
          phoneNumber: '+91 99887 76655',
          qualification: 'MBBS, DM (Neurology)',
          licenseNumber: 'NMC-KA-9921',
          registrationAuthority: 'Karnataka Medical Council',
          specialty: 'Neurology',
          hospitalAffiliation: 'NIMHANS Bengaluru',
        })
      );

      // File validation checks
      const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], 'huge.pdf', { type: 'application/pdf' });
      expect(validateCredentialFile(bigFile)).toContain('5 MB');
      const exeFile = new File(['bad'], 'malware.exe', { type: 'application/x-msdownload' });
      expect(validateCredentialFile(exeFile)).toContain('PDF, JPG, or PNG');
      const okPdf = new File(['valid'], 'license.pdf', { type: 'application/pdf' });
      expect(validateCredentialFile(okPdf)).toBeNull();
    });

    it('blocks rejected and additional_info_required doctors on /doctor and displays review notes', async () => {
      const signOutMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        currentUser: {
          uid: 'doc-rej-01',
          email: 'rej.doc@saksham.care',
          displayName: 'Dr. Unverified',
          role: 'doctor',
          status: 'rejected',
          verificationStatus: 'REJECTED',
          reviewNotes: 'Provided license number could not be matched with NMC directory.',
        },
        role: 'doctor',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        signIn: vi.fn(),
        signOut: signOutMock,
        logout: vi.fn(),
        sendPasswordReset: vi.fn(),
        switchDemoRole: vi.fn(),
        setRole: vi.fn(),
        clearError: vi.fn(),
      });

      const { unmount } = render(
        <MemoryRouter initialEntries={['/doctor']}>
          <LanguageProvider>
            <Routes>
              <Route
                path="/doctor"
                element={
                  <ProtectedRoute allowedRole="doctor">
                    <div>Secret Patient Neurology Charts</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </LanguageProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('protected-rejected-gate')).toBeInTheDocument();
      expect(screen.getByText(/NMC directory/i)).toBeInTheDocument();
      expect(screen.queryByText('Secret Patient Neurology Charts')).not.toBeInTheDocument();
      unmount();

      // Now test ADDITIONAL_INFORMATION_REQUIRED gate and DoctorDashboard internal status guard
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        currentUser: {
          uid: 'doc-info-02',
          email: 'info.doc@saksham.care',
          displayName: 'Dr. Clarification Needed',
          role: 'doctor',
          status: 'additional_info_required',
          verificationStatus: 'ADDITIONAL_INFORMATION_REQUIRED',
          reviewNotes: 'Upload clearer scan of state council registration renewal.',
        },
        role: 'doctor',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        signIn: vi.fn(),
        signOut: signOutMock,
        logout: vi.fn(),
        sendPasswordReset: vi.fn(),
        switchDemoRole: vi.fn(),
        setRole: vi.fn(),
        clearError: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/doctor']}>
          <LanguageProvider>
            <Routes>
              <Route
                path="/doctor"
                element={
                  <ProtectedRoute allowedRole="doctor">
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </LanguageProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('protected-info-required-gate')).toBeInTheDocument();
      expect(screen.getByText(/Upload clearer scan/i)).toBeInTheDocument();
      await submitDoctorClarificationNote('doc-info-02', 'Uploaded renewal certificate reference #KA-8812');
      expect(normalizeAccountStatus('additional_info_required')).toBe('additional_info_required');
      expect(toDoctorVerificationStatus('additional_info_required')).toBe('ADDITIONAL_INFORMATION_REQUIRED');
    });
  });

  describe('3. Admin Governance Dashboard, Verification Decisions, Assignments & Deletion Boundaries', () => {
    it('supports reviewing pending doctors, rejecting without note validation, approving, assigning patients, and deleting Firestore profile honestly', async () => {
      const adminUser = Object.values(DEMO_USERS).find((u) => u.role === 'admin')!;
      localStorage.setItem('saksham_auth_user', JSON.stringify(adminUser));
      localStorage.setItem('saksham_lang_guest', 'en');

      render(
        <MemoryRouter>
          <AuthProvider>
            <LanguageProvider>
              <AccessibilityProvider>
                <AdminDashboard />
              </AccessibilityProvider>
            </LanguageProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      // Wait for initial registry load in Users tab
      await waitFor(() => {
        expect(screen.getByText('Sunita Sharma')).toBeInTheDocument();
      });

      // Verify search filter narrows table
      fireEvent.change(screen.getByTestId('admin-user-search'), { target: { value: 'Neha Sen' } });
      expect(screen.getByText('Dr. Neha Sen')).toBeInTheDocument();
      expect(screen.queryByText('Sunita Sharma')).not.toBeInTheDocument();
      fireEvent.change(screen.getByTestId('admin-user-search'), { target: { value: '' } });

      // Switch to Doctor Verification tab
      fireEvent.click(screen.getByTestId('admin-tab-doctors'));
      expect(screen.getByTestId('doctor-verification-card-doc-pending-01')).toBeInTheDocument();

      // Rejecting without review note must fail validation
      fireEvent.click(screen.getByTestId('reject-doctor-btn-doc-pending-01'));
      expect(screen.getByTestId('admin-error-banner')).toBeInTheDocument();

      // Approve Dr. Neha Sen with review note
      fireEvent.change(screen.getByTestId('review-note-input-doc-pending-01'), {
        target: { value: 'WBMC license confirmed online.' },
      });
      fireEvent.click(screen.getByTestId('approve-doctor-btn-doc-pending-01'));

      await waitFor(() => {
        expect(screen.getByTestId('doctor-status-badge-doc-pending-01')).toHaveTextContent('Approved Practitioner');
      });

      // Switch back to Users tab and inspect profile deletion confirmation honesty
      fireEvent.click(screen.getByTestId('admin-tab-users'));
      fireEvent.click(screen.getByTestId('delete-user-btn-usr-004'));
      expect(screen.getByTestId('admin-delete-confirm-modal')).toBeInTheDocument();
      expect(screen.getByText(/Firebase Authentication login credential/i)).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('confirm-delete-profile-btn'));
      await waitFor(() => {
        expect(screen.queryByTestId('admin-user-row-usr-004')).not.toBeInTheDocument();
      });
    });

    it('blocks non-admin callers from mutating doctor status or assigning patients and validates live Firestore payload keys', async () => {
      const nonAdmin = Object.values(DEMO_USERS).find((u) => u.role === 'doctor')!;
      await expect(
        AdminGovernanceService.reviewDoctorApplication(
          nonAdmin,
          { id: 'doc-1', uid: 'doc-1', name: 'Dr. X', email: 'x@test.org', role: 'doctor', status: 'pending', joined: '' },
          'APPROVED',
          'self approve attempt'
        )
      ).rejects.toThrow(/Administrator authorization is required/i);

      // Force live Firestore codepath test with spied setDoc & updateDoc
      localStorage.setItem('saksham_force_live_firestore', 'true');
      const liveAdmin = {
        uid: 'live-admin-uid',
        email: 'admin@live.org',
        displayName: 'Live Admin',
        role: 'admin' as const,
        status: 'verified' as const,
      };

      const updateSpy = vi.spyOn(firestore, 'updateDoc').mockResolvedValue(undefined);
      const setSpy = vi.spyOn(firestore, 'setDoc').mockResolvedValue(undefined);

      const doctorRec = {
        id: 'doc-live-1',
        uid: 'doc-live-1',
        name: 'Dr. Live',
        email: 'doc@live.org',
        role: 'doctor' as const,
        status: 'pending' as const,
        joined: '',
      };

      // Assigning pending doctor must fail even if admin
      await expect(
        AdminGovernanceService.assignDoctorToPatient(liveAdmin, doctorRec, {
          id: 'pat-live-1',
          uid: 'pat-live-1',
          name: 'Patient Live',
          email: 'pat@live.org',
          role: 'patient',
          status: 'verified',
          joined: '',
        })
      ).rejects.toThrow(/Only an approved, verified doctor/i);

      // Approving doctor calls updateDoc on users/doc-live-1
      const approved = await AdminGovernanceService.reviewDoctorApplication(
        liveAdmin,
        doctorRec,
        'APPROVED',
        'Credentials verified'
      );
      expect(approved.status).toBe('verified');
      expect(updateSpy).toHaveBeenCalled();

      // Assigning approved doctor writes exact 5 firestore.rules keys to doctorAssignments/{doctorId}_{patientId}
      const assign = await AdminGovernanceService.assignDoctorToPatient(liveAdmin, approved, {
        id: 'pat-live-1',
        uid: 'pat-live-1',
        name: 'Patient Live',
        email: 'pat@live.org',
        role: 'patient',
        status: 'verified',
        joined: '',
      });
      expect(assign.id).toBe('doc-live-1_pat-live-1');
      const setPayload = setSpy.mock.calls[setSpy.mock.calls.length - 1]?.[1] as Record<string, any>;
      expect(Object.keys(setPayload).sort()).toEqual(['assignedAt', 'doctorId', 'notes', 'patientId', 'status']);
    });

    it('provides non-English localized governance & verification labels across all 7 languages', () => {
      const en = getGovernanceUi('en');
      for (const code of ALL_7_CODES) {
        const localized = getGovernanceUi(code);
        expect(localized.tabDoctors.trim().length).toBeGreaterThan(2);
        expect(localized.btnApproveDoctor.trim().length).toBeGreaterThan(2);
        expect(localized.adminBootstrapTitle.trim().length).toBeGreaterThan(2);
        if (code !== 'en') {
          expect(localized.tabDoctors).not.toBe(en.tabDoctors);
          expect(localized.docRejectedTitle).not.toBe(en.docRejectedTitle);
        }
      }
    });
  });
});
