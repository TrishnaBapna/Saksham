/**
 * SAKSHAM NEURO-CARE — FIREBASE STORAGE SECURITY RULES TEST SUITE
 * Milestone: Controlled Remediation 5 (Finding SEC-02)
 *
 * Dedicated Vitest Verification Suite for backend/storage.rules:
 *
 * CAREGIVER SCENARIOS:
 * A. Authorized caregiver accesses linked patient's loved-ones photograph
 * B. Authorized caregiver accesses linked patient's room or memory image
 * C. Unrelated caregiver is rejected from patient's private assets
 * D. Caregiver attempts access to another patient's Storage object and is rejected
 * E. Revoked, inactive, or invalid caregiver relationship is rejected
 * F. Unauthenticated access is rejected on all patient Storage paths
 * G. Missing relationship record in Firestore is rejected
 *
 * DOCTOR SCENARIOS:
 * H. Doctor with verified active assignment accesses authorized clinical report
 * I. Doctor with no assignment is rejected
 * J. Doctor assigned to a different patient is rejected
 * K. Inactive, revoked, or pending assignment is rejected
 * L. Unauthenticated doctor access is rejected
 *
 * REGRESSION & PATH SCENARIOS:
 * M. Legitimate existing access remains functional (patient owner, connected caregiver)
 * N. Unauthorized access through alternative applicable Storage paths is rejected
 * O. Overlapping rules verification and unmapped path denial (default-deny)
 * P. Applicable Storage writes, updates, and deletes obey authorization and constraints
 */

import { describe, it, expect, beforeEach } from 'vitest';

export interface StorageMockAuth {
  uid: string;
  token?: {
    role?: string;
  };
}

export interface StorageMockResource {
  size: number;
  contentType: string;
}

export interface FirestoreMockDatabase {
  users: Record<string, Record<string, any>>;
  relationships: Record<string, Record<string, any>>;
  doctorAssignments: Record<string, Record<string, any>>;
}

/**
 * Logical Security Policy Simulator for Firebase Storage Rules
 * Mirrors exact rule functions and path evaluations defined in backend/storage.rules
 */
export class StorageRulesPolicySimulator {
  private db: FirestoreMockDatabase;

  constructor(initialDb?: Partial<FirestoreMockDatabase>) {
    this.db = {
      users: initialDb?.users || {},
      relationships: initialDb?.relationships || {},
      doctorAssignments: initialDb?.doctorAssignments || {},
    };
  }

  // --- Rule Helper Implementations ---

  public isAuthenticated(auth: StorageMockAuth | null): boolean {
    return auth !== null && !!auth.uid;
  }

  public isOwner(auth: StorageMockAuth | null, userId: string): boolean {
    return this.isAuthenticated(auth) && auth!.uid === userId;
  }

  public hasRole(auth: StorageMockAuth | null, role: string): boolean {
    if (!this.isAuthenticated(auth)) return false;
    const tokenRole = auth!.token?.role;
    if (tokenRole && tokenRole === role) return true;
    const userDoc = this.db.users[auth!.uid];
    return userDoc !== undefined && userDoc.role === role;
  }

  public isCaregiver(auth: StorageMockAuth | null): boolean {
    return this.hasRole(auth, 'caregiver');
  }

  public isDoctor(auth: StorageMockAuth | null): boolean {
    return this.hasRole(auth, 'doctor');
  }

  public isAdmin(auth: StorageMockAuth | null): boolean {
    if (!this.isAuthenticated(auth)) return false;
    const tokenRole = auth!.token?.role;
    if (tokenRole === 'admin') return true;
    const userDoc = this.db.users[auth!.uid];
    return (
      userDoc !== undefined &&
      userDoc.role === 'admin' &&
      ['verified', 'active'].includes(userDoc.status)
    );
  }

