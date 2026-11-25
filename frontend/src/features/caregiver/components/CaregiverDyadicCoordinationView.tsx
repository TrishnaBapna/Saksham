import React, { useState, useEffect, useCallback } from 'react';
import {
  HeartHandshake,
  ShieldAlert,
  Send,
  CheckCircle,
  Info,
  Calendar,
  HelpCircle,
  Edit,
  Archive,
  MessageSquare,
  Plus,
} from 'lucide-react';
import {
  SupportRequest,
  CaregiverProposal,
  CaregiverProposalType,
  CaregiverHandoff,
  HandoffShiftPeriod,
  AssistedActivityRecord,
  DyadicDiscrepancy,
} from '../types/dyadicCareCoordination.types.js';
import { DyadicCareCoordinationService } from '../services/dyadicCareCoordinationService.js';
import { DyadicCareCoordinationPolicy } from '../services/dyadicCareCoordinationPolicy.js';
import { RoutineItem } from '../../../types/index.js';
import { useLanguage } from '../../../context/LanguageContext.js';

export interface CaregiverDyadicCoordinationViewProps {
  patientId: string;
  patientName: string;
  caregiverId: string;
  caregiverName?: string;
  isAuthorized: boolean;
  routines?: RoutineItem[];
}

export const CaregiverDyadicCoordinationView: React.FC<CaregiverDyadicCoordinationViewProps> = ({
  patientId,
  patientName,
  caregiverId,
  caregiverName = 'Caregiver',
  isAuthorized,
  routines = [],
}) => {
  const { t } = useLanguage();
  // Data States
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [proposals, setProposals] = useState<CaregiverProposal[]>([]);
  const [handoffs, setHandoffs] = useState<CaregiverHandoff[]>([]);
  const [discrepancies, setDiscrepancies] = useState<DyadicDiscrepancy[]>([]);

  // Feedback State
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Assistance Response Modal / Form State
  const [activeRespondingRequestId, setActiveRespondingRequestId] = useState<string | null>(null);
  const [responseNote, setResponseNote] = useState<string>('');

  // Proposal Form State
  const [isProposalFormOpen, setIsProposalFormOpen] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>('');
  const [proposalType, setProposalType] = useState<CaregiverProposalType>('step_simplification');
  const [proposalTitle, setProposalTitle] = useState<string>('');
  const [proposalSummary, setProposalSummary] = useState<string>('');
  const [originalValue, setOriginalValue] = useState<string>('');
  const [proposedValue, setProposedValue] = useState<string>('');

  // Handoff Form State
  const [isHandoffFormOpen, setIsHandoffFormOpen] = useState(false);
  const [shiftPeriod, setShiftPeriod] = useState<HandoffShiftPeriod>('morning');
  const [shiftDate, setShiftDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [assistedActivityTitle, setAssistedActivityTitle] = useState('');
  const [assistedSupportLevel, setAssistedSupportLevel] = useState<'verbal_cue' | 'physical_guide' | 'co_completion' | 'setup_only'>('verbal_cue');
  const [assistedActivitiesList, setAssistedActivitiesList] = useState<AssistedActivityRecord[]>([]);
  const [handledRequestsList, setHandledRequestsList] = useState<string[]>([]);
  const [preferenceText, setPreferenceText] = useState('');
  const [preferencesList, setPreferencesList] = useState<string[]>([]);
  const [nextHelperItemText, setNextHelperItemText] = useState('');
  const [nextHelperItemsList, setNextHelperItemsList] = useState<string[]>([]);
  const [isPatientVisible, setIsPatientVisible] = useState(true);

  const showFeedback = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  const loadData = useCallback(() => {
    if (!patientId) return;
    const reqs = DyadicCareCoordinationService.getSupportRequests(patientId);
    setSupportRequests(reqs);

    const props = DyadicCareCoordinationService.getCaregiverProposals(patientId);
    setProposals(props);

    const hoffs = DyadicCareCoordinationService.getCaregiverHandoffs(patientId);
    setHandoffs(hoffs);

    const discs = DyadicCareCoordinationService.getDiscrepancies(patientId);
    setDiscrepancies(discs);
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Routine Selection for Proposal
  const handleSelectRoutineForProposal = (rId: string) => {
    setSelectedRoutineId(rId);
    const target = routines.find((r) => r.id === rId);
    if (target) {
      setProposalTitle(`Adaptation for ${target.title}`);
      setOriginalValue(target.description || target.title);
    }
  };

  // Live safety lock evaluation
  const targetRoutine = routines.find((r) => r.id === selectedRoutineId);
  const liveSafetyStatus = targetRoutine
    ? DyadicCareCoordinationPolicy.evaluateSafetyLock(
        targetRoutine.category,
        (targetRoutine.description || targetRoutine.title) + ' ' + proposedValue,
        targetRoutine.category === 'medication' // medication routines are treated as clinician prescribed/locked
      )
    : 'safe';

  // 1. Acknowledge Request
  const handleAcknowledge = async (requestId: string) => {
    try {
      await DyadicCareCoordinationService.acknowledgeSupportRequest(
        caregiverId,
        caregiverName,
        patientId,
        requestId
      );
      showFeedback('Support request acknowledged.');
      loadData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to acknowledge');
    }
  };

  // 2. Respond to Request
  const handleSendAssistanceResponse = async (requestId: string) => {
    if (!responseNote.trim()) return;
    try {
      await DyadicCareCoordinationService.respondToSupportRequest(
        caregiverId,
        caregiverName,
        patientId,
        requestId,
        responseNote.trim()
      );
      setActiveRespondingRequestId(null);
      setResponseNote('');
      showFeedback('Assistance note delivered to patient.');
      loadData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to send response');
    }
  };

  // 3. Submit Proposal
  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalTitle.trim()) return;

    try {
      await DyadicCareCoordinationService.createCaregiverProposal(
        caregiverId,
        caregiverName,
        patientId,
        {
          proposalType,
          title: proposalTitle.trim(),
          summary: proposalSummary.trim() || 'Caregiver suggested daily living simplification.',
          details: {
            routineId: selectedRoutineId || undefined,
            originalValue: originalValue.trim() || undefined,
            proposedValue: proposedValue.trim() || undefined,
          },
          routineCategory: targetRoutine?.category,
          instructionText: originalValue,
          isClinicianPrescribed: targetRoutine?.category === 'medication',
        }
      );

      setIsProposalFormOpen(false);
      setProposalTitle('');
      setProposalSummary('');
      setSelectedRoutineId('');
      setOriginalValue('');
      setProposedValue('');
      showFeedback('Proposal submitted. The patient will review and decide.');
      loadData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to create proposal');
    }
  };

  // 4. Withdraw Proposal
  const handleWithdrawProposal = (proposalId: string) => {
    try {
      DyadicCareCoordinationService.withdrawProposalByCaregiver(
        caregiverId,
        patientId,
        proposalId
      );
      showFeedback('Proposal withdrawn.');
      loadData();
    } catch (err: any) {
      showFeedback(err.message || 'Cannot withdraw proposal');
    }
  };

  // 5. Submit Shift Handoff
  const handleCreateHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await DyadicCareCoordinationService.createCaregiverHandoff(
        caregiverId,
        caregiverName,
        patientId,
        {
          shiftPeriod,
          shiftDate,
          assistedActivities: assistedActivitiesList,
          patientRequestsHandled: handledRequestsList,
          patientPreferencesNoted: preferencesList,
          pendingItemsForNextHelper: nextHelperItemsList,
          isPatientVisible,
        }
      );

      setIsHandoffFormOpen(false);
      setAssistedActivitiesList([]);
      setHandledRequestsList([]);
      setPreferencesList([]);
      setNextHelperItemsList([]);
      showFeedback('Shift handoff logged successfully.');
      loadData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to log handoff');
    }
  };

  // 6. Archive Handoff
  const handleArchiveHandoff = (handoffId: string) => {
    DyadicCareCoordinationService.archiveHandoff(patientId, handoffId);
    showFeedback('Handoff archived.');
    loadData();
  };

  // 8. Review Discrepancy
  const handleReviewDiscrepancy = (
    discrepancyId: string,
    resolution: 'caregiver_reviewed' | 'preserved_divergent'
  ) => {
    DyadicCareCoordinationService.resolveDiscrepancy(patientId, discrepancyId, resolution);
    showFeedback('Observation noted neutrally.');
    loadData();
  };

  if (!isAuthorized) {
    return (
      <div
        className="p-5 bg-amber-50 border border-amber-200 rounded-3xl text-xs text-amber-900"
        data-testid="caregiver-unauthorized-guard"
      >
        <ShieldAlert className="w-5 h-5 text-amber-700 mb-2" />
        <span className="font-bold block">{t('caregiver.dyadic_unauth_title')}</span>
        <span>
          {t('caregiver.dyadic_unauth_desc', { name: patientName })}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="caregiver-dyadic-coordination-view">
      {/* Feedback Toast */}
      {feedbackNotice && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 bg-emerald-900 text-white text-xs rounded-xl shadow-lg flex items-center space-x-2 animate-fade-in"
          data-testid="caregiver-coordination-feedback"
        >
          <Info className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Header Reassurance Banner */}
      <section
        className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft-purple"
        aria-label={t('caregiver.dyadic_title')}
      >
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {t('caregiver.dyadic_title')}
            </h2>
            <p className="text-xs text-gray-500">
              {t('caregiver.dyadic_subtitle', { name: patientName })}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs">
          <div className="bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-100">
            <span className="font-bold text-emerald-950 block">{t('caregiver.dyadic_review_req')}</span>
            <span className="text-emerald-800">
              {t('caregiver.dyadic_review_desc', { name: patientName })}
            </span>
          </div>
          <div className="bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-100">
            <span className="font-bold text-emerald-950 block">{t('caregiver.dyadic_guardrails_title')}</span>
            <span className="text-emerald-800">
              {t('caregiver.dyadic_guardrails_desc')}
            </span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 1. INCOMING PATIENT SUPPORT REQUESTS                                */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft-purple space-y-4"
        aria-label="Incoming Support Requests"
        data-testid="caregiver-support-requests-section"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <HelpCircle className="w-5 h-5 text-emerald-700" />
              <span>Incoming Patient Support Requests</span>
            </h3>
            <p className="text-xs text-gray-500">
              Requests initiated directly by {patientName} for timely assistance.
            </p>
          </div>
          <span className="text-xs font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
            {supportRequests.filter((r) => r.status === 'pending' || r.status === 'acknowledged').length} Active
          </span>
        </div>

        {supportRequests.length === 0 ? (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center text-xs text-gray-500">
            No active support requests from {patientName}.
          </div>
        ) : (
          <div className="space-y-3" data-testid="caregiver-support-requests-list">
            {supportRequests.map((req) => (
              <div
                key={req.id}
                data-testid={`caregiver-request-card-${req.id}`}
                className={`p-4 rounded-2xl border transition-all ${
                  req.status === 'resolved' || req.status === 'cancelled'
                    ? 'bg-gray-50 border-gray-200 opacity-70'
                    : req.status === 'assistance_provided'
                    ? 'bg-emerald-50/80 border-emerald-200'
                    : req.status === 'acknowledged'
                    ? 'bg-sky-50/80 border-sky-200'
                    : 'bg-amber-50/80 border-amber-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span
                        className={`text-2xs font-extrabold uppercase px-2 py-0.5 rounded-md ${
                          req.status === 'resolved'
                            ? 'bg-gray-200 text-gray-700'
                            : req.status === 'cancelled'
                            ? 'bg-gray-200 text-gray-600'
                            : req.status === 'assistance_provided'
                            ? 'bg-emerald-200 text-emerald-900'
                            : req.status === 'acknowledged'
                            ? 'bg-sky-200 text-sky-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {req.status === 'assistance_provided'
                          ? 'Assistance Provided'
                          : req.status === 'acknowledged'
                          ? 'Acknowledged'
                          : req.status === 'resolved'
                          ? 'Resolved'
                          : req.status === 'cancelled'
                          ? 'Cancelled by Patient'
                          : 'New Request'}
                      </span>
                      <span className="text-2xs text-gray-500">
                        {new Date(req.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {req.relatedActivityTitle && (
                        <span className="text-3xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-semibold">
                          Activity: {req.relatedActivityTitle}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-gray-800">"{req.message}"</p>
                    {req.responseMessage && (
                      <div className="text-xs text-emerald-900 bg-white/80 p-2 rounded-xl border border-emerald-200 mt-1">
                        <span className="font-bold">Your Response: </span>
                        {req.responseMessage}
                      </div>
                    )}
                  </div>

                  {/* Actions for Caregiver */}
                  <div className="shrink-0 flex items-center space-x-2 self-start sm:self-center">
                    {req.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleAcknowledge(req.id)}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-2xs font-bold shadow-xs flex items-center space-x-1"
                        data-testid={`acknowledge-request-btn-${req.id}`}
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    {(req.status === 'pending' || req.status === 'acknowledged') && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRespondingRequestId(
                            activeRespondingRequestId === req.id ? null : req.id
                          );
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-2xs font-bold shadow-xs flex items-center space-x-1"
                        data-testid={`respond-request-btn-${req.id}`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Provide Assistance</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Assistance Response Form */}
                {activeRespondingRequestId === req.id && (
                  <div className="mt-3 pt-3 border-t border-emerald-200 space-y-2">
                    <label className="block text-2xs font-bold uppercase text-emerald-950">
                      Message / Note for {patientName}:
                    </label>
                    <textarea
                      value={responseNote}
                      onChange={(e) => setResponseNote(e.target.value)}
                      placeholder="e.g. I am bringing your glasses now. Relax and I will assist."
                      rows={2}
                      className="w-full text-xs rounded-xl border border-emerald-200 bg-white p-2 text-gray-800"
                      data-testid={`response-note-input-${req.id}`}
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setActiveRespondingRequestId(null)}
                        className="px-3 py-1 rounded-xl text-2xs font-semibold text-gray-600 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendAssistanceResponse(req.id)}
                        className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-bold"
                        data-testid={`send-assistance-btn-${req.id}`}
                      >
                        Send Note
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. PROPOSE ROUTINE ADAPTATION (Caregiver Proposes, Patient Decides) */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft-purple space-y-4"
        aria-label="Propose Routine Adaptation"
        data-testid="caregiver-proposals-section"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <Edit className="w-5 h-5 text-emerald-700" />
              <span>Propose Routine Adaptation</span>
            </h3>
            <p className="text-xs text-gray-500">
              Suggest respectful adjustments (step simplification, cues, breaks). Changes require{' '}
              {patientName}'s explicit acceptance.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsProposalFormOpen((prev) => !prev)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
            data-testid="toggle-proposal-form-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isProposalFormOpen ? 'Close' : '+ New Proposal'}</span>
          </button>
        </div>

        {/* Proposal Form */}
        {isProposalFormOpen && (
          <form
            onSubmit={handleCreateProposal}
            className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-3 animate-fade-in"
            data-testid="caregiver-proposal-form"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-bold uppercase text-emerald-950 mb-1">
                  Target Routine Activity
                </label>
                <select
                  value={selectedRoutineId}
                  onChange={(e) => handleSelectRoutineForProposal(e.target.value)}
                  className="w-full text-xs rounded-xl border border-emerald-200 bg-white p-2 text-gray-800"
                  data-testid="proposal-routine-select"
                >
                  <option value="">Select a routine...</option>
                  {routines.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold uppercase text-emerald-950 mb-1">
                  Adaptation Type
                </label>
                <select
                  value={proposalType}
                  onChange={(e) => setProposalType(e.target.value as CaregiverProposalType)}
                  className="w-full text-xs rounded-xl border border-emerald-200 bg-white p-2 text-gray-800"
                  data-testid="proposal-type-select"
                >
                  <option value="step_simplification">Step Simplification (Fewer substeps)</option>
                  <option value="additional_cues">Additional Visual Cues & Photo Hints</option>
                  <option value="routine_adjustment">Routine Schedule Adjustment</option>
                  <option value="reminder_timing">Reminder Timing Shift</option>
                  <option value="assistance_preference">Assistance Preference</option>
                  <option value="household_support">Household Task Support</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase text-emerald-950 mb-1">
                Proposal Title
              </label>
              <input
                type="text"
                value={proposalTitle}
                onChange={(e) => setProposalTitle(e.target.value)}
                placeholder="e.g. Simplify Morning Tea step to two single actions"
                className="w-full text-xs rounded-xl border border-emerald-200 bg-white p-2 text-gray-800"
                data-testid="proposal-title-input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-bold uppercase text-emerald-950 mb-1">
                  Current Familiar Phrasing
                </label>
                <input
                  type="text"
                  value={originalValue}
                  onChange={(e) => setOriginalValue(e.target.value)}
                  placeholder="Original wording..."
                  className="w-full text-xs rounded-xl border border-emerald-200 bg-white p-2 text-gray-800"
                  data-testid="proposal-original-input"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold uppercase text-emerald-950 mb-1">
                  Proposed Supportive Phrasing
                </label>
                <input
                  type="text"
                  value={proposedValue}
                  onChange={(e) => setProposedValue(e.target.value)}
                  placeholder="Simpler, clearer wording..."
                  className="w-full text-xs rounded-xl border border-emerald-200 bg-white p-2 text-gray-800"
                  data-testid="proposal-proposed-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase text-emerald-950 mb-1">
                Caregiver Rationale
              </label>
              <textarea
                value={proposalSummary}
                onChange={(e) => setProposalSummary(e.target.value)}
                placeholder="Why do you recommend this change? (e.g. observed hesitation at step 2 over the past 3 days)"
                rows={2}
                className="w-full text-xs rounded-xl border border-emerald-200 bg-white p-2 text-gray-800"
                data-testid="proposal-rationale-input"
              />
            </div>

            {/* Live Safety Warning */}
            {liveSafetyStatus !== 'safe' && (
              <div
                className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-2xs text-amber-900 flex items-center space-x-2"
                data-testid="proposal-form-safety-warning"
              >
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Safety Lock Warning: This routine step involves medication or flame/stove, or is
                  clinician-prescribed. It will be flagged with a safety lock and will require
                  clinical review.
                </span>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsProposalFormOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5"
                data-testid="submit-proposal-btn"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit for Patient Decision</span>
              </button>
            </div>
          </form>
        )}

        {/* Existing Proposals List */}
        {proposals.length === 0 ? (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center text-xs text-gray-500">
            No proposals currently logged for {patientName}.
          </div>
        ) : (
          <div className="space-y-2.5" data-testid="caregiver-proposals-history-list">
            {proposals.map((prop) => (
              <div
                key={prop.id}
                data-testid={`caregiver-proposal-item-${prop.id}`}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-2xs font-extrabold uppercase px-2 py-0.5 rounded-md ${
                        prop.status === 'accepted'
                          ? 'bg-emerald-200 text-emerald-900'
                          : prop.status === 'declined'
                          ? 'bg-rose-200 text-rose-900'
                          : prop.status === 'deferred'
                          ? 'bg-indigo-200 text-indigo-900'
                          : prop.status === 'withdrawn'
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-purple-200 text-purple-900'
                      }`}
                    >
                      {prop.status}
                    </span>
                    <span className="text-2xs text-gray-500">
                      {new Date(prop.timestamp).toLocaleDateString()}
                    </span>
                    {prop.safetyStatus !== 'safe' && (
                      <span className="text-3xs bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                        Safety Locked
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-gray-800">{prop.title}</h4>
                  <p className="text-2xs text-gray-600">{prop.summary}</p>
                </div>

                <div className="shrink-0 flex items-center space-x-2 self-start sm:self-center">
                  {(prop.status === 'pending' || prop.status === 'deferred') &&
                    prop.authorId === caregiverId && (
                      <button
                        type="button"
                        onClick={() => handleWithdrawProposal(prop.id)}
                        className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-2xs font-semibold"
                        data-testid={`withdraw-proposal-btn-${prop.id}`}
                      >
                        Withdraw
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. CAREGIVER SHIFT HANDOFF & CONTINUITY LOGGER                     */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft-purple space-y-4"
        aria-label="Caregiver Shift Handoff Logger"
        data-testid="caregiver-handoffs-section"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-emerald-700" />
              <span>Caregiver Shift Handoff & Continuity</span>
            </h3>
            <p className="text-xs text-gray-500">
              Log factual shift summaries (assisted tasks, patient preferences, reminders for the
              next helper).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsHandoffFormOpen((prev) => !prev)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
            data-testid="toggle-handoff-form-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isHandoffFormOpen ? 'Close' : '+ Log Shift Summary'}</span>
          </button>
        </div>

        {/* Handoff Form */}
        {isHandoffFormOpen && (
          <form
            onSubmit={handleCreateHandoff}
            className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-fade-in"
            data-testid="caregiver-handoff-form"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-bold uppercase text-slate-700 mb-1">
                  Shift Period
                </label>
                <select
                  value={shiftPeriod}
                  onChange={(e) => setShiftPeriod(e.target.value as HandoffShiftPeriod)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-white p-2 text-gray-800"
                  data-testid="handoff-period-select"
                >
                  <option value="morning">Morning Shift (07:00 - 12:00)</option>
                  <option value="afternoon">Afternoon Shift (12:00 - 17:00)</option>
                  <option value="evening">Evening Shift (17:00 - 21:00)</option>
                  <option value="full_day">Full Day / Comprehensive Shift</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold uppercase text-slate-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-white p-2 text-gray-800"
                  data-testid="handoff-date-input"
                />
              </div>
            </div>

            {/* Assisted Activities Addition */}
            <div>
              <label className="block text-2xs font-bold uppercase text-slate-700 mb-1">
                Assisted Activities During Shift
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="e.g. Morning Garden Walk"
                  value={assistedActivityTitle}
                  onChange={(e) => setAssistedActivityTitle(e.target.value)}
                  className="flex-1 text-xs rounded-xl border border-slate-200 bg-white p-2 text-gray-800"
                />
                <select
                  value={assistedSupportLevel}
                  onChange={(e) => setAssistedSupportLevel(e.target.value as any)}
                  className="text-xs rounded-xl border border-slate-200 bg-white p-2 text-gray-800"
                >
                  <option value="verbal_cue">Verbal Cue</option>
                  <option value="physical_guide">Physical Guide</option>
                  <option value="co_completion">Co-Completion</option>
                  <option value="setup_only">Setup Only</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!assistedActivityTitle.trim()) return;
                    setAssistedActivitiesList((prev) => [
                      ...prev,
                      {
                        activityId: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                        activityTitle: assistedActivityTitle.trim(),
                        assistanceType: assistedSupportLevel,
                        note: 'Logged during shift handoff',
                      },
                    ]);
                    setAssistedActivityTitle('');
                  }}
                  className="px-3 py-2 bg-slate-700 text-white rounded-xl text-xs font-bold"
                >
                  Add
                </button>
              </div>

              {assistedActivitiesList.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {assistedActivitiesList.map((a, i) => (
                    <span
                      key={i}
                      className="text-2xs bg-white text-slate-800 px-2 py-1 rounded-md border border-slate-200"
                    >
                      {a.activityTitle} ({a.assistanceType.replace('_', ' ')})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Patient Preferences Noted */}
            <div>
              <label className="block text-2xs font-bold uppercase text-slate-700 mb-1">
                Preferences / Mood Observed (Factual)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="e.g. Preferred warm ginger tea without sugar today."
                  value={preferenceText}
                  onChange={(e) => setPreferenceText(e.target.value)}
                  className="flex-1 text-xs rounded-xl border border-slate-200 bg-white p-2 text-gray-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!preferenceText.trim()) return;
                    setPreferencesList((prev) => [...prev, preferenceText.trim()]);
                    setPreferenceText('');
                  }}
                  className="px-3 py-2 bg-slate-700 text-white rounded-xl text-xs font-bold"
                >
                  Add
                </button>
              </div>

              {preferencesList.length > 0 && (
                <ul className="text-2xs space-y-1 mt-1 text-slate-700 list-disc list-inside">
                  {preferencesList.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Pending Items for Next Helper */}
            <div>
              <label className="block text-2xs font-bold uppercase text-slate-700 mb-1">
                Notes for Next Helper / Shift
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="e.g. Eyeglass cleaning solution is on the bedside table."
                  value={nextHelperItemText}
                  onChange={(e) => setNextHelperItemText(e.target.value)}
                  className="flex-1 text-xs rounded-xl border border-slate-200 bg-white p-2 text-gray-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!nextHelperItemText.trim()) return;
                    setNextHelperItemsList((prev) => [...prev, nextHelperItemText.trim()]);
                    setNextHelperItemText('');
                  }}
                  className="px-3 py-2 bg-slate-700 text-white rounded-xl text-xs font-bold"
                >
                  Add
                </button>
              </div>

              {nextHelperItemsList.length > 0 && (
                <ul className="text-2xs space-y-1 mt-1 text-slate-700 list-disc list-inside">
                  {nextHelperItemsList.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Patient Visible Toggle */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="patient-visible-toggle"
                checked={isPatientVisible}
                onChange={(e) => setIsPatientVisible(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-gray-300"
                data-testid="patient-visible-checkbox"
              />
              <label htmlFor="patient-visible-toggle" className="text-xs text-gray-700 font-medium">
                Make this shift summary visible on {patientName}'s dashboard
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsHandoffFormOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                data-testid="submit-handoff-btn"
              >
                Save Shift Summary
              </button>
            </div>
          </form>
        )}

        {/* Past Handoffs List */}
        {handoffs.length === 0 ? (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center text-xs text-gray-500">
            No shift handoff summaries logged yet.
          </div>
        ) : (
          <div className="space-y-3" data-testid="caregiver-handoffs-history-list">
            {handoffs.map((h) => (
              <div
                key={h.id}
                data-testid={`caregiver-handoff-item-${h.id}`}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
              >
                <div className="flex items-center justify-between text-2xs">
                  <span className="font-bold text-slate-800 uppercase tracking-wider">
                    {h.shiftPeriod} Shift • {h.shiftDate}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500 font-medium">By {h.caregiverName}</span>
                    {h.caregiverId === caregiverId && (
                      <button
                        type="button"
                        onClick={() => handleArchiveHandoff(h.id)}
                        className="text-gray-400 hover:text-rose-600"
                        title="Archive handoff"
                        data-testid={`archive-handoff-btn-${h.id}`}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {h.assistedActivities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {h.assistedActivities.map((act, i) => (
                      <span
                        key={i}
                        className="text-3xs bg-white text-slate-800 px-2 py-0.5 rounded-md border border-slate-200"
                      >
                        {act.activityTitle} ({act.assistanceType.replace('_', ' ')})
                      </span>
                    ))}
                  </div>
                )}

                {h.pendingItemsForNextHelper.length > 0 && (
                  <div className="text-2xs text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200">
                    <span className="font-bold">For Next Helper: </span>
                    {h.pendingItemsForNextHelper.join(' • ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. DYADIC DISCREPANCIES (Preserved Neutrally)                       */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft-purple space-y-4"
        aria-label="Dyadic Discrepancies and Harmonization"
        data-testid="caregiver-discrepancies-section"
      >
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
            <Info className="w-5 h-5 text-emerald-700" />
            <span>Dyadic Discrepancy Review</span>
          </h3>
          <p className="text-xs text-gray-500">
            Divergent observations between patient self-reports and caregiver logs. Preserved
            neutrally without assigning fault.
          </p>
        </div>

        {discrepancies.length === 0 ? (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center text-xs text-gray-500">
            No divergent routine observations recorded.
          </div>
        ) : (
          <div className="space-y-3" data-testid="caregiver-discrepancies-list">
            {discrepancies.map((disc) => (
              <div
                key={disc.id}
                data-testid={`caregiver-discrepancy-item-${disc.id}`}
                className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2"
              >
                <div className="flex items-center justify-between text-2xs">
                  <span className="font-bold text-amber-950 uppercase">{disc.title}</span>
                  <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                    {disc.resolutionStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs bg-white/90 p-2.5 rounded-xl border border-amber-100">
                  <div>
                    <span className="font-bold text-purple-900 block uppercase">
                      Patient Self-Report
                    </span>
                    <span className="text-gray-800">{disc.patientReport.status}</span>
                  </div>
                  <div>
                    <span className="font-bold text-teal-900 block uppercase">
                      Caregiver Observation
                    </span>
                    <span className="text-gray-800">{disc.caregiverReport.status}</span>
                  </div>
                </div>

                <p className="text-xs text-amber-900 italic">{disc.neutralExplanation}</p>

                {disc.clarificationNotes && (
                  <div className="text-2xs text-indigo-900 bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                    <span className="font-bold">Patient Clarification: </span>
                    {disc.clarificationNotes}
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleReviewDiscrepancy(disc.id, 'caregiver_reviewed')}
                    className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-2xs font-bold"
                    data-testid={`caregiver-review-discrepancy-btn-${disc.id}`}
                  >
                    Mark Reviewed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReviewDiscrepancy(disc.id, 'preserved_divergent')}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-2xs font-semibold"
                    data-testid={`preserve-discrepancy-btn-${disc.id}`}
                  >
                    Preserve Divergent
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
