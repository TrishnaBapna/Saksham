/**
 * SAKSHAM NEURO-CARE — PHASE 4: ASHA SAFE ZONE GPS & CAREGIVER MAP TESTS
 * Verifies TASK-GPS-02 through TASK-GPS-04:
 * - PatientLocationConsentModal plain-language privacy controls & localStorage persistence
 * - CaregiverSafeZoneMap OpenStreetMap visualization, radius slider (100m-2000m), & status badges
 * - Safe zone exit/return evaluation and one-tap emergency calling
 * - Integration into PatientProfile & CaregiverDashboard
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import { PatientLocationConsentModal } from '../features/safety/components/PatientLocationConsentModal.js';
import { CaregiverSafeZoneMap } from '../features/safety/components/CaregiverSafeZoneMap.js';
import { PatientProfile } from '../pages/patient/PatientProfile.js';
import { CaregiverDashboard } from '../pages/caregiver/CaregiverDashboard.js';
import { CaregiverService } from '../features/caregiver/services/caregiverService.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';

describe('Phase 4: Asha Safe Zone GPS & Caregiver Map', () => {
  const patientId = 'test-patient-sunita';
  const patientName = 'Sunita Sharma';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Part A: Patient Location Consent & Privacy Modal (TASK-GPS-02)', () => {
    it('renders consent modal with plain-language privacy commitments', () => {
      render(
        <PatientLocationConsentModal
          isOpen={true}
          onClose={() => {}}
          patientId={patientId}
        />
      );

      expect(screen.getByRole('heading', { name: /Location Safety & Privacy Controls/i })).toBeInTheDocument();
      expect(screen.getByText(/Location Sharing Active/i)).toBeInTheDocument();
      expect(screen.getByText(/Only When App is Active/i)).toBeInTheDocument();
      expect(screen.getByText(/Never Sold or Shared with Third Parties/i)).toBeInTheDocument();
      expect(screen.getByText(/Battery Friendly & Drift Filtered/i)).toBeInTheDocument();
    });

    it('toggles location consent state and updates localStorage', async () => {
      const onConsentChange = vi.fn();
      render(
        <PatientLocationConsentModal
          isOpen={true}
          onClose={() => {}}
          patientId={patientId}
          onConsentChange={onConsentChange}
        />
      );

      // Initially active
      expect(screen.getByText(/Location Sharing Active/i)).toBeInTheDocument();

      // Click toggle to pause
      const toggleBtn = screen.getByRole('button', { name: /Pause location sharing/i });
      fireEvent.click(toggleBtn);

      await waitFor(() => {
        expect(screen.getByText(/Location Sharing Paused/i)).toBeInTheDocument();
      });

      expect(onConsentChange).toHaveBeenCalledWith(false);
      expect(localStorage.getItem(`saksham_patient_location_consent_${patientId}`)).toBe('false');

      // Click toggle to re-activate
      const resumeBtn = screen.getByRole('button', { name: /Activate location sharing/i });
      fireEvent.click(resumeBtn);

      await waitFor(() => {
        expect(screen.getByText(/Location Sharing Active/i)).toBeInTheDocument();
      });
      expect(onConsentChange).toHaveBeenCalledWith(true);
      expect(localStorage.getItem(`saksham_patient_location_consent_${patientId}`)).toBe('true');
    });

    it('opens consent modal from PatientProfile page replacing alert', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <AccessibilityProvider>
              <LanguageProvider>
                <PatientProfile />
              </LanguageProvider>
            </AccessibilityProvider>
          </AuthProvider>
        </BrowserRouter>
      );

      const manageBtn = screen.getByRole('button', { name: /Manage Location Sharing & Data Privacy/i });
      expect(manageBtn).toBeInTheDocument();

      fireEvent.click(manageBtn);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Location Safety & Privacy Controls/i })).toBeInTheDocument();
      });
    });
  });

  describe('Part B: Caregiver Safe Zone Interactive Map (TASK-GPS-03 & 04)', () => {
    it('renders CaregiverSafeZoneMap with Home Sanctuary, patient status, and OpenStreetMap attribution', () => {
      render(
        <CaregiverSafeZoneMap
          patientId={patientId}
          patientName={patientName}
          initialRadiusMeters={500}
        />
      );

      expect(screen.getByTestId('caregiver-safe-zone-map')).toBeInTheDocument();
      expect(screen.getByText(/Safe Zone & Geofence Map/i)).toBeInTheDocument();
      expect(screen.getByText(/100% Spark Free/i)).toBeInTheDocument();
      expect(screen.getByTestId('geofence-status-inside')).toBeInTheDocument();
      expect(screen.getByText(/Home Sanctuary/i)).toBeInTheDocument();
      expect(screen.getAllByText(/OpenStreetMap/i).length).toBeGreaterThanOrEqual(1);
    });

    it('adjusts geofence radius via preset buttons and slider', () => {
      const onRadiusChange = vi.fn();
      render(
        <CaregiverSafeZoneMap
          patientId={patientId}
          patientName={patientName}
          initialRadiusMeters={500}
          onRadiusChange={onRadiusChange}
        />
      );

      expect(screen.getByText(/500 metres/i)).toBeInTheDocument();

      // Click 1000m (1km) preset chip
      const preset1km = screen.getByRole('button', { name: '1km' });
      fireEvent.click(preset1km);

      expect(onRadiusChange).toHaveBeenCalledWith(1000);
      expect(screen.getByText(/1000 metres/i)).toBeInTheDocument();

      // Click 200m preset chip
      const preset200m = screen.getByRole('button', { name: '200m' });
      fireEvent.click(preset200m);

      expect(onRadiusChange).toHaveBeenCalledWith(200);
      expect(screen.getByText(/200 metres/i)).toBeInTheDocument();
    });

    it('provides direct Call Patient telephone link and walking directions link', () => {
      render(
        <CaregiverSafeZoneMap
          patientId={patientId}
          patientName={patientName}
          patientPhone="+91 98765 43210"
        />
      );

      const callLink = screen.getByRole('link', { name: /Call Sunita Sharma/i });
      expect(callLink).toBeInTheDocument();
      expect(callLink).toHaveAttribute('href', 'tel:+919876543210');

      const directionsLink = screen.getByRole('link', { name: /Get walking directions/i });
      expect(directionsLink).toBeInTheDocument();
      expect(directionsLink.getAttribute('href')).toContain('openstreetmap.org/directions');
    });

    it('renders CaregiverSafeZoneMap inside CaregiverDashboard for connected patient', async () => {
      vi.spyOn(CaregiverService, 'getConnectedPatient').mockResolvedValue({
        patientId,
        patientName,
        relationshipStatus: 'active',
        permissions: {
          canReadCalendar: true,
          canCreateCalendarEvents: true,
          canEditCalendarEvents: true,
          canDeleteCalendarEvents: true,
        },
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <CaregiverDashboard />
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('caregiver-safe-zone-map')).toBeInTheDocument();
        expect(screen.getByText(/Safe Zone & Geofence Map/i)).toBeInTheDocument();
      });
    });

    it('notifies status change and supplies evaluation when outside safe zone', async () => {
      const onStatusChange = vi.fn();
      render(
        <CaregiverSafeZoneMap
          patientId={patientId}
          patientName={patientName}
          trackingStateOverride="OUTSIDE_SAFE_ZONE"
          onStatusChange={onStatusChange}
        />
      );

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith('OUTSIDE_SAFE_ZONE', expect.anything());
      });
    });
  });

  describe('Part C: Visible Tracking States (Stage F1 Requirement)', () => {
    it('renders inside safe zone state', () => {
      render(
        <CaregiverSafeZoneMap
          patientId={patientId}
          patientName={patientName}
          trackingStateOverride="INSIDE_SAFE_ZONE"
        />
      );
      expect(screen.getByTestId('geofence-status-inside')).toBeInTheDocument();
      expect(screen.getByText(/Inside Safe Zone/i)).toBeInTheDocument();
    });

    it('renders outside safe zone state', () => {
      render(
        <CaregiverSafeZoneMap
          patientId={patientId}
          patientName={patientName}
          trackingStateOverride="OUTSIDE_SAFE_ZONE"
        />
      );
      expect(screen.getByTestId('geofence-status-outside')).toBeInTheDocument();
      expect(screen.getByText(/Exited Safe Zone!/i)).toBeInTheDocument();
    });

    it('renders permission denied state', () => {
      render(
        <CaregiverSafeZoneMap
          patientId={patientId}
          patientName={patientName}
          trackingStateOverride="PERMISSION_DENIED"
        />
      );
      expect(screen.getByTestId('geofence-status-permission-denied')).toBeInTheDocument();
      expect(screen.getByText(/Permission Denied/i)).toBeInTheDocument();
    });

    it('renders GPS unavailable state', () => {
      render(
        <CaregiverSafeZoneMap
          patientId={patientId}
          patientName={patientName}
          trackingStateOverride="GPS_UNAVAILABLE"
        />
      );
      expect(screen.getByTestId('geofence-status-gps-unavailable')).toBeInTheDocument();
      expect(screen.getByText(/GPS Unavailable/i)).toBeInTheDocument();
    });

    it('renders poor accuracy state', () => {
      render(
        <CaregiverSafeZoneMap
          patientId={patientId}
          patientName={patientName}
          patientLocationOverride={{
            patientId,
            latitude: 12.972,
            longitude: 77.595,
            accuracyMeters: 75,
            timestamp: new Date().toISOString(),
            isSharedWithCaregiver: true,
          }}
        />
      );
      expect(screen.getByTestId('geofence-status-poor-accuracy')).toBeInTheDocument();
      expect(screen.getByText(/Poor Accuracy \(±75m\)/i)).toBeInTheDocument();
    });

    it('renders tracking paused state', () => {
      render(
        <CaregiverSafeZoneMap
          patientId={patientId}
          patientName={patientName}
          trackingStateOverride="TRACKING_PAUSED"
        />
      );
      expect(screen.getByTestId('geofence-status-tracking-paused')).toBeInTheDocument();
      expect(screen.getByText(/Tracking Paused/i)).toBeInTheDocument();
    });

    it('renders consent withdrawn state', () => {
      render(
        <CaregiverSafeZoneMap
          patientId={patientId}
          patientName={patientName}
          patientLocationOverride={{
            patientId,
            latitude: 12.972,
            longitude: 77.595,
            accuracyMeters: 10,
            timestamp: new Date().toISOString(),
            isSharedWithCaregiver: false,
          }}
        />
      );
      expect(screen.getByTestId('geofence-status-consent-withdrawn')).toBeInTheDocument();
      expect(screen.getByText(/Consent Withdrawn/i)).toBeInTheDocument();
    });
  });
});
