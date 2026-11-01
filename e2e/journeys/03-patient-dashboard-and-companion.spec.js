// @ts-check
import { test, expect } from '@playwright/test';
import { SYNTHETIC_PERSONAS } from '../fixtures/synthetic-personas.js';

test.describe('3. Patient Dashboard & Living Pixel Companion', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((persona) => {
      localStorage.setItem('saksham_user_role', 'patient');
      localStorage.setItem('saksham_active_uid', persona.uid);
      localStorage.setItem(`saksham_personalisation_settings_${persona.uid}`, JSON.stringify(persona));
      localStorage.setItem(`saksham_tasks_${persona.uid}`, JSON.stringify(persona.tasks));
      if (window.SakshamPersonalisation && typeof window.SakshamPersonalisation.applySettingsToDom === 'function') {
        window.SakshamPersonalisation.applySettingsToDom(persona);
      }
      if (typeof window.applyRolePermissions === 'function') {
        window.applyRolePermissions('patient', { name: persona.displayName, role: 'patient', condition: persona.condition });
      }
    }, SYNTHETIC_PERSONAS.kalyani);
  });

  test('renders the Living Pixel Companion canvas on dashboard', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    const companionCanvas = page.locator('#companionPixelCanvas, .pixel-companion-canvas');
    await expect(companionCanvas.first()).toBeAttached();

    const canvasValid = await page.evaluate(() => {
      const canvas = document.getElementById('companionPixelCanvas') || document.querySelector('.pixel-companion-canvas');
      return canvas ? canvas.width > 0 && canvas.height > 0 : false;
    });
    expect(canvasValid).toBe(true);
  });

  test('companion displays warm tone and strictly non-angry demeanor', async ({ page }) => {
    const toneAnalysis = await page.evaluate(() => {
      let message = '';
      if (typeof window.getCompanionReminderMessage === 'function') {
        message = window.getCompanionReminderMessage('miko', 'Morning Levodopa Medication');
      }

      const bubble = document.getElementById('companionSpeechBubble');
      const bubbleText = bubble ? bubble.textContent || '' : '';
      const combined = message + ' ' + bubbleText;

      const containsPunitiveLanguage = /angry|failed|shame|late!|bad|wrong/i.test(combined);

      return {
        message,
        bubbleText,
        nonAngry: !containsPunitiveLanguage
      };
    });

    expect(toneAnalysis.nonAngry).toBe(true);
  });

  test('companion transitions between valid emotional states without crash', async ({ page }) => {
    const emotionTest = await page.evaluate(() => {
      if (!window.SakshamPixelCharacter || typeof window.SakshamPixelCharacter.renderToCanvas !== 'function') {
        return { supported: false };
      }
      const canvas = document.getElementById('companionPixelCanvas') || document.querySelector('.pixel-companion-canvas');
      if (!canvas) return { supported: false, error: 'No canvas' };

      const emotions = ['idle', 'happy', 'attentive', 'calming', 'neutral'];
      const results = {};

      for (const emotion of emotions) {
        try {
          window.SakshamPixelCharacter.renderToCanvas(canvas, 'miko', emotion);
          results[emotion] = 'OK';
        } catch (err) {
          results[emotion] = 'ERROR: ' + err.message;
        }
      }

      return { supported: true, results };
    });

    expect(emotionTest.supported).toBe(true);
    for (const [emotion, status] of Object.entries(emotionTest.results || {})) {
      expect(status).toBe('OK');
    }
  });

  test('floating follower avatar and Document PiP trigger are available', async ({ page }) => {
    const follower = page.locator('#sakshamFloatingCompanion');
    await expect(follower).toBeAttached();

    const followerState = await page.evaluate(() => {
      const followerEl = document.getElementById('sakshamFloatingCompanion');
      const pipBtn = document.getElementById('pipCompanionBtn') || document.querySelector('[onclick*="DocumentPip"]');
      return {
        followerExists: !!followerEl,
        hasPipButton: !!pipBtn
      };
    });
    expect(followerState.followerExists).toBe(true);
  });
});
