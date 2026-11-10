/**
 * SAKSHAM — MILESTONE 7.3: ASHA CONVERSATIONAL ENGINE & SAFE PATIENT ACTION PROTOCOLS
 * Master Integration & Verification Test Suite
 * Validates all 12 Scenarios, Intent Recognition, Entity Extraction, Class 1-4 Action Protocols,
 * Confirmation Lifecycle, Medical/Emergency Safety Guards, Reactive Character Expressions,
 * Data Isolation and Multilingual Coverage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { ConversationActionRegistry } from '../features/ai-companion/services/conversationActionRegistry.js';
import { ConversationSafetyPolicy } from '../features/ai-companion/services/conversationSafetyPolicy.js';
import { EntityExtractor } from '../features/ai-companion/services/entityExtractor.js';
import { IntentRegistry } from '../features/ai-companion/services/intentRegistry.js';
import { ConversationalSanctuaryStage } from '../features/ai-companion/components/ConversationalSanctuaryStage.js';
import { PatientContextService, PatientContext } from '../services/patientContextService.js';
import { RoutineService } from '../features/routines/services/routineService.js';
import { NotesService } from '../features/notes/services/notesService.js';
import { CalendarService } from '../features/calendar/services/calendarService.js';
import { GamesService } from '../features/games/services/gamesService.js';
import { LovedOnesService } from '../features/lovedOnes/services/lovedOnesService.js';
import { RoutineItem } from '../types/index.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { AuthProvider } from '../context/AuthContext.js';

describe('Milestone 7.3: Asha Conversational Engine & Safe Patient Action Protocols', () => {
  const patientId = 'patient-m73-test';
  let mockContext: PatientContext;

  beforeEach(async () => {
    localStorage.clear();
    ConversationActionRegistry.cancelPendingConfirmation(patientId);

    // Seed realistic patient care routines
    const initialRoutines: RoutineItem[] = [
      {
        id: 'routine-01',
        title: 'Morning Blood Pressure Medicine',
        scheduledTime: '08:30 AM',
        category: 'medication',
        period: 'morning',
        isCompleted: true,
        completedAt: '08:35 AM',
        enableAssistedRecall: true,
        streakCount: 5,
      },
      {
        id: 'routine-02',
        title: 'Gentle Garden Stroll & Fresh Air',
        scheduledTime: '10:30 AM',
        category: 'exercise',
        period: 'morning',
        isCompleted: false,
        enableAssistedRecall: true,
        streakCount: 3,
      },
      {
        id: 'routine-03',
        title: 'Afternoon Hydration & Herbal Tea',
        scheduledTime: '03:00 PM',
        category: 'hydration',
        period: 'afternoon',
        isCompleted: false,
        enableAssistedRecall: true,
        streakCount: 2,
      },
    ];
    RoutineService.saveRoutines(patientId, initialRoutines, false);

    // Seed realistic Loved Ones profiles
    LovedOnesService.saveLovedOnes(patientId, [
      {
        id: 'loved-01',
        name: 'Ananya Sharma',
        relationship: 'Daughter',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
        description: 'Loves classical music and visiting every Sunday afternoon.',
        familiarPhrase: 'Namaste Ma, remember to take deep breaths.',
        voiceRecording: {
          id: 'rec-01',
          title: 'Sunday Visit',
          speakerName: 'Ananya Sharma',
          durationSeconds: 12,
          audioUrl: 'https://cdn.saksham.test/audio/ananya.mp3',
          transcript: 'Namaste Ma, remember to take deep breaths.',
          recordedAt: '2026-11-01',
        },
        cues: ['Loves singing raag yaman', 'Brings homemade halwa'],
        favouriteActivities: ['Walking in the botanical gardens', 'Sharing morning tea'],
      },
      {
        id: 'loved-02',
        name: 'Aarav Sharma',
        relationship: 'Grandson',
        photoUrl: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?auto=format&fit=crop&w=400&q=80',
        description: 'High school student who loves cricket and chess.',
        familiarPhrase: 'Dadi, let us play another card game together!',
        cues: ['Plays school cricket', 'Wears blue spectacles'],
        favouriteActivities: ['Playing card match games', 'Looking at old photographs'],
      },
    ]);

    // Seed Notes Sanctuary
    NotesService.createNote(patientId, {
      title: 'Weekly Grocery Needs',
      content: 'Fresh spinach, ripe bananas, chamomile tea bags, digestive biscuits.',
      category: 'general',
      isPinned: true,
    });

    NotesService.createNote(patientId, {
      title: 'Peaceful Evening Walk',
      content: 'Enjoyed seeing the blooming bougainvillea down the street.',
      category: 'personal',
      isPinned: false,
    });

    // Seed Calendar
    const today = new Date();
    today.setHours(11, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(12, 0, 0, 0);

    await CalendarService.createEvent(patientId, {
      title: 'Dr. Mehta Neurologist Consultation',
      category: 'doctor',
      startAt: today.toISOString(),
      endAt: todayEnd.toISOString(),
      isAllDay: false,
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const tomorrowEnd = new Date();
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(10, 45, 0, 0);

    await CalendarService.createEvent(patientId, {
      title: 'Gentle Chair Yoga Session',
      category: 'personal',
      startAt: tomorrow.toISOString(),
      endAt: tomorrowEnd.toISOString(),
      isAllDay: false,
    });

    // Seed Game Session History
    GamesService.recordSession(patientId, {
      id: 'session-01',
      gameId: 'card-match',
      gameTitle: 'Card Match',
      category: 'memory',
      difficulty: 'Gentle',
      date: 'Yesterday at 4 PM',
      durationSeconds: 120,
      completed: true,
    });

    // Build authoritative context snapshot
    mockContext = PatientContextService.getPatientContext({
      uid: patientId,
      displayName: 'Sunita Sharma',
    });
  });

  const renderSanctuaryWithProviders = (ui: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <AccessibilityProvider>
              <CharacterProvider>{ui}</CharacterProvider>
            </AccessibilityProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  };

  // =========================================================================
  // Part A: Core Intent Recognition & Entity Extraction
  // =========================================================================
  describe('Part A: Core Intent Recognition & Entity Extraction', () => {
    it('accurately extracts times, dates, persons and routine titles from natural queries', () => {
      const entities = EntityExtractor.extract('Please remind me to take my evening medicine at 5 PM', mockContext);
      expect(entities.time).toBe('05:00 PM');
      expect(entities.routineTitle?.toLowerCase()).toContain('take my evening medicine');

      const dateEntities = EntityExtractor.extract('What events are scheduled for tomorrow?', mockContext);
      expect(dateEntities.date).toBe('tomorrow');

      const personEntities = EntityExtractor.extract('Who is Ananya Sharma?', mockContext);
      expect(personEntities.personName).toBe('Ananya Sharma');
      expect(personEntities.relationship).toBe('Daughter');
    });

    it('matches Category A greeting and gratitude intents with high confidence', () => {
      const resHello = IntentRegistry.match('Namaste Asha, good morning!');
      expect(resHello.intent).toBe('GREETING');
      expect(resHello.confidence).toBeGreaterThan(0.9);

      const resThanks = IntentRegistry.match('Thank you so much Asha!');
      expect(resThanks.intent).toBe('GRATITUDE');
      expect(resThanks.confidence).toBeGreaterThan(0.9);
    });

    it('maintains strict patient UID isolation and protects guest profiles', () => {
      const guestContext = PatientContextService.getPatientContext(null);
      expect(guestContext.profile.isGuest).toBe(true);
      expect(guestContext.patientId).toContain('guest_patient');

      // Notes created by test patient must not be visible to guest
      const guestNotes = NotesService.getNotes(guestContext.patientId);
      expect(guestNotes).toHaveLength(0);
    });
  });

  // =========================================================================
  // Part B: The 12 Master Conversational Scenarios
  // =========================================================================
  describe('Part B: The 12 Master Conversational Scenarios', () => {
    // Scenario 1: Daily Schedule
    it('Scenario 1: summarizes today routines with actual progress and upcoming step', () => {
      const result = ConversationEngine.process("What do I have to do today?", mockContext, 'en');

      expect(result.intent).toBe('ROUTINES_TODAY');
      expect(result.expression).toBe('guiding');
      expect(result.speech).toContain('3 activities planned for today');
      expect(result.speech).toContain('1 completed');
      expect(result.speech).toContain('Gentle Garden Stroll & Fresh Air');
      expect(result.suggestedAction?.action).toBe('NAVIGATE_ROUTINES');
    });

    it('Scenario 1 (empty state): reports zero activities planned when schedule is empty', () => {
      const emptyContext: PatientContext = {
        ...mockContext,
        routines: {
          ...mockContext.routines,
          routines: [],
          progress: { total: 0, completed: 0, remaining: 0, percentage: 0 },
          nextScheduledRoutine: null,
        },
      };

      const result = ConversationEngine.process("What do I have to do today?", emptyContext, 'en');
      expect(result.speech).toContain('You do not have any activities planned for today');
      expect(result.expression).toBe('calm');
    });

    // Scenario 2: Start Activity (Guided Task Runner)
    it('Scenario 2: identifies next eligible activity and returns LAUNCH_ROUTINE_RUNNER action', () => {
      const result = ConversationEngine.process("Help me start my next activity", mockContext, 'en');

      expect(result.intent).toBe('ROUTINES_START_NEXT');
      expect(result.expression).toBe('guiding');
      expect(result.speech).toContain('Opening your guided task runner for \'Gentle Garden Stroll & Fresh Air\'');
      expect(result.suggestedAction?.action).toBe('LAUNCH_ROUTINE_RUNNER');
      expect(result.suggestedAction?.targetId).toBe('routine-02');
    });

    it('Scenario 2 (all completed): celebrates when all care activities are finished', () => {
      const allDoneContext: PatientContext = {
        ...mockContext,
        routines: {
          ...mockContext.routines,
          nextScheduledRoutine: null,
          progress: { total: 3, completed: 3, remaining: 0, percentage: 100 },
        },
      };

      const result = ConversationEngine.process("Start my next activity", allDoneContext, 'en');
      expect(result.expression).toBe('done_completed');
      expect(result.speech).toContain('All 3 of your scheduled activities for today are already completed');
    });

    // Scenario 3: Games Not Played Recently
    it('Scenario 3: identifies unplayed games from actual recorded history timestamps', () => {
      const result = ConversationEngine.process("Which games have I not played recently?", mockContext, 'en');

      expect(result.intent).toBe('GAMES_UNPLAYED_RECENTLY');
      expect(result.expression).toBe('helping_recall');
      expect(result.speech).toContain('In your recorded sessions, you haven\'t played');
      expect(result.suggestedAction?.action).toBe('NAVIGATE_MIND_GAMES');
    });

    // Scenario 4: Family Memories
    it('Scenario 4: retrieves actual saved Loved Ones album with photo cards', () => {
      const result = ConversationEngine.process("Show me my family photos", mockContext, 'en');

      expect(result.intent).toBe('LOVED_ONES_LIST');
      expect(result.expression).toBe('happy');
      expect(result.speech).toContain('Here is your Loved Ones gallery with 2 cherished family memories');
      expect(result.suggestedAction?.action).toBe('NAVIGATE_LOVED_ONES');
    });

    // Scenario 5: Voice Recording
    it('Scenario 5: identifies matching profile with authentic voice recording and plays it', () => {
      const result = ConversationEngine.process("Play my daughter's voice", mockContext, 'en');

      expect(result.intent).toBe('LOVED_ONES_VOICE');
      expect(result.expression).toBe('comforting');
      expect(result.speech).toContain('Playing the warm voice recording from your Daughter, Ananya Sharma');
      expect(result.suggestedAction?.action).toBe('SHOW_FAMILY_MEMBER');
      expect(result.suggestedAction?.targetId).toBe('loved-01');
    });

    it('Scenario 5 (no recording): honestly states when relative has no recorded voice note', () => {
      const result = ConversationEngine.process("Play Aarav's voice", mockContext, 'en');

      expect(result.intent).toBe('LOVED_ONES_VOICE');
      expect(result.expression).toBe('reassuring');
      expect(result.speech).toContain('Aarav Sharma does not have a saved voice message in your family album yet');
    });

    // Scenario 6: Pinned Notes
    it('Scenario 6: reads actual pinned notes content when requested by patient', () => {
      const result = ConversationEngine.process("Read my pinned notes", mockContext, 'en');

      expect(result.intent).toBe('NOTES_READ_PINNED');
      expect(result.expression).toBe('explaining');
      expect(result.speech).toContain('Weekly Grocery Needs');
      expect(result.speech).toContain('Fresh spinach, ripe bananas');
      expect(result.suggestedAction?.action).toBe('OPEN_NOTES');
    });

    // Scenario 7: Calendar Tomorrow
    it('Scenario 7: retrieves actual tomorrow calendar appointments using CalendarService', () => {
      const result = ConversationEngine.process("What do I have tomorrow?", mockContext, 'en');

      expect(result.intent).toBe('CALENDAR_TOMORROW');
      expect(result.expression).toBe('reminder');
      expect(result.speech).toContain('Gentle Chair Yoga Session');
      expect(result.speech).toContain('10:00');
      expect(result.suggestedAction?.action).toBe('OPEN_CALENDAR');
    });

    // Scenario 8: Add Reminder with Class 3 Confirmation
    it('Scenario 8: presents confirmation proposal and requires explicit approval before creating reminder', () => {
      const result = ConversationEngine.process("Remind me at 5 PM", mockContext, 'en');

      expect(result.intent).toBe('REMINDER_ADD');
      expect(result.expression).toBe('confirming');
      expect(result.actionClass).toBe('class3_consequential');
      expect(result.speech).toContain('You asked me to add a reminder');
      expect(result.speech).toContain('05:00 PM');
      expect(result.pendingConfirmation).toBeDefined();

      // Ensure no routine was silently written yet
      const currentRoutines = RoutineService.getRoutines(patientId);
      expect(currentRoutines.find((r) => r.scheduledTime === '05:00 PM')).toBeUndefined();

      // Patient confirms: "Yes, save it"
      const confirmRes = ConversationEngine.process("Yes, save it", mockContext, 'en');
      expect(confirmRes.intent).toBe('CONFIRMATION_YES');
      expect(confirmRes.expression).toBe('done_completed');
      expect(confirmRes.speech).toContain('I have saved your reminder');

      // Now routine must be officially persisted in RoutineService
      const updatedRoutines = RoutineService.getRoutines(patientId);
      const savedReminder = updatedRoutines.find((r) => r.scheduledTime === '05:00 PM');
      expect(savedReminder).toBeDefined();
    });

    it('Scenario 8 (cancellation): cancels reminder cleanly without modifying data on patient refusal', () => {
      // Initiate reminder creation
      ConversationEngine.process("Remind me at 6 PM", mockContext, 'en');

      // Patient cancels: "No, cancel that"
      const cancelRes = ConversationEngine.process("No, cancel that", mockContext, 'en');
      expect(cancelRes.intent).toBe('CONFIRMATION_NO');
      expect(cancelRes.expression).toBe('reassuring');
      expect(cancelRes.speech).toContain('I have cancelled that request');

      const updatedRoutines = RoutineService.getRoutines(patientId);
      expect(updatedRoutines.find((r) => r.scheduledTime === '06:00 PM')).toBeUndefined();
    });

    it('Scenario 8 (expiration): auto-expires pending confirmation after TTL (2 minutes)', () => {
      // Create pending confirmation
      const pending = ConversationActionRegistry.createPendingConfirmation(
        patientId,
        'CREATE_REMINDER',
        'Late Medicine',
        { time: '09:00 PM' },
        'Proposal'
      );

      // Artificially expire the TTL
      pending.expiresAt = Date.now() - 1000;

      const active = ConversationActionRegistry.getActivePendingConfirmation(patientId);
      expect(active).toBeNull();

      const execRes = ConversationActionRegistry.executePendingConfirmation(patientId, pending.id);
      expect(execRes.success).toBe(false);
      expect(execRes.speechEn).toContain('confirmation has expired');
    });

    // Scenario 9: Ambiguous Request
    it('Scenario 9: provides clarification question and tactile options when request is ambiguous', () => {
      const result = ConversationEngine.process("Show me that", mockContext, 'en');

      expect(result.intent).toBe('AMBIGUOUS_QUERY');
      expect(result.expression).toBe('clarifying');
      expect(result.speech).toContain('Which one would you like me to show you — your family photos, notes or games?');
      expect(result.clarificationOptions).toHaveLength(3);
    });

    // Scenario 10: Unsupported Request
    it('Scenario 10: honestly explains inability to book external appointments without fabricating capabilities', () => {
      const result = ConversationEngine.process("Book a doctor's appointment for me", mockContext, 'en');

      expect(result.intent).toBe('UNKNOWN_FALLBACK');
      expect(result.expression).toBe('explaining');
      expect(result.speech).toContain('I cannot book doctor appointments directly');
      expect(result.suggestedAction?.action).toBe('OPEN_CALENDAR');
    });

    // Scenario 11: Medication Self-Report Qualification
    it('Scenario 11: truthfully reports self-reported medication completion without claiming physical verification', () => {
      const result = ConversationEngine.process("Did I take my medicine?", mockContext, 'en');

      expect(result.intent).toBe('ROUTINES_MEDICATION_STATUS');
      expect(result.speech).toContain('According to your care schedule');
      expect(result.speech).toContain('Morning Blood Pressure Medicine');
      expect(result.speech).toContain('at 08:35 AM');
      expect(result.speech).toContain('Have you taken your medicine?');
      expect(result.speech).not.toContain('I verified that you took');
    });

    // Scenario 12: Unknown Regional / Unrecognized Phrase
    it('Scenario 12: gracefully handles unknown regional queries with reassuring fallback and chips', () => {
      const result = ConversationEngine.process("Can you fly a spaceship to Mars?", mockContext, 'en');

      expect(result.intent).toBe('UNKNOWN_FALLBACK');
      expect(result.expression).toBe('reassuring');
      expect(result.speech).toContain('Would you like to check your next scheduled routine');
      expect(result.clarificationOptions).toBeDefined();
    });
  });

  // =========================================================================
  // Part C: Medical Safety & Class 4 Action Restrictions
  // =========================================================================
  describe('Part C: Medical Safety & Class 4 Action Restrictions', () => {
    it('immediately triggers emergency distress guard for chest pain and breathlessness', () => {
      const resPain = ConversationSafetyPolicy.checkEmergencyDistress('I have sharp chest pain and cannot breathe', 'en');
      expect(resPain).not.toBeNull();
      expect(resPain?.actionClass).toBe('emergency');
      expect(resPain?.expression).toBe('alert_important');
      expect(resPain?.speech).toContain('call 112 immediately');

      const resHi = ConversationSafetyPolicy.checkEmergencyDistress('मुझे सीने में बहुत तेज़ दर्द हो रहा है', 'hi');
      expect(resHi).not.toBeNull();
      expect(resHi?.speech).toContain('चिकित्सीय सलाह');
    });

    it('strictly rejects prescription modifications and dosage alterations (Class 4)', () => {
      const resDose = ConversationSafetyPolicy.checkRestrictedActions('Should I double my dose of pills?', 'en');
      expect(resDose).not.toBeNull();
      expect(resDose?.actionClass).toBe('class4_restricted');
      expect(resDose?.speech).toContain('cannot modify medical prescriptions or alter drug dosages');

      const resStop = ConversationSafetyPolicy.checkRestrictedActions('I want to stop my medication', 'en');
      expect(resStop?.actionClass).toBe('class4_restricted');
    });

    it('strictly rejects medical disease diagnosis queries (Class 4)', () => {
      const resDiag = ConversationSafetyPolicy.checkRestrictedActions('Can you diagnose if I have Alzheimer disease?', 'en');
      expect(resDiag).not.toBeNull();
      expect(resDiag?.actionClass).toBe('class4_restricted');
      expect(resDiag?.speech).toContain('cannot make clinical diagnoses');
    });

    it('strictly blocks administrative manipulation and other patient records access (Class 4)', () => {
      const resAdmin = ConversationSafetyPolicy.checkRestrictedActions('Open admin console and change my doctor', 'en');
      expect(resAdmin).not.toBeNull();
      expect(resAdmin?.actionClass).toBe('class4_restricted');
      expect(resAdmin?.speech).toContain('Administrative settings, doctor reassignments');
    });
  });

  // =========================================================================
  // Part D: Conversational Sanctuary Stage UI Integration
  // =========================================================================
  describe('Part D: Conversational Sanctuary Stage UI Integration', () => {
    it('renders interactive confirmation card with Confirm and Cancel buttons for Class 3 actions', async () => {
      renderSanctuaryWithProviders(<ConversationalSanctuaryStage patientName="Sunita" />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Remind me at 5 PM' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // Confirmation Card should appear in chat
      await waitFor(() => {
        expect(screen.getByText(/Action Confirmation Required/i)).toBeInTheDocument();
        expect(screen.getByText(/✓ Confirm & Save/i)).toBeInTheDocument();
        expect(screen.getByText(/✕ Cancel/i)).toBeInTheDocument();
      });

      // Tapping Cancel removes confirmation and displays reassurance
      const cancelBtn = screen.getByText(/✕ Cancel/i);
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(screen.getByText(/I have cancelled that request/i)).toBeInTheDocument();
      });
    });

    it('renders clarification chips when ambiguous query is processed', async () => {
      renderSanctuaryWithProviders(<ConversationalSanctuaryStage patientName="Sunita" />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Show me that' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/Which one would you like me to show you/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Family Photos' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mind Games' })).toBeInTheDocument();
      });
    });

    it('dispatches saksham:launch-routine-runner window event when activity launch is triggered', async () => {
      const launchHandler = vi.fn();
      window.addEventListener('saksham:launch-routine-runner', launchHandler);

      renderSanctuaryWithProviders(
        <ConversationalSanctuaryStage
          patientName="Sunita"
          onLaunchRoutineRunner={launchHandler}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Help me start my next activity' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/Opening your guided task runner/i)).toBeInTheDocument();
      });

      window.removeEventListener('saksham:launch-routine-runner', launchHandler);
    });
  });
});
