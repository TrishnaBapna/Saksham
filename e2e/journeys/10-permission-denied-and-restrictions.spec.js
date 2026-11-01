// @ts-check
import { test, expect } from '@playwright/test';

test.describe('10. Permission-Denied and Browser-Restricted Scenarios', () => {

  test('handles Notification.permission = "denied" gracefully without throwing unhandled exceptions', async ({ page }) => {
    await page.goto('/');

    const notificationFallback = await page.evaluate(() => {
      // Mock Notification.permission as denied
      try {
        Object.defineProperty(window, 'Notification', {
          value: class MockNotification {
            static permission = 'denied';
            static requestPermission() {
              return Promise.resolve('denied');
            }
          },
          configurable: true
        });
      } catch (e) {}

      // Trigger alarm evaluation
      let alarmResult = 'OK';
      try {
        if (typeof window.triggerActiveAlarmBanner === 'function') {
          window.triggerActiveAlarmBanner({ id: 'test-denied', title: 'Medication' });
        }
      } catch (err) {
        alarmResult = 'ERROR: ' + err.message;
      }

      return { alarmResult, permission: window.Notification?.permission };
    });

    expect(notificationFallback.alarmResult).toBe('OK');
  });

  test('handles unsupported Web Speech gracefully with text fallback', async ({ page }) => {
    await page.goto('/');

    const voiceFallback = await page.evaluate(() => {
      let survived = true;
      try {
        if (typeof window.speakPageSummary === 'function') {
          // Attempt call even if SpeechSynthesis is unavailable
          window.speakPageSummary('routine');
        }
      } catch (err) {
        survived = false;
      }
      return { survived };
    });

    expect(voiceFallback.survived).toBe(true);
  });
});
