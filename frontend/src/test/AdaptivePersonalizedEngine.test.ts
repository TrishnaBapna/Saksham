import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdaptiveSupportService } from '../features/adaptive/services/adaptiveSupportService.js';
import { AdaptiveDifficultyService } from '../features/games/services/adaptiveDifficultyService.js';

describe('Stage 3 Phase B: Adaptive Personalized Support Engine', () => {
  const patientId = 'test-patient-adaptive-01';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    AdaptiveSupportService.clearCache();
    AdaptiveDifficultyService.clearAll();
    vi.clearAllMocks();
  });

  describe('1. Temporary Support vs Repeated Needs Distinction', () => {
    it('provides temporary support for single struggle without altering persistent configuration', async () => {
      const initialProfile = AdaptiveDifficultyService.getProfile(patientId);
      expect(initialProfile.currentDifficulty).toBe('Gentle');

      // Patient struggles once on a game
      const result = await AdaptiveSupportService.recordObservation({
        id: 'obs-01',
        patientId,
        activityId: 'game-matching',
        activityTitle: 'Peaceful Nature Card Matching',
        activityType: 'game',
        timestamp: new Date().toISOString(),
        sessionId: 'sess-01',
        assistanceRequested: true,
        hintsUsedCount: 2,
        repeatedInstructionCount: 0,
        completionStatus: 'completed',
        pauseCount: 1,
        durationSeconds: 120,
        isInterrupted: false,
        currentLevel: 'Gentle',
        patientFeedback: 'felt a bit tricky',
      });

      // Temporary assistance message offered
      expect(result.temporaryAssistance).toBeDefined();
      expect(result.temporaryAssistance?.supportOffered).toBe(true);

      // Persistent proposal NOT generated on single struggle
      expect(result.proposalGenerated).toBeUndefined();

      // Persistent difficulty NOT altered
      const currentProfile = AdaptiveDifficultyService.getProfile(patientId);
      expect(currentProfile.currentDifficulty).toBe('Gentle');
    });

    it('generates proposal for supportive configuration after repeated struggles (>= 2 sessions)', async () => {
      // Start at Moderate difficulty
      await AdaptiveDifficultyService.saveProfile({
        ...AdaptiveDifficultyService.getDefaultProfile(patientId),
        currentDifficulty: 'Moderate',
      });

      // Session 1: struggle
      await AdaptiveSupportService.recordObservation({
        id: 'obs-struggle-1',
        patientId,
        activityId: 'game-matching',
        activityTitle: 'Peaceful Nature Card Matching',
        activityType: 'game',
        timestamp: new Date().toISOString(),
        sessionId: 'sess-struggle-1',
        assistanceRequested: true,
        hintsUsedCount: 2,
        repeatedInstructionCount: 0,
        completionStatus: 'incomplete',
        pauseCount: 0,
        durationSeconds: 85,
        isInterrupted: false,
        currentLevel: 'Moderate',
        patientFeedback: 'hard',
      });

      // Session 2: repeated struggle on distinct session
      const res2 = await AdaptiveSupportService.recordObservation({
        id: 'obs-struggle-2',
        patientId,
        activityId: 'game-matching',
        activityTitle: 'Peaceful Nature Card Matching',
        activityType: 'game',
        timestamp: new Date().toISOString(),
        sessionId: 'sess-struggle-2',
        assistanceRequested: true,
        hintsUsedCount: 3,
        repeatedInstructionCount: 1,
        completionStatus: 'abandoned',
        pauseCount: 1,
        durationSeconds: 90,
        isInterrupted: false,
        currentLevel: 'Moderate',
        patientFeedback: 'too tricky',
      });

      // Recommendation generated after 2 distinct struggle sessions
      expect(res2.proposalGenerated).toBeDefined();
      expect(res2.proposalGenerated?.domain).toBe('game_difficulty');
      expect(res2.proposalGenerated?.proposedConfig.difficulty).toBe('Gentle');
      expect(res2.proposalGenerated?.status).toBe('recommendation_generated');
      expect(res2.proposalGenerated?.calmExplanation.en).toContain('I noticed this game has felt a little challenging recently');

      // Preserved in proposals store
      const proposals = AdaptiveSupportService.getProposals(patientId);
      expect(proposals.length).toBe(1);
    });

    it('generates routine step-split proposal after repeated difficulty on routine step', async () => {
      // Attempt 1: patient stuck on dressing routine
      await AdaptiveSupportService.recordObservation({
        id: 'obs-rt-1',
        patientId,
        activityId: 'routine-03',
        activityTitle: 'Buttoning Shirt & Morning Dressing',
        activityType: 'routine',
        timestamp: new Date().toISOString(),
        sessionId: 'rt-sess-1',
        assistanceRequested: true,
        hintsUsedCount: 1,
        repeatedInstructionCount: 1,
        completionStatus: 'incomplete',
        pauseCount: 1,
        durationSeconds: 150,
        isInterrupted: false,
        currentLevel: 'standard_steps',
        patientFeedback: 'stuck_forgot',
      });

      // Attempt 2: repeated struggle
      const res2 = await AdaptiveSupportService.recordObservation({
        id: 'obs-rt-2',
        patientId,
        activityId: 'routine-03',
        activityTitle: 'Buttoning Shirt & Morning Dressing',
        activityType: 'routine',
        timestamp: new Date().toISOString(),
        sessionId: 'rt-sess-2',
        assistanceRequested: true,
        hintsUsedCount: 2,
        repeatedInstructionCount: 2,
        completionStatus: 'incomplete',
        pauseCount: 1,
        durationSeconds: 180,
        isInterrupted: false,
        currentLevel: 'standard_steps',
        patientFeedback: 'stuck_step2',
      });

      expect(res2.proposalGenerated).toBeDefined();
      expect(res2.proposalGenerated?.domain).toBe('routine_step_split');
      expect(res2.proposalGenerated?.proposedConfig.mode).toBe('micro_step_split');
      expect(res2.proposalGenerated?.calmExplanation.en).toContain('Would you like me to break it into smaller steps');
    });
  });

  describe('2. Interrupted Sessions & Invariant Protection', () => {
    it('strictly excludes interrupted or accidental sessions (< 10 seconds) from struggle count', async () => {
      const res = await AdaptiveSupportService.recordObservation({
        id: 'obs-interrupted',
        patientId,
        activityId: 'game-matching',
        activityTitle: 'Peaceful Nature Card Matching',
        activityType: 'game',
        timestamp: new Date().toISOString(),
        sessionId: 'sess-interrupted',
        assistanceRequested: false,
        hintsUsedCount: 0,
        repeatedInstructionCount: 0,
        completionStatus: 'incomplete',
        pauseCount: 0,
        durationSeconds: 4, // Exited after 4s
        isInterrupted: true,
        currentLevel: 'Gentle',
      });

      expect(res.proposalGenerated).toBeUndefined();
      expect(res.temporaryAssistance).toBeUndefined();
    });

    it('deduplicates identical session IDs and avoids double counting', async () => {
      const obsPayload = {
        id: 'obs-dup',
        patientId,
        activityId: 'game-matching',
        activityTitle: 'Peaceful Nature Card Matching',
        activityType: 'game' as const,
        timestamp: new Date().toISOString(),
        sessionId: 'sess-duplicate-id',
        assistanceRequested: true,
        hintsUsedCount: 2,
        repeatedInstructionCount: 0,
        completionStatus: 'incomplete' as const,
        pauseCount: 0,
        durationSeconds: 65,
        isInterrupted: false,
        currentLevel: 'Gentle',
      };

      await AdaptiveSupportService.recordObservation(obsPayload);
      const secondCall = await AdaptiveSupportService.recordObservation(obsPayload);

      // Duplicate session skipped
      expect(secondCall).toEqual({});
      const stored = AdaptiveSupportService.getObservations(patientId, 'game-matching');
      expect(stored.length).toBe(1);
    });

    it('does not generate duplicate pending proposals for the same activity', async () => {
      await AdaptiveDifficultyService.saveProfile({
        ...AdaptiveDifficultyService.getDefaultProfile(patientId),
        currentDifficulty: 'Moderate',
      });

      // 2 struggles to generate proposal
      await AdaptiveSupportService.recordObservation({
        id: 'obs-s1',
        patientId,
        activityId: 'game-matching',
        activityTitle: 'Peaceful Nature Card Matching',
        activityType: 'game',
        timestamp: new Date().toISOString(),
        sessionId: 'sess-s1',
        assistanceRequested: true,
        hintsUsedCount: 2,
        repeatedInstructionCount: 0,
        completionStatus: 'incomplete',
        pauseCount: 0,
        durationSeconds: 70,
        isInterrupted: false,
        currentLevel: 'Moderate',
      });

      const res2 = await AdaptiveSupportService.recordObservation({
        id: 'obs-s2',
        patientId,
        activityId: 'game-matching',
        activityTitle: 'Peaceful Nature Card Matching',
        activityType: 'game',
        timestamp: new Date().toISOString(),
        sessionId: 'sess-s2',
        assistanceRequested: true,
        hintsUsedCount: 2,
        repeatedInstructionCount: 0,
        completionStatus: 'incomplete',
        pauseCount: 0,
        durationSeconds: 75,
        isInterrupted: false,
        currentLevel: 'Moderate',
      });

      expect(res2.proposalGenerated).toBeDefined();

      // 3rd struggle while proposal is pending
      const res3 = await AdaptiveSupportService.recordObservation({
        id: 'obs-s3',
        patientId,
        activityId: 'game-matching',
        activityTitle: 'Peaceful Nature Card Matching',
        activityType: 'game',
        timestamp: new Date().toISOString(),
        sessionId: 'sess-s3',
        assistanceRequested: true,
        hintsUsedCount: 2,
        repeatedInstructionCount: 0,
        completionStatus: 'incomplete',
        pauseCount: 0,
        durationSeconds: 80,
        isInterrupted: false,
        currentLevel: 'Moderate',
      });

      // Avoids duplicate pending proposal
      expect(res3.proposalGenerated).toBeUndefined();
      const proposals = AdaptiveSupportService.getProposals(patientId);
      expect(proposals.length).toBe(1);
    });
  });

  describe('3. Consistent Success & Non-Coercive Progression', () => {
    it('generates optional next level recommendation after 3 comfortable completed sessions', async () => {
      // 3 comfortable sessions
      for (let i = 1; i <= 3; i++) {
        const res = await AdaptiveSupportService.recordObservation({
          id: `obs-success-${i}`,
          patientId,
          activityId: 'game-matching',
          activityTitle: 'Peaceful Nature Card Matching',
          activityType: 'game',
          timestamp: new Date().toISOString(),
          sessionId: `sess-success-${i}`,
          assistanceRequested: false,
          hintsUsedCount: 0,
          repeatedInstructionCount: 0,
          completionStatus: 'completed',
          pauseCount: 0,
          durationSeconds: 45,
          isInterrupted: false,
          currentLevel: 'Gentle',
        });

        if (i < 3) {
          expect(res.proposalGenerated).toBeUndefined();
        } else {
          expect(res.proposalGenerated).toBeDefined();
          expect(res.proposalGenerated?.proposedConfig.difficulty).toBe('Moderate');
          expect(res.proposalGenerated?.calmExplanation.en).toContain('Would you like to try a slightly different level, or stay with your familiar one?');
        }
      }

      // Difficulty does NOT change automatically without approval
      const profile = AdaptiveDifficultyService.getProfile(patientId);
      expect(profile.currentDifficulty).toBe('Gentle');
    });
  });

  describe('4. Approval, Clinician Authorization & Safe Rollback', () => {
    it('activates proposal on approval and updates domain configuration', async () => {
      const proposal = await AdaptiveSupportService.saveProposal({
        id: 'prop-test-approval',
        patientId,
        activityId: 'game-matching',
        activityTitle: 'Peaceful Nature Card Matching',
        domain: 'game_difficulty',
        previousConfig: { difficulty: 'Moderate' },
        proposedConfig: { difficulty: 'Gentle', pacing: 'calm' },
        rationale: 'Step down to gentle',
        calmExplanation: { en: 'Try gentler', hi: 'सरल', mr: 'सोपे' },
        evidenceSummary: {
          windowDays: 7,
          totalSessionsObserved: 2,
          struggleCount: 2,
          comfortableCount: 0,
          assistanceRequestCount: 2,
          consecutiveCount: 2,
        },
        status: 'recommendation_generated',
        isClinicianPrescribed: false,
        createdAt: new Date().toISOString(),
      });

      const approved = await AdaptiveSupportService.approveProposal(
        patientId,
        proposal.id,
        'patient-01',
        'patient'
      );

      expect(approved.status).toBe('activated');
      expect(approved.approvedBy).toBe('patient-01');
      expect(approved.activatedAt).toBeDefined();

      // Game profile updated
      const profile = AdaptiveDifficultyService.getProfile(patientId);
      expect(profile.currentDifficulty).toBe('Gentle');
    });

    it('strictly forbids non-doctors from approving modifications to clinician-prescribed tasks', async () => {
      const clinicianProposal = await AdaptiveSupportService.saveProposal({
        id: 'prop-doctor-task',
        patientId,
        activityId: 'game-matching',
        activityTitle: 'Peaceful Nature Card Matching',
        domain: 'game_difficulty',
        previousConfig: { difficulty: 'Moderate' },
        proposedConfig: { difficulty: 'Gentle' },
        rationale: 'Step down',
        calmExplanation: { en: 'Gentler', hi: 'सरल', mr: 'सोपे' },
        evidenceSummary: {
          windowDays: 7,
          totalSessionsObserved: 2,
          struggleCount: 2,
          comfortableCount: 0,
          assistanceRequestCount: 2,
          consecutiveCount: 2,
        },
        status: 'recommendation_generated',
        isClinicianPrescribed: true,
        prescribingDoctorId: 'doc-001',
        createdAt: new Date().toISOString(),
      });

      // Caregiver tries to approve clinician-assigned task: REJECTED
      await expect(
        AdaptiveSupportService.approveProposal(
          patientId,
          clinicianProposal.id,
          'caregiver-01',
          'caregiver'
        )
      ).rejects.toThrow(/Clinician-prescribed activities require doctor approval/i);

      // Doctor approves: ALLOWED
      const docApproved = await AdaptiveSupportService.approveProposal(
        patientId,
        clinicianProposal.id,
        'doc-001',
        'doctor'
      );
      expect(docApproved.status).toBe('activated');
    });

    it('declining a proposal preserves familiar configuration', async () => {
      const proposal = await AdaptiveSupportService.saveProposal({
        id: 'prop-decline',
        patientId,
        activityId: 'game-matching',
        activityTitle: 'Peaceful Nature Card Matching',
        domain: 'game_difficulty',
        previousConfig: { difficulty: 'Gentle' },
        proposedConfig: { difficulty: 'Moderate' },
        rationale: 'Optional step up',
        calmExplanation: { en: 'Optional step up', hi: 'सरल', mr: 'सोपे' },
        evidenceSummary: {
          windowDays: 7,
          totalSessionsObserved: 3,
          struggleCount: 0,
          comfortableCount: 3,
          assistanceRequestCount: 0,
          consecutiveCount: 3,
        },
        status: 'recommendation_generated',
        isClinicianPrescribed: false,
        createdAt: new Date().toISOString(),
      });

      const declined = await AdaptiveSupportService.declineProposal(
        patientId,
        proposal.id,
        'patient-01'
      );

      expect(declined.status).toBe('declined');
      expect(declined.declinedBy).toBe('patient-01');

      // Familiar configuration untouched
      const profile = AdaptiveDifficultyService.getProfile(patientId);
      expect(profile.currentDifficulty).toBe('Gentle');
    });

    it('reverts active proposal and restores previous configuration via rollback mechanism', async () => {
      // Setup activated proposal
      const proposal = await AdaptiveSupportService.saveProposal({
        id: 'prop-revert',
        patientId,
        activityId: 'game-matching',
        activityTitle: 'Peaceful Nature Card Matching',
        domain: 'game_difficulty',
        previousConfig: { difficulty: 'Gentle', pacing: 'calm' },
        proposedConfig: { difficulty: 'Moderate', pacing: 'balanced' },
        rationale: 'Previous step up',
        calmExplanation: { en: 'Previous step up', hi: 'सरल', mr: 'सोपे' },
        evidenceSummary: {
          windowDays: 7,
          totalSessionsObserved: 3,
          struggleCount: 0,
          comfortableCount: 3,
          assistanceRequestCount: 0,
          consecutiveCount: 3,
        },
        status: 'activated',
        isClinicianPrescribed: false,
        createdAt: new Date().toISOString(),
      });

      // Currently at Moderate
      await AdaptiveDifficultyService.saveProfile({
        ...AdaptiveDifficultyService.getDefaultProfile(patientId),
        currentDifficulty: 'Moderate',
      });

      // Rollback
      const reverted = await AdaptiveSupportService.revertProposal(
        patientId,
        proposal.id,
        patientId,
        'Patient preferred familiar Gentle level'
      );

      expect(reverted.status).toBe('reverted');
      expect(reverted.reversalReason).toBe('Patient preferred familiar Gentle level');

      // Restored previous configuration
      const profile = AdaptiveDifficultyService.getProfile(patientId);
      expect(profile.currentDifficulty).toBe('Gentle');
    });
  });
});
