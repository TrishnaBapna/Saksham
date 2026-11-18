/**
 * SAKSHAM NEURO-CARE — STAGE F: ASHA SAFE ZONE GPS & GEOFENCING TEST SUITE
 * Validates Haversine distance calculations, compass bearing, GPS drift suppression,
 * boundary crossing hysteresis, staleness filters, and safety event dispatching.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GPSService,
  STALENESS_THRESHOLD_MS,
} from '../services/gpsService.js';
import {
  GeofenceConfig,
  PatientLocationUpdate,
} from '../features/safety/types/safety.types.js';

describe('Stage F: Asha Safe Zone GPS & Geofencing Engine', () => {
  // Ground truth: Indiranagar 2nd Stage, Bangalore
  const HOME_COORDS = { latitude: 12.9716, longitude: 77.6412 };
  const CAREGIVER_ID = 'caregiver-ananya-01';
  const PATIENT_ID = 'patient-sunita-01';

  const defaultGeofence: GeofenceConfig = {
    patientId: PATIENT_ID,
    centerLatitude: HOME_COORDS.latitude,
    centerLongitude: HOME_COORDS.longitude,
    radiusMeters: 500,
    isEnabled: true,
    addressLabel: 'Home (Indiranagar 2nd Stage)',
    updatedAt: new Date().toISOString(),
    updatedBy: CAREGIVER_ID,
  };

  beforeEach(() => {
    GPSService.resetState();
  });

  // -------------------------------------------------------------
  // Part 1: Mathematical Distance & Bearing Accuracy
  // -------------------------------------------------------------
  describe('Part 1: Great-Circle Haversine Formula & Bearing Math', () => {
    it('calculates zero distance for identical coordinates', () => {
      const dist = GPSService.calculateHaversineDistance(HOME_COORDS, HOME_COORDS);
      expect(dist).toBe(0);
    });

    it('calculates accurate distance for known ground-truth coordinates (~4.5 km to MG Road)', () => {
      const mgRoad = { latitude: 12.9756, longitude: 77.6066 };
      const dist = GPSService.calculateHaversineDistance(HOME_COORDS, mgRoad);
      // Expected distance is approximately 3,750m - 4,200m
      expect(dist).toBeGreaterThan(3500);
      expect(dist).toBeLessThan(4500);
    });

    it('calculates correct compass bearing for cardinal directions', () => {
      const north = { latitude: 13.9716, longitude: 77.6412 };
      const bearingNorth = GPSService.calculateBearing(HOME_COORDS, north);
      expect(bearingNorth).toBeCloseTo(0, 0);

      const east = { latitude: 12.9716, longitude: 78.6412 };
      const bearingEast = GPSService.calculateBearing(HOME_COORDS, east);
      expect(bearingEast).toBeCloseTo(90, 0);
    });
  });

  // -------------------------------------------------------------
  // Part 2: Inside Safe Zone Boundary Evaluation
  // -------------------------------------------------------------
  describe('Part 2: Inside Safe Zone Evaluation', () => {
    it('evaluates location inside 500m radius as INSIDE_SAFE_ZONE', () => {
      // 100 meters east of home
      const closeLocation: PatientLocationUpdate = {
        patientId: PATIENT_ID,
        latitude: 12.9716,
        longitude: 77.6421,
        accuracyMeters: 10,
        timestamp: new Date().toISOString(),
        isSharedWithCaregiver: true,
      };

      const result = GPSService.evaluateGeofence(closeLocation, defaultGeofence);
      expect(result.status).toBe('INSIDE_SAFE_ZONE');
      expect(result.isInside).toBe(true);
      expect(result.distanceMeters).toBeLessThan(500);
      expect(result.accuracyAcceptable).toBe(true);
      expect(result.eventToDispatch).toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // Part 3: GPS Drift & Accuracy Threshold Filtering
  // -------------------------------------------------------------
  describe('Part 3: GPS Drift & Degradation Filter', () => {
    it('rejects inaccurate reading when accuracy exceeds threshold (e.g. ±80m > ±45m)', () => {
      const degradedLocation: PatientLocationUpdate = {
        patientId: PATIENT_ID,
        latitude: 12.9790, // Appears outside
        longitude: 77.6490,
        accuracyMeters: 80, // High uncertainty
        timestamp: new Date().toISOString(),
        isSharedWithCaregiver: true,
      };

      const result = GPSService.evaluateGeofence(degradedLocation, defaultGeofence);
      expect(result.accuracyAcceptable).toBe(false);
      expect(result.eventToDispatch).toBe('ACCURACY_DEGRADED');
      expect(result.status).toBe('INSIDE_SAFE_ZONE'); // Does not trigger false exit
    });

    it('suppresses transient single-reading GPS spike via 2-reading hysteresis', () => {
      // First reading outside geofence (800m away)
      const outsideSpike1: PatientLocationUpdate = {
        patientId: PATIENT_ID,
        latitude: 12.9780,
        longitude: 77.6480,
        accuracyMeters: 12,
        timestamp: new Date().toISOString(),
        isSharedWithCaregiver: true,
      };

      const result1 = GPSService.evaluateGeofence(outsideSpike1, defaultGeofence);
      // First reading is held in candidate buffer; does not dispatch exit alert
      expect(result1.status).toBe('INSIDE_SAFE_ZONE');
      expect(result1.isInside).toBe(true);
      expect(result1.eventToDispatch).toBeUndefined();

      // Next reading returns safely inside (GPS drift recovered)
      const insideRecovered: PatientLocationUpdate = {
        patientId: PATIENT_ID,
        latitude: 12.9718,
        longitude: 77.6415,
        accuracyMeters: 8,
        timestamp: new Date().toISOString(),
        isSharedWithCaregiver: true,
      };

      const result2 = GPSService.evaluateGeofence(insideRecovered, defaultGeofence);
      expect(result2.status).toBe('INSIDE_SAFE_ZONE');
      expect(result2.eventToDispatch).toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // Part 4: Confirmed Safe-Zone Exit & Return Events
  // -------------------------------------------------------------
  describe('Part 4: Exit and Return Lifecycle', () => {
    it('dispatches EXIT_SAFE_ZONE on second consecutive reading outside boundary', () => {
      const outsideLocation: PatientLocationUpdate = {
        patientId: PATIENT_ID,
        latitude: 12.9780, // ~1,000m away
        longitude: 77.6480,
        accuracyMeters: 10,
        timestamp: new Date().toISOString(),
        isSharedWithCaregiver: true,
      };

      // Reading 1: Held in buffer
      const res1 = GPSService.evaluateGeofence(outsideLocation, defaultGeofence);
      expect(res1.status).toBe('INSIDE_SAFE_ZONE');

      // Reading 2: Confirmed exit
      const res2 = GPSService.evaluateGeofence(outsideLocation, defaultGeofence);
      expect(res2.status).toBe('OUTSIDE_SAFE_ZONE');
      expect(res2.isInside).toBe(false);
      expect(res2.eventToDispatch).toBe('EXIT_SAFE_ZONE');
      expect(res2.distanceMeters).toBeGreaterThan(500);

      // Verify safety event structure
      const event = GPSService.createSafetyEvent(
        PATIENT_ID,
        CAREGIVER_ID,
        res2.eventToDispatch!,
        outsideLocation,
        defaultGeofence,
        res2.distanceMeters
      );
      expect(event.type).toBe('EXIT_SAFE_ZONE');
      expect(event.patientId).toBe(PATIENT_ID);
      expect(event.distanceFromHomeMeters).toBe(res2.distanceMeters);
      expect(event.acknowledged).toBe(false);
    });

    it('dispatches ENTER_SAFE_ZONE when patient returns inside geofence after exit', () => {
      const outsideLoc: PatientLocationUpdate = {
        patientId: PATIENT_ID,
        latitude: 12.9780,
        longitude: 77.6480,
        accuracyMeters: 10,
        timestamp: new Date().toISOString(),
        isSharedWithCaregiver: true,
      };

      // Trigger confirmed exit
      GPSService.evaluateGeofence(outsideLoc, defaultGeofence);
      GPSService.evaluateGeofence(outsideLoc, defaultGeofence);

      // Patient returns home
      const returnLoc: PatientLocationUpdate = {
        patientId: PATIENT_ID,
        latitude: 12.9716,
        longitude: 77.6412,
        accuracyMeters: 8,
        timestamp: new Date().toISOString(),
        isSharedWithCaregiver: true,
      };

      const returnRes = GPSService.evaluateGeofence(returnLoc, defaultGeofence);
      expect(returnRes.status).toBe('INSIDE_SAFE_ZONE');
      expect(returnRes.isInside).toBe(true);
      expect(returnRes.eventToDispatch).toBe('ENTER_SAFE_ZONE');
    });
  });

  // -------------------------------------------------------------
  // Part 5: Staleness, Consent & Inactive Monitoring
  // -------------------------------------------------------------
  describe('Part 5: Staleness and Consent Governance', () => {
    it('detects stale location when last update is older than 15 minutes', () => {
      const staleTime = new Date(Date.now() - (STALENESS_THRESHOLD_MS + 60000)).toISOString();
      const staleLocation: PatientLocationUpdate = {
        patientId: PATIENT_ID,
        latitude: 12.9716,
        longitude: 77.6412,
        accuracyMeters: 10,
        timestamp: staleTime,
        isSharedWithCaregiver: true,
      };

      const result = GPSService.evaluateGeofence(staleLocation, defaultGeofence);
      expect(result.status).toBe('LOCATION_STALE');
      expect(result.isStale).toBe(true);
      expect(result.eventToDispatch).toBe('LOCATION_LOST');
    });

    it('returns MONITORING_INACTIVE when patient revokes location consent', () => {
      const consentRevokedLoc: PatientLocationUpdate = {
        patientId: PATIENT_ID,
        latitude: 12.9716,
        longitude: 77.6412,
        accuracyMeters: 10,
        timestamp: new Date().toISOString(),
        isSharedWithCaregiver: false, // Patient paused sharing
      };

      const result = GPSService.evaluateGeofence(consentRevokedLoc, defaultGeofence);
      expect(result.status).toBe('MONITORING_INACTIVE');
      expect(result.eventToDispatch).toBeUndefined();
    });

    it('returns MONITORING_INACTIVE when caregiver disables geofence', () => {
      const disabledConfig: GeofenceConfig = {
        ...defaultGeofence,
        isEnabled: false,
      };

      const activeLoc: PatientLocationUpdate = {
        patientId: PATIENT_ID,
        latitude: 12.9716,
        longitude: 77.6412,
        accuracyMeters: 10,
        timestamp: new Date().toISOString(),
        isSharedWithCaregiver: true,
      };

      const result = GPSService.evaluateGeofence(activeLoc, disabledConfig);
      expect(result.status).toBe('MONITORING_INACTIVE');
    });
  });
});
