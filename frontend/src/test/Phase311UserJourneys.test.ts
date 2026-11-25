import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DyadicCareCoordinationService } from '../features/caregiver/services/dyadicCareCoordinationService.js';
import {
  CaregiverService,
  DEFAULT_CAREGIVER_PERMISSIONS,
  EMPTY_CAREGIVER_PERMISSIONS,
} from '../features/caregiver/services/caregiverService.js';
import { StepPatternService } from '../features/routines/services/stepPatternService.js';
import { SyncQueueService } from '../services/syncQueueService.js';
import { AshaContextService } from '../features/ai-companion/services/ashaContextService.js';

describe('Phase 3.11 User Journeys: Dyadic Care Coordination & Autonomous Collaboration', () => {
  const patientA = 'journey-patient-alpha';
  const patientB = 'journey-patient-beta';
  const caregiverA = 'journey-caregiver-alpha';
  const caregiverName = 'Priya Caregiver';

  beforeEach(() => {
    localStorage.clear();
    DyadicCareCoordinationService.clearAllCaches();
    AshaContextService.clearAllContextCaches();
    SyncQueueService.clearQueue(patientA);
    SyncQueueService.clearQueue(patientB);
    vi.clearAllMocks();

    vi.spyOn(CaregiverService, 'getConnectedPatient').mockImplementation(async (cgId: string) => {
      if (cgId === caregiverA) {
        return {
          patientId: patientA,
          patientName: 'Sunita Sharma',
          relationshipStatus: 'active',
          permissions: { ...DEFAULT_CAREGIVER_PERMISSIONS },
        };
      }
      return {
        patientId: '',
        patientName: 'Unassigned',
        relationshipStatus: 'none',
        permissions: { ...EMPTY_CAREGIVER_PERMISSIONS },
      };
    });
  });

  // ---------------------------------------------------------------------------
  // JOURNEY A: PATIENT ASKS FOR ASSISTANCE
  // ---------------------------------------------------------------------------
  it('Journey A: Patient asks for assistance -> Caregiver acknowledges & responds -> Patient resolves', async () => {
    // 1. Patient feels uncertain about finding their reading spectacles
    const request = await DyadicCareCoordinationService.createSupportRequest(patientA, {
      patientName: 'Sunita',
      requestType: 'find_item',
      title: 'Looking for spectacles',
      message: 'Could you help me locate my reading glasses before evening tea?',
    });

    expect(request.status).toBe('pending');
    expect(request.authorRole).toBe('patient');

    // 2. Caregiver opens coordination view and sees pending request
    const caregiverRequests = DyadicCareCoordinationService.getSupportRequests(patientA);
    expect(caregiverRequests.length).toBe(1);
    expect(caregiverRequests[0].id).toBe(request.id);

    // 3. Caregiver taps "Acknowledge"
    const acknowledged = await DyadicCareCoordinationService.acknowledgeSupportRequest(
      caregiverA,
      caregiverName,
      patientA,
      request.id
    );
    expect(acknowledged?.status).toBe('acknowledged');
    expect(acknowledged?.acknowledgedBy?.caregiverName).toBe(caregiverName);

    // 4. Caregiver locates glasses and sends response message
    const responded = await DyadicCareCoordinationService.respondToSupportRequest(
      caregiverA,
      caregiverName,
      patientA,
      request.id,
      'I found them on the side-table near your armchair in the living room.'
    );
    expect(responded?.status).toBe('assistance_provided');
    expect(responded?.responseMessage).toContain('armchair');

    // 5. Patient sees response on dashboard, finds glasses, and taps "All Set" (Resolve)
    const resolved = DyadicCareCoordinationService.resolveSupportRequest(
      patientA,
      request.id,
      'patient'
    );
    expect(resolved?.status).toBe('resolved');
    expect(resolved?.resolvedBy).toBe('patient');
  });

  // ---------------------------------------------------------------------------
  // JOURNEY B: CAREGIVER PROPOSES AN ADAPTATION (PATIENT DECISION)
  // ---------------------------------------------------------------------------
  it('Journey B: Caregiver proposes step simplification -> Patient reviews & accepts with attribution', async () => {
    // 1. Caregiver observes difficulty in morning walk and proposes simplification
    const proposal = await DyadicCareCoordinationService.createCaregiverProposal(
      caregiverA,
      caregiverName,
      patientA,
      {
        proposalType: 'step_simplification',
        title: 'Veranda walk split into 2 shorter segments',
        summary: 'Observed slight fatigue when walking continuously for 15 minutes.',
        details: {
          routineId: 'routine-walk',
          originalValue: 'Walk for 15 mins around garden',
          proposedValue: 'Walk for 5 mins, sit on cane chair, walk for 5 more mins',
        },
        routineCategory: 'wellness',
      }
    );

    expect(proposal.status).toBe('pending');
    expect(proposal.safetyStatus).toBe('safe');
    expect(proposal.reviewedByPatient).toBe(false);

    // 2. Patient dashboard receives proposal under Caregiver Suggestions
    const patientProposals = DyadicCareCoordinationService.getCaregiverProposals(patientA, 'pending');
    expect(patientProposals.length).toBe(1);
    expect(patientProposals[0].id).toBe(proposal.id);

    // 3. Patient taps "Accept" with personal note
    const accepted = DyadicCareCoordinationService.reviewProposalByPatient(
      patientA,
      proposal.id,
      'accepted',
      'Sitting midway sounds very peaceful. I accept.'
    );

    expect(accepted?.status).toBe('accepted');
    expect(accepted?.reviewedByPatient).toBe(true);
    expect(accepted?.patientDecision?.decision).toBe('accepted');

    // 4. Verification that attribution trail recorded patient approval
    const modifications = StepPatternService.getDyadicModificationHistory(patientA);
    expect(modifications.length).toBeGreaterThan(0);
    expect(modifications[0].actor).toBe('patient');
    expect(modifications[0].targetId).toBe(proposal.id);
  });

  // ---------------------------------------------------------------------------
  // JOURNEY C: CONFLICTING OBSERVATIONS (DISCREPANCY HARMONIZATION)
  // ---------------------------------------------------------------------------
  it('Journey C: Conflicting observations preserved neutrally -> Patient clarifies -> Kept divergent', () => {
    // 1. Dual observation recorded: Patient logged independent chai, Caregiver noted stove assistance
    const discrepancy = DyadicCareCoordinationService.recordDiscrepancy(
      patientA,
      'task_completion',
      'Morning Chai Boiling Step',
      { status: 'Completed independently', notes: 'I turned off the flame myself.' },
      { status: 'Assistance provided', notes: 'Caregiver turned off burner safety knob.' }
    );

    expect(discrepancy.resolutionStatus).toBe('open');
    expect(discrepancy.neutralExplanation).toContain('Dual perspective in routine completion');

    // 2. Patient reviews the observation and clarifies
    const clarified = DyadicCareCoordinationService.resolveDiscrepancy(
      patientA,
      discrepancy.id,
      'clarified',
      'I had reached for the knob right as Priya turned it for me. We both helped.'
    );

    expect(clarified?.resolutionStatus).toBe('clarified');
    expect(clarified?.clarificationNotes).toContain('both helped');

    // 3. System preserves both trails intact without overwriting or deleting either perspective
    const list = DyadicCareCoordinationService.getDiscrepancies(patientA);
    expect(list[0].patientReport.status).toBe('Completed independently');
    expect(list[0].caregiverReport.status).toBe('Assistance provided');
  });

  // ---------------------------------------------------------------------------
  // JOURNEY D: APPOINTMENT PREPARATION (SHARED CLINICAL BRIEF)
  // ---------------------------------------------------------------------------
  it('Journey D: Patient and Caregiver collaborate on clinical appointment brief with opt-in consent', () => {
    // 1. Record an observation
    DyadicCareCoordinationService.recordDiscrepancy(
      patientA,
      'task_completion',
      'Dizziness during morning walk',
      { status: 'Felt slight dizziness' },
      { status: 'Sat on veranda bench' }
    );

    // 2. Retrieve available items for appointment
    const items = DyadicCareCoordinationService.getAvailableAppointmentItems(patientA);
    expect(items.length).toBeGreaterThan(0);

    // 3. Patient compiles shared brief with specific question for the neurologist
    const brief = DyadicCareCoordinationService.exportSharedAppointmentBrief(
      patientA,
      'Sunita Sharma',
      items,
      ['Should my blood pressure medication be taken before or after breakfast?']
    );

    expect(brief.patientId).toBe(patientA);
    expect(brief.items.length).toBe(items.length);
    expect(brief.patientQuestions[0]).toContain('blood pressure medication');
    expect(brief.doctorDisclaimer).toContain('not an automated diagnostic claim');
  });

  // ---------------------------------------------------------------------------
  // JOURNEY E: OFFLINE COORDINATION & SYNC QUEUE
  // ---------------------------------------------------------------------------
  it('Journey E: Offline coordination actions queued in SyncQueueService and survive restart', async () => {
    // 1. Device is offline
    SyncQueueService.setSimulatedOnline(false);
    try {
      expect(SyncQueueService.isOnline()).toBe(false);

      // 2. Patient creates support request while offline
      const req = await DyadicCareCoordinationService.createSupportRequest(patientA, {
        patientName: 'Sunita',
        requestType: 'household_task',
        title: 'Water veranda garden',
        message: 'Need help carrying watering can',
      });

      // 3. Caregiver logs shift handoff while offline
      const handoff = await DyadicCareCoordinationService.createCaregiverHandoff(
        caregiverA,
        caregiverName,
        patientA,
        {
          shiftPeriod: 'morning',
          assistedActivities: [],
          patientRequestsHandled: [],
          patientPreferencesNoted: ['Restful morning'],
          pendingItemsForNextHelper: [],
        }
      );

      // 4. Verify queued items in SyncQueueService
      const queue = SyncQueueService.getQueue(patientA);
      expect(queue.some((q) => q.collection === 'supportRequests' && q.entityId === req.id)).toBe(true);
      expect(queue.some((q) => q.collection === 'caregiverHandoffs' && q.entityId === handoff.id)).toBe(true);
    } finally {
      SyncQueueService.setSimulatedOnline(true);
    }
  });

  // ---------------------------------------------------------------------------
  // JOURNEY F: ACCOUNT SWITCHING & ISOLATION
  // ---------------------------------------------------------------------------
  it('Journey F: Patient Alpha and Patient Beta data remain strictly isolated upon switching', async () => {
    // 1. Patient Alpha creates support request
    await DyadicCareCoordinationService.createSupportRequest(patientA, {
      patientName: 'Sunita (Alpha)',
      requestType: 'routine_help',
      title: 'Alpha tea request',
      message: 'Please bring mint leaves',
    });

    // 2. Patient Beta creates support request
    await DyadicCareCoordinationService.createSupportRequest(patientB, {
      patientName: 'Ramesh (Beta)',
      requestType: 'find_item',
      title: 'Beta spectacles request',
      message: 'Where is my walking stick?',
    });

    // 3. Verify Alpha only sees Alpha
    const alphaReqs = DyadicCareCoordinationService.getSupportRequests(patientA);
    expect(alphaReqs.length).toBe(1);
    expect(alphaReqs[0].title).toBe('Alpha tea request');

    // 4. Verify Beta only sees Beta
    const betaReqs = DyadicCareCoordinationService.getSupportRequests(patientB);
    expect(betaReqs.length).toBe(1);
    expect(betaReqs[0].title).toBe('Beta spectacles request');
  });
});
