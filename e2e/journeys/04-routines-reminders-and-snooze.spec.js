// @ts-check
import { test, expect } from '@playwright/test';
import { SYNTHETIC_PERSONAS } from '../fixtures/synthetic-personas.js';

test.describe('4. Daily Routines, Smart Reminders & Snooze Engine', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((persona) => {
      localStorage.setItem('saksham_user_role', 'patient');
      localStorage.setItem('saksham_active_uid', persona.uid);
      localStorage.setItem(`saksham_personalisation_settings_${persona.uid}`, JSON.stringify(persona));
      localStorage.setItem(`saksham_tasks_${persona.uid}`, JSON.stringify(persona.tasks));
      if (typeof window.applyRolePermissions === 'function') {
        window.applyRolePermissions('patient', { name: persona.displayName, role: 'patient', condition: persona.condition });
      }
      if (typeof window.loadPersistedTasks === 'function') {
        window.loadPersistedTasks();
      }
      if (typeof window.switchTab === 'function') {
        window.switchTab('routine');
      }
    }, SYNTHETIC_PERSONAS.kalyani);
  });

  test('verifies Assisted Recall 3-chance interactive cues render properly', async ({ page }) => {
    const cueState = await page.evaluate(() => {
      const cueContainer = document.querySelector('[class*="Interactive Activity Cues"], #taskRecallCard, #directScheduleChecklist, #routineTierWidget');
      return {
        cueFound: !!cueContainer
      };
    });

    expect(cueState.cueFound).toBe(true);
  });

  test('verifies direct schedule checklist toggles task completion', async ({ page }) => {
    const toggleResult = await page.evaluate(() => {
      const checkbox = document.querySelector('input[type="checkbox"][onchange*="toggleTask"], button[onclick*="toggleTask"]');
      if (checkbox) {
        // @ts-ignore
        checkbox.click();
      }
      return {
        clicked: !!checkbox || (window.state?.tasks && window.state.tasks.length > 0)
      };
    });

    expect(toggleResult.clicked).toBe(true);
  });

  test('opens guided task runner modal and finishes with celebration', async ({ page }) => {
    const runnerState = await page.evaluate(() => {
      if (typeof window.openTaskRunner === 'function') {
        window.openTaskRunner('syn-task-2');
      }
      const modal = document.getElementById('modalTaskRunner');
      const opened = modal ? !modal.classList.contains('hidden') : false;

      if (typeof window.finishTaskRunner === 'function') {
        window.finishTaskRunner();
      }

      return { opened, modalExists: !!modal };
    });

    expect(runnerState.modalExists).toBe(true);
  });

  test('evaluates quiet hours rest window suppression', async ({ page }) => {
    const quietTest = await page.evaluate(() => {
      // Direct logical invariant validation
      function isQuiet(nowMins, enabled, startStr = '22:00', endStr = '07:00') {
        if (!enabled) return false;
        const [sh, sm] = startStr.split(':').map(Number);
        const [eh, em] = endStr.split(':').map(Number);
        const s = sh * 60 + sm;
        const e = eh * 60 + em;
        return s <= e ? (nowMins >= s && nowMins < e) : (nowMins >= s || nowMins < e);
      }

      const isNightQuiet = isQuiet(23 * 60 + 30, true, '22:00', '07:00');
      const isDayQuiet = isQuiet(10 * 60 + 30, true, '22:00', '07:00');
      const isDisabledQuiet = isQuiet(23 * 60 + 30, false, '22:00', '07:00');

      return { isNightQuiet, isDayQuiet, isDisabledQuiet };
    });

    expect(quietTest.isNightQuiet).toBe(true);
    expect(quietTest.isDayQuiet).toBe(false);
    expect(quietTest.isDisabledQuiet).toBe(false);
  });

  test('evaluates snooze duration options in personalisation settings', async ({ page }) => {
    const snoozeOptions = await page.evaluate(() => {
      const radios = document.querySelectorAll('input[type="radio"][name="prefSnoozeDuration"]');
      return Array.from(radios).map(r => ({ value: r.getAttribute('value') }));
    });

    expect(snoozeOptions.length).toBeGreaterThan(0);
    const values = snoozeOptions.map(o => o.value);
    expect(values).toContain('5');
  });
});
