/**
 * SAKSHAM NEURO-CARE — PHASE 3.11
 * Dyadic Care Coordination Service
 *
 * Central service managing:
 * 1. Patient Support Requests (Patient-initiated, transparent in-app delivery).
 * 2. Caregiver Proposals (Caregiver proposes, patient decides with Accept / Decline / Review Later).
 * 3. Caregiver Handoffs (Concise factual shift summaries without clinical assumptions).
 * 4. Dyadic Discrepancies (Preserving divergent perspectives neutrally).
 * 5. Shared Appointment Preparation Selection.
 *
 * Integrates with:
 * - SyncQueueService for resilient offline queuing and idempotent retry.
 * - DyadicCareCoordinationPolicy for authorization, safety locks, and non-adversarial tone.
 * - TaskLifecycleService for non-destructive routine updates upon explicit acceptance.
 *
 * 100% Spark Free Plan compliant ($0.00 cloud cost, resident local processing).
 */

import {
  SupportRequest,
  SupportRequestType,
  CaregiverProposal,
  CaregiverProposalType,
  CaregiverProposalStatus,
  CaregiverProposalDetails,
  CaregiverHandoff,
  HandoffShiftPeriod,
  AssistedActivityRecord,
  DyadicDiscrepancy,
  DiscrepancyDomain,
  AppointmentPreparationItem,
  SharedAppointmentPreparationSummary,
} from '../types/dyadicCareCoordination.types.js';
import { DyadicCareCoordinationPolicy } from './dyadicCareCoordinationPolicy.js';
import { SyncQueueService } from '../../../services/syncQueueService.js';
import { getEffectivePatientId } from '../../auth/services/identityService.js';
import { StepPatternService } from '../../routines/services/stepPatternService.js';
import { CognitiveConcernService } from '../../clinical/services/cognitiveConcernService.js';

export class DyadicCareCoordinationService {
  private static inMemoryStore: Record<string, string> = {};

  // ---------------------------------------------------------------------------
  // CACHE & STORAGE KEYS
  // ---------------------------------------------------------------------------

