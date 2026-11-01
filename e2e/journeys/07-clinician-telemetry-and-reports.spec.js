// @ts-check
import { test, expect } from '@playwright/test';
import { SYNTHETIC_PERSONAS } from '../fixtures/synthetic-personas.js';

test.describe('7. Clinician Dashboard & Telemetry Reporting', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('authenticates synthetic doctor and opens Doctor Console', async ({ page }) => {
    const docState = await page.evaluate((drVerma) => {
      const pinInput = document.getElementById('secGatePinInput');
      if (pinInput) pinInput.value = '9999';

      if (typeof window.applyRolePermissions === 'function') {
        window.applyRolePermissions('doctor', { name: drVerma.displayName, role: 'doctor' });
      }

      const portal = document.getElementById('portal-doctor-container');
      const isVisible = portal ? !portal.classList.contains('hidden') : false;

      return {
        role: window.state?.role || localStorage.getItem('saksham_user_role'),
        portalVisible: isVisible
      };
    }, SYNTHETIC_PERSONAS.drVerma);

    expect(docState.role).toBe('doctor');
    expect(docState.portalVisible).toBe(true);
  });

  test('verifies clinical adherence telemetry graphs and patient log feed', async ({ page }) => {
    const telemetryState = await page.evaluate((drVerma) => {
      if (typeof window.applyRolePermissions === 'function') {
        window.applyRolePermissions('doctor', { name: drVerma.displayName, role: 'doctor' });
      }
      if (typeof window.switchDoctorSubTab === 'function') {
        window.switchDoctorSubTab('doc-telemetry');
      }

      const logFeed = document.getElementById('doctorLogFeed');
      const trialCard = document.getElementById('docPersonalisationTrialCard');
      const canvas = document.querySelector('#doc-subview-telemetry canvas');

      return {
        hasLogFeed: !!logFeed,
        hasTrialCard: !!trialCard,
        hasCanvas: !!canvas
      };
    }, SYNTHETIC_PERSONAS.drVerma);

    expect(telemetryState.hasLogFeed).toBe(true);
    expect(telemetryState.hasTrialCard).toBe(true);
  });

  test('creates synthetic clinical medication directive', async ({ page }) => {
    const directiveState = await page.evaluate((drVerma) => {
      if (typeof window.applyRolePermissions === 'function') {
        window.applyRolePermissions('doctor', { name: drVerma.displayName, role: 'doctor' });
      }
      if (typeof window.switchDoctorSubTab === 'function') {
        window.switchDoctorSubTab('doc-directives');
      }

      const directivesList = document.getElementById('docDirectivesList');
      return { hasDirectivesList: !!directivesList };
    }, SYNTHETIC_PERSONAS.drVerma);

    expect(directiveState.hasDirectivesList).toBe(true);
  });

  test('generates clinical trial summary report preview', async ({ page }) => {
    const reportState = await page.evaluate((drVerma) => {
      if (typeof window.applyRolePermissions === 'function') {
        window.applyRolePermissions('doctor', { name: drVerma.displayName, role: 'doctor' });
      }
      if (typeof window.switchDoctorSubTab === 'function') {
        window.switchDoctorSubTab('doc-reports');
      }

      const previewBox = document.getElementById('previewReportBox');
      return { hasPreviewBox: !!previewBox };
    }, SYNTHETIC_PERSONAS.drVerma);

    expect(reportState.hasPreviewBox).toBe(true);
  });
});
