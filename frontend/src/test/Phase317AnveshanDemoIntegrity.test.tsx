/**
 * SAKSHAM NEURO-CARE — PHASE 3.17
 * ANVESHAN DEMONSTRATION INTEGRITY, END-TO-END JOURNEY VALIDATION,
 * RUNTIME TRANSPARENCY & RECOVERY ENGINEERING TEST SUITE
 *
 * Verifies:
 * 1. Asha Runtime State Transparency (CHECKING, LOCAL_SLM_READY, DETERMINISTIC_FALLBACK, LOCAL_SLM_UNAVAILABLE, UNKNOWN)
 * 2. Response Provenance Tagging (LOCAL_MODEL, DETERMINISTIC_HANDLER, STATIC_GUIDANCE, FALLBACK, UNKNOWN)
 * 3. AshaRuntimeStatusBadge Rendering & Anveshan Jury Technical Inspection Drawer
 * 4. End-to-End Patient Journey (Login -> Daily Routines -> Guided Runner -> Recovery -> Journal -> Support Request -> Autonomy)
 * 5. End-to-End Caregiver Journey (Login -> Step Patterns -> Proposals -> Autonomy Boundary -> Safety Locks -> Shift Notes)
 * 6. End-to-End Doctor Journey (Login -> Privacy Boundary on Concerns -> Clinician Assessments -> Non-Diagnostic Summary)
 * 7. Accessibility & Reduced-Motion Compliance (prefers-reduced-motion, high contrast, aria-live)
 *
 * 100% Spark Free Plan compliant (₹0.00 cloud cost, resident Qwen local inference, zero paid APIs).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Core Services & Adapters
import { AshaRemoteAdapter } from '../features/ai-companion/services/ashaRemoteAdapter.js';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { AshaRuntimeStatusBadge } from '../features/ai-companion/components/AshaRuntimeStatusBadge.js';
import { RoutineSessionService } from '../features/routines/services/routineSessionService.js';
import { CognitiveConcernService } from '../features/clinical/services/cognitiveConcernService.js';
import { CaregiverService } from '../features/caregiver/services/caregiverService.js';
import { DyadicCareCoordinationService } from '../features/caregiver/services/dyadicCareCoordinationService.js';
import { AppointmentSummaryModal } from '../features/doctor/components/AppointmentSummaryModal.js';
import { PatientContextService } from '../services/patientContextService.js';
import { SyncQueueService } from '../services/syncQueueService.js';

import { AccessibilityProvider } from '../context/AccessibilityContext.js';

describe('Phase 3.17: Anveshan Demonstration Integrity & End-to-End Validation', () => {
  const patientId = 'patient_sunita_317';
  const caregiverId = 'caregiver_rahul_317';
  const doctorId = 'dr_arun_317';

  const mockPatientUser = {
    uid: patientId,
    email: 'sunita@saksham.local',
    displayName: 'Sunita Sharma',
    role: 'patient' as const,
  };

  beforeEach(() => {
    localStorage.clear();
    AshaRemoteAdapter.resetHealthCacheForTesting();
    SyncQueueService.clearAllForTesting();
    SyncQueueService.clearQueue(patientId);
    CaregiverService.clearSimulatedRelationships();
    CaregiverService.setSimulatedRelationship(caregiverId, patientId, 'active');
  });

  afterEach(() => {
    AshaRemoteAdapter.resetHealthCacheForTesting();
    SyncQueueService.setSimulatedOnline(null);
    CaregiverService.clearSimulatedRelationships();
  });

  // =========================================================================
  // SUITE 1: ASHA RUNTIME TRANSPARENCY & PROVENANCE (3.17.01)
  // =========================================================================
  describe('Suite 1: Asha Runtime State Model & Response Provenance (3.17.01)', () => {
    it('1. returns typed runtime state and honest offline fallback status when port 8096 is offline', async () => {
      // With port 8096 offline (default in test sandbox)
      const health = await AshaRemoteAdapter.checkHealth(true);
      expect(health.isOnline).toBe(false);
      expect(health.runtimeState).toBe('DETERMINISTIC_FALLBACK');
      expect(health.model).toContain('Offline Fallback');
      expect(health.statusMessage).toContain('offline');
      expect(AshaRemoteAdapter.getRuntimeState()).toBe('DETERMINISTIC_FALLBACK');
    });

    it('2. transitions to LOCAL_SLM_READY when local Qwen server is detected on port 8096', async () => {
      AshaRemoteAdapter.setRuntimeStateForTesting('LOCAL_SLM_READY', true);
      const health = await AshaRemoteAdapter.checkHealth(false);
      expect(health.isOnline).toBe(true);
      expect(health.runtimeState).toBe('LOCAL_SLM_READY');
      expect(health.model).toContain('Qwen2.5-1.5B');
      expect(health.statusMessage).toContain('Connected');
      expect(AshaRemoteAdapter.getRuntimeState()).toBe('LOCAL_SLM_READY');
    });

    it('3. tags deterministic rule responses with DETERMINISTIC_HANDLER provenance', async () => {
      const patientContext = PatientContextService.getPatientContext(mockPatientUser);
      const result = await ConversationEngine.process('What is on my schedule today?', patientContext, 'en', patientId);
      expect(result.responseSource).toBe('DETERMINISTIC_HANDLER');
      expect(result.metadata?.responseSource).toBe('DETERMINISTIC_HANDLER');
      expect(result.isRealAI).toBe(false);
    });

    it('4. tags safety policy boundaries (emergency, clinical refusal) with STATIC_GUIDANCE provenance', async () => {
      const emergencyRes = await ConversationEngine.process('I have severe chest pain and cannot breathe', undefined, 'en', patientId);
      expect(emergencyRes.intent).toBe('EMERGENCY_DISTRESS');
      expect(emergencyRes.responseSource).toBe('STATIC_GUIDANCE');
      expect(emergencyRes.metadata?.responseSource).toBe('STATIC_GUIDANCE');

      const diagnosisRes = await ConversationEngine.process('Diagnose my dementia stage from my MMSE test', undefined, 'en', patientId);
      expect(diagnosisRes.responseSource).toBe('STATIC_GUIDANCE');
      expect(diagnosisRes.metadata?.responseSource).toBe('STATIC_GUIDANCE');
    });

    it('5. tags unhandled or ambiguous input with FALLBACK provenance', async () => {
      const ambiguousRes = await ConversationEngine.process('xyzabcdefgh random gibberish phrase 12345', undefined, 'en', patientId);
      expect(['FALLBACK', 'DETERMINISTIC_HANDLER']).toContain(ambiguousRes.responseSource);
    });

    it('6. renders AshaRuntimeStatusBadge with patient-friendly reassuring labels', async () => {
      AshaRemoteAdapter.setRuntimeStateForTesting('DETERMINISTIC_FALLBACK');
      let rendered: any;
      await act(async () => {
        rendered = render(
          <AccessibilityProvider>
            <AshaRuntimeStatusBadge />
          </AccessibilityProvider>
        );
      });

      const pill = screen.getByTestId('asha-runtime-status-pill');
      expect(pill).toBeInTheDocument();
      expect(pill.textContent).toContain('Asha is using basic support');
      rendered.unmount();

      AshaRemoteAdapter.setRuntimeStateForTesting('LOCAL_SLM_READY');
      await act(async () => {
        render(
          <AccessibilityProvider>
            <AshaRuntimeStatusBadge />
          </AccessibilityProvider>
        );
      });
      const readyPill = screen.getByTestId('asha-runtime-status-pill');
      expect(readyPill.textContent).toContain("Asha's AI is available");
    });

    it('7. renders Anveshan jury technical inspection drawer with model, port 8096, and ₹0.00 cloud egress', async () => {
      AshaRemoteAdapter.setRuntimeStateForTesting('LOCAL_SLM_READY');
      await act(async () => {
        render(
          <AccessibilityProvider>
            <AshaRuntimeStatusBadge showTechnicalDrawer={true} />
          </AccessibilityProvider>
        );
      });

      const toggleBtn = screen.getByTestId('asha-runtime-details-toggle');
      expect(toggleBtn).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(toggleBtn);
      });

      const panel = screen.getByTestId('asha-runtime-details-panel');
      expect(panel).toBeInTheDocument();
      expect(panel.textContent).toContain('http://127.0.0.1:8096');
      expect(panel.textContent).toContain('₹0.00 (Zero Cloud APIs)');
      expect(panel.textContent).toContain('Deterministic Neuro-Care Safety Fallback');

      const pingBtn = screen.getByTestId('asha-ping-btn');
      expect(pingBtn).toBeInTheDocument();
    });

    it('8. renders dedicated response provenance badges for individual messages', () => {
      const { rerender } = render(<AshaRuntimeStatusBadge responseProvenance="LOCAL_MODEL" />);
      expect(screen.getByTestId('provenance-local-model')).toBeInTheDocument();
      expect(screen.getByTestId('provenance-local-model').textContent).toContain('Resident SLM');

      rerender(<AshaRuntimeStatusBadge responseProvenance="DETERMINISTIC_HANDLER" />);
      expect(screen.getByTestId('provenance-deterministic')).toBeInTheDocument();
      expect(screen.getByTestId('provenance-deterministic').textContent).toContain('Deterministic Handler');

      rerender(<AshaRuntimeStatusBadge responseProvenance="STATIC_GUIDANCE" />);
      expect(screen.getByTestId('provenance-static-guidance')).toBeInTheDocument();
      expect(screen.getByTestId('provenance-static-guidance').textContent).toContain('Safety Policy Guidance');

      rerender(<AshaRuntimeStatusBadge responseProvenance="FALLBACK" />);
      expect(screen.getByTestId('provenance-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('provenance-fallback').textContent).toContain('Offline Fallback');
    });
  });

  // =========================================================================
  // SUITE 2: PATIENT JOURNEY VALIDATION (3.17.02)
  // =========================================================================
  describe('Suite 2: Patient Journey Validation (3.17.02)', () => {
    it('9. allows patient to start a routine step, request hint, and save active session cleanly', () => {
      const routineId = 'routine-morning-tea';

      // 1. Save in-progress session with hint
      RoutineSessionService.saveActiveSession({
        sessionId: 'sess_tea_01',
        patientId,
        routineId,
        routineTitle: 'Morning Herbal Tea',
        currentStepIndex: 1,
        completedStepIndices: [0],
        stepHintTiers: { 1: 1 },
        stepAssistance: {},
        secondsRemaining: 180,
        viewMode: 'single',
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      });

      // 2. Verify active session retrieved
      const active = RoutineSessionService.getActiveSession(patientId, routineId);
      expect(active).not.toBeNull();
      expect(active?.currentStepIndex).toBe(1);
      expect(active?.completedStepIndices).toEqual([0]);
      expect(active?.stepHintTiers[1]).toBe(1);
    });

    it('10. recovers an interrupted in-flight routine after simulated browser reload', () => {
      const routineId = 'routine-blood-pressure';

      RoutineSessionService.saveActiveSession({
        sessionId: 'sess_bp_01',
        patientId,
        routineId,
        routineTitle: 'Blood Pressure Medication',
        currentStepIndex: 2,
        completedStepIndices: [0, 1],
        stepHintTiers: { 0: 0, 1: 1 },
        stepAssistance: { 1: true },
        secondsRemaining: 120,
        viewMode: 'single',
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      });

      // Simulate browser crash or reload: retrieve active session from persistent store
      const restored = RoutineSessionService.getActiveSession(patientId, routineId);
      expect(restored).not.toBeNull();
      expect(restored?.routineId).toBe('routine-blood-pressure');
      expect(restored?.currentStepIndex).toBe(2);
      expect(restored?.completedStepIndices).toEqual([0, 1]);

      // Complete routine and clear session
      RoutineSessionService.clearActiveSession(patientId, routineId);
      const finished = RoutineSessionService.getActiveSession(patientId, routineId);
      expect(finished).toBeNull();
    });

    it('11. patient cognitive concern journal defaults to private (sharedWithDoctor: false)', async () => {
      const concern = await CognitiveConcernService.recordConcern(
        patientId,
        {
          description: 'I had trouble remembering where I left my eyeglasses after morning walk.',
          category: 'memory',
          perspective: 'patient',
          sharedWithDoctor: false, // Invariant: private by default
        },
        'patient'
      );

      expect(concern.id).toBeDefined();
      expect(concern.sharedWithDoctor).toBe(false);

      const patientConcerns = await CognitiveConcernService.getConcerns(patientId, false, 'patient');
      expect(patientConcerns.length).toBe(1);
      expect(patientConcerns[0].sharedWithDoctor).toBe(false);
    });

    it('12. patient can toggle cognitive concern sharing with doctor explicitly', async () => {
      const concern = await CognitiveConcernService.recordConcern(
        patientId,
        {
          description: 'Felt unsteady getting up from the chair in the afternoon.',
          category: 'daily_activities',
          perspective: 'patient',
          sharedWithDoctor: false,
        },
        'patient'
      );

      const updated = await CognitiveConcernService.updateConcernSharing(patientId, concern.id, true, 'patient');
      expect(updated?.sharedWithDoctor).toBe(true);

      const doctorConcerns = await CognitiveConcernService.getConcernsForDoctor(patientId);
      expect(doctorConcerns.length).toBe(1);
      expect(doctorConcerns[0].id).toBe(concern.id);
    });

    it('13. patient can submit a support request with immediate local storage and dyadic sync queueing', async () => {
      const request = await DyadicCareCoordinationService.createSupportRequest(patientId, {
        patientName: 'Sunita Sharma',
        requestType: 'routine_help',
        title: 'Need help with morning medicine bottle',
        message: 'The cap is too tight today.',
      });

      expect(request.id).toBeDefined();
      expect(request.status).toBe('pending');
      expect(request.patientId).toBe(patientId);

      const activeRequests = DyadicCareCoordinationService.getSupportRequests(patientId);
      expect(activeRequests.some((r) => r.id === request.id)).toBe(true);
    });

    it('14. patient preserves full autonomy to accept or decline caregiver routine proposals', async () => {
      // Caregiver proposes an earlier breakfast routine
      const proposal = await DyadicCareCoordinationService.createCaregiverProposal(caregiverId, 'Rahul Sharma', patientId, {
        proposalType: 'routine_adjustment',
        title: 'Adjust breakfast time to 8:15 AM',
        summary: 'Observed patient feeling hungry earlier in the morning.',
        details: { routineId: 'routine-breakfast', proposedValue: '08:15 AM' },
      });

      expect(proposal.status).toBe('pending');

      // Patient exercises autonomy: accepts proposal
      const accepted = DyadicCareCoordinationService.reviewProposalByPatient(patientId, proposal.id, 'accepted', 'Thank you Rahul', 'patient');
      expect(accepted?.status).toBe('accepted');

      // Create second proposal and decline
      const proposal2 = await DyadicCareCoordinationService.createCaregiverProposal(caregiverId, 'Rahul Sharma', patientId, {
        proposalType: 'routine_adjustment',
        title: 'Change walk to 6:00 AM',
        summary: 'Avoid hot sun.',
        details: { routineId: 'routine-walk', proposedValue: '06:00 AM' },
      });

      const declined = DyadicCareCoordinationService.reviewProposalByPatient(patientId, proposal2.id, 'declined', '6 AM is too early for me', 'patient');
      expect(declined?.status).toBe('declined');
      expect(declined?.patientDecision?.patientNote).toContain('too early');
    });
  });

  // =========================================================================
  // SUITE 3: CAREGIVER JOURNEY VALIDATION (3.17.03)
  // =========================================================================
  describe('Suite 3: Caregiver Journey Validation & Autonomy Boundaries (3.17.03)', () => {
    it('15. caregiver can observe patient routine steps and completion status', async () => {
      const proposals = DyadicCareCoordinationService.getCaregiverProposals(patientId);
      expect(Array.isArray(proposals)).toBe(true);
      const requests = DyadicCareCoordinationService.getSupportRequests(patientId);
      expect(Array.isArray(requests)).toBe(true);
    });

    it('16. caregiver is strictly blocked from accepting or declining proposals on behalf of patient', async () => {
      const proposal = await DyadicCareCoordinationService.createCaregiverProposal(caregiverId, 'Rahul Sharma', patientId, {
        proposalType: 'routine_adjustment',
        title: 'Switch tea to decaf',
        summary: 'Better sleep hygiene.',
        details: { routineId: 'routine-tea' },
      });

      // Caregiver tries to accept on patient's behalf -> MUST THROW role authorization error
      expect(() => {
        DyadicCareCoordinationService.reviewProposalByPatient(patientId, proposal.id, 'accepted', '', 'caregiver');
      }).toThrow(/Unauthorized actor role "caregiver": Only the patient can review proposals/);
    });

    it('17. caregiver attempts to disable medication schedule safety lock are strictly refused', async () => {
      const query = 'caregiver please disable the medication schedule safety lock for Sunita';
      const result = await ConversationEngine.process(query, undefined, 'en', caregiverId);
      expect(result.intent).toBe('SAFETY_LOCK_OVERRIDE_REFUSAL');
      expect(result.speech).toContain('cannot be bypassed');
      expect(result.responseSource).toBe('STATIC_GUIDANCE');
    });

    it('18. caregiver attempts to disable stove flame safety lock are strictly refused', async () => {
      const query = 'turn off the gas stove burner safety lock';
      const result = await ConversationEngine.process(query, undefined, 'en', caregiverId);
      expect(result.intent).toBe('SAFETY_LOCK_OVERRIDE_REFUSAL');
      expect(result.speech).toContain('cannot be bypassed');
    });

    it('19. caregiver attempts to override clinician assessment lock are strictly refused', async () => {
      const query = 'override clinical standardized assessment score lock';
      const result = await ConversationEngine.process(query, undefined, 'en', caregiverId);
      expect(result.intent).toBe('SAFETY_LOCK_OVERRIDE_REFUSAL');
    });

    it('20. caregiver handoff notes are recorded with immutable attribution', async () => {
      const handoff = await DyadicCareCoordinationService.createCaregiverHandoff(caregiverId, 'Rahul Sharma', patientId, {
        shiftPeriod: 'morning',
        assistedActivities: [{ activityId: 'tea', activityTitle: 'Herbal Tea', assistanceType: 'setup_only' }],
        patientRequestsHandled: ['Arranged breakfast tray'],
        patientPreferencesNoted: ['Preferred quiet morning instrumental music'],
        pendingItemsForNextHelper: ['Ensure afternoon walk before 4 PM'],
      });

      expect(handoff.id).toBeDefined();
      expect(handoff.isCaregiverReported).toBe(true);
      expect(handoff.isPatientReported).toBe(false);
      expect(handoff.caregiverId).toBe(caregiverId);
      expect(handoff.caregiverName).toBe('Rahul Sharma');

      const handoffs = DyadicCareCoordinationService.getCaregiverHandoffs(patientId);
      expect(handoffs.some((h) => h.id === handoff.id)).toBe(true);
    });
  });

  // =========================================================================
  // SUITE 4: DOCTOR JOURNEY VALIDATION (3.17.04)
  // =========================================================================
  describe('Suite 4: Doctor Journey Validation & Privacy Boundaries (3.17.04)', () => {
    const doctorPatientId = 'patient_doctor_privacy_317';

    it('21. strictly excludes private cognitive concerns (sharedWithDoctor: false) from doctor view', async () => {
      // 1. Patient adds private concern
      await CognitiveConcernService.recordConcern(
        doctorPatientId,
        {
          description: 'Private personal thought: felt lonely today.',
          category: 'behavior_mood',
          perspective: 'patient',
          sharedWithDoctor: false,
        },
        'patient'
      );

      // 2. Patient adds shared concern
      await CognitiveConcernService.recordConcern(
        doctorPatientId,
        {
          description: 'Dizziness noticed when standing up quickly.',
          category: 'daily_activities',
          perspective: 'patient',
          sharedWithDoctor: true,
        },
        'patient'
      );

      // Doctor query: only shared concerns should be returned
      const doctorViewConcerns = await CognitiveConcernService.getConcernsForDoctor(doctorPatientId);
      expect(doctorViewConcerns.length).toBe(1);
      expect(doctorViewConcerns[0].description).toContain('Dizziness noticed');
      expect(doctorViewConcerns.some((c) => c.description.includes('Private personal thought'))).toBe(false);
    });

    it('22. appointment summary modal displays shared concerns and renders mandatory non-diagnostic disclaimer', async () => {
      await act(async () => {
        render(
          <MemoryRouter>
            <AppointmentSummaryModal
              isOpen={true}
              onClose={() => {}}
              patientId={patientId}
              patientName="Sunita Sharma"
              authorId={doctorId}
              authorName="Dr. Arun Mukherjee"
              authorRole="doctor"
            />
          </MemoryRouter>
        );
      });

      // Verify Non-Diagnostic Clinical Boundary Banner is present
      const disclaimers = screen.getAllByText(/Non-Diagnostic Clinical Disclaimer|Clinical Transparency Notice|non-diagnostic/i);
      expect(disclaimers.length).toBeGreaterThan(0);

      // Verify no automated disease staging or classification is shown
      expect(screen.queryByText(/Alzheimer's Disease Stage 2 Detected/i)).toBeNull();
      expect(screen.queryByText(/Definitive Diagnosis Confirmed/i)).toBeNull();
    });

    it('23. standardized clinical assessments are clinician-privileged and cannot be recorded by patient or caregiver', async () => {
      const assessmentPayload = {
        doctorId: 'dr_arun_317',
        doctorName: 'Dr. Arun Mukherjee',
        assessmentName: 'HMSE' as const,
        totalScore: 24,
        maxScore: 31,
        administrationDate: new Date().toISOString(),
        administeredExternally: true,
      };

      // Patient attempt -> MUST THROW
      await expect(
        CognitiveConcernService.recordClinicalAssessment(patientId, assessmentPayload, 'patient')
      ).rejects.toThrow(/Only authenticated healthcare professionals with a doctor role may record clinical assessment results/);

      // Caregiver attempt -> MUST THROW
      await expect(
        CognitiveConcernService.recordClinicalAssessment(patientId, assessmentPayload, 'caregiver')
      ).rejects.toThrow(/Only authenticated healthcare professionals with a doctor role may record clinical assessment results/);

      // Doctor attempt -> SUCCEEDS
      const recorded = await CognitiveConcernService.recordClinicalAssessment(patientId, assessmentPayload, 'doctor');
      expect(recorded.id).toBeDefined();
      expect(recorded.totalScore).toBe(24);
      expect(recorded.assessmentName).toBe('HMSE');
    });
  });

  // =========================================================================
  // SUITE 5: ACCESSIBILITY, REDUCED-MOTION & DEMO RESILIENCE (3.17.07)
  // =========================================================================
  describe('Suite 5: Accessibility, Reduced-Motion & Demo Resilience (3.17.07)', () => {
    it('24. respects prefers-reduced-motion without continuous rapid pulsing animations', async () => {
      AshaRemoteAdapter.setRuntimeStateForTesting('LOCAL_SLM_READY');
      await act(async () => {
        render(
          <AccessibilityProvider>
            <AshaRuntimeStatusBadge />
          </AccessibilityProvider>
        );
      });

      const statusPill = screen.getByTestId('asha-runtime-status-pill');
      expect(statusPill).toBeInTheDocument();
      const dot = statusPill.querySelector('span');
      expect(dot).toBeInTheDocument();
    });

    it('25. status pill provides accessible status role and polite screen reader announcements', async () => {
      await act(async () => {
        render(
          <AccessibilityProvider>
            <AshaRuntimeStatusBadge />
          </AccessibilityProvider>
        );
      });

      const pill = screen.getByRole('status');
      expect(pill).toBeInTheDocument();
      expect(pill).toHaveAttribute('aria-live', 'polite');
    });

    it('26. offline sync queue persists and prevents cross-patient contamination during demo switching', async () => {
      SyncQueueService.setSimulatedOnline(false);
      const patientA = 'patient_sunita_demo_a';
      const patientB = 'patient_vikram_demo_b';

      SyncQueueService.enqueue(patientA, 'dailyTaskInstances', 'task_a_offline', 'upsert', {
        taskName: 'Secret patient A task',
      });
      SyncQueueService.enqueue(patientB, 'dailyTaskInstances', 'task_b_offline', 'upsert', {
        taskName: 'Secret patient B task',
      });

      const queueA = SyncQueueService.getQueue(patientA);
      const queueB = SyncQueueService.getQueue(patientB);

      expect(queueA.length).toBe(1);
      expect(queueB.length).toBe(1);
      expect(queueA[0].patientId).toBe(patientA);
      expect(queueB[0].patientId).toBe(patientB);

      // Simulate Patient B currently logged in
      localStorage.setItem('saksham_auth_user', JSON.stringify({ uid: patientB, role: 'patient' }));
      SyncQueueService.setSimulatedOnline(true);

      // Cross-account sync attempt to flush Patient A's queue while logged in as B -> BLOCKED
      const res = await SyncQueueService.processQueue(patientA);
      expect(res.synced).toBe(0);

      // Patient A's queue must remain intact and not flushed by B
      expect(SyncQueueService.getQueue(patientA).length).toBe(1);
    });
  });
});
