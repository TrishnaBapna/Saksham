/**
 * SAKSHAM NEURO-CARE — STAGE F: GPS & SAFE ZONE GEOFENCING SERVICE
 * Implements consent-governed location tracking, Haversine circular boundary evaluation,
 * GPS drift rejection, accuracy threshold filtering, and caregiver safety event generation.
 * 100% Spark Free Plan compliant — 0 paid APIs, 0 cloud functions.
 */

import {
  Coordinates,
  GeofenceConfig,
  GeofenceEvaluationResult,
  PatientLocationUpdate,
  SafeZoneStatus,
  SafetyEvent,
  SafetyEventType,
} from '../features/safety/types/safety.types.js';
import { db, isFirebaseConfigured } from './firebase.js';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import {
  getEffectivePatientId,
  isGuestPatient,
  notifyDataChange,
} from '../features/auth/services/identityService.js';

export const EARTH_RADIUS_METERS = 6371000;
export const MAX_ACCEPTABLE_ACCURACY_METERS = 45; // Readings with accuracy worse than 45m are discarded for boundary triggers
export const STALENESS_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
export const MIN_DISPLACEMENT_METERS = 15; // Minimum movement before triggering position write
export const DEFAULT_SAFE_ZONE_RADIUS_METERS = 500; // Default 500 meters

export class GPSService {
  private static outOfBoundsCount: Map<string, number> = new Map();
  private static lastKnownStatus: Map<string, SafeZoneStatus> = new Map();
  private static watchId: number | null = null;

  /**
   * Calculates the Great-Circle distance between two coordinates using the Haversine formula.
   * Returns distance in meters.
   */
  public static calculateHaversineDistance(
    coord1: Coordinates,
    coord2: Coordinates
  ): number {
    const lat1Rad = (coord1.latitude * Math.PI) / 180;
    const lat2Rad = (coord2.latitude * Math.PI) / 180;
    const deltaLatRad = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const deltaLngRad = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLngRad / 2) *
        Math.sin(deltaLngRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(EARTH_RADIUS_METERS * c * 10) / 10;
  }

