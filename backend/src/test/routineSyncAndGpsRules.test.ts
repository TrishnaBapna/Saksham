import { describe, it, expect } from 'vitest';

/**
 * Automated Firestore Rules Simulation Tests for:
 * - Part A: Caregiver Routine Sync & Immutable routineChangeHistory
 * - Part B: Consent-governed locationUpdates, geofences, and safetyEvents
 *
 * Mirrors the exact logic in backend/firestore.rules.
 */

interface AuthContext {
  uid: string;
  role?: 'patient' | 'caregiver' | 'doctor' | 'admin';
  status?: 'verified' | 'active' | 'pending' | 'suspended';
}

interface RelationshipRecord {
  status: 'active' | 'pending' | 'suspended' | 'revoked' | 'rejected';
  permissions?: Record<string, boolean>;
  canManageRoutines?: boolean;
  canReceiveAlerts?: boolean;
}

class RoutineAndGpsRulesSimulator {
  static hasCaregiverPermission(
    auth: AuthContext | null,
    rel: RelationshipRecord | null | undefined,
    permKey: string
  ): boolean {
    if (!auth || auth.role !== 'caregiver' || !rel || rel.status !== 'active') {
      return false;
    }
    if (rel.permissions && permKey in rel.permissions) {
      return rel.permissions[permKey] === true;
    }
    if (permKey in rel) {
      return (rel as any)[permKey] === true;
    }
    return true;
  }

