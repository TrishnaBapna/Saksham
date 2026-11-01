/**
 * Playwright E2E Suite: Saksham 3.0 Phase 3 — Continuous Telemetry & Quality Engine Dashboard
 * Verifies internal dashboard rendering, KPI metrics, tab transitions, status persistence,
 * and strict privacy invariants.
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = '/Users/trishnabapna/.gemini/antigravity/brain/896ac3ab-5b28-4b6f-8124-bb51e3f053a0';

test.describe('Saksham 3.0 — Continuous Telemetry & Quality Engine Dashboard', () => {

  test('loads internal QA dashboard and validates KPIs and privacy boundary', async ({ page }) => {
    await page.goto('/qa-engine/dashboard/index.html');
    await page.waitForLoadState('domcontentloaded');

    // Title and Header
    await expect(page.locator('h1.brand-title')).toContainText('Saksham 3.0 Telemetry & Quality Engine');
    await expect(page.locator('.brand-badge')).toHaveText('Internal QA');

    // Strict Privacy Invariant: DOM must contain synthetic indicator
    const privacyPill = page.locator('text=Zero Patient PII • Synthetic Test Personas Only');
    await expect(privacyPill).toBeVisible();

    // Verify KPI numbers are populated
    const qualityScore = page.locator('#kpiQualityScore');
    await expect(qualityScore).toBeVisible();
    const scoreText = await qualityScore.textContent();
    expect(scoreText).toMatch(/\d+\s*\/\s*100/);

    const a11yScore = page.locator('#kpiA11yCompliance');
    await expect(a11yScore).toBeVisible();
    expect(await a11yScore.textContent()).toMatch(/\d+%/);

    const activeFriction = page.locator('#kpiActiveFriction');
    await expect(activeFriction).toBeVisible();
    expect(Number(await activeFriction.textContent())).toBeGreaterThan(0);

    // Capture Desktop Dashboard Screenshot
    const screenshotPath = path.join(ARTIFACTS_DIR, 'screenshot_phase3_dashboard_desktop.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
  });

  test('verifies recommendation card structure, type filtering, and status persistence', async ({ page }) => {
    await page.goto('/qa-engine/dashboard/index.html');
    await page.waitForLoadState('domcontentloaded');

    // Check that recommendations are loaded
    const recCards = page.locator('.rec-card');
    await expect(recCards.first()).toBeVisible();
    const count = await recCards.count();
    expect(count).toBeGreaterThanOrEqual(4);

    // Verify presence of structured types (FIX, SIMPLIFY, IMPROVE)
    await expect(page.locator('.badge-fix').first()).toBeVisible();
    await expect(page.locator('.badge-simplify').first()).toBeVisible();
    await expect(page.locator('.badge-improve').first()).toBeVisible();

    // Test Type Filter: select 'FIX'
    await page.selectOption('#filterRecType', 'FIX');
    const fixCards = page.locator('.rec-card');
    const fixCount = await fixCards.count();
    expect(fixCount).toBeGreaterThanOrEqual(1);
    await expect(fixCards.first().locator('.badge-fix')).toBeVisible();

    // Reset filter to ALL
    await page.selectOption('#filterRecType', 'ALL');

    // Test Status Change: Change first recommendation status to "Approved"
    const firstStatusSelect = page.locator('.status-dropdown').first();
    await firstStatusSelect.selectOption('Approved');

    // Verify Toast message
    const toast = page.locator('#dashboardToast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Approved');

    // Reload page to verify localStorage persistence
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const reloadedFirstSelect = page.locator('.status-dropdown').first();
    await expect(reloadedFirstSelect).toHaveValue('Approved');
  });

  test('navigates through all analysis tabs and verifies content integrity', async ({ page }) => {
    await page.goto('/qa-engine/dashboard/index.html');
    await page.waitForLoadState('domcontentloaded');

    // 1. Friction Points tab
    await page.click('button[data-target="panel-friction"]');
    await expect(page.locator('#panel-friction')).toHaveClass(/active/);
    const frictionRows = page.locator('#frictionPointsTableBody tr');
    expect(await frictionRows.count()).toBeGreaterThanOrEqual(4);

    // 2. Persona Telemetry tab
    await page.click('button[data-target="panel-personas"]');
    await expect(page.locator('#panel-personas')).toHaveClass(/active/);
    await expect(page.locator('#panel-personas').getByText('Kalyani ji', { exact: true })).toBeVisible();
    await expect(page.locator('#panel-personas').getByText('Aarav', { exact: true })).toBeVisible();
    await expect(page.locator('#panel-personas').getByText('Sunita Sharma', { exact: true })).toBeVisible();

    // 3. Journey Performance tab
    await page.click('button[data-target="panel-journeys"]');
    await expect(page.locator('#panel-journeys')).toHaveClass(/active/);
    await expect(page.locator('text=Daily Routine & Assisted Cues')).toBeVisible();

    // 4. Accessibility tab
    await page.click('button[data-target="panel-a11y"]');
    await expect(page.locator('#panel-a11y')).toHaveClass(/active/);
    await expect(page.locator('text=WCAG 2.5.5 / 2.5.8 Touch Target Size')).toBeVisible();

    // 5. Historical Comparison tab
    await page.click('button[data-target="panel-history"]');
    await expect(page.locator('#panel-history')).toHaveClass(/active/);
    await expect(page.locator('text=Run #103 (Phase 3 Engine - Current)')).toBeVisible();

    // 6. Raw Synthetic Events tab
    await page.click('button[data-target="panel-events"]');
    await expect(page.locator('#panel-events')).toHaveClass(/active/);
    const eventRows = page.locator('#rawEventsTableBody tr');
    expect(await eventRows.count()).toBeGreaterThan(5);
  });

  test('renders cleanly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/qa-engine/dashboard/index.html');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1.brand-title')).toBeVisible();
    await expect(page.locator('.kpi-card').first()).toBeVisible();

    // Capture Mobile Dashboard Screenshot
    const mobileScreenshotPath = path.join(ARTIFACTS_DIR, 'screenshot_phase3_dashboard_mobile.png');
    await page.screenshot({ path: mobileScreenshotPath, fullPage: true });
  });

});