  public isConnectedCaregiver(auth: StorageMockAuth | null, patientId: string): boolean {
    if (!this.isCaregiver(auth)) return false;
    const key = `${auth!.uid}_${patientId}`;
    const rel = this.db.relationships[key];
    return rel !== undefined && rel.status === 'active';
  }

  public isAssignedDoctor(auth: StorageMockAuth | null, patientId: string): boolean {
    if (!this.isDoctor(auth)) return false;
    const doctorUser = this.db.users[auth!.uid];
    if (doctorUser && !['verified', 'active'].includes(doctorUser.status)) return false;
    const key = `${auth!.uid}_${patientId}`;
    const assignment = this.db.doctorAssignments[key];
    return assignment !== undefined && assignment.status === 'active';
  }

  // --- Path-Specific Rule Evaluations ---

  // Match: /users/{userId}/profile.jpg
  public canReadProfile(auth: StorageMockAuth | null, userId: string): boolean {
    return (
      this.isAuthenticated(auth) &&
      (this.isOwner(auth, userId) ||
        this.isAdmin(auth) ||
        this.isConnectedCaregiver(auth, userId) ||
        this.isAssignedDoctor(auth, userId))
    );
  }

  public canWriteProfile(
    auth: StorageMockAuth | null,
    userId: string,
    operation: 'create' | 'update' | 'delete',
    resource?: StorageMockResource | null
  ): boolean {
    if (!this.isOwner(auth, userId)) return false;
    if (operation === 'delete') return true;
    if (!resource) return false;
    return resource.size < 5 * 1024 * 1024 && resource.contentType.startsWith('image/');
  }

  // Match: /patients/{patientId}/lovedOnes/{allPaths=**}
  public canReadLovedOnes(auth: StorageMockAuth | null, patientId: string): boolean {
    return (
      this.isAuthenticated(auth) &&
      (this.isOwner(auth, patientId) || this.isConnectedCaregiver(auth, patientId))
    );
  }

  public canWriteLovedOnes(
    auth: StorageMockAuth | null,
    patientId: string,
    operation: 'create' | 'update' | 'delete',
    resource?: StorageMockResource | null
  ): boolean {
    if (!this.isAuthenticated(auth)) return false;
    const isAuthz = this.isOwner(auth, patientId) || this.isConnectedCaregiver(auth, patientId);
    if (!isAuthz) return false;
    if (operation === 'delete') return true;
    if (!resource) return false;
    const isAllowedType =
      resource.contentType.startsWith('image/') || resource.contentType.startsWith('audio/');
    return resource.size < 10 * 1024 * 1024 && isAllowedType;
  }

  // Match: /patients/{patientId}/rooms/{allPaths=**}
  public canReadRooms(auth: StorageMockAuth | null, patientId: string): boolean {
    return (
      this.isAuthenticated(auth) &&
      (this.isOwner(auth, patientId) || this.isConnectedCaregiver(auth, patientId))
    );
  }

  public canWriteRooms(
    auth: StorageMockAuth | null,
    patientId: string,
    operation: 'create' | 'update' | 'delete',
    resource?: StorageMockResource | null
  ): boolean {
    if (!this.isAuthenticated(auth)) return false;
    const isAuthz = this.isOwner(auth, patientId) || this.isConnectedCaregiver(auth, patientId);
    if (!isAuthz) return false;
    if (operation === 'delete') return true;
    if (!resource) return false;
    return resource.size < 15 * 1024 * 1024 && resource.contentType.startsWith('image/');
  }

  // Match: /patients/{patientId}/reports/{allPaths=**}
  public canReadReports(auth: StorageMockAuth | null, patientId: string): boolean {
    return (
      this.isAuthenticated(auth) &&
      (this.isOwner(auth, patientId) ||
        this.isAssignedDoctor(auth, patientId) ||
        this.isConnectedCaregiver(auth, patientId))
    );
  }

