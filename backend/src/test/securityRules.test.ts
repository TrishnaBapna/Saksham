import { describe, it, expect } from 'vitest';

/**
 * Logical Security Policy Simulator for Firestore Security Rules
 * Mirrors exact rule functions defined in backend/firestore.rules
 */

interface MockAuth {
  uid: string;
  token?: {
    role?: string;
  };
}

interface MockDoc {
  data: Record<string, any>;
}

class SecurityRulesPolicySimulator {
  // Simulates users collection create rule
  static canCreateUser(
    auth: MockAuth | null,
    userId: string,
    newData: Record<string, any>
  ): { allowed: boolean; reason?: string } {
    if (!auth || auth.uid !== userId) {
      return { allowed: false, reason: 'Not authenticated or uid mismatch' };
    }
    if (newData.uid !== userId) {
      return { allowed: false, reason: 'Document uid does not match authenticated uid' };
    }
    if (newData.role === 'admin') {
      return { allowed: false, reason: 'Public creation of administrator accounts is strictly forbidden' };
    }
    if (!['patient', 'caregiver', 'doctor'].includes(newData.role)) {
      return { allowed: false, reason: 'Role is invalid or not permitted on public registration' };
    }
    // Doctors must have status 'pending'
    if (newData.role === 'doctor' && newData.status !== 'pending') {
      return { allowed: false, reason: 'Initial status for doctor registration must be pending' };
    }
    // Patient / Caregiver status
    if (['patient', 'caregiver'].includes(newData.role) && !['verified', 'pending'].includes(newData.status)) {
      return { allowed: false, reason: 'Invalid initial status' };
    }

    const allowedKeys = [
      'uid', 'email', 'displayName', 'role', 'status', 'phoneNumber',
      'photoURL', 'licenseNumber', 'specialty', 'hospital', 'invitationCode', 'createdAt'
    ];
    const incomingKeys = Object.keys(newData);
    const hasOnlyAllowed = incomingKeys.every((k) => allowedKeys.includes(k));
    if (!hasOnlyAllowed) {
      return { allowed: false, reason: 'Unauthorized fields present in creation payload' };
    }

    return { allowed: true };
  }

  // Simulates users collection update rule
  static canUpdateUser(
    auth: MockAuth | null,
    userId: string,
    currentDoc: MockDoc,
    newDoc: MockDoc,
    userRecordRole?: string
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated' };
    }

    const isAdmin = auth.token?.role === 'admin' || userRecordRole === 'admin';
    if (isAdmin) {
      return { allowed: true };
    }

    const isOwner = auth.uid === userId;
    if (!isOwner) {
      return { allowed: false, reason: 'Cannot update other user documents' };
    }

    // Check affected keys
    const privilegedKeys = ['role', 'isVerified', 'status', 'licenseNumber', 'verificationStatus', 'uid'];
    const affectedKeys = Object.keys(newDoc.data).filter(
      (key) => newDoc.data[key] !== currentDoc.data[key]
    );

    const touchesPrivileged = affectedKeys.some((k) => privilegedKeys.includes(k));
    if (touchesPrivileged) {
      return { allowed: false, reason: 'Cannot modify privileged or administrative fields' };
    }

    return { allowed: true };
  }

  // Simulates reading patient medical record
  static canReadPatientRecord(
    auth: MockAuth | null,
    patientId: string,
    mockDb: {
      relationships?: Record<string, { status: string }>;
      doctorAssignments?: Record<string, { status: string }>;
      users?: Record<string, { role: string; status: string }>;
    }
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated' };
    }

    // 1. Patient reading self
    if (auth.uid === patientId) {
      return { allowed: true };
    }

    // Resolve user role
    const callerRole = auth.token?.role || mockDb.users?.[auth.uid]?.role;

    // 2. Connected Caregiver
    if (callerRole === 'caregiver') {
      const relKey = `${auth.uid}_${patientId}`;
      const rel = mockDb.relationships?.[relKey];
      if (rel && rel.status === 'active') {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Caregiver has no active authorized relationship with this patient' };
    }

    // 3. Assigned Doctor
    if (callerRole === 'doctor') {
      const assignmentKey = `${auth.uid}_${patientId}`;
      const assignment = mockDb.doctorAssignments?.[assignmentKey];
      if (assignment && assignment.status === 'active') {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Doctor is not actively assigned to this patient in doctorAssignments' };
    }

    return { allowed: false, reason: 'Access denied: role boundary' };
  }
}

