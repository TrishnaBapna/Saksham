import { describe, it, expect } from 'vitest';

/**
 * Logical Security Policy Simulator for Firestore Security Rules
 * Mirrors exact rule functions defined in backend/firestore.rules
 */

interface MockAuth {
  uid: string;
  role?: string;
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

  // Simulates /users/{userId}/adaptiveProposals/{proposalId} security rules (Stage 3 Phase B & C)
  static canAccessAdaptiveProposal(
    auth: MockAuth | null,
    operation: 'read' | 'create' | 'update' | 'delete',
    targetUserId: string,
    data?: Record<string, any>,
    options?: {
      isConnectedCaregiver?: boolean;
      isAssignedDoctor?: boolean;
      isClinicianPrescribed?: boolean;
      originalData?: Record<string, any>;
    }
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated requests denied' };
    }
    const isOwner = auth.uid === targetUserId;
    const isConnectedCaregiver = Boolean(options?.isConnectedCaregiver);
    const isAssignedDoctor = Boolean(options?.isAssignedDoctor);

    if (operation === 'delete') {
      return { allowed: false, reason: 'Proposals are immutable audit trail records and cannot be deleted' };
    }

    if (operation === 'read') {
      if (isOwner || isConnectedCaregiver || isAssignedDoctor) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Access denied: not authorized for this patient' };
    }

    if (operation === 'create') {
      if (isOwner || isConnectedCaregiver) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Only patient or connected caregiver can create proposals' };
    }

    if (operation === 'update') {
      if (!isOwner && !isConnectedCaregiver && !isAssignedDoctor) {
        return { allowed: false, reason: 'Only patient or connected caregiver can update proposals' };
      }
      if (data && data.patientId && data.patientId !== targetUserId) {
        return { allowed: false, reason: 'patientId cannot be mutated' };
      }
      const allowedStatuses = [
        'approved',
        'active',
        'activated',
        'reverted',
        'declined',
        'recommendation_generated',
        'awaiting_approval',
        'accepted',
      ];
      if (data && data.status && !allowedStatuses.includes(data.status)) {
        return { allowed: false, reason: 'Invalid proposal status' };
      }

      // Stage 3 Phase C: Clinician preservation guard
      const isClinicianPrescribed = Boolean(
        options?.isClinicianPrescribed || options?.originalData?.isClinicianPrescribed
      );
      const isCaregiver = auth.role === 'caregiver' || isConnectedCaregiver;
      if (
        isCaregiver &&
        isClinicianPrescribed &&
        (data?.status === 'approved' || data?.status === 'activated')
      ) {
        return {
          allowed: false,
          reason: 'Caregiver cannot approve clinician-prescribed activity',
        };
      }

      // Stage 3 Phase C: Audit history immutability guard
      if (options?.originalData) {
        const orig = options.originalData;
        if (data?.createdAt && orig.createdAt && data.createdAt !== orig.createdAt) {
          return { allowed: false, reason: 'createdAt cannot be modified' };
        }
        if (data?.activityId && orig.activityId && data.activityId !== orig.activityId) {
          return { allowed: false, reason: 'activityId cannot be modified' };
        }
        if (data?.domain && orig.domain && data.domain !== orig.domain) {
          return { allowed: false, reason: 'domain cannot be modified' };
        }
        if (
          data?.isClinicianPrescribed !== undefined &&
          orig.isClinicianPrescribed !== undefined &&
          data.isClinicianPrescribed !== orig.isClinicianPrescribed
        ) {
          return { allowed: false, reason: 'isClinicianPrescribed cannot be modified' };
        }
      }

      return { allowed: true };
    }

