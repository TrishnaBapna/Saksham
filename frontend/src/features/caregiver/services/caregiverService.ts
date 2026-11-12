/**
 * Saksham Caregiver Service
 * Milestone 7.4.2: Caregiver Calendar Oversight & Live Care Coordination
 */

import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { CaregiverCalendarPermissions } from '../../calendar/types/calendar.types.js';

export interface ConnectedPatientInfo {
  patientId: string;
  patientName: string;
  relationshipStatus: 'active' | 'pending' | 'revoked' | 'none';
  permissions: CaregiverCalendarPermissions;
  error?: string | null;
}

export const DEFAULT_CAREGIVER_PERMISSIONS: CaregiverCalendarPermissions = {
  canReadCalendar: true,
  canCreateCalendarEvents: true,
  canEditCalendarEvents: true,
  canDeleteCalendarEvents: true,
};

export const EMPTY_CAREGIVER_PERMISSIONS: CaregiverCalendarPermissions = {
  canReadCalendar: false,
  canCreateCalendarEvents: false,
  canEditCalendarEvents: false,
  canDeleteCalendarEvents: false,
};

export class CaregiverService {
  /**
   * Resolves connected patient and verified calendar permissions for an authenticated caregiver.
   * Strictly queries Firestore relationships without fabricating patient data upon failure.
   */
  public static async getConnectedPatient(
    caregiverId: string,
    targetPatientId?: string
  ): Promise<ConnectedPatientInfo> {
    // Development demo fallback: strictly for local test prototyping with verified demo caregiver
    if (import.meta.env.DEV && caregiverId === 'demo-caregiver-001') {
      return {
        patientId: targetPatientId || 'demo-patient-001',
        patientName: 'Sunita Sharma',
        relationshipStatus: 'active',
        permissions: { ...DEFAULT_CAREGIVER_PERMISSIONS },
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
          const status = (data.status as 'active' | 'pending' | 'revoked') || 'pending';
          const patientName = data.patientName || (status === 'active' ? 'Assigned Patient' : 'Unconfirmed Patient');

          if (status === 'active') {
            const perms = data.permissions || {};
            return {
              patientId: targetPatientId,
              patientName,
              relationshipStatus: 'active',
              permissions: {
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
          relationshipStatus: 'active',
          permissions: {
            canReadCalendar: !!(data.canReadCalendar ?? perms.canReadCalendar),
            canCreateCalendarEvents: !!(data.canCreateCalendarEvents ?? perms.canCreateCalendarEvents),
            canEditCalendarEvents: !!(data.canEditCalendarEvents ?? perms.canEditCalendarEvents),
            canDeleteCalendarEvents: !!(data.canDeleteCalendarEvents ?? perms.canDeleteCalendarEvents),
          },
        };
      }

      // 3. Query any pending or revoked relationship for this caregiver
      const anyRelQuery = query(
        collection(db, 'relationships'),
        where('caregiverId', '==', caregiverId)
      );
      const anySnap = await getDocs(anyRelQuery);

      if (anySnap && !anySnap.empty && anySnap.docs && anySnap.docs.length > 0) {
        const firstDoc = anySnap.docs[0];
        const data = firstDoc.data();
        const status = (data.status as 'active' | 'pending' | 'revoked') || 'pending';
        return {
          patientId: data.patientId || '',
          patientName: data.patientName || 'Unconfirmed Patient',
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