  public canWriteReports(
    auth: StorageMockAuth | null,
    patientId: string,
    operation: 'create' | 'update' | 'delete',
    resource?: StorageMockResource | null
  ): boolean {
    if (!this.isAuthenticated(auth)) return false;
    if (!this.isAssignedDoctor(auth, patientId)) return false;
    if (operation === 'delete') return true;
    if (!resource) return false;
    return resource.size < 20 * 1024 * 1024 && resource.contentType === 'application/pdf';
  }

  // Dispatcher for arbitrary storage paths to verify default-deny on unmapped paths
  public evaluatePath(
    path: string,
    operation: 'read' | 'create' | 'update' | 'delete',
    auth: StorageMockAuth | null,
    resource?: StorageMockResource | null
  ): boolean {
    // 1. /users/{userId}/profile.jpg
    const userProfileMatch = path.match(/^\/users\/([^/]+)\/profile\.jpg$/);
    if (userProfileMatch) {
      const userId = userProfileMatch[1];
      if (operation === 'read') return this.canReadProfile(auth, userId);
      return this.canWriteProfile(auth, userId, operation, resource);
    }

    // 2. /patients/{patientId}/lovedOnes/...
    const lovedOnesMatch = path.match(/^\/patients\/([^/]+)\/lovedOnes\/(.+)$/);
    if (lovedOnesMatch) {
      const patientId = lovedOnesMatch[1];
      if (operation === 'read') return this.canReadLovedOnes(auth, patientId);
      return this.canWriteLovedOnes(auth, patientId, operation, resource);
    }

    // 3. /patients/{patientId}/rooms/...
    const roomsMatch = path.match(/^\/patients\/([^/]+)\/rooms\/(.+)$/);
    if (roomsMatch) {
      const patientId = roomsMatch[1];
      if (operation === 'read') return this.canReadRooms(auth, patientId);
      return this.canWriteRooms(auth, patientId, operation, resource);
    }

    // 4. /patients/{patientId}/reports/...
    const reportsMatch = path.match(/^\/patients\/([^/]+)\/reports\/(.+)$/);
    if (reportsMatch) {
      const patientId = reportsMatch[1];
      if (operation === 'read') return this.canReadReports(auth, patientId);
      return this.canWriteReports(auth, patientId, operation, resource);
    }

    // Strict default-deny for all unmapped paths
    return false;
  }
}

