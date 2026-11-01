// @ts-check
import { test, expect } from '@playwright/test';
import { SYNTHETIC_PERSONAS } from '../fixtures/synthetic-personas.js';

test.describe('5. Memory Vault & Cognitive Mini-Games', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((persona) => {
      localStorage.setItem('saksham_user_role', 'patient');
      localStorage.setItem('saksham_active_uid', persona.uid);
      const userObj = { name: persona.displayName, role: 'patient', condition: 'dementia' };
      localStorage.setItem('saksham_active_user', JSON.stringify(userObj));
      if (typeof window.applyRolePermissions === 'function') {
        window.applyRolePermissions('patient', userObj);
      }
    }, SYNTHETIC_PERSONAS.kalyani);
  });

  test('navigates to Loved Ones Memory Vault and verifies photo cards', async ({ page }) => {
    const vaultState = await page.evaluate(() => {
      if (typeof window.switchTab === 'function') {
        window.switchTab('vault');
      }
      const vaultSection = document.getElementById('view-vault');
      const cards = document.querySelectorAll('#lovedOnesContainer, #faceQuizPhoto, [onclick*="openLiveFaceScanModal"]');
      return {
        tabActive: vaultSection ? !vaultSection.classList.contains('hidden') : false,
        cardsCount: cards.length
      };
    });

    expect(vaultState.tabActive).toBe(true);
    expect(vaultState.cardsCount).toBeGreaterThan(0);
  });

  test('verifies "Who is this?" blurred photo assisted recall challenge', async ({ page }) => {
    const quizState = await page.evaluate(() => {
      if (typeof window.switchTab === 'function') {
        window.switchTab('vault');
      }
      const revealBtn = document.querySelector('[onclick*="revealFaceRelation"], button.btn-reveal, #view-vault button');
      return { hasRevealMechanism: !!revealBtn };
    });

    expect(quizState.hasRevealMechanism).toBe(true);
  });

  test('navigates to Mind Clinic Games and verifies cognitive activities', async ({ page }) => {
    const gamesState = await page.evaluate(() => {
      if (typeof window.switchTab === 'function') {
        window.switchTab('games');
      }
      const gamesSection = document.getElementById('view-games');
      const cardGame = document.querySelector('[onclick*="card"], [data-game="cards"]');
      const seqGame = document.querySelector('[onclick*="Sequence"], [data-game="sequence"]');
      return {
        tabActive: gamesSection ? !gamesSection.classList.contains('hidden') : false,
        hasCardGame: !!cardGame,
        hasSequenceGame: !!seqGame
      };
    });

    expect(gamesState.tabActive).toBe(true);
    expect(gamesState.hasCardGame || gamesState.hasSequenceGame).toBe(true);
  });
});
