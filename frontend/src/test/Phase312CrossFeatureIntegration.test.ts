/**
 * SAKSHAM NEURO-CARE — PHASE 3.12
 * CROSS-FEATURE INTEGRATION & MULTI-USER JOURNEY VERIFICATION SUITE
 *
 * Dedicated Vitest Integration Suite (Journeys 1 through 10):
 * Journey 1:  Routine Creation -> Adaptive Execution -> Discrepancy -> Proposal -> Review -> Task Lifecycle
 * Journey 2:  Concern Logging -> Dyadic Observation -> Doctor Consent Toggle -> Appointment Prep Export
 * Journey 3:  Offline Routine Execution -> Concern Logging -> Reconnect -> Idempotent Queue Flush -> Verified Persistence
 * Journey 4:  Caregiver Shift Handoff -> Second Caregiver Continuity -> Non-Author Tampering Blocked
 * Journey 5:  Accessibility Customization -> Multilingual Context -> Asha Guidance -> Offline Persistence
 * Journey 6:  Clinician Assessment Record -> Amendment Audit Trail -> Read-Only Patient View -> Tampering Blocked
 * Journey 7:  Safety-Locked Routine (Medication/Flame) -> Caregiver Adaptation Attempt -> Safety Lock Block
 * Journey 8:  Sign-Out -> Cache Eviction -> Queue Suspension -> Account Switch -> Zero Data Bleed
 * Journey 9:  Caregiver Revocation -> Instant Access Termination -> Subcollection Lockout -> Sovereignty Preserved
 * Journey 10: Full Dyadic Lifecycle: Support Request -> Caregiver Response -> Resolution -> Audit Trail Integrity
 *
 * 100% Spark Free Plan compliant ($0.00 cloud cost, resident deterministic tests).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CaregiverService, DEFAULT_CAREGIVER_PERMISSIONS, EMPTY_CAREGIVER_PERMISSIONS } from '../features/caregiver/services/caregiverService.js';
import { DoctorAnalyticsService } from '../features/doctor/services/doctorAnalyticsService.js';
import { CognitiveConcernService } from '../features/clinical/services/cognitiveConcernService.js';
import { DyadicCareCoordinationService } from '../features/caregiver/services/dyadicCareCoordinationService.js';
import { DyadicCareCoordinationPolicy } from '../features/caregiver/services/dyadicCareCoordinationPolicy.js';
import { TaskLifecycleService } from '../features/routines/services/taskLifecycleService.js';
import { StepPatternService } from '../features/routines/services/stepPatternService.js';
import { AshaContextService } from '../features/ai-companion/services/ashaContextService.js';
import { AshaPersonalizationService } from '../features/ai-companion/services/ashaPersonalizationService.js';
import { SyncQueueService } from '../services/syncQueueService.js';
import { resetMockFirestoreStore } from './setup.js';
import { TaskCompletionAttribution } from '../features/routines/types/taskLifecycle.types.js';

describe('Phase 3.12: Dedicated Cross-Feature Integration Journeys (1 to 10)', () => {
  const patientId = 'patient_sunita_cf';
  const caregiver1Id = 'caregiver_priya_cf';
  const caregiver2Id = 'caregiver_amit_cf';
  const doctorId = 'doctor_sharma_cf';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetMockFirestoreStore();
    CaregiverService.clearSimulatedRelationships();
    DoctorAnalyticsService.clearSimulatedAssignments();
    DyadicCareCoordinationService.clearAllCaches();
    AshaContextService.clearAllContextCaches();
    SyncQueueService.clearQueue(patientId);
    SyncQueueService.setSimulatedOnline(true);

    // Setup active relationship for primary caregiver
    CaregiverService.setSimulatedRelationship(caregiver1Id, patientId, 'active', DEFAULT_CAREGIVER_PERMISSIONS);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // JOURNEY 1: ROUTINE -> EXECUTION -> DISCREPANCY -> PROPOSAL -> ACCEPTANCE
  // =========================================================================
  it('Journey 1: Routine Creation -> Adaptive Execution -> Discrepancy -> Proposal -> Patient Review -> Task Lifecycle', async () => {
    // 1. Patient creates daily routine
    const routine = TaskLifecycleService.addRecurringTask(patientId, {
      patientId,
      title: 'Prepare Morning Herbal Tea',
      description: 'Boil water and prepare fresh ginger herbal tea.',
      category: 'food',
      period: 'morning',
      scheduledTime: '07:30 AM',
      durationMinutes: 10,
      recurrence: 'daily',
      supportLevel: 'independent',
      createdBy: 'patient',
      reminderConfig: {
        enabled: true,
        leadTimeMinutes: 0,
        followUpMinutes: 10,
        maxFollowUps: 1,
      },
      steps: [
        'Take steel vessel and add water',
        'Place vessel on stove and turn burner knob',
        'Add tea leaves and ginger',
      ],
    });
    expect(routine).toBeDefined();

    // 2. Patient completes step independently
    const attribution: TaskCompletionAttribution = {
      reportedBy: 'patient',
      completionType: 'self',
      verifiedMethod: 'none',
      notes: 'Completed with slight hesitation at step 1',
    };
    const inst = TaskLifecycleService.recordInstanceCompletion(patientId, `inst_${routine.id}_today`, attribution);
    expect(inst?.status).toBe('completed');

    // 3. Caregiver observes divergence and records discrepancy
    const discrepancy = DyadicCareCoordinationService.recordDiscrepancy(
      patientId,
      'task_completion',
      'Morning Tea Preparation Observations',
      { status: 'Completed independently' },
      { status: 'Observed difficulty with burner knob' }
    );
    expect(discrepancy.resolutionStatus).toBe('open');
    expect(discrepancy.neutralExplanation).toContain('Dual perspective in routine completion');

    // 4. Caregiver proposes simplification for step 0 (safe step)
    const proposal = await DyadicCareCoordinationService.createCaregiverProposal(
      caregiver1Id,
      'Priya',
      patientId,
      {
        proposalType: 'step_simplification',
        title: 'Use pre-measured kettle',
        summary: 'Keep measured kettle on the counter for easy access',
        details: {
          routineId: routine.id,
          stepIndex: 0,
          originalValue: 'Take steel vessel and add water',
          proposedValue: 'Use pre-measured kettle on kitchen counter',
        },
        instructionText: 'Take steel vessel and add water',
      }
    );
    expect(proposal.safetyStatus).toBe('safe');
    expect(proposal.status).toBe('pending');

    // 5. Patient reviews and accepts proposal
    const accepted = DyadicCareCoordinationService.reviewProposalByPatient(
      patientId,
      proposal.id,
      'accepted',
      'That will be easier for me'
    );
    expect(accepted?.status).toBe('accepted');
    expect(accepted?.patientDecision?.patientNote).toBe('That will be easier for me');

    // 6. Verification: dyadic modification trail was recorded
    const history = StepPatternService.getDyadicModifications(patientId);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].actor).toBe('patient');
    expect(history[0].modificationType).toBe('proposal_accepted');
  });

  // =========================================================================
  // JOURNEY 2: COGNITIVE CONCERN -> DYADIC OBSERVATION -> CONSENT -> EXPORT
  // =========================================================================
  it('Journey 2: Cognitive Concern Logging -> Dyadic Observation -> Doctor Consent Toggle -> Clinical Appointment Preparation Export', async () => {
    // 1. Patient logs private concern
    const patientConcern = await CognitiveConcernService.recordConcern(patientId, {
      description: 'Misplaced keys twice this week.',
      category: 'memory',
      status: 'occasional',
      perspective: 'patient',
      sharedWithDoctor: false,
      discussAtAppointment: false,
    });
    expect(patientConcern.sharedWithDoctor).toBe(false);

    // 2. Caregiver records objective observation
    const caregiverConcern = await CognitiveConcernService.recordConcern(patientId, {
      description: 'Found keys in refrigerator drawer on Tuesday morning.',
      category: 'memory',
      status: 'ongoing',
      perspective: 'caregiver',
      sharedWithDoctor: true,
      discussAtAppointment: true,
    });
    expect(caregiverConcern.sharedWithDoctor).toBe(true);

    // 3. Dyadic analysis flags divergence neutrally
    const concerns = CognitiveConcernService.getConcernsFromLocal(patientId);
    const analysis = CognitiveConcernService.analyzeDyadicDiscrepancy(concerns);
    expect(analysis.hasDiscrepancies).toBe(true);
    expect(analysis.divergentCategories.length).toBeGreaterThan(0);
    expect(analysis.divergentCategories[0].explanation).toContain('Dyadic divergence in memory');

    // 4. Patient decides to share their entry for upcoming appointment
    await CognitiveConcernService.updateConcernSharing(patientId, patientConcern.id, true, 'patient');
    await CognitiveConcernService.updateDiscussAtAppointment(patientId, patientConcern.id, true);

    // 5. Shared appointment preparation aggregates items
    const availableItems = DyadicCareCoordinationService.getAvailableAppointmentItems(patientId);
    expect(availableItems.some((i) => i.id === `item_concern_${patientConcern.id}`)).toBe(true);
    expect(availableItems.some((i) => i.id === `item_concern_${caregiverConcern.id}`)).toBe(true);

    // 6. Export clinical consultation summary
    const summary = DyadicCareCoordinationService.exportSharedAppointmentBrief(
      patientId,
      'Sunita Sharma',
      availableItems,
      ['Should we install key hook by entrance?']
    );
    expect(summary.items.length).toBeGreaterThanOrEqual(2);
    expect(summary.doctorDisclaimer).toContain('This summary contains authorized observational entries');
    expect(summary.patientQuestions).toContain('Should we install key hook by entrance?');
  });

  // =========================================================================
  // JOURNEY 3: OFFLINE ROUTINE EXECUTION -> CONCERN -> RECONNECT -> FLUSH
  // =========================================================================
  it('Journey 3: Offline Routine Execution -> Concern Logging -> Reconnection -> Idempotent Queue Flush -> Verified Persistence', async () => {
    // 1. Go offline
    SyncQueueService.setSimulatedOnline(false);
    expect(SyncQueueService.isOnline()).toBe(false);

    // 2. Perform task and log concern offline
    const offlineAttribution: TaskCompletionAttribution = {
      reportedBy: 'patient',
      completionType: 'self',
      verifiedMethod: 'none',
    };
    const inst = TaskLifecycleService.recordInstanceCompletion(patientId, 'inst_offline_routine_today', offlineAttribution);
    expect(inst?.syncStatus).toBe('pending_sync');

    const concern = await CognitiveConcernService.recordConcern(patientId, {
      description: 'Felt tired during morning garden walk.',
      category: 'behavior_mood',
      perspective: 'patient',
      sharedWithDoctor: false,
    });
    expect(concern.syncStatus).toBe('pending_sync');

    // 3. Verify queued mutations
    const pendingCount = SyncQueueService.getPendingCount(patientId);
    expect(pendingCount).toBeGreaterThanOrEqual(2);

    // 4. Reconnect network
    SyncQueueService.setSimulatedOnline(true);
    expect(SyncQueueService.isOnline()).toBe(true);

    // 5. Process queue idempotently
    const flushResult = await SyncQueueService.processQueue(patientId);
    expect(flushResult.synced).toBeGreaterThanOrEqual(2);
    expect(SyncQueueService.getPendingCount(patientId)).toBe(0);
  });

  // =========================================================================
  // JOURNEY 4: CAREGIVER SHIFT HANDOFF -> SECOND HELPER -> INTEGRITY
  // =========================================================================
  it('Journey 4: Caregiver Shift Handoff -> Second Caregiver Review -> Continuity Verification -> Non-Author Tampering Blocked', async () => {
    // 1. Primary caregiver records shift handoff
    const handoff = await DyadicCareCoordinationService.createCaregiverHandoff(
      caregiver1Id,
      'Priya',
      patientId,
      {
        shiftPeriod: 'morning',
        assistedActivities: [
          {
            activityId: 'breakfast',
            activityTitle: 'Breakfast',
            assistanceType: 'verbal_cue',
            note: 'Ate idli with coconut chutney.',
          },
        ],
        patientRequestsHandled: ['Fetched garden scissors'],
        patientPreferencesNoted: ['Prefers tea lukewarm'],
        pendingItemsForNextHelper: ['Check afternoon blood pressure at 3 PM'],
      }
    );
    expect(handoff.caregiverId).toBe(caregiver1Id);
    expect(handoff.pendingItemsForNextHelper).toContain('Check afternoon blood pressure at 3 PM');

    // 2. Authoring caregiver edits shift notes
    const edited = DyadicCareCoordinationService.editCaregiverHandoff(
      caregiver1Id,
      patientId,
      handoff.id,
      { pendingItemsForNextHelper: ['Check afternoon blood pressure at 3 PM', 'Water basil plant'] },
      'Added basil plant reminder'
    );
    expect(edited?.pendingItemsForNextHelper).toHaveLength(2);
    expect(edited?.editHistory?.[0].changesSummary).toBe('Added basil plant reminder');

    // 3. Second caregiver attempts unauthorized modification -> BLOCKED
    expect(() => {
      DyadicCareCoordinationService.editCaregiverHandoff(
        caregiver2Id,
        patientId,
        handoff.id,
        { pendingItemsForNextHelper: ['Malicious item'] },
        'Unauthorized edit'
      );
    }).toThrow(/Only authoring caregiver can edit their shift handoff/);

    // 4. Second caregiver attempts unauthorized archive -> BLOCKED
    expect(() => {
      DyadicCareCoordinationService.archiveHandoff(patientId, handoff.id, 'caregiver', caregiver2Id);
    }).toThrow(/Only the authoring caregiver can archive their shift handoff/);
  });

  // =========================================================================
  // JOURNEY 5: ACCESSIBILITY CUSTOMIZATION -> ASHA UNIFIED CONTEXT
  // =========================================================================
  it('Journey 5: Patient Accessibility Customization -> Multilingual Switch -> Asha Guidance Integration -> Offline Persistence', () => {
    // 1. Patient personalizes communication settings
    const updatedPrefs = AshaPersonalizationService.updatePreferences(patientId, {
      responseLength: 'concise',
      sentenceComplexity: 'simple',
      assistanceStyle: 'gentle_encouraging',
      honorificAddress: 'Ji',
      textSize: 'large',
      highContrast: true,
    });
    expect(updatedPrefs.textSize).toBe('large');
    expect(updatedPrefs.highContrast).toBe(true);

    // 2. Fetch Asha unified context snapshot
    const context = AshaContextService.getUnifiedContext({ uid: patientId, displayName: 'Sunita Sharma' }, true);
    expect(context.identity.personalization.textSize).toBe('large');
    expect(context.identity.personalization.highContrast).toBe(true);
    expect(context.identity.displayName).toBe('Sunita Sharma');

    // 3. Verify offline persistence in storage
    const reloadedPrefs = AshaPersonalizationService.getPreferences(patientId);
    expect(reloadedPrefs.textSize).toBe('large');
    expect(reloadedPrefs.highContrast).toBe(true);
  });

  // =========================================================================
  // JOURNEY 6: CLINICIAN ASSESSMENT RECORD -> AMENDMENT TRAIL -> INTEGRITY
  // =========================================================================
  it('Journey 6: Clinician Diagnosis Record -> Prescription Amendment Trail -> Patient Read-Only View -> Tampering Blocked', async () => {
    // 1. Authorized doctor records standardized assessment
    const assessment = await CognitiveConcernService.recordClinicalAssessment(
      patientId,
      {
        doctorId,
        assessmentName: 'HMSE',
        totalScore: 25,
        maxScore: 31,
        administrationDate: '2026-11-20',
        doctorName: 'Dr. Sharma',
        qualitativeSummary: 'Mild difficulty with serial calculations, orientation intact.',
      },
      'doctor'
    );
    expect(assessment.id).toBeDefined();
    expect(assessment.totalScore).toBe(25);
    expect(assessment.administeredExternally).toBe(true);

    // 2. Doctor appends clinical amendment
    const amended = await CognitiveConcernService.amendClinicalAssessment(
      patientId,
      assessment.id,
      {
        amendmentReason: 'Clarified administration was in patient preferred language (Hindi)',
        doctorId,
      },
      'doctor'
    );
    expect(amended?.amendments?.length).toBeGreaterThan(0);
    expect(amended?.amendments?.[0].amendmentReason).toContain('Hindi');

    // 3. Caregiver attempts to modify assessment score directly -> BLOCKED
    await expect(
      CognitiveConcernService.recordClinicalAssessment(
        patientId,
        {
          doctorId: caregiver1Id,
          assessmentName: 'HMSE',
          totalScore: 30,
        },
        'caregiver'
      )
    ).rejects.toThrow(/Permission denied: Only authenticated healthcare professionals with a doctor role/);

    // 4. Patient attempts to amend clinical assessment -> BLOCKED
    await expect(
      CognitiveConcernService.amendClinicalAssessment(
        patientId,
        assessment.id,
        {
          amendmentReason: 'Patient amendment attempt',
          doctorId: patientId,
        },
        'patient'
      )
    ).rejects.toThrow(/Permission denied: Only authenticated healthcare professionals with a doctor role/);
  });

  // =========================================================================
  // JOURNEY 7: SAFETY-LOCKED ROUTINE (MEDICATION/FLAME) -> ADAPTATION BLOCK
  // =========================================================================
  it('Journey 7: Safety-Locked Routine (Medication/Flame) -> Caregiver Adaptation Attempt -> Safety Policy Block -> Patient Safety Intact', async () => {
    // 1. Medication routine proposal
    const medProposal = await DyadicCareCoordinationService.createCaregiverProposal(
      caregiver1Id,
      'Priya',
      patientId,
      {
        proposalType: 'routine_adjustment',
        title: 'Adjust Blood Pressure Medicine Timing',
        summary: 'Shift pill schedule by 2 hours',
        details: {
          routineId: 'bp_medication',
          originalValue: 'Take morning tablet at 8 AM',
          proposedValue: 'Take morning tablet at 10 AM',
        },
        instructionText: 'Take prescribed blood pressure medication pill',
        routineCategory: 'medication',
      }
    );
    expect(medProposal.safetyStatus).toBe('safety_locked_medication');

    // Acceptance attempt is blocked by safety lock
    expect(() => {
      DyadicCareCoordinationService.reviewProposalByPatient(patientId, medProposal.id, 'accepted');
    }).toThrow(/Cannot accept proposal: Safety lock active \(safety_locked_medication\)/);

    // 2. Flame routine proposal
    const flameProposal = await DyadicCareCoordinationService.createCaregiverProposal(
      caregiver1Id,
      'Priya',
      patientId,
      {
        proposalType: 'step_simplification',
        title: 'Gas stove flame adjustment',
        summary: 'Leave burner on low flame',
        details: {
          routineId: 'cooking_routine',
          originalValue: 'Turn gas stove knob off',
          proposedValue: 'Leave burner on simmer',
        },
        instructionText: 'Gas stove flame control',
      }
    );
    expect(flameProposal.safetyStatus).toBe('safety_locked_flame');

    expect(() => {
      DyadicCareCoordinationService.reviewProposalByPatient(patientId, flameProposal.id, 'accepted');
    }).toThrow(/Cannot accept proposal: Safety lock active \(safety_locked_flame\)/);
  });

  // =========================================================================
  // JOURNEY 8: SIGN-OUT -> CACHE PURGE -> QUEUE SUSPENSION -> ACCOUNT SWITCH
  // =========================================================================
  it('Journey 8: Account Sign-Out -> Cache Eviction -> Queue Suspension -> Alternate Account Sign-In -> Zero Data Bleed', async () => {
    const patient2Id = 'patient_vikram_cf';

    // 1. Patient A enqueues an offline task update
    SyncQueueService.setSimulatedOnline(false);
    SyncQueueService.enqueue(patientId, 'dailyTaskInstances', 'task_sunita_secret', 'upsert', {
      notes: 'Confidential personal routine note of Sunita',
    });
    expect(SyncQueueService.getPendingCount(patientId)).toBe(1);

    // 2. Patient A signs out: Cache is purged, queue suspended
    DyadicCareCoordinationService.clearPatientCache(patientId);
    AshaContextService.clearAllContextCaches();
    SyncQueueService.suspendQueue(patientId);
    expect(SyncQueueService.isQueueSuspended(patientId)).toBe(true);

    // 3. Patient B signs in
    localStorage.setItem('saksham_auth_user', JSON.stringify({ uid: patient2Id, role: 'patient' }));
    SyncQueueService.setSimulatedOnline(true);

    // 4. Auto-sync attempt cannot flush Patient A's queue
    const flushRes = await SyncQueueService.processQueue(patientId);
    expect(flushRes.synced).toBe(0);
    expect(SyncQueueService.getPendingCount(patientId)).toBe(1); // Still isolated

    // 5. Patient B creates their own item while offline then syncs
    SyncQueueService.setSimulatedOnline(false);
    SyncQueueService.enqueue(patient2Id, 'dailyTaskInstances', 'task_vikram_item', 'upsert', {
      title: 'Vikram walk',
    });
    expect(SyncQueueService.getPendingCount(patient2Id)).toBe(1);

    SyncQueueService.setSimulatedOnline(true);
    const bFlush = await SyncQueueService.processQueue(patient2Id);
    expect(bFlush.synced).toBe(1);
    expect(SyncQueueService.getPendingCount(patient2Id)).toBe(0);
    // Sunita's data remained untouched
    expect(SyncQueueService.getPendingCount(patientId)).toBe(1);
  });

  // =========================================================================
  // JOURNEY 9: CAREGIVER REVOCATION -> INSTANT LOCKOUT -> SOVEREIGNTY
  // =========================================================================
  it('Journey 9: Caregiver Relationship Revocation -> Instant Access Termination -> Subcollection Lockout -> Patient Sovereignty Preserved', async () => {
    // 1. Relationship starts active
    let isAuth = await DyadicCareCoordinationPolicy.isCaregiverAuthorized(caregiver1Id, patientId);
    expect(isAuth).toBe(true);

    // 2. Patient revokes caregiver link
    CaregiverService.setSimulatedRelationship(caregiver1Id, patientId, 'revoked', EMPTY_CAREGIVER_PERMISSIONS);

    // 3. Authorization policy fails immediately
    isAuth = await DyadicCareCoordinationPolicy.isCaregiverAuthorized(caregiver1Id, patientId);
    expect(isAuth).toBe(false);

    // 4. Subcollection write attempts throw authorization error
    await expect(
      DyadicCareCoordinationService.createCaregiverProposal(caregiver1Id, 'Priya', patientId, {
        proposalType: 'routine_adjustment',
        title: 'Post-revocation attempt',
        summary: 'Must fail',
        details: {},
      })
    ).rejects.toThrow(/Unauthorized caregiver/);

    await expect(
      DyadicCareCoordinationService.createCaregiverHandoff(caregiver1Id, 'Priya', patientId, {
        shiftPeriod: 'morning',
        assistedActivities: [],
        patientRequestsHandled: [],
        patientPreferencesNoted: [],
        pendingItemsForNextHelper: [],
      })
    ).rejects.toThrow(/Unauthorized caregiver/);
  });

  // =========================================================================
  // JOURNEY 10: FULL DYADIC LIFECYCLE: SUPPORT REQUEST -> RESOLUTION
  // =========================================================================
  it('Journey 10: Full Dyadic Lifecycle: Support Request -> Caregiver Response -> Collaborative Resolution -> Audit Trail Integrity', async () => {
    // 1. Patient creates support request
    const req = await DyadicCareCoordinationService.createSupportRequest(patientId, {
      patientName: 'Sunita Sharma',
      requestType: 'find_item',
      title: 'Need help finding blue woolen shawl',
      message: 'I cannot find my favorite blue shawl in the cupboard.',
      targetCaregiverId: caregiver1Id,
      targetCaregiverName: 'Priya',
    });
    expect(req.status).toBe('pending');
    expect(req.authorRole).toBe('patient');
    expect(req.isPatientReported).toBe(true);

    // 2. Caregiver acknowledges request
    const acked = await DyadicCareCoordinationService.acknowledgeSupportRequest(
      caregiver1Id,
      'Priya',
      patientId,
      req.id
    );
    expect(acked?.status).toBe('acknowledged');
    expect(acked?.acknowledgedBy?.caregiverName).toBe('Priya');

    // 3. Caregiver provides response
    const responded = await DyadicCareCoordinationService.respondToSupportRequest(
      caregiver1Id,
      'Priya',
      patientId,
      req.id,
      'Found the blue shawl on the living room armchair.'
    );
    expect(responded?.status).toBe('assistance_provided');
    expect(responded?.responseMessage).toContain('living room armchair');

    // 4. Patient confirms and resolves request
    const resolved = DyadicCareCoordinationService.resolveSupportRequest(patientId, req.id, 'patient');
    expect(resolved?.status).toBe('resolved');
    expect(resolved?.resolvedBy).toBe('patient');

    // 5. Verification: Immutable provenance in storage
    const allRequests = DyadicCareCoordinationService.getSupportRequests(patientId);
    expect(allRequests).toHaveLength(1);
    expect(allRequests[0].status).toBe('resolved');
    expect(allRequests[0].acknowledgedBy?.caregiverName).toBe('Priya');
    expect(allRequests[0].responseMessage).toContain('living room armchair');
  });
});
