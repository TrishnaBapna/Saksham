/**
 * SAKSHAM NEURO-CARE — PART B TEST SUITE
 * Real-World GPS Safe-Zone Configurator, Consent Privacy, Geofence Alerts & Asha Home Guide Navigation (§19)
 *
 * Explicit Verification Boundary Note:
 * Unit/integration assertions simulate browser Geolocation & DeviceOrientation inputs via deterministic mocks;
 * real browser geolocation behavior is verified separately via Playwright Chromium geolocation emulation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const memGpsFirestore: Record<string, Record<string, any>> = {};
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    doc: vi.fn((_db: any, ...segments: string[]) => ({
      path: segments.join('/'),
      id: segments[segments.length - 1],
      col: segments.slice(0, -1).join('/'),
    })),
    collection: vi.fn((_db: any, ...segments: string[]) => ({
      path: segments.join('/'),
    })),
    query: vi.fn((colRef: any) => colRef),
    where: vi.fn(() => ({})),
    getDoc: vi.fn(async (docRef: any) => {
      const store = memGpsFirestore[docRef.col] || {};
      const data = store[docRef.id];
      return { exists: () => Boolean(data), id: docRef.id, data: () => data };
    }),
    getDocs: vi.fn(async (qRef: any) => {
      const store = memGpsFirestore[qRef?.path || ''] || {};
      const docs = Object.entries(store).map(([id, data]) => ({ id, data: () => data }));
      return {
        empty: docs.length === 0,
        docs,
        forEach: (cb: (d: any) => void) => docs.forEach(cb),
      };
    }),
    setDoc: vi.fn(async (docRef: any, payload: any, opts?: any) => {
      if (!memGpsFirestore[docRef.col]) memGpsFirestore[docRef.col] = {};
      const existing = opts?.merge ? memGpsFirestore[docRef.col][docRef.id] || {} : {};
      memGpsFirestore[docRef.col][docRef.id] = { ...existing, ...payload };
    }),
    onSnapshot: vi.fn(() => () => {}),
  };
});

import { GPSService } from '../services/gpsService.js';
import { NavigationService } from '../features/safety/services/navigationService.js';
import { NotificationService } from '../features/notifications/services/notificationService.js';
import { CaregiverSafeZoneMap } from '../features/safety/components/CaregiverSafeZoneMap.js';
import { AshaHomeGuidePage } from '../pages/patient/AshaHomeGuidePage.js';
import { PatientDashboard } from '../pages/patient/PatientDashboard.js';
import { SpeechService } from '../services/speechService.js';
import { getGpsSafetyUi } from '../features/safety/utils/gpsSafetyTranslation.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';

describe('Part B: Real-World GPS Safe-Zone & Asha Home Guide Navigation', () => {
  const patientId = 'gps-patient-01';
  const caregiverId = 'gps-caregiver-01';
  const home = { latitude: 12.9716, longitude: 77.5946 };

  beforeEach(() => {
    localStorage.clear();
    GPSService.resetState();
    NotificationService.clearCache();
    vi.restoreAllMocks();
    vi.spyOn(SpeechService, 'speak').mockImplementation(() => {});
    vi.spyOn(SpeechService, 'cancelSpeech').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists Caregiver GeofenceConfig (presets 50m/100m/200m/500m, custom radius, current GPS button) and notifies patient', async () => {
    // Mock navigator.geolocation.getCurrentPosition
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) => {
          success({
            coords: {
              latitude: 19.076,
              longitude: 72.8777,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({}),
            },
            timestamp: Date.now(),
            toJSON: () => ({}),
          } as GeolocationPosition);
        }),
        watchPosition: vi.fn(() => 1),
        clearWatch: vi.fn(),
      },
    });

    render(
      <LanguageProvider>
        <CaregiverSafeZoneMap patientId={patientId} patientName="Sunita" />
      </LanguageProvider>
    );

    // Preset chips include 50m, 100m, 200m, 500m
    expect(screen.getByRole('button', { name: '50m' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '100m' })).toBeInTheDocument();

    // Capture current GPS for Home Sanctuary
    fireEvent.click(screen.getByTestId('geofence-use-current-gps-btn'));
    await waitFor(() => {
      expect((screen.getByTestId('geofence-lat-input') as HTMLInputElement).value).toBe('19.076');
    });

    fireEvent.change(screen.getByTestId('geofence-address-input'), {
      target: { value: 'Dadar Family Residence, Mumbai' },
    });
    fireEvent.change(screen.getByTestId('geofence-custom-radius-input'), {
      target: { value: '150' },
    });
    fireEvent.click(screen.getByTestId('geofence-save-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('geofence-config-feedback')).toHaveTextContent(/saved/i);
    });

    const saved = GPSService.getStoredGeofenceConfig(patientId);
    expect(saved?.addressLabel).toBe('Dadar Family Residence, Mumbai');
    expect(saved?.radiusMeters).toBe(150);
    expect(saved?.centerLatitude).toBeCloseTo(19.076, 4);

    const notifs = NotificationService.getNotifications(patientId, 'patient');
    expect(notifs.some((n) => n.type === 'SAFE_ZONE_CONFIGURED')).toBe(true);
  });

  it('triggers persistent EXIT_SAFE_ZONE & ENTER_SAFE_ZONE events only after 2-reading hysteresis and prevents spam alerts', async () => {
    const config = {
      patientId,
      centerLatitude: home.latitude,
      centerLongitude: home.longitude,
      radiusMeters: 200,
      isEnabled: true,
      addressLabel: 'Home',
      updatedAt: new Date().toISOString(),
      updatedBy: caregiverId,
    };

    const farCoord = {
      patientId,
      latitude: home.latitude + 0.004, // ~444m north (outside 200m)
      longitude: home.longitude,
      accuracyMeters: 12,
      timestamp: new Date().toISOString(),
      isSharedWithCaregiver: true,
    };

    // 1st outside reading holds inside buffer (bounce guard)
    const eval1 = await GPSService.evaluateAndDispatchSafetyTransition({
      patientId,
      patientName: 'Sunita',
      caregiverId,
      location: farCoord,
      config,
    });
    expect(eval1.isInside).toBe(true);
    expect(GPSService.getStoredSafetyEvents(patientId).length).toBe(0);

    // 2nd consecutive outside reading confirms EXIT_SAFE_ZONE
    const eval2 = await GPSService.evaluateAndDispatchSafetyTransition({
      patientId,
      patientName: 'Sunita',
      caregiverId,
      location: farCoord,
      config,
    });
    expect(eval2.status).toBe('OUTSIDE_SAFE_ZONE');
    expect(eval2.eventToDispatch).toBe('EXIT_SAFE_ZONE');
    expect(GPSService.getStoredSafetyEvents(patientId).length).toBe(1);
    expect(
      NotificationService.getNotifications(patientId, 'caregiver').some((n) => n.type === 'SAFE_ZONE_EXIT')
    ).toBe(true);

    // 3rd reading still outside does not duplicate alert
    await GPSService.evaluateAndDispatchSafetyTransition({
      patientId,
      patientName: 'Sunita',
      caregiverId,
      location: farCoord,
      config,
    });
    expect(GPSService.getStoredSafetyEvents(patientId).length).toBe(1);

    // Return inside boundary emits ENTER_SAFE_ZONE
    const evalReturn = await GPSService.evaluateAndDispatchSafetyTransition({
      patientId,
      patientName: 'Sunita',
      caregiverId,
      location: {
        ...farCoord,
        latitude: home.latitude + 0.0005, // ~55m inside
      },
      config,
    });
    expect(evalReturn.status).toBe('INSIDE_SAFE_ZONE');
    expect(evalReturn.eventToDispatch).toBe('ENTER_SAFE_ZONE');
    expect(
      NotificationService.getNotifications(patientId, 'caregiver').some((n) => n.type === 'SAFE_ZONE_RETURN')
    ).toBe(true);
  });

  it('computes relative compass angle when heading present & triggers progressive voice milestones with cooldown across 7 languages', () => {
    const langs = ['en', 'hi', 'mr', 'bn', 'ta', 'te', 'kn'] as const;
    for (const lang of langs) {
      const ui = getGpsSafetyUi(lang);
      expect(ui.stopNavigationBtn.trim().length).toBeGreaterThan(0);
      expect(ui.patientGuideMeHomeBtn.trim().length).toBeGreaterThan(0);
      expect(ui.spokenArrivedCue.trim().length).toBeGreaterThan(0);
    }

    // Relative heading math: target due East (90 deg), user facing East (90 deg) -> walk straight (0 deg relative!)
    const straightEast = NavigationService.computeHomeGuidance(
      { latitude: 12.9716, longitude: 77.5900, accuracyMeters: 10, heading: 90 },
      { latitude: 12.9716, longitude: 77.5946, addressLabel: 'Home' },
      'en'
    );
    expect(straightEast.hasLiveHeading).toBe(true);
    expect(Math.round(straightEast.relativeArrowDegrees) % 360).toBe(0);
    expect(straightEast.direction).toBe('straight');

    // Progressive voice milestones & anti-spam cooldown
    let voiceState = NavigationService.createInitialVoiceState();
    const cueExit = NavigationService.evaluateProgressiveVoiceCue({
      state: voiceState,
      guidance: straightEast,
      isInsideZone: false,
      justExitedZone: true,
      language: 'en',
      nowMs: 10_000,
    });
    expect(cueExit.shouldSpeak).toBe(true);
    expect(cueExit.reason).toBe('exit_zone');
    voiceState = cueExit.nextState;

    // Immediate next reading within cooldown suppressed
    const suppressed = NavigationService.evaluateProgressiveVoiceCue({
      state: voiceState,
      guidance: { ...straightEast, distanceMeters: 450 },
      isInsideZone: false,
      language: 'en',
      nowMs: 12_000,
      cooldownMs: 15_000,
    });
    expect(suppressed.shouldSpeak).toBe(false);

    // After cooldown passes & within 300m -> milestone 300 fires cleanly
    const milestone300 = NavigationService.evaluateProgressiveVoiceCue({
      state: voiceState,
      guidance: { ...straightEast, distanceMeters: 280 },
      isInsideZone: true,
      language: 'en',
      nowMs: 30_000,
      cooldownMs: 15_000,
    });
    expect(milestone300.shouldSpeak).toBe(true);
    expect(milestone300.reason).toBe('milestone_300');
  });

  it('renders PatientDashboard Home Safe Zone card with live distance and Guide Me Home navigation link', async () => {
    await GPSService.saveGeofenceConfig({
      patientId: 'demo-patient-001',
      centerLatitude: home.latitude,
      centerLongitude: home.longitude,
      radiusMeters: 300,
      isEnabled: true,
      addressLabel: 'Koramangala Home',
      updatedAt: new Date().toISOString(),
      updatedBy: caregiverId,
    });
    await GPSService.saveLocationUpdate({
      patientId: 'demo-patient-001',
      latitude: home.latitude + 0.001, // ~111m
      longitude: home.longitude,
      accuracyMeters: 10,
      timestamp: new Date().toISOString(),
      isSharedWithCaregiver: true,
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <LanguageProvider>
            <AccessibilityProvider>
              <CharacterProvider>
                <PatientDashboard />
              </CharacterProvider>
            </AccessibilityProvider>
          </LanguageProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    const card = await screen.findByTestId('patient-gps-safety-card');
    expect(card).toHaveTextContent(/Koramangala Home/i);
    expect(card).toHaveTextContent(/300m/);
    expect(card).toHaveTextContent(/Inside Safe Zone/i);
    expect(screen.getByTestId('patient-guide-me-home-btn')).toHaveAttribute('href', '/patient/home-guide');
  });

  it('supports prominent Stop Navigation & Compass Fallback in AshaHomeGuidePage', () => {
    render(
      <MemoryRouter>
        <AccessibilityProvider>
          <LanguageProvider>
            <AshaHomeGuidePage
              initialHomeLocation={{ ...home, addressLabel: 'Jayanagar Home' }}
              initialPatientLocation={{ latitude: 12.9735, longitude: 77.596, accuracyMeters: 10, heading: null }}
            />
          </LanguageProvider>
        </AccessibilityProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('home-guide-live-map')).toBeInTheDocument();
    expect(screen.getByTestId('home-guide-safety-disclaimer')).toBeInTheDocument();
    expect(screen.getByTestId('home-guide-compass-btn')).toBeInTheDocument();

    // Stop navigation button halts tracking & cancels speech cleanly
    fireEvent.click(screen.getByTestId('home-guide-stop-nav-btn'));
    expect(SpeechService.cancelSpeech).toHaveBeenCalled();
    expect(screen.getByTestId('home-guide-stopped-banner')).toBeInTheDocument();

    // Resume returns cleanly to active mode
    fireEvent.click(screen.getByTestId('home-guide-resume-nav-btn'));
    expect(screen.getByTestId('home-guide-stop-nav-btn')).toBeInTheDocument();
  });

  it('enforces patient consent revocation by marking location unshared and hiding from caregiver map', () => {
    GPSService.setConsentEnabled(patientId, true);
    expect(GPSService.isConsentEnabled(patientId)).toBe(true);
    GPSService.saveLocationUpdate({
      patientId,
      latitude: home.latitude,
      longitude: home.longitude,
      accuracyMeters: 10,
      timestamp: new Date().toISOString(),
      isSharedWithCaregiver: true,
    });

    GPSService.setConsentEnabled(patientId, false);
    expect(GPSService.isConsentEnabled(patientId)).toBe(false);
    expect(GPSService.getStoredLatestLocation(patientId)?.isSharedWithCaregiver).toBe(false);

    render(
      <LanguageProvider>
        <CaregiverSafeZoneMap patientId={patientId} patientName="Sunita" />
      </LanguageProvider>
    );
    expect(screen.getByTestId('geofence-status-consent-withdrawn')).toBeInTheDocument();
  });
});
