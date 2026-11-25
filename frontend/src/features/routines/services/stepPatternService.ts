/**
 * SAKSHAM NEURO-CARE — PHASE 3.3
 * STEP-LEVEL PATTERN LEARNING & ADAPTIVE INTELLIGENCE SERVICE
 * Learns micro-interaction patterns, detects step-specific choke points,
 * proposes targeted simplifications, and offers safety-gated familiarity challenges.
 * 100% Spark Free Plan compliant — strictly non-diagnostic.
 */

import {
  StepInteractionState,
  StepTelemetry,
  TaskInitiationTelemetry,
  StepPerformancePattern,
  StepSimplificationProposal,
  FamiliarityPreservingChallengeProposal,
  RoutineStepHistoryRecord,
  DyadicModificationRecord,
} from '../types/stepPattern.types.js';
import { getEffectivePatientId } from '../../auth/services/identityService.js';

export class StepPatternService {
  private static inMemoryStore: Record<string, string> = {};

  public static clearForTesting(): void {
    this.inMemoryStore = {};
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // Ignore
    }
  }

  public static clearPatientCache(patientId: string): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    delete this.inMemoryStore[this.getHistoryKey(effectiveId)];
    delete this.inMemoryStore[this.getProposalsKey(effectiveId)];
    delete this.inMemoryStore[this.getChallengesKey(effectiveId)];
    delete this.inMemoryStore[this.getModificationsKey(effectiveId)];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.getHistoryKey(effectiveId));
        window.localStorage.removeItem(this.getProposalsKey(effectiveId));
        window.localStorage.removeItem(this.getChallengesKey(effectiveId));
        window.localStorage.removeItem(this.getModificationsKey(effectiveId));
      }
    } catch {
      // Storage unavailable
    }
  }

  private static safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null && val !== undefined) return val;
      }
    } catch {
      // Storage unavailable in test runner
    }
    return this.inMemoryStore[key] || null;
  }

  private static safeSetItem(key: string, val: string): void {
    this.inMemoryStore[key] = val;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch {
      // Storage unavailable
    }
  }

  private static getHistoryKey(patientId: string): string {
    return `saksham_step_history_${patientId}`;
  }

  private static getProposalsKey(patientId: string): string {
    return `saksham_step_proposals_${patientId}`;
  }

  private static getChallengesKey(patientId: string): string {
    return `saksham_step_challenges_${patientId}`;
  }

  private static getModificationsKey(patientId: string): string {
    return `saksham_step_modifications_${patientId}`;
  }

  // ---------------------------------------------------------------------------
  // 1. STEP EXECUTION LOGGING
  // ---------------------------------------------------------------------------

  public static recordStepExecution(
    patientId: string,
    routineId: string,
    routineTitle: string,
    steps: StepTelemetry[],
    initiation?: TaskInitiationTelemetry
  ): RoutineStepHistoryRecord {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Determine overall state from step interactions
    const hasAssisted = steps.some((s) => s.state === 'ASSISTED' || s.assistanceRequested);
    const hasHints = steps.some((s) => s.state === 'HINT_USED' || s.hintTierUsed > 0);
    const allIndependent = steps.every((s) => s.state === 'INDEPENDENT' && s.hintTierUsed === 0);
    const hasSkipped = steps.some((s) => s.state === 'SKIPPED');
    const hasUncertain = steps.some((s) => s.state === 'UNCERTAIN');

    let overallState: StepInteractionState = 'INDEPENDENT';
    if (hasAssisted) {
      overallState = 'ASSISTED';
    } else if (hasHints) {
      overallState = 'HINT_USED';
    } else if (hasUncertain) {
      overallState = 'UNCERTAIN';
    } else if (hasSkipped) {
      overallState = 'SKIPPED';
    } else if (allIndependent) {
      overallState = 'INDEPENDENT';
    }

    const defaultInitiation: TaskInitiationTelemetry = {
      scheduledTime: '08:00 AM',
      openedAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      delayMinutes: 0,
      isInitiationDelayed: false,
      initiationReason: 'on_time',
    };

    const record: RoutineStepHistoryRecord = {
      id: `step_rec_${routineId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patientId: effectiveId,
      routineId,
      routineTitle,
      date: today,
      initiation: initiation || defaultInitiation,
      stepTelemetry: steps,
      overallState,
      completedAt: now.toISOString(),
    };

    const key = this.getHistoryKey(effectiveId);
    const existing = this.getStepHistory(effectiveId);
    const updated = [record, ...existing].slice(0, 100);
    this.safeSetItem(key, JSON.stringify(updated));

    return record;
  }

  public static getStepHistory(patientId: string, routineId?: string): RoutineStepHistoryRecord[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getHistoryKey(effectiveId));
    if (!raw) return [];
    try {
      const parsed: RoutineStepHistoryRecord[] = JSON.parse(raw);
      if (routineId) {
        return parsed.filter((r) => r.routineId === routineId);
      }
      return parsed;
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // 2. TASK-STEP PATTERN LEARNING ENGINE (C1)
  // ---------------------------------------------------------------------------

  public static analyzeStepPatterns(
    patientId: string,
    routineId: string,
    stepsCount: number = 3
  ): StepPerformancePattern[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const history = this.getStepHistory(effectiveId, routineId);

    const patterns: StepPerformancePattern[] = [];

    for (let idx = 0; idx < stepsCount; idx++) {
      // Extract all attempts for this specific step index across sessions
      const stepOccurrences = history
        .map((h) => h.stepTelemetry.find((s) => s.stepIndex === idx))
        .filter((s): s is StepTelemetry => s !== undefined);

      const totalAttempts = stepOccurrences.length;
      if (totalAttempts === 0) {
        patterns.push({
          stepIndex: idx,
          stepTitle: `Step ${idx + 1}`,
          totalAttempts: 0,
          independentCount: 0,
          hintCount: 0,
          assistedCount: 0,
          skippedCount: 0,
          averageDurationSeconds: 0,
          highestHintTierSeen: 0,
          classification: 'insufficient_data',
          confidence: 0,
          lastObservedAt: new Date().toISOString(),
        });
        continue;
      }

      const independentCount = stepOccurrences.filter(
        (s) => s.state === 'INDEPENDENT' && s.hintTierUsed === 0
      ).length;
      const hintCount = stepOccurrences.filter(
        (s) => s.state === 'HINT_USED' || s.hintTierUsed > 0
      ).length;
      const assistedCount = stepOccurrences.filter(
        (s) => s.state === 'ASSISTED' || s.assistanceRequested
      ).length;
      const skippedCount = stepOccurrences.filter((s) => s.state === 'SKIPPED').length;

      const totalDuration = stepOccurrences.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
      const avgDuration = Math.round(totalDuration / totalAttempts);
      const highestHint = Math.max(...stepOccurrences.map((s) => s.hintTierUsed || 0), 0) as
        | 0
        | 1
        | 2
        | 3;

      // Classification Logic (Requires >= 3 observations to avoid premature inference)
      let classification: StepPerformancePattern['classification'] = 'insufficient_data';
      let confidence = 0.3;

      if (totalAttempts >= 3) {
        confidence = Math.min(1.0, 0.6 + (totalAttempts / 10) * 0.4);

        if (assistedCount / totalAttempts >= 0.5) {
          classification = 'assistance_needed';
        } else if (hintCount / totalAttempts >= 0.5) {
          classification = 'frequent_hint';
        } else if (independentCount / totalAttempts >= 0.8 && hintCount === 0) {
          classification = 'mastered';
        } else if (independentCount / totalAttempts >= 0.6) {
          classification = 'familiar';
        } else {
          classification = 'variable';
        }
      } else {
        confidence = Math.round((totalAttempts / 3) * 0.5 * 100) / 100;
      }

      const stepTitle = stepOccurrences[0]?.stepTitle || `Step ${idx + 1}`;
      const lastObservedAt = stepOccurrences[0]?.timestamp || new Date().toISOString();

      patterns.push({
        stepIndex: idx,
        stepTitle,
        totalAttempts,
        independentCount,
        hintCount,
        assistedCount,
        skippedCount,
        averageDurationSeconds: avgDuration,
        highestHintTierSeen: highestHint,
        classification,
        confidence,
        lastObservedAt,
      });
    }

    return patterns;
  }

  // ---------------------------------------------------------------------------
  // 3. SAFETY-CRITICAL LOCK EVALUATION (C3)
  // ---------------------------------------------------------------------------

  public static evaluateSafetyLock(
    stepText: string,
    category: string = 'general'
  ): { isSafetyLocked: boolean; reason?: string } {
    const lower = (stepText || '').toLowerCase();
    const isMedCategory = category.toLowerCase() === 'medication';

    const safetyKeywords = [
      'medication',
      'medicine',
      'pill',
      'dose',
      'tablet',
      'kettle',
      'boil',
      'hot water',
      'stove',
      'gas',
      'flame',
      'fire',
      'knife',
      'cut',
      'sharp',
      'stair',
      'stairs',
      'bath',
      'shower',
      'electric',
      'outlet',
      'appliance',
      'transfer',
    ];

    const matchedKeyword = safetyKeywords.find((kw) => lower.includes(kw));

    if (isMedCategory || matchedKeyword) {
      return {
        isSafetyLocked: true,
        reason: isMedCategory
          ? 'Prescription safety: Medication routines are strictly locked against challenge reduction.'
          : `Physical safety safeguard: Step involves potentially hazardous activity ("${matchedKeyword}"). Prompting cannot be reduced.`,
      };
    }

    return { isSafetyLocked: false };
  }

  // ---------------------------------------------------------------------------
  // 4. REPEATED DIFFICULTY & TARGETED STEP SIMPLIFICATION (C2)
  // ---------------------------------------------------------------------------

  public static generateStepSimplification(
    patientId: string,
    routineId: string,
    routineTitle: string,
    pattern: StepPerformancePattern,
    stepInstruction: string
  ): StepSimplificationProposal | null {
    if (
      pattern.classification !== 'frequent_hint' &&
      pattern.classification !== 'assistance_needed'
    ) {
      return null;
    }

    if (pattern.confidence < 0.6) {
      return null; // Insufficient repeated evidence
    }

    const cleanText = stepInstruction.replace(/^\d+[\.\)]\s*/, '').trim();

    // Decompose compound step into 2 micro-actions
    const parts = cleanText.split(/and then|and|, then|;/i);
    let microActions: string[] = [];

    if (parts.length >= 2) {
      microActions = [
        `1. ${parts[0].trim()}`,
        `2. ${parts.slice(1).join(' and ').trim()}`,
      ];
    } else {
      microActions = [
        `1. Focus on the beginning: Take a calm breath and prepare what you need.`,
        `2. Complete the action gently: ${cleanText}`,
      ];
    }

    const proposal: StepSimplificationProposal = {
      id: `prop_step_${routineId}_s${pattern.stepIndex}_${Date.now()}`,
      routineId,
      routineTitle,
      stepIndex: pattern.stepIndex,
      originalStepText: stepInstruction,
      proposedMicroActions: microActions,
      contextualCue: `🌱 Orientation Cue: Notice where your items are arranged in your room before starting this step.`,
      rationale: `Pattern observed: Step ${pattern.stepIndex + 1} ("${cleanText.slice(0, 35)}...") has requested hints or assistance in ${pattern.hintCount + pattern.assistedCount} of ${pattern.totalAttempts} recent attempts. Breaking it into smaller actions preserves dignity and autonomy.`,
      status: 'proposed',
      createdAt: new Date().toISOString(),
      nonDiagnosticDisclaimer:
        'Descriptive behavioral observation for routine comfort. Not an assessment of cognitive decline.',
    };

    this.saveProposal(patientId, proposal);
    return proposal;
  }

  // ---------------------------------------------------------------------------
  // 5. FAMILIARITY-PRESERVING CHALLENGE GENERATION (C3)
  // ---------------------------------------------------------------------------

  public static generateStepChallenge(
    patientId: string,
    routineId: string,
    routineTitle: string,
    pattern: StepPerformancePattern,
    stepInstruction: string,
    category: string = 'wellness'
  ): FamiliarityPreservingChallengeProposal | null {
    const safetyCheck = this.evaluateSafetyLock(stepInstruction, category);

    // If safety locked, challenge is strictly blocked
    if (safetyCheck.isSafetyLocked) {
      return {
        id: `chal_locked_${routineId}_s${pattern.stepIndex}`,
        routineId,
        routineTitle,
        stepIndex: pattern.stepIndex,
        stepTitle: pattern.stepTitle,
        challengeType: 'reduced_prompt',
        promptQuestion: 'Safety-critical step: Full guided assistance preserved.',
        revealedStepText: stepInstruction,
        isSafetyLocked: true,
        safetyExemptReason: safetyCheck.reason,
        status: 'declined',
        createdAt: new Date().toISOString(),
        nonDiagnosticDisclaimer: 'Patient physical safety strictly overrides challenge eligibility.',
      };
    }

    // Only mastered steps with high confidence are eligible for challenge
    if (pattern.classification !== 'mastered' || pattern.confidence < 0.7) {
      return null;
    }

    const cleanText = stepInstruction.replace(/^\d+[\.\)]\s*/, '').trim();

    const proposal: FamiliarityPreservingChallengeProposal = {
      id: `chal_step_${routineId}_s${pattern.stepIndex}_${Date.now()}`,
      routineId,
      routineTitle,
      stepIndex: pattern.stepIndex,
      stepTitle: pattern.stepTitle,
      challengeType: 'recall_next_step',
      promptQuestion: `✨ Memory Challenge: You have performed this step independently many times! Can you recall what we do for Step ${pattern.stepIndex + 1} ("${cleanText.slice(0, 30)}...") before revealing it?`,
      revealedStepText: stepInstruction,
      isSafetyLocked: false,
      status: 'available',
      createdAt: new Date().toISOString(),
      nonDiagnosticDisclaimer:
        'Gentle optional exercise to engage synaptic recall. Reversible anytime with zero penalty.',
    };

    this.saveChallenge(patientId, proposal);
    return proposal;
  }

  // ---------------------------------------------------------------------------
  // 6. PERSISTENCE & PROPOSAL MANAGEMENT
  // ---------------------------------------------------------------------------

  public static getSimplificationProposals(
    patientId: string,
    routineId?: string
  ): StepSimplificationProposal[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getProposalsKey(effectiveId));
    if (!raw) return [];
    try {
      const parsed: StepSimplificationProposal[] = JSON.parse(raw);
      if (routineId) {
        return parsed.filter((p) => p.routineId === routineId);
      }
      return parsed;
    } catch {
      return [];
    }
  }

  public static saveProposal(patientId: string, proposal: StepSimplificationProposal): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const current = this.getSimplificationProposals(effectiveId);
    const updated = [proposal, ...current.filter((p) => p.id !== proposal.id)];
    this.safeSetItem(this.getProposalsKey(effectiveId), JSON.stringify(updated));
  }

  public static updateProposalStatus(
    patientId: string,
    proposalId: string,
    status: StepSimplificationProposal['status'],
    reviewedBy: 'caregiver' | 'clinician' = 'caregiver',
    reviewNotes?: string
  ): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const current = this.getSimplificationProposals(effectiveId);
    const index = current.findIndex((p) => p.id === proposalId);
    if (index !== -1) {
      const prev = current[index];
      current[index] = {
        ...prev,
        status,
        reviewedBy,
        reviewedAt: new Date().toISOString(),
        reviewNotes: reviewNotes || prev.reviewNotes,
      };
      this.safeSetItem(this.getProposalsKey(effectiveId), JSON.stringify(current));

      const modType =
        status === 'accepted'
          ? 'proposal_accepted'
          : status === 'declined'
          ? 'proposal_declined'
          : 'proposal_reverted';

      this.recordDyadicModification(effectiveId, {
        patientId: effectiveId,
        actor: reviewedBy,
        modificationType: modType,
        targetId: proposalId,
        routineId: prev.routineId,
        previousValue: prev.status,
        newValue: status,
        reason: reviewNotes || `Step simplification ${status} by ${reviewedBy}`,
      });
    }
  }

  public static getChallengeProposals(
    patientId: string,
    routineId?: string
  ): FamiliarityPreservingChallengeProposal[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getChallengesKey(effectiveId));
    if (!raw) return [];
    try {
      const parsed: FamiliarityPreservingChallengeProposal[] = JSON.parse(raw);
      if (routineId) {
        return parsed.filter((c) => c.routineId === routineId);
      }
      return parsed;
    } catch {
      return [];
    }
  }

  public static saveChallenge(
    patientId: string,
    challenge: FamiliarityPreservingChallengeProposal
  ): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const current = this.getChallengeProposals(effectiveId);
    const updated = [challenge, ...current.filter((c) => c.id !== challenge.id)];
    this.safeSetItem(this.getChallengesKey(effectiveId), JSON.stringify(updated));
  }

  public static updateChallengeStatus(
    patientId: string,
    challengeId: string,
    status: FamiliarityPreservingChallengeProposal['status'],
    reviewedBy: 'patient' | 'caregiver' = 'caregiver'
  ): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const current = this.getChallengeProposals(effectiveId);
    const index = current.findIndex((c) => c.id === challengeId);
    if (index !== -1) {
      const prev = current[index];
      current[index] = {
        ...prev,
        status,
        reviewedBy,
        reviewedAt: new Date().toISOString(),
      };
      this.safeSetItem(this.getChallengesKey(effectiveId), JSON.stringify(current));

      const modType =
        status === 'available' || status === 'in_progress'
          ? 'challenge_allowed'
          : status === 'declined'
          ? 'challenge_declined'
          : 'challenge_restored_by_patient';

      this.recordDyadicModification(effectiveId, {
        patientId: effectiveId,
        actor: reviewedBy,
        modificationType: modType,
        targetId: challengeId,
        routineId: prev.routineId,
        previousValue: prev.status,
        newValue: status,
        reason: `Challenge ${status} by ${reviewedBy}`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 7. DYADIC MODIFICATION AUDIT LOG (FEATURE E)
  // ---------------------------------------------------------------------------

  public static recordDyadicModification(
    patientId: string,
    mod: Omit<DyadicModificationRecord, 'id' | 'timestamp'>
  ): DyadicModificationRecord {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const record: DyadicModificationRecord = {
      ...mod,
      id: `mod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    const key = this.getModificationsKey(effectiveId);
    const existing = this.getDyadicModifications(effectiveId);
    const updated = [record, ...existing].slice(0, 100);
    this.safeSetItem(key, JSON.stringify(updated));
    return record;
  }

  public static getDyadicModifications(
    patientId: string,
    routineId?: string
  ): DyadicModificationRecord[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getModificationsKey(effectiveId));
    if (!raw) return [];
    try {
      const parsed: DyadicModificationRecord[] = JSON.parse(raw);
      if (routineId) {
        return parsed.filter((m) => m.routineId === routineId);
      }
      return parsed;
    } catch {
      return [];
    }
  }

  public static getDyadicModificationHistory(
    patientId: string,
    routineId?: string
  ): DyadicModificationRecord[] {
    return this.getDyadicModifications(patientId, routineId);
  }

  // ---------------------------------------------------------------------------
  // 8. FACTUAL, NON-DIAGNOSTIC EXPLANATIONS & LABELS (FEATURE B)
  // ---------------------------------------------------------------------------

  public static getPatternLabel(
    classification: StepPerformancePattern['classification'],
    isSafetyLocked: boolean = false
  ): string {
    if (isSafetyLocked) return 'Safety Safeguard Active';
    switch (classification) {
      case 'mastered':
        return 'Comfortable (Independent)';
      case 'familiar':
        return 'Familiar Guidance Active';
      case 'frequent_hint':
        return 'Frequently Requests Cues';
      case 'assistance_needed':
        return 'Caregiver Assistance Recorded';
      case 'variable':
        return 'Mixed Interaction Flow';
      case 'insufficient_data':
      default:
        return 'Observing (< 3 attempts)';
    }
  }

  public static getFactualExplanation(
    pattern: StepPerformancePattern,
    safetyLock?: { isSafetyLocked: boolean; reason?: string }
  ): string {
    const windowDays = 14;
    const { totalAttempts, independentCount, hintCount, assistedCount, skippedCount } = pattern;

    if (totalAttempts < 3) {
      return `During the last ${windowDays} days, this step was recorded ${totalAttempts} times (${independentCount} independent, ${hintCount} with hints, ${assistedCount} caregiver-assisted). Insufficient observations (< 3 attempts) to suggest adjustments. Continuing gentle observation.`;
    }

    if (safetyLock?.isSafetyLocked) {
      return `During the last ${windowDays} days, this step was recorded ${totalAttempts} times. Physical safety safeguard is active: full guided steps are retained.`;
    }

    if (pattern.classification === 'mastered') {
      return `During the last ${windowDays} days, this step was recorded independently ${independentCount} times. An optional memory challenge is available to support cognitive engagement.`;
    }

    if (pattern.classification === 'familiar') {
      return `During the last ${windowDays} days, this step was completed comfortably with independent flow in ${independentCount} of ${totalAttempts} attempts. Familiar guidance remains active.`;
    }

    if (pattern.classification === 'frequent_hint') {
      return `During the last ${windowDays} days, this step was recorded ${totalAttempts} times. A hint or additional guidance was requested on ${hintCount} occasions. An optional micro-action simplification is proposed below.`;
    }

    if (pattern.classification === 'assistance_needed') {
      return `During the last ${windowDays} days, this step was recorded ${totalAttempts} times. Caregiver assistance was recorded on ${assistedCount} occasions. A simplified 2-step breakdown is proposed for caregiver review.`;
    }

    // Variable or skipped
    const skippedNote = skippedCount > 0 ? ` (skipped without penalty ${skippedCount} times)` : '';
    return `During the last ${windowDays} days, this step had mixed interaction types across ${totalAttempts} attempts (${independentCount} independent, ${hintCount} hints, ${assistedCount} assisted)${skippedNote}. Standard guidance is maintained.`;
  }
}