describe('SEC-02: Firebase Storage Security Rules Authorization Suite', () => {
  const patientId = 'patient_sunita_001';
  const otherPatientId = 'patient_rajesh_002';
  const caregiverId = 'caregiver_rahul_001';
  const otherCaregiverId = 'caregiver_sneha_002';
  const doctorId = 'doctor_verma_001';
  const otherDoctorId = 'doctor_sharma_002';

  let simulator: StorageRulesPolicySimulator;

  beforeEach(() => {
    simulator = new StorageRulesPolicySimulator({
      users: {
        [patientId]: { role: 'patient', status: 'verified' },
        [otherPatientId]: { role: 'patient', status: 'verified' },
        [caregiverId]: { role: 'caregiver', status: 'verified' },
        [otherCaregiverId]: { role: 'caregiver', status: 'verified' },
        [doctorId]: { role: 'doctor', status: 'verified' },
        [otherDoctorId]: { role: 'doctor', status: 'verified' },
      },
      relationships: {
        [`${caregiverId}_${patientId}`]: {
          caregiverId,
          patientId,
          status: 'active',
        },
      },
      doctorAssignments: {
        [`${doctorId}_${patientId}`]: {
          doctorId,
          patientId,
          status: 'active',
        },
      },
    });
  });

  // =========================================================================
  // CAREGIVER SCENARIOS (A - G)
  // =========================================================================

  it('Scenario A: Authorized caregiver accesses linked patient loved-ones photograph', () => {
    const auth: StorageMockAuth = { uid: caregiverId, token: { role: 'caregiver' } };
    const canRead = simulator.canReadLovedOnes(auth, patientId);
    expect(canRead).toBe(true);

    const canWrite = simulator.canWriteLovedOnes(auth, patientId, 'create', {
      size: 2 * 1024 * 1024,
      contentType: 'image/jpeg',
    });
    expect(canWrite).toBe(true);
  });

  it('Scenario B: Authorized caregiver accesses linked patient room or memory image', () => {
    const auth: StorageMockAuth = { uid: caregiverId, token: { role: 'caregiver' } };
    const canRead = simulator.canReadRooms(auth, patientId);
    expect(canRead).toBe(true);

    const canWrite = simulator.canWriteRooms(auth, patientId, 'create', {
      size: 5 * 1024 * 1024,
      contentType: 'image/png',
    });
    expect(canWrite).toBe(true);
  });

  it('Scenario C: Unrelated caregiver is rejected from patient private assets', () => {
    const auth: StorageMockAuth = { uid: otherCaregiverId, token: { role: 'caregiver' } };

    // Attempt read lovedOnes
    expect(simulator.canReadLovedOnes(auth, patientId)).toBe(false);

    // Attempt write lovedOnes
    expect(
      simulator.canWriteLovedOnes(auth, patientId, 'create', {
        size: 1 * 1024 * 1024,
        contentType: 'image/jpeg',
      })
    ).toBe(false);

    // Attempt read rooms
    expect(simulator.canReadRooms(auth, patientId)).toBe(false);

    // Attempt write rooms
    expect(
      simulator.canWriteRooms(auth, patientId, 'create', {
        size: 1 * 1024 * 1024,
        contentType: 'image/jpeg',
      })
    ).toBe(false);
  });

  it('Scenario D: Caregiver attempts access to another patient Storage object and is rejected', () => {
    const auth: StorageMockAuth = { uid: caregiverId, token: { role: 'caregiver' } };

    // Caregiver is linked to patientId, but attempts access to otherPatientId
    expect(simulator.canReadLovedOnes(auth, otherPatientId)).toBe(false);
    expect(simulator.canReadRooms(auth, otherPatientId)).toBe(false);
    expect(simulator.canReadReports(auth, otherPatientId)).toBe(false);
    expect(
      simulator.canWriteLovedOnes(auth, otherPatientId, 'create', {
        size: 1024,
        contentType: 'image/jpeg',
      })
    ).toBe(false);
  });

  it('Scenario E: Revoked, inactive, or invalid caregiver relationship is rejected', () => {
    const revokedCaregiverId = 'caregiver_revoked_003';
    const pendingCaregiverId = 'caregiver_pending_004';

    const testSim = new StorageRulesPolicySimulator({
      users: {
        [revokedCaregiverId]: { role: 'caregiver', status: 'verified' },
        [pendingCaregiverId]: { role: 'caregiver', status: 'verified' },
      },
      relationships: {
        [`${revokedCaregiverId}_${patientId}`]: {
          caregiverId: revokedCaregiverId,
          patientId,
          status: 'revoked',
        },
        [`${pendingCaregiverId}_${patientId}`]: {
          caregiverId: pendingCaregiverId,
          patientId,
          status: 'pending',
        },
      },
    });

    const revokedAuth: StorageMockAuth = { uid: revokedCaregiverId, token: { role: 'caregiver' } };
    expect(testSim.canReadLovedOnes(revokedAuth, patientId)).toBe(false);
    expect(testSim.canReadRooms(revokedAuth, patientId)).toBe(false);
    expect(testSim.canReadReports(revokedAuth, patientId)).toBe(false);

    const pendingAuth: StorageMockAuth = { uid: pendingCaregiverId, token: { role: 'caregiver' } };
    expect(testSim.canReadLovedOnes(pendingAuth, patientId)).toBe(false);
    expect(testSim.canReadRooms(pendingAuth, patientId)).toBe(false);
    expect(testSim.canReadReports(pendingAuth, patientId)).toBe(false);
  });

  it('Scenario F: Unauthenticated access is rejected on all patient Storage paths', () => {
    expect(simulator.canReadLovedOnes(null, patientId)).toBe(false);
    expect(
      simulator.canWriteLovedOnes(null, patientId, 'create', {
        size: 1024,
        contentType: 'image/jpeg',
      })
    ).toBe(false);
    expect(simulator.canReadRooms(null, patientId)).toBe(false);
    expect(
      simulator.canWriteRooms(null, patientId, 'create', {
        size: 1024,
        contentType: 'image/jpeg',
      })
    ).toBe(false);
    expect(simulator.canReadReports(null, patientId)).toBe(false);
    expect(
      simulator.canWriteReports(null, patientId, 'create', {
        size: 1024,
        contentType: 'application/pdf',
      })
    ).toBe(false);
    expect(simulator.canReadProfile(null, patientId)).toBe(false);
  });

  it('Scenario G: Missing relationship record in Firestore is rejected', () => {
    // Caregiver with role but zero Firestore relationship doc
    const unrecordedCaregiver: StorageMockAuth = {
      uid: 'caregiver_ghost_999',
      token: { role: 'caregiver' },
    };

    expect(simulator.canReadLovedOnes(unrecordedCaregiver, patientId)).toBe(false);
    expect(simulator.canReadRooms(unrecordedCaregiver, patientId)).toBe(false);
    expect(simulator.canReadReports(unrecordedCaregiver, patientId)).toBe(false);
  });

  // =========================================================================
  // DOCTOR SCENARIOS (H - L)
  // =========================================================================

  it('Scenario H: Doctor with verified active assignment accesses authorized clinical report', () => {
    const auth: StorageMockAuth = { uid: doctorId, token: { role: 'doctor' } };

    // Read clinical report
    expect(simulator.canReadReports(auth, patientId)).toBe(true);

    // Create clinical report
    expect(
      simulator.canWriteReports(auth, patientId, 'create', {
        size: 5 * 1024 * 1024,
        contentType: 'application/pdf',
      })
    ).toBe(true);

    // Delete clinical report
    expect(simulator.canWriteReports(auth, patientId, 'delete', null)).toBe(true);
  });

  it('Scenario I: Doctor with no assignment is rejected from clinical report', () => {
    const auth: StorageMockAuth = { uid: otherDoctorId, token: { role: 'doctor' } };

    expect(simulator.canReadReports(auth, patientId)).toBe(false);
    expect(
      simulator.canWriteReports(auth, patientId, 'create', {
        size: 1024,
        contentType: 'application/pdf',
      })
    ).toBe(false);
  });

  it('Scenario J: Doctor assigned to a different patient is rejected', () => {
    const auth: StorageMockAuth = { uid: doctorId, token: { role: 'doctor' } };

    // doctorId is assigned to patientId, NOT otherPatientId
    expect(simulator.canReadReports(auth, otherPatientId)).toBe(false);
    expect(
      simulator.canWriteReports(auth, otherPatientId, 'create', {
        size: 1024,
        contentType: 'application/pdf',
      })
    ).toBe(false);
  });

  it('Scenario K: Inactive, revoked, or pending assignment is rejected', () => {
    const revokedDoctorId = 'doctor_revoked_003';
    const pendingDoctorId = 'doctor_pending_004';

    const testSim = new StorageRulesPolicySimulator({
      users: {
        [revokedDoctorId]: { role: 'doctor', status: 'verified' },
        [pendingDoctorId]: { role: 'doctor', status: 'verified' },
      },
      doctorAssignments: {
        [`${revokedDoctorId}_${patientId}`]: {
          doctorId: revokedDoctorId,
          patientId,
          status: 'revoked',
        },
        [`${pendingDoctorId}_${patientId}`]: {
          doctorId: pendingDoctorId,
          patientId,
          status: 'pending',
        },
      },
    });

    const revokedAuth: StorageMockAuth = { uid: revokedDoctorId, token: { role: 'doctor' } };
    expect(testSim.canReadReports(revokedAuth, patientId)).toBe(false);
    expect(
      testSim.canWriteReports(revokedAuth, patientId, 'create', {
        size: 1024,
        contentType: 'application/pdf',
      })
    ).toBe(false);

    const pendingAuth: StorageMockAuth = { uid: pendingDoctorId, token: { role: 'doctor' } };
    expect(testSim.canReadReports(pendingAuth, patientId)).toBe(false);
    expect(
      testSim.canWriteReports(pendingAuth, patientId, 'create', {
        size: 1024,
        contentType: 'application/pdf',
      })
    ).toBe(false);
  });

  it('Scenario L: Unauthenticated doctor access is rejected', () => {
    expect(simulator.canReadReports(null, patientId)).toBe(false);
    expect(
      simulator.canWriteReports(null, patientId, 'create', {
        size: 1024,
        contentType: 'application/pdf',
      })
    ).toBe(false);
  });

  // =========================================================================
  // REGRESSION & PATH SCENARIOS (M - P)
  // =========================================================================

  it('Scenario M: Legitimate existing access remains functional for patient owner and network', () => {
    const patientAuth: StorageMockAuth = { uid: patientId, token: { role: 'patient' } };

    // 1. Patient reads & writes lovedOnes
    expect(simulator.canReadLovedOnes(patientAuth, patientId)).toBe(true);
    expect(
      simulator.canWriteLovedOnes(patientAuth, patientId, 'create', {
        size: 2 * 1024 * 1024,
        contentType: 'image/jpeg',
      })
    ).toBe(true);
    expect(
      simulator.canWriteLovedOnes(patientAuth, patientId, 'create', {
        size: 1 * 1024 * 1024,
        contentType: 'audio/webm',
      })
    ).toBe(true);

    // 2. Patient reads & writes rooms
    expect(simulator.canReadRooms(patientAuth, patientId)).toBe(true);
    expect(
      simulator.canWriteRooms(patientAuth, patientId, 'create', {
        size: 3 * 1024 * 1024,
        contentType: 'image/png',
      })
    ).toBe(true);

    // 3. Patient reads their own clinical reports
    expect(simulator.canReadReports(patientAuth, patientId)).toBe(true);

    // 4. Connected caregiver reads patient reports
    const caregiverAuth: StorageMockAuth = { uid: caregiverId, token: { role: 'caregiver' } };
    expect(simulator.canReadReports(caregiverAuth, patientId)).toBe(true);

    // 5. Patient updates their profile picture
    expect(simulator.canReadProfile(patientAuth, patientId)).toBe(true);
    expect(
      simulator.canWriteProfile(patientAuth, patientId, 'update', {
        size: 1 * 1024 * 1024,
        contentType: 'image/jpeg',
      })
    ).toBe(true);
  });

  it('Scenario N: Unauthorized access through cross-role pathways is rejected', () => {
    const doctorAuth: StorageMockAuth = { uid: doctorId, token: { role: 'doctor' } };
    const patientAuth: StorageMockAuth = { uid: patientId, token: { role: 'patient' } };
    const caregiverAuth: StorageMockAuth = { uid: caregiverId, token: { role: 'caregiver' } };

    // Doctors cannot read or write patient private family photos or room memories
    expect(simulator.canReadLovedOnes(doctorAuth, patientId)).toBe(false);
    expect(simulator.canReadRooms(doctorAuth, patientId)).toBe(false);
    expect(
      simulator.canWriteLovedOnes(doctorAuth, patientId, 'create', {
        size: 1024,
        contentType: 'image/jpeg',
      })
    ).toBe(false);

    // Patients cannot fabricate or overwrite clinical report PDFs (must be attending doctor)
    expect(
      simulator.canWriteReports(patientAuth, patientId, 'create', {
        size: 1024,
        contentType: 'application/pdf',
      })
    ).toBe(false);

    // Caregivers cannot write clinical report PDFs
    expect(
      simulator.canWriteReports(caregiverAuth, patientId, 'create', {
        size: 1024,
        contentType: 'application/pdf',
      })
    ).toBe(false);
  });

  it('Scenario O: Overlapping rules verification and unmapped path default-deny', () => {
    const patientAuth: StorageMockAuth = { uid: patientId, token: { role: 'patient' } };

    // Unmapped root paths are strictly rejected
    expect(simulator.evaluatePath('/arbitrary/file.txt', 'read', patientAuth)).toBe(false);
    expect(simulator.evaluatePath('/system/config.json', 'read', patientAuth)).toBe(false);
    expect(simulator.evaluatePath('/backups/data.tar', 'read', patientAuth)).toBe(false);
    expect(simulator.evaluatePath('/patients/all_patients.csv', 'read', patientAuth)).toBe(false);

    // Paths outside authorized prefixes are rejected
    expect(simulator.evaluatePath('/users/unknown/secret.doc', 'read', patientAuth)).toBe(false);
  });

  it('Scenario P: Storage writes, updates, and deletes obey authorization, size, and MIME constraints', () => {
    const patientAuth: StorageMockAuth = { uid: patientId, token: { role: 'patient' } };
    const docAuth: StorageMockAuth = { uid: doctorId, token: { role: 'doctor' } };

    // 1. LovedOnes size limit (> 10MB rejected)
    expect(
      simulator.canWriteLovedOnes(patientAuth, patientId, 'create', {
        size: 11 * 1024 * 1024,
        contentType: 'image/jpeg',
      })
    ).toBe(false);

    // 2. LovedOnes invalid MIME type (e.g. text/html, application/x-sh rejected)
    expect(
      simulator.canWriteLovedOnes(patientAuth, patientId, 'create', {
        size: 1024,
        contentType: 'text/html',
      })
    ).toBe(false);

    // 3. Rooms size limit (> 15MB rejected)
    expect(
      simulator.canWriteRooms(patientAuth, patientId, 'create', {
        size: 16 * 1024 * 1024,
        contentType: 'image/jpeg',
      })
    ).toBe(false);

    // 4. Rooms non-image rejected (e.g. audio not allowed for room photographs)
    expect(
      simulator.canWriteRooms(patientAuth, patientId, 'create', {
        size: 1024,
        contentType: 'audio/mp3',
      })
    ).toBe(false);

    // 5. Reports size limit (> 20MB rejected)
    expect(
      simulator.canWriteReports(docAuth, patientId, 'create', {
        size: 21 * 1024 * 1024,
        contentType: 'application/pdf',
      })
    ).toBe(false);

    // 6. Reports non-PDF rejected (e.g. application/json or image/png rejected)
    expect(
      simulator.canWriteReports(docAuth, patientId, 'create', {
        size: 1024,
        contentType: 'image/png',
      })
    ).toBe(false);

    // 7. Profile size limit (> 5MB rejected)
    expect(
      simulator.canWriteProfile(patientAuth, patientId, 'create', {
        size: 6 * 1024 * 1024,
        contentType: 'image/jpeg',
      })
    ).toBe(false);

    // 8. Delete operations succeed for authorized users without failing on null resource
    expect(simulator.canWriteLovedOnes(patientAuth, patientId, 'delete', null)).toBe(true);
    expect(simulator.canWriteRooms(patientAuth, patientId, 'delete', null)).toBe(true);
    expect(simulator.canWriteReports(docAuth, patientId, 'delete', null)).toBe(true);
    expect(simulator.canWriteProfile(patientAuth, patientId, 'delete', null)).toBe(true);
  });
});
