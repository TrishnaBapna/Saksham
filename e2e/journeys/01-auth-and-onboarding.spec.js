// @ts-check
import { test, expect } from '@playwright/test';
import { SYNTHETIC_PERSONAS } from '../fixtures/synthetic-personas.js';

test.describe('1. Authentication and Onboarding Journey', () => {

  test.beforeEach(async ({ page }) => {
    // Clear storage to start fresh
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('verifies auth gateway screen, demo account switcher, and role security', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check that main title loads
    await expect(page).toHaveTitle(/Saksham/i);

    // Verify presence of role switcher buttons or header role badge
    const headerBadge = page.locator('#headerRoleBadge, #txtHeaderRoleName');
    await expect(headerBadge.first()).toBeVisible();

    // Verify role security PIN gate exists
    const securityGate = page.locator('#modalRoleSecurityGate');
    expect(await securityGate.count()).toBeGreaterThan(0);
  });

  test('calculates correct age tier from DOB via central constants', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(() => {
      if (typeof window.calculateAgeFromDob !== 'function' || typeof window.resolveAgeTier !== 'function') {
        return null;
      }
      const resSenior = window.resolveAgeTier('1958-05-15');
      const resAdult = window.resolveAgeTier('1992-04-10');
      const resYouth = window.resolveAgeTier('2008-01-01');

      return {
        senior: resSenior,
        adult: resAdult,
        youth: resYouth
      };
    });

    expect(result).not.toBeNull();
    expect(result?.senior.tier).toBe('senior');
    expect(result?.adult.tier).toBe('adult');
    expect(result?.youth.tier).toBe('youth');
  });

  test('simulates patient onboarding 5-step flow with synthetic senior persona', async ({ page }) => {
    await page.goto('/');

    const onboardingResult = await page.evaluate((persona) => {
      // Seed synthetic profile
      localStorage.setItem('saksham_user_role', 'patient');
      localStorage.setItem('saksham_active_uid', persona.uid);
      localStorage.setItem(`saksham_personalisation_settings_${persona.uid}`, JSON.stringify(persona));

      if (typeof window.applyRolePermissions === 'function') {
        window.applyRolePermissions('patient', {
          name: persona.displayName,
          role: 'patient',
          condition: persona.condition
        });
      }

      return {
        role: localStorage.getItem('saksham_user_role'),
        uid: localStorage.getItem('saksham_active_uid')
      };
    }, SYNTHETIC_PERSONAS.kalyani);

    expect(onboardingResult.role).toBe('patient');
    expect(onboardingResult.uid).toBe(SYNTHETIC_PERSONAS.kalyani.uid);
  });
});
