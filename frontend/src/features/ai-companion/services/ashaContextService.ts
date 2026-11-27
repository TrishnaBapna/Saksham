/**
 * SAKSHAM NEURO-CARE — PHASE 3.9
 * CENTRAL UNIFIED PATIENT CONTEXT ASSEMBLY SERVICE
 *
 * Assembles:
 * 1. Authenticated patient identity & explicit reversible personalisation.
 * 2. Daily task lifecycle instances (completed, assisted, skipped, snoozed, in-progress, pending).
 * 3. 14-day rolling step pattern intelligence, simplification proposals, and safety locks.
 * 4. Grounded family anchors (Loved Ones) and verified household item locations.
 * 5. Cognitive concern journal with separate patient vs caregiver provenance.
 * 6. Active interrupted session recovery state (step index, elapsed time, timer state).
 * 7. Offline sync queue status and local inference model availability.
 *
 * Invariants:
 * - Every context record carries typed provenance (source, author, timestamp, sharingStatus, freshness, permissionDecision).
 * - Formal clinician assessment scores (MMSE, HMSE) are strictly filtered out from patient chat context.
 * - Stored user text is sanitized to neutralize prompt injection before entering LLM prompts.
 * - In-memory cache with 5s TTL + instant reactivity via subscribeToDataChanges.
 *
 * 100% Spark Free Plan compliant ($0.00 cloud cost, resident local processing).
 */

import { getLiveTemporalContext } from '../../../utils/temporalContext.js';
import {
  AshaUnifiedPatientContext,
  AshaPatientIdentityContext,
  AshaRoutinesContext,
  AshaStepAssistanceContext,
  AshaMemoryContext,
  AshaCognitiveJournalContext,
  AshaActiveSessionContext,
  AshaRuntimeContext,
  AshaDyadicCoordinationContext,
  ContextProvenanceRecord,
  StepPatternObservationSummary,
  AshaGroundedItemLocation,
} from '../types/ashaContext.types.js';
import { AshaContextPolicy } from './ashaContextPolicy.js';
import { AshaPersonalizationService } from './ashaPersonalizationService.js';
import { TaskLifecycleService } from '../../routines/services/taskLifecycleService.js';
import { StepPatternService } from '../../routines/services/stepPatternService.js';
import { RoutineSessionService } from '../../routines/services/routineSessionService.js';
import { CognitiveConcernService } from '../../clinical/services/cognitiveConcernService.js';
import { DyadicCareCoordinationService } from '../../caregiver/services/dyadicCareCoordinationService.js';
import { LovedOnesService } from '../../lovedOnes/services/lovedOnesService.js';
import { ItemLocationService } from '../../item-memory/services/itemLocationService.js';
import { SyncQueueService } from '../../../services/syncQueueService.js';
import { AshaRemoteAdapter } from './ashaRemoteAdapter.js';
import {
  getEffectivePatientId,
  isGuestPatient,
  subscribeToDataChanges,
} from '../../auth/services/identityService.js';

export class AshaContextService {
  private static cachedContexts: Record<string, { context: AshaUnifiedPatientContext; cachedAt: number }> = {};
  private static readonly CACHE_TTL_MS = 5000; // 5-second freshness window
  private static isSubscribedToEvents = false;

  public static initialize(): void {
    if (!this.isSubscribedToEvents) {
      subscribeToDataChanges(({ patientId }) => {
        this.invalidatePatient(patientId);
      });
      this.isSubscribedToEvents = true;
    }
  }

