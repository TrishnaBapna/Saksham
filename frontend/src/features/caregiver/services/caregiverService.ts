/**
 * Saksham Caregiver Service
 * Milestone 7.4.2: Caregiver Calendar Oversight & Live Care Coordination
 */

import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { isExplicitLocalDemo } from '../../auth/services/identityService.js';
import { CaregiverCalendarPermissions } from '../../calendar/types/calendar.types.js';
import {
  normalizeRelationshipStatus,
  RelationshipStatus,
} from '../../relationships/types/relationship.types.js';

export interface ConnectedPatientInfo {
  patientId: string;
  patientName: string;
  relationshipType?: string;
  relationshipStatus: RelationshipStatus | 'none';
  permissions: CaregiverCalendarPermissions & {
    canViewDashboard?: boolean;
    canManageRoutines?: boolean;
    canMonitorActivities?: boolean;
    canReceiveAlerts?: boolean;
    canAssistMemoryCues?: boolean;
    canCommunicateWithDoctor?: boolean;
    canViewRestrictedClinical?: boolean;
  };
  error?: string | null;
}

export const DEFAULT_CAREGIVER_PERMISSIONS: CaregiverCalendarPermissions = {
  canReadCalendar: true,
  canCreateCalendarEvents: true,
  canEditCalendarEvents: true,
  canDeleteCalendarEvents: true,
};

const DEFAULT_CAREGIVER_REL_FALLBACK = {
  canViewDashboard: true,
  canManageRoutines: true,
  canMonitorActivities: true,
  canReceiveAlerts: true,
  canAssistMemoryCues: true,
  canCommunicateWithDoctor: true,
  canViewRestrictedClinical: false,
  ...DEFAULT_CAREGIVER_PERMISSIONS,
};

export const EMPTY_CAREGIVER_PERMISSIONS: CaregiverCalendarPermissions = {
  canReadCalendar: false,
  canCreateCalendarEvents: false,
  canEditCalendarEvents: false,
  canDeleteCalendarEvents: false,
};

export class CaregiverService {
  private static simulatedRelationships: Map<string, ConnectedPatientInfo> = new Map();

  /**
   * Sets or overrides simulated caregiver relationship (for unit tests and prototype environments).
   */
  public static setSimulatedRelationship(
    caregiverId: string,
    targetPatientId: string,
    status: 'active' | 'pending' | 'revoked' | 'none',
    permissions: CaregiverCalendarPermissions = DEFAULT_CAREGIVER_PERMISSIONS
  ): void {
    const key = `${caregiverId}_${targetPatientId}`;
    this.simulatedRelationships.set(key, {
      patientId: targetPatientId,
      patientName: 'Sunita Sharma',
      relationshipStatus: status,
      permissions: status === 'active' ? permissions : EMPTY_CAREGIVER_PERMISSIONS,
    });
  }

  /**
   * Clears simulated relationship registry.
   */
  public static clearSimulatedRelationships(): void {
    this.simulatedRelationships.clear();
  }

  /**
   * Resolves connected patient and verified calendar permissions for an authenticated caregiver.
   * Strictly queries Firestore relationships without fabricating patient data upon failure.
   */
  public static async getConnectedPatient(
    caregiverId: string,
    targetPatientId?: string
  ): Promise<ConnectedPatientInfo> {
    const simKey = targetPatientId ? `${caregiverId}_${targetPatientId}` : undefined;
    if (simKey && this.simulatedRelationships.has(simKey)) {
      return this.simulatedRelationships.get(simKey)!;
    }
    for (const [key, rel] of this.simulatedRelationships.entries()) {
      if (key.startsWith(`${caregiverId}_`)) {
        return rel;
      }
    }

    // Development demo fallback: strictly for local test prototyping with verified demo caregiver in non-production environments
    const isDemoAllowed = isExplicitLocalDemo();

    if (isDemoAllowed && caregiverId === 'demo-caregiver-001') {
      // Check if an Admin modified local relationship state in this sandbox session
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const rawStore = window.localStorage.getItem('saksham_local_relationships_v2');
          if (rawStore) {
            const parsed = JSON.parse(rawStore) as { caregiverRelationships?: any[] };
            const relList = (parsed.caregiverRelationships || []).filter(
              (r) => r.caregiverId === caregiverId && (!targetPatientId || r.patientId === targetPatientId)
            );
            if (relList.length > 0) {
              const chosen = relList.find((r) => r.status === 'active') || relList[0];
              const status = normalizeRelationshipStatus(chosen.status);
              return {
                patientId: chosen.patientId || 'demo-patient-001',
                patientName: chosen.patientName || 'Sunita Sharma',
                relationshipType: chosen.relationshipType || 'daughter',
                relationshipStatus: status,
                permissions:
                  status === 'active'
                    ? { ...DEFAULT_CAREGIVER_PERMISSIONS, ...(chosen.permissions || {}) }
                    : { ...EMPTY_CAREGIVER_PERMISSIONS },
              };
            }
          }
        }
      } catch {
        // Fallback to default sandbox isolation below
      }