  public static clearPatientCache(patientId: string): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    delete this.inMemoryStore[this.getRequestsKey(effectiveId)];
    delete this.inMemoryStore[this.getProposalsKey(effectiveId)];
    delete this.inMemoryStore[this.getHandoffsKey(effectiveId)];
    delete this.inMemoryStore[this.getDiscrepanciesKey(effectiveId)];

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.getRequestsKey(effectiveId));
        window.localStorage.removeItem(this.getProposalsKey(effectiveId));
        window.localStorage.removeItem(this.getHandoffsKey(effectiveId));
        window.localStorage.removeItem(this.getDiscrepanciesKey(effectiveId));
      }
    } catch {
      // Storage unavailable
    }
  }

  public static clearAllCaches(): void {
    this.inMemoryStore = {};
  }

  private static getRequestsKey(patientId: string): string {
    return `saksham_support_requests_${patientId}`;
  }

  private static getProposalsKey(patientId: string): string {
    return `saksham_caregiver_proposals_${patientId}`;
  }

  private static getHandoffsKey(patientId: string): string {
    return `saksham_caregiver_handoffs_${patientId}`;
  }

  private static getDiscrepanciesKey(patientId: string): string {
    return `saksham_dyadic_discrepancies_${patientId}`;
  }

  private static safeGetItem(key: string): string | null {
    if (this.inMemoryStore[key] !== undefined) {
      return this.inMemoryStore[key];
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) {
          this.inMemoryStore[key] = val;
          return val;
        }
      }
    } catch {
      // Fallback
    }
    return null;
  }

  private static safeSetItem(key: string, value: string): void {
    this.inMemoryStore[key] = value;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Fallback
    }
  }

  // ---------------------------------------------------------------------------
  // 1. PATIENT SUPPORT REQUESTS LIFECYCLE
  // ---------------------------------------------------------------------------

  public static async createSupportRequest(
    patientId: string,
    payload: {
      patientName: string;
      requestType: SupportRequestType;
      title: string;
      message: string;
      targetCaregiverId?: string;
      targetCaregiverName?: string;
      relatedActivityId?: string;
      relatedActivityTitle?: string;
    }
  ): Promise<SupportRequest> {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const request: SupportRequest = {
      id,
      patientId: effectiveId,
      authorId: effectiveId,
      authorName: payload.patientName || 'Patient',
      authorRole: 'patient',
      timestamp: nowIso,
      originalSource: 'PatientSupportTray',
      consentState: 'shared_with_caregiver',
      syncState: 'pending',
      isPatientReported: true,
      isCaregiverReported: false,
      isIndependentlyVerified: false,
      requestType: payload.requestType,
      title: payload.title,
      message: payload.message,
      targetCaregiverId: payload.targetCaregiverId || 'any_authorized',
      targetCaregiverName: payload.targetCaregiverName || 'Caregiver',
      status: 'pending',
      relatedActivityId: payload.relatedActivityId,
      relatedActivityTitle: payload.relatedActivityTitle,
    };

    const current = this.getSupportRequests(effectiveId);
    const updated = [request, ...current];
    this.safeSetItem(this.getRequestsKey(effectiveId), JSON.stringify(updated));

    // Enqueue for offline sync
    SyncQueueService.enqueue(effectiveId, 'supportRequests', id, 'upsert', request);

    return request;
  }

  public static getSupportRequests(
    patientId: string,
    filterCaregiverId?: string
  ): SupportRequest[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getRequestsKey(effectiveId));
    if (!raw) return [];
    try {
      const parsed: SupportRequest[] = JSON.parse(raw);
      if (filterCaregiverId) {
        return parsed.filter(
          (r) =>
            r.targetCaregiverId === 'any_authorized' ||
            r.targetCaregiverId === filterCaregiverId
        );
      }
      return parsed;
    } catch {
      return [];
    }
  }

  public static async acknowledgeSupportRequest(
    caregiverId: string,
    caregiverName: string,
    patientId: string,
    requestId: string
  ): Promise<SupportRequest | null> {
    const isAuth = await DyadicCareCoordinationPolicy.isCaregiverAuthorized(caregiverId, patientId);
    if (!isAuth) {
      throw new Error(`Unauthorized caregiver ${caregiverId} for patient ${patientId}`);
    }

    const effectiveId = getEffectivePatientId({ uid: patientId });
    const requests = this.getSupportRequests(effectiveId);
    const index = requests.findIndex((r) => r.id === requestId);
    if (index === -1) return null;

    const req = requests[index];
    if (req.status === 'cancelled' || req.status === 'resolved') {
      return req;
    }

    const updated: SupportRequest = {
      ...req,
      status: 'acknowledged',
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: { caregiverId, caregiverName },
      syncState: 'pending',
    };

    requests[index] = updated;
    this.safeSetItem(this.getRequestsKey(effectiveId), JSON.stringify(requests));
    SyncQueueService.enqueue(effectiveId, 'supportRequests', requestId, 'upsert', updated);

    return updated;
  }

  public static async respondToSupportRequest(
    caregiverId: string,
    caregiverName: string,
    patientId: string,
    requestId: string,
    responseMessage: string
  ): Promise<SupportRequest | null> {
    const isAuth = await DyadicCareCoordinationPolicy.isCaregiverAuthorized(caregiverId, patientId);
    if (!isAuth) {
      throw new Error(`Unauthorized caregiver ${caregiverId} for patient ${patientId}`);
    }

    const effectiveId = getEffectivePatientId({ uid: patientId });
    const requests = this.getSupportRequests(effectiveId);
    const index = requests.findIndex((r) => r.id === requestId);
    if (index === -1) return null;

    const req = requests[index];
    const updated: SupportRequest = {
      ...req,
      status: 'assistance_provided',
      responseMessage,
      acknowledgedAt: req.acknowledgedAt || new Date().toISOString(),
      acknowledgedBy: req.acknowledgedBy || { caregiverId, caregiverName },
      syncState: 'pending',
    };

    requests[index] = updated;
    this.safeSetItem(this.getRequestsKey(effectiveId), JSON.stringify(requests));
    SyncQueueService.enqueue(effectiveId, 'supportRequests', requestId, 'upsert', updated);

    return updated;
  }

  public static resolveSupportRequest(
    patientId: string,
    requestId: string,
    resolvedBy: 'patient' | 'caregiver' = 'patient'
  ): SupportRequest | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const requests = this.getSupportRequests(effectiveId);
    const index = requests.findIndex((r) => r.id === requestId);
    if (index === -1) return null;

    const req = requests[index];
    const updated: SupportRequest = {
      ...req,
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      resolvedBy,
      syncState: 'pending',
    };

    requests[index] = updated;
    this.safeSetItem(this.getRequestsKey(effectiveId), JSON.stringify(requests));
    SyncQueueService.enqueue(effectiveId, 'supportRequests', requestId, 'upsert', updated);

    return updated;
  }

  public static cancelSupportRequest(
    patientId: string,
    requestId: string,
    reason: string = 'Cancelled by patient'
  ): SupportRequest | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const requests = this.getSupportRequests(effectiveId);
    const index = requests.findIndex((r) => r.id === requestId);
    if (index === -1) return null;

    const req = requests[index];
    const updated: SupportRequest = {
      ...req,
      status: 'cancelled',
      cancellationReason: reason,
      resolvedAt: new Date().toISOString(),
      resolvedBy: 'patient',
      syncState: 'pending',
    };

    requests[index] = updated;
    this.safeSetItem(this.getRequestsKey(effectiveId), JSON.stringify(requests));
    SyncQueueService.enqueue(effectiveId, 'supportRequests', requestId, 'upsert', updated);

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 2. CAREGIVER PROPOSALS & PATIENT REVIEW LIFECYCLE
  // ---------------------------------------------------------------------------

  public static async createCaregiverProposal(
    caregiverId: string,
    caregiverName: string,
    patientId: string,
    payload: {
      proposalType: CaregiverProposalType;
      title: string;
      summary: string;
      details: CaregiverProposalDetails;
      routineCategory?: string;
      instructionText?: string;
      isClinicianPrescribed?: boolean;
    }
  ): Promise<CaregiverProposal> {
    const isAuth = await DyadicCareCoordinationPolicy.isCaregiverAuthorized(caregiverId, patientId);
    if (!isAuth) {
      throw new Error(`Unauthorized caregiver ${caregiverId} for patient ${patientId}`);
    }

    const effectiveId = getEffectivePatientId({ uid: patientId });

    // Check duplicate pending proposals
    const existing = this.getCaregiverProposals(effectiveId);
    const isDuplicate = existing.some(
      (p) =>
        p.status === 'pending' &&
        p.proposalType === payload.proposalType &&
        p.details.routineId === payload.details.routineId &&
        p.details.stepIndex === payload.details.stepIndex
    );
    if (isDuplicate) {
      throw new Error('A pending proposal for this routine step already exists');
    }

    const safetyStatus = DyadicCareCoordinationPolicy.evaluateSafetyLock(
      payload.routineCategory || '',
      payload.instructionText || payload.details.originalValue || '',
      !!payload.isClinicianPrescribed
    );

    const id = `prop_cg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const proposal: CaregiverProposal = {
      id,
      patientId: effectiveId,
      authorId: caregiverId,
      authorName: caregiverName,
      authorRole: 'caregiver',
      timestamp: nowIso,
      originalSource: 'CaregiverProposalModal',
      consentState: 'shared_with_caregiver',
      syncState: 'pending',
      isPatientReported: false,
      isCaregiverReported: true,
      isIndependentlyVerified: false,
      proposalType: payload.proposalType,
      title: payload.title,
      summary: payload.summary,
      details: payload.details,
      safetyStatus,
      status: 'pending',
      reviewedByPatient: false,
      isReversible: true,
    };

    const updated = [proposal, ...existing];
    this.safeSetItem(this.getProposalsKey(effectiveId), JSON.stringify(updated));
    SyncQueueService.enqueue(effectiveId, 'caregiverProposals', id, 'upsert', proposal);

    return proposal;
  }

  public static getCaregiverProposals(
    patientId: string,
    statusFilter?: CaregiverProposalStatus
  ): CaregiverProposal[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getProposalsKey(effectiveId));
    if (!raw) return [];
    try {
      const parsed: CaregiverProposal[] = JSON.parse(raw);
      if (statusFilter) {
        return parsed.filter((p) => p.status === statusFilter);
      }
      return parsed;
    } catch {
      return [];
    }
  }

  public static reviewProposalByPatient(
    patientId: string,
    proposalId: string,
    decision: 'accepted' | 'declined' | 'deferred',
    patientNote?: string,
    actorRole: import('../types/dyadicCareCoordination.types.js').DyadicAuthorRole = 'patient'
  ): CaregiverProposal | null {
    // 1. Role Authorization Check: Only patient can accept, decline, or defer
    const action: 'accept' | 'decline' | 'defer' =
      decision === 'accepted' ? 'accept' : decision === 'declined' ? 'decline' : 'defer';
    if (!DyadicCareCoordinationPolicy.canReviewProposal(actorRole, action)) {
      throw new Error(`Unauthorized actor role "${actorRole}": Only the patient can review proposals`);
    }

    const effectiveId = getEffectivePatientId({ uid: patientId });
    const proposals = this.getCaregiverProposals(effectiveId);
    const index = proposals.findIndex((p) => p.id === proposalId);
    if (index === -1) return null;

    const prop = proposals[index];

    // 2. Lifecycle State Transition Guard: Cannot re-review already finalized proposals
    if (prop.status === 'declined' || prop.status === 'withdrawn') {
      throw new Error(`Cannot review proposal in "${prop.status}" state: Decision already finalized`);
    }

    // 3. Safety Lock Guard: If safety locked, it cannot be accepted
    if (decision === 'accepted' && prop.safetyStatus !== 'safe') {
      throw new Error(`Cannot accept proposal: Safety lock active (${prop.safetyStatus})`);
    }

    const updated: CaregiverProposal = {
      ...prop,
      status: decision === 'accepted' ? 'accepted' : decision === 'declined' ? 'declined' : 'deferred',
      reviewedByPatient: decision !== 'deferred',
      patientDecision: {
        decision,
        decidedAt: new Date().toISOString(),
        patientNote,
      },
      syncState: 'pending',
    };

    proposals[index] = updated;
    this.safeSetItem(this.getProposalsKey(effectiveId), JSON.stringify(proposals));
    SyncQueueService.enqueue(effectiveId, 'caregiverProposals', proposalId, 'upsert', updated);

    // If accepted and has a routine step update, record attribution in StepPatternService
    if (decision === 'accepted' && prop.details.routineId && prop.details.proposedValue) {
      StepPatternService.recordDyadicModification(effectiveId, {
        patientId: effectiveId,
        targetId: prop.id,
        routineId: prop.details.routineId,
        modificationType: 'proposal_accepted',
        actor: 'patient',
        previousValue: prop.details.originalValue,
        newValue: prop.details.proposedValue,
        reason: patientNote || `Accepted caregiver adaptation from ${prop.authorName}`,
      });
    }

    return updated;
  }

  public static withdrawProposalByCaregiver(
    caregiverId: string,
    patientId: string,
    proposalId: string
  ): CaregiverProposal | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const proposals = this.getCaregiverProposals(effectiveId);
    const index = proposals.findIndex((p) => p.id === proposalId);
    if (index === -1) return null;

    const prop = proposals[index];
    if (prop.authorId !== caregiverId) {
      throw new Error('Only the authoring caregiver can withdraw their proposal');
    }
    if (prop.status !== 'pending' && prop.status !== 'deferred') {
      throw new Error('Cannot withdraw an already reviewed proposal');
    }

    const updated: CaregiverProposal = {
      ...prop,
      status: 'withdrawn',
      syncState: 'pending',
    };

    proposals[index] = updated;
    this.safeSetItem(this.getProposalsKey(effectiveId), JSON.stringify(proposals));
    SyncQueueService.enqueue(effectiveId, 'caregiverProposals', proposalId, 'upsert', updated);

    return updated;
  }

  public static revertAcceptedProposal(
    patientId: string,
    proposalId: string,
    revertedBy: 'patient' | 'caregiver' = 'patient'
  ): CaregiverProposal | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const proposals = this.getCaregiverProposals(effectiveId);
    const index = proposals.findIndex((p) => p.id === proposalId);
    if (index === -1) return null;

    const prop = proposals[index];
    if (prop.status !== 'accepted') return prop;

    const updated: CaregiverProposal = {
      ...prop,
      status: 'declined', // Reverted back to declined/inactive
      revertedAt: new Date().toISOString(),
      revertedBy,
      syncState: 'pending',
    };

    proposals[index] = updated;
    this.safeSetItem(this.getProposalsKey(effectiveId), JSON.stringify(proposals));
    SyncQueueService.enqueue(effectiveId, 'caregiverProposals', proposalId, 'upsert', updated);

    if (prop.details.routineId) {
      StepPatternService.recordDyadicModification(effectiveId, {
        patientId: effectiveId,
        targetId: prop.id,
        routineId: prop.details.routineId,
        modificationType: 'proposal_reverted',
        actor: revertedBy,
        previousValue: prop.details.proposedValue,
        newValue: prop.details.originalValue,
        reason: 'Reverted routine step to original familiar wording',
      });
    }

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 3. CAREGIVER SHIFT HANDOFF & CONTINUITY
  // ---------------------------------------------------------------------------

  public static async createCaregiverHandoff(
    caregiverId: string,
    caregiverName: string,
    patientId: string,
    payload: {
      shiftPeriod: HandoffShiftPeriod;
      shiftDate?: string;
      assistedActivities: AssistedActivityRecord[];
      patientRequestsHandled: string[];
      patientPreferencesNoted: string[];
      pendingItemsForNextHelper: string[];
      isPatientVisible?: boolean;
    }
  ): Promise<CaregiverHandoff> {
    const isAuth = await DyadicCareCoordinationPolicy.isCaregiverAuthorized(caregiverId, patientId);
    if (!isAuth) {
      throw new Error(`Unauthorized caregiver ${caregiverId} for patient ${patientId}`);
    }

    const effectiveId = getEffectivePatientId({ uid: patientId });
    const id = `handoff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const todayDate = payload.shiftDate || nowIso.split('T')[0];

    const handoff: CaregiverHandoff = {
      id,
      patientId: effectiveId,
      authorId: caregiverId,
      authorName: caregiverName,
      authorRole: 'caregiver',
      timestamp: nowIso,
      originalSource: 'CaregiverHandoffForm',
      consentState: 'shared_with_caregiver',
      syncState: 'pending',
      isPatientReported: false,
      isCaregiverReported: true,
      isIndependentlyVerified: false,
      caregiverId,
      caregiverName,
      shiftPeriod: payload.shiftPeriod,
      shiftDate: todayDate,
      assistedActivities: payload.assistedActivities || [],
      patientRequestsHandled: payload.patientRequestsHandled || [],
      patientPreferencesNoted: payload.patientPreferencesNoted || [],
      pendingItemsForNextHelper: payload.pendingItemsForNextHelper || [],
      isPatientVisible: payload.isPatientVisible !== false, // Visible to patient by default
      createdAt: nowIso,
      isArchived: false,
    };

    const current = this.getCaregiverHandoffs(effectiveId);
    const updated = [handoff, ...current];
    this.safeSetItem(this.getHandoffsKey(effectiveId), JSON.stringify(updated));
    SyncQueueService.enqueue(effectiveId, 'caregiverHandoffs', id, 'upsert', handoff);

    return handoff;
  }

  public static getCaregiverHandoffs(
    patientId: string,
    includeArchived: boolean = false
  ): CaregiverHandoff[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getHandoffsKey(effectiveId));
    if (!raw) return [];
    try {
      const parsed: CaregiverHandoff[] = JSON.parse(raw);
      if (!includeArchived) {
        return parsed.filter((h) => !h.isArchived);
      }
      return parsed;
    } catch {
      return [];
    }
  }

  public static editCaregiverHandoff(
    caregiverId: string,
    patientId: string,
    handoffId: string,
    updates: Partial<Pick<CaregiverHandoff, 'assistedActivities' | 'patientRequestsHandled' | 'patientPreferencesNoted' | 'pendingItemsForNextHelper'>>,
    changesSummary: string
  ): CaregiverHandoff | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const handoffs = this.getCaregiverHandoffs(effectiveId, true);
    const index = handoffs.findIndex((h) => h.id === handoffId);
    if (index === -1) return null;

    const current = handoffs[index];
    if (current.caregiverId !== caregiverId) {
      throw new Error('Only authoring caregiver can edit their shift handoff');
    }

    const editHistory = current.editHistory || [];
    editHistory.push({
      editedAt: new Date().toISOString(),
      editorId: caregiverId,
      changesSummary: changesSummary || 'Updated shift notes',
    });

    const updated: CaregiverHandoff = {
      ...current,
      ...updates,
      lastEditedAt: new Date().toISOString(),
      editHistory,
      syncState: 'pending',
    };

    handoffs[index] = updated;
    this.safeSetItem(this.getHandoffsKey(effectiveId), JSON.stringify(handoffs));
    SyncQueueService.enqueue(effectiveId, 'caregiverHandoffs', handoffId, 'upsert', updated);

    return updated;
  }

  public static archiveHandoff(
    patientId: string,
    handoffId: string,
    actorRole: 'patient' | 'caregiver' = 'patient',
    actorCaregiverId?: string
  ): boolean {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const handoffs = this.getCaregiverHandoffs(effectiveId, true);
    const index = handoffs.findIndex((h) => h.id === handoffId);
    if (index === -1) return false;

    // Authorization Guard: Only patient or authoring caregiver can archive
    if (actorRole === 'caregiver') {
      if (!actorCaregiverId || handoffs[index].caregiverId !== actorCaregiverId) {
        throw new Error('Unauthorized: Only the authoring caregiver can archive their shift handoff');
      }
    }

    handoffs[index].isArchived = true;
    handoffs[index].syncState = 'pending';
    this.safeSetItem(this.getHandoffsKey(effectiveId), JSON.stringify(handoffs));
    SyncQueueService.enqueue(effectiveId, 'caregiverHandoffs', handoffId, 'upsert', handoffs[index]);
    return true;
  }

  // ---------------------------------------------------------------------------
  // 4. DYADIC DISCREPANCY RECORDING (Neutrally Preserved)
  // ---------------------------------------------------------------------------

  public static recordDiscrepancy(
    patientId: string,
    domain: DiscrepancyDomain,
    title: string,
    patientReport: { status: string; reportedAt?: string; notes?: string },
    caregiverReport: { status: string; reportedAt?: string; notes?: string }
  ): DyadicDiscrepancy {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const id = `disc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const neutralExplanation = DyadicCareCoordinationPolicy.buildNeutralDiscrepancyExplanation(
      domain,
      patientReport.status,
      caregiverReport.status
    );

    const discrepancy: DyadicDiscrepancy = {
      id,
      patientId: effectiveId,
      authorId: 'system',
      authorName: 'Saksham Dyadic Engine',
      authorRole: 'system',
      timestamp: nowIso,
      originalSource: 'DyadicDiscrepancyEngine',
      consentState: 'shared_with_caregiver',
      syncState: 'pending',
      isPatientReported: false,
      isCaregiverReported: false,
      isIndependentlyVerified: false,
      domain,
      title: DyadicCareCoordinationPolicy.sanitizeDiscrepancyLanguage(title),
      patientReport: {
        status: patientReport.status,
        reportedAt: patientReport.reportedAt || nowIso,
        notes: patientReport.notes,
      },
      caregiverReport: {
        status: caregiverReport.status,
        reportedAt: caregiverReport.reportedAt || nowIso,
        notes: caregiverReport.notes,
      },
      neutralExplanation,
      resolutionStatus: 'open',
      provenanceTrail: [
        `Patient logged: "${patientReport.status}" at ${patientReport.reportedAt || nowIso}`,
        `Caregiver observed: "${caregiverReport.status}" at ${caregiverReport.reportedAt || nowIso}`,
      ],
    };

    const current = this.getDiscrepancies(effectiveId);
    const updated = [discrepancy, ...current];
    this.safeSetItem(this.getDiscrepanciesKey(effectiveId), JSON.stringify(updated));
    SyncQueueService.enqueue(effectiveId, 'dyadicDiscrepancies', id, 'upsert', discrepancy);

    return discrepancy;
  }

  public static getDiscrepancies(patientId: string): DyadicDiscrepancy[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const raw = this.safeGetItem(this.getDiscrepanciesKey(effectiveId));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public static resolveDiscrepancy(
    patientId: string,
    discrepancyId: string,
    resolutionStatus: 'patient_reviewed' | 'caregiver_reviewed' | 'clarified' | 'preserved_divergent',
    clarificationNotes?: string
  ): DyadicDiscrepancy | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const discrepancies = this.getDiscrepancies(effectiveId);
    const index = discrepancies.findIndex((d) => d.id === discrepancyId);
    if (index === -1) return null;

    const current = discrepancies[index];
    const updated: DyadicDiscrepancy = {
      ...current,
      resolutionStatus,
      clarificationNotes: clarificationNotes || current.clarificationNotes,
      provenanceTrail: [
        ...current.provenanceTrail,
        `Status updated to "${resolutionStatus}" at ${new Date().toISOString()}`,
      ],
      syncState: 'pending',
    };

    discrepancies[index] = updated;
    this.safeSetItem(this.getDiscrepanciesKey(effectiveId), JSON.stringify(discrepancies));
    SyncQueueService.enqueue(effectiveId, 'dyadicDiscrepancies', discrepancyId, 'upsert', updated);

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 5. SHARED APPOINTMENT PREPARATION SELECTION
  // ---------------------------------------------------------------------------

  public static getAvailableAppointmentItems(patientId: string): AppointmentPreparationItem[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const items: AppointmentPreparationItem[] = [];

    // 1. Cognitive concerns (strictly those marked shared or appointment-flagged)
    try {
      const concerns = CognitiveConcernService.getConcernsFromLocal(effectiveId);
      for (const c of concerns) {
        if (c.discussAtAppointment || c.sharedWithDoctor) {
          items.push({
            id: `item_concern_${c.id}`,
            sourceType: c.perspective === 'patient' ? 'patient_concern' : 'caregiver_concern',
            authorId: c.recordedBy,
            authorName: c.perspective === 'patient' ? 'Patient Self-Journal' : 'Caregiver Observation',
            authorRole: c.perspective === 'patient' ? 'patient' : 'caregiver',
            title: `Concern in ${c.category.replace('_', ' ')}: ${c.status}`,
            details: c.description || c.contextNotes || 'Documented observation for clinical consultation.',
            timestamp: c.recordedAt,
            isSelectedForDoctor: true,
          });
        }
      }
    } catch {
      // Fallback
    }

    // 2. Open Discrepancies (collaborative discussion topics)
    const discrepancies = this.getDiscrepancies(effectiveId);
    for (const d of discrepancies) {
      items.push({
        id: `item_disc_${d.id}`,
        sourceType: 'routine_observation',
        authorId: d.authorId,
        authorName: 'Dyadic Observation Record',
        authorRole: 'system',
        title: `Observation on ${d.title}`,
        details: d.neutralExplanation,
        timestamp: d.timestamp,
        isSelectedForDoctor: false, // Patient must opt-in
      });
    }

    return items;
  }

  public static exportSharedAppointmentBrief(
    patientId: string,
    patientName: string,
    selectedItems: AppointmentPreparationItem[],
    patientQuestions: string[]
  ): SharedAppointmentPreparationSummary {
    const effectiveId = getEffectivePatientId({ uid: patientId });

    return {
      patientId: effectiveId,
      patientName,
      compiledAt: new Date().toISOString(),
      items: selectedItems,
      patientQuestions,
      doctorDisclaimer:
        'This summary contains authorized observational entries selected by the patient and family caregiver. It is not an automated diagnostic claim.',
    };
  }
}