  static canMutateRoutine(
    auth: AuthContext | null,
    op: 'create' | 'update' | 'delete',
    patientId: string,
    rel: RelationshipRecord | null | undefined,
    isAssignedDoctor: boolean,
    existingDoc?: Record<string, any>,
    incomingDoc?: Record<string, any>
  ): { allowed: boolean; reason?: string } {
    if (!auth) return { allowed: false, reason: 'Unauthenticated' };

    const targetPatient = op === 'create' ? incomingDoc?.patientId : existingDoc?.patientId;
    if (targetPatient !== patientId) {
      return { allowed: false, reason: 'patientId mismatch' };
    }

    if (auth.uid === patientId) {
      if (op === 'update' && incomingDoc?.patientId !== existingDoc?.patientId) {
        return { allowed: false, reason: 'Cannot reassign patientId' };
      }
      return { allowed: true };
    }

    if (isAssignedDoctor) {
      if (op === 'delete') {
        return { allowed: false, reason: 'Doctors cannot delete routines directly' };
      }
      if (op === 'update' && incomingDoc?.patientId !== existingDoc?.patientId) {
        return { allowed: false, reason: 'Cannot reassign patientId' };
      }
      return { allowed: true };
    }

    if (this.hasCaregiverPermission(auth, rel, 'canManageRoutines')) {
      const checkDoc = op === 'create' ? incomingDoc : existingDoc;
      if (checkDoc?.isClinicianPrescribed === true || checkDoc?.isSafetyLocked === true) {
        return { allowed: false, reason: 'Caregiver cannot overwrite clinician/safety locked tasks' };
      }
      if (op === 'update') {
        if (incomingDoc?.patientId !== existingDoc?.patientId) {
          return { allowed: false, reason: 'Cannot reassign patientId' };
        }
        if (
          incomingDoc &&
          'isSafetyLocked' in incomingDoc &&
          incomingDoc.isSafetyLocked !== existingDoc?.isSafetyLocked
        ) {
          return { allowed: false, reason: 'Caregiver cannot alter isSafetyLocked' };
        }
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'Missing active relationship or canManageRoutines permission' };
  }

  static canAccessRoutineChangeHistory(
    auth: AuthContext | null,
    op: 'read' | 'create' | 'update' | 'delete',
    patientId: string,
    rel: RelationshipRecord | null | undefined,
    isAssignedDoctor: boolean,
    incomingDoc?: Record<string, any>
  ): boolean {
    if (!auth) return false;
    if (op === 'update' || op === 'delete') return false;
    if (auth.role === 'admin' && op === 'read') return true;
    if (op === 'read') {
      return (
        auth.uid === patientId ||
        (auth.role === 'caregiver' && rel?.status === 'active') ||
        isAssignedDoctor
      );
    }
    return (
      incomingDoc?.actorUid === auth.uid &&
      ['created', 'updated', 'reordered', 'deleted'].includes(incomingDoc?.action) &&
      incomingDoc?.patientId === patientId &&
      (auth.uid === patientId || this.hasCaregiverPermission(auth, rel, 'canManageRoutines'))
    );
  }

  static canAccessGeofence(
    auth: AuthContext | null,
    op: 'read' | 'create' | 'update' | 'delete',
    geofenceId: string,
    patientId: string,
    rel: RelationshipRecord | null | undefined,
    incomingDoc?: Record<string, any>,
    existingDoc?: Record<string, any>
  ): boolean {
    if (!auth) return false;
    if (auth.role === 'admin') return true;
    if (op === 'delete') return false;

    const canCaregiverAlert = this.hasCaregiverPermission(auth, rel, 'canReceiveAlerts');

    if (op === 'read') {
      return auth.uid === patientId || canCaregiverAlert;
    }

    const radius = incomingDoc?.radiusMeters;
    const validRadius = typeof radius === 'number' && radius >= 25 && radius <= 10000;
    if (!validRadius) return false;

    if (op === 'create') {
      return geofenceId === patientId && incomingDoc?.patientId === patientId && canCaregiverAlert;
    }

    return (
      incomingDoc?.patientId === existingDoc?.patientId &&
      existingDoc?.patientId === patientId &&
      canCaregiverAlert
    );
  }

  static canAccessLocationUpdate(
    auth: AuthContext | null,
    op: 'read' | 'create' | 'update',
    patientId: string,
    rel: RelationshipRecord | null | undefined,
    docData: Record<string, any>,
    existingData?: Record<string, any>
  ): boolean {
    if (!auth) return false;
    if (op === 'read') {
      if (auth.uid === patientId || auth.role === 'admin') return true;
      return (
        this.hasCaregiverPermission(auth, rel, 'canReceiveAlerts') &&
        docData.isSharedWithCaregiver === true
      );
    }
    if (auth.uid !== patientId) return false;
    if (typeof docData.isSharedWithCaregiver !== 'boolean') return false;
    if (op === 'create') {
      return (
        docData.patientId === patientId &&
        typeof docData.latitude === 'number' &&
        typeof docData.longitude === 'number' &&
        typeof docData.accuracyMeters === 'number'
      );
    }
    return docData.patientId === existingData?.patientId;
  }

  static canAccessSafetyEvent(
    auth: AuthContext | null,
    op: 'read' | 'create' | 'update' | 'delete',
    patientId: string,
    rel: RelationshipRecord | null | undefined,
    incomingDoc?: Record<string, any>,
    existingDoc?: Record<string, any>
  ): boolean {
    if (!auth) return false;
    if (op === 'delete') return false;
    const canAlert = this.hasCaregiverPermission(auth, rel, 'canReceiveAlerts');
    if (op === 'read') {
      return auth.uid === patientId || canAlert || auth.role === 'admin';
    }
    const validType = [
      'EXIT_SAFE_ZONE',
      'ENTER_SAFE_ZONE',
      'GPS_SIGNAL_LOST',
      'POOR_GPS_ACCURACY',
      'GPS_TRACKING_RESUMED',
      'CONSENT_REVOKED',
    ].includes(incomingDoc?.type);
    if (op === 'create') {
      return (
        validType &&
        incomingDoc?.patientId === patientId &&
        (auth.uid === patientId || canAlert)
      );
    }
    return (
      canAlert &&
      incomingDoc?.patientId === existingDoc?.patientId &&
      incomingDoc?.type === existingDoc?.type
    );
  }
}

describe('Firestore Security Rules: Routine Sync & Real-World GPS', () => {
  const patientUid = 'patient-sunita-01';
  const caregiverUid = 'caregiver-priya-01';
  const strangerCaregiverUid = 'caregiver-stranger-99';
  const doctorUid = 'doctor-arjun-01';

  const patientAuth: AuthContext = { uid: patientUid, role: 'patient', status: 'verified' };
  const caregiverAuth: AuthContext = { uid: caregiverUid, role: 'caregiver', status: 'verified' };
  const strangerCgAuth: AuthContext = { uid: strangerCaregiverUid, role: 'caregiver', status: 'verified' };
  const doctorAuth: AuthContext = { uid: doctorUid, role: 'doctor', status: 'verified' };

  const activeFullRel: RelationshipRecord = {
    status: 'active',
    permissions: { canManageRoutines: true, canReceiveAlerts: true },
  };

  describe('1. Routines & routineChangeHistory authorization', () => {
    it('allows active Admin-approved caregiver with canManageRoutines to add, edit, and delete non-locked routines', () => {
      const incoming = { id: 'r1', patientId: patientUid, title: 'Morning Tea', isClinicianPrescribed: false };
      expect(
        RoutineAndGpsRulesSimulator.canMutateRoutine(caregiverAuth, 'create', patientUid, activeFullRel, false, undefined, incoming).allowed
      ).toBe(true);
      expect(
        RoutineAndGpsRulesSimulator.canMutateRoutine(caregiverAuth, 'update', patientUid, activeFullRel, false, incoming, {
          ...incoming,
          title: 'Herbal Tea',
        }).allowed
      ).toBe(true);
      expect(
        RoutineAndGpsRulesSimulator.canMutateRoutine(caregiverAuth, 'delete', patientUid, activeFullRel, false, incoming).allowed
      ).toBe(true);
    });

    it('blocks caregiver when canManageRoutines is false, pending, suspended, or revoked', () => {
      const restrictedRel: RelationshipRecord = {
        status: 'active',
        permissions: { canManageRoutines: false, canReceiveAlerts: true },
      };
      const suspendedRel: RelationshipRecord = { status: 'suspended', permissions: { canManageRoutines: true } };
      const revokedRel: RelationshipRecord = { status: 'revoked', permissions: { canManageRoutines: true } };
      const existing = { id: 'r1', patientId: patientUid, title: 'Walk' };

      expect(
        RoutineAndGpsRulesSimulator.canMutateRoutine(caregiverAuth, 'update', patientUid, restrictedRel, false, existing, existing).allowed
      ).toBe(false);
      expect(
        RoutineAndGpsRulesSimulator.canMutateRoutine(caregiverAuth, 'create', patientUid, suspendedRel, false, undefined, existing).allowed
      ).toBe(false);
      expect(
        RoutineAndGpsRulesSimulator.canMutateRoutine(caregiverAuth, 'delete', patientUid, revokedRel, false, existing).allowed
      ).toBe(false);
      expect(
        RoutineAndGpsRulesSimulator.canMutateRoutine(strangerCgAuth, 'update', patientUid, null, false, existing, existing).allowed
      ).toBe(false);
    });

    it('prevents caregiver from modifying or deleting clinician-prescribed / safety-locked tasks', () => {
      const rxTask = { id: 'rx1', patientId: patientUid, isClinicianPrescribed: true, isSafetyLocked: true };
      expect(
        RoutineAndGpsRulesSimulator.canMutateRoutine(caregiverAuth, 'update', patientUid, activeFullRel, false, rxTask, {
          ...rxTask,
          scheduledTime: '11:00 AM',
        }).allowed
      ).toBe(false);
      expect(
        RoutineAndGpsRulesSimulator.canMutateRoutine(caregiverAuth, 'delete', patientUid, activeFullRel, false, rxTask).allowed
      ).toBe(false);
    });

    it('enforces immutable routineChangeHistory (create allowed with matching actorUid, update/delete blocked)', () => {
      const logEntry = { patientId: patientUid, actorUid: caregiverUid, action: 'updated' };
      expect(
        RoutineAndGpsRulesSimulator.canAccessRoutineChangeHistory(caregiverAuth, 'create', patientUid, activeFullRel, false, logEntry)
      ).toBe(true);
      expect(
        RoutineAndGpsRulesSimulator.canAccessRoutineChangeHistory(caregiverAuth, 'update', patientUid, activeFullRel, false, logEntry)
      ).toBe(false);
      expect(
        RoutineAndGpsRulesSimulator.canAccessRoutineChangeHistory(caregiverAuth, 'delete', patientUid, activeFullRel, false, logEntry)
      ).toBe(false);
      expect(
        RoutineAndGpsRulesSimulator.canAccessRoutineChangeHistory(strangerCgAuth, 'create', patientUid, null, false, {
          ...logEntry,
          actorUid: strangerCaregiverUid,
        })
      ).toBe(false);
    });
  });

  describe('2. Geofences, locationUpdates & safetyEvents authorization', () => {
    it('allows authorized caregiver with canReceiveAlerts to create and update geofences/{patientId} cleanly', () => {
      const gf = { patientId: patientUid, latitude: 12.9716, longitude: 77.5946, radiusMeters: 200 };
      expect(
        RoutineAndGpsRulesSimulator.canAccessGeofence(caregiverAuth, 'create', patientUid, patientUid, activeFullRel, gf)
      ).toBe(true);
      expect(
        RoutineAndGpsRulesSimulator.canAccessGeofence(caregiverAuth, 'update', patientUid, patientUid, activeFullRel, {
          ...gf,
          radiusMeters: 500,
        }, gf)
      ).toBe(true);
    });

    it('denies patient, doctor, or unauthorized caregiver from overwriting safe-zone settings or creating invalid radius', () => {
      const gf = { patientId: patientUid, latitude: 12.9716, longitude: 77.5946, radiusMeters: 200 };
      expect(
        RoutineAndGpsRulesSimulator.canAccessGeofence(patientAuth, 'read', patientUid, patientUid, null, undefined, gf)
      ).toBe(true);
      expect(
        RoutineAndGpsRulesSimulator.canAccessGeofence(patientAuth, 'create', patientUid, patientUid, null, gf)
      ).toBe(false);
      expect(
        RoutineAndGpsRulesSimulator.canAccessGeofence(doctorAuth, 'update', patientUid, patientUid, null, gf, gf)
      ).toBe(false);
      expect(
        RoutineAndGpsRulesSimulator.canAccessGeofence(caregiverAuth, 'update', patientUid, patientUid, activeFullRel, {
          ...gf,
          radiusMeters: 5,
        }, gf)
      ).toBe(false);
    });

    it('enforces patient-owned GPS location writes and hides location from caregiver when consent is off', () => {
      const sharedLoc = {
        patientId: patientUid,
        latitude: 12.972,
        longitude: 77.595,
        accuracyMeters: 10,
        isSharedWithCaregiver: true,
      };
      const pausedLoc = { ...sharedLoc, isSharedWithCaregiver: false };

      expect(RoutineAndGpsRulesSimulator.canAccessLocationUpdate(patientAuth, 'create', patientUid, null, sharedLoc)).toBe(true);
      expect(RoutineAndGpsRulesSimulator.canAccessLocationUpdate(caregiverAuth, 'create', patientUid, activeFullRel, sharedLoc)).toBe(false);
      expect(RoutineAndGpsRulesSimulator.canAccessLocationUpdate(caregiverAuth, 'read', patientUid, activeFullRel, sharedLoc)).toBe(true);
      expect(RoutineAndGpsRulesSimulator.canAccessLocationUpdate(caregiverAuth, 'read', patientUid, activeFullRel, pausedLoc)).toBe(false);
      expect(RoutineAndGpsRulesSimulator.canAccessLocationUpdate(patientAuth, 'read', patientUid, null, pausedLoc)).toBe(true);
      expect(RoutineAndGpsRulesSimulator.canAccessLocationUpdate(doctorAuth, 'read', patientUid, null, sharedLoc)).toBe(false);
    });

    it('restricts safetyEvents read/create/acknowledge to patient and authorized alert caregivers while blocking deletes', () => {
      const exitEvt = { patientId: patientUid, type: 'EXIT_SAFE_ZONE', distanceMeters: 620, acknowledged: false };
      expect(
        RoutineAndGpsRulesSimulator.canAccessSafetyEvent(patientAuth, 'create', patientUid, null, exitEvt)
      ).toBe(true);
      expect(
        RoutineAndGpsRulesSimulator.canAccessSafetyEvent(caregiverAuth, 'update', patientUid, activeFullRel, {
          ...exitEvt,
          acknowledged: true,
        }, exitEvt)
      ).toBe(true);
      expect(
        RoutineAndGpsRulesSimulator.canAccessSafetyEvent(caregiverAuth, 'delete', patientUid, activeFullRel, undefined, exitEvt)
      ).toBe(false);
      expect(
        RoutineAndGpsRulesSimulator.canAccessSafetyEvent(strangerCgAuth, 'read', patientUid, null, undefined, exitEvt)
      ).toBe(false);
    });
  });
});
