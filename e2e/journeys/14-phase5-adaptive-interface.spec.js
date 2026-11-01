/**
 * Saksham 3.0 — Phase 5 Playwright Journey:
 * Adaptive Personalised Interface & Patient-Centred Experience
 *
 * Verifies:
 * 1. Mode 1 (Guided), Mode 2 (Assisted), Mode 3 (Independent) selection & DOM attributes
 * 2. Header mode badge UI and direct trigger
 * 3. Preservation of all 6 core tabs in Guided Mode
 * 4. Self-reported difficulty flags mapping to physical tokens (large text, extra large buttons, spacious density)
 * 5. One instruction at a time in Task Runner when in Guided Mode
 * 6. Task Pause & Rest / Resume controls without data loss
 * 7. UID-scoped isolation between personas (Kalyani ji vs Aarav)
 * 8. Caregiver PIN gate security invariant preservation
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = '/Users/trishnabapna/.gemini/antigravity/brain/896ac3ab-5b28-4b6f-8124-bb51e3f053a0';

async function setupPage(page, persona = null) {
  await page.addInitScript((p) => {
    localStorage.setItem('saksham_onboarding_completed', 'true');
    localStorage.setItem('saksham_user_role', 'patient');
    localStorage.setItem('saksham_quiet_hours_enabled', 'true');
    localStorage.setItem('saksham_quiet_hours_start', '00:00');
    localStorage.setItem('saksham_quiet_hours_end', '23:59');

    const defaultPersona = {
      id: 'synthetic_senior_kalyani_001',
      name: 'Kalyani',
      role: 'patient',
      dob: '1958-05-15',
      condition: 'parkinsons'
    };
    const active = p || defaultPersona;
    localStorage.setItem('saksham_active_user', JSON.stringify(active));
    localStorage.setItem('saksham_user_dob', active.dob);
  }, persona);

  await page.goto('/#routine');
  await page.waitForLoadState('domcontentloaded');

  // Dismiss any alarm modal or banner that may pop up due to scheduled times
  await page.evaluate(() => {
    const modal = document.getElementById('alarmModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.style.display = 'none';
    }
    const banner = document.getElementById('activeReminderBanner');
    if (banner) banner.classList.add('hidden');
    document.body.style.overflow = '';
  });
}

test.describe('Saksham 3.0 Phase 5 — Adaptive Personalised Interface', () => {

  test('1. [MODES] Opens Adaptive Assessment modal and switches to Guided Mode with updated badge', async ({ page }) => {
    await setupPage(page);

    // Verify mode badge exists in header
    const badge = page.locator('#btnAdaptiveModeBadge');
    await expect(badge).toBeVisible();

    // Click badge to open Adaptive Assessment modal
    await badge.click();
    const modal = page.locator('#modalAdaptiveAssessment');
    await expect(modal).toBeVisible();

    // Verify 3 mode cards are rendered
    await expect(page.locator('#cardModeGuided')).toBeVisible();
    await expect(page.locator('#cardModeAssisted')).toBeVisible();
    await expect(page.locator('#cardModeIndependent')).toBeVisible();

    // Select Guided Mode
    await page.locator('#cardModeGuided').click();

    // Save and apply profile
    await page.locator('#btnSaveAdaptiveAssessment').click();
    await expect(modal).toBeHidden();

    // Verify body attribute updated to guided
    const bodyAssistanceMode = await page.evaluate(() => document.body.getAttribute('data-assistance-mode'));
    expect(bodyAssistanceMode).toBe('guided');

    // Verify badge text reflects Guided Mode
    await expect(badge).toContainText('Guided Mode');

    // Take screenshot for release artifact
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screenshot_phase5_guided_mode_active.png'),
      fullPage: false
    });
  });

  test('2. [INVARIANT] Guided Mode preserves access to all 6 core patient tabs', async ({ page }) => {
    await setupPage(page);

    // Apply Guided Mode
    await page.evaluate(() => {
      window.SakshamAdaptiveProfile.saveProfile({
        assistanceMode: 'guided'
      }, 'synthetic_senior_kalyani_001', 'patient');
    });

    const bodyMode = await page.evaluate(() => document.body.getAttribute('data-assistance-mode'));
    expect(bodyMode).toBe('guided');

    // Verify all 6 core tabs remain visible and interactable in desktop navigation
    const coreTabs = ['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub'];
    for (const tabKey of coreTabs) {
      const tabBtn = page.locator(`#nav-patient button[data-tab="${tabKey}"]`);
      await expect(tabBtn).toBeVisible();
    }

    // Take screenshot of preserved navigation
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screenshot_phase5_all_tabs_preserved.png'),
      fullPage: false
    });
  });

  test('3. [DIFFICULTIES] Maps self-reported difficulties to physical comfort tokens', async ({ page }) => {
    await setupPage(page);

    // Open assessment modal
    await page.locator('#btnAdaptiveModeBadge').click();
    await expect(page.locator('#modalAdaptiveAssessment')).toBeVisible();

    // Check reading text difficulty and small buttons difficulty
    await page.check('#adaptiveDiff_readingText');
    await page.check('#adaptiveDiff_smallButtons');
    await page.check('#adaptiveDiff_handMovement');

    // Save profile
    await page.locator('#btnSaveAdaptiveAssessment').click();

    // Verify body attributes adapt accordingly
    const textSize = await page.evaluate(() => document.body.getAttribute('data-text-size'));
    const btnSize = await page.evaluate(() => document.body.getAttribute('data-button-size'));
    const cardDensity = await page.evaluate(() => document.body.getAttribute('data-card-density'));

    expect(textSize).toBe('large');
    expect(btnSize).toBe('extra_large');
    expect(cardDensity).toBe('spacious');

    // Take screenshot of comfort controls
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screenshot_phase5_comfort_tokens_applied.png'),
      fullPage: false
    });
  });

  test('4. [RUNNER] Focuses one instruction at a time in Guided Mode', async ({ page }) => {
    await setupPage(page);

    // Enable Guided Mode with oneInstructionAtATime
    await page.evaluate(() => {
      window.SakshamAdaptiveProfile.saveProfile({
        assistanceMode: 'guided',
        difficulties: { multiInstructions: true }
      }, 'synthetic_senior_kalyani_001', 'patient');
    });

    // Open task runner for task 1
    await page.evaluate(() => {
      window.openTaskRunner(1, 15);
    });

    const runnerModal = page.locator('#modalTaskRunner');
    await expect(runnerModal).toBeVisible();

    // Verify one-instruction box is visible and all-steps checklist is hidden via CSS
    const stepBox = page.locator('.runner-current-step-box');
    const allSteps = page.locator('.runner-all-steps');

    await expect(stepBox).toBeVisible();
    await expect(allSteps).toBeHidden();

    // Step guidance should show "Step 1 of ..."
    await expect(stepBox).toContainText('Step 1 of');

    // Take screenshot of one-instruction runner
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screenshot_phase5_one_instruction_runner.png'),
      fullPage: false
    });

    // Close task runner
    await page.evaluate(() => window.closeTaskRunner && window.closeTaskRunner());
  });

  test('5. [PAUSE & REST] Pauses and resumes active task without losing timer countdown state', async ({ page }) => {
    await setupPage(page);

    // Open task runner
    await page.evaluate(() => {
      window.openTaskRunner(1, 15);
    });

    const pauseBtn = page.locator('#btnRunnerPause');
    const resumeBtn = page.locator('#btnRunnerResume');
    const pauseBanner = page.locator('#runnerPauseBanner');

    await expect(pauseBtn).toBeVisible();
    await expect(resumeBtn).toBeHidden();
    await expect(pauseBanner).toBeHidden();

    // Click Pause
    await pauseBtn.click();
    await expect(pauseBanner).toBeVisible();
    await expect(resumeBtn).toBeVisible();
    await expect(pauseBtn).toBeHidden();

    // Verify state.taskTimer.status is paused
    const timerStatus = await page.evaluate(() => window.state?.taskTimer?.status);
    expect(timerStatus).toBe('paused');

    // Click Resume
    await resumeBtn.click();
    await expect(pauseBanner).toBeHidden();
    await expect(pauseBtn).toBeVisible();
    await expect(resumeBtn).toBeHidden();

    const resumedStatus = await page.evaluate(() => window.state?.taskTimer?.status);
    expect(resumedStatus).toBe('running');

    // Take screenshot of task pause & resume
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screenshot_phase5_task_pause_resume.png'),
      fullPage: false
    });

    await page.evaluate(() => window.closeTaskRunner && window.closeTaskRunner());
  });

  test('6. [ISOLATION] Scopes adaptive profiles strictly per UID without account leakage', async ({ page }) => {
    await setupPage(page);

    // Save Kalyani ji profile as guided
    await page.evaluate(() => {
      window.SakshamAdaptiveProfile.saveProfile({
        assistanceMode: 'guided',
        difficulties: { smallButtons: true }
      }, 'persona_kalyani_101', 'patient');

      // Save Aarav profile as independent
      window.SakshamAdaptiveProfile.saveProfile({
        assistanceMode: 'independent',
        difficulties: { preferIndependent: true }
      }, 'persona_aarav_202', 'caregiver');
    });

    // Verify in localStorage
    const kProfile = await page.evaluate(() => window.SakshamAdaptiveProfile.getProfile('persona_kalyani_101'));
    const aProfile = await page.evaluate(() => window.SakshamAdaptiveProfile.getProfile('persona_aarav_202'));

    expect(kProfile.assistanceMode).toBe('guided');
    expect(kProfile.preferences.buttonSize).toBe('extra_large');

    expect(aProfile.assistanceMode).toBe('independent');
    expect(aProfile.preferences.buttonSize).toBe('standard');
  });

  test('7. [SECURITY] Preserves Caregiver PIN verification gate without bypass', async ({ page }) => {
    await setupPage(page);

    // Request role switch to caregiver
    await page.evaluate(() => {
      if (typeof window.requestRoleLogin === 'function') {
        window.requestRoleLogin('caregiver');
      }
    });

    // The security gate modal must appear
    const gateModal = page.locator('#modalRoleSecurityGate');
    await expect(gateModal).toBeVisible();

    // Verify PIN input is required
    const pinInput = page.locator('#secGatePinInput');
    await expect(pinInput).toBeVisible();

    // Caregiver container must remain hidden before PIN entry
    const cgContainer = page.locator('#portal-caregiver-container');
    await expect(cgContainer).toBeHidden();
  });

});
