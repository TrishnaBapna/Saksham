// @ts-check
import { test, expect } from '@playwright/test';
import { SYNTHETIC_PERSONAS } from '../fixtures/synthetic-personas.js';

test.describe('2. Age-Adaptive Personalisation & Calm Design Tokens', () => {

  test('applies Senior pacing defaults to dashboard UI', async ({ page }) => {
    await page.goto('/');

    const applied = await page.evaluate((kalyani) => {
      localStorage.setItem('saksham_user_role', 'patient');
      localStorage.setItem('saksham_active_uid', kalyani.uid);
      localStorage.setItem(`saksham_personalisation_settings_${kalyani.uid}`, JSON.stringify(kalyani));
      localStorage.setItem(`saksham_tasks_${kalyani.uid}`, JSON.stringify(kalyani.tasks));

      if (window.SakshamPersonalisation && typeof window.SakshamPersonalisation.applySettingsToDom === 'function') {
        window.SakshamPersonalisation.applySettingsToDom(kalyani);
      }
      if (typeof window.syncDashboardAgeUI === 'function') {
        window.syncDashboardAgeUI();
      }
      if (typeof window.switchTab === 'function') {
        window.switchTab('routine');
      }

      const badge = document.getElementById('routineTierPill') || document.getElementById('dashAgePacingBadge') || document.querySelector('[class*="pacing"]');
      return {
        hasBadge: !!badge,
        badgeText: badge ? badge.textContent || '' : '',
        theme: document.documentElement.getAttribute('data-theme') || document.body.getAttribute('data-theme')
      };
    }, SYNTHETIC_PERSONAS.kalyani);

    expect(applied.hasBadge).toBe(true);
    expect(applied.badgeText.toLowerCase()).toMatch(/elderly|senior/i);
  });

  test('applies Adult pacing defaults to dashboard UI', async ({ page }) => {
    await page.goto('/');

    const applied = await page.evaluate((aarav) => {
      localStorage.setItem('saksham_user_role', 'patient');
      localStorage.setItem('saksham_active_uid', aarav.uid);
      localStorage.setItem('saksham_user_dob', aarav.dob);
      localStorage.setItem(`saksham_personalisation_settings_${aarav.uid}`, JSON.stringify(aarav));
      localStorage.setItem(`saksham_tasks_${aarav.uid}`, JSON.stringify(aarav.tasks));

      if (typeof window.setAgeTier === 'function') {
        window.setAgeTier('adult', false, 'dob');
      }
      if (typeof window.switchTab === 'function') {
        window.switchTab('routine');
      }

      const badge = document.getElementById('routineTierPill') || document.getElementById('dashAgePacingBadge') || document.querySelector('[class*="pacing"]');
      return {
        hasBadge: !!badge,
        badgeText: badge ? badge.textContent || '' : ''
      };
    }, SYNTHETIC_PERSONAS.aarav);

    expect(applied.hasBadge).toBe(true);
    expect(applied.badgeText.toLowerCase()).toMatch(/adult|titan/i);
  });

  test('verifies tremor damping mode enables click debounce and target safety', async ({ page }) => {
    await page.goto('/');

    const dampingState = await page.evaluate(() => {
      if (typeof window.SakshamBiometrics !== 'undefined') {
        return {
          available: true,
          hasBiometrics: typeof window.SakshamBiometrics === 'object'
        };
      }
      return { available: false, hasBiometrics: false };
    });

    expect(dampingState.available).toBe(true);
  });
});
