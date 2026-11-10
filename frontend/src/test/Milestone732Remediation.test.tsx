import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { ConversationActionRegistry } from '../features/ai-companion/services/conversationActionRegistry.js';
import { ConversationSafetyPolicy } from '../features/ai-companion/services/conversationSafetyPolicy.js';
import { ConversationalSanctuaryStage } from '../features/ai-companion/components/ConversationalSanctuaryStage.js';
import { RoutineService } from '../features/routines/services/routineService.js';
import { LovedOnesService } from '../features/lovedOnes/services/lovedOnesService.js';
import { GamesService } from '../features/games/services/gamesService.js';
import { NotesService } from '../features/notes/services/notesService.js';
import { CalendarService } from '../features/calendar/services/calendarService.js';
import { isDemoModeEnabled } from '../features/auth/services/identityService.js';
import { SpeechService } from '../services/speechService.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { PatientContext } from '../services/patientContextService.js';

describe('Milestone 7.3.2: Conversational Reliability, Patient Data Integrity & Safety Remediation', () => {
  const patientAuthUid = 'patient-authenticated-empty-001';

  const createEmptyContext = (uid: string = patientAuthUid): PatientContext => ({
    patientId: uid,
    profile: { displayName: 'Aarav Patel', preferredLanguage: 'en', isGuest: false },
    routines: { routines: [], progress: { completed: 0, total: 0, percentage: 0 }, streak: 0 },
    lovedOnes: { members: [], sampleMembers: [], count: 0 },
    games: { history: [], recentGames: [], totalPlayed: 0 },
    notes: { notes: [], pinnedCount: 0 },
    calendar: { events: [], todayCount: 0, tomorrowCount: 0 },
  } as any);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    ConversationActionRegistry.clearAll();
  });

  afterEach(() => {
    ConversationActionRegistry.clearAll();
    localStorage.clear();
  });

  /* ========================================================================= */
  /* REMEDIATION A: RELIABLE ASYNCHRONOUS CONFIRMATION COMMITS                 */
  /* ========================================================================= */
  describe('Remediation A — Reliable Asynchronous Confirmation Commits & Lifecycle', () => {
    it('properly awaits NotesService.createNote and returns truthful local-first status', async () => {
      const createSpy = vi.spyOn(NotesService, 'createNote').mockImplementation(async (_pid, note) => {
        // Simulate async persistence delay
        await new Promise((r) => setTimeout(r, 10));
        return { ...note, id: 'persisted-note-123' } as any;
      });

      const pending = ConversationActionRegistry.createPendingConfirmation(
        patientAuthUid,
        'CREATE_NOTE',
        'Doctor Note',
        { title: 'Doctor Note', content: 'Take vitamins with dinner', category: 'medical' },
        'Would you like me to save a note titled "Doctor Note"?'
      );

      const result = await ConversationActionRegistry.executePendingConfirmation(patientAuthUid, pending.id);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.status).toBe('saved_locally');
      expect(result.speechEn).toContain('safely preserved on this device and is waiting to sync');
      expect(result.speechHi).toContain('सहेज लिया गया है');

      createSpy.mockRestore();
    });

    it('properly awaits CalendarService.createEvent and returns truthful local-first status', async () => {
      const createSpy = vi.spyOn(CalendarService, 'createEvent').mockImplementation(async (_pid, event) => {
        await new Promise((r) => setTimeout(r, 10));
        return { ...event, id: 'persisted-event-456' } as any;
      });

      const pending = ConversationActionRegistry.createPendingConfirmation(
        patientAuthUid,
        'CREATE_CALENDAR_EVENT',
        'Dr. Rao Appointment',
        { title: 'Dr. Rao Appointment', date: '2026-11-15', time: '10:00' },
        'Would you like me to add Dr. Rao Appointment to your calendar?'
      );

      const result = await ConversationActionRegistry.executePendingConfirmation(patientAuthUid, pending.id);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.status).toBe('saved_locally');
      expect(result.speechEn).toContain('on this device');

      createSpy.mockRestore();
    });

    it('prevents double-confirmation race conditions via executing lock', async () => {
      let resolvePromise: (val: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.spyOn(NotesService, 'createNote').mockImplementation(async (_pid, note) => {
        await delayedPromise;
        return { ...note, id: 'note-locked' } as any;
      });

      const pending = ConversationActionRegistry.createPendingConfirmation(
        patientAuthUid,
        'CREATE_NOTE',
        'Hydration',
        { title: 'Hydration', content: 'Drink 2 glasses' },
        'Would you like me to save this note?'
      );

      // Trigger first execution (in flight)
      const firstExecPromise = ConversationActionRegistry.executePendingConfirmation(patientAuthUid, pending.id);

      // Attempt immediate duplicate execution while first is in flight
      const duplicateExecResult = await ConversationActionRegistry.executePendingConfirmation(patientAuthUid, pending.id);

      expect(duplicateExecResult.success).toBe(false);
      expect(duplicateExecResult.status).toBe('duplicate_ignored');

      // Finish first execution
      resolvePromise!({ id: 'note-locked' });
      const firstResult = await firstExecPromise;
      expect(firstResult.success).toBe(true);

      vi.restoreAllMocks();
    });

    it('enforces execution-time 2-minute TTL expiration', async () => {
      const pending = ConversationActionRegistry.createPendingConfirmation(
        patientAuthUid,
        'CREATE_NOTE',
        'Expired test',
        { title: 'Expired test', content: 'Old request' },
        'Expired proposal'
      );

      // Manually wind clock back past TTL
      pending.createdAt = Date.now() - 3 * 60 * 1000;
      pending.expiresAt = Date.now() - 1000;

      const result = await ConversationActionRegistry.executePendingConfirmation(patientAuthUid, pending.id);

      expect(result.success).toBe(false);
      expect(result.status).toBe('expired');
      expect(result.speechEn).toContain('expired for your safety');
    });

    it('rejects cross-account UID confirmation attempts with permission_denied', async () => {
      const pending = ConversationActionRegistry.createPendingConfirmation(
        patientAuthUid,
        'CREATE_NOTE',
        'Patient A note',
        { title: 'Patient A note', content: 'Private' },
        'Confirm note?'
      );

      const result = await ConversationActionRegistry.executePendingConfirmation(patientAuthUid, pending.id, 'patient-B-intruder');

      expect(result.success).toBe(false);
      expect(result.status).toBe('permission_denied');
      expect(result.speechEn).toContain('different accounts');
    });

    it('handles async service failure gracefully and offers retry metadata', async () => {
      vi.spyOn(NotesService, 'createNote').mockRejectedValueOnce(new Error('IndexedDB disk full'));

      const pending = ConversationActionRegistry.createPendingConfirmation(
        patientAuthUid,
        'CREATE_NOTE',
        'Failing note',
        { title: 'Failing note', content: 'Error scenario' },
        'Confirm save note?'
      );

      const result = await ConversationActionRegistry.executePendingConfirmation(patientAuthUid, pending.id);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.retryAvailable).toBe(true);
      expect(result.pendingAction).toBeDefined();
      expect(result.speechEn).toContain('issue while saving');

      vi.restoreAllMocks();
    });

    it('cleans up pending confirmation upon explicit cancellation', () => {
      ConversationActionRegistry.createPendingConfirmation(
        patientAuthUid,
        'CREATE_NOTE',
        'Cancel me',
        { title: 'Cancel me', content: 'To be discarded' },
        'Proposal'
      );

      expect(ConversationActionRegistry.getActivePendingConfirmation(patientAuthUid)).toBeDefined();

      ConversationActionRegistry.cancelPendingConfirmation(patientAuthUid);

      expect(ConversationActionRegistry.getActivePendingConfirmation(patientAuthUid)).toBeNull();
    });
  });

  /* ========================================================================= */
  /* REMEDIATION B: PATIENT DATA INTEGRITY & AUTHENTIC EMPTY STATES            */
  /* ========================================================================= */
  describe('Remediation B — Patient Data Integrity & Authentic Empty States', () => {
    it('returns empty array [] for real authenticated patients with no records', () => {
      const routines = RoutineService.getRoutines(patientAuthUid);
      expect(routines).toEqual([]);

      const lovedOnes = LovedOnesService.getLovedOnes(patientAuthUid);
      expect(lovedOnes).toEqual([]);

      const gameHistory = GamesService.getHistory(patientAuthUid);
      expect(gameHistory).toEqual([]);
    });

    it('isDemoModeEnabled strictly returns false for authenticated patient accounts', () => {
      expect(isDemoModeEnabled(patientAuthUid)).toBe(false);
      expect(isDemoModeEnabled('patient-12345')).toBe(false);
      expect(isDemoModeEnabled('firebase-auth-uid-xyz')).toBe(false);
    });

    it('never auto-seeds mock routines into Firestore sync for empty accounts', async () => {
      const result = await RoutineService.syncRoutinesFromFirestore(patientAuthUid);
      expect(result).toEqual([]);
    });

    it('never auto-seeds mock loved ones into Firestore sync for empty accounts', async () => {
      const result = await LovedOnesService.syncLovedOnesFromFirestore(patientAuthUid);
      expect(result).toEqual([]);
    });

    it('ConversationEngine provides truthful and empathetic empty-state responses', async () => {
      const context = createEmptyContext(patientAuthUid);

      // Routines empty inquiry
      const routineRes = await ConversationEngine.process('What is my next routine?', context, 'en', patientAuthUid);
      expect(routineRes.speech).toMatch(/not have any scheduled routines|no scheduled routines/i);
      expect(routineRes.expression).toBe('clarifying');

      // Loved Ones empty inquiry
      const lovedRes = await ConversationEngine.process('Show me my family photos', context, 'en', patientAuthUid);
      expect(lovedRes.speech).toMatch(/album is empty|add your first family member/i);

      // Games unplayed inquiry
      const gamesRes = await ConversationEngine.process('What games did I play recently?', context, 'en', patientAuthUid);
      expect(gamesRes.speech).toMatch(/have not played an activity|recorded sessions/i);
    });
  });

  /* ========================================================================= */
  /* REMEDIATION C: PAN-INDIA EMERGENCY PHRASE SAFETY                          */
  /* ========================================================================= */
  describe('Remediation C — Pan-India Emergency Phrase Safety', () => {
    it('triggers emergency distress response for Marathi chest pain phrase: "माझ्या छातीत दुखत आहे"', () => {
      const result = ConversationSafetyPolicy.checkEmergencyDistress('माझ्या छातीत दुखत आहे', 'mr');
      expect(result).not.toBeNull();
      expect(result?.intent).toBe('EMERGENCY_DISTRESS');
      expect(result?.actionClass).toBe('emergency');
      expect(result?.speech).toMatch(/त्वरित|आणीबाणी|काळजीवाहू/i);
    });

    it('triggers emergency distress response for Bengali severe chest pain phrase: "আমার বুকে প্রচন্ড ব্যথা করছে"', () => {
      const result = ConversationSafetyPolicy.checkEmergencyDistress('আমার বুকে প্রচন্ড ব্যথা করছে', 'bn');
      expect(result).not.toBeNull();
      expect(result?.intent).toBe('EMERGENCY_DISTRESS');
      expect(result?.actionClass).toBe('emergency');
    });

    it('triggers emergency distress response for Gujarati chest pain phrase: "મને છાતીમાં દુખાવો થાય છે"', () => {
      const result = ConversationSafetyPolicy.checkEmergencyDistress('મને છાતીમાં દુખાવો થાય છે', 'gu');
      expect(result).not.toBeNull();
      expect(result?.intent).toBe('EMERGENCY_DISTRESS');
      expect(result?.actionClass).toBe('emergency');
    });

    it('triggers emergency distress response for Tamil chest pain phrase: "நெஞ்சு வலி"', () => {
      const result = ConversationSafetyPolicy.checkEmergencyDistress('எனக்கு நெஞ்சு வலி உள்ளது', 'ta');
      expect(result).not.toBeNull();
      expect(result?.intent).toBe('EMERGENCY_DISTRESS');
      expect(result?.actionClass).toBe('emergency');
    });

    it('triggers emergency distress response for Telugu chest pain phrase: "ఛాతీ నొప్పి"', () => {
      const result = ConversationSafetyPolicy.checkEmergencyDistress('నాకు ఛాతీ నొప్పి వస్తోంది', 'te');
      expect(result).not.toBeNull();
      expect(result?.intent).toBe('EMERGENCY_DISTRESS');
      expect(result?.actionClass).toBe('emergency');
    });

    it('triggers emergency distress response for Hindi: "मुझे सीने में दर्द हो रहा है"', () => {
      const result = ConversationSafetyPolicy.checkEmergencyDistress('मुझे सीने में दर्द हो रहा है', 'hi');
      expect(result).not.toBeNull();
      expect(result?.intent).toBe('EMERGENCY_DISTRESS');
      expect(result?.actionClass).toBe('emergency');
      expect(result?.speech).toMatch(/तुरंत|सहायता/i);
    });

    it('triggers emergency distress response for English: "I have severe chest pain and can\'t breathe"', () => {
      const result = ConversationSafetyPolicy.checkEmergencyDistress("I have severe chest pain and can't breathe", 'en');
      expect(result).not.toBeNull();
      expect(result?.intent).toBe('EMERGENCY_DISTRESS');
      expect(result?.actionClass).toBe('emergency');
      expect(result?.speech).toMatch(/emergency assistance|call 112|caregiver/i);
    });

    it('maintains honest validation statuses in EMERGENCY_CATALOGUE across 23 languages', () => {
      const entries = Object.values(ConversationSafetyPolicy.EMERGENCY_CATALOGUE);
      expect(entries.length).toBe(23);

      const verified = entries.filter((e) => e.validationStatus === 'verified');
      const provisional = entries.filter((e) => e.validationStatus === 'provisional');

      // English, Hindi, Marathi, Bengali, Tamil, Telugu, Gujarati, Urdu are verified clinical phrases
      expect(verified.length).toBeGreaterThanOrEqual(8);
      expect(provisional.length).toBeGreaterThanOrEqual(1);

      // Verify each entry has non-empty keywords
      entries.forEach((entry) => {
        expect(entry.keywords.length).toBeGreaterThan(0);
        expect(['verified', 'provisional', 'limited']).toContain(entry.validationStatus);
      });
    });

    it('guarantees Asha NEVER claims to have dispatched emergency services herself', () => {
      const resultEn = ConversationSafetyPolicy.checkEmergencyDistress('I am having a medical emergency', 'en');
      expect(resultEn).not.toBeNull();
      expect(resultEn!.speech).not.toMatch(/i have called|i called 112|ambulance is dispatched|help is on the way/i);
      expect(resultEn!.speech).toMatch(/alert a family member|caregiver immediately|emergency/i);

      const resultHi = ConversationSafetyPolicy.checkEmergencyDistress('यह एक मेडिकल इमरजेंसी है', 'hi');
      expect(resultHi).not.toBeNull();
      expect(resultHi!.speech).not.toMatch(/मैंने फोन कर दिया|एंबुलेंस भेजी गई/i);
    });
  });

  /* ========================================================================= */
  /* REMEDIATION D: RESTRICTED CLINICAL ACTIONS & ADVERSARIAL RESILIENCE       */
  /* ========================================================================= */
  describe('Remediation D — Restricted Clinical Actions & Adversarial Resilience', () => {
    it('catches prescription modification misspellings ("doubel dose", "incres dose")', () => {
      const res1 = ConversationSafetyPolicy.checkRestrictedActions('can you doubel my dose please');
      expect(res1).not.toBeNull();
      expect(res1?.actionClass).toBe('class4_restricted');
      expect(res1?.speech).toMatch(/cannot provide medical advice|cannot modify medical prescriptions/i);

      const res2 = ConversationSafetyPolicy.checkRestrictedActions('please incres my medicine dose');
      expect(res2).not.toBeNull();
      expect(res2?.actionClass).toBe('class4_restricted');
    });

    it('catches missing spaces in medication change requests ("changedose", "doubledose")', () => {
      const res1 = ConversationSafetyPolicy.checkRestrictedActions('i want to changedose of my pills');
      expect(res1).not.toBeNull();
      expect(res1?.actionClass).toBe('class4_restricted');

      const res2 = ConversationSafetyPolicy.checkRestrictedActions('can i doubledose my tablets');
      expect(res2).not.toBeNull();
      expect(res2?.actionClass).toBe('class4_restricted');
    });

    it('catches common clinical abbreviations ("rx", "meds", "tabs")', () => {
      const res1 = ConversationSafetyPolicy.checkRestrictedActions('can you alter my rx');
      expect(res1).not.toBeNull();
      expect(res1?.actionClass).toBe('class4_restricted');

      const res2 = ConversationSafetyPolicy.checkRestrictedActions('stop all my meds');
      expect(res2).not.toBeNull();
      expect(res2?.actionClass).toBe('class4_restricted');
    });

    it('catches mixed Hindi-English clinical instructions ("dawa change", "goli band")', () => {
      const res1 = ConversationSafetyPolicy.checkRestrictedActions('kya main dawa change kar sakta hoon');
      expect(res1).not.toBeNull();
      expect(res1?.actionClass).toBe('class4_restricted');

      const res2 = ConversationSafetyPolicy.checkRestrictedActions('aaj se goli band kardo');
      expect(res2).not.toBeNull();
      expect(res2?.actionClass).toBe('class4_restricted');
    });

    it('strictly confirms 0 clinical mutation methods exist in ConversationActionRegistry', () => {
      const registryMethods = Object.getOwnPropertyNames(ConversationActionRegistry);
      const prototypeMethods = Object.getOwnPropertyNames(ConversationActionRegistry.prototype);
      const allMethods = [...registryMethods, ...prototypeMethods].map((m) => m.toLowerCase());

      // Confirm absolute absence of medical prescription/clinical modification methods
      expect(allMethods.some((m) => m.includes('prescrib'))).toBe(false);
      expect(allMethods.some((m) => m.includes('dose'))).toBe(false);
      expect(allMethods.some((m) => m.includes('diagnos'))).toBe(false);
      expect(allMethods.some((m) => m.includes('medication'))).toBe(false);
      expect(allMethods.some((m) => m.includes('treatment'))).toBe(false);
    });
  });

  /* ========================================================================= */
  /* REMEDIATION E: MULTILINGUAL & SPEECH ROUTING RESILIENCE                   */
  /* ========================================================================= */
  describe('Remediation E — Multilingual & Dynamic Speech Routing', () => {
    it('SpeechService provides valid BCP-47 tag for all 23 supported languages', () => {
      const languageCodes = [
        'en', 'hi', 'bn', 'te', 'mr', 'ta', 'ur', 'gu', 'kn', 'ml',
        'pa', 'as', 'or', 'sa', 'ks', 'ne', 'sd', 'kok', 'doi', 'mni',
        'brx', 'mai', 'sat'
      ];

      languageCodes.forEach((code) => {
        const bcpTag = SpeechService.getBCP47(code);
        expect(bcpTag).toBeDefined();
        expect(typeof bcpTag).toBe('string');
        expect(bcpTag.length).toBeGreaterThanOrEqual(2);
        // Indic standard tags end with -IN (or are en-US/en-IN)
        if (code !== 'en') {
          expect(bcpTag).toContain('-IN');
        }
      });
    });

    it('speech service graceful degradation reports honest availability', () => {
      const isTTS = SpeechService.isTTSSupported();
      const isSTT = SpeechService.isSTTSupported();

      expect(typeof isTTS).toBe('boolean');
      expect(typeof isSTT).toBe('boolean');
    });

    it('renders Conversational Sanctuary with dynamic speech and empty state integration', async () => {
      localStorage.setItem('saksham_auth_user', JSON.stringify({
        uid: patientAuthUid,
        email: 'aarav@saksham.care',
        displayName: 'Aarav Patel',
        role: 'patient',
      }));

      render(
        <BrowserRouter>
          <AuthProvider>
            <LanguageProvider>
              <AccessibilityProvider>
                <CharacterProvider>
                  <ConversationalSanctuaryStage />
                </CharacterProvider>
              </AccessibilityProvider>
            </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      );

      // Verify Conversational Sanctuary Stage mounted with Asha
      expect(screen.getByLabelText(/Asha character is currently/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Talk to Asha/i)).toBeInTheDocument();
    });
  });
});