  /**
   * Calculates compass bearing from coord1 to coord2 in degrees (0 = North, 90 = East, etc.)
   */
  public static calculateBearing(
    from: Coordinates,
    to: Coordinates
  ): number {
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;
    const deltaLng = ((to.longitude - from.longitude) * Math.PI) / 180;

    const y = Math.sin(deltaLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  }

  /**
   * Evaluates patient's current location against a configured safe-zone geofence.
   * Applies drift suppression (accuracy filtering) and consecutive-reading hysteresis.
   */
  public static evaluateGeofence(
    location: PatientLocationUpdate | null,
    config: GeofenceConfig | null,
    currentTimeMs: number = Date.now()
  ): GeofenceEvaluationResult {
    // 1. Check if geofencing or consent is disabled
    if (!config || !config.isEnabled) {
      return {
        status: 'MONITORING_INACTIVE',
        distanceMeters: 0,
        isInside: true,
        accuracyAcceptable: false,
        isStale: false,
        rationale: 'Safe zone geofencing is currently disabled by caregiver.',
      };
    }

    if (!location || !location.isSharedWithCaregiver) {
      return {
        status: 'MONITORING_INACTIVE',
        distanceMeters: 0,
        isInside: true,
        accuracyAcceptable: false,
        isStale: false,
        rationale: 'Patient has not granted or has paused location sharing consent.',
      };
    }

    // 2. Check for staleness
    const updateTimeMs = new Date(location.timestamp).getTime();
    const isStale = currentTimeMs - updateTimeMs > STALENESS_THRESHOLD_MS;
    if (isStale) {
      return {
        status: 'LOCATION_STALE',
        distanceMeters: 0,
        isInside: true,
        accuracyAcceptable: false,
        isStale: true,
        rationale: 'Last location update is older than 15 minutes. Signal may be lost.',
        eventToDispatch: 'LOCATION_LOST',
      };
    }

    // 3. Accuracy threshold check (GPS drift filter)
    const accuracyAcceptable = location.accuracyMeters <= MAX_ACCEPTABLE_ACCURACY_METERS;
    if (!accuracyAcceptable) {
      return {
        status: this.lastKnownStatus.get(location.patientId) || 'INSIDE_SAFE_ZONE',
        distanceMeters: 0,
        isInside: true,
        accuracyAcceptable: false,
        isStale: false,
        rationale: `GPS accuracy degraded (±${Math.round(location.accuracyMeters)}m > ${MAX_ACCEPTABLE_ACCURACY_METERS}m). Ignoring for boundary triggers.`,
        eventToDispatch: 'ACCURACY_DEGRADED',
      };
    }

    // 4. Calculate Great-Circle distance to home
    const distanceMeters = this.calculateHaversineDistance(
      { latitude: location.latitude, longitude: location.longitude },
      { latitude: config.centerLatitude, longitude: config.centerLongitude }
    );

    const isInside = distanceMeters <= config.radiusMeters;
    const currentOutOfBounds = this.outOfBoundsCount.get(location.patientId) || 0;
    const previousStatus = this.lastKnownStatus.get(location.patientId);

    if (isInside) {
      // Patient is inside boundary
      this.outOfBoundsCount.set(location.patientId, 0);
      this.lastKnownStatus.set(location.patientId, 'INSIDE_SAFE_ZONE');

      const isReturnEvent = previousStatus === 'OUTSIDE_SAFE_ZONE';
      return {
        status: 'INSIDE_SAFE_ZONE',
        distanceMeters,
        isInside: true,
        accuracyAcceptable: true,
        isStale: false,
        rationale: `Patient is safely inside the geofence (${Math.round(distanceMeters)}m from home, radius ${config.radiusMeters}m).`,
        eventToDispatch: isReturnEvent ? 'ENTER_SAFE_ZONE' : undefined,
      };
    } else {
      // Patient is outside boundary: Apply 2-reading hysteresis buffer
      const newOutOfBoundsCount = currentOutOfBounds + 1;
      this.outOfBoundsCount.set(location.patientId, newOutOfBoundsCount);

      if (newOutOfBoundsCount >= 2) {
        this.lastKnownStatus.set(location.patientId, 'OUTSIDE_SAFE_ZONE');
        return {
          status: 'OUTSIDE_SAFE_ZONE',
          distanceMeters,
          isInside: false,
          accuracyAcceptable: true,
          isStale: false,
          rationale: `CONFIRMED: Patient has exited safe zone (${Math.round(distanceMeters)}m from home, exceeds ${config.radiusMeters}m limit).`,
          eventToDispatch: previousStatus !== 'OUTSIDE_SAFE_ZONE' ? 'EXIT_SAFE_ZONE' : undefined,
        };
      } else {
        // First reading outside: Hold in buffer to prevent GPS bounce
        return {
          status: 'INSIDE_SAFE_ZONE', // Hold state until confirmed
          distanceMeters,
          isInside: true,
          accuracyAcceptable: true,
          isStale: false,
          rationale: `Boundary crossing candidate (${Math.round(distanceMeters)}m). Awaiting 2nd reading confirmation.`,
        };
      }
    }
  }

  /**
   * Creates a structured SafetyEvent record for Firestore persistence.
   */
  public static createSafetyEvent(
    patientId: string,
    caregiverId: string,
    type: SafetyEventType,
    location: PatientLocationUpdate,
    config: GeofenceConfig,
    distanceMeters: number
  ): SafetyEvent {
    return {
      id: `safety_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      patientId,
      caregiverId,
      type,
      latitude: location.latitude,
      longitude: location.longitude,
      distanceFromHomeMeters: distanceMeters,
      geofenceRadiusMeters: config.radiusMeters,
      accuracyMeters: location.accuracyMeters,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      notes:
        type === 'EXIT_SAFE_ZONE'
          ? `Patient exited ${config.addressLabel} safe perimeter by ${Math.round(distanceMeters - config.radiusMeters)} meters.`
          : type === 'ENTER_SAFE_ZONE'
          ? `Patient returned safely to ${config.addressLabel} perimeter.`
          : undefined,
    };
  }

  /**
   * Resets local hysteresis buffers (e.g. for testing).
   */
  public static resetState(patientId?: string): void {
    if (patientId) {
      this.outOfBoundsCount.delete(patientId);
      this.lastKnownStatus.delete(patientId);
    } else {
      this.outOfBoundsCount.clear();
      this.lastKnownStatus.clear();
    }
  }

  /**
   * Browser Geolocation API wrapper with permission checks.
   */
  public static isGeolocationSupported(): boolean {
    return typeof window !== 'undefined' && 'geolocation' in navigator;
  }

  /**
   * Starts active foreground position watcher.
   */
  public static startWatchingPosition(
    onSuccess: (update: PatientLocationUpdate) => void,
    onError: (status: SafeZoneStatus, message: string) => void,
    patientId: string,
    isSharedWithCaregiver: boolean
  ): () => void {
    if (!this.isGeolocationSupported()) {
      onError('LOCATION_UNAVAILABLE', 'Geolocation is not supported by this browser.');
      return () => {};
    }

    if (!isSharedWithCaregiver) {
      onError('MONITORING_INACTIVE', 'Location sharing consent is disabled.');
      return () => {};
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    };

    let lastLat = 0;
    let lastLng = 0;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const currentCoord: Coordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };

        // Displacement filter: Ignore jitter < MIN_DISPLACEMENT_METERS unless first reading
        if (lastLat !== 0 && lastLng !== 0) {
          const moveDist = this.calculateHaversineDistance(
            { latitude: lastLat, longitude: lastLng },
            currentCoord
          );
          if (moveDist < MIN_DISPLACEMENT_METERS) {
            return; // Suppress redundant write
          }
        }

        lastLat = pos.coords.latitude;
        lastLng = pos.coords.longitude;

        const update: PatientLocationUpdate = {
          patientId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          timestamp: new Date(pos.timestamp).toISOString(),
          isSharedWithCaregiver: true,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
        };

        onSuccess(update);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          onError('PERMISSION_DENIED', 'Patient or browser denied location permission.');
        } else {
          onError('LOCATION_UNAVAILABLE', `GPS unavailable: ${err.message}`);
        }
      },
      options
    );

    this.watchId = id;
    return () => {
      if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }
    };
  }

  public static getConsentStorageKey(patientId: string): string {
    return `saksham_patient_location_consent_${patientId}`;
  }

  public static isConsentEnabled(patientId: string): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const direct = window.localStorage.getItem(this.getConsentStorageKey(patientId));
        if (direct !== null) return direct !== 'false';
        const effectiveId = getEffectivePatientId({ uid: patientId });
        const scoped = window.localStorage.getItem(this.getConsentStorageKey(effectiveId));
        if (scoped !== null) return scoped !== 'false';
      }
    } catch {
      // Safe fallback
    }
    return true;
  }

  public static setConsentEnabled(patientId: string, enabled: boolean): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.getConsentStorageKey(patientId), String(enabled));
        window.localStorage.setItem(this.getConsentStorageKey(effectiveId), String(enabled));
        if (!enabled) {
          const existing = this.getStoredLatestLocation(patientId);
          if (existing) {
            const revoked: PatientLocationUpdate = { ...existing, isSharedWithCaregiver: false };
            window.localStorage.setItem(`saksham_last_location_${effectiveId}`, JSON.stringify(revoked));
          }
        }
      }
    } catch {
      // Storage unavailable
    }
    notifyDataChange('gps', effectiveId);
  }

  public static getStoredLatestLocation(patientId: string): PatientLocationUpdate | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw =
          window.localStorage.getItem(`saksham_last_location_${effectiveId}`) ||
          window.localStorage.getItem(`saksham_last_location_${patientId}`);
        if (raw) {
          const parsed = JSON.parse(raw) as PatientLocationUpdate;
          if (typeof parsed?.latitude === 'number' && typeof parsed?.longitude === 'number') {
            return parsed;
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  }

  public static async saveLocationUpdate(update: PatientLocationUpdate): Promise<void> {
    const effectiveId = getEffectivePatientId({ uid: update.patientId });
    const consentActive = this.isConsentEnabled(update.patientId);
    const sanitized: PatientLocationUpdate = {
      ...update,
      patientId: effectiveId,
      isSharedWithCaregiver: consentActive ? Boolean(update.isSharedWithCaregiver) : false,
    };

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`saksham_last_location_${effectiveId}`, JSON.stringify(sanitized));
      }
    } catch {
      // Ignore storage error
    }
    notifyDataChange('gps', effectiveId);

    if (!isGuestPatient(effectiveId) && isFirebaseConfigured && db) {
      try {
        const docId = `latest_${effectiveId}`;
        await setDoc(doc(db, 'locationUpdates', docId), sanitized, { merge: true });
      } catch (err) {
        console.warn('[GPSService] Firestore locationUpdates sync skipped:', err);
      }
    }
  }

  public static async syncLatestConsentedLocation(patientId: string): Promise<PatientLocationUpdate | null> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    if (!this.isConsentEnabled(patientId)) {
      return null;
    }

    if (!isGuestPatient(effectiveId) && isFirebaseConfigured && db) {
      try {
        const q = query(
          collection(db, 'locationUpdates'),
          where('patientId', '==', effectiveId),
          where('isSharedWithCaregiver', '==', true)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const sorted = snap.docs
            .map((d) => ({ ...(d.data() as PatientLocationUpdate), id: d.id }))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          const latest = sorted[0];
          if (latest) {
            try {
              window.localStorage.setItem(`saksham_last_location_${effectiveId}`, JSON.stringify(latest));
            } catch {
              // Ignore
            }
            return latest;
          }
        }
      } catch (err) {
        console.warn('[GPSService] Firestore locationUpdates read failed:', err);
      }
    }

    return this.getStoredLatestLocation(patientId);
  }

  public static requestCurrentPosition(
    patientId: string,
    isSharedWithCaregiver: boolean,
    onSuccess: (update: PatientLocationUpdate) => void,
    onError: (status: SafeZoneStatus, message: string) => void
  ): void {
    if (!this.isGeolocationSupported()) {
      onError('LOCATION_UNAVAILABLE', 'Geolocation is not supported by this browser.');
      return;
    }

    if (!isSharedWithCaregiver || !this.isConsentEnabled(patientId)) {
      onError('MONITORING_INACTIVE', 'Location sharing consent is paused.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const update: PatientLocationUpdate = {
          patientId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          timestamp: new Date(pos.timestamp).toISOString(),
          isSharedWithCaregiver: true,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
        };
        void this.saveLocationUpdate(update);
        onSuccess(update);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          onError('PERMISSION_DENIED', 'Patient or browser denied location permission.');
        } else {
          onError('LOCATION_UNAVAILABLE', `GPS unavailable: ${err.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }
}
