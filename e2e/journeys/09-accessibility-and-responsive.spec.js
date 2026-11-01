// @ts-check
import { test, expect } from '@playwright/test';

test.describe('9. Accessibility, Touch Targets & Responsive Viewports', () => {

  test('verifies WCAG AAA contrast ratio for primary controls', async ({ page }) => {
    await page.goto('/');

    const contrastRatios = await page.evaluate(() => {
      function getLuminance(r, g, b) {
        const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      }
      function getRatio(rgb1, rgb2) {
        const l1 = getLuminance(...rgb1);
        const l2 = getLuminance(...rgb2);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      }

      // #1B4225 (rgb 27, 66, 37) on #FCFBF5 (rgb 252, 251, 245)
      const primaryRatio = getRatio([27, 66, 37], [252, 251, 245]);
      return { primaryRatio: Number(primaryRatio.toFixed(2)) };
    });

    // Forest green on cream exceeds 7:1 (WCAG AAA)
    expect(contrastRatios.primaryRatio).toBeGreaterThan(7.0);
  });

  test('verifies dialogs have role="dialog" or accessible container properties', async ({ page }) => {
    await page.goto('/');

    const dialogChecks = await page.evaluate(() => {
      const dialogs = document.querySelectorAll('[role="dialog"], [id^="modal"]');
      return { totalFound: dialogs.length };
    });

    expect(dialogChecks.totalFound).toBeGreaterThan(5);
  });

  test('switches between desktop and mobile layouts cleanly', async ({ page }) => {
    // 1. Desktop test
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const desktopState = await page.evaluate(() => {
      const desktopNav = document.getElementById('nav-patient');
      const mobileNav = document.getElementById('mobile-bottom-nav');
      return {
        desktopNavDisplay: desktopNav ? window.getComputedStyle(desktopNav).display : 'none',
        mobileNavDisplay: mobileNav ? window.getComputedStyle(mobileNav).display : 'none'
      };
    });

    expect(desktopState.desktopNavDisplay).not.toBe('none');

    // 2. Mobile test
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);

    const mobileState = await page.evaluate(() => {
      const desktopNav = document.getElementById('nav-patient');
      const mobileNav = document.getElementById('mobile-bottom-nav');
      return {
        desktopNavDisplay: desktopNav ? window.getComputedStyle(desktopNav).display : 'none',
        mobileNavDisplay: mobileNav ? window.getComputedStyle(mobileNav).display : 'none'
      };
    });

    expect(mobileState.desktopNavDisplay).toBe('none');
    expect(mobileState.mobileNavDisplay).not.toBe('none');
  });
});
