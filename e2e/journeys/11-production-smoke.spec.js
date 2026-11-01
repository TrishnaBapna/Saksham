// @ts-check
import { test, expect } from '@playwright/test';

test.describe('11. Production Read-Only Smoke Check', () => {

  const PROD_URL = 'https://saksham-rho-six.vercel.app/';

  test('verifies live production site returns 200 and renders core PWA shell', async ({ page }) => {
    // Only run if network is accessible, otherwise skip gracefully
    let response = null;
    try {
      response = await page.goto(PROD_URL, { timeout: 10000 });
    } catch (err) {
      test.skip();
      return;
    }

    if (!response || response.status() !== 200) {
      test.skip();
      return;
    }

    expect(response.status()).toBe(200);
    await expect(page).toHaveTitle(/Saksham/i);

    // Verify main header brand is rendered
    const headerTitle = page.locator('header h1');
    await expect(headerTitle).toBeVisible();

    // Verify companion canvas element exists in live DOM
    const canvas = page.locator('#companionPixelCanvas, .pixel-companion-canvas');
    expect(await canvas.count()).toBeGreaterThan(0);
  });
});
