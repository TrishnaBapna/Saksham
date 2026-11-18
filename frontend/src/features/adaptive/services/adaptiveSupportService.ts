/**
 * SAKSHAM — STAGE 3 PHASE B: ADAPTIVE PERSONALIZED SUPPORT ENGINE
 * Unified engine evaluating observed difficulties & successes across cognitive games & daily routines.
 * Enforces strict hysteresis, deduplication, clinician protection, rollback, and dignity-first rationale.
 * 100% Spark Free Plan compliant — strictly non-diagnostic.
 */

import {
  AdaptationObservation,
  CareAdaptationProposal,
  TemporarySupportResponse,
  StepExecutionState,
  RoutineExecutionRecord,
  AbilityDimensionScores,
  ReversibleRoutineChallenge,
} from '../types/adaptive.types.js';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import { doc, setDoc, getDocs, collection, query } from 'firebase/firestore';
import { getEffectivePatientId, isGuestPatient } from '../../auth/services/identityService.js';
import { AdaptiveDifficultyService } from '../../games/services/adaptiveDifficultyService.js';
import { DoctorAnalyticsService } from '../../doctor/services/doctorAnalyticsService.js';
import { NotificationService } from '../../notifications/services/notificationService.js';

export class AdaptiveSupportService {
  private static inMemoryProposals: Record<string, CareAdaptationProposal[]> = {};
  private static inMemoryObservations: Record<string, AdaptationObservation[]> = {};