describe('Firestore Security Rules Policy Verification', () => {
  it('prevents a patient from creating an admin account', () => {
    const auth: MockAuth = { uid: 'malicious-user-01' };
    const payload = {
      uid: 'malicious-user-01',
      email: 'hacker@example.com',
      displayName: 'Hacker',
      role: 'admin', // Attack: Self-assigning admin
      status: 'verified',
    };

    const result = SecurityRulesPolicySimulator.canCreateUser(auth, 'malicious-user-01', payload);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('administrator accounts is strictly forbidden');
  });

  it('prevents a patient from changing their role from patient to admin or doctor', () => {
    const auth: MockAuth = { uid: 'patient-user-01' };
    const currentDoc: MockDoc = {
      data: {
        uid: 'patient-user-01',
        displayName: 'Sunita Sharma',
        role: 'patient',
        status: 'verified',
      },
    };
    const newDoc: MockDoc = {
      data: {
        uid: 'patient-user-01',
        displayName: 'Sunita Sharma',
        role: 'admin', // Attack: Role elevation
        status: 'verified',
      },
    };

    const result = SecurityRulesPolicySimulator.canUpdateUser(
      auth,
      'patient-user-01',
      currentDoc,
      newDoc,
      'patient'
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('privileged or administrative fields');
  });

  it('prevents a pending doctor from self-verifying their account status', () => {
    // Test on create: Doctor cannot register with status: 'verified'
    const auth: MockAuth = { uid: 'doc-user-01' };
    const createPayload = {
      uid: 'doc-user-01',
      email: 'dr.new@clinic.org',
      displayName: 'Dr. New',
      role: 'doctor',
      status: 'verified', // Attack: Attempting to bypass verification
      licenseNumber: 'MCI-9988',
      specialty: 'Neurology',
    };

    const createResult = SecurityRulesPolicySimulator.canCreateUser(auth, 'doc-user-01', createPayload);
    expect(createResult.allowed).toBe(false);
    expect(createResult.reason).toContain('Initial status for doctor registration must be pending');

    // Test on update: Pending doctor attempting to change status to 'verified'
    const currentDoc: MockDoc = {
      data: {
        uid: 'doc-user-01',
        role: 'doctor',
        status: 'pending',
      },
    };
    const updatePayload: MockDoc = {
      data: {
        uid: 'doc-user-01',
        role: 'doctor',
        status: 'verified', // Attack: Self-updating status
      },
    };

    const updateResult = SecurityRulesPolicySimulator.canUpdateUser(
      auth,
      'doc-user-01',
      currentDoc,
      updatePayload,
      'doctor'
    );
    expect(updateResult.allowed).toBe(false);
    expect(updateResult.reason).toContain('privileged or administrative fields');
  });

  it('denies an unassigned doctor from reading patient records', () => {
    const auth: MockAuth = { uid: 'unassigned-doctor-01' };
    const patientId = 'patient-target-01';

    const mockDb = {
      users: {
        'unassigned-doctor-01': { role: 'doctor', status: 'verified' },
      },
      doctorAssignments: {}, // No assignment exists!
    };

    const result = SecurityRulesPolicySimulator.canReadPatientRecord(auth, patientId, mockDb);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Doctor is not actively assigned to this patient in doctorAssignments');
  });

  it('allows an assigned doctor to access an authorized patient record', () => {
    const auth: MockAuth = { uid: 'assigned-doctor-01' };
    const patientId = 'patient-target-01';

    const mockDb = {
      users: {
        'assigned-doctor-01': { role: 'doctor', status: 'verified' },
      },
      doctorAssignments: {
        'assigned-doctor-01_patient-target-01': { status: 'active' },
      },
    };

    const result = SecurityRulesPolicySimulator.canReadPatientRecord(auth, patientId, mockDb);
    expect(result.allowed).toBe(true);
  });

  it('denies an unlinked caregiver from accessing patient records', () => {
    const auth: MockAuth = { uid: 'stranger-caregiver-01' };
    const patientId = 'patient-target-01';

    const mockDb = {
      users: {
        'stranger-caregiver-01': { role: 'caregiver', status: 'verified' },
      },
      relationships: {}, // No active relationship
    };

    const result = SecurityRulesPolicySimulator.canReadPatientRecord(auth, patientId, mockDb);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Caregiver has no active authorized relationship');
  });

  it('allows a connected caregiver with active relationship to access patient records', () => {
    const auth: MockAuth = { uid: 'caregiver-daughter-01' };
    const patientId = 'patient-target-01';

    const mockDb = {
      users: {
        'caregiver-daughter-01': { role: 'caregiver', status: 'verified' },
      },
      relationships: {
        'caregiver-daughter-01_patient-target-01': { status: 'active' },
      },
    };

    const result = SecurityRulesPolicySimulator.canReadPatientRecord(auth, patientId, mockDb);
    expect(result.allowed).toBe(true);
  });
});
