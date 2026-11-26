import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as firestore from 'firebase/firestore';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { AdminDashboard } from '../pages/admin/AdminDashboard.js';
import { DoctorDashboard } from '../pages/doctor/DoctorDashboard.js';
import { CaregiverDashboard } from '../pages/caregiver/CaregiverDashboard.js';
import { PatientCareTeamCard } from '../features/relationships/components/PatientCareTeamCard.js';
import { RelationshipManagementService } from '../features/relationships/services/relationshipService.js';
import {
  DEFAULT_CAREGIVER_REL_PERMISSIONS,
  isRelationshipActive,
  normalizeRelationshipStatus,
} from '../features/relationships/types/relationship.types.js';
import { DoctorAnalyticsService } from '../features/doctor/services/doctorAnalyticsService.js';
import {
  CaregiverService,
  EMPTY_CAREGIVER_PERMISSIONS,
} from '../features/caregiver/services/caregiverService.js';
import { DEMO_USERS } from '../features/auth/services/roleService.js';
import { getRelationshipUi, RelLangCode } from '../features/portals/utils/relationshipManagementTranslation.js';
import * as AuthContextModule from '../context/AuthContext.js';

const ALL_7_CODES: RelLangCode[] = ['en', 'hi', 'mr', 'bn', 'ta', 'te', 'kn'];

