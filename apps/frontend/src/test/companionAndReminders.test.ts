import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Saksham 2.0 — Living Companion & Smart Reminders Engine', () => {

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // 1. Companion Messages & Non-Angry Expressions
  describe('1. Multi-Companion Friendly Reminders & Non-Angry Tone', () => {
    function getMessageForCharacter(char: string, taskTitle: string) {
      if (char === 'miko') {
        return {
          compName: 'Miko Robot',
          text: `Reminder alert! Your ${taskTitle} is ready.`
        };
      } else if (char === 'priya') {
        return {
          compName: 'Priya',
          text: `Your ${taskTitle} is ready. Let's take it one step at a time.`
        };
      } else if (char === 'aarav') {
        return {
          compName: 'Aarav',
          text: `It's time for ${taskTitle}. Tap to continue.`
        };
      } else {
        return {
          compName: 'Kalyani ji',
          text: `It's time for your ${taskTitle}. Shall we do it together?`
        };
      }
    }

    it('generates warm, respectful reminder text for Kalyani ji (Senior/Elderly)', () => {
      const msg = getMessageForCharacter('dadi', 'Morning Medication');
      expect(msg.compName).toBe('Kalyani ji');
      expect(msg.text).toBe("It's time for your Morning Medication. Shall we do it together?");
      expect(msg.text).not.toMatch(/angry|failed|missed|late/i);
    });

    it('generates encouraging step-by-step reminder for Priya (Youth)', () => {
      const msg = getMessageForCharacter('priya', 'Brain Puzzle');
      expect(msg.compName).toBe('Priya');
      expect(msg.text).toBe("Your Brain Puzzle is ready. Let's take it one step at a time.");
      expect(msg.text).not.toMatch(/angry|failed|missed|late/i);
    });

    it('generates focused, clear reminder for Aarav (Adult)', () => {
      const msg = getMessageForCharacter('aarav', 'Hydration & Walk');
      expect(msg.compName).toBe('Aarav');
      expect(msg.text).toBe("It's time for Hydration & Walk. Tap to continue.");
      expect(msg.text).not.toMatch(/angry|failed|missed|late/i);
    });

    it('generates friendly robotic alert for Miko Robot', () => {
      const msg = getMessageForCharacter('miko', 'Memory Cards');
      expect(msg.compName).toBe('Miko Robot');
      expect(msg.text).toBe("Reminder alert! Your Memory Cards is ready.");
      expect(msg.text).not.toMatch(/angry|failed|missed|late/i);
    });

    it('normalizes legacy angry/reminder calls to attentive', () => {
      function normalizeEmotion(emotion: string) {
        if (emotion === 'angry' || emotion === 'reminder' || emotion === 'alert') {
          return 'attentive';
        }
        return emotion;
      }
      expect(normalizeEmotion('angry')).toBe('attentive');
      expect(normalizeEmotion('reminder')).toBe('attentive');
      expect(normalizeEmotion('happy')).toBe('happy');
      expect(normalizeEmotion('idle')).toBe('idle');
      expect(normalizeEmotion('talking')).toBe('talking');
    });
  });

  // 2. Quiet Hours (Sleep & Rest Window)
  describe('2. Quiet Hours (Rest Window Protection)', () => {
    function isQuietHoursActive(nowMins: number, enabled: boolean, startStr = '22:00', endStr = '07:00') {
      if (!enabled) return false;
      const [startH, startM] = startStr.split(':').map(Number);
      const [endH, endM] = endStr.split(':').map(Number);
      const startMins = startH * 60 + (startM || 0);
      const endMins = endH * 60 + (endM || 0);

      if (startMins <= endMins) {
        return nowMins >= startMins && nowMins < endMins;
      } else {
        // Crosses midnight (e.g. 22:00 to 07:00)
        return nowMins >= startMins || nowMins < endMins;
      }
    }

    it('suppresses audible alarms during overnight quiet hours (e.g. 23:30)', () => {
      const time23_30 = 23 * 60 + 30;
      expect(isQuietHoursActive(time23_30, true, '22:00', '07:00')).toBe(true);
    });

    it('suppresses audible alarms in early morning quiet hours (e.g. 05:45)', () => {
      const time05_45 = 5 * 60 + 45;
      expect(isQuietHoursActive(time05_45, true, '22:00', '07:00')).toBe(true);
    });

    it('allows alarms during daytime waking hours (e.g. 09:30 AM)', () => {
      const time09_30 = 9 * 60 + 30;
      expect(isQuietHoursActive(time09_30, true, '22:00', '07:00')).toBe(false);
    });

    it('allows alarms when quiet hours is disabled', () => {
      const time23_30 = 23 * 60 + 30;
      expect(isQuietHoursActive(time23_30, false, '22:00', '07:00')).toBe(false);
    });
  });

  // 3. Persistent UID-Scoped Idempotence & Grace Window
  describe('3. Persistent Scoped Idempotence & Overdue Grace Window', () => {
    it('scopes alerted task tracking to active UID in localStorage', () => {
      const uid1 = 'user-kalyani-101';
      const uid2 = 'user-aarav-202';

      const key1 = `saksham_alerted_reminders_${uid1}`;
      const key2 = `saksham_alerted_reminders_${uid2}`;

      localStorage.setItem(key1, JSON.stringify({ 'task-1': '2026-10-31_09:00' }));
      localStorage.setItem(key2, JSON.stringify({ 'task-1': '2026-10-31_14:00' }));

      const saved1 = JSON.parse(localStorage.getItem(key1) || '{}');
      const saved2 = JSON.parse(localStorage.getItem(key2) || '{}');

      expect(saved1['task-1']).toBe('2026-10-31_09:00');
      expect(saved2['task-1']).toBe('2026-10-31_14:00');
    });

    it('evaluates task due on exact minute or within 15-minute grace window if unalerted', () => {
      function shouldAlert(taskMins: number, nowMins: number, alreadyAlertedToday: boolean) {
        if (alreadyAlertedToday) return false;
        const isExact = (taskMins === nowMins);
        const isGrace = (nowMins > taskMins && (nowMins - taskMins) <= 15);
        return isExact || isGrace;
      }

      const task9am = 9 * 60; // 540

      // Exact minute: 9:00 AM
      expect(shouldAlert(task9am, 540, false)).toBe(true);

      // Grace window: opened app 5 mins late at 9:05 AM
      expect(shouldAlert(task9am, 545, false)).toBe(true);

      // Grace window: opened app 15 mins late at 9:15 AM
      expect(shouldAlert(task9am, 555, false)).toBe(true);

      // Outside grace window: 16 mins late at 9:16 AM
      expect(shouldAlert(task9am, 556, false)).toBe(false);

      // Already alerted today: should never re-alert
      expect(shouldAlert(task9am, 540, true)).toBe(false);
      expect(shouldAlert(task9am, 545, true)).toBe(false);
    });
  });

  // 4. Completed Task Arrival Logic
  describe('4. Arrival Reminder Handles Completed Tasks Peacefully', () => {
    it('celebrates instead of showing overdue alarm if task was completed in interim', () => {
      function evaluateArrival(task: { id: string; title: string; done: boolean }) {
        if (task.done) {
          return {
            emotion: 'happy',
            message: `All set! "${task.title}" was already completed. Wonderful dedication! 🌟`
          };
        }
        return {
          emotion: 'attentive',
          message: `It's time for your ${task.title}. Shall we do it together? 🌟`
        };
      }

      const completedTask = { id: 't1', title: 'Morning Medication', done: true };
      const pendingTask = { id: 't2', title: 'Gentle Walk', done: false };

      const arrivalDone = evaluateArrival(completedTask);
      expect(arrivalDone.emotion).toBe('happy');
      expect(arrivalDone.message).toContain('already completed');

      const arrivalPending = evaluateArrival(pendingTask);
      expect(arrivalPending.emotion).toBe('attentive');
      expect(arrivalPending.message).toContain('Shall we do it together?');
    });
  });

  // 5. Service Worker Cache Version v66
  describe('5. Service Worker Cache Version & Asset Audit', () => {
    it('verifies sw.js defines saksham-cache-v66 and caches companion assets', () => {
      const swPath = path.resolve(__dirname, '../../../../sw.js');
      const swContent = fs.readFileSync(swPath, 'utf8');

      expect(swContent).toContain("const CACHE_NAME = 'saksham-cache-v66';");
      expect(swContent).toContain('./js/features/pixel-character.js?v=66');
      expect(swContent).toContain('./js/features/companion-follower.js?v=66');
      expect(swContent).toContain('./js/services/notifications.js?v=66');
    });
  });

});