      // STRICT DEMO ISOLATION: demo-caregiver-001 can ONLY access demo-patient-001
      if (!targetPatientId || targetPatientId === 'demo-patient-001') {
        return {
          patientId: 'demo-patient-001',
          patientName: 'Sunita Sharma',
          relationshipType: 'daughter',
          relationshipStatus: 'active',
          permissions: { ...DEFAULT_CAREGIVER_PERMISSIONS },
        };
      }
      return {
        patientId: targetPatientId,
        patientName: 'Unauthorized Patient',
        relationshipStatus: 'none',
        permissions: { ...EMPTY_CAREGIVER_PERMISSIONS },
      };
    }

    try {
      // 1. Direct relationship lookup if targetPatientId is specified
      if (targetPatientId && targetPatientId !== 'demo-patient-001') {
        const relDocId = `${caregiverId}_${targetPatientId}`;
        const relDocRef = doc(db, 'relationships', relDocId);
        const relSnap = await getDoc(relDocRef);

        if (relSnap.exists()) {
          const data = relSnap.data();
          const status = normalizeRelationshipStatus(data.status);
          const patientName = data.patientName || (status === 'active' ? 'Assigned Patient' : 'Unconfirmed Patient');

          if (status === 'active') {
            const perms = data.permissions || {};
            return {
              patientId: targetPatientId,
              patientName,
              relationshipType: data.relationshipType || 'family_member',
              relationshipStatus: 'active',
              permissions: {
                canViewDashboard: perms.canViewDashboard !== false,
                canManageRoutines: perms.canManageRoutines !== false,
                canMonitorActivities: perms.canMonitorActivities !== false,
                canReceiveAlerts: perms.canReceiveAlerts !== false,
                canAssistMemoryCues: perms.canAssistMemoryCues !== false,
                canCommunicateWithDoctor: perms.canCommunicateWithDoctor !== false,
                canViewRestrictedClinical: Boolean(perms.canViewRestrictedClinical),
                canReadCalendar: !!(data.canReadCalendar ?? perms.canReadCalendar),
                canCreateCalendarEvents: !!(data.canCreateCalendarEvents ?? perms.canCreateCalendarEvents),
                canEditCalendarEvents: !!(data.canEditCalendarEvents ?? perms.canEditCalendarEvents),
                canDeleteCalendarEvents: !!(data.canDeleteCalendarEvents ?? perms.canDeleteCalendarEvents),
              },
            };
          }

          return {
            patientId: targetPatientId,
            patientName,
            relationshipType: data.relationshipType,
            relationshipStatus: status,
            permissions: { ...EMPTY_CAREGIVER_PERMISSIONS },
          };
        }
      }

      // 2. Query any active relationship for this caregiver
      const relQuery = query(
        collection(db, 'relationships'),
        where('caregiverId', '==', caregiverId),
        where('status', '==', 'active')
      );
      const querySnap = await getDocs(relQuery);

      if (querySnap && !querySnap.empty && querySnap.docs && querySnap.docs.length > 0) {
        const firstDoc = querySnap.docs[0];
        const data = firstDoc.data();
        const perms = data.permissions || {};
        return {
          patientId: data.patientId || '',
          patientName: data.patientName || 'Assigned Patient',
          relationshipType: data.relationshipType || 'family_member',
          relationshipStatus: 'active',
          permissions: {
            canViewDashboard: perms.canViewDashboard !== false,
            canManageRoutines: perms.canManageRoutines !== false,
            canMonitorActivities: perms.canMonitorActivities !== false,
            canReceiveAlerts: perms.canReceiveAlerts !== false,
            canAssistMemoryCues: perms.canAssistMemoryCues !== false,
            canCommunicateWithDoctor: perms.canCommunicateWithDoctor !== false,
            canViewRestrictedClinical: Boolean(perms.canViewRestrictedClinical),
            canReadCalendar: !!(data.canReadCalendar ?? perms.canReadCalendar),
            canCreateCalendarEvents: !!(data.canCreateCalendarEvents ?? perms.canCreateCalendarEvents),
            canEditCalendarEvents: !!(data.canEditCalendarEvents ?? perms.canEditCalendarEvents),
            canDeleteCalendarEvents: !!(data.canDeleteCalendarEvents ?? perms.canDeleteCalendarEvents),
          },
        };
      }

      // 3. Query any non-active relationship (pending, rejected, suspended, revoked, additional_info_required)
      const anyRelQuery = query(
        collection(db, 'relationships'),
        where('caregiverId', '==', caregiverId)
      );
      const anySnap = await getDocs(anyRelQuery);

      if (anySnap && !anySnap.empty && anySnap.docs && anySnap.docs.length > 0) {
        const firstDoc = anySnap.docs[0];
        const data = firstDoc.data();
        const status = normalizeRelationshipStatus(data.status);
        return {
          patientId: data.patientId || '',
          patientName: data.patientName || 'Unconfirmed Patient',
          relationshipType: data.relationshipType,
          relationshipStatus: status,
          permissions: { ...EMPTY_CAREGIVER_PERMISSIONS },
        };
      }

      // 4. No relationship record exists: strictly unlinked
      return {
        patientId: '',
        patientName: 'No Patient Linked',
        relationshipStatus: 'none',
        permissions: { ...EMPTY_CAREGIVER_PERMISSIONS },
      };
    } catch (err) {
      console.warn('[CaregiverService] Error fetching connected patient relationship:', err);
      return {
        patientId: '',
        patientName: 'Unable to Load Patient',
        relationshipStatus: 'none',
        permissions: { ...EMPTY_CAREGIVER_PERMISSIONS },
        error: err instanceof Error ? err.message : 'Failed to retrieve patient relationship',
      };
    }
  }

  /**
   * Lists all active Admin-approved patient connections for a caregiver (supports multi-patient caregivers).
   */
  public static async getConnectedPatients(caregiverId: string): Promise<ConnectedPatientInfo[]> {
    if (!caregiverId) return [];

    // Check simulated relationships override first (tests)
    const simMatches: ConnectedPatientInfo[] = [];
    for (const [key, rel] of this.simulatedRelationships.entries()) {
      if (key.startsWith(`${caregiverId}_`) && rel.relationshipStatus === 'active') {
        simMatches.push(rel);
      }
    }
    if (simMatches.length > 0) return simMatches;

    // Check local sandbox relationship store if populated
    const isDemoAllowed = isExplicitLocalDemo();
    if (isDemoAllowed) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const rawStore = window.localStorage.getItem('saksham_local_relationships_v2');
          if (rawStore) {
            const parsed = JSON.parse(rawStore) as { caregiverRelationships?: any[] };
            const activeLocal = (parsed.caregiverRelationships || []).filter(
              (r) => r.caregiverId === caregiverId && r.status === 'active'
            );
            if (activeLocal.length > 0 || caregiverId === 'demo-caregiver-001') {
              return activeLocal.map((r) => ({
                patientId: r.patientId,
                patientName: r.patientName || r.patientId,
                relationshipType: r.relationshipType || 'family_member',
                relationshipStatus: 'active' as const,
                permissions: { ...DEFAULT_CAREGIVER_REL_FALLBACK, ...(r.permissions || {}) },
              }));
            }
          }
        }
      } catch {
        // Continue below
      }
      if (caregiverId === 'demo-caregiver-001') {
        return [
          {
            patientId: 'demo-patient-001',
            patientName: 'Sunita Sharma',
            relationshipType: 'daughter',
            relationshipStatus: 'active',
            permissions: { ...DEFAULT_CAREGIVER_PERMISSIONS },
          },
        ];
      }
    }

    try {
      const q = query(
        collection(db, 'relationships'),
        where('caregiverId', '==', caregiverId),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      if (!snap || snap.empty) return [];
      return snap.docs.map((d) => {
        const data = d.data() || {};
        const perms = data.permissions || {};
        return {
          patientId: String(data.patientId || ''),
          patientName: String(data.patientName || data.patientId || 'Assigned Patient'),
          relationshipType: String(data.relationshipType || 'family_member'),
          relationshipStatus: 'active' as const,
          permissions: {
            canViewDashboard: perms.canViewDashboard !== false,
            canManageRoutines: perms.canManageRoutines !== false,
            canMonitorActivities: perms.canMonitorActivities !== false,
            canReceiveAlerts: perms.canReceiveAlerts !== false,
            canAssistMemoryCues: perms.canAssistMemoryCues !== false,
            canCommunicateWithDoctor: perms.canCommunicateWithDoctor !== false,
            canViewRestrictedClinical: Boolean(perms.canViewRestrictedClinical),
            canReadCalendar: !!(data.canReadCalendar ?? perms.canReadCalendar),
            canCreateCalendarEvents: !!(data.canCreateCalendarEvents ?? perms.canCreateCalendarEvents),
            canEditCalendarEvents: !!(data.canEditCalendarEvents ?? perms.canEditCalendarEvents),
            canDeleteCalendarEvents: !!(data.canDeleteCalendarEvents ?? perms.canDeleteCalendarEvents),
          },
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Helper to check specific permissions
   */
  public static canPerform(
    permissions: Partial<CaregiverCalendarPermissions> | undefined,
    action: 'read' | 'create' | 'edit' | 'delete'
  ): boolean {
    if (!permissions) return false;
    switch (action) {
      case 'read':
        return !!permissions.canReadCalendar;
      case 'create':
        return !!permissions.canCreateCalendarEvents;
      case 'edit':
        return !!permissions.canEditCalendarEvents;
      case 'delete':
        return !!permissions.canDeleteCalendarEvents;
      default:
        return false;
    }
  }
}
