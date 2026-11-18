/**
 * SAKSHAM NEURO-CARE — PHASE 5: ASHA HOME GUIDE NAVIGATION TESTS
 * Verifies TASK-NAV-01 through TASK-NAV-03:
 * - NavigationService bearing, distance, and orientation calculation
 * - AshaHomeGuidePage minimalist high-contrast UI and rotating direction arrow
 * - Asha voice reassurance and repeat guidance
 * - Honest degraded accuracy notification
 * - OpenStreetMap pedestrian routing and emergency escalation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import { NavigationService } from '../features/safety/services/navigationService.js';
import { AshaHomeGuidePage } from '../pages/patient/AshaHomeGuidePage.js';
import { SpeechService } from '../services/speechService.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';

describe('Phase 5: Asha Home Guide Navigation Engine & Patient UI', () => {
  const homeLocation = {
    latitude: 12.9716,
    longitude: 77.5946,
    addressLabel: 'Indiranagar 2nd Stage, Bengaluru',
  };

  const patientNearLocation = {
    latitude: 12.9735,
    longitude: 77.5960,
    accuracyMeters: 8,
    heading: 0,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(SpeechService, 'speak').mockImplementation(() => {});
    vi.spyOn(SpeechService, 'cancelSpeech').mockImplementation(() => {});
  });

  describe('Part A: Navigation Engine & Bearing Service (TASK-NAV-01)', () => {
    it('computes distance and bearing to home sanctuary', () => {
      const guidance = NavigationService.computeHomeGuidance(
        patientNearLocation,
        homeLocation,
        'en'
      );

      expect(guidance.distanceMeters).toBeGreaterThan(150);
      expect(guidance.distanceMeters).toBeLessThan(400);
      expect(guidance.bearingDegrees).toBeGreaterThanOrEqual(0);
      expect(guidance.bearingDegrees).toBeLessThan(360);
      expect(guidance.directionLabel).toBeDefined();
      expect(guidance.spokenGuidance).toContain('metres from home');
      expect(guidance.isAccuracyDegraded).toBe(false);
    });

    it('identifies arrival when distance is within 30 metres', () => {
      const arrivedLocation = {
        latitude: homeLocation.latitude + 0.0001,
        longitude: homeLocation.longitude + 0.0001,
        accuracyMeters: 5,
        heading: 0,
      };

      const guidance = NavigationService.computeHomeGuidance(
        arrivedLocation,
        homeLocation,
        'en'
      );

      expect(guidance.direction).toBe('arrived');
      expect(guidance.directionLabel).toBe('Arrived Home');
      expect(guidance.spokenGuidance).toContain('arrived safely');
    });

    it('honestly detects and flags degraded GPS accuracy (> 45m)', () => {
      const indoorLocation = {
        latitude: patientNearLocation.latitude,
        longitude: patientNearLocation.longitude,
        accuracyMeters: 65, // Poor GPS fix
        heading: 0,
      };

      const guidance = NavigationService.computeHomeGuidance(
        indoorLocation,
        homeLocation,
        'en'
      );

      expect(guidance.isAccuracyDegraded).toBe(true);
      expect(guidance.accuracyMeters).toBe(65);
      expect(guidance.spokenGuidance).toContain('Walk calmly, Asha is right here with you');
    });

    it('generates authentic OpenStreetMap walking directions URL', () => {
      const url = NavigationService.getOsmWalkingDirectionsUrl(
        patientNearLocation,
        homeLocation
      );

      expect(url).toContain('openstreetmap.org/directions');
      expect(url).toContain('fossgis_osrm_foot');
      expect(url).toContain(String(patientNearLocation.latitude));
      expect(url).toContain(String(homeLocation.latitude));
    });
  });

  describe('Part B: Asha Home Guide Patient UI (TASK-NAV-02 & 03)', () => {
    it('renders direction arrow, distance in metres, and home address', () => {
      render(
        <BrowserRouter>
          <AccessibilityProvider>
            <LanguageProvider>
              <AshaHomeGuidePage
                initialPatientLocation={patientNearLocation}
                initialHomeLocation={homeLocation}
              />
            </LanguageProvider>
          </AccessibilityProvider>
        </BrowserRouter>
      );

      expect(screen.getByTestId('asha-home-guide-page')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Asha Home Guide/i })).toBeInTheDocument();
      expect(screen.getAllByText(/metres/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/to your Home Sanctuary/i)).toBeInTheDocument();
      expect(screen.getByText(/Indiranagar 2nd Stage, Bengaluru/i)).toBeInTheDocument();
    });

    it('renders Asha companion guidance and provides repeat speech action', () => {
      render(
        <BrowserRouter>
          <AccessibilityProvider>
            <LanguageProvider>
              <AshaHomeGuidePage
                initialPatientLocation={patientNearLocation}
                initialHomeLocation={homeLocation}
              />
            </LanguageProvider>
          </AccessibilityProvider>
        </BrowserRouter>
      );

      expect(screen.getByText(/Asha Companion/i)).toBeInTheDocument();
      expect(screen.getByText(/Safe Step by Step/i)).toBeInTheDocument();

      const repeatBtn = screen.getByRole('button', { name: /Repeat Asha Voice/i });
      expect(repeatBtn).toBeInTheDocument();

      fireEvent.click(repeatBtn);
      expect(SpeechService.speak).toHaveBeenCalled();
    });

    it('renders degraded accuracy warning banner when accuracy exceeds threshold', () => {
      const degradedLocation = {
        ...patientNearLocation,
        accuracyMeters: 55,
      };

      render(
        <BrowserRouter>
          <AccessibilityProvider>
            <LanguageProvider>
              <AshaHomeGuidePage
                initialPatientLocation={degradedLocation}
                initialHomeLocation={homeLocation}
              />
            </LanguageProvider>
          </AccessibilityProvider>
        </BrowserRouter>
      );

      expect(screen.getByTestId('degraded-accuracy-warning')).toBeInTheDocument();
      expect(screen.getByText(/GPS Accuracy Approximate/i)).toBeInTheDocument();
      expect(screen.getByText(/banyan tree/i)).toBeInTheDocument();
    });

    it('provides Call Caregiver and OpenStreetMap walking links', () => {
      render(
        <BrowserRouter>
          <AccessibilityProvider>
            <LanguageProvider>
              <AshaHomeGuidePage
                initialPatientLocation={patientNearLocation}
                initialHomeLocation={homeLocation}
                caregiverName="Priya"
                caregiverPhone="+91 98765 43210"
              />
            </LanguageProvider>
          </AccessibilityProvider>
        </BrowserRouter>
      );

      const callBtn = screen.getByRole('link', { name: /Call Caregiver Priya/i });
      expect(callBtn).toBeInTheDocument();
      expect(callBtn).toHaveAttribute('href', 'tel:+919876543210');

      const mapBtn = screen.getByRole('link', { name: /Open walking route on map/i });
      expect(mapBtn).toBeInTheDocument();
      expect(mapBtn.getAttribute('href')).toContain('openstreetmap.org/directions');
    });
  });
});
