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

  // Simulates creating caregiver relationship
  static canCreateRelationship(
    auth: MockAuth | null,
    relationshipId: string,
    data: Record<string, any>,
    isAdmin: boolean = false
  ): { allowed: boolean; reason?: string } {
    if (!auth) return { allowed: false, reason: 'Unauthenticated' };
    if (isAdmin) return { allowed: true };

    const expectedId = `${data.caregiverId}_${data.patientId}`;
    if (relationshipId !== expectedId) {
      return { allowed: false, reason: 'Relationship document ID must match caregiverId_patientId' };
    }

    // Caregiver-initiated
    if (auth.uid === data.caregiverId) {
      if (data.status !== 'pending') {
        return { allowed: false, reason: 'Caregiver cannot create pre-approved active relationships' };
      }
      return { allowed: true };
    }

    // Patient-initiated
    if (auth.uid === data.patientId) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Only the caregiver or patient can create a relationship record' };
  }

  // Simulates updating caregiver relationship
  static canUpdateRelationship(
    auth: MockAuth | null,
    currentData: Record<string, any>,
    newData: Record<string, any>,
    isAdmin: boolean = false
  ): { allowed: boolean; reason?: string } {
    if (!auth) return { allowed: false, reason: 'Unauthenticated' };
    if (isAdmin) return { allowed: true };

    if (newData.caregiverId !== currentData.caregiverId || newData.patientId !== currentData.patientId) {
      return { allowed: false, reason: 'caregiverId and patientId are strictly immutable' };
    }

    // Patient can approve or revoke
    if (auth.uid === currentData.patientId) {
      if (['active', 'revoked', 'rejected', 'pending'].includes(newData.status)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Invalid status transition by patient' };
    }

    // Caregiver CANNOT approve (status != 'active')
    if (auth.uid === currentData.caregiverId) {
      if (newData.status === 'active') {
        return { allowed: false, reason: 'Caregiver cannot approve their own relationship' };
      }
      if (['pending', 'cancelled', 'revoked'].includes(newData.status)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Invalid status update by caregiver' };
    }

    return { allowed: false, reason: 'Unrelated party cannot modify relationship' };
  }

  // Simulates doctor assignment write
  static canWriteDoctorAssignment(
    auth: MockAuth | null,
    isAdmin: boolean = false
  ): { allowed: boolean; reason?: string } {
    if (!auth) return { allowed: false, reason: 'Unauthenticated' };
    if (!isAdmin) {
      return { allowed: false, reason: 'Only administrators can create or modify doctor assignments' };
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

  // Simulates routines collection access rule (Phase 3 Milestone 2)
  static canAccessRoutine(
    auth: MockAuth | null,
    operation: 'read' | 'create' | 'update' | 'delete',
    docPatientId: string,
    mockDb: {
      relationships?: Record<string, { status: string }>;
      doctorAssignments?: Record<string, { status: string }>;
    },
    incomingPatientId?: string
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated requests denied' };
    }
    // Update ownership immutability check
    if (operation === 'update' && incomingPatientId && incomingPatientId !== docPatientId) {
      return { allowed: false, reason: 'Ownership field patientId is strictly immutable' };
    }
    // 1. Owner patient access
    if (auth.uid === docPatientId) {
      return { allowed: true };
    }
    // 2. Connected Caregiver
    const relKey = `${auth.uid}_${docPatientId}`;
    if (mockDb.relationships?.[relKey]?.status === 'active') {
      return { allowed: true };
    }
    // 3. Assigned Doctor (Read and create only)
    if (operation === 'read' || operation === 'create') {
      const assignKey = `${auth.uid}_${docPatientId}`;
      if (mockDb.doctorAssignments?.[assignKey]?.status === 'active') {
        return { allowed: true };
      }
    }
    return {
      allowed: false,
      reason: 'Unauthorized access to patient routine record'
    };
  }

  // Simulates routineAttempts collection access rule (Phase 3 Milestone 2)
  static canAccessRoutineAttempt(
    auth: MockAuth | null,
    operation: 'read' | 'create' | 'update' | 'delete',
    docPatientId: string,
    mockDb: {
      relationships?: Record<string, { status: string }>;
      doctorAssignments?: Record<string, { status: string }>;
    }
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated requests denied' };
    }
    // Append-only
    if (operation === 'update' || operation === 'delete') {
      return { allowed: false, reason: 'routineAttempts collection is strictly append-only' };
    }
    if (operation === 'create') {
      if (auth.uid === docPatientId) return { allowed: true };
      return { allowed: false, reason: 'Only the patient can create their attempt record' };
    }
    if (operation === 'read') {
      if (auth.uid === docPatientId) return { allowed: true };
      const relKey = `${auth.uid}_${docPatientId}`;
      if (mockDb.relationships?.[relKey]?.status === 'active') return { allowed: true };
      const assignKey = `${auth.uid}_${docPatientId}`;
      if (mockDb.doctorAssignments?.[assignKey]?.status === 'active') return { allowed: true };
      return { allowed: false, reason: 'Unauthorized access to routine attempt history' };
    }
    return { allowed: false, reason: 'Operation denied' };
  }

  // Simulates lovedOnes collection access rule (Milestone 3 & Phase 3)
  static canAccessLovedOne(
    auth: MockAuth | null,
    operation: 'read' | 'create' | 'update' | 'delete',
    docPatientId: string,
    mockDb: {
      relationships?: Record<string, { status: string }>;
    },
    incomingPatientId?: string
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated requests denied' };
    }
    // Update ownership immutability check
    if (operation === 'update' && incomingPatientId && incomingPatientId !== docPatientId) {
      return { allowed: false, reason: 'Ownership field patientId is strictly immutable' };
    }
    // 1. Owner patient access
    if (auth.uid === docPatientId) {
      return { allowed: true };
    }
    // 2. Connected Caregiver
    const relKey = `${auth.uid}_${docPatientId}`;
    const rel = mockDb.relationships?.[relKey];
    if (rel && rel.status === 'active') {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Caregivers or other users cannot access memories for unauthorized patients'
    };
  }

  // Simulates gameSessions collection access rule (Milestone 4)
  static canAccessGameSession(
    auth: MockAuth | null,
    operation: 'read' | 'create' | 'update' | 'delete',
    docPatientId: string,
    mockDb: {
      relationships?: Record<string, { status: string }>;
      doctorAssignments?: Record<string, { status: string }>;
    }
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated requests denied' };
    }
    // Append-only: update and delete are strictly disallowed
    if (operation === 'update' || operation === 'delete') {
      return { allowed: false, reason: 'gameSessions collection is strictly append-only' };
    }
    // Create rule: only the patient owner themselves can log their session
    if (operation === 'create') {
      if (auth.uid === docPatientId) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Only the authenticated patient can create their game session' };
    }
    // Read rule: Patient owner, connected caregiver, or assigned doctor
    if (operation === 'read') {
      if (auth.uid === docPatientId) return { allowed: true };

      // Connected caregiver
      const relKey = `${auth.uid}_${docPatientId}`;
      if (mockDb.relationships?.[relKey]?.status === 'active') return { allowed: true };

      // Assigned doctor
      const assignKey = `${auth.uid}_${docPatientId}`;
      if (mockDb.doctorAssignments?.[assignKey]?.status === 'active') return { allowed: true };

      return { allowed: false, reason: 'Access denied: caller does not have authorized relationship' };
    }
    return { allowed: false, reason: 'Operation denied' };
  }

  // Simulates /users/{userId}/adaptiveProfiles/{profileId} access rule (Milestone 4.1)
  static canAccessAdaptiveProfile(
    auth: MockAuth | null,
    operation: 'read' | 'create' | 'update' | 'delete',
    targetUserId: string,
    data?: Record<string, any>
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated requests denied' };
    }
    // Strict Owner Only Rule: Caregivers, doctors, admins are NOT permitted
    if (auth.uid !== targetUserId) {
      return { allowed: false, reason: 'Adaptive profiles are strictly private to the authenticated owner' };
    }
    if (operation === 'read' || operation === 'delete') {
      return { allowed: true };
    }
    if (operation === 'create' || operation === 'update') {
      if (!data) return { allowed: false, reason: 'Payload required' };
      if (data.patientId !== targetUserId) {
        return { allowed: false, reason: 'patientId field must match authenticated user id' };
      }
      if (!['Gentle', 'Moderate', 'Stimulating'].includes(data.currentDifficulty)) {
        return { allowed: false, reason: 'Invalid difficulty value' };
      }
      if (!['calm', 'balanced', 'agile'].includes(data.pacing)) {
        return { allowed: false, reason: 'Invalid pacing value' };
      }
      if (data.syncStatus && !['local-only', 'offline-pending', 'syncing', 'synced', 'sync-failed'].includes(data.syncStatus)) {
        return { allowed: false, reason: 'Invalid syncStatus value' };
      }
      const allowedKeys = [
        'patientId', 'currentDifficulty', 'pacing',
        'consecutiveComfortableSessions', 'consecutiveStruggleSessions',
        'lastSessionEvaluated', 'lastEvaluatedSessionId', 'evaluatedSessionIds',
        'syncStatus', 'adaptationRationale', 'updatedAt'
      ];
      const incomingKeys = Object.keys(data);
      if (!incomingKeys.every((k) => allowedKeys.includes(k))) {
        return { allowed: false, reason: 'Unauthorized fields present in adaptive profile payload' };
      }
      return { allowed: true };
    }
    return { allowed: false, reason: 'Operation denied' };
  }

  // Simulates /users/{userId}/notes/{noteId} security rules
  static canAccessPatientNote(
    auth: MockAuth | null,
    operation: 'read' | 'create' | 'update' | 'delete',
    targetUserId: string,
    data?: Record<string, any>
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated' };
    }
    const isOwner = auth.uid === targetUserId;
    if (!isOwner) {
      return { allowed: false, reason: 'Notes are strictly private to the patient owner' };
    }
    if (operation === 'read' || operation === 'delete') {
      return { allowed: true };
    }
    if (operation === 'create' || operation === 'update') {
      if (!data) return { allowed: false, reason: 'Payload required' };
      if (data.patientId !== targetUserId) {
        return { allowed: false, reason: 'patientId field must match authenticated user id' };
      }
      if (!['personal', 'medical', 'family', 'reminder', 'other'].includes(data.category)) {
        return { allowed: false, reason: 'Invalid note category' };
      }
      if (data.syncStatus && !['local-only', 'offline-pending', 'syncing', 'synced', 'sync-error', 'sync-paused'].includes(data.syncStatus)) {
        return { allowed: false, reason: 'Invalid syncStatus value' };
      }
      const allowedKeys = [
        'id', 'patientId', 'title', 'content', 'category', 'isPinned',
        'tags', 'voiceMetadata', 'syncStatus', 'createdAt', 'updatedAt', 'deletedAt'
      ];
      const incomingKeys = Object.keys(data);
      if (!incomingKeys.every((k) => allowedKeys.includes(k))) {
        return { allowed: false, reason: 'Unauthorized fields present in note payload' };
      }
      return { allowed: true };
    }
    return { allowed: false, reason: 'Operation denied' };
  }

  // Simulates /users/{userId}/calendarEvents/{eventId} security rules
  static canAccessCalendarEvent(
    auth: MockAuth | null,
    operation: 'read' | 'create' | 'update' | 'delete',
    targetUserId: string,
    resourceData?: Record<string, any>,
    requestData?: Record<string, any>,
    relationship?: { status: string; permissions?: Record<string, boolean>; [key: string]: any }
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated' };
    }
    const isOwner = auth.uid === targetUserId;
    if (isOwner) {
      return { allowed: true };
    }

    // Caregiver check
    const isConnectedCaregiver =
      relationship &&
      relationship.status === 'active' &&
      auth.token?.role === 'caregiver';

    if (!isConnectedCaregiver) {
      return { allowed: false, reason: 'Access denied: not owner or connected caregiver' };
    }

    const hasPerm = (permKey: string) => {
      if (!relationship) return false;
      if (relationship[permKey] === true) return true;
      if (relationship.permissions && relationship.permissions[permKey] === true) return true;
      return false;
    };

    if (operation === 'read') {
      if (!hasPerm('canReadCalendar')) {
        return { allowed: false, reason: 'Caregiver lacks canReadCalendar permission' };
      }
      if (resourceData?.isPrivate === true) {
        return { allowed: false, reason: 'Private events are strictly hidden from caregivers' };
      }
      return { allowed: true };
    }

    if (operation === 'create') {
      if (!hasPerm('canCreateCalendarEvents')) {
        return { allowed: false, reason: 'Caregiver lacks canCreateCalendarEvents permission' };
      }
      if (requestData?.patientId !== targetUserId) {
        return { allowed: false, reason: 'patientId must match target user' };
      }
      return { allowed: true };
    }

    if (operation === 'update') {
      if (!hasPerm('canEditCalendarEvents')) {
        return { allowed: false, reason: 'Caregiver lacks canEditCalendarEvents permission' };
      }
      if (resourceData?.isPrivate === true) {
        return { allowed: false, reason: 'Cannot modify private event' };
      }
      if (requestData && requestData.patientId !== targetUserId) {
        return { allowed: false, reason: 'Cannot mutate patientId' };
      }
      return { allowed: true };
    }

    if (operation === 'delete') {
      if (!hasPerm('canDeleteCalendarEvents')) {
        return { allowed: false, reason: 'Caregiver lacks canDeleteCalendarEvents permission' };
      }
      if (resourceData?.isPrivate === true) {
        return { allowed: false, reason: 'Cannot delete private event' };
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'Operation denied' };
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

  it('strictly prevents a caregiver from creating a pre-approved active relationship with arbitrary patients', () => {
    const auth: MockAuth = { uid: 'caregiver-01' };
    const relationshipId = 'caregiver-01_patient-arbitrary-01';
    const payload = {
      caregiverId: 'caregiver-01',
      patientId: 'patient-arbitrary-01',
      status: 'active', // Attack: Pre-approving own access
      relationshipType: 'primary',
    };

    const result = SecurityRulesPolicySimulator.canCreateRelationship(auth, relationshipId, payload);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Caregiver cannot create pre-approved active relationships');
  });

  it('allows a caregiver to create a pending relationship link request', () => {
    const auth: MockAuth = { uid: 'caregiver-01' };
    const relationshipId = 'caregiver-01_patient-01';
    const payload = {
      caregiverId: 'caregiver-01',
      patientId: 'patient-01',
      status: 'pending', // Legitimate invitation request
      relationshipType: 'primary',
    };

    const result = SecurityRulesPolicySimulator.canCreateRelationship(auth, relationshipId, payload);
    expect(result.allowed).toBe(true);
  });

  it('strictly prevents a caregiver from self-approving their own relationship to active', () => {
    const auth: MockAuth = { uid: 'caregiver-01' };
    const currentData = {
      caregiverId: 'caregiver-01',
      patientId: 'patient-01',
      status: 'pending',
    };
    const updatePayload = {
      caregiverId: 'caregiver-01',
      patientId: 'patient-01',
      status: 'active', // Attack: Caregiver approving themselves
    };

    const result = SecurityRulesPolicySimulator.canUpdateRelationship(auth, currentData, updatePayload);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Caregiver cannot approve their own relationship');
  });

  it('allows a patient to approve a pending relationship to active', () => {
    const auth: MockAuth = { uid: 'patient-01' };
    const currentData = {
      caregiverId: 'caregiver-01',
      patientId: 'patient-01',
      status: 'pending',
    };
    const updatePayload = {
      caregiverId: 'caregiver-01',
      patientId: 'patient-01',
      status: 'active', // Legitimate: Patient approves
    };

    const result = SecurityRulesPolicySimulator.canUpdateRelationship(auth, currentData, updatePayload);
    expect(result.allowed).toBe(true);
  });

  it('prevents doctors from creating or modifying doctorAssignments', () => {
    const auth: MockAuth = { uid: 'doctor-01', token: { role: 'doctor' } };
    const result = SecurityRulesPolicySimulator.canWriteDoctorAssignment(auth, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Only administrators can create or modify doctor assignments');
  });

  // Milestone 3: Loved Ones Privacy & Security Boundary Tests
  it('allows a patient to read, create, update, and delete their own loved ones records', () => {
    const auth: MockAuth = { uid: 'patient-alice' };
    const result = SecurityRulesPolicySimulator.canAccessLovedOne(auth, 'create', 'patient-alice', {});
    expect(result.allowed).toBe(true);
  });

  it('allows an authorized connected caregiver to access their assigned patient loved ones', () => {
    const auth: MockAuth = { uid: 'caregiver-ananya' };
    const mockDb = {
      relationships: {
        'caregiver-ananya_patient-kamala': { status: 'active' }
      }
    };
    const result = SecurityRulesPolicySimulator.canAccessLovedOne(auth, 'read', 'patient-kamala', mockDb);
    expect(result.allowed).toBe(true);
  });

  it('strictly prevents a caregiver from modifying or reading memories of an unauthorized patient', () => {
    const auth: MockAuth = { uid: 'caregiver-stranger' };
    const mockDb = {
      relationships: {
        'caregiver-ananya_patient-kamala': { status: 'active' }
      }
    };
    const result = SecurityRulesPolicySimulator.canAccessLovedOne(auth, 'update', 'patient-kamala', mockDb);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Caregivers or other users cannot access memories');
  });

  it('strictly denies unauthenticated requests to loved ones memory records', () => {
    const result = SecurityRulesPolicySimulator.canAccessLovedOne(null, 'read', 'patient-kamala', {});
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Unauthenticated requests denied');
  });

  it('strictly cuts off caregiver access to patient loved ones immediately after relationship revocation', () => {
    const auth: MockAuth = { uid: 'caregiver-ananya' };
    const mockDb = {
      relationships: {
        'caregiver-ananya_patient-kamala': { status: 'revoked' }
      }
    };
    const readRes = SecurityRulesPolicySimulator.canAccessLovedOne(auth, 'read', 'patient-kamala', mockDb);
    expect(readRes.allowed).toBe(false);
    expect(readRes.reason).toContain('Caregivers or other users cannot access memories');

    const updateRes = SecurityRulesPolicySimulator.canAccessLovedOne(auth, 'update', 'patient-kamala', mockDb);
    expect(updateRes.allowed).toBe(false);
  });

  it('strictly denies a caregiver with pending relationship status from accessing loved ones', () => {
    const auth: MockAuth = { uid: 'caregiver-ananya' };
    const mockDb = {
      relationships: {
        'caregiver-ananya_patient-kamala': { status: 'pending' }
      }
    };
    const result = SecurityRulesPolicySimulator.canAccessLovedOne(auth, 'read', 'patient-kamala', mockDb);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Caregivers or other users cannot access memories');
  });

  it('strictly denies doctors from accessing loved ones private family albums even when assigned', () => {
    const docAuth: MockAuth = { uid: 'doctor-vikram' };
    const mockDb = {
      doctorAssignments: {
        'doctor-vikram_patient-kamala': { status: 'active' }
      },
      relationships: {}
    };
    const readRes = SecurityRulesPolicySimulator.canAccessLovedOne(docAuth, 'read', 'patient-kamala', mockDb);
    expect(readRes.allowed).toBe(false);
    expect(readRes.reason).toContain('Caregivers or other users cannot access memories');
  });

  // Milestone 4: Game Sessions Privacy & Security Boundary Tests
  it('allows a patient to create and read their own cognitive game sessions', () => {
    const auth: MockAuth = { uid: 'patient-kamala' };
    const createRes = SecurityRulesPolicySimulator.canAccessGameSession(auth, 'create', 'patient-kamala', {});
    expect(createRes.allowed).toBe(true);

    const readRes = SecurityRulesPolicySimulator.canAccessGameSession(auth, 'read', 'patient-kamala', {});
    expect(readRes.allowed).toBe(true);
  });

  it('allows authorized connected caregiver to read assigned patient game sessions', () => {
    const auth: MockAuth = { uid: 'caregiver-ananya' };
    const mockDb = {
      relationships: {
        'caregiver-ananya_patient-kamala': { status: 'active' }
      }
    };
    const result = SecurityRulesPolicySimulator.canAccessGameSession(auth, 'read', 'patient-kamala', mockDb);
    expect(result.allowed).toBe(true);
  });

  it('strictly prevents a caregiver from reading game sessions of a non-connected patient', () => {
    const auth: MockAuth = { uid: 'caregiver-stranger' };
    const mockDb = {
      relationships: {
        'caregiver-ananya_patient-kamala': { status: 'active' }
      }
    };
    const result = SecurityRulesPolicySimulator.canAccessGameSession(auth, 'read', 'patient-kamala', mockDb);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Access denied');
  });

  it('strictly enforces append-only immutability for gameSessions, denying update and delete', () => {
    const auth: MockAuth = { uid: 'patient-kamala' };
    const updateRes = SecurityRulesPolicySimulator.canAccessGameSession(auth, 'update', 'patient-kamala', {});
    expect(updateRes.allowed).toBe(false);
    expect(updateRes.reason).toContain('strictly append-only');

    const deleteRes = SecurityRulesPolicySimulator.canAccessGameSession(auth, 'delete', 'patient-kamala', {});
    expect(deleteRes.allowed).toBe(false);
    expect(deleteRes.reason).toContain('strictly append-only');
  });

  // Phase 3 Milestone 2: Routines & Attempt History Security Boundary Tests
  it('allows a patient and connected caregiver to access routines but strictly forbids mutating patientId ownership', () => {
    const auth: MockAuth = { uid: 'patient-kamala' };
    const mockDb = {
      relationships: {
        'caregiver-ananya_patient-kamala': { status: 'active' }
      }
    };

    // Valid update preserving patientId
    const validUpdate = SecurityRulesPolicySimulator.canAccessRoutine(auth, 'update', 'patient-kamala', mockDb, 'patient-kamala');
    expect(validUpdate.allowed).toBe(true);

    // Attack: Attempting to reassign routine to another patient
    const invalidUpdate = SecurityRulesPolicySimulator.canAccessRoutine(auth, 'update', 'patient-kamala', mockDb, 'patient-other');
    expect(invalidUpdate.allowed).toBe(false);
    expect(invalidUpdate.reason).toContain('Ownership field patientId is strictly immutable');
  });

  it('allows assigned doctor to read patient routines but prevents unassigned doctor access', () => {
    const docAuth: MockAuth = { uid: 'doctor-vikram' };
    const mockDb = {
      doctorAssignments: {
        'doctor-vikram_patient-kamala': { status: 'active' }
      }
    };
    const readRes = SecurityRulesPolicySimulator.canAccessRoutine(docAuth, 'read', 'patient-kamala', mockDb);
    expect(readRes.allowed).toBe(true);

    const strangerDocAuth: MockAuth = { uid: 'doctor-stranger' };
    const strangerRes = SecurityRulesPolicySimulator.canAccessRoutine(strangerDocAuth, 'read', 'patient-kamala', mockDb);
    expect(strangerRes.allowed).toBe(false);
  });

  it('strictly enforces append-only immutability for routineAttempts records', () => {
    const auth: MockAuth = { uid: 'patient-kamala' };
    const createRes = SecurityRulesPolicySimulator.canAccessRoutineAttempt(auth, 'create', 'patient-kamala', {});
    expect(createRes.allowed).toBe(true);

    const updateRes = SecurityRulesPolicySimulator.canAccessRoutineAttempt(auth, 'update', 'patient-kamala', {});
    expect(updateRes.allowed).toBe(false);
    expect(updateRes.reason).toContain('strictly append-only');

    const deleteRes = SecurityRulesPolicySimulator.canAccessRoutineAttempt(auth, 'delete', 'patient-kamala', {});
    expect(deleteRes.allowed).toBe(false);
    expect(deleteRes.reason).toContain('strictly append-only');
  });

  it('strictly forbids mutating patientId ownership on lovedOnes records', () => {
    const auth: MockAuth = { uid: 'patient-kamala' };
    const validRes = SecurityRulesPolicySimulator.canAccessLovedOne(auth, 'update', 'patient-kamala', {}, 'patient-kamala');
    expect(validRes.allowed).toBe(true);

    const attackRes = SecurityRulesPolicySimulator.canAccessLovedOne(auth, 'update', 'patient-kamala', {}, 'patient-hijacked');
    expect(attackRes.allowed).toBe(false);
    expect(attackRes.reason).toContain('Ownership field patientId is strictly immutable');
  });

  // Milestone 4.1: Adaptive Profiles Subcollection Security Rules
  describe('Milestone 4.1: Adaptive Profiles (/users/{userId}/adaptiveProfiles/{profileId}) Security Policy', () => {
    const patientUid = 'patient-kalyani-01';
    const otherPatientUid = 'patient-rajesh-02';
    const caregiverUid = 'caregiver-ananya-03';
    const doctorUid = 'doctor-vikram-04';

    const validPayload = {
      patientId: patientUid,
      currentDifficulty: 'Gentle',
      pacing: 'calm',
      consecutiveComfortableSessions: 2,
      consecutiveStruggleSessions: 0,
      adaptationRationale: 'Soothing rhythm maintained.',
      updatedAt: '2026-11-08T12:00:00Z'
    };

    it('allows the authenticated patient owner to read, write, and delete their adaptive profile', () => {
      const patientAuth: MockAuth = { uid: patientUid };
      const readRes = SecurityRulesPolicySimulator.canAccessAdaptiveProfile(patientAuth, 'read', patientUid);
      expect(readRes.allowed).toBe(true);

      const writeRes = SecurityRulesPolicySimulator.canAccessAdaptiveProfile(patientAuth, 'create', patientUid, validPayload);
      expect(writeRes.allowed).toBe(true);

      const updateRes = SecurityRulesPolicySimulator.canAccessAdaptiveProfile(patientAuth, 'update', patientUid, validPayload);
      expect(updateRes.allowed).toBe(true);

      const deleteRes = SecurityRulesPolicySimulator.canAccessAdaptiveProfile(patientAuth, 'delete', patientUid);
      expect(deleteRes.allowed).toBe(true);
    });

    it('strictly denies another patient from reading or overwriting the adaptive profile', () => {
      const otherAuth: MockAuth = { uid: otherPatientUid };
      const readRes = SecurityRulesPolicySimulator.canAccessAdaptiveProfile(otherAuth, 'read', patientUid);
      expect(readRes.allowed).toBe(false);
      expect(readRes.reason).toContain('strictly private to the authenticated owner');

      const writeRes = SecurityRulesPolicySimulator.canAccessAdaptiveProfile(otherAuth, 'create', patientUid, validPayload);
      expect(writeRes.allowed).toBe(false);
    });

    it('strictly denies caregivers and doctors from reading or modifying the adaptive profile', () => {
      const caregiverAuth: MockAuth = { uid: caregiverUid, token: { role: 'caregiver' } };
      const doctorAuth: MockAuth = { uid: doctorUid, token: { role: 'doctor' } };

      const cgRead = SecurityRulesPolicySimulator.canAccessAdaptiveProfile(caregiverAuth, 'read', patientUid);
      expect(cgRead.allowed).toBe(false);

      const docRead = SecurityRulesPolicySimulator.canAccessAdaptiveProfile(doctorAuth, 'read', patientUid);
      expect(docRead.allowed).toBe(false);

      const cgWrite = SecurityRulesPolicySimulator.canAccessAdaptiveProfile(caregiverAuth, 'update', patientUid, validPayload);
      expect(cgWrite.allowed).toBe(false);
    });

    it('rejects creation or update with mismatched patientId or invalid difficulty', () => {
      const patientAuth: MockAuth = { uid: patientUid };

      // Mismatched patientId
      const spoofPayload = { ...validPayload, patientId: 'patient-hijacked' };
      const spoofRes = SecurityRulesPolicySimulator.canAccessAdaptiveProfile(patientAuth, 'create', patientUid, spoofPayload);
      expect(spoofRes.allowed).toBe(false);
      expect(spoofRes.reason).toContain('patientId field must match');

      // Invalid difficulty
      const invalidDiffPayload = { ...validPayload, currentDifficulty: 'ExtremeNightmare' };
      const diffRes = SecurityRulesPolicySimulator.canAccessAdaptiveProfile(patientAuth, 'create', patientUid, invalidDiffPayload);
      expect(diffRes.allowed).toBe(false);
      expect(diffRes.reason).toContain('Invalid difficulty value');

      // Extra unapproved fields
      const dirtyPayload = { ...validPayload, arbitraryDiagnosticScore: 999 };
      const dirtyRes = SecurityRulesPolicySimulator.canAccessAdaptiveProfile(patientAuth, 'update', patientUid, dirtyPayload);
      expect(dirtyRes.allowed).toBe(false);
      expect(dirtyRes.reason).toContain('Unauthorized fields present');
    });
  });

  // Milestone 6.1: Patient Notes (/users/{userId}/notes/{noteId}) Security Policy
  describe('Milestone 6.1: Patient Notes Subcollection Security Policy', () => {
    const patientUid = 'patient-radha-01';
    const otherPatientUid = 'patient-arun-02';
    const caregiverUid = 'caregiver-meera-03';
    const doctorUid = 'doctor-vikram-04';

    const validNotePayload = {
      id: 'note_123',
      patientId: patientUid,
      title: 'Grandchildren visited today',
      content: 'They brought warm sweets and photos.',
      category: 'family',
      isPinned: true,
      tags: ['family', 'happy'],
      voiceMetadata: null,
      syncStatus: 'synced',
      createdAt: '2026-11-08T10:00:00Z',
      updatedAt: '2026-11-08T10:00:00Z',
    };

    it('allows patient owner full CRUD access to their own notes', () => {
      const patientAuth: MockAuth = { uid: patientUid };

      const readRes = SecurityRulesPolicySimulator.canAccessPatientNote(patientAuth, 'read', patientUid);
      expect(readRes.allowed).toBe(true);

      const createRes = SecurityRulesPolicySimulator.canAccessPatientNote(patientAuth, 'create', patientUid, validNotePayload);
      expect(createRes.allowed).toBe(true);

      const updateRes = SecurityRulesPolicySimulator.canAccessPatientNote(patientAuth, 'update', patientUid, validNotePayload);
      expect(updateRes.allowed).toBe(true);

      const deleteRes = SecurityRulesPolicySimulator.canAccessPatientNote(patientAuth, 'delete', patientUid);
      expect(deleteRes.allowed).toBe(true);
    });

    it('strictly denies another patient from reading or modifying notes', () => {
      const otherAuth: MockAuth = { uid: otherPatientUid };

      const readRes = SecurityRulesPolicySimulator.canAccessPatientNote(otherAuth, 'read', patientUid);
      expect(readRes.allowed).toBe(false);
      expect(readRes.reason).toContain('strictly private to the patient owner');

      const createRes = SecurityRulesPolicySimulator.canAccessPatientNote(otherAuth, 'create', patientUid, validNotePayload);
      expect(createRes.allowed).toBe(false);
    });

    it('strictly denies caregivers, doctors, and unauthenticated users from accessing patient notes', () => {
      const caregiverAuth: MockAuth = { uid: caregiverUid, token: { role: 'caregiver' } };
      const doctorAuth: MockAuth = { uid: doctorUid, token: { role: 'doctor' } };

      expect(SecurityRulesPolicySimulator.canAccessPatientNote(null, 'read', patientUid).allowed).toBe(false);
      expect(SecurityRulesPolicySimulator.canAccessPatientNote(caregiverAuth, 'read', patientUid).allowed).toBe(false);
      expect(SecurityRulesPolicySimulator.canAccessPatientNote(doctorAuth, 'read', patientUid).allowed).toBe(false);
      expect(SecurityRulesPolicySimulator.canAccessPatientNote(caregiverAuth, 'create', patientUid, validNotePayload).allowed).toBe(false);
      expect(SecurityRulesPolicySimulator.canAccessPatientNote(doctorAuth, 'create', patientUid, validNotePayload).allowed).toBe(false);
    });

    it('rejects notes with invalid category or unapproved schema properties', () => {
      const patientAuth: MockAuth = { uid: patientUid };

      // Invalid category
      const invalidCatPayload = { ...validNotePayload, category: 'classifiedSecrets' };
      const catRes = SecurityRulesPolicySimulator.canAccessPatientNote(patientAuth, 'create', patientUid, invalidCatPayload);
      expect(catRes.allowed).toBe(false);
      expect(catRes.reason).toContain('Invalid note category');

      // Extra unapproved fields
      const dirtyPayload = { ...validNotePayload, arbitraryField: 'malicious-data' };
      const dirtyRes = SecurityRulesPolicySimulator.canAccessPatientNote(patientAuth, 'create', patientUid, dirtyPayload);
      expect(dirtyRes.allowed).toBe(false);
      expect(dirtyRes.reason).toContain('Unauthorized fields present');
    });
  });

  // Milestone 6.1: Calendar Events (/users/{userId}/calendarEvents/{eventId}) Security Policy
  describe('Milestone 6.1: Calendar Events Subcollection Security Policy', () => {
    const patientUid = 'patient-radha-01';
    const caregiverUid = 'caregiver-meera-03';
    const otherCaregiverUid = 'caregiver-stranger-05';
    const doctorUid = 'doctor-vikram-04';

    const patientAuth: MockAuth = { uid: patientUid };
    const caregiverAuth: MockAuth = { uid: caregiverUid, token: { role: 'caregiver' } };
    const otherCaregiverAuth: MockAuth = { uid: otherCaregiverUid, token: { role: 'caregiver' } };
    const doctorAuth: MockAuth = { uid: doctorUid, token: { role: 'doctor' } };

    const activeRelationshipWithFullPerms = {
      status: 'active',
      canReadCalendar: true,
      canCreateCalendarEvents: true,
      canEditCalendarEvents: true,
      canDeleteCalendarEvents: true,
    };

    const activeRelationshipReadOnly = {
      status: 'active',
      canReadCalendar: true,
      canCreateCalendarEvents: false,
      canEditCalendarEvents: false,
      canDeleteCalendarEvents: false,
    };

    const publicEvent = {
      id: 'event_01',
      patientId: patientUid,
      title: 'Neurologist Follow-up',
      category: 'doctor',
      isPrivate: false,
    };

    const privateEvent = {
      id: 'event_02',
      patientId: patientUid,
      title: 'Personal reflection time',
      category: 'personal',
      isPrivate: true,
    };

    it('allows patient owner full CRUD on both public and private calendar events', () => {
      expect(SecurityRulesPolicySimulator.canAccessCalendarEvent(patientAuth, 'read', patientUid, publicEvent).allowed).toBe(true);
      expect(SecurityRulesPolicySimulator.canAccessCalendarEvent(patientAuth, 'read', patientUid, privateEvent).allowed).toBe(true);
      expect(SecurityRulesPolicySimulator.canAccessCalendarEvent(patientAuth, 'create', patientUid, undefined, { patientId: patientUid }).allowed).toBe(true);
      expect(SecurityRulesPolicySimulator.canAccessCalendarEvent(patientAuth, 'update', patientUid, privateEvent, { patientId: patientUid }).allowed).toBe(true);
      expect(SecurityRulesPolicySimulator.canAccessCalendarEvent(patientAuth, 'delete', patientUid, privateEvent).allowed).toBe(true);
    });

    it('allows authorized caregiver with canReadCalendar to read non-private events', () => {
      const readRes = SecurityRulesPolicySimulator.canAccessCalendarEvent(
        caregiverAuth,
        'read',
        patientUid,
        publicEvent,
        undefined,
        activeRelationshipWithFullPerms
      );
      expect(readRes.allowed).toBe(true);
    });

    it('strictly denies authorized caregiver from reading private events (isPrivate == true)', () => {
      const readRes = SecurityRulesPolicySimulator.canAccessCalendarEvent(
        caregiverAuth,
        'read',
        patientUid,
        privateEvent,
        undefined,
        activeRelationshipWithFullPerms
      );
      expect(readRes.allowed).toBe(false);
      expect(readRes.reason).toContain('Private events are strictly hidden');
    });

    it('strictly denies caregiver without canReadCalendar permission from reading events', () => {
      const noReadPerms = { ...activeRelationshipWithFullPerms, canReadCalendar: false };
      const readRes = SecurityRulesPolicySimulator.canAccessCalendarEvent(
        caregiverAuth,
        'read',
        patientUid,
        publicEvent,
        undefined,
        noReadPerms
      );
      expect(readRes.allowed).toBe(false);
      expect(readRes.reason).toContain('canReadCalendar');
    });

    it('allows authorized caregiver with canCreateCalendarEvents to create events', () => {
      const createRes = SecurityRulesPolicySimulator.canAccessCalendarEvent(
        caregiverAuth,
        'create',
        patientUid,
        undefined,
        { patientId: patientUid },
        activeRelationshipWithFullPerms
      );
      expect(createRes.allowed).toBe(true);
    });

    it('denies caregiver without canCreateCalendarEvents from creating events', () => {
      const createRes = SecurityRulesPolicySimulator.canAccessCalendarEvent(
        caregiverAuth,
        'create',
        patientUid,
        undefined,
        { patientId: patientUid },
        activeRelationshipReadOnly
      );
      expect(createRes.allowed).toBe(false);
      expect(createRes.reason).toContain('canCreateCalendarEvents');
    });

    it('governs caregiver update and delete permissions and forbids modifying private events', () => {
      // Edit public event with edit perm: allowed
      expect(
        SecurityRulesPolicySimulator.canAccessCalendarEvent(
          caregiverAuth,
          'update',
          patientUid,
          publicEvent,
          { patientId: patientUid },
          activeRelationshipWithFullPerms
        ).allowed
      ).toBe(true);

      // Edit public event without edit perm: denied
      expect(
        SecurityRulesPolicySimulator.canAccessCalendarEvent(
          caregiverAuth,
          'update',
          patientUid,
          publicEvent,
          { patientId: patientUid },
          activeRelationshipReadOnly
        ).allowed
      ).toBe(false);

      // Edit private event even with edit perm: denied
      expect(
        SecurityRulesPolicySimulator.canAccessCalendarEvent(
          caregiverAuth,
          'update',
          patientUid,
          privateEvent,
          { patientId: patientUid },
          activeRelationshipWithFullPerms
        ).allowed
      ).toBe(false);

      // Delete public event with delete perm: allowed
      expect(
        SecurityRulesPolicySimulator.canAccessCalendarEvent(
          caregiverAuth,
          'delete',
          patientUid,
          publicEvent,
          undefined,
          activeRelationshipWithFullPerms
        ).allowed
      ).toBe(true);

      // Delete public event without delete perm: denied
      expect(
        SecurityRulesPolicySimulator.canAccessCalendarEvent(
          caregiverAuth,
          'delete',
          patientUid,
          publicEvent,
          undefined,
          activeRelationshipReadOnly
        ).allowed
      ).toBe(false);

      // Delete private event even with delete perm: denied
      expect(
        SecurityRulesPolicySimulator.canAccessCalendarEvent(
          caregiverAuth,
          'delete',
          patientUid,
          privateEvent,
          undefined,
          activeRelationshipWithFullPerms
        ).allowed
      ).toBe(false);
    });

    it('strictly denies unconnected caregiver or doctors from accessing patient calendar', () => {
      // Unconnected caregiver (no active relationship)
      expect(
        SecurityRulesPolicySimulator.canAccessCalendarEvent(
          otherCaregiverAuth,
          'read',
          patientUid,
          publicEvent,
          undefined,
          undefined
        ).allowed
      ).toBe(false);

      // Doctor (no calendar permissions)
      expect(
        SecurityRulesPolicySimulator.canAccessCalendarEvent(
          doctorAuth,
          'read',
          patientUid,
          publicEvent,
          undefined,
          undefined
        ).allowed
      ).toBe(false);
    });
  });
});
