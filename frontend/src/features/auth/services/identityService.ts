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
 * Checks whether explicit development/test demo mode is enabled.
 * STRICT RESTRICTIONS:
 * 1. Production builds (import.meta.env.PROD) ALWAYS return false.
 * 2. Real authenticated patient accounts NEVER receive demo seed fixtures.
 * 3. Only explicit development test flags can enable demo fallbacks for guest/demo sessions.
 */
export function isDemoModeEnabled(patientId?: string): boolean {
  if (import.meta.env.PROD) {
    return false;
  }
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const isExplicitDemo =
      window.localStorage.getItem('saksham_demo_scenario') === 'true' ||
      window.localStorage.getItem('saksham_enable_demo_fixtures') === 'true';

    const id = patientId ? patientId.trim() : '';

    // Real authenticated patient accounts NEVER receive demo seed fixtures
    const isDemoOrGuest =
      !id ||
      id === GUEST_PATIENT_ID ||
      id.startsWith('demo-') ||
      id.startsWith('guest') ||
      id === 'default-patient' ||
      id === 'default_patient' ||
      id === 'p1' ||
      id === 'patient-test' ||
      id.startsWith('patient-test') ||
      id.startsWith('test-patient-m3');

    if (!isDemoOrGuest) {
      return false;
    }

    // Enabled if explicit demo scenario is set or if running as the default demo user in dev/test
    if (isExplicitDemo) {
      return true;
    }

    return (
      id === 'demo-patient-001' ||
      id.startsWith('demo-') ||
      id === 'p1' ||
      id === 'patient-test' ||
      id.startsWith('patient-test') ||
      id.startsWith('test-patient-m3') ||
      id === GUEST_PATIENT_ID ||
      id === ''
    );
  } catch {
    return false;
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
