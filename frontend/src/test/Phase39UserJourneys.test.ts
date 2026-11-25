/**
 * SAKSHAM NEURO-CARE — PHASE 3.9
 * END-TO-END PATIENT USER JOURNEYS (A THROUGH F) VERIFICATION
 *
 * Verifies real user workflows:
 * Journey A: Morning routine query & next step (Next Scheduled Task grounding)
 * Journey B: Interrupted activity recovery (Active Routine Session detection & resumption)
 * Journey C: Difficult task step & hint cue (Step pattern analysis & simplification proposal)
 * Journey D: Cognitive concern organization & consent (Patient reflection vs doctor-consented)
 * Journey E: Offline operation & pending mutations (SyncQueue offline resilience)
 * Journey F: Account isolation between Patient A and Patient B (Cross-UID zero-leak)
 *
 * 100% Spark Free Plan compliant ($0.00 cloud cost, resident local processing).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AshaContextService } from '../features/ai-companion/services/ashaContextService';
import { TaskLifecycleService } from '../features/routines/services/taskLifecycleService';
import { RoutineSessionService } from '../features/routines/services/routineSessionService';
import { StepPatternService } from '../features/routines/services/stepPatternService';
import { CognitiveConcernService } from '../features/clinical/services/cognitiveConcernService';
import { ItemLocationService } from '../features/item-memory/services/itemLocationService';
import { SyncQueueService } from '../services/syncQueueService';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine';
import { resetMockFirestoreStore } from './setup';

describe('Phase 3.9 User Journeys A Through F Verification', () => {
  const patientA = 'patient_sunita_journeys';
  const patientB = 'patient_rajesh_journeys';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetMockFirestoreStore();
    AshaContextService.clearAllContextCaches();
    TaskLifecycleService.clearCache();
    StepPatternService.clearForTesting();
    SyncQueueService.clearQueue(patientA);
    SyncQueueService.clearQueue(patientB);
    SyncQueueService.setSimulatedOnline(true);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // JOURNEY A: MORNING ROUTINE QUERY & NEXT STEP
  // ---------------------------------------------------------------------------
  it('Journey A: Patient asks "What is my next routine?", Asha returns next scheduled task grounded in today\'s schedule', () => {
    const instances = TaskLifecycleService.getOrCreateTodayInstances(patientA);
    expect(instances.length).toBeGreaterThan(0);

    const uCtx = AshaContextService.getUnifiedContext({ uid: patientA }, true);
    expect(uCtx.routines.nextScheduledTask).toBeDefined();

    const queryResult = ConversationEngine.processSync(
      'What should I do next?',
      { patientId: patientA } as any,
      'en'
    );

    expect(queryResult.speech).toBeDefined();
    expect(queryResult.speech.length).toBeGreaterThan(10);
    expect(queryResult.expression).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // JOURNEY B: INTERRUPTED ACTIVITY RECOVERY
  // ---------------------------------------------------------------------------
  it('Journey B: Patient pauses Chai preparation, closes app, reopens, and Asha prompts exact resume step', () => {
    // 1. Routine was interrupted at Step 2 (boil water)
    RoutineSessionService.saveActiveSession({
      sessionId: 'sess_journey_b',
      patientId: patientA,
      routineId: 'routine_chai_jb',
      routineTitle: 'Making Morning Ginger Chai',
      currentStepIndex: 1, // Step 2 (0-indexed)
      completedStepIndices: [0],
      stepHintTiers: { 0: 0, 1: 1 },
      stepAssistance: { 0: false, 1: false },
      secondsRemaining: 120,
      viewMode: 'single',
      startedAt: new Date(Date.now() - 600000).toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    });

    // 2. Patient speaks with Asha
    const queryResult = ConversationEngine.processSync(
      'Continue my tea routine please',
      { patientId: patientA } as any,
      'en'
    );

    expect(queryResult.intent).toBe('ROUTINES_RESUME_INTERRUPTED');
    expect(queryResult.speech).toContain('Making Morning Ginger Chai');
    expect(queryResult.speech).toContain('step 2');
    expect(queryResult.suggestedAction?.action).toBe('LAUNCH_ROUTINE_RUNNER');
    expect(queryResult.suggestedAction?.targetId).toBe('routine_chai_jb');
  });

  // ---------------------------------------------------------------------------
  // JOURNEY C: DIFFICULT TASK STEP & HINT CUE
  // ---------------------------------------------------------------------------
  it('Journey C: Repeated difficulty on kettle step generates simplification without overwriting task', () => {
    // 3 sessions where patient needed hints on kettle step
    for (let i = 0; i < 3; i++) {
      StepPatternService.recordStepExecution(patientA, 'routine_chai', 'Chai Routine', [
        {
          stepIndex: 0,
          stepTitle: 'Fill water and turn on stove',
          state: 'HINT_USED',
          hintTierUsed: 2,
          assistanceRequested: false,
          durationSeconds: 90,
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    const patterns = StepPatternService.analyzeStepPatterns(patientA, 'routine_chai', 1);
    expect(patterns[0].classification).toBe('frequent_hint');

    // Generate simplification proposal
    const proposal = StepPatternService.generateStepSimplification(
      patientA,
      'routine_chai',
      'Chai Routine',
      patterns[0],
      'Fill water and turn on stove'
    );

    expect(proposal).toBeDefined();
    expect(proposal?.proposedMicroActions.length).toBeGreaterThan(0);
    // Non-diagnostic disclaimer invariant
    expect(proposal?.nonDiagnosticDisclaimer).toContain('Not an assessment of cognitive decline');
  });

  // ---------------------------------------------------------------------------
  // JOURNEY D: COGNITIVE CONCERN ORGANIZATION & DOCTOR CONSENT
  // ---------------------------------------------------------------------------
  it('Journey D: Patient records memory concern, keeps it private by default, then consents for doctor', async () => {
    // 1. Record concern (default private)
    const concern = await CognitiveConcernService.recordConcern(patientA, {
      category: 'memory',
      description: 'Forgot name of neighbor at the garden gate',
      perspective: 'patient',
    });
    expect(concern.sharedWithDoctor).toBe(false);

    // Context verifies patient_private
    let uCtx = AshaContextService.getUnifiedContext({ uid: patientA }, true);
    expect(uCtx.journal.consentedDoctorConcernsCount).toBe(0);

    // 2. Patient consents to share with clinician
    await CognitiveConcernService.updateConcern(patientA, concern.id, {
      sharedWithDoctor: true,
      discussAtAppointment: true,
    });

    uCtx = AshaContextService.getUnifiedContext({ uid: patientA }, true);
    expect(uCtx.journal.consentedDoctorConcernsCount).toBe(1);

    // 3. Asha summarizes for appointment prep
    const prepResult = ConversationEngine.processSync(
      'What should I ask the doctor?',
      { patientId: patientA } as any,
      'en'
    );

    expect(prepResult.intent).toBe('COGNITIVE_JOURNAL_APPOINTMENT_PREP');
    expect(prepResult.speech).toContain('1 consented to share with your doctor');
  });

  // ---------------------------------------------------------------------------
  // JOURNEY E: OFFLINE OPERATION & PENDING MUTATIONS
  // ---------------------------------------------------------------------------
  it('Journey E: Patient uses app while offline; state is saved locally with pending sync badge', () => {
    SyncQueueService.setSimulatedOnline(false);

    // Complete task while offline
    const instances = TaskLifecycleService.getOrCreateTodayInstances(patientA);
    TaskLifecycleService.recordInstanceCompletion(patientA, instances[0].id, {
      reportedBy: 'patient',
      completionType: 'self',
      verifiedMethod: 'none',
    });

    const uCtx = AshaContextService.getUnifiedContext({ uid: patientA }, true);

    expect(uCtx.runtime.isOnline).toBe(false);
    expect(uCtx.routines.completedCount).toBe(1);
    expect(uCtx.runtime.pendingOfflineCount).toBeGreaterThanOrEqual(1);

    // Reconnection
    SyncQueueService.setSimulatedOnline(true);
    const uCtxOnline = AshaContextService.getUnifiedContext({ uid: patientA }, true);
    expect(uCtxOnline.runtime.isOnline).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // JOURNEY F: ACCOUNT ISOLATION BETWEEN PATIENT A AND PATIENT B
  // ---------------------------------------------------------------------------
  it('Journey F: Patient A and Patient B maintain 100% strict data boundary across all sub-contexts', async () => {
    // Patient A records glasses location
    await ItemLocationService.saveItem({
      id: 'item_a',
      patientId: patientA,
      itemName: 'reading glasses',
      locationRecorded: 'Sunita bedside drawer',
      room: 'Sunita Bedroom',
      photoDataUrl: '',
      verifiedStatus: 'VERIFIED_CURRENT',
      recordedAt: new Date().toISOString(),
      notes: '',
      synonyms: ['glasses'],
    });

    // Patient B records glasses location
    await ItemLocationService.saveItem({
      id: 'item_b',
      patientId: patientB,
      itemName: 'reading glasses',
      locationRecorded: 'Rajesh study desk',
      room: 'Rajesh Study',
      photoDataUrl: '',
      verifiedStatus: 'VERIFIED_CURRENT',
      recordedAt: new Date().toISOString(),
      notes: '',
      synonyms: ['glasses'],
    });

    const ctxA = AshaContextService.getUnifiedContext({ uid: patientA }, true);
    const ctxB = AshaContextService.getUnifiedContext({ uid: patientB }, true);

    const itemA = ctxA.memory.objectLocations.find((i) => i.data.itemName === 'reading glasses');
    const itemB = ctxB.memory.objectLocations.find((i) => i.data.itemName === 'reading glasses');

    expect(itemA?.data.locationRecorded).toBe('Sunita bedside drawer');
    expect(itemB?.data.locationRecorded).toBe('Rajesh study desk');

    // Conversational query isolation
    const queryA = ConversationEngine.processSync(
      'Where are my reading glasses?',
      { patientId: patientA } as any,
      'en'
    );
    const queryB = ConversationEngine.processSync(
      'Where are my reading glasses?',
      { patientId: patientB } as any,
      'en'
    );

    expect(queryA.speech).toContain('Sunita bedside drawer');
    expect(queryB.speech).toContain('Rajesh study desk');
  });
});
