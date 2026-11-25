import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DyadicCareCoordinationService } from '../features/caregiver/services/dyadicCareCoordinationService.js';
import { DyadicCareCoordinationPolicy } from '../features/caregiver/services/dyadicCareCoordinationPolicy.js';
import {
  CaregiverService,
  DEFAULT_CAREGIVER_PERMISSIONS,
  EMPTY_CAREGIVER_PERMISSIONS,
} from '../features/caregiver/services/caregiverService.js';
import { StepPatternService } from '../features/routines/services/stepPatternService.js';
import { SyncQueueService } from '../services/syncQueueService.js';
import { AshaContextService } from '../features/ai-companion/services/ashaContextService.js';
import { PatientSharedCareView } from '../features/caregiver/components/PatientSharedCareView.js';
import { CaregiverDyadicCoordinationView } from '../features/caregiver/components/CaregiverDyadicCoordinationView.js';
import { RoutineItem } from '../types/index.js';

describe('Phase 3.11: Dyadic Care Coordination, Shared Support & Patient Autonomy', () => {
  const patientA = 'patient_anveshan_alpha';
  const patientB = 'patient_anveshan_beta';
  const caregiverUid = 'caregiver_priya_01';
  const caregiverName = 'Priya Sharma';

  const mockRoutines: RoutineItem[] = [
    {
      id: 'routine-tea',
      title: 'Prepare Morning Chai',
      description: 'Boil water on the stove and add ginger tea leaves.',
      category: 'food',
      period: 'morning',
      scheduledTime: '07:30 AM',
      timerMinutes: 10,
      streakCount: 0,
      enableAssistedRecall: false,
      isCompleted: false,
    },
    {
      id: 'routine-meds',
      title: 'Blood Pressure Medication',
      description: 'Take 1 pill of Telmisartan with plain water.',
      category: 'medication',
      period: 'morning',
      scheduledTime: '08:00 AM',
      timerMinutes: 5,
      streakCount: 0,
      enableAssistedRecall: false,
      isCompleted: false,
    },
    {
      id: 'routine-walk',
      title: 'Garden Walk',
      description: 'Gentle walk around the veranda flower pots.',
      category: 'wellness',
      period: 'morning',
      scheduledTime: '08:30 AM',
      timerMinutes: 15,
      streakCount: 0,
      enableAssistedRecall: false,
      isCompleted: false,
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    DyadicCareCoordinationService.clearAllCaches();
    AshaContextService.clearAllContextCaches();
    SyncQueueService.clearQueue(patientA);
    SyncQueueService.clearQueue(patientB);
    vi.clearAllMocks();

    // Default mock: Caregiver is linked to patientA
    vi.spyOn(CaregiverService, 'getConnectedPatient').mockImplementation(async (cgId: string) => {
      if (cgId === caregiverUid) {
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
  // 1. PATIENT SUPPORT REQUESTS LIFECYCLE
  // ---------------------------------------------------------------------------
  describe('1. Patient Support Requests Lifecycle', () => {
    it('1. patient creates a support request with typed category and message', async () => {
      const req = await DyadicCareCoordinationService.createSupportRequest(patientA, {
        patientName: 'Sunita',
        requestType: 'find_item',
        title: 'Need reading spectacles',
        message: 'Could you help me find where my reading glasses are?',
      });

      expect(req.id).toBeDefined();
      expect(req.status).toBe('pending');
      expect(req.requestType).toBe('find_item');
      expect(req.message).toContain('reading glasses');
    });

    it('2. support request provenance record stamps patient authority correctly', async () => {
      const req = await DyadicCareCoordinationService.createSupportRequest(patientA, {
        patientName: 'Sunita',
        requestType: 'routine_help',
        title: 'Chai step help',
        message: 'Can you check if the stove is turned off?',
      });

      expect(req.authorRole).toBe('patient');
      expect(req.isPatientReported).toBe(true);
      expect(req.isCaregiverReported).toBe(false);
      expect(req.isIndependentlyVerified).toBe(false);
      expect(req.consentState).toBe('shared_with_caregiver');
    });

    it('3. retrieves patient support requests from persistence', async () => {
      await DyadicCareCoordinationService.createSupportRequest(patientA, {
        patientName: 'Sunita',
        requestType: 'household_task',
        title: 'Water plants',
        message: 'Could we water the veranda plants together?',
      });

      const list = DyadicCareCoordinationService.getSupportRequests(patientA);
      expect(list.length).toBe(1);
      expect(list[0].title).toBe('Water plants');
    });

    it('4. filters support requests by target caregiver when assigned', async () => {
      await DyadicCareCoordinationService.createSupportRequest(patientA, {
        patientName: 'Sunita',
        requestType: 'general_support',
        title: 'Specific Request',
        message: 'For Priya only',
        targetCaregiverId: caregiverUid,
      });

      await DyadicCareCoordinationService.createSupportRequest(patientA, {
        patientName: 'Sunita',
        requestType: 'general_support',
        title: 'Other Request',
        message: 'For Vikram only',
        targetCaregiverId: 'caregiver_vikram_99',
      });

      const forPriya = DyadicCareCoordinationService.getSupportRequests(patientA, caregiverUid);
      expect(forPriya.some((r) => r.title === 'Specific Request')).toBe(true);
      expect(forPriya.some((r) => r.title === 'Other Request')).toBe(false);
    });

    it('5. authorized caregiver acknowledges pending support request', async () => {
      const req = await DyadicCareCoordinationService.createSupportRequest(patientA, {
        patientName: 'Sunita',
        requestType: 'routine_help',
        title: 'Morning routine help',
        message: 'Can you assist me with the morning tea?',
      });

      const ack = await DyadicCareCoordinationService.acknowledgeSupportRequest(
        caregiverUid,
        caregiverName,
        patientA,
        req.id
      );

      expect(ack).not.toBeNull();
      expect(ack?.status).toBe('acknowledged');
      expect(ack?.acknowledgedBy?.caregiverId).toBe(caregiverUid);
      expect(ack?.acknowledgedAt).toBeDefined();
    });

    it('6. unauthorized caregiver cannot acknowledge support request', async () => {
      const req = await DyadicCareCoordinationService.createSupportRequest(patientA, {
        patientName: 'Sunita',
        requestType: 'find_item',
        title: 'Help',
        message: 'Glasses misplaced',
      });

      await expect(
        DyadicCareCoordinationService.acknowledgeSupportRequest(
          'unauthorized_caregiver_x',
          'Intruder',
          patientA,
          req.id
        )
      ).rejects.toThrow(/Unauthorized/);
    });

    it('7. authorized caregiver provides assistance response note', async () => {
      const req = await DyadicCareCoordinationService.createSupportRequest(patientA, {
        patientName: 'Sunita',
        requestType: 'find_item',
        title: 'Spectacles search',
        message: 'Where are my glasses?',
      });

      const res = await DyadicCareCoordinationService.respondToSupportRequest(
        caregiverUid,
        caregiverName,
        patientA,
        req.id,
        'I placed them on your study table beside the notebook.'
      );

      expect(res?.status).toBe('assistance_provided');
      expect(res?.responseMessage).toContain('study table');
    });

    it('8. patient marks support request as resolved', async () => {
      const req = await DyadicCareCoordinationService.createSupportRequest(patientA, {
        patientName: 'Sunita',
        requestType: 'general_support',
        title: 'Quick question',
        message: 'All done now.',
      });

      const resolved = DyadicCareCoordinationService.resolveSupportRequest(
        patientA,
        req.id,
        'patient'
      );
      expect(resolved?.status).toBe('resolved');
      expect(resolved?.resolvedBy).toBe('patient');
    });

    it('9. patient cancels support request', async () => {
      const req = await DyadicCareCoordinationService.createSupportRequest(patientA, {
        patientName: 'Sunita',
        requestType: 'general_support',
        title: 'Nevermind',
        message: 'I found my keys myself.',
      });

      const cancelled = DyadicCareCoordinationService.cancelSupportRequest(
        patientA,
        req.id,
        'Found keys independently'
      );
      expect(cancelled?.status).toBe('cancelled');
      expect(cancelled?.cancellationReason).toContain('independently');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. CAREGIVER PROPOSALS, SAFETY LOCKS & PATIENT DECISION AUTHORITY
  // ---------------------------------------------------------------------------
  describe('2. Caregiver Proposals, Safety Locks & Patient Decision Authority', () => {
    it('10. evaluateSafetyLock identifies medication tasks as safety_locked_medication', () => {
      const lock1 = DyadicCareCoordinationPolicy.evaluateSafetyLock(
        'medication',
        'Take morning pills',
        false
      );
      expect(lock1).toBe('safety_locked_medication');

      const lock2 = DyadicCareCoordinationPolicy.evaluateSafetyLock(
        'wellness',
        'Check insulin dosage',
        false
      );
      expect(lock2).toBe('safety_locked_medication');
    });

    it('11. evaluateSafetyLock identifies gas/stove/flame tasks as safety_locked_flame', () => {
      const lock = DyadicCareCoordinationPolicy.evaluateSafetyLock(
        'nutrition',
        'Light the gas burner on the kitchen stove',
        false
      );
      expect(lock).toBe('safety_locked_flame');
    });

    it('12. evaluateSafetyLock identifies clinician-prescribed tasks as clinician_prescribed_locked', () => {
      const lock = DyadicCareCoordinationPolicy.evaluateSafetyLock(
        'cognition',
        'Doctor prescribed memory exercise',
        true
      );
      expect(lock).toBe('clinician_prescribed_locked');
    });

    it('13. evaluateSafetyLock returns safe for everyday benign tasks', () => {
      const lock = DyadicCareCoordinationPolicy.evaluateSafetyLock(
        'wellness',
        'Sit on the veranda chair and relax',
        false
      );
      expect(lock).toBe('safe');
    });

    it('14. authorized caregiver creates proposal with details and evaluated safety status', async () => {
      const proposal = await DyadicCareCoordinationService.createCaregiverProposal(
        caregiverUid,
        caregiverName,
        patientA,
        {
          proposalType: 'step_simplification',
          title: 'Break veranda walk into two short strolls',
          summary: 'Noticed breathlessness after 10 minutes.',
          details: {
            routineId: 'routine-walk',
            originalValue: 'Gentle walk around the veranda flower pots for 15 mins.',
            proposedValue: 'Take a 5-minute stroll, rest on the bench, then 5 more minutes.',
          },
          routineCategory: 'wellness',
          instructionText: 'Walk around veranda',
        }
      );

      expect(proposal.id).toBeDefined();
      expect(proposal.status).toBe('pending');
      expect(proposal.safetyStatus).toBe('safe');
      expect(proposal.authorRole).toBe('caregiver');
    });

    it('15. unauthorized caregiver cannot create proposal', async () => {
      await expect(
        DyadicCareCoordinationService.createCaregiverProposal(
          'unauthorized_caregiver_99',
          'Stranger',
          patientA,
          {
            proposalType: 'step_simplification',
            title: 'Unauthorized change',
            summary: 'Hack',
            details: {},
          }
        )
      ).rejects.toThrow(/Unauthorized/);
    });

    it('16. duplicate pending proposal on same routine and step is rejected', async () => {
      await DyadicCareCoordinationService.createCaregiverProposal(
        caregiverUid,
        caregiverName,
        patientA,
        {
          proposalType: 'step_simplification',
          title: 'Walk adaptation 1',
          summary: 'First recommendation',
          details: { routineId: 'routine-walk', stepIndex: 0 },
        }
      );

      await expect(
        DyadicCareCoordinationService.createCaregiverProposal(
          caregiverUid,
          caregiverName,
          patientA,
          {
            proposalType: 'step_simplification',
            title: 'Walk adaptation 2',
            summary: 'Second recommendation',
            details: { routineId: 'routine-walk', stepIndex: 0 },
          }
        )
      ).rejects.toThrow(/already exists/);
    });

    it('17. retrieves caregiver proposals and filters by status', async () => {
      await DyadicCareCoordinationService.createCaregiverProposal(
        caregiverUid,
        caregiverName,
        patientA,
        {
          proposalType: 'additional_cues',
          title: 'Add visual cue to shoes',
          summary: 'Place bright sticker on shoes',
          details: { routineId: 'routine-shoes' },
        }
      );

      const all = DyadicCareCoordinationService.getCaregiverProposals(patientA);
      expect(all.length).toBe(1);

      const acceptedOnly = DyadicCareCoordinationService.getCaregiverProposals(patientA, 'accepted');
      expect(acceptedOnly.length).toBe(0);
    });

    it('18. patient accepts valid proposal and attribution is recorded in StepPatternService', async () => {
      const prop = await DyadicCareCoordinationService.createCaregiverProposal(
        caregiverUid,
        caregiverName,
        patientA,
        {
          proposalType: 'step_simplification',
          title: 'Simplify veranda walk',
          summary: 'Sit midway',
          details: {
            routineId: 'routine-walk',
            originalValue: 'Walk for 15 mins',
            proposedValue: 'Walk for 5 mins, sit for 2 mins, walk for 5 mins',
          },
          routineCategory: 'wellness',
        }
      );

      const accepted = DyadicCareCoordinationService.reviewProposalByPatient(
        patientA,
        prop.id,
        'accepted',
        'I like this idea, it feels gentler.'
      );

      expect(accepted?.status).toBe('accepted');
      expect(accepted?.reviewedByPatient).toBe(true);
      expect(accepted?.patientDecision?.decision).toBe('accepted');
      expect(accepted?.patientDecision?.patientNote).toContain('feels gentler');

      // Verify attribution was recorded
      const history = StepPatternService.getDyadicModificationHistory(patientA);
      expect(history.some((h) => h.actor === 'patient' && h.targetId === prop.id)).toBe(true);
    });

    it('19. patient cannot accept safety-locked proposal (fails closed)', async () => {
      const prop = await DyadicCareCoordinationService.createCaregiverProposal(
        caregiverUid,
        caregiverName,
        patientA,
        {
          proposalType: 'routine_adjustment',
          title: 'Shift blood pressure pill timing',
          summary: 'Move pill from morning to bedtime',
          details: {
            routineId: 'routine-meds',
            originalValue: 'Take in morning',
            proposedValue: 'Take at night',
          },
          routineCategory: 'medication',
          instructionText: 'Blood pressure medication dosage Telmisartan',
        }
      );

      expect(prop.safetyStatus).toBe('safety_locked_medication');

      expect(() => {
        DyadicCareCoordinationService.reviewProposalByPatient(patientA, prop.id, 'accepted');
      }).toThrow(/Safety lock active/);
    });

    it('20. patient declines proposal and familiar routine remains unchanged', async () => {
      const prop = await DyadicCareCoordinationService.createCaregiverProposal(
        caregiverUid,
        caregiverName,
        patientA,
        {
          proposalType: 'additional_cues',
          title: 'Extra reminder bells',
          summary: 'Add chime every 5 minutes',
          details: { routineId: 'routine-chime' },
          routineCategory: 'wellness',
        }
      );

      const declined = DyadicCareCoordinationService.reviewProposalByPatient(
        patientA,
        prop.id,
        'declined',
        'The chimes are too loud for me.'
      );

      expect(declined?.status).toBe('declined');
      expect(declined?.reviewedByPatient).toBe(true);
    });

    it('21. patient defers proposal (Review Later) without auto-accepting', async () => {
      const prop = await DyadicCareCoordinationService.createCaregiverProposal(
        caregiverUid,
        caregiverName,
        patientA,
        {
          proposalType: 'step_simplification',
          title: 'Reorganize books',
          summary: 'Sort by color',
          details: { routineId: 'routine-books' },
          routineCategory: 'wellness',
        }
      );

      const deferred = DyadicCareCoordinationService.reviewProposalByPatient(
        patientA,
        prop.id,
        'deferred'
      );

      expect(deferred?.status).toBe('deferred');
      expect(deferred?.reviewedByPatient).toBe(false); // Stays pending active review
    });

    it('22. caregiver withdraws their own pending proposal', async () => {
      const prop = await DyadicCareCoordinationService.createCaregiverProposal(
        caregiverUid,
        caregiverName,
        patientA,
        {
          proposalType: 'routine_adjustment',
          title: 'Shift breakfast',
          summary: 'Proposal withdrawn after family talk',
          details: {},
          routineCategory: 'food',
        }
      );

      const withdrawn = DyadicCareCoordinationService.withdrawProposalByCaregiver(
        caregiverUid,
        patientA,
        prop.id
      );

      expect(withdrawn?.status).toBe('withdrawn');
    });

    it('23. caregiver cannot withdraw another caregiver proposal', async () => {
      const prop = await DyadicCareCoordinationService.createCaregiverProposal(
        caregiverUid,
        caregiverName,
        patientA,
        {
          proposalType: 'household_support',
          title: 'Priya proposal',
          summary: 'Notes',
          details: {},
        }
      );

      expect(() => {
        DyadicCareCoordinationService.withdrawProposalByCaregiver(
          'other_caregiver_44',
          patientA,
          prop.id
        );
      }).toThrow(/Only the authoring caregiver/);
    });

    it('24. cannot withdraw an already accepted proposal', async () => {
      const prop = await DyadicCareCoordinationService.createCaregiverProposal(
        caregiverUid,
        caregiverName,
        patientA,
        {
          proposalType: 'household_support',
          title: 'Music routine',
          summary: 'Listen to sitar music',
          details: {},
        }
      );

      DyadicCareCoordinationService.reviewProposalByPatient(patientA, prop.id, 'accepted');

      expect(() => {
        DyadicCareCoordinationService.withdrawProposalByCaregiver(
          caregiverUid,
          patientA,
          prop.id
        );
      }).toThrow(/Cannot withdraw an already reviewed/);
    });

    it('25. patient reverts previously accepted proposal restoring baseline routine', async () => {
      const prop = await DyadicCareCoordinationService.createCaregiverProposal(
        caregiverUid,
        caregiverName,
        patientA,
        {
          proposalType: 'step_simplification',
          title: 'Morning stretch',
          summary: 'Simplified stretch',
          details: {
            routineId: 'routine-stretch',
            originalValue: '5 full body stretches',
            proposedValue: '2 seated arm stretches',
          },
          routineCategory: 'wellness',
        }
      );

      DyadicCareCoordinationService.reviewProposalByPatient(patientA, prop.id, 'accepted');
      const reverted = DyadicCareCoordinationService.revertAcceptedProposal(
        patientA,
        prop.id,
        'patient'
      );

      expect(reverted?.status).toBe('declined');
      expect(reverted?.revertedAt).toBeDefined();

      const history = StepPatternService.getDyadicModificationHistory(patientA);
      expect(history.some((h) => h.modificationType === 'proposal_reverted')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. CAREGIVER SHIFT HANDOFF & CONTINUITY
  // ---------------------------------------------------------------------------
  describe('3. Caregiver Shift Handoff & Continuity', () => {
    it('26. authorized caregiver logs shift handoff with assisted activities', async () => {
      const handoff = await DyadicCareCoordinationService.createCaregiverHandoff(
        caregiverUid,
        caregiverName,
        patientA,
        {
          shiftPeriod: 'morning',
          shiftDate: '2026-11-22',
          assistedActivities: [
            {
              activityId: 'act-1',
              activityTitle: 'Morning chai',
              assistanceType: 'verbal_cue',
              note: 'Prompted where ginger was kept',
            },
          ],
          patientRequestsHandled: ['Found reading glasses'],
          patientPreferencesNoted: ['Prefers warm ginger tea without sugar'],
          pendingItemsForNextHelper: ['Spectacle case is on the study desk'],
          isPatientVisible: true,
        }
      );

      expect(handoff.id).toBeDefined();
      expect(handoff.shiftPeriod).toBe('morning');
      expect(handoff.caregiverId).toBe(caregiverUid);
      expect(handoff.assistedActivities.length).toBe(1);
    });

    it('27. shift handoff is visible to patient by default', async () => {
      const handoff = await DyadicCareCoordinationService.createCaregiverHandoff(
        caregiverUid,
        caregiverName,
        patientA,
        {
          shiftPeriod: 'afternoon',
          assistedActivities: [],
          patientRequestsHandled: [],
          patientPreferencesNoted: [],
          pendingItemsForNextHelper: [],
        }
      );

      expect(handoff.isPatientVisible).toBe(true);
    });

    it('28. retrieves shift handoffs and omits archived ones by default', async () => {
      const h1 = await DyadicCareCoordinationService.createCaregiverHandoff(
        caregiverUid,
        caregiverName,
        patientA,
        {
          shiftPeriod: 'morning',
          assistedActivities: [],
          patientRequestsHandled: [],
          patientPreferencesNoted: [],
          pendingItemsForNextHelper: [],
        }
      );

      const h2 = await DyadicCareCoordinationService.createCaregiverHandoff(
        caregiverUid,
        caregiverName,
        patientA,
        {
          shiftPeriod: 'evening',
          assistedActivities: [],
          patientRequestsHandled: [],
          patientPreferencesNoted: [],
          pendingItemsForNextHelper: [],
        }
      );

      DyadicCareCoordinationService.archiveHandoff(patientA, h1.id);

      const active = DyadicCareCoordinationService.getCaregiverHandoffs(patientA);
      expect(active.length).toBe(1);
      expect(active[0].id).toBe(h2.id);

      const all = DyadicCareCoordinationService.getCaregiverHandoffs(patientA, true);
      expect(all.length).toBe(2);
    });

    it('29. authorized caregiver edits handoff and records immutable audit history', async () => {
      const h = await DyadicCareCoordinationService.createCaregiverHandoff(
        caregiverUid,
        caregiverName,
        patientA,
        {
          shiftPeriod: 'full_day',
          assistedActivities: [],
          patientRequestsHandled: [],
          patientPreferencesNoted: ['Restful evening'],
          pendingItemsForNextHelper: [],
        }
      );

      const edited = DyadicCareCoordinationService.editCaregiverHandoff(
        caregiverUid,
        patientA,
        h.id,
        { patientPreferencesNoted: ['Restful evening', 'Drank warm milk at 9pm'] },
        'Added bedtime drink note'
      );

      expect(edited?.lastEditedAt).toBeDefined();
      expect(edited?.editHistory?.length).toBe(1);
      expect(edited?.editHistory?.[0].changesSummary).toContain('bedtime drink');
    });

    it('30. non-author caregiver cannot edit shift handoff', async () => {
      const h = await DyadicCareCoordinationService.createCaregiverHandoff(
        caregiverUid,
        caregiverName,
        patientA,
        {
          shiftPeriod: 'morning',
          assistedActivities: [],
          patientRequestsHandled: [],
          patientPreferencesNoted: [],
          pendingItemsForNextHelper: [],
        }
      );

      expect(() => {
        DyadicCareCoordinationService.editCaregiverHandoff(
          'different_caregiver_02',
          patientA,
          h.id,
          {},
          'Illegal edit'
        );
      }).toThrow(/Only authoring caregiver can edit/);
    });

    it('31. archiveHandoff archives record cleanly', async () => {
      const h = await DyadicCareCoordinationService.createCaregiverHandoff(
        caregiverUid,
        caregiverName,
        patientA,
        {
          shiftPeriod: 'morning',
          assistedActivities: [],
          patientRequestsHandled: [],
          patientPreferencesNoted: [],
          pendingItemsForNextHelper: [],
        }
      );

      const success = DyadicCareCoordinationService.archiveHandoff(patientA, h.id);
      expect(success).toBe(true);

      const active = DyadicCareCoordinationService.getCaregiverHandoffs(patientA);
      expect(active.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. NEUTRALLY PRESERVED DYADIC DISCREPANCIES
  // ---------------------------------------------------------------------------
  describe('4. Neutrally Preserved Dyadic Discrepancies', () => {
    it('32. records dyadic discrepancy with dual perspective provenance trail', () => {
      const disc = DyadicCareCoordinationService.recordDiscrepancy(
        patientA,
        'task_completion',
        'Morning Chai Routine Completion',
        { status: 'Completed independently', notes: 'Made tea without problems' },
        { status: 'Assistance provided', notes: 'Guided on turning off gas burner' }
      );

      expect(disc.id).toBeDefined();
      expect(disc.patientReport.status).toBe('Completed independently');
      expect(disc.caregiverReport.status).toBe('Assistance provided');
      expect(disc.provenanceTrail.length).toBe(2);
      expect(disc.resolutionStatus).toBe('open');
    });

    it('33. sanitizeDiscrepancyLanguage neutralizes accusatory or judgmental vocabulary', () => {
      const raw = 'Patient was lying about failing the stove step and forgot everything';
      const clean = DyadicCareCoordinationPolicy.sanitizeDiscrepancyLanguage(raw);

      expect(clean).not.toContain('lying');
      expect(clean).not.toContain('failing');
      expect(clean).toContain('divergent recollection');
    });

    it('34. buildNeutralDiscrepancyExplanation provides respectful non-adversarial framing', () => {
      const explanation = DyadicCareCoordinationPolicy.buildNeutralDiscrepancyExplanation(
        'task_completion',
        'Completed independently',
        'Assistance provided'
      );

      expect(explanation).toContain('Dual perspective in routine completion');
      expect(explanation).toContain('The patient reported "Completed independently"');
      expect(explanation).toContain('the caregiver observed "Assistance provided"');
    });

    it('35. patient adds clarification to open discrepancy', () => {
      const disc = DyadicCareCoordinationService.recordDiscrepancy(
        patientA,
        'task_completion',
        'Garden Walk Observation',
        { status: 'Walked full round' },
        { status: 'Sat on bench midway' }
      );

      const updated = DyadicCareCoordinationService.resolveDiscrepancy(
        patientA,
        disc.id,
        'clarified',
        'I sat on the bench for 1 minute just to look at the flowers, then continued.'
      );

      expect(updated?.resolutionStatus).toBe('clarified');
      expect(updated?.clarificationNotes).toContain('look at the flowers');
      expect(updated?.provenanceTrail.length).toBe(3);
    });

    it('36. marks discrepancy as preserved_divergent without forcing false consensus', () => {
      const disc = DyadicCareCoordinationService.recordDiscrepancy(
        patientA,
        'adaptation_preference',
        'Lunch Timing',
        { status: '12:30 PM' },
        { status: '01:15 PM' }
      );

      const updated = DyadicCareCoordinationService.resolveDiscrepancy(
        patientA,
        disc.id,
        'preserved_divergent'
      );

      expect(updated?.resolutionStatus).toBe('preserved_divergent');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. SHARED APPOINTMENT PREPARATION & DISCLOSURE
  // ---------------------------------------------------------------------------
  describe('5. Shared Appointment Preparation & Disclosure', () => {
    it('37. getAvailableAppointmentItems compiles flagged concerns and discrepancies', () => {
      // Record a discrepancy
      DyadicCareCoordinationService.recordDiscrepancy(
        patientA,
        'task_completion',
        'Morning Chai Steps',
        { status: 'Done' },
        { status: 'Assisted' }
      );

      const items = DyadicCareCoordinationService.getAvailableAppointmentItems(patientA);
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items[0].details).toBeDefined();
    });

    it('38. exportSharedAppointmentBrief generates non-diagnostic brief with author attribution', () => {
      const items = DyadicCareCoordinationService.getAvailableAppointmentItems(patientA);
      const brief = DyadicCareCoordinationService.exportSharedAppointmentBrief(
        patientA,
        'Sunita Sharma',
        items,
        ['Should I continue my morning walk when the weather is cold?']
      );

      expect(brief.patientName).toBe('Sunita Sharma');
      expect(brief.doctorDisclaimer).toContain('not an automated diagnostic claim');
      expect(brief.patientQuestions.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. OFFLINE RESILIENCE & MULTI-TENANT ISOLATION
  // ---------------------------------------------------------------------------
  describe('6. Offline Resilience & Multi-Tenant Isolation', () => {
    it('39. offline support request is enqueued into SyncQueueService', async () => {
      SyncQueueService.setSimulatedOnline(false);
      try {
        const req = await DyadicCareCoordinationService.createSupportRequest(patientA, {
          patientName: 'Sunita',
          requestType: 'find_item',
          title: 'Offline Help',
          message: 'Where is my sweater?',
        });

        const pending = SyncQueueService.getQueue(patientA);
        expect(
          pending.some((q) => q.collection === 'supportRequests' && q.entityId === req.id)
        ).toBe(true);
      } finally {
        SyncQueueService.setSimulatedOnline(true);
      }
    });

    it('40. offline caregiver proposal is enqueued into SyncQueueService', async () => {
      SyncQueueService.setSimulatedOnline(false);
      try {
        const prop = await DyadicCareCoordinationService.createCaregiverProposal(
          caregiverUid,
          caregiverName,
          patientA,
          {
            proposalType: 'additional_cues',
            title: 'Offline Proposal',
            summary: 'Keep slippers by bed',
            details: {},
          }
        );

        const pending = SyncQueueService.getQueue(patientA);
        expect(
          pending.some((q) => q.collection === 'caregiverProposals' && q.entityId === prop.id)
        ).toBe(true);
      } finally {
        SyncQueueService.setSimulatedOnline(true);
      }
    });

    it('41. clearPatientCache clears in-memory and local storage data for patient', async () => {
      await DyadicCareCoordinationService.createSupportRequest(patientA, {
        patientName: 'Sunita',
        requestType: 'general_support',
        title: 'Cache test',
        message: 'To be wiped',
      });

      expect(DyadicCareCoordinationService.getSupportRequests(patientA).length).toBe(1);

      DyadicCareCoordinationService.clearPatientCache(patientA);
      expect(DyadicCareCoordinationService.getSupportRequests(patientA).length).toBe(0);
    });

    it('42. patient data is strictly isolated across different patient accounts', async () => {
      await DyadicCareCoordinationService.createSupportRequest(patientA, {
        patientName: 'Patient A',
        requestType: 'routine_help',
        title: 'Alpha Request',
        message: 'Belongs to Alpha',
      });

      await DyadicCareCoordinationService.createSupportRequest(patientB, {
        patientName: 'Patient B',
        requestType: 'routine_help',
        title: 'Beta Request',
        message: 'Belongs to Beta',
      });

      const listA = DyadicCareCoordinationService.getSupportRequests(patientA);
      const listB = DyadicCareCoordinationService.getSupportRequests(patientB);

      expect(listA.length).toBe(1);
      expect(listA[0].title).toBe('Alpha Request');

      expect(listB.length).toBe(1);
      expect(listB[0].title).toBe('Beta Request');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. ASHA CONTEXT INTEGRATION & UI RENDERING
  // ---------------------------------------------------------------------------
  describe('7. Asha Context Integration & UI Rendering', () => {
    it('43. Asha context includes dyadic coordination summary', async () => {
      await DyadicCareCoordinationService.createSupportRequest(patientA, {
        patientName: 'Sunita',
        requestType: 'find_item',
        title: 'Find keys',
        message: 'Where are the keys?',
      });

      await DyadicCareCoordinationService.createCaregiverProposal(
        caregiverUid,
        caregiverName,
        patientA,
        {
          proposalType: 'additional_cues',
          title: 'Key hook cue',
          summary: 'Place brass key hook beside front door',
          details: {},
        }
      );

      const ctx = AshaContextService.getUnifiedContext({ uid: patientA, displayName: 'Sunita' }, true);

      expect(ctx.dyadicCoordination).toBeDefined();
      expect(ctx.dyadicCoordination.activeSupportRequestsCount).toBe(1);
      expect(ctx.dyadicCoordination.pendingProposalsCount).toBe(1);
      expect(ctx.dyadicCoordination.latestSupportRequest?.title).toBe('Find keys');

      const slmSummary = AshaContextService.generateCompactSLMContext(ctx);
      expect(slmSummary).toContain('Support: 1 request active');
      expect(slmSummary).toContain('Caregiver Suggestions: 1 pending review');
    });

    it('44. PatientSharedCareView renders support requests, proposals and autonomy controls', async () => {
      await DyadicCareCoordinationService.createSupportRequest(patientA, {
        patientName: 'Sunita',
        requestType: 'routine_help',
        title: 'Help with chai',
        message: 'Could you help me check if tea is ready?',
      });

      await DyadicCareCoordinationService.createCaregiverProposal(
        caregiverUid,
        caregiverName,
        patientA,
        {
          proposalType: 'step_simplification',
          title: 'Walk adaptation',
          summary: 'Walk 5 mins then sit',
          details: {
            originalValue: '15 mins walk',
            proposedValue: '5 mins walk',
          },
        }
      );

      render(
        <MemoryRouter>
          <PatientSharedCareView
            patientId={patientA}
            patientName="Sunita"
            routines={mockRoutines}
          />
        </MemoryRouter>
      );

      expect(screen.getByTestId('patient-shared-care-view')).toBeInTheDocument();
      expect(screen.getByText(/Shared Care & Support Coordination/i)).toBeInTheDocument();
      expect(screen.getByText(/Patient Authority Guaranteed/i)).toBeInTheDocument();
      expect(screen.getByText(/Could you help me check if tea is ready\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Walk adaptation/i)).toBeInTheDocument();
    });

    it('45. CaregiverDyadicCoordinationView renders incoming requests, proposal builder and safety warning', async () => {
      await DyadicCareCoordinationService.createSupportRequest(patientA, {
        patientName: 'Sunita',
        requestType: 'routine_help',
        title: 'Chai help',
        message: 'Can you bring fresh milk for tea?',
      });

      render(
        <MemoryRouter>
          <CaregiverDyadicCoordinationView
            patientId={patientA}
            patientName="Sunita"
            caregiverId={caregiverUid}
            caregiverName="Priya Sharma"
            isAuthorized={true}
            routines={mockRoutines}
          />
        </MemoryRouter>
      );

      expect(screen.getByTestId('caregiver-dyadic-coordination-view')).toBeInTheDocument();
      expect(screen.getByText(/Dyadic Care Coordination & Active Support/i)).toBeInTheDocument();
      expect(screen.getByText(/Can you bring fresh milk for tea\?/i)).toBeInTheDocument();
      expect(screen.getByTestId('toggle-proposal-form-btn')).toBeInTheDocument();
    });
  });
});