    return { allowed: false, reason: 'Operation denied' };
  }

  // Simulates /users/{userId}/notifications/{notificationId} security rules (Stage 3 Phase C)
  static canAccessNotification(
    auth: MockAuth | null,
    operation: 'read' | 'create' | 'update' | 'delete',
    targetUserId: string,
    data?: Record<string, any>,
    options?: {
      isConnectedCaregiver?: boolean;
      isAssignedDoctor?: boolean;
      originalData?: Record<string, any>;
    }
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated requests denied' };
    }
    const isOwner = auth.uid === targetUserId;
    const isConnectedCaregiver = Boolean(options?.isConnectedCaregiver);
    const isAssignedDoctor = Boolean(options?.isAssignedDoctor);

    if (operation === 'delete') {
      return { allowed: false, reason: 'Notifications are immutable and cannot be deleted' };
    }

    if (operation === 'read') {
      if (isOwner || isConnectedCaregiver || isAssignedDoctor) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Access denied: not authorized for this patient' };
    }

    if (operation === 'create') {
      if ((isOwner || isConnectedCaregiver || isAssignedDoctor) && data?.patientId === targetUserId) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Unauthorized notification creation or mismatched patientId' };
    }

    if (operation === 'update') {
      if (!isOwner && !isConnectedCaregiver) {
        return { allowed: false, reason: 'Only patient or connected caregiver can update notification state' };
      }
      if (data && data.patientId && data.patientId !== targetUserId) {
        return { allowed: false, reason: 'patientId cannot be mutated' };
      }
      if (
        options?.originalData &&
        data &&
        data.type &&
        options.originalData.type &&
        data.type !== options.originalData.type
      ) {
        return { allowed: false, reason: 'Notification type cannot be altered' };
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'Operation denied' };
  }

  // Simulates /users/{userId}/longitudinalReports/{reportId} security rules (Stage 3 Phase D)
  static canAccessLongitudinalReport(
    auth: MockAuth | null,
    operation: 'read' | 'create' | 'update' | 'delete',
    targetUserId: string,
    data?: Record<string, any>,
    options?: {
      isConnectedCaregiver?: boolean;
      isAssignedDoctor?: boolean;
      originalData?: Record<string, any>;
    }
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated requests denied' };
    }
    const isOwner = auth.uid === targetUserId;
    const isConnectedCaregiver = Boolean(options?.isConnectedCaregiver);
    const isAssignedDoctor = Boolean(options?.isAssignedDoctor);

    if (operation === 'delete') {
      return { allowed: false, reason: 'Longitudinal reports are immutable audit records and cannot be deleted' };
    }

    if (operation === 'read') {
      if (isOwner || isConnectedCaregiver || isAssignedDoctor) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Access denied: not authorized for this patient' };
    }

    if (operation === 'create') {
      if ((isOwner || isConnectedCaregiver || isAssignedDoctor) && data?.patientId === targetUserId) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Unauthorized report creation or mismatched patientId' };
    }

    if (operation === 'update') {
      if (!isOwner && !isConnectedCaregiver && !isAssignedDoctor) {
        return { allowed: false, reason: 'Unauthorized' };
      }
      if (data && data.patientId && data.patientId !== targetUserId) {
        return { allowed: false, reason: 'patientId cannot be mutated' };
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'Operation denied' };
  }

  // Simulates /users/{userId}/cognitiveConcerns/{concernId} security rules (Stage 3 Phase F)
  // Product Owner Decision 3: Doctor access is strictly gated by sharedWithDoctor == true
  static canAccessCognitiveConcern(
    auth: MockAuth | null,
    operation: 'read' | 'create' | 'update' | 'delete',
    targetUserId: string,
    data?: Record<string, any>,
    options?: {
      isConnectedCaregiver?: boolean;
      isAssignedDoctor?: boolean;
      originalData?: Record<string, any>;
    }
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated requests denied' };
    }
    const isOwner = auth.uid === targetUserId;
    const isConnectedCaregiver = Boolean(options?.isConnectedCaregiver);
    const isAssignedDoctor = Boolean(options?.isAssignedDoctor);
    const isDoctor = auth.role === 'doctor' || auth.token?.role === 'doctor' || isAssignedDoctor;

    if (operation === 'delete') {
      if (isDoctor) {
        return { allowed: false, reason: 'Doctors cannot delete patient observations' };
      }
      if (isOwner) return { allowed: true };
      if (isConnectedCaregiver && (!options?.originalData || options.originalData.recordedBy === auth.uid)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Only patient owner or author caregiver may delete concerns' };
    }

    if (operation === 'read') {
      if (isOwner || isConnectedCaregiver) return { allowed: true };
      if (isAssignedDoctor) {
        const isShared = data?.sharedWithDoctor === true || options?.originalData?.sharedWithDoctor === true;
        if (isShared) {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: 'Doctor read denied: observation has not been explicitly shared by patient/caregiver (sharedWithDoctor is false)',
        };
      }
      return { allowed: false, reason: 'Access denied: not authorized for this patient' };
    }

    if (operation === 'create') {
      if (isDoctor) {
        return { allowed: false, reason: 'Doctors cannot create cognitive concerns (patient/caregiver observations only)' };
      }
      if (data?.patientId !== targetUserId) {
        return { allowed: false, reason: 'mismatched patientId' };
      }
      if (data?.recordedBy !== auth.uid) {
        return { allowed: false, reason: 'recordedBy must match authenticated user UID (forgery prevented)' };
      }
      if (isOwner) {
        if (data?.perspective !== 'patient') {
          return { allowed: false, reason: 'Patient owner must record with perspective: patient' };
        }
      } else if (isConnectedCaregiver) {
        if (data?.perspective !== 'caregiver') {
          return { allowed: false, reason: 'Caregiver cannot impersonate patient perspective (must be perspective: caregiver)' };
        }
      } else {
        return { allowed: false, reason: 'Unauthorized concern creation' };
      }

      const requiredKeys = ['id', 'patientId', 'recordedBy', 'perspective', 'category', 'description', 'recordedAt', 'sharedWithDoctor'];
      if (data) {
        const missing = requiredKeys.filter((k) => !(k in data));
        if (missing.length > 0) {
          return { allowed: false, reason: `Missing required schema fields: ${missing.join(', ')}` };
        }
      }
      return { allowed: true };
    }

    if (operation === 'update') {
      if (isDoctor) {
        return { allowed: false, reason: 'Doctors cannot update patient cognitive concerns' };
      }
      if (!isOwner && !isConnectedCaregiver) {
        return { allowed: false, reason: 'Unauthorized concern update' };
      }
      if (data && options?.originalData) {
        const orig = options.originalData;
        if (data.id !== orig.id) return { allowed: false, reason: 'id cannot be mutated' };
        if (data.patientId !== orig.patientId) return { allowed: false, reason: 'patientId cannot be mutated' };
        if (data.recordedBy !== orig.recordedBy) return { allowed: false, reason: 'recordedBy cannot be mutated' };
        if (data.perspective !== orig.perspective) return { allowed: false, reason: 'perspective cannot be mutated' };
        if (data.recordedAt !== orig.recordedAt) return { allowed: false, reason: 'recordedAt cannot be mutated' };
        if (data.category !== orig.category) return { allowed: false, reason: 'category cannot be mutated' };

        // Consent Ownership Rule
        if (orig.perspective === 'patient' && !isOwner && data.sharedWithDoctor !== orig.sharedWithDoctor) {
          return { allowed: false, reason: 'Only the patient can modify doctor sharing consent for patient-perspective observations' };
        }
        if (orig.perspective === 'caregiver' && !isOwner && orig.recordedBy !== auth.uid && data.sharedWithDoctor !== orig.sharedWithDoctor) {
          return { allowed: false, reason: 'Only author caregiver or patient owner can alter sharing consent' };
        }
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'Operation denied' };
  }

  // Simulates /users/{userId}/clinicalAssessments/{assessmentId} security rules (Stage 3 Phase F)
  // Product Owner Decision 2: Strictly authenticated doctors can record external clinical assessments
  static canAccessClinicalAssessment(
    auth: MockAuth | null,
    operation: 'read' | 'create' | 'update' | 'delete',
    targetUserId: string,
    data?: Record<string, any>,
    options?: {
      isConnectedCaregiver?: boolean;
      isAssignedDoctor?: boolean;
      originalData?: Record<string, any>;
    }
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated requests denied' };
    }
    const isOwner = auth.uid === targetUserId;
    const isConnectedCaregiver = Boolean(options?.isConnectedCaregiver);
    const isAssignedDoctor = Boolean(options?.isAssignedDoctor);

    if (operation === 'delete') {
      return { allowed: false, reason: 'Clinical assessment records are immutable audit records and cannot be deleted' };
    }

    if (operation === 'read') {
      if (isOwner || isConnectedCaregiver || isAssignedDoctor) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Access denied: not authorized for this patient' };
    }

    if (operation === 'create') {
      if (!isAssignedDoctor) {
        return { allowed: false, reason: 'Clinician-only: only authorized doctors may record formal clinical assessments' };
      }
      if (data?.patientId !== targetUserId) {
        return { allowed: false, reason: 'mismatched patientId' };
      }
      if (data?.doctorId !== auth.uid) {
        return { allowed: false, reason: 'Assessment doctorId must match authenticated doctor UID' };
      }
      if (data?.administeredExternally !== true) {
        return { allowed: false, reason: 'Clinical assessments must be marked administeredExternally: true' };
      }
      const requiredKeys = ['id', 'patientId', 'doctorId', 'assessmentName', 'administrationDate', 'administeredExternally', 'recordedAt'];
      if (data) {
        const missing = requiredKeys.filter((k) => !(k in data));
        if (missing.length > 0) {
          return { allowed: false, reason: `Missing required schema fields: ${missing.join(', ')}` };
        }
      }
      return { allowed: true };
    }

    if (operation === 'update') {
      if (!isAssignedDoctor) {
        return { allowed: false, reason: 'Clinician-only: only authorized doctors may update clinical assessment notes' };
      }
      if (data && options?.originalData) {
        const orig = options.originalData;
        if (data.patientId !== orig.patientId) return { allowed: false, reason: 'patientId cannot be mutated' };
        if (data.id !== orig.id) return { allowed: false, reason: 'id cannot be mutated' };
        if (data.doctorId !== orig.doctorId) return { allowed: false, reason: 'doctorId cannot be mutated' };
        if (data.assessmentName !== orig.assessmentName) return { allowed: false, reason: 'assessmentName cannot be mutated' };
        if (data.administeredExternally !== orig.administeredExternally) return { allowed: false, reason: 'administeredExternally cannot be mutated' };
        if (data.recordedAt !== orig.recordedAt) return { allowed: false, reason: 'recordedAt cannot be mutated' };
        if (data.administrationDate !== orig.administrationDate) return { allowed: false, reason: 'administrationDate cannot be mutated' };

        // Database-level Amendment Schema Enforced
        const prevSize = orig.amendments && Array.isArray(orig.amendments) ? orig.amendments.length : 0;
        if (!data.amendments || !Array.isArray(data.amendments) || data.amendments.length <= prevSize) {
          return { allowed: false, reason: 'Direct modification without appended amendment is prohibited' };
        }
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'Operation denied' };
  }

  // Simulates /patients/{patientId} medical profile security rules (Priority 3)
  static canUpdatePatientProfile(
    auth: MockAuth | null,
    patientId: string,
    currentData: Record<string, any>,
    newData: Record<string, any>,
    options?: {
      isConnectedCaregiver?: boolean;
    }
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated requests denied' };
    }
    const isOwner = auth.uid === patientId;
    const isConnectedCaregiver = Boolean(options?.isConnectedCaregiver);

    if (!isOwner && !isConnectedCaregiver) {
      return { allowed: false, reason: 'Only the patient or connected caregiver may update medical profile' };
    }

    const protectedKeys = ['clinicalDiagnosis', 'pathway', 'diagnosisEtiology', 'clinicalStage', 'confirmedByDoctorId'];
    const changedKeys = Object.keys(newData).filter((k) => newData[k] !== currentData[k]);
    const touchesProtected = changedKeys.some((k) => protectedKeys.includes(k));

    if (touchesProtected) {
      return {
        allowed: false,
        reason: 'Patient and caregiver cannot modify clinical diagnosis or pathway directly in patient profile',
      };
    }

    return { allowed: true };
  }

  // Simulates /patients/{patientId}/clinicalDiagnosis/{diagnosisId} security rules (Priority 3)
  // Strictly Doctor-Only Diagnosis Assignment and Amendment
  static canAccessClinicalDiagnosis(
    auth: MockAuth | null,
    operation: 'read' | 'create' | 'update' | 'delete',
    patientId: string,
    data?: Record<string, any>,
    options?: {
      isConnectedCaregiver?: boolean;
      isAssignedDoctor?: boolean;
    }
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated requests denied' };
    }
    const isOwner = auth.uid === patientId;
    const isConnectedCaregiver = Boolean(options?.isConnectedCaregiver);
    const isAssignedDoctor = Boolean(options?.isAssignedDoctor);

    if (operation === 'delete') {
      return { allowed: false, reason: 'Clinical diagnoses are permanent medical records and cannot be deleted' };
    }

    if (operation === 'read') {
      if (isOwner || isConnectedCaregiver || isAssignedDoctor) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Access denied: not authorized for this patient diagnosis' };
    }

    if (operation === 'create') {
      if (!isAssignedDoctor) {
        return { allowed: false, reason: 'Strictly assigned doctors can create clinical diagnosis records' };
      }
      if (data?.confirmedByDoctorId !== auth.uid) {
        return { allowed: false, reason: 'confirmedByDoctorId must match authenticated doctor UID' };
      }
      if (data?.patientId !== patientId) {
        return { allowed: false, reason: 'patientId must match target patient ID' };
      }
      if (data?.isCurrent !== true) {
        return { allowed: false, reason: 'New diagnosis must be marked isCurrent: true' };
      }
      return { allowed: true };
    }

    if (operation === 'update') {
      if (!isAssignedDoctor) {
        return { allowed: false, reason: 'Strictly assigned doctors can update clinical diagnosis records' };
      }
      if (data?.confirmedByDoctorId !== auth.uid) {
        return { allowed: false, reason: 'confirmedByDoctorId must match authenticated doctor UID' };
      }
      if (data?.patientId !== patientId) {
        return { allowed: false, reason: 'patientId must match target patient ID' };
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'Operation denied' };
  }

  // Simulates /patients/{patientId}/prescriptions/{prescriptionId} security rules
  // Strictly Doctor-Only Prescription Creation and Amendment; Read-Only for Patient & Connected Caregiver
  static canAccessPrescription(
    auth: MockAuth | null,
    operation: 'read' | 'create' | 'update' | 'delete',
    patientId: string,
    newData?: Record<string, any>,
    existingData?: Record<string, any>,
    options?: {
      isConnectedCaregiver?: boolean;
      isAssignedDoctor?: boolean;
    }
  ): { allowed: boolean; reason?: string } {
    if (!auth) {
      return { allowed: false, reason: 'Unauthenticated requests denied' };
    }
    const isOwner = auth.uid === patientId;
    const isConnectedCaregiver = Boolean(options?.isConnectedCaregiver);
    const isAssignedDoctor = Boolean(options?.isAssignedDoctor);

    if (operation === 'delete') {
      return { allowed: false, reason: 'Prescriptions are permanent medical records and cannot be deleted' };
    }

    if (operation === 'read') {
      if (isOwner || isConnectedCaregiver || isAssignedDoctor) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Access denied: not authorized for this patient prescription' };
    }

    if (operation === 'create') {
      if (!isAssignedDoctor) {
        return { allowed: false, reason: 'Strictly assigned doctors can create prescription records' };
      }
      if (newData?.prescribedByDoctorId !== auth.uid) {
        return { allowed: false, reason: 'prescribedByDoctorId must match authenticated doctor UID' };
      }
      if (newData?.patientId !== patientId) {
        return { allowed: false, reason: 'patientId must match target patient ID' };
      }
      if (newData?.isCurrent !== true) {
        return { allowed: false, reason: 'New prescription must be marked isCurrent: true' };
      }
      return { allowed: true };
    }

    if (operation === 'update') {
      if (!isAssignedDoctor) {
        return { allowed: false, reason: 'Strictly assigned doctors can update prescription records' };
      }
      if (newData?.prescribedByDoctorId !== existingData?.prescribedByDoctorId) {
        return { allowed: false, reason: 'prescribedByDoctorId cannot be changed on existing prescription' };
      }
      if (newData?.patientId !== patientId) {
        return { allowed: false, reason: 'patientId must match target patient ID' };
      }
      if (!Array.isArray(newData?.amendments)) {
        return { allowed: false, reason: 'amendments must be a list' };
      }
      const existingAmendments = Array.isArray(existingData?.amendments) ? existingData.amendments.length : 0;
      if (newData.amendments.length <= existingAmendments) {
        return { allowed: false, reason: 'Updates must append a new amendment to amendments list' };
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
      if (requestData?.isPrivate === true) {
        return { allowed: false, reason: 'Caregivers cannot create private calendar events' };
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
      if (requestData?.isPrivate === true) {
        return { allowed: false, reason: 'Caregivers cannot set event to private' };
      }
      if (requestData?.isPrivate !== undefined && requestData.isPrivate !== (resourceData?.isPrivate ?? false)) {
        return { allowed: false, reason: 'Caregivers cannot modify isPrivate privacy flag' };
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

    // Milestone 7.4.2: Caregiver Calendar Security Prerequisites
    it('strictly forbids caregivers from creating private events or mutating isPrivate flags', () => {
      // 1. Caregiver creating private event: DENIED
      const createPrivateRes = SecurityRulesPolicySimulator.canAccessCalendarEvent(
        caregiverAuth,
        'create',
        patientUid,
        undefined,
        { patientId: patientUid, title: 'Private Doctor Note', isPrivate: true },
        activeRelationshipWithFullPerms
      );
      expect(createPrivateRes.allowed).toBe(false);
      expect(createPrivateRes.reason).toContain('Caregivers cannot create private');

      // 2. Caregiver updating event to change isPrivate to true: DENIED
      const updateToPrivateRes = SecurityRulesPolicySimulator.canAccessCalendarEvent(
        caregiverAuth,
        'update',
        patientUid,
        publicEvent,
        { patientId: patientUid, isPrivate: true },
        activeRelationshipWithFullPerms
      );
      expect(updateToPrivateRes.allowed).toBe(false);
      expect(updateToPrivateRes.reason).toContain('Caregivers cannot');

      // 3. Caregiver attempting to mutate isPrivate flag at all: DENIED
      const mutatePrivateRes = SecurityRulesPolicySimulator.canAccessCalendarEvent(
        caregiverAuth,
        'update',
        patientUid,
        publicEvent,
        { patientId: patientUid, isPrivate: true },
        activeRelationshipWithFullPerms
      );
      expect(mutatePrivateRes.allowed).toBe(false);

      // 4. Caregiver updating regular event attributes without touching isPrivate: ALLOWED
      const updateAllowedRes = SecurityRulesPolicySimulator.canAccessCalendarEvent(
        caregiverAuth,
        'update',
        patientUid,
        publicEvent,
        { patientId: patientUid, title: 'Updated Clinic Visit Title', isPrivate: false },
        activeRelationshipWithFullPerms
      );
      expect(updateAllowedRes.allowed).toBe(true);

      // 5. Patient owner retains unrestricted capability to set or change isPrivate: ALLOWED
      const patientPrivateCreate = SecurityRulesPolicySimulator.canAccessCalendarEvent(
        patientAuth,
        'create',
        patientUid,
        undefined,
        { patientId: patientUid, isPrivate: true }
      );
      expect(patientPrivateCreate.allowed).toBe(true);

      const patientPrivateUpdate = SecurityRulesPolicySimulator.canAccessCalendarEvent(
        patientAuth,
        'update',
        patientUid,
        publicEvent,
        { patientId: patientUid, isPrivate: true }
      );
      expect(patientPrivateUpdate.allowed).toBe(true);
    });

    it('strictly denies caregiver access when relationship is revoked or pending', () => {
      const revokedRelationship = {
        ...activeRelationshipWithFullPerms,
        status: 'revoked',
      };
      const pendingRelationship = {
        ...activeRelationshipWithFullPerms,
        status: 'pending',
      };

      // Read with revoked relationship: DENIED
      expect(
        SecurityRulesPolicySimulator.canAccessCalendarEvent(
          caregiverAuth,
          'read',
          patientUid,
          publicEvent,
          undefined,
          revokedRelationship
        ).allowed
      ).toBe(false);

      // Create with pending relationship: DENIED
      expect(
        SecurityRulesPolicySimulator.canAccessCalendarEvent(
          caregiverAuth,
          'create',
          patientUid,
          undefined,
          { patientId: patientUid, isPrivate: false },
          pendingRelationship
        ).allowed
      ).toBe(false);

      // Update with revoked relationship: DENIED
      expect(
        SecurityRulesPolicySimulator.canAccessCalendarEvent(
          caregiverAuth,
          'update',
          patientUid,
          publicEvent,
          { patientId: patientUid, isPrivate: false },
          revokedRelationship
        ).allowed
      ).toBe(false);

      // Delete with revoked relationship: DENIED
      expect(
        SecurityRulesPolicySimulator.canAccessCalendarEvent(
          caregiverAuth,
          'delete',
          patientUid,
          publicEvent,
          undefined,
          revokedRelationship
        ).allowed
      ).toBe(false);
    });
  });

  // Stage 3 Phase B: Adaptive Proposals (/users/{userId}/adaptiveProposals/{proposalId}) Security Policy
  describe('Stage 3 Phase B: Adaptive Proposals Subcollection Security Policy', () => {
    const patientUid = 'patient-kalyani-01';
    const otherPatientUid = 'patient-rajesh-02';
    const caregiverUid = 'caregiver-ananya-03';
    const doctorUid = 'doctor-vikram-04';

    const validProposal = {
      id: 'prop-01',
      patientId: patientUid,
      domain: 'game_difficulty',
      status: 'recommendation_generated',
      activityId: 'game-matching',
    };

    it('allows patient owner to read, create, and update proposal status', () => {
      const patientAuth: MockAuth = { uid: patientUid };
      expect(
        SecurityRulesPolicySimulator.canAccessAdaptiveProposal(patientAuth, 'read', patientUid).allowed
      ).toBe(true);

      expect(
        SecurityRulesPolicySimulator.canAccessAdaptiveProposal(patientAuth, 'create', patientUid, validProposal).allowed
      ).toBe(true);

      expect(
        SecurityRulesPolicySimulator.canAccessAdaptiveProposal(patientAuth, 'update', patientUid, {
          ...validProposal,
          status: 'activated',
        }).allowed
      ).toBe(true);
    });

    it('allows connected caregiver to read and update proposals', () => {
      const caregiverAuth: MockAuth = { uid: caregiverUid };
      expect(
        SecurityRulesPolicySimulator.canAccessAdaptiveProposal(caregiverAuth, 'read', patientUid, undefined, {
          isConnectedCaregiver: true,
        }).allowed
      ).toBe(true);

      expect(
        SecurityRulesPolicySimulator.canAccessAdaptiveProposal(
          caregiverAuth,
          'update',
          patientUid,
          {
            ...validProposal,
            status: 'activated',
          },
          { isConnectedCaregiver: true }
        ).allowed
      ).toBe(true);
    });

    it('allows assigned doctor to read proposals', () => {
      const doctorAuth: MockAuth = { uid: doctorUid };
      expect(
        SecurityRulesPolicySimulator.canAccessAdaptiveProposal(doctorAuth, 'read', patientUid, undefined, {
          isAssignedDoctor: true,
        }).allowed
      ).toBe(true);
    });

    it('strictly denies unrelated patient from reading or updating proposals', () => {
      const otherAuth: MockAuth = { uid: otherPatientUid };
      expect(
        SecurityRulesPolicySimulator.canAccessAdaptiveProposal(otherAuth, 'read', patientUid).allowed
      ).toBe(false);

      expect(
        SecurityRulesPolicySimulator.canAccessAdaptiveProposal(otherAuth, 'update', patientUid, {
          ...validProposal,
          status: 'activated',
        }).allowed
      ).toBe(false);
    });

    it('strictly denies deletion of proposals to preserve immutable audit trail', () => {
      const patientAuth: MockAuth = { uid: patientUid };
      const deleteRes = SecurityRulesPolicySimulator.canAccessAdaptiveProposal(patientAuth, 'delete', patientUid);
      expect(deleteRes.allowed).toBe(false);
      expect(deleteRes.reason).toContain('immutable audit trail');
    });

    it('rejects update with spoofed patientId or invalid status', () => {
      const patientAuth: MockAuth = { uid: patientUid };
      const spoofRes = SecurityRulesPolicySimulator.canAccessAdaptiveProposal(patientAuth, 'update', patientUid, {
        ...validProposal,
        patientId: 'spoofed-id',
      });
      expect(spoofRes.allowed).toBe(false);

      const invalidStatusRes = SecurityRulesPolicySimulator.canAccessAdaptiveProposal(patientAuth, 'update', patientUid, {
        ...validProposal,
        status: 'illegal_status_injection',
      });
      expect(invalidStatusRes.allowed).toBe(false);
    });

    // Stage 3 Phase C Tests: Clinician Preservation, Audit Integrity & In-App Notifications
    it('strictly prevents caregiver from approving clinician-prescribed proposal', () => {
      const caregiverAuth: MockAuth = { uid: caregiverUid, role: 'caregiver' };
      const clinicianProposal = {
        ...validProposal,
        isClinicianPrescribed: true,
      };

      const approveRes = SecurityRulesPolicySimulator.canAccessAdaptiveProposal(
        caregiverAuth,
        'update',
        patientUid,
        {
          ...clinicianProposal,
          status: 'activated',
        },
        {
          isConnectedCaregiver: true,
          isClinicianPrescribed: true,
        }
      );
      expect(approveRes.allowed).toBe(false);
      expect(approveRes.reason).toContain('Caregiver cannot approve clinician-prescribed activity');
    });

    it('strictly prevents mutating immutable proposal audit fields', () => {
      const patientAuth: MockAuth = { uid: patientUid };
      const original = { ...validProposal, createdAt: '2026-11-16T12:00:00Z', isClinicianPrescribed: false };

      const forgedCreatedAt = SecurityRulesPolicySimulator.canAccessAdaptiveProposal(
        patientAuth,
        'update',
        patientUid,
        { ...original, createdAt: '2026-11-17T12:00:00Z' },
        { originalData: original }
      );
      expect(forgedCreatedAt.allowed).toBe(false);
      expect(forgedCreatedAt.reason).toContain('createdAt cannot be modified');

      const forgedDomain = SecurityRulesPolicySimulator.canAccessAdaptiveProposal(
        patientAuth,
        'update',
        patientUid,
        { ...original, domain: 'routine_step_split' },
        { originalData: original }
      );
      expect(forgedDomain.allowed).toBe(false);
      expect(forgedDomain.reason).toContain('domain cannot be modified');
    });

    it('enforces privacy on notifications: authorized parties can read, unrelated accounts denied', () => {
      const patientAuth: MockAuth = { uid: patientUid };
      const caregiverAuth: MockAuth = { uid: caregiverUid };
      const doctorAuth: MockAuth = { uid: doctorUid };
      const otherAuth: MockAuth = { uid: otherPatientUid };

      expect(SecurityRulesPolicySimulator.canAccessNotification(patientAuth, 'read', patientUid).allowed).toBe(true);
      expect(
        SecurityRulesPolicySimulator.canAccessNotification(caregiverAuth, 'read', patientUid, undefined, {
          isConnectedCaregiver: true,
        }).allowed
      ).toBe(true);
      expect(
        SecurityRulesPolicySimulator.canAccessNotification(doctorAuth, 'read', patientUid, undefined, {
          isAssignedDoctor: true,
        }).allowed
      ).toBe(true);

      // Unrelated account blocked
      const denyOther = SecurityRulesPolicySimulator.canAccessNotification(otherAuth, 'read', patientUid);
      expect(denyOther.allowed).toBe(false);
      expect(denyOther.reason).toContain('Access denied');
    });

    it('enforces audit retention and type immutability on notifications', () => {
      const patientAuth: MockAuth = { uid: patientUid };
      const originalNotif = {
        id: 'notif-01',
        patientId: patientUid,
        type: 'PROPOSAL_AWAITING_REVIEW',
        read: false,
      };

      // Delete forbidden
      const delRes = SecurityRulesPolicySimulator.canAccessNotification(patientAuth, 'delete', patientUid);
      expect(delRes.allowed).toBe(false);
      expect(delRes.reason).toContain('immutable and cannot be deleted');

      // Modifying type forbidden
      const updateRes = SecurityRulesPolicySimulator.canAccessNotification(
        patientAuth,
        'update',
        patientUid,
        { ...originalNotif, type: 'CAREGIVER_APPROVED', read: true },
        { originalData: originalNotif }
      );
      expect(updateRes.allowed).toBe(false);
      expect(updateRes.reason).toContain('Notification type cannot be altered');

      // Valid read update allowed
      const validUpdate = SecurityRulesPolicySimulator.canAccessNotification(
        patientAuth,
        'update',
        patientUid,
        { ...originalNotif, read: true },
        { originalData: originalNotif }
      );
      expect(validUpdate.allowed).toBe(true);
    });
  });

  describe('Stage 3 Phase D: Longitudinal Reports Security Rules', () => {
    const patientUid = 'patient-sub-001';
    const otherPatientUid = 'patient-sub-002';
    const caregiverUid = 'caregiver-sub-001';
    const doctorUid = 'doctor-sub-001';
    const sampleReport = {
      id: 'report-001',
      patientId: patientUid,
      generatedAt: '2026-11-17T10:00:00Z',
    };

    it('permits authorized patient, connected caregiver, and assigned doctor to read reports', () => {
      const patientAuth: MockAuth = { uid: patientUid };
      const caregiverAuth: MockAuth = { uid: caregiverUid };
      const doctorAuth: MockAuth = { uid: doctorUid };

      // Patient read
      expect(
        SecurityRulesPolicySimulator.canAccessLongitudinalReport(patientAuth, 'read', patientUid).allowed
      ).toBe(true);

      // Connected caregiver read
      expect(
        SecurityRulesPolicySimulator.canAccessLongitudinalReport(caregiverAuth, 'read', patientUid, undefined, {
          isConnectedCaregiver: true,
        }).allowed
      ).toBe(true);

      // Assigned doctor read
      expect(
        SecurityRulesPolicySimulator.canAccessLongitudinalReport(doctorAuth, 'read', patientUid, undefined, {
          isAssignedDoctor: true,
        }).allowed
      ).toBe(true);
    });

    it('strictly denies unauthorized users from reading patient longitudinal reports', () => {
      const otherAuth: MockAuth = { uid: otherPatientUid };
      const unlinkedCaregiverAuth: MockAuth = { uid: caregiverUid };
      const unassignedDoctorAuth: MockAuth = { uid: doctorUid };

      // Other patient
      const denyOther = SecurityRulesPolicySimulator.canAccessLongitudinalReport(
        otherAuth,
        'read',
        patientUid
      );
      expect(denyOther.allowed).toBe(false);
      expect(denyOther.reason).toContain('Access denied');

      // Unlinked caregiver
      const denyCaregiver = SecurityRulesPolicySimulator.canAccessLongitudinalReport(
        unlinkedCaregiverAuth,
        'read',
        patientUid,
        undefined,
        { isConnectedCaregiver: false }
      );
      expect(denyCaregiver.allowed).toBe(false);

      // Unassigned doctor
      const denyDoctor = SecurityRulesPolicySimulator.canAccessLongitudinalReport(
        unassignedDoctorAuth,
        'read',
        patientUid,
        undefined,
        { isAssignedDoctor: false }
      );
      expect(denyDoctor.allowed).toBe(false);
    });

    it('permits authorized creation with valid patientId and prevents cross-patient forgery', () => {
      const doctorAuth: MockAuth = { uid: doctorUid };
      const validCreation = SecurityRulesPolicySimulator.canAccessLongitudinalReport(
        doctorAuth,
        'create',
        patientUid,
        sampleReport,
        { isAssignedDoctor: true }
      );
      expect(validCreation.allowed).toBe(true);

      // Cross-patient forgery attempt
      const forgedCreation = SecurityRulesPolicySimulator.canAccessLongitudinalReport(
        doctorAuth,
        'create',
        patientUid,
        { ...sampleReport, patientId: otherPatientUid },
        { isAssignedDoctor: true }
      );
      expect(forgedCreation.allowed).toBe(false);
      expect(forgedCreation.reason).toContain('mismatched patientId');
    });

    it('strictly forbids deletion of longitudinal reports to preserve immutable audit trail', () => {
      const patientAuth: MockAuth = { uid: patientUid };
      const doctorAuth: MockAuth = { uid: doctorUid };

      expect(
        SecurityRulesPolicySimulator.canAccessLongitudinalReport(patientAuth, 'delete', patientUid).allowed
      ).toBe(false);

      expect(
        SecurityRulesPolicySimulator.canAccessLongitudinalReport(doctorAuth, 'delete', patientUid, undefined, {
          isAssignedDoctor: true,
        }).allowed
      ).toBe(false);
    });
  });

  describe('Stage 3 Phase F: Cognitive Concerns Security Rules & Sharing Consent', () => {
    const patientUid = 'patient-concern-001';
    const otherPatientUid = 'patient-concern-002';
    const caregiverUid = 'caregiver-concern-001';
    const doctorUid = 'doctor-concern-001';

    const unsharedConcern = {
      id: 'concern-001',
      patientId: patientUid,
      recordedBy: caregiverUid,
      perspective: 'caregiver',
      category: 'memory',
      description: 'Difficulty recalling grandchildren names at dinner',
      recordedAt: '2026-11-17T08:00:00Z',
      sharedWithDoctor: false, // Default OFF
    };

    const sharedConcern = {
      id: 'concern-002',
      patientId: patientUid,
      recordedBy: patientUid,
      perspective: 'patient',
      category: 'communication',
      description: 'Struggling to find words in the afternoon',
      recordedAt: '2026-11-17T09:00:00Z',
      sharedWithDoctor: true, // Explicitly consented
    };

    it('permits patient and connected caregiver to read unshared and shared concerns alike', () => {
      const patientAuth: MockAuth = { uid: patientUid };
      const caregiverAuth: MockAuth = { uid: caregiverUid };

      // Patient read unshared
      expect(
        SecurityRulesPolicySimulator.canAccessCognitiveConcern(patientAuth, 'read', patientUid, unsharedConcern).allowed
      ).toBe(true);

      // Connected caregiver read unshared
      expect(
        SecurityRulesPolicySimulator.canAccessCognitiveConcern(caregiverAuth, 'read', patientUid, unsharedConcern, {
          isConnectedCaregiver: true,
        }).allowed
      ).toBe(true);

      // Patient read shared
      expect(
        SecurityRulesPolicySimulator.canAccessCognitiveConcern(patientAuth, 'read', patientUid, sharedConcern).allowed
      ).toBe(true);
    });

    it('enforces Product Owner Decision 3: assigned doctor is DENIED read access when sharedWithDoctor is false', () => {
      const doctorAuth: MockAuth = { uid: doctorUid };

      // Doctor read unshared (sharedWithDoctor: false) -> MUST BE DENIED
      const unsharedCheck = SecurityRulesPolicySimulator.canAccessCognitiveConcern(
        doctorAuth,
        'read',
        patientUid,
        unsharedConcern,
        { isAssignedDoctor: true }
      );
      expect(unsharedCheck.allowed).toBe(false);
      expect(unsharedCheck.reason).toContain('Doctor read denied');
    });

    it('permits assigned doctor to read concern when sharedWithDoctor is explicitly true', () => {
      const doctorAuth: MockAuth = { uid: doctorUid };

      // Doctor read shared (sharedWithDoctor: true) -> ALLOWED
      const sharedCheck = SecurityRulesPolicySimulator.canAccessCognitiveConcern(
        doctorAuth,
        'read',
        patientUid,
        sharedConcern,
        { isAssignedDoctor: true }
      );
      expect(sharedCheck.allowed).toBe(true);
    });

    it('strictly denies unrelated users from accessing patient cognitive concerns', () => {
      const otherAuth: MockAuth = { uid: otherPatientUid };
      const unlinkedCaregiverAuth: MockAuth = { uid: caregiverUid };

      expect(
        SecurityRulesPolicySimulator.canAccessCognitiveConcern(otherAuth, 'read', patientUid, sharedConcern).allowed
      ).toBe(false);

      expect(
        SecurityRulesPolicySimulator.canAccessCognitiveConcern(unlinkedCaregiverAuth, 'read', patientUid, sharedConcern, {
          isConnectedCaregiver: false,
        }).allowed
      ).toBe(false);
    });

    it('permits patient and caregiver deletion, but denies doctor from deleting patient observations', () => {
      const patientAuth: MockAuth = { uid: patientUid };
      const caregiverAuth: MockAuth = { uid: caregiverUid };
      const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };

      expect(
        SecurityRulesPolicySimulator.canAccessCognitiveConcern(patientAuth, 'delete', patientUid).allowed
      ).toBe(true);

      expect(
        SecurityRulesPolicySimulator.canAccessCognitiveConcern(caregiverAuth, 'delete', patientUid, undefined, {
          isConnectedCaregiver: true,
          originalData: unsharedConcern,
        }).allowed
      ).toBe(true);

      expect(
        SecurityRulesPolicySimulator.canAccessCognitiveConcern(doctorAuth, 'delete', patientUid, undefined, {
          isAssignedDoctor: true,
        }).allowed
      ).toBe(false);
    });

    it('enforces that doctors CANNOT create cognitive concerns', () => {
      const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };

      const check = SecurityRulesPolicySimulator.canAccessCognitiveConcern(
        doctorAuth,
        'create',
        patientUid,
        {
          ...unsharedConcern,
          recordedBy: doctorUid,
        },
        { isAssignedDoctor: true }
      );
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Doctors cannot create cognitive concerns');
    });

    it('enforces that doctors CANNOT update cognitive concerns or grant sharing to themselves', () => {
      const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };

      // Doctor attempting to change sharedWithDoctor to true
      const check = SecurityRulesPolicySimulator.canAccessCognitiveConcern(
        doctorAuth,
        'update',
        patientUid,
        {
          ...unsharedConcern,
          sharedWithDoctor: true,
        },
        {
          isAssignedDoctor: true,
          originalData: unsharedConcern,
        }
      );
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Doctors cannot update patient cognitive concerns');
    });

    it('enforces that caregivers CANNOT impersonate patient perspective', () => {
      const caregiverAuth: MockAuth = { uid: caregiverUid, role: 'caregiver' };

      const forgedAttempt = SecurityRulesPolicySimulator.canAccessCognitiveConcern(
        caregiverAuth,
        'create',
        patientUid,
        {
          ...sharedConcern,
          recordedBy: caregiverUid,
          perspective: 'patient', // Caregiver trying to record as patient!
        },
        { isConnectedCaregiver: true }
      );
      expect(forgedAttempt.allowed).toBe(false);
      expect(forgedAttempt.reason).toContain('Caregiver cannot impersonate patient perspective');
    });

    it('enforces that authenticated users CANNOT forge recordedBy UID', () => {
      const patientAuth: MockAuth = { uid: patientUid, role: 'patient' };

      const forgedUidAttempt = SecurityRulesPolicySimulator.canAccessCognitiveConcern(
        patientAuth,
        'create',
        patientUid,
        {
          ...sharedConcern,
          recordedBy: 'forged-attacker-uid',
        }
      );
      expect(forgedUidAttempt.allowed).toBe(false);
      expect(forgedUidAttempt.reason).toContain('recordedBy must match authenticated user UID');
    });

    it('enforces that caregivers CANNOT alter sharing consent on patient-perspective concerns', () => {
      const caregiverAuth: MockAuth = { uid: caregiverUid, role: 'caregiver' };

      const alterAttempt = SecurityRulesPolicySimulator.canAccessCognitiveConcern(
        caregiverAuth,
        'update',
        patientUid,
        {
          ...sharedConcern,
          sharedWithDoctor: false, // Trying to turn off patient's consent
        },
        {
          isConnectedCaregiver: true,
          originalData: sharedConcern,
        }
      );
      expect(alterAttempt.allowed).toBe(false);
      expect(alterAttempt.reason).toContain('Only the patient can modify doctor sharing consent');
    });
  });

  describe('Stage 3 Phase F: Clinical Assessment Records Security Rules', () => {
    const patientUid = 'patient-assess-001';
    const caregiverUid = 'caregiver-assess-001';
    const doctorUid = 'doctor-assess-001';

    const validAssessment = {
      id: 'assess-001',
      patientId: patientUid,
      doctorId: doctorUid,
      assessmentName: 'MMSE',
      totalScore: 24,
      maxScore: 30,
      administrationDate: '2026-11-17',
      administeredExternally: true,
      recordedAt: '2026-11-17T09:00:00Z',
    };

    it('permits assigned doctor to record external clinical assessment with valid patientId and doctorId', () => {
      const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };

      const check = SecurityRulesPolicySimulator.canAccessClinicalAssessment(
        doctorAuth,
        'create',
        patientUid,
        validAssessment,
        { isAssignedDoctor: true }
      );
      expect(check.allowed).toBe(true);
    });

    it('rejects clinical assessment if doctorId in document does not match authenticated doctor', () => {
      const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };

      const check = SecurityRulesPolicySimulator.canAccessClinicalAssessment(
        doctorAuth,
        'create',
        patientUid,
        { ...validAssessment, doctorId: 'other-doctor-uid' },
        { isAssignedDoctor: true }
      );
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Assessment doctorId must match authenticated doctor UID');
    });

    it('enforces Product Owner Decision 2: non-doctors (patient and caregiver) CANNOT create clinical assessment records', () => {
      const patientAuth: MockAuth = { uid: patientUid };
      const caregiverAuth: MockAuth = { uid: caregiverUid };

      const patientAttempt = SecurityRulesPolicySimulator.canAccessClinicalAssessment(
        patientAuth,
        'create',
        patientUid,
        validAssessment
      );
      expect(patientAttempt.allowed).toBe(false);
      expect(patientAttempt.reason).toContain('Clinician-only');

      const caregiverAttempt = SecurityRulesPolicySimulator.canAccessClinicalAssessment(
        caregiverAuth,
        'create',
        patientUid,
        validAssessment,
        { isConnectedCaregiver: true }
      );
      expect(caregiverAttempt.allowed).toBe(false);
      expect(caregiverAttempt.reason).toContain('Clinician-only');
    });

    it('rejects assessment creation if not marked administeredExternally: true', () => {
      const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };

      const check = SecurityRulesPolicySimulator.canAccessClinicalAssessment(
        doctorAuth,
        'create',
        patientUid,
        { ...validAssessment, administeredExternally: false },
        { isAssignedDoctor: true }
      );
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('administeredExternally');
    });

    it('permits patient, connected caregiver, and assigned doctor to read clinical assessments', () => {
      const patientAuth: MockAuth = { uid: patientUid };
      const caregiverAuth: MockAuth = { uid: caregiverUid };
      const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };

      expect(
        SecurityRulesPolicySimulator.canAccessClinicalAssessment(patientAuth, 'read', patientUid).allowed
      ).toBe(true);

      expect(
        SecurityRulesPolicySimulator.canAccessClinicalAssessment(caregiverAuth, 'read', patientUid, undefined, {
          isConnectedCaregiver: true,
        }).allowed
      ).toBe(true);

      expect(
        SecurityRulesPolicySimulator.canAccessClinicalAssessment(doctorAuth, 'read', patientUid, undefined, {
          isAssignedDoctor: true,
        }).allowed
      ).toBe(true);
    });

    it('enforces provenance immutability: doctor CANNOT alter assessmentName, doctorId, or date in update', () => {
      const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };

      const check = SecurityRulesPolicySimulator.canAccessClinicalAssessment(
        doctorAuth,
        'update',
        patientUid,
        {
          ...validAssessment,
          assessmentName: 'MoCA', // Attempting to change tool name!
          amendments: [
            { amendedAt: '2026-11-17T12:00:00Z', amendedBy: doctorUid, amendmentReason: 'Correction' },
          ],
        },
        {
          isAssignedDoctor: true,
          originalData: validAssessment,
        }
      );
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('assessmentName cannot be mutated');
    });

    it('rejects direct clinical assessment updates if no amendment is appended', () => {
      const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };

      // Direct overwrite attempt without amendments array
      const directOverwrite = SecurityRulesPolicySimulator.canAccessClinicalAssessment(
        doctorAuth,
        'update',
        patientUid,
        {
          ...validAssessment,
          totalScore: 28,
        },
        {
          isAssignedDoctor: true,
          originalData: validAssessment,
        }
      );
      expect(directOverwrite.allowed).toBe(false);
      expect(directOverwrite.reason).toContain('Direct modification without appended amendment is prohibited');
    });

    it('permits assigned doctor to append valid amendment to clinical assessment', () => {
      const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };

      const validAmendmentAttempt = SecurityRulesPolicySimulator.canAccessClinicalAssessment(
        doctorAuth,
        'update',
        patientUid,
        {
          ...validAssessment,
          totalScore: 25,
          amendments: [
            {
              amendedAt: '2026-11-17T12:00:00Z',
              amendedBy: doctorUid,
              amendmentReason: 'Corrected recall domain scoring after review of raw subtest sheet',
            },
          ],
        },
        {
          isAssignedDoctor: true,
          originalData: validAssessment,
        }
      );
      expect(validAmendmentAttempt.allowed).toBe(true);
    });

    it('strictly forbids deletion of clinical assessments to preserve permanent clinical audit trail', () => {
      const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };
      const patientAuth: MockAuth = { uid: patientUid };

      expect(
        SecurityRulesPolicySimulator.canAccessClinicalAssessment(doctorAuth, 'delete', patientUid, undefined, {
          isAssignedDoctor: true,
        }).allowed
      ).toBe(false);

      expect(
        SecurityRulesPolicySimulator.canAccessClinicalAssessment(patientAuth, 'delete', patientUid).allowed
      ).toBe(false);
    });
  });

  describe('Priority 3: Separate Alzheimer\'s & Other Dementia Diagnosis Pathway Security', () => {
    const patientUid = 'patient-pri3-01';
    const caregiverUid = 'caregiver-pri3-01';
    const doctorUid = 'doctor-pri3-01';
    const strangerDoctorUid = 'doctor-stranger-01';

    const baseProfile = {
      patientId: patientUid,
      displayName: 'Ramesh Patel',
      phoneNumber: '+919876543210',
      emergencyContact: '+919876543211',
      preferredLanguage: 'mr',
    };

    const validDiagnosis = {
      id: 'diag-001',
      patientId: patientUid,
      confirmedByDoctorId: doctorUid,
      pathway: 'alzheimers_confirmed' as const,
      etiology: 'AD_AMYLOID_CONFIRMED' as const,
      clinicalStage: 'mild_cognitive_impairment' as const,
      isCurrent: true,
      diagnosticCriteria: 'NIA-AA 2018 Research Framework & Biomarker / PET-Tau Confirmation',
      clinicalRationale: 'Doctor-confirmed early-stage Alzheimer\'s pathology with episodic memory impairment',
      doctorRegistrationNumber: 'MCI-MH-2024-89712',
      confirmedAt: '2026-11-17T10:00:00.000Z',
    };

    describe('/patients/{patientId} Clinical Profile Protection', () => {
      it('permits patient owner or connected caregiver to update general demographic and preference fields', () => {
        const patientAuth: MockAuth = { uid: patientUid };
        const caregiverAuth: MockAuth = { uid: caregiverUid };

        const updateData = {
          ...baseProfile,
          phoneNumber: '+919999988888',
          preferredLanguage: 'hi',
        };

        const patientUpdate = SecurityRulesPolicySimulator.canUpdatePatientProfile(
          patientAuth,
          patientUid,
          baseProfile,
          updateData
        );
        expect(patientUpdate.allowed).toBe(true);

        const caregiverUpdate = SecurityRulesPolicySimulator.canUpdatePatientProfile(
          caregiverAuth,
          patientUid,
          baseProfile,
          updateData,
          { isConnectedCaregiver: true }
        );
        expect(caregiverUpdate.allowed).toBe(true);
      });

      it('strictly forbids patient from directly assigning or modifying clinicalDiagnosis or pathway', () => {
        const patientAuth: MockAuth = { uid: patientUid };
        const hackedProfile = {
          ...baseProfile,
          pathway: 'alzheimers_confirmed',
          clinicalDiagnosis: 'Self-diagnosed Alzheimer',
          clinicalStage: 'mild',
        };

        const result = SecurityRulesPolicySimulator.canUpdatePatientProfile(
          patientAuth,
          patientUid,
          baseProfile,
          hackedProfile
        );
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Patient and caregiver cannot modify clinical diagnosis or pathway directly');
      });

      it('strictly forbids caregiver from modifying doctor-confirmed diagnosis or stage', () => {
        const caregiverAuth: MockAuth = { uid: caregiverUid };
        const hackedProfile = {
          ...baseProfile,
          pathway: 'other_dementia',
          diagnosisEtiology: 'vascular_dementia',
          confirmedByDoctorId: caregiverUid,
        };

        const result = SecurityRulesPolicySimulator.canUpdatePatientProfile(
          caregiverAuth,
          patientUid,
          baseProfile,
          hackedProfile,
          { isConnectedCaregiver: true }
        );
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Patient and caregiver cannot modify clinical diagnosis or pathway directly');
      });
    });

    describe('/patients/{patientId}/clinicalDiagnosis/{diagnosisId} Subcollection', () => {
      it('allows assigned doctor to create a valid clinical diagnosis record', () => {
        const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };
        const result = SecurityRulesPolicySimulator.canAccessClinicalDiagnosis(
          doctorAuth,
          'create',
          patientUid,
          validDiagnosis,
          { isAssignedDoctor: true }
        );
        expect(result.allowed).toBe(true);
      });

      it('rejects clinical diagnosis creation by patient (non-diagnostic patient boundary)', () => {
        const patientAuth: MockAuth = { uid: patientUid };
        const result = SecurityRulesPolicySimulator.canAccessClinicalDiagnosis(
          patientAuth,
          'create',
          patientUid,
          validDiagnosis
        );
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Strictly assigned doctors can create clinical diagnosis');
      });

      it('rejects clinical diagnosis creation by caregiver', () => {
        const caregiverAuth: MockAuth = { uid: caregiverUid, role: 'caregiver' };
        const result = SecurityRulesPolicySimulator.canAccessClinicalDiagnosis(
          caregiverAuth,
          'create',
          patientUid,
          validDiagnosis,
          { isConnectedCaregiver: true }
        );
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Strictly assigned doctors can create clinical diagnosis');
      });

      it('rejects unassigned doctor from assigning a diagnosis to unauthorized patient', () => {
        const unassignedDocAuth: MockAuth = { uid: strangerDoctorUid, role: 'doctor' };
        const result = SecurityRulesPolicySimulator.canAccessClinicalDiagnosis(
          unassignedDocAuth,
          'create',
          patientUid,
          { ...validDiagnosis, confirmedByDoctorId: strangerDoctorUid },
          { isAssignedDoctor: false }
        );
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Strictly assigned doctors can create clinical diagnosis');
      });

      it('permits assigned doctor to amend an existing clinical diagnosis', () => {
        const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };
        const amendedDiagnosis = {
          ...validDiagnosis,
          clinicalStage: 'moderate_dementia',
          amendedAt: '2026-11-17T12:00:00.000Z',
          amendmentReason: 'Progressive functional change observed over longitudinal assessments',
        };

        const result = SecurityRulesPolicySimulator.canAccessClinicalDiagnosis(
          doctorAuth,
          'update',
          patientUid,
          amendedDiagnosis,
          { isAssignedDoctor: true }
        );
        expect(result.allowed).toBe(true);
      });

      it('allows patient, caregiver, and assigned doctor to read confirmed diagnosis', () => {
        const patientAuth: MockAuth = { uid: patientUid };
        const caregiverAuth: MockAuth = { uid: caregiverUid };
        const doctorAuth: MockAuth = { uid: doctorUid };

        expect(
          SecurityRulesPolicySimulator.canAccessClinicalDiagnosis(patientAuth, 'read', patientUid).allowed
        ).toBe(true);

        expect(
          SecurityRulesPolicySimulator.canAccessClinicalDiagnosis(caregiverAuth, 'read', patientUid, undefined, {
            isConnectedCaregiver: true,
          }).allowed
        ).toBe(true);

        expect(
          SecurityRulesPolicySimulator.canAccessClinicalDiagnosis(doctorAuth, 'read', patientUid, undefined, {
            isAssignedDoctor: true,
          }).allowed
        ).toBe(true);
      });

      it('strictly forbids deletion of clinical diagnosis to preserve permanent medical record audit trail', () => {
        const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };
        const patientAuth: MockAuth = { uid: patientUid };

        expect(
          SecurityRulesPolicySimulator.canAccessClinicalDiagnosis(doctorAuth, 'delete', patientUid, undefined, {
            isAssignedDoctor: true,
          }).allowed
        ).toBe(false);

        expect(
          SecurityRulesPolicySimulator.canAccessClinicalDiagnosis(patientAuth, 'delete', patientUid).allowed
        ).toBe(false);
      });
    });

    describe('/patients/{patientId}/prescriptions/{prescriptionId} Subcollection', () => {
      const validPrescription = {
        id: 'rx_test_101',
        patientId: patientUid,
        prescribedByDoctorId: doctorUid,
        prescribedByDoctorName: 'Dr. Anand Joshi',
        doctorRegistrationNumber: 'MCI-1988-54321',
        medicationName: 'Donepezil Hydrochloride',
        prescribedDosage: '5mg once daily at bedtime',
        scheduleTime: '09:00 PM',
        instructions: 'Take with or without food',
        isCurrent: true,
        prescribedAt: '2026-11-17T10:00:00.000Z',
        amendments: [],
      };

      it('allows assigned doctor to create a valid clinical prescription record', () => {
        const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };
        const result = SecurityRulesPolicySimulator.canAccessPrescription(
          doctorAuth,
          'create',
          patientUid,
          validPrescription,
          undefined,
          { isAssignedDoctor: true }
        );
        expect(result.allowed).toBe(true);
      });

      it('rejects prescription creation by patient (non-prescribing patient boundary)', () => {
        const patientAuth: MockAuth = { uid: patientUid };
        const result = SecurityRulesPolicySimulator.canAccessPrescription(
          patientAuth,
          'create',
          patientUid,
          validPrescription
        );
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Strictly assigned doctors can create prescription records');
      });

      it('rejects prescription creation by caregiver', () => {
        const caregiverAuth: MockAuth = { uid: caregiverUid, role: 'caregiver' };
        const result = SecurityRulesPolicySimulator.canAccessPrescription(
          caregiverAuth,
          'create',
          patientUid,
          validPrescription,
          undefined,
          { isConnectedCaregiver: true }
        );
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Strictly assigned doctors can create prescription records');
      });

      it('rejects unassigned doctor from prescribing for an unauthorized patient', () => {
        const unassignedDocAuth: MockAuth = { uid: strangerDoctorUid, role: 'doctor' };
        const result = SecurityRulesPolicySimulator.canAccessPrescription(
          unassignedDocAuth,
          'create',
          patientUid,
          { ...validPrescription, prescribedByDoctorId: strangerDoctorUid },
          undefined,
          { isAssignedDoctor: false }
        );
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Strictly assigned doctors can create prescription records');
      });

      it('permits assigned doctor to amend an existing prescription with append-only amendment list', () => {
        const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };
        const amendedPrescription = {
          ...validPrescription,
          prescribedDosage: '10mg once daily at bedtime',
          amendments: [
            {
              amendedAt: '2026-11-17T12:00:00.000Z',
              amendedByDoctorId: doctorUid,
              previousDosage: '5mg once daily at bedtime',
              newDosage: '10mg once daily at bedtime',
              amendmentReason: 'Titration at 6 weeks',
            },
          ],
        };

        const result = SecurityRulesPolicySimulator.canAccessPrescription(
          doctorAuth,
          'update',
          patientUid,
          amendedPrescription,
          validPrescription,
          { isAssignedDoctor: true }
        );
        expect(result.allowed).toBe(true);
      });

      it('rejects prescription amendment without appending to amendments list', () => {
        const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };
        // Fails to add an amendment object
        const invalidAmendedPrescription = {
          ...validPrescription,
          prescribedDosage: '10mg once daily at bedtime',
          amendments: [],
        };

        const result = SecurityRulesPolicySimulator.canAccessPrescription(
          doctorAuth,
          'update',
          patientUid,
          invalidAmendedPrescription,
          validPrescription,
          { isAssignedDoctor: true }
        );
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('must append a new amendment');
      });

      it('allows patient, connected caregiver, and assigned doctor to read prescriptions', () => {
        const patientAuth: MockAuth = { uid: patientUid };
        const caregiverAuth: MockAuth = { uid: caregiverUid };
        const doctorAuth: MockAuth = { uid: doctorUid };

        expect(
          SecurityRulesPolicySimulator.canAccessPrescription(patientAuth, 'read', patientUid).allowed
        ).toBe(true);

        expect(
          SecurityRulesPolicySimulator.canAccessPrescription(caregiverAuth, 'read', patientUid, undefined, undefined, {
            isConnectedCaregiver: true,
          }).allowed
        ).toBe(true);

        expect(
          SecurityRulesPolicySimulator.canAccessPrescription(doctorAuth, 'read', patientUid, undefined, undefined, {
            isAssignedDoctor: true,
          }).allowed
        ).toBe(true);
      });

      it('rejects stranger patient or caregiver from reading prescriptions (cross-patient access blocked)', () => {
        const strangerPatientAuth: MockAuth = { uid: 'stranger_patient_99' };
        expect(
          SecurityRulesPolicySimulator.canAccessPrescription(strangerPatientAuth, 'read', patientUid).allowed
        ).toBe(false);
      });

      it('strictly forbids deletion of prescription records by any role (immutable audit trail)', () => {
        const doctorAuth: MockAuth = { uid: doctorUid, role: 'doctor' };
        const patientAuth: MockAuth = { uid: patientUid };

        expect(
          SecurityRulesPolicySimulator.canAccessPrescription(doctorAuth, 'delete', patientUid, undefined, undefined, {
            isAssignedDoctor: true,
          }).allowed
        ).toBe(false);

        expect(
          SecurityRulesPolicySimulator.canAccessPrescription(patientAuth, 'delete', patientUid).allowed
        ).toBe(false);
      });
    });
  });
});
