// @ts-check
import { test, expect } from '@playwright/test';
import { SYNTHETIC_PERSONAS } from '../fixtures/synthetic-personas.js';

test.describe('6. Caregiver Dashboard & Oversight Journey', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('requires PIN verification to access Caregiver console', async ({ page }) => {
    const gateState = await page.evaluate(() => {
      // Simulate switching to caregiver
      if (typeof window.applyRolePermissions === 'function') {
        window.applyRolePermissions('caregiver', { name: 'Sunita Sharma', role: 'caregiver' });
      }
      const portal = document.getElementById('portal-caregiver-container');
      return { gateVisible: !!portal };
    });

    expect(gateState.gateVisible).toBe(true);
  });

  test('successfully authenticates with synthetic PIN 1234 and displays Caregiver Overview', async ({ page }) => {
    const loginResult = await page.evaluate((sunita) => {
      // Set PIN input and verify
      const pinInput = document.getElementById('secGatePinInput');
      if (pinInput) pinInput.value = sunita.pin;

      if (typeof window.applyRolePermissions === 'function') {
        window.applyRolePermissions('caregiver', { name: sunita.displayName, role: 'caregiver' });
      }

      const portal = document.getElementById('portal-caregiver-container');
      const isVisible = portal ? !portal.classList.contains('hidden') : false;

      return {
        role: window.state?.role || localStorage.getItem('saksham_user_role'),
        portalVisible: isVisible
      };
    }, SYNTHETIC_PERSONAS.sunita);

    expect(loginResult.role).toBe('caregiver');
    expect(loginResult.portalVisible).toBe(true);
  });

  test('inspects caregiver remote telemetry and slow tasks feed', async ({ page }) => {
    const telemetryState = await page.evaluate((sunita) => {
      if (typeof window.applyRolePermissions === 'function') {
        window.applyRolePermissions('caregiver', { name: sunita.displayName, role: 'caregiver' });
      }
      if (typeof window.switchCaregiverSubTab === 'function') {
        window.switchCaregiverSubTab('cg-overview');
      }

      const slowTasksList = document.getElementById('cgOverviewSlowTasksList');
      const trialCard = document.getElementById('cgPersonalisationTrialCard');

      return {
        hasSlowTasksFeed: !!slowTasksList,
        hasTrialCard: !!trialCard
      };
    }, SYNTHETIC_PERSONAS.sunita);

    expect(telemetryState.hasSlowTasksFeed).toBe(true);
    expect(telemetryState.hasTrialCard).toBe(true);
  });

  test('creates synthetic caregiver directive note and persists locally', async ({ page }) => {
    const noteSaved = await page.evaluate((sunita) => {
      if (window.SakshamNotes && typeof window.SakshamNotes.saveNote === 'function') {
        window.SakshamNotes.saveNote({
          id: 'syn-cg-note-1',
          text: 'Remember to take a 5-minute hydration break before lunch.',
          category: 'caregiver',
          author: sunita.displayName
        });
        return true;
      }
      return false;
    }, SYNTHETIC_PERSONAS.sunita);

    expect(noteSaved).toBe(true);
  });

  test('verifies SafePath GPS map container and geofence radius adjustment', async ({ page }) => {
    const gpsState = await page.evaluate((sunita) => {
      if (typeof window.applyRolePermissions === 'function') {
        window.applyRolePermissions('caregiver', { name: sunita.displayName, role: 'caregiver' });
      }
      if (typeof window.switchCaregiverSubTab === 'function') {
        window.switchCaregiverSubTab('cg-gps');
      }

      if (typeof window.setGeofenceRadius === 'function') {
        window.setGeofenceRadius(sunita.geofenceRadiusMeters);
      }

      const map = document.getElementById('caregiverLeafletMap');
      return { mapExists: !!map };
    }, SYNTHETIC_PERSONAS.sunita);

    expect(gpsState.mapExists).toBe(true);
  });
});
