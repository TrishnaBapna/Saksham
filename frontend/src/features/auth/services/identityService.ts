import { AuthUser } from '../types/auth.types.js';

/**
 * Standardised guest patient identifier.
 * Isolated completely from authenticated accounts.
 */
export const GUEST_PATIENT_ID = 'guest_patient_local';

/**
 * Resolves authoritative patient UID.
 * Authenticated Firebase user UID takes strict precedence.
 * In unauthenticated or preview mode, returns standardized isolated guest ID.
 */
export function getEffectivePatientId(user: { uid?: string } | AuthUser | null | undefined): string {
  if (user && user.uid && typeof user.uid === 'string' && user.uid.trim() !== '') {
    return user.uid.trim();
  }
  return GUEST_PATIENT_ID;
}

/**
 * Checks whether the given patient ID is an unauthenticated guest session.
 */
export function isGuestPatient(patientId: string): boolean {
  return !patientId || patientId === GUEST_PATIENT_ID || patientId.startsWith('guest_');
}

/**
 * Data change event hub for cross-component and cross-tab reactivity.
 */
type DataChangeCallback = (data: { module: string; patientId: string }) => void;
const subscribers: Set<DataChangeCallback> = new Set();

export function subscribeToDataChanges(callback: DataChangeCallback): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

export function notifyDataChange(module: string, patientId: string): void {
  subscribers.forEach((cb) => {
    try {
      cb({ module, patientId });
    } catch (e) {
      console.warn('[IdentityService] Subscriber notification error:', e);
    }
  });

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent('saksham_data_change', {
          detail: { module, patientId, timestamp: Date.now() },
        })
      );
    } catch {
      // Safe fallback in test environments
    }
  }
}

/**
 * Strips undefined values recursively so objects are compliant with Firestore SDK.
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = sanitizeForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result as Partial<T>;
}
