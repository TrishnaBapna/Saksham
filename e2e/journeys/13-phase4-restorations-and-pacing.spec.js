/**
 * Saksham 3.0 — Phase 4 E2E Test Suite:
 * Restorations, Personalised Difficulty, Games Pacing & Approved Recommendations Verification
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = '/Users/trishnabapna/.gemini/antigravity/brain/896ac3ab-5b28-4b6f-8124-bb51e3f053a0';

async function setupPageAndDismissAlarms(page, persona = null) {
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

test.describe('Saksham 3.0 Phase 4 — Restorations & Improvements', () => {

  test('1. [PART A] Restores all 6 core patient tabs across Parkinson\'s, Alzheimer\'s, Dementia and Other', async ({ page }) => {
    // 1.1 Test Parkinson's (Kalyani ji)
    await setupPageAndDismissAlarms(page, {
      id: 'synthetic_senior_kalyani_001',
      name: 'Kalyani',
      role: 'patient',
      dob: '1958-05-15',
      condition: 'parkinsons'
    });

    // Collect visible desktop tabs
    const desktopTabs = page.locator('#nav-patient button.nav-tab-btn');
    const parkinsonsTabKeys = [];
    const count = await desktopTabs.count();
    for (let i = 0; i < count; i++) {
      const btn = desktopTabs.nth(i);
      if (await btn.isVisible()) {
        parkinsonsTabKeys.push(await btn.getAttribute('data-tab'));
      }
    }

    expect(parkinsonsTabKeys).toEqual(['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub']);

    // Verify Loved Ones (vault) is clickable and opens for Parkinson's
    const vaultTabBtn = page.locator('#nav-patient button[data-tab="vault"]');
    await vaultTabBtn.click();
    await expect(page.locator('#view-vault')).toBeVisible();

    // Take screenshot of Parkinson's desktop nav with all 6 tabs
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_phase4_parkinsons_all_tabs.png') });

    // 1.2 Test Alzheimer's profile
    await page.evaluate(() => {
      localStorage.setItem('saksham_active_user', JSON.stringify({
        id: 'synthetic_alzheimers_user_002',
        name: 'Meera ji',
        role: 'patient',
        dob: '1954-03-20',
        condition: 'alzheimers'
      }));
      if (typeof window.switchTab === 'function') window.switchTab('routine');
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      const modal = document.getElementById('alarmModal');
      if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
    });

    const alzheimerTabKeys = [];
    const countAlz = await desktopTabs.count();
    for (let i = 0; i < countAlz; i++) {
      const btn = desktopTabs.nth(i);
      if (await btn.isVisible()) {
        alzheimerTabKeys.push(await btn.getAttribute('data-tab'));
      }
    }
    expect(alzheimerTabKeys).toEqual(['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub']);

    // Verify Movement tab is clickable and opens for Alzheimer's
    const movementTabBtn = page.locator('#nav-patient button[data-tab="movement"]');
    await movementTabBtn.click();
    await expect(page.locator('#view-movement')).toBeVisible();

    // 1.3 Test Other condition profile
    await page.evaluate(() => {
      localStorage.setItem('saksham_active_user', JSON.stringify({
        id: 'synthetic_other_user_003',
        name: 'Dev',
        role: 'patient',
        dob: '1962-11-10',
        condition: 'other'
      }));
      if (typeof window.switchTab === 'function') window.switchTab('routine');
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      const modal = document.getElementById('alarmModal');
      if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
    });

    const otherTabKeys = [];
    const countOther = await desktopTabs.count();
    for (let i = 0; i < countOther; i++) {
      const btn = desktopTabs.nth(i);
      if (await btn.isVisible()) {
        otherTabKeys.push(await btn.getAttribute('data-tab'));
      }
    }
    expect(otherTabKeys).toEqual(['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub']);
  });

  test('2. [PART B] Verifies Parkinson\'s mobile bottom nav slot 1 is Routines', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupPageAndDismissAlarms(page, {
      id: 'synthetic_senior_kalyani_001',
      name: 'Kalyani',
      role: 'patient',
      dob: '1958-05-15',
      condition: 'parkinsons'
    });

    const firstMobNavBtn = page.locator('#mobile-bottom-nav .mob-nav-item').first();
    await expect(firstMobNavBtn).toBeVisible();

    const firstId = await firstMobNavBtn.getAttribute('id');
    const firstText = (await firstMobNavBtn.textContent()).trim();

    expect(firstId).toBe('mob-nav-routine');
    expect(firstText).toContain('Routines');

    // Screenshot of restored mobile bottom nav
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_phase4_parkinsons_mobile_nav.png') });
  });

  test('3. [PART C] Integrates Personalised Difficulty into Subtab 1 (Memory Cues)', async ({ page }) => {
    await setupPageAndDismissAlarms(page);

    // Verify Subtab 1 is visible
    const cuesView = page.locator('#routine-miniview-cues');
    await expect(cuesView).toBeVisible();

    // Verify accessible "Having trouble with this task?" trigger is present
    const troubleBtn = cuesView.locator('button:has-text("Having trouble with this task?")');
    await expect(troubleBtn).toBeVisible();

    // Click "Having trouble with this task?"
    await troubleBtn.click();

    // Verify difficulty modal opens
    const modal = page.locator('#modalTaskDifficulty');
    await expect(modal).toBeVisible();

    // Fill difficulty form with valid option values
    await page.selectOption('#taskDifficultyCategory', 'buttons_hard_to_tap');
    await page.selectOption('#taskDifficultyAssistance', 'larger_controls');
    await page.fill('#taskDifficultyNotes', 'Morning hand tremors made tapping smaller buttons hard');

    // Submit form
    await page.click('#modalTaskDifficulty button[type="submit"]');

    // Modal closes
    await expect(modal).toBeHidden();

    // Status indicator shows in Subtab 1
    const statusBox = cuesView.locator('text=Difficulty report recorded');
    await expect(statusBox).toBeVisible();

    // Verify attemptsLeft is preserved (not reset or broken)
    const heartsDisplay = page.locator('#cueHeartsDisplay');
    await expect(heartsDisplay).toBeVisible();
    const heartsText = await heartsDisplay.textContent();
    expect(heartsText).toContain('Left');

    // Screenshot of recorded difficulty in Subtab 1
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_phase4_cue_difficulty_recorded.png') });
  });

  test('4. [PART D] Mind Clinic Games Cognitive Pacing Controls (Calm • Balanced • Agile)', async ({ page }) => {
    await setupPageAndDismissAlarms(page);

    // Navigate to Games view by clicking Desktop Tab
    await page.click('#tab-games');
    const gamesView = page.locator('#view-games');
    await expect(gamesView).toBeVisible();

    // Verify pacing bar is present
    const pacingBar = page.locator('#mindClinicPacingBar');
    await expect(pacingBar).toBeVisible();

    const btnCalm = page.locator('#btnGamePacingCalm');
    const btnBalanced = page.locator('#btnGamePacingBalanced');
    const btnAgile = page.locator('#btnGamePacingAgile');

    await expect(btnCalm).toBeVisible();
    await expect(btnBalanced).toBeVisible();
    await expect(btnAgile).toBeVisible();

    // Default pacing should be balanced
    expect(await btnBalanced.getAttribute('aria-pressed')).toBe('true');

    // Switch to Calm Pacing
    await btnCalm.click();
    expect(await btnCalm.getAttribute('aria-pressed')).toBe('true');
    expect(await btnBalanced.getAttribute('aria-pressed')).toBe('false');

    // Verify description updated
    const desc = page.locator('#gamePacingDescription');
    await expect(desc).toContainText('Calm');

    // Verify Game 1 reflects calm pacing (2 pulses)
    await page.click('#minigame-tab-1');
    await page.click('button:has-text("Start Sequence Pulse")');
    const game1Display = page.locator('#game1Display');
    await expect(game1Display).toContainText('Watch 2 Pulses');

    // Switch to Game 3 (Finger Tap) and verify calm goal (5 taps)
    await page.click('#minigame-tab-3');
    const game3Count = page.locator('#game3Count');
    await expect(game3Count).toContainText('/ 5');

    // Switch to Balanced pacing and verify goal updates to 10
    await btnBalanced.click();
    await expect(game3Count).toContainText('/ 10');

    // Screenshot of Mind Clinic Pacing Controls
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_phase4_games_pacing_selector.png') });
  });

  test('5. [PART E: REC-3.0-202602] Floating Companion Emotion Buttons meet WCAG 44px min hit-target', async ({ page }) => {
    await setupPageAndDismissAlarms(page);

    // Open floating companion toolbar
    const avatarBtn = page.locator('#btnFloatingCompanionAvatar');
    await avatarBtn.click();

    const toolbar = page.locator('#companionQuickToolbar');
    await expect(toolbar).toBeVisible();

    // Check all buttons in toolbar
    const buttons = toolbar.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(6);

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const box = await btn.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }

    // Screenshot of enlarged companion buttons
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_phase4_companion_enlarged_buttons.png') });
  });

  test('6. [PART E: REC-3.0-202601] Fine-motor dressing routine decomposes into 3 guided micro-steps', async ({ page }) => {
    await setupPageAndDismissAlarms(page);

    // Open task runner for Task 3 ("Buttoning Shirt & Morning Dressing")
    await page.evaluate(() => {
      if (typeof window.openTaskRunner === 'function') {
        window.openTaskRunner(3);
      }
    });

    const runnerModal = page.locator('#modalTaskRunner');
    await expect(runnerModal).toBeVisible();

    const stepsContainer = page.locator('#runnerStepsContainer');
    const steps = stepsContainer.locator('div.flex.items-center');
    const stepCount = await steps.count();

    expect(stepCount).toBe(3);

    // Verify step text contains micro-step guidance
    const step1Text = await steps.nth(0).textContent();
    const step2Text = await steps.nth(1).textContent();
    const step3Text = await steps.nth(2).textContent();

    expect(step1Text).toContain('Prepare & Relax Fingers');
    expect(step2Text).toContain('Fasten Bottom-Up');
    expect(step3Text).toContain('Final Comfort & Posture Check');

    // Screenshot of 3 micro-steps in guided runner
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_phase4_decomposed_dressing_steps.png') });
  });

  test('7. [PART E: REC-3.0-202605] Persists active routine subtab preference across page reloads', async ({ page }) => {
    await setupPageAndDismissAlarms(page);

    // Switch to Direct Checklist subtab
    const directTabBtn = page.locator('#mini-tab-direct');
    await directTabBtn.click();
    await expect(page.locator('#routine-miniview-direct')).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Dismiss any alarm on reload
    await page.evaluate(() => {
      const modal = document.getElementById('alarmModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none';
      }
      document.body.style.overflow = '';
    });

    // Verify Direct Checklist is STILL active!
    await expect(page.locator('#routine-miniview-direct')).toBeVisible();
    await expect(page.locator('#routine-miniview-cues')).toBeHidden();
  });

  test('8. [SECURITY INVARIANT] Caregiver PIN verification is strictly enforced without grace period bypass', async ({ page }) => {
    await setupPageAndDismissAlarms(page);

    // Trigger role security gate for caregiver
    await page.evaluate(() => {
      if (typeof window.requestRoleLogin === 'function') {
        window.requestRoleLogin('caregiver');
      }
    });

    // Prompt for PIN must appear
    const pinModal = page.locator('#modalRoleSecurityGate');
    await expect(pinModal).toBeVisible();

    // Verify role did NOT switch to caregiver before entering PIN
    const activeRole = await page.evaluate(() => localStorage.getItem('saksham_user_role'));
    expect(activeRole).toBe('patient');
  });

});