  private static getProposalsKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_adaptive_proposals_${effectiveId}`;
  }

  private static getObservationsKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_adaptive_observations_${effectiveId}`;
  }

  private static safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Storage unavailable
    }
    return null;
  }

  private static safeSetItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Storage unavailable
    }
  }

  public static isOnline(): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  /**
   * Reset in-memory stores (used in test teardown & clinician logout)
   */
  public static clearCache(patientId?: string): void {
    if (patientId) {
      const effectiveId = getEffectivePatientId({ uid: patientId });
      delete this.inMemoryProposals[effectiveId];
      delete this.inMemoryObservations[effectiveId];
    } else {
      this.inMemoryProposals = {};
      this.inMemoryObservations = {};
    }
  }

  /**
   * Retrieves all recorded observations for a patient, optionally filtered by activityId.
   */
  public static getObservations(patientId: string, activityId?: string): AdaptationObservation[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    let list: AdaptationObservation[] = this.inMemoryObservations[effectiveId] || [];

    if (list.length === 0) {
      const stored = this.safeGetItem(this.getObservationsKey(effectiveId));
      if (stored) {
        try {
          list = JSON.parse(stored);
          this.inMemoryObservations[effectiveId] = list;
        } catch {
          list = [];
        }
      }
    }

    if (activityId) {
      return list.filter((o) => o.activityId === activityId);
    }
    return list;
  }

  /**
   * Retrieves all adaptation proposals for a patient.
   */
  public static getProposals(patientId: string): CareAdaptationProposal[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    let list: CareAdaptationProposal[] = this.inMemoryProposals[effectiveId] || [];

    if (list.length === 0) {
      const stored = this.safeGetItem(this.getProposalsKey(effectiveId));
      if (stored) {
        try {
          list = JSON.parse(stored);
          this.inMemoryProposals[effectiveId] = list;
        } catch {
          list = [];
        }
      }
    }

    return list;
  }

  /**
   * Returns the active proposal for an activity if one exists.
   */
  public static getActiveProposalForActivity(
    patientId: string,
    activityId: string
  ): CareAdaptationProposal | null {
    const proposals = this.getProposals(patientId);
    return (
      proposals.find(
        (p) => p.activityId === activityId && (p.status === 'activated' || p.status === 'accepted')
      ) || null
    );
  }

  /**
   * Returns a pending recommendation for an activity if one exists.
   */
  public static getPendingProposalForActivity(
    patientId: string,
    activityId: string
  ): CareAdaptationProposal | null {
    const proposals = this.getProposals(patientId);
    return (
      proposals.find(
        (p) =>
          p.activityId === activityId &&
          (p.status === 'recommendation_generated' || p.status === 'awaiting_approval')
      ) || null
    );
  }

  /**
   * Records an interaction observation from a cognitive game or routine runner.
   * Evaluates temporary support vs repeated support needs using strict hysteresis.
   */
  public static async recordObservation(
    observation: AdaptationObservation
  ): Promise<{
    temporaryAssistance?: TemporarySupportResponse;
    proposalGenerated?: CareAdaptationProposal;
  }> {
    const effectiveId = getEffectivePatientId({ uid: observation.patientId });

    // 1. Session Deduplication Guard: Never record the same session twice
    const existingObservations = this.getObservations(effectiveId, observation.activityId);
    if (existingObservations.some((o) => o.sessionId === observation.sessionId)) {
      return {};
    }

    // Save observation
    const updatedObservations = [observation, ...existingObservations].slice(0, 50);
    this.inMemoryObservations[effectiveId] = updatedObservations;
    this.safeSetItem(this.getObservationsKey(effectiveId), JSON.stringify(updatedObservations));

    // 2. Interrupted & Incomplete Session Guard:
    // If the session was interrupted (e.g. app closed, duration < 10 seconds, accidental exit),
    // it must NEVER be treated as a struggle or failure.
    if (observation.isInterrupted || observation.durationSeconds < 10) {
      return {};
    }

    // 3. Temporary Support Evaluation:
    // If patient requested help, paused, or struggled once, provide immediate temporary reassurance
    // without altering persistent configuration.
    const feedback = (observation.patientFeedback || '').toLowerCase();
    const isSingleStruggle =
      observation.assistanceRequested ||
      observation.hintsUsedCount >= 2 ||
      observation.repeatedInstructionCount >= 2 ||
      feedback.includes('tricky') ||
      feedback.includes('hard') ||
      feedback.includes('tired');

    let temporaryAssistance: TemporarySupportResponse | undefined;

    if (isSingleStruggle) {
      temporaryAssistance = {
        supportOffered: true,
        supportType: observation.pauseCount > 0 ? 'rest_break' : 'extra_hint',
        messageEn: 'Take all the time you need. A gentle hint and extra rest are always available.',
        messageHi: 'आराम से समय लें। आपको जब भी आवश्यकता हो, संकेत और विश्राम उपलब्ध है।',
        messageMr: 'शांतपणे वेळ घ्या. आपल्याला गरज भासल्यास नेहमी मदत आणि विश्रांती उपलब्ध आहे.',
      };
    }

    // 4. Repeated Support Evaluation (Hysteresis Guard):
    // Minimum evidence threshold: Requires at least 2 distinct completed struggle sessions in the
    // rolling window to recommend a more supportive configuration.
    const recentActivitySessions = updatedObservations
      .filter((o) => o.activityId === observation.activityId && !o.isInterrupted)
      .slice(0, 5);

    const struggleSessions = recentActivitySessions.filter(
      (s) =>
        s.assistanceRequested ||
        s.hintsUsedCount >= 2 ||
        s.repeatedInstructionCount >= 2 ||
        s.completionStatus === 'abandoned' ||
        (s.patientFeedback || '').toLowerCase().includes('hard') ||
        (s.patientFeedback || '').toLowerCase().includes('tricky')
    );

    const comfortableSessions = recentActivitySessions.filter(
      (s) =>
        s.completionStatus === 'completed' &&
        s.hintsUsedCount <= 1 &&
        s.repeatedInstructionCount === 0 &&
        !s.assistanceRequested
    );

    // 5. Avoid Duplicate Proposals:
    // If an existing pending recommendation or active proposal exists for this activity, do not duplicate.
    const pendingProposal = this.getPendingProposalForActivity(effectiveId, observation.activityId);
    if (pendingProposal) {
      return { temporaryAssistance };
    }

    // 6. Clinician Prescribed Guard:
    // Check if activity is clinician-assigned. Clinician-assigned activities require clinician approval.
    let isClinicianPrescribed = false;
    let prescribingDoctorId: string | undefined;

    try {
      const assignedActivities = await DoctorAnalyticsService.getAssignedCognitiveActivities(
        'demo-doctor-001',
        effectiveId
      );
      const match = assignedActivities.find((a) => a.gameId === observation.activityId);
      if (match) {
        isClinicianPrescribed = true;
        prescribingDoctorId = match.doctorId;
      }
    } catch {
      // Offline fallback
    }

    let proposalGenerated: CareAdaptationProposal | undefined;

    // CASE A: REPEATED STRUGGLE DETECTED (>= 2 struggle sessions)
    if (struggleSessions.length >= 2) {
      if (observation.activityType === 'game') {
        const currentProfile = AdaptiveDifficultyService.getProfile(effectiveId);
        const currentDiff = currentProfile.currentDifficulty;
        const proposedDiff = currentDiff === 'Stimulating' ? 'Moderate' : 'Gentle';

        if (currentDiff !== 'Gentle') {
          proposalGenerated = {
            id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            patientId: effectiveId,
            activityId: observation.activityId,
            activityTitle: observation.activityTitle,
            domain: 'game_difficulty',
            previousConfig: { difficulty: currentDiff, pacing: currentProfile.pacing },
            proposedConfig: {
              difficulty: proposedDiff,
              pacing: proposedDiff === 'Gentle' ? 'calm' : 'balanced',
            },
            rationale: 'Observed multiple sessions requiring extra cues. Offering a calmer, gentler pace.',
            calmExplanation: {
              en: `I noticed this game has felt a little challenging recently. Would you like to try a gentler level with fewer cards, or keep this one?`,
              hi: `मैंने देखा कि यह खेल हाल ही में थोड़ा कठिन लग रहा था। क्या आप आसान स्तर आजमाना चाहेंगे, या यही रखना चाहेंगे?`,
              mr: `मला आढळले की हा खेळ अलीकडे थोडा कठीण वाटत होता. आपण सोपी पातळी वापरून पाहू इच्छिता, की हीच सुरू ठेवू इच्छिता?`,
            },
            evidenceSummary: {
              windowDays: 7,
              totalSessionsObserved: recentActivitySessions.length,
              struggleCount: struggleSessions.length,
              comfortableCount: comfortableSessions.length,
              assistanceRequestCount: struggleSessions.filter((s) => s.assistanceRequested).length,
              consecutiveCount: struggleSessions.length,
            },
            status: 'recommendation_generated',
            isClinicianPrescribed,
            prescribingDoctorId,
            requiresCaregiverApproval: false,
            createdAt: new Date().toISOString(),
          };
        }
      } else if (observation.activityType === 'routine') {
        proposalGenerated = {
          id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          patientId: effectiveId,
          activityId: observation.activityId,
          activityTitle: observation.activityTitle,
          domain: 'routine_step_split',
          previousConfig: { mode: 'standard_steps' },
          proposedConfig: {
            mode: 'micro_step_split',
            singleStepFocus: true,
            offerRestBreak: true,
          },
          rationale: 'Observed repeated requests for step help. Recommending breaking the task into peaceful micro-steps.',
          calmExplanation: {
            en: `I noticed this step took a little extra effort recently. Would you like me to break it into smaller steps, showing one at a time?`,
            hi: `मैंने देखा कि इस कार्य में थोड़ा अधिक प्रयास लगा। क्या आप चाहेंगे कि मैं इसे छोटे-छोटे चरणों में बांटकर एक-एक करके दिखाऊं?`,
            mr: `मला आढळले की या कृतीसाठी थोडा जास्त वेळ लागला. मी ही कृती लहान पायऱ्यांमध्ये विभागून एका वेळी एकच पायरी दाखवू का?`,
          },
          evidenceSummary: {
            windowDays: 7,
            totalSessionsObserved: recentActivitySessions.length,
            struggleCount: struggleSessions.length,
            comfortableCount: comfortableSessions.length,
            assistanceRequestCount: struggleSessions.filter((s) => s.assistanceRequested).length,
            consecutiveCount: struggleSessions.length,
          },
          status: 'recommendation_generated',
          isClinicianPrescribed,
          prescribingDoctorId,
          requiresCaregiverApproval: true,
          createdAt: new Date().toISOString(),
        };
      }
    }

    // CASE B: CONSISTENT COMFORTABLE SUCCESS (>= 3 comfortable sessions)
    // Offers optional progression; NEVER forces progression and NEVER removes familiar activities.
    else if (comfortableSessions.length >= 3 && struggleSessions.length === 0) {
      if (observation.activityType === 'game') {
        const currentProfile = AdaptiveDifficultyService.getProfile(effectiveId);
        const currentDiff = currentProfile.currentDifficulty;
        const proposedDiff = currentDiff === 'Gentle' ? 'Moderate' : 'Stimulating';

        if (currentDiff !== 'Stimulating') {
          proposalGenerated = {
            id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            patientId: effectiveId,
            activityId: observation.activityId,
            activityTitle: observation.activityTitle,
            domain: 'game_difficulty',
            previousConfig: { difficulty: currentDiff, pacing: currentProfile.pacing },
            proposedConfig: {
              difficulty: proposedDiff,
              pacing: proposedDiff === 'Moderate' ? 'balanced' : 'agile',
            },
            rationale: 'Observed consistent comfort across 3 sessions. Offering an optional next level.',
            calmExplanation: {
              en: `You have been doing wonderfully with this game! Would you like to try a slightly different level, or stay with your familiar one?`,
              hi: `आप इस खेल में बहुत अच्छा कर रहे हैं! क्या आप थोड़ा अलग स्तर आजमाना चाहते हैं, या अपने जाने-पहचाने स्तर पर ही रहना चाहते हैं?`,
              mr: `आपण या खेळात खूप छान करत आहात! आपण थोडी वेगळी पातळी वापरून पाहू इच्छिता, की आपल्या परिचयाच्या पातळीवरच राहू इच्छिता?`,
            },
            evidenceSummary: {
              windowDays: 7,
              totalSessionsObserved: recentActivitySessions.length,
              struggleCount: 0,
              comfortableCount: comfortableSessions.length,
              assistanceRequestCount: 0,
              consecutiveCount: comfortableSessions.length,
            },
            status: 'recommendation_generated',
            isClinicianPrescribed,
            prescribingDoctorId,
            requiresCaregiverApproval: false,
            createdAt: new Date().toISOString(),
          };
        }
      }
    }

    if (proposalGenerated) {
      await this.saveProposal(proposalGenerated);
      // Stage 3 Phase C: Proactively notify caregiver of new proposal awaiting review
      await NotificationService.createNotification({
        patientId: effectiveId,
        recipientRole: proposalGenerated.requiresCaregiverApproval ? 'caregiver' : 'all',
        type: 'PROPOSAL_AWAITING_REVIEW',
        title: 'Care Support Recommendation',
        message: `A new gentle adjustment proposal was generated for "${proposalGenerated.activityTitle}".`,
        activityId: proposalGenerated.activityId,
        activityTitle: proposalGenerated.activityTitle,
        proposalId: proposalGenerated.id,
      });
    }

    return { temporaryAssistance, proposalGenerated };
  }

  /**
   * Persists a care adaptation proposal locally and pushes to Firestore when configured.
   */
  public static async saveProposal(proposal: CareAdaptationProposal): Promise<CareAdaptationProposal> {
    const effectiveId = getEffectivePatientId({ uid: proposal.patientId });
    const currentProposals = this.getProposals(effectiveId);
    const existingIndex = currentProposals.findIndex((p) => p.id === proposal.id);

    let updated: CareAdaptationProposal[];
    if (existingIndex !== -1) {
      updated = [...currentProposals];
      updated[existingIndex] = proposal;
    } else {
      updated = [proposal, ...currentProposals];
    }

    this.inMemoryProposals[effectiveId] = updated;
    this.safeSetItem(this.getProposalsKey(effectiveId), JSON.stringify(updated));

    // Firestore synchronization
    if (isFirebaseConfigured && !isGuestPatient(effectiveId) && this.isOnline()) {
      try {
        const docRef = doc(db, 'users', effectiveId, 'adaptiveProposals', proposal.id);
        await setDoc(docRef, proposal, { merge: true });
      } catch (err) {
        console.warn('[AdaptiveSupportService] Firestore sync error for proposal:', err);
      }
    }

    return proposal;
  }

  /**
   * Approves and activates an adaptation proposal with actor verification and role enforcement.
   */
  public static async approveProposal(
    patientId: string,
    proposalId: string,
    actorId: string,
    actorRole: 'patient' | 'caregiver' | 'doctor'
  ): Promise<CareAdaptationProposal> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const proposals = this.getProposals(effectiveId);
    const proposal = proposals.find((p) => p.id === proposalId);

    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    // Role Enforcement: Clinician-prescribed tasks CANNOT be altered by caregiver alone
    if (proposal.isClinicianPrescribed && actorRole !== 'doctor') {
      throw new Error(
        'Unauthorized: Clinician-prescribed activities require doctor approval to modify.'
      );
    }

    const now = new Date().toISOString();
    const approved: CareAdaptationProposal = {
      ...proposal,
      status: 'activated',
      approvedBy: actorId,
      approvedAt: now,
      activatedAt: now,
    };

    // Apply configuration changes to domain services
    if (approved.domain === 'game_difficulty') {
      const targetDiff = approved.proposedConfig.difficulty;
      const targetPacing = approved.proposedConfig.pacing || 'calm';
      await AdaptiveDifficultyService.saveProfile({
        ...AdaptiveDifficultyService.getProfile(effectiveId),
        currentDifficulty: targetDiff,
        pacing: targetPacing,
        adaptationRationale: approved.rationale,
        updatedAt: now,
      });
    }

    const saved = await this.saveProposal(approved);

    // In-app notification
    await NotificationService.createNotification({
      patientId: effectiveId,
      recipientRole: 'all',
      type: actorRole === 'caregiver' ? 'CAREGIVER_APPROVED' : 'CONFIGURATION_ACTIVATED',
      title: 'Support Adjustment Approved',
      message: `Adjustment for "${approved.activityTitle}" has been approved and activated.`,
      activityId: approved.activityId,
      activityTitle: approved.activityTitle,
      proposalId: approved.id,
    });

    return saved;
  }

  /**
   * Declines a proposal, preserving the patient's familiar configuration.
   */
  public static async declineProposal(
    patientId: string,
    proposalId: string,
    actorId: string
  ): Promise<CareAdaptationProposal> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const proposals = this.getProposals(effectiveId);
    const proposal = proposals.find((p) => p.id === proposalId);

    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    const declined: CareAdaptationProposal = {
      ...proposal,
      status: 'declined',
      declinedBy: actorId,
      declinedAt: new Date().toISOString(),
    };

    const saved = await this.saveProposal(declined);

    await NotificationService.createNotification({
      patientId: effectiveId,
      recipientRole: 'all',
      type: 'CAREGIVER_DECLINED',
      title: 'Support Adjustment Declined',
      message: `Adjustment proposal for "${declined.activityTitle}" was declined. Familiar version maintained.`,
      activityId: declined.activityId,
      activityTitle: declined.activityTitle,
      proposalId: declined.id,
    });

    return saved;
  }

  /**
   * Safe Rollback: Reverts an active proposal to its previous configuration.
   */
  public static async revertProposal(
    patientId: string,
    proposalId: string,
    actorId: string,
    reason: string = 'User requested restoration of familiar configuration'
  ): Promise<CareAdaptationProposal> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const proposals = this.getProposals(effectiveId);
    const proposal = proposals.find((p) => p.id === proposalId);

    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    const now = new Date().toISOString();
    const reverted: CareAdaptationProposal = {
      ...proposal,
      status: 'reverted',
      revertedBy: actorId,
      revertedAt: now,
      reversalReason: reason,
    };

    // Restore previous configuration
    if (proposal.domain === 'game_difficulty') {
      const prevDiff = proposal.previousConfig.difficulty || 'Gentle';
      const prevPacing = proposal.previousConfig.pacing || 'calm';
      await AdaptiveDifficultyService.saveProfile({
        ...AdaptiveDifficultyService.getProfile(effectiveId),
        currentDifficulty: prevDiff,
        pacing: prevPacing,
        adaptationRationale: `Restored familiar level (${prevDiff}) upon request.`,
        updatedAt: now,
      });
    }

    const saved = await this.saveProposal(reverted);

    await NotificationService.createNotification({
      patientId: effectiveId,
      recipientRole: 'all',
      type: 'CONFIGURATION_REVERTED',
      title: 'Configuration Reverted',
      message: `Familiar configuration restored for "${reverted.activityTitle}".`,
      activityId: reverted.activityId,
      activityTitle: reverted.activityTitle,
      proposalId: reverted.id,
    });

    return saved;
  }

  /**
   * Stage 3 Phase C: Records that ASHA explained the proposal to the patient.
   * Does NOT activate the proposal.
   */
  public static async recordExplanationDisplayed(
    patientId: string,
    proposalId: string
  ): Promise<CareAdaptationProposal | null> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const proposals = this.getProposals(effectiveId);
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal) return null;

    if (!proposal.explanationDisplayedAt) {
      const updated: CareAdaptationProposal = {
        ...proposal,
        explanationDisplayedAt: new Date().toISOString(),
      };
      return await this.saveProposal(updated);
    }
    return proposal;
  }

  /**
   * Stage 3 Phase C: Records explicit patient choice upon receiving an explanation from ASHA.
   * Dispatches transparent notifications and preserves familiar configuration when declined or kept.
   */
  public static async recordPatientChoice(
    patientId: string,
    proposalId: string,
    choice: 'accepted' | 'keep_familiar' | 'declined',
    explanation?: string
  ): Promise<CareAdaptationProposal> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const proposals = this.getProposals(effectiveId);
    const proposal = proposals.find((p) => p.id === proposalId);

    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    const now = new Date().toISOString();

    if (choice === 'keep_familiar' || choice === 'declined') {
      const updated: CareAdaptationProposal = {
        ...proposal,
        status: 'declined',
        declinedBy: 'patient',
        declinedAt: now,
        patientConsent: choice,
        patientRespondedAt: now,
        patientChoiceExplanation: explanation || 'Patient chose to keep familiar version',
      };
      const saved = await this.saveProposal(updated);
      await NotificationService.createNotification({
        patientId: effectiveId,
        recipientRole: 'caregiver',
        type: 'PATIENT_KEPT_FAMILIAR',
        title: 'Activity Preference Recorded',
        message: `Patient preferred to keep familiar version of "${proposal.activityTitle}".`,
        activityId: proposal.activityId,
        activityTitle: proposal.activityTitle,
        proposalId: proposal.id,
      });
      return saved;
    }

    // Choice is 'accepted'
    if (proposal.requiresCaregiverApproval) {
      const updated: CareAdaptationProposal = {
        ...proposal,
        status: 'awaiting_approval',
        patientConsent: 'accepted',
        patientRespondedAt: now,
        patientChoiceExplanation:
          explanation || 'Patient accepted suggested support; awaiting caregiver review',
      };
      const saved = await this.saveProposal(updated);
      await NotificationService.createNotification({
        patientId: effectiveId,
        recipientRole: 'caregiver',
        type: 'PROPOSAL_AWAITING_REVIEW',
        title: 'Care Support Update',
        message: `Patient expressed interest in smaller steps for "${proposal.activityTitle}". Awaiting caregiver review.`,
        activityId: proposal.activityId,
        activityTitle: proposal.activityTitle,
        proposalId: proposal.id,
      });
      return saved;
    } else {
      // Direct activation if caregiver approval not strictly required (e.g. game difficulty step down)
      const approved = await this.approveProposal(patientId, proposalId, patientId, 'patient');
      approved.patientConsent = 'accepted';
      approved.patientRespondedAt = now;
      const saved = await this.saveProposal(approved);
      await NotificationService.createNotification({
        patientId: effectiveId,
        recipientRole: 'caregiver',
        type: 'PATIENT_ACCEPTED_ADJUSTMENT',
        title: 'Activity Support Activated',
        message: `Patient accepted gentle adjustment for "${proposal.activityTitle}".`,
        activityId: proposal.activityId,
        activityTitle: proposal.activityTitle,
        proposalId: proposal.id,
      });
      return saved;
    }
  }

  /**
   * Synchronizes proposals from Cloud Firestore for cross-device consistency.
   */
  public static async syncProposalsFromFirestore(
    patientId: string
  ): Promise<CareAdaptationProposal[]> {
    const effectiveId = getEffectivePatientId({ uid: patientId });

    if (isGuestPatient(effectiveId) || !isFirebaseConfigured || !this.isOnline()) {
      return this.getProposals(effectiveId);
    }

    try {
      const q = query(collection(db, 'users', effectiveId, 'adaptiveProposals'));
      const snapshot = await getDocs(q);

      const cloudProposals: CareAdaptationProposal[] = [];
      const docList =
        typeof snapshot?.forEach === 'function'
          ? snapshot
          : Array.isArray(snapshot?.docs)
          ? snapshot.docs
          : [];

      docList.forEach((docSnap: any) => {
        if (!docSnap) return;
        const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap.data;
        if (data) {
          cloudProposals.push({
            ...data,
            id: docSnap.id || data.id,
            patientId: effectiveId,
          });
        }
      });

      // Merge with local proposals
      const local = this.getProposals(effectiveId);
      const map = new Map<string, CareAdaptationProposal>();
      local.forEach((p) => map.set(p.id, p));
      cloudProposals.forEach((p) => map.set(p.id, p));

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      this.inMemoryProposals[effectiveId] = merged;
      this.safeSetItem(this.getProposalsKey(effectiveId), JSON.stringify(merged));
      return merged;
    } catch (err) {
      console.warn('[AdaptiveSupportService] syncProposalsFromFirestore error:', err);
      return this.getProposals(effectiveId);
    }
  }

  // =========================================================================
  // PRIORITY 2: ADAPTIVE ROUTINE & STEP-LEVEL ABILITY INTELLIGENCE
  // =========================================================================

  private static getRoutineExecutionsKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_routine_executions_${effectiveId}`;
  }

  private static getRoutineChallengeKey(patientId: string, routineId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_routine_challenge_${effectiveId}_${routineId}`;
  }

  /**
   * Records a routine execution across 8 step-level states and computes ability dimensions.
   */
  public static async recordRoutineExecution(record: RoutineExecutionRecord): Promise<void> {
    const effectiveId = getEffectivePatientId({ uid: record.patientId });
    const key = this.getRoutineExecutionsKey(effectiveId);
    const existing = this.getRoutineExecutions(effectiveId);

    const updated = [record, ...existing.filter((r) => r.id !== record.id)].slice(0, 100);
    this.safeSetItem(key, JSON.stringify(updated));

    // Exclude interrupted or super-short sessions from being counted as struggle
    if (record.overallState === 'INTERRUPTED_EXTERNAL') {
      return;
    }

    // Determine if execution represents a struggle
    const hasStruggle =
      record.overallState === 'COMPLETED_WITH_CAREGIVER' ||
      record.overallState === 'NOT_ATTEMPTED' ||
      record.steps.some(
        (s) =>
          s.state === 'COMPLETED_WITH_CAREGIVER' ||
          s.assistanceLevel === 'caregiver_prompt' ||
          s.state === 'SKIPPED_INTENTIONALLY'
      );

    const hintsCount = record.steps.filter((s) => s.assistanceLevel === 'visual_hint').length;
    const guidesCount = record.steps.filter((s) => s.assistanceLevel === 'verbal_guide').length;

    // Bridge into existing adaptation observation loop
    const observation: AdaptationObservation = {
      id: `obs_rout_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      patientId: effectiveId,
      activityId: record.routineId,
      activityTitle: record.routineTitle,
      activityType: 'routine',
      timestamp: record.completedAt || new Date().toISOString(),
      sessionId: record.id,
      assistanceRequested: hasStruggle,
      hintsUsedCount: hintsCount,
      repeatedInstructionCount: guidesCount,
      completionStatus: hasStruggle ? 'abandoned' : 'completed',
      pauseCount: 0,
      durationSeconds: record.steps.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) || 60,
      isInterrupted: false,
      currentLevel: { overallState: record.overallState },
      notes: `Step-level execution: ${record.steps.length} steps logged`,
    };

    await this.recordObservation(observation);
  }

  /**
   * Retrieves past routine execution records.
   */
  public static getRoutineExecutions(patientId: string, routineId?: string): RoutineExecutionRecord[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getRoutineExecutionsKey(effectiveId));
    if (!raw) return [];
    try {
      const list: RoutineExecutionRecord[] = JSON.parse(raw);
      if (routineId) {
        return list.filter((r) => r.routineId === routineId);
      }
      return list;
    } catch {
      return [];
    }
  }

  /**
   * Evaluates 3 orthogonal ability dimensions:
   * 1. Remembering (Prospective memory: recalled routine was due)
   * 2. Initiating (Executive function: started prompt without stalling)
   * 3. Completing (Working memory & sequencing: completed steps)
   * Strictly non-diagnostic.
   */
  public static evaluateAbilityDimensions(patientId: string): AbilityDimensionScores {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const executions = this.getRoutineExecutions(effectiveId);

    // Default baseline if no execution history
    if (executions.length === 0) {
      return {
        patientId: effectiveId,
        rememberingScore: 0.9,
        initiatingScore: 0.9,
        completingScore: 0.9,
        evaluatedSessionsCount: 0,
        nonDiagnosticDisclaimer:
          'These scores represent measured behavioral task completion patterns only. Saksham does not compute clinical staging or medical diagnostic metrics.',
        evaluatedAt: new Date().toISOString(),
      };
    }

    const validSessions = executions.filter((e) => e.overallState !== 'INTERRUPTED_EXTERNAL');
    const total = validSessions.length || 1;

    // Remembering: proportion not requiring multiple alarms or not forgotten
    const rememberingSuccess = validSessions.filter(
      (e) => e.overallState !== 'NOT_ATTEMPTED' && e.overallState !== 'COMPLETION_UNCERTAIN'
    ).length;

    // Initiating: proportion started without caregiver takeover
    const initiatingSuccess = validSessions.filter(
      (e) => e.overallState !== 'COMPLETED_WITH_CAREGIVER' && e.overallState !== 'NOT_ATTEMPTED'
    ).length;

    // Completing: proportion completing all steps independently or with verbal guide
    const completingSuccess = validSessions.filter(
      (e) =>
        e.overallState === 'COMPLETED_INDEPENDENTLY' ||
        e.overallState === 'COMPLETED_WITH_REMINDER' ||
        e.overallState === 'COMPLETED_WITH_VERBAL_GUIDE'
    ).length;

    return {
      patientId: effectiveId,
      rememberingScore: Math.round((rememberingSuccess / total) * 100) / 100,
      initiatingScore: Math.round((initiatingSuccess / total) * 100) / 100,
      completingScore: Math.round((completingSuccess / total) * 100) / 100,
      evaluatedSessionsCount: validSessions.length,
      nonDiagnosticDisclaimer:
        'These scores represent measured behavioral task completion patterns only. Saksham does not compute clinical staging or medical diagnostic metrics.',
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Creates a reversible challenge for a routine (e.g. stepping up independence or micro-step grouping).
   * Fully reversible with 1-tap instant restore.
   */
  public static async createReversibleChallenge(
    patientId: string,
    routineId: string,
    challenge: {
      originalSteps: string[];
      challengedSteps: string[];
      rationale: string;
    }
  ): Promise<ReversibleRoutineChallenge> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const record: ReversibleRoutineChallenge = {
      routineId,
      patientId: effectiveId,
      originalSteps: challenge.originalSteps,
      challengedSteps: challenge.challengedSteps,
      isChallengeActive: true,
      canInstantRestore: true,
      rationale: challenge.rationale,
      appliedAt: new Date().toISOString(),
    };

    const key = this.getRoutineChallengeKey(effectiveId, routineId);
    this.safeSetItem(key, JSON.stringify(record));
    return record;
  }

  /**
   * Retrieves active reversible challenge for a routine.
   */
  public static getReversibleChallenge(
    patientId: string,
    routineId: string
  ): ReversibleRoutineChallenge | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getRoutineChallengeKey(effectiveId, routineId));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Reverts routine challenge with 1-tap rollback to original familiar steps.
   */
  public static async restoreOriginalRoutine(
    patientId: string,
    routineId: string
  ): Promise<boolean> {
    const challenge = this.getReversibleChallenge(patientId, routineId);
    if (!challenge) return false;

    const effectiveId = getEffectivePatientId({ uid: patientId });
    const restored: ReversibleRoutineChallenge = {
      ...challenge,
      isChallengeActive: false,
    };

    const key = this.getRoutineChallengeKey(effectiveId, routineId);
    this.safeSetItem(key, JSON.stringify(restored));
    return true;
  }

  /**
   * Time-based gentle checking near usual activity time.
   * Strictly "no-response-is-not-failure": silence or no response is NEVER counted as a struggle.
   */
  public static checkNearTimeActivityStatus(
    routineTitle: string,
    _scheduledTime: string,
    userResponse: 'yes' | 'no' | 'none' = 'none',
    language: string = 'en'
  ): {
    speech: string;
    status: StepExecutionState;
    requiresSupport: boolean;
  } {
    const isHi = language === 'hi';
    const isMr = language === 'mr';

    if (userResponse === 'yes') {
      return {
        speech: isMr
          ? `छान! तुम्ही '${routineTitle}' पूर्ण केले आहे. तुम्ही स्वतःची खूप छान काळजी घेत आहात!`
          : isHi
          ? `बहुत बढ़िया! आपने '${routineTitle}' पूरा कर लिया है। आप अपना बहुत अच्छा ध्यान रख रहे हैं!`
          : `Wonderful! You have finished '${routineTitle}'. You are taking wonderful care of yourself!`,
        status: 'COMPLETED_INDEPENDENTLY',
        requiresSupport: false,
      };
    }

    if (userResponse === 'no') {
      return {
        speech: isMr
          ? `काहीच घाई नाही, शांतपणे वेळ घ्या. मी तुम्हाला '${routineTitle}' मध्ये मदत करू का?`
          : isHi
          ? `कोई जल्दी नहीं है, आराम से समय लें। क्या मैं '${routineTitle}' में आपकी मदद करूँ?`
          : `No hurry at all, take all the time you need. Would you like me to gently guide you through '${routineTitle}'?`,
        status: 'COMPLETED_WITH_REMINDER',
        requiresSupport: true,
      };
    }

    // 'none' or timeout: strictly "no-response-is-not-failure"
    return {
      speech: isMr
        ? `शांत राहा. आपल्याला पाहिजे तितका वेळ घ्या. मी इथेच आपल्या सोबत आहे.`
        : isHi
        ? `बिल्कुल शांत रहें। जितना समय चाहिए लें। जब भी आप तैयार हों, मैं यहीं हूँ।`
        : `Take all the gentle time you need. Whenever you are ready, I am right here with you.`,
      status: 'COMPLETION_UNCERTAIN',
      requiresSupport: false, // Never treat silence as failure
    };
  }
}
