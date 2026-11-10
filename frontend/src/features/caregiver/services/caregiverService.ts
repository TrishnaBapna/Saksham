/**
 * Saksham Caregiver Service
 * Milestone 7.4.2: Caregiver Calendar Oversight & Live Care Coordination
 */

import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import { CaregiverCalendarPermissions } from '../../calendar/types/calendar.types.js';

export interface ConnectedPatientInfo {
  patientId: string;
  patientName: string;
  relationshipStatus: 'active' | 'pending' | 'revoked' | 'none';
  permissions: CaregiverCalendarPermissions;
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
   * Checks Firestore relationships with fallback to verified demo patient.
   */
  public static async getConnectedPatient(
    caregiverId: string,
    targetPatientId: string = 'demo-patient-001'
  ): Promise<ConnectedPatientInfo> {
    // Demo fallback for prototype verification
    if (!isFirebaseConfigured || caregiverId === 'demo-caregiver-001') {
      return {
        patientId: targetPatientId,
        patientName: 'Sunita Sharma',
        relationshipStatus: 'active',
        permissions: { ...DEFAULT_CAREGIVER_PERMISSIONS },
      };
    }

    try {
      const relDocId = `${caregiverId}_${targetPatientId}`;
      const relDocRef = doc(db, 'relationships', relDocId);
      const relSnap = await getDoc(relDocRef);

      if (relSnap.exists()) {
        const data = relSnap.data();
        const status = (data.status as 'active' | 'pending' | 'revoked') || 'pending';

        if (status === 'active') {
          // Permissions can be stored at root or nested under permissions object
          const perms = data.permissions || {};
          const canReadCalendar = !!(data.canReadCalendar ?? perms.canReadCalendar);
          const canCreateCalendarEvents = !!(data.canCreateCalendarEvents ?? perms.canCreateCalendarEvents);
          const canEditCalendarEvents = !!(data.canEditCalendarEvents ?? perms.canEditCalendarEvents);
          const canDeleteCalendarEvents = !!(data.canDeleteCalendarEvents ?? perms.canDeleteCalendarEvents);

          return {
            patientId: targetPatientId,
            patientName: data.patientName || 'Sunita Sharma',
            relationshipStatus: 'active',
            permissions: {
              canReadCalendar,
              canCreateCalendarEvents,
              canEditCalendarEvents,
              canDeleteCalendarEvents,
            },
          };
        }

        return {
          patientId: targetPatientId,
          patientName: data.patientName || 'Sunita Sharma',
          relationshipStatus: status,
          permissions: { ...EMPTY_CAREGIVER_PERMISSIONS },
        };
      }

      // Query any active relationship for this caregiver
      const relQuery = query(
        collection(db, 'relationships'),
        where('caregiverId', '==', caregiverId),
        where('status', '==', 'active')
      );
      const querySnap = await getDocs(relQuery);

      if (!querySnap.empty) {
        const firstDoc = querySnap.docs[0];
        const data = firstDoc.data();
        const perms = data.permissions || {};
        return {
          patientId: data.patientId,
          patientName: data.patientName || 'Sunita Sharma',
          relationshipStatus: 'active',
          permissions: {
            canReadCalendar: !!(data.canReadCalendar ?? perms.canReadCalendar),
            canCreateCalendarEvents: !!(data.canCreateCalendarEvents ?? perms.canCreateCalendarEvents),
            canEditCalendarEvents: !!(data.canEditCalendarEvents ?? perms.canEditCalendarEvents),
            canDeleteCalendarEvents: !!(data.canDeleteCalendarEvents ?? perms.canDeleteCalendarEvents),
          },
        };
      }

      // No relationship record found
      return {
        patientId: targetPatientId,
        patientName: 'Sunita Sharma',
        relationshipStatus: 'none',
        permissions: { ...EMPTY_CAREGIVER_PERMISSIONS },
      };
    } catch (err) {
      console.warn('[CaregiverService] Error fetching connected patient, using fallback:', err);
      return {
        patientId: targetPatientId,
        patientName: 'Sunita Sharma',
        relationshipStatus: 'active',
        permissions: { ...DEFAULT_CAREGIVER_PERMISSIONS },
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
