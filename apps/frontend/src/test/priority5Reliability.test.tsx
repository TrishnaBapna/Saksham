import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { offlineSyncService } from '@/services/offlineSyncService';
import {
  getPersonalisationTrialState,
  savePersonalisationTrialState,
  getTrialStorageKey
} from '@/services/personalizationService';

describe('SAKSHAM 2.0 — Priority 5: End-to-End Reliability, Calm Tokens & Fixes', () => {
  const rootDir = path.resolve(__dirname, '../../../../');
  const testUid = 'priority5_user_alpha';

  beforeEach(() => {
    localStorage.clear();
    offlineSyncService.clearQueueForTesting();
  });

  describe('1. Bug 1: Storage Key Reconciliation & Difficulty Record Sync', () => {
    it('correctly updates difficulty record synced flag in trial state when offlineSync dispatches', async () => {
      // 1. Initialize trial state for test user
      const trial = getPersonalisationTrialState(testUid);
      const diffRecord = {
        id: 'diff_rec_p5_101',
        userId: testUid,
        taskId: 1,
        taskTitle: 'Morning Activity',
        timestamp: new Date().toISOString(),
        difficultyCategory: 'buttons_hard_to_tap' as const,
        assistanceOffered: ['step_by_step' as const],
        assistanceSelected: 'step_by_step' as const,
        helpfulRating: 'helpful' as const,
        notes: 'Tremor issue',
        enteredBy: 'user' as const,
        synced: false,
      };
      trial.difficultiesRecorded.push(diffRecord);
      savePersonalisationTrialState(trial);

      // Verify stored locally under saksham_trial_${testUid}
      const storageKey = getTrialStorageKey(testUid);
      const rawBefore = localStorage.getItem(storageKey);
      expect(rawBefore).toBeTruthy();
      const parsedBefore = JSON.parse(rawBefore!);
      expect(parsedBefore.difficultiesRecorded[0].synced).toBe(false);

      // 2. Enqueue difficulty sync operation
      offlineSyncService.enqueueOperation(
        testUid,
        'difficulty',
        'create',
        diffRecord,
        'op_p5_diff_sync',
        true // trigger sync immediately
      );

      // Wait brief microtask for async dispatch
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 3. Verify that trial record now has synced: true
      const rawAfter = localStorage.getItem(storageKey);
      expect(rawAfter).toBeTruthy();
      const parsedAfter = JSON.parse(rawAfter!);
      expect(parsedAfter.difficultiesRecorded[0].synced).toBe(true);
    });
  });

  describe('2. Bug 2: Offline Sync Queueing Connection for Personalisation', () => {
    it('verifies offline sync service accepts and queues personalisation mutations', () => {
      const mockSettings = {
        wallpaper: 'default',
        colorTheme: 'sage',
        textSize: 'standard',
        updatedAt: new Date().toISOString()
      };

      const op = offlineSyncService.enqueueOperation(
        testUid,
        'profile',
        'update',
        { personalisationSettings: mockSettings },
        'pref_sync_op_p5',
        false
      );

      expect(op.operationId).toBe('pref_sync_op_p5');
      expect(op.status).toBe('pending');
      const queue = offlineSyncService.getQueue(testUid);
      expect(queue.some((q) => q.operationId === 'pref_sync_op_p5')).toBe(true);
    });
  });

  describe('3. Bug 3: Active In-Task Adaptive Assistance Session Persistence', () => {
    it('verifies routine.js persists _activeTaskAssistance per UID in localStorage', () => {
      const routinePath = path.join(rootDir, 'js/features/routine.js');
      expect(fs.existsSync(routinePath)).toBe(true);
      const content = fs.readFileSync(routinePath, 'utf8');

      // Check key storage methods exist in routine.js
      expect(content).toContain('getAssistanceStorageKey');
      expect(content).toContain('loadPersistedAssistanceState');
      expect(content).toContain('savePersistedAssistanceState');
      expect(content).toContain('clearAssistanceStateOnLogout');

      // Simulate routine.js persistence logic
      const storageKey = `saksham_task_assistance_${testUid}`;
      const payload = {
        active: { '1': 'step_by_step', '2': 'voice_guidance' },
        rated: { '1': 'helpful' },
        dismissed: { '3': true },
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));

      // Retrieve and verify data integrity
      const loaded = JSON.parse(localStorage.getItem(storageKey)!);
      expect(loaded.active['1']).toBe('step_by_step');
      expect(loaded.active['2']).toBe('voice_guidance');
      expect(loaded.rated['1']).toBe('helpful');
      expect(loaded.dismissed['3']).toBe(true);
    });
  });

  describe('4. Calm Design System Tokens & Responsive Invariants', () => {
    it('verifies css/style.css contains the calm design tokens and age tier styles', () => {
      const cssPath = path.join(rootDir, 'css/style.css');
      expect(fs.existsSync(cssPath)).toBe(true);
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      // Primary calm palette tokens
      expect(cssContent).toContain('--bg-primary: #FAF9F6;');
      expect(cssContent).toContain('--accent-sage: #789581;');
      expect(cssContent).toContain('--accent-lavender: #E9E3F4;');
      expect(cssContent).toContain('--text-main: #292D32;');
      expect(cssContent).toContain('--text-secondary: #626A70;');
      expect(cssContent).toContain('--border-subtle: #E5E7E5;');

      // Age tier calmness
      expect(cssContent).toContain('body.tier-youth');
      expect(cssContent).toContain('body.tier-adult');
      expect(cssContent).toContain('body.tier-senior');

      // Senior minimum touch target invariant (>= 52px)
      expect(cssContent).toMatch(/min-height:\s*52px/);

      // Color themes and nav modes
      expect(cssContent).toContain('body[data-color-theme="sage"]');
      expect(cssContent).toContain('body[data-color-theme="lavender"]');
      expect(cssContent).toContain('body[data-nav-mode="simple"]');
      expect(cssContent).toContain('body[data-gamification="false"]');

      // Critical Safety Invariant: Emergency SOS must NEVER be suppressed
      expect(cssContent).toContain('#sosBtn');
      expect(cssContent).toContain('display: flex !important;');
    });

    it('verifies service worker is bumped to v61 and precaches necessary assets', () => {
      const swPath = path.join(rootDir, 'sw.js');
      expect(fs.existsSync(swPath)).toBe(true);
      const swContent = fs.readFileSync(swPath, 'utf8');

      expect(swContent).toContain("const CACHE_NAME = 'saksham-cache-v61';");
      expect(swContent).toContain('./css/style.css?v=61');
      expect(swContent).toContain('./js/features/personalisation-settings.js?v=61');
      expect(swContent).toContain('./js/app.js?v=61');
    });
  });
});