describe('Saksham Admin-Controlled Doctor–Patient & Caregiver–Patient Relationship Management (§11)', () => {
  const adminUser = { ...DEMO_USERS['admin@saksham.care'], uid: 'demo-admin-001', role: 'admin' as const, status: 'verified' as const };
  const patientOne = {
    id: 'pat-101',
    uid: 'pat-101',
    name: 'Kavita Deshmukh',
    email: 'kavita@saksham.care',
    role: 'patient' as const,
    status: 'verified' as const,
    joined: 'Nov 2026',
  };
  const patientTwo = {
    id: 'pat-102',
    uid: 'pat-102',
    name: 'Mohan Rao',
    email: 'mohan@saksham.care',
    role: 'patient' as const,
    status: 'verified' as const,
    joined: 'Nov 2026',
  };
  const approvedDoctorA = {
    id: 'doc-approved-1',
    uid: 'doc-approved-1',
    name: 'Dr. Anjali Kulkarni',
    email: 'anjali@clinic.org',
    role: 'doctor' as const,
    status: 'verified' as const,
    licenseNumber: 'MMC-2019-1122',
    specialty: 'Neurology',
    hospital: 'Pune Memory Clinic',
    qualification: 'MBBS, DM (Neurology)',
    joined: 'Nov 2026',
  };
  const approvedDoctorB = {
    id: 'doc-approved-2',
    uid: 'doc-approved-2',
    name: 'Dr. Vikram Nair',
    email: 'vikram@clinic.org',
    role: 'doctor' as const,
    status: 'verified' as const,
    licenseNumber: 'KMC-2016-7788',
    specialty: 'Geriatrics',
    hospital: 'Bengaluru Senior Care',
    qualification: 'MBBS, MD (Geriatrics)',
    joined: 'Nov 2026',
  };
  const unapprovedDoctor = {
    id: 'doc-pending-9',
    uid: 'doc-pending-9',
    name: 'Dr. Pending',
    email: 'pending.doc@clinic.org',
    role: 'doctor' as const,
    status: 'pending' as const,
    licenseNumber: 'PENDING-01',
    specialty: 'Neurology',
    joined: 'Nov 2026',
  };
  const caregiverA = {
    id: 'cg-daughter-1',
    uid: 'cg-daughter-1',
    name: 'Meera Deshmukh',
    email: 'meera@family.org',
    role: 'caregiver' as const,
    status: 'verified' as const,
    joined: 'Nov 2026',
  };
  const caregiverB = {
    id: 'cg-prof-2',
    uid: 'cg-prof-2',
    name: 'Nurse Priya S.',
    email: 'priya@careagency.org',
    role: 'caregiver' as const,
    status: 'verified' as const,
    joined: 'Nov 2026',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    CaregiverService.clearSimulatedRelationships();
    DoctorAnalyticsService.clearSimulatedAssignments();
  });

  it('Scenario 1, 2, 3 & 4: Unassigned doctor is blocked; Admin approves assignment; assigned doctor accesses only that patient and never an unrelated patient UID', async () => {
    localStorage.setItem('saksham_force_live_firestore', 'true');

    // Scenario 1: Unassigned doctor (mocking Firestore empty doctorAssignments)
    vi.spyOn(firestore, 'getDoc').mockResolvedValue({ exists: () => false, data: () => undefined } as any);
    vi.spyOn(firestore, 'getDocs').mockResolvedValue({ empty: true, docs: [] } as any);

    const beforeAssign = await DoctorAnalyticsService.getDoctorAssignment('doc-approved-1', 'pat-101');
    expect(beforeAssign.isAssigned).toBe(false);
    expect(beforeAssign.status).toBe('none');

    // Pending doctor CANNOT receive active assignment even from Admin
    await expect(
      RelationshipManagementService.createOrUpdateDoctorAssignment(adminUser, {
        doctor: unapprovedDoctor,
        patient: patientOne,
        relationshipType: 'primary_clinician',
        initialStatus: 'active',
        reason: 'Attempt with unverified doctor',
        consentBasis: 'patient_informed_consent',
        consentReference: 'CONS-1',
      })
    ).rejects.toThrow(/verified and approved doctor/i);

    // Scenario 2: Admin approves doctor-patient assignment
    localStorage.removeItem('saksham_force_live_firestore');
    const created = await RelationshipManagementService.createOrUpdateDoctorAssignment(adminUser, {
      doctor: approvedDoctorA,
      patient: patientOne,
      relationshipType: 'primary_clinician',
      initialStatus: 'active',
      reason: 'Offline hospital referral confirmed with patient',
      consentBasis: 'patient_informed_consent',
      consentReference: 'HOSP-REF-2026-44',
    });
    expect(created.status).toBe('active');
    expect(created.approvedByAdminUid).toBe(adminUser.uid);
    expect(created.consentReference).toBe('HOSP-REF-2026-44');

    // Scenario 3 & 4: Doctor accesses assigned patient only, and attempting another UID fails closed
    const list = await RelationshipManagementService.fetchActiveAssignmentsForDoctor('doc-approved-1', adminUser);
    expect(list.map((a) => a.patientId)).toEqual(['pat-101']);

    localStorage.setItem('saksham_force_live_firestore', 'true');
    const unrelatedCheck = await DoctorAnalyticsService.getDoctorAssignment('doc-approved-1', 'unrelated-patient-999');
    expect(unrelatedCheck.isAssigned).toBe(false);
  });

  it('Scenario 5, 6, 7, 8 & 9: Unconnected, pending, info-required, rejected, suspended, and revoked caregivers have ZERO access; approved caregiver is scoped by permissions', async () => {
    // Scenario 9 helper invariants
    expect(isRelationshipActive('active')).toBe(true);
    for (const nonActive of ['pending', 'additional_info_required', 'rejected', 'suspended', 'revoked']) {
      expect(isRelationshipActive(nonActive)).toBe(false);
      expect(normalizeRelationshipStatus(nonActive)).toBe(nonActive);
    }

    // Legal representative authorisation requires documented consent reference
    await expect(
      RelationshipManagementService.createOrUpdateCaregiverConnection(adminUser, {
        caregiver: caregiverA,
        patient: patientOne,
        relationshipType: 'legal_representative',
        initialStatus: 'active',
        consentBasis: 'legal_representative_authorization',
        consentReference: '',
        permissions: { ...DEFAULT_CAREGIVER_REL_PERMISSIONS },
        reason: 'Patient unable to consent',
      })
    ).rejects.toThrow(/legal or representative authorisation reference is required/i);

    // Scenario 5 & 9: Pending request grants no access
    const pendingRel = await RelationshipManagementService.createOrUpdateCaregiverConnection(adminUser, {
      caregiver: caregiverA,
      patient: patientOne,
      relationshipType: 'daughter',
      initialStatus: 'pending',
      consentBasis: 'patient_informed_consent',
      consentReference: 'CONS-CG-1',
      permissions: {
        ...DEFAULT_CAREGIVER_REL_PERMISSIONS,
        canReceiveAlerts: false,
        canCommunicateWithDoctor: false,
        canViewRestrictedClinical: false,
      },
      reason: 'Caregiver submitted link request via offline consent form',
    });
    expect(pendingRel.status).toBe('pending');
    let activeForCg = await RelationshipManagementService.fetchActiveConnectionsForCaregiver('cg-daughter-1', adminUser);
    expect(activeForCg).toHaveLength(0);

    // Scenario 6 & 7: Admin approves connection with scoped permissions
    const activeRel = await RelationshipManagementService.transitionCaregiverConnectionStatus(
      adminUser,
      pendingRel,
      'active',
      'Verified daughter identity and signed consent'
    );
    expect(activeRel.status).toBe('active');
    expect(activeRel.approvedByAdminUid).toBe(adminUser.uid);

    activeForCg = await RelationshipManagementService.fetchActiveConnectionsForCaregiver('cg-daughter-1', adminUser);
    expect(activeForCg).toHaveLength(1);
    expect(activeForCg[0].permissions.canReceiveAlerts).toBe(false);
    expect(activeForCg[0].permissions.canViewRestrictedClinical).toBe(false);

    // Verify CaregiverDashboard respects granular permission restrictions cleanly
    const getPatientsSpy = vi.spyOn(CaregiverService, 'getConnectedPatients').mockResolvedValue([
      {
        patientId: 'pat-101',
        patientName: 'Kavita Deshmukh',
        relationshipType: 'daughter',
        relationshipStatus: 'active',
        permissions: activeRel.permissions,
      },
    ]);
    const getPatientSpy = vi.spyOn(CaregiverService, 'getConnectedPatient').mockResolvedValue({
      patientId: 'pat-101',
      patientName: 'Kavita Deshmukh',
      relationshipType: 'daughter',
      relationshipStatus: 'active',
      permissions: activeRel.permissions,
    });
    const useAuthSpy = vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        uid: 'cg-daughter-1',
        email: 'meera@family.org',
        displayName: 'Meera Deshmukh',
        role: 'caregiver',
        status: 'verified',
      },
      role: 'caregiver',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      logout: vi.fn(),
      sendPasswordReset: vi.fn(),
      switchDemoRole: vi.fn(),
      setRole: vi.fn(),
      clearError: vi.fn(),
    });

    const { unmount } = render(
      <MemoryRouter>
        <LanguageProvider>
          <CaregiverDashboard />
        </LanguageProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('caregiver-connected-patients-section')).toBeInTheDocument();
      expect(screen.getByTestId('caregiver-connected-patient-card-pat-101')).toBeInTheDocument();
    });
    // Alerts/Safety Map disabled by Admin permission & clinical restricted notice visible
    expect(screen.getByTestId('caregiver-safety-restricted-notice')).toBeInTheDocument();
    expect(screen.queryByTestId('open-appointment-summary-modal-btn')).not.toBeInTheDocument();
    expect(screen.getByText(/Restricted clinical diagnosis records require explicit Admin authorisation/i)).toBeInTheDocument();
    unmount();
    getPatientsSpy.mockRestore();
    getPatientSpy.mockRestore();
    useAuthSpy.mockRestore();

    // Scenario 8: Admin suspends -> active connection drops immediately
    const suspended = await RelationshipManagementService.transitionCaregiverConnectionStatus(
      adminUser,
      activeRel,
      'suspended',
      'Temporary suspension pending consent renewal'
    );
    expect(suspended.status).toBe('suspended');
    const afterSuspend = await RelationshipManagementService.fetchActiveConnectionsForCaregiver('cg-daughter-1', adminUser);
    expect(afterSuspend).toHaveLength(0);

    // Local demo-caregiver-001 revocation propagation check
    await RelationshipManagementService.transitionCaregiverConnectionStatus(
      adminUser,
      (await RelationshipManagementService.fetchAllRelationshipsAndLogs(adminUser)).caregiverRelationships.find(
        (c) => c.id === 'demo-caregiver-001_demo-patient-001'
      )!,
      'revoked',
      'Patient requested removal'
    );
    const revokedDemoCheck = await CaregiverService.getConnectedPatient('demo-caregiver-001');
    expect(revokedDemoCheck.relationshipStatus).toBe('revoked');
    expect(revokedDemoCheck.permissions).toEqual(EMPTY_CAREGIVER_PERMISSIONS);
  });

  it('Scenario 10, 11 & 12: Multi-caregiver, multi-patient, doctor reassignment, Patient My Care Team + removal report, and immutable Admin Audit History', async () => {
    // Multiple caregivers for Patient 1, plus Patient 2 for Caregiver A, plus Assigned Doctor A
    const docRel = await RelationshipManagementService.createOrUpdateDoctorAssignment(adminUser, {
      doctor: approvedDoctorA,
      patient: patientOne,
      relationshipType: 'primary_clinician',
      initialStatus: 'active',
      reason: 'Primary neurologist approved',
      consentBasis: 'patient_informed_consent',
      consentReference: 'CONS-DOC-101',
    });

    await RelationshipManagementService.createOrUpdateCaregiverConnection(adminUser, {
      caregiver: caregiverA,
      patient: patientOne,
      relationshipType: 'daughter',
      initialStatus: 'active',
      consentBasis: 'patient_informed_consent',
      consentReference: 'CONS-CG-101',
      permissions: { ...DEFAULT_CAREGIVER_REL_PERMISSIONS },
      reason: 'Primary family caregiver',
    });

    await RelationshipManagementService.createOrUpdateCaregiverConnection(adminUser, {
      caregiver: caregiverB,
      patient: patientOne,
      relationshipType: 'professional_caregiver',
      initialStatus: 'active',
      consentBasis: 'legal_representative_authorization',
      consentReference: 'POA-PAT101-88',
      permissions: { ...DEFAULT_CAREGIVER_REL_PERMISSIONS, canViewRestrictedClinical: false },
      reason: 'Verified day-shift nurse authorised by POA',
    });

    await RelationshipManagementService.createOrUpdateCaregiverConnection(adminUser, {
      caregiver: caregiverA,
      patient: patientTwo,
      relationshipType: 'relative',
      initialStatus: 'active',
      consentBasis: 'patient_informed_consent',
      consentReference: 'CONS-CG-102',
      permissions: { ...DEFAULT_CAREGIVER_REL_PERMISSIONS },
      reason: 'Also approved to support patientTwo',
    });

    // Multi-patient check for Caregiver A
    const multiPatients = await RelationshipManagementService.fetchActiveConnectionsForCaregiver('cg-daughter-1', adminUser);
    expect(multiPatients.map((m) => m.patientId).sort()).toEqual(['pat-101', 'pat-102']);

    // Multi-caregiver check for Doctor viewing Patient 1
    const cgsForPat1 = await RelationshipManagementService.fetchAuthorizedCaregiversForPatient('pat-101', adminUser);
    expect(cgsForPat1.map((c) => c.caregiverId).sort()).toEqual(['cg-daughter-1', 'cg-prof-2']);

    // Scenario 11: Render PatientCareTeamCard (My Care Team) -> sees Doctor A + 2 Caregivers & submits removal report
    const patientAuthUser = {
      uid: 'pat-101',
      email: 'kavita@saksham.care',
      displayName: 'Kavita Deshmukh',
      role: 'patient' as const,
      status: 'verified' as const,
    };

    const { unmount: unmountTeam } = render(
      <LanguageProvider>
        <PatientCareTeamCard patientId="pat-101" currentUser={patientAuthUser} />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('care-team-doctor-doc-approved-1')).toBeInTheDocument();
      expect(screen.getByTestId('care-team-caregiver-cg-daughter-1')).toBeInTheDocument();
      expect(screen.getByTestId('care-team-caregiver-cg-prof-2')).toBeInTheDocument();
    });

    // Submit removal report for Caregiver B
    fireEvent.click(screen.getByTestId('report-cg-btn-cg-prof-2'));
    fireEvent.change(screen.getByPlaceholderText(/Explain why this connection is incorrect/i), {
      target: { value: 'Agency shift ended; please remove nurse access.' },
    });
    fireEvent.click(screen.getByTestId('submit-care-team-report-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('patient-care-team-report-success')).toBeInTheDocument();
    });
    unmountTeam();

    // Admin reassigns Patient 1 from Doctor A -> Doctor B
    const reassigned = await RelationshipManagementService.reassignPatientDoctor(adminUser, {
      previousAssignment: docRel,
      newDoctor: approvedDoctorB,
      patient: patientOne,
      reason: 'Doctor A transferred; reassigned to Dr. Nair',
    });
    expect(reassigned.revokedPrevious.status).toBe('revoked');
    expect(reassigned.activatedNew.doctorId).toBe('doc-approved-2');
    expect(reassigned.activatedNew.status).toBe('active');

    // Verify Admin resolves the patient's removal report and audit logs record all history
    const snapshot = await RelationshipManagementService.fetchAllRelationshipsAndLogs(adminUser);
    expect(snapshot.removalRequests).toHaveLength(1);
    const resolvedReport = await RelationshipManagementService.resolveRemovalRequest(
      adminUser,
      snapshot.removalRequests[0],
      'approve_removal',
      'Confirmed shift end with family; access revoked.',
      snapshot.doctorAssignments,
      snapshot.caregiverRelationships
    );
    expect(resolvedReport.status).toBe('resolved');

    const finalTeam = await RelationshipManagementService.fetchPatientCareTeam('pat-101', adminUser);
    expect(finalTeam.assignedDoctors.map((d) => d.doctorId)).toEqual(['doc-approved-2']);
    expect(finalTeam.connectedCaregivers.map((c) => c.caregiverId)).toEqual(['cg-daughter-1']);

    // Scenario 12: Audit logs captured create, approve, reassign, and removal resolution
    const finalSnapshot = await RelationshipManagementService.fetchAllRelationshipsAndLogs(adminUser);
    const actions = finalSnapshot.auditLogs.map((l) => l.action);
    expect(actions).toContain('DOCTOR_REASSIGNED');
    expect(actions).toContain('RELATIONSHIP_REVOKED');
    expect(actions).toContain('REMOVAL_REPORT_RESOLVED');
  });

  it('AdminDashboard Patient Relationship Management UI & Doctor My Assigned Patients render and transition state properly', async () => {
    localStorage.setItem('saksham_auth_user', JSON.stringify(adminUser));
    localStorage.setItem('saksham_lang_guest', 'en');

    const { unmount } = render(
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

    await waitFor(() => expect(screen.getByTestId('admin-tab-relationships')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('admin-tab-relationships'));

    await waitFor(() => {
      expect(screen.getByTestId('patient-relationship-management-section')).toBeInTheDocument();
      expect(screen.getByTestId('rel-doc-card-usr-003_usr-001')).toBeInTheDocument();
    });

    // Switch to Caregiver-Patient subtab and approve pending caregiver Rohan Mehta (usr-004_usr-001)
    fireEvent.click(screen.getByTestId('rel-subtab-caregiver'));
    await waitFor(() => {
      expect(screen.getByTestId('rel-cg-card-usr-004_usr-001')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('rel-cg-note-usr-004_usr-001'), {
      target: { value: 'Patient family consent verified by Admin' },
    });
    fireEvent.click(screen.getByTestId('rel-cg-approve-usr-004_usr-001'));

    await waitFor(() => {
      expect(screen.getByTestId('rel-cg-status-usr-004_usr-001')).toHaveTextContent('Approved / Active');
    });

    // Audit History subtab displays the approval
    fireEvent.click(screen.getByTestId('rel-subtab-audit'));
    expect(screen.getByText(/Patient family consent verified by Admin/i)).toBeInTheDocument();
    unmount();

    // DoctorDashboard My Assigned Patients card check
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: { ...DEMO_USERS['doctor@saksham.care'], uid: 'demo-doctor-001', role: 'doctor', status: 'verified' },
      role: 'doctor',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      logout: vi.fn(),
      sendPasswordReset: vi.fn(),
      switchDemoRole: vi.fn(),
      setRole: vi.fn(),
      clearError: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LanguageProvider>
          <DoctorDashboard />
        </LanguageProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('doctor-assigned-patients-section')).toBeInTheDocument();
    });
  });

  it('localizes relationship UI strings cleanly across all 7 languages', () => {
    const en = getRelationshipUi('en');
    for (const lang of ALL_7_CODES) {
      const ui = getRelationshipUi(lang);
      expect(ui.myCareTeamTitle.trim().length).toBeGreaterThan(2);
      expect(ui.adminTabRelationships.trim().length).toBeGreaterThan(2);
      if (lang !== 'en') {
        expect(ui.myCareTeamTitle).not.toBe(en.myCareTeamTitle);
        expect(ui.myAssignedPatientsTitle).not.toBe(en.myAssignedPatientsTitle);
        expect(ui.myConnectedPatientsTitle).not.toBe(en.myConnectedPatientsTitle);
      }
    }
  });
});