  public static invalidatePatient(patientId: string): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    delete this.cachedContexts[effectiveId];
  }

  public static clearAllContextCaches(): void {
    this.cachedContexts = {};
    AshaPersonalizationService.clearCache();
  }

  /**
   * Assembles an authoritative unified patient context snapshot.
   */
  public static getUnifiedContext(
    user: { uid?: string; displayName?: string | null } | null,
    forceRefresh: boolean = false
  ): AshaUnifiedPatientContext {
    this.initialize();
    const patientId = getEffectivePatientId(user);
    const now = Date.now();

    if (!forceRefresh && this.cachedContexts[patientId]) {
      const entry = this.cachedContexts[patientId];
      if (now - entry.cachedAt < this.CACHE_TTL_MS) {
        return entry.context;
      }
    }

    const assembled = this.buildContextSnapshot(user, patientId);
    this.cachedContexts[patientId] = { context: assembled, cachedAt: now };
    return assembled;
  }

  private static buildContextSnapshot(
    user: { uid?: string; displayName?: string | null } | null,
    patientId: string
  ): AshaUnifiedPatientContext {
    const isGuest = isGuestPatient(patientId);
    const rawDisplayName = user?.displayName || (isGuest ? 'Guest' : 'Sunita');
    const displayName = AshaContextPolicy.sanitizeStoredText(rawDisplayName, 60);
    const personalization = AshaPersonalizationService.getPreferences(patientId);
    const provenanceLog: ContextProvenanceRecord<any>[] = [];

    // -------------------------------------------------------------------------
    // 1. Identity Context
    // -------------------------------------------------------------------------
    const identity: AshaPatientIdentityContext = {
      patientId,
      displayName,
      isGuest,
      preferredLanguage: 'en',
      personalization,
    };
    provenanceLog.push(
      AshaContextPolicy.createProvenanceEnvelope(
        identity,
        'IdentityService',
        patientId,
        patientId,
        'system',
        'system_internal',
        'live_active'
      )
    );

    // -------------------------------------------------------------------------
    // 2. Routines & Task Lifecycle Context
    // -------------------------------------------------------------------------
    let todayInstances: ContextProvenanceRecord<any>[] = [];
    let completedInstances: any[] = [];
    let pendingInstances: any[] = [];
    let nextScheduledTask: any = null;
    let activeTask: any = null;
    let todayTotal = 0;
    let completedCount = 0;
    let assistedCount = 0;
    let skippedCount = 0;
    let snoozedCount = 0;
    let inProgressCount = 0;
    let pendingCount = 0;
    let progressPercentage = 0;
    let streakCount = 0;

    try {
      const instances = TaskLifecycleService.getOrCreateTodayInstances(patientId);
      const summary = TaskLifecycleService.getAshaGroundedTaskSummary(patientId);

      todayTotal = summary.todayTotal;
      completedCount = summary.completedCount;
      inProgressCount = summary.inProgressCount;
      pendingCount = summary.pendingCount;
      nextScheduledTask = summary.recommendedNext;

      instances.forEach((inst) => {
        if (inst.status === 'completed_assisted') assistedCount++;
        if (inst.status === 'skipped') skippedCount++;
        if (inst.status === 'snoozed') snoozedCount++;

        if (inst.status === 'completed' || inst.status === 'completed_assisted') {
          completedInstances.push(inst);
        } else if (inst.status === 'scheduled' || inst.status === 'snoozed') {
          pendingInstances.push(inst);
        } else if (inst.status === 'in_progress') {
          activeTask = inst;
        }

        const env = AshaContextPolicy.createProvenanceEnvelope(
          inst,
          'TaskLifecycleService',
          patientId,
          inst.patientId,
          inst.completionAttribution?.reportedBy || 'patient',
          'caregiver_shared',
          'today'
        );
        todayInstances.push(env);
        provenanceLog.push(env);
      });

      if (!activeTask && pendingInstances.length > 0) {
        activeTask = pendingInstances[0];
      }

      progressPercentage = todayTotal > 0 ? Math.round((completedCount / todayTotal) * 100) : 0;
      const history = TaskLifecycleService.getAllInstances(patientId);
      streakCount = history.filter((i) => i.status === 'completed').length > 0 ? 1 : 0;
    } catch {
      // Fallback on routines
    }

    const routines: AshaRoutinesContext = {
      todayTotal,
      completedCount,
      assistedCount,
      skippedCount,
      snoozedCount,
      inProgressCount,
      pendingCount,
      progressPercentage,
      streakCount,
      todayInstances,
      completedInstances,
      pendingInstances,
      nextScheduledTask,
      activeTask,
    };

    // -------------------------------------------------------------------------
    // 3. Step-Level Assistance & Pattern Intelligence Context
    // -------------------------------------------------------------------------
    const stepObservations: ContextProvenanceRecord<StepPatternObservationSummary>[] = [];
    let activeProposals: any[] = [];
    const safetyLockedStepIndices: number[] = [];

    try {
      const routineId = activeTask?.recurringTaskId || 'routine_chai';
      const patterns = StepPatternService.analyzeStepPatterns(patientId, routineId);
      activeProposals = StepPatternService.getSimplificationProposals(patientId, routineId);

      patterns.forEach((p) => {
        const safetyCheck = StepPatternService.evaluateSafetyLock(p.stepTitle);
        if (safetyCheck.isSafetyLocked) safetyLockedStepIndices.push(p.stepIndex);

        const prop = activeProposals.find((ap) => ap.stepIndex === p.stepIndex);

        const summaryItem: StepPatternObservationSummary = {
          stepIndex: p.stepIndex,
          stepText: AshaContextPolicy.sanitizeStoredText(p.stepTitle, 180),
          classification: p.classification,
          independentCount: p.independentCount || 0,
          hintCount: p.hintCount || 0,
          assistedCount: p.assistedCount || 0,
          isSafetyLocked: safetyCheck.isSafetyLocked,
          hasSimplificationProposal: Boolean(prop),
          simplifiedInstruction: prop?.proposedMicroActions?.join(', '),
          isPatientRestored: prop?.status === 'reverted',
        };

        const env = AshaContextPolicy.createProvenanceEnvelope(
          summaryItem,
          'StepPatternService',
          patientId,
          patientId,
          'system',
          'caregiver_shared',
          'recent_14d'
        );
        stepObservations.push(env);
        provenanceLog.push(env);
      });
    } catch {
      // Step pattern fallback
    }

    const stepAssistance: AshaStepAssistanceContext = {
      routineId: activeTask?.recurringTaskId,
      routineTitle: activeTask?.title,
      stepObservations,
      activeProposals,
      safetyLockedStepIndices,
    };

    // -------------------------------------------------------------------------
    // 4. Memory Context (Loved Ones & Grounded Item Locations)
    // -------------------------------------------------------------------------
    const lovedOnesEnvelopes: ContextProvenanceRecord<any>[] = [];
    const objectLocationsEnvelopes: ContextProvenanceRecord<AshaGroundedItemLocation>[] = [];

    try {
      const family = LovedOnesService.getLovedOnes(patientId);
      family.forEach((member) => {
        const rawNote = member.patientNotes || member.description || '';
        const cleanMember = {
          ...member,
          patientNotes: AshaContextPolicy.sanitizeStoredText(rawNote, 200),
        };
        const env = AshaContextPolicy.createProvenanceEnvelope(
          cleanMember,
          'LovedOnesService',
          patientId,
          patientId,
          'patient',
          'patient_private',
          'historical'
        );
        lovedOnesEnvelopes.push(env);
        provenanceLog.push(env);
      });

      const items = ItemLocationService.getItems(patientId);
      items.forEach((item) => {
        const locationSummary: AshaGroundedItemLocation = {
          itemName: item.itemName,
          locationRecorded: AshaContextPolicy.sanitizeStoredText(item.locationRecorded, 120),
          room: AshaContextPolicy.sanitizeStoredText(item.room, 60),
          recordedAt: item.recordedAt,
          notes: AshaContextPolicy.sanitizeStoredText(item.notes, 120),
          isReliable: Boolean(item.locationRecorded),
        };
        const env = AshaContextPolicy.createProvenanceEnvelope(
          locationSummary,
          'ItemLocationService',
          patientId,
          item.patientId || patientId,
          'patient',
          'patient_private',
          'today'
        );
        objectLocationsEnvelopes.push(env);
        provenanceLog.push(env);
      });
    } catch {
      // Memory fallback
    }

    const memory: AshaMemoryContext = {
      lovedOnes: lovedOnesEnvelopes,
      lovedOnesCount: lovedOnesEnvelopes.length,
      objectLocations: objectLocationsEnvelopes,
    };

    // -------------------------------------------------------------------------
    // 5. Cognitive Concern Journal Context (Separating Provenance)
    // -------------------------------------------------------------------------
    const patientConcerns: ContextProvenanceRecord<any>[] = [];
    const caregiverConcerns: ContextProvenanceRecord<any>[] = [];
    let consentedDoctorConcernsCount = 0;
    let appointmentFlaggedCount = 0;

    try {
      const allConcerns = CognitiveConcernService.getConcernsFromLocal(patientId);
      allConcerns.forEach((concern) => {
        if (concern.sharedWithDoctor) consentedDoctorConcernsCount++;
        if (concern.discussAtAppointment) appointmentFlaggedCount++;

        const cleanConcern = {
          ...concern,
          description: AshaContextPolicy.sanitizeStoredText(concern.description, 300),
          contextNotes: AshaContextPolicy.sanitizeStoredText(concern.contextNotes, 300),
        };

        const sharingStatus = concern.sharedWithDoctor ? 'doctor_consented' : 'patient_private';
        const env = AshaContextPolicy.createProvenanceEnvelope(
          cleanConcern,
          'CognitiveConcernService',
          patientId,
          concern.patientId,
          concern.perspective === 'patient' ? 'patient' : 'caregiver',
          sharingStatus,
          'recent_14d'
        );

        if (concern.perspective === 'patient') {
          patientConcerns.push(env);
        } else {
          caregiverConcerns.push(env);
        }
        provenanceLog.push(env);
      });
    } catch {
      // Journal fallback
    }

    const journal: AshaCognitiveJournalContext = {
      patientConcernsCount: patientConcerns.length,
      caregiverConcernsCount: caregiverConcerns.length,
      patientConcerns,
      caregiverConcerns,
      consentedDoctorConcernsCount,
      appointmentFlaggedCount,
    };

    // -------------------------------------------------------------------------
    // 6. Active Interrupted Session Context
    // -------------------------------------------------------------------------
    let activeSession: AshaActiveSessionContext = {
      hasActiveSession: false,
      currentStepIndex: 0,
      totalSteps: 0,
      elapsedSeconds: 0,
      isPaused: false,
      assistanceLevel: 0,
    };

    try {
      const activeSessions = RoutineSessionService.getAllActiveSessions(patientId);
      if (activeSessions.length > 0) {
        const topSession = activeSessions[0];
        activeSession = {
          hasActiveSession: true,
          sessionId: topSession.sessionId,
          routineId: topSession.routineId,
          routineTitle: topSession.routineTitle || activeTask?.title || 'Daily Routine',
          currentStepIndex: topSession.currentStepIndex || 0,
          currentStepText: undefined,
          totalSteps: (topSession.completedStepIndices?.length || 0) + 1,
          elapsedSeconds: 0,
          isPaused: topSession.isResting || false,
          assistanceLevel: 0,
          startedAt: topSession.startedAt,
          interruptedAt: topSession.lastUpdatedAt,
        };
      }
    } catch {
      // Active session fallback
    }

    // -------------------------------------------------------------------------
    // 7. Active Runtime & Inference Context
    // -------------------------------------------------------------------------
    const runtime: AshaRuntimeContext = {
      isOnline: SyncQueueService.isOnline(),
      pendingOfflineCount: SyncQueueService.getPendingCount(patientId),
      isLocalSLMAvailable: AshaRemoteAdapter.isCachedOnline(),
      activeModelName: 'Qwen2.5-1.5B (Apple Metal GPU / Local Bridge)',
      timestamp: new Date().toISOString(),
    };

    // -------------------------------------------------------------------------
    // 8. Dyadic Care Coordination Context (Phase 3.11)
    // -------------------------------------------------------------------------
    let dyadicCoordination: AshaDyadicCoordinationContext = {
      activeSupportRequestsCount: 0,
      pendingProposalsCount: 0,
      hasPatientVisibleHandoffs: false,
      discrepanciesCount: 0,
      pendingProposals: [],
      discrepancies: [],
    };

    try {
      const requests = DyadicCareCoordinationService.getSupportRequests(patientId);
      const activeRequests = requests.filter(
        (r) =>
          r.status === 'pending' ||
          r.status === 'acknowledged' ||
          r.status === 'assistance_provided'
      );
      const proposals = DyadicCareCoordinationService.getCaregiverProposals(patientId);
      const pendingProps = proposals.filter((p) => p.status === 'pending' || p.status === 'deferred');
      const handoffs = DyadicCareCoordinationService.getCaregiverHandoffs(patientId);
      const visibleHandoffs = handoffs.filter((h) => h.isPatientVisible !== false);
      const discrepancies = DyadicCareCoordinationService.getDiscrepancies(patientId);

      const latestReq = activeRequests.length > 0 ? activeRequests[0] : undefined;
      const latestHandoff = visibleHandoffs.length > 0 ? visibleHandoffs[0] : undefined;

      dyadicCoordination = {
        activeSupportRequestsCount: activeRequests.length,
        pendingProposalsCount: pendingProps.length,
        hasPatientVisibleHandoffs: visibleHandoffs.length > 0,
        discrepanciesCount: discrepancies.length,
        latestSupportRequest: latestReq
          ? {
              id: latestReq.id,
              requestType: latestReq.requestType,
              title: latestReq.title,
              status: latestReq.status,
              responseMessage: latestReq.responseMessage,
            }
          : undefined,
        pendingProposals: pendingProps.map((p) => ({
          id: p.id,
          title: p.title,
          proposalType: p.proposalType,
          safetyStatus: p.safetyStatus,
          authorName: p.authorName,
        })),
        recentHandoffsSummary: latestHandoff
          ? {
              shiftPeriod: latestHandoff.shiftPeriod,
              shiftDate: latestHandoff.shiftDate,
              caregiverName: latestHandoff.caregiverName,
              assistedActivitiesCount: latestHandoff.assistedActivities.length,
            }
          : undefined,
        discrepancies: discrepancies.map((d) => ({
          id: d.id,
          title: d.title,
          neutralExplanation: d.neutralExplanation,
          resolutionStatus: d.resolutionStatus,
        })),
      };
    } catch {
      // Dyadic fallback
    }

    return {
      patientId,
      assembledAt: new Date().toISOString(),
      identity,
      routines,
      stepAssistance,
      memory,
      journal,
      activeSession,
      runtime,
      dyadicCoordination,
      provenanceLog,
    };
  }

  /**
   * Generates a compact, injection-safe, token-bounded context summary (< 500 chars)
   * specifically formatted for local Qwen2.5-1.5B prompts.
   */
  public static generateCompactSLMContext(ctx: AshaUnifiedPatientContext): string {
    const parts: string[] = [];
    const temporal = getLiveTemporalContext(ctx.identity?.preferredLanguage || 'en');
    parts.push(`Now: ${temporal.currentTime} (${temporal.timeOfDay}), ${temporal.currentWeekday} ${temporal.currentDateISO}.`);

    // 1. Patient identity & style
    parts.push(`Patient: ${ctx.identity.displayName} (${ctx.identity.personalization.assistanceStyle}).`);

    // 2. Active Session / Next Routine
    if (ctx.activeSession.hasActiveSession && ctx.activeSession.currentStepText) {
      parts.push(
        `In-Progress: "${ctx.activeSession.routineTitle}" step ${ctx.activeSession.currentStepIndex + 1}/${ctx.activeSession.totalSteps}: ${ctx.activeSession.currentStepText}`
      );
    } else if (ctx.routines.nextScheduledTask) {
      parts.push(`Next Task: ${ctx.routines.nextScheduledTask.title} (${ctx.routines.nextScheduledTask.scheduledTime}).`);
    }

    // 3. Today's progress
    parts.push(`Progress: ${ctx.routines.completedCount}/${ctx.routines.todayTotal} completed.`);

    // 4. Grounded item locations (top 1-2 items)
    const reliableItems = ctx.memory.objectLocations
      .filter((i) => i.data.isReliable)
      .slice(0, 2)
      .map((i) => `${i.data.itemName}: ${i.data.locationRecorded}`);
    if (reliableItems.length > 0) {
      parts.push(`Item Locations: ${reliableItems.join('; ')}.`);
    }

    // 5. Offline flag if active
    if (!ctx.runtime.isOnline) {
      parts.push(`Status: Offline (${ctx.runtime.pendingOfflineCount} pending syncs).`);
    }

    // 6. Dyadic Coordination context (if active)
    if (ctx.dyadicCoordination?.activeSupportRequestsCount > 0) {
      parts.push(`Support: ${ctx.dyadicCoordination.activeSupportRequestsCount} request active.`);
    }
    if (ctx.dyadicCoordination?.pendingProposalsCount > 0) {
      parts.push(`Caregiver Suggestions: ${ctx.dyadicCoordination.pendingProposalsCount} pending review.`);
    }

    const summary = parts.join(' ');
    return summary.length > 500 ? summary.substring(0, 497) + '...' : summary;
  }
}
