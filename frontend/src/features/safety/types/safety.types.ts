/**
 * SAKSHAM NEURO-CARE — STAGE F: ASHA SAFE ZONE GPS & GEOFENCING TYPES
 * Consent-governed patient safety, circular geofencing, and caregiver monitoring contracts.
 * 100% Spark Free Plan compliant — 0 paid APIs, 0 cloud functions.
 */

export type SafeZoneStatus =
  | 'INSIDE_SAFE_ZONE'
  | 'OUTSIDE_SAFE_ZONE'
  | 'LOCATION_UNAVAILABLE'
  | 'PERMISSION_DENIED'
  | 'LOCATION_STALE'
  | 'MONITORING_INACTIVE';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeofenceConfig {
  patientId: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  isEnabled: boolean;
  addressLabel: string;
  updatedAt: string;
  updatedBy: string; // caregiver UID
}

export interface PatientLocationUpdate {
  id?: string;
  patientId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  timestamp: string;
  isSharedWithCaregiver: boolean;
  speed?: number | null;
  heading?: number | null;
}

export type SafetyEventType =
  | 'EXIT_SAFE_ZONE'
  | 'ENTER_SAFE_ZONE'
  | 'LOCATION_LOST'
  | 'ACCURACY_DEGRADED'
  | 'CONSENT_REVOKED';

export interface SafetyEvent {
  id: string;
  patientId: string;
  caregiverId: string;
  type: SafetyEventType;
  latitude: number;
  longitude: number;
  distanceFromHomeMeters: number;
  geofenceRadiusMeters: number;
  accuracyMeters: number;
  timestamp: string;
  acknowledged: boolean;
  notes?: string;
}

export interface GeofenceEvaluationResult {
  status: SafeZoneStatus;
  distanceMeters: number;
  isInside: boolean;
  accuracyAcceptable: boolean;
  isStale: boolean;
  rationale: string;
  eventToDispatch?: SafetyEventType;
}
