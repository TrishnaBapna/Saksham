import React, { useState, useEffect, useCallback } from 'react';
import {
  HeartHandshake,
  ShieldCheck,
  ShieldAlert,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Info,
  Calendar,
  FileText,
  UserCheck,
  HelpCircle,
} from 'lucide-react';
import {
  SupportRequest,
  SupportRequestType,
  CaregiverProposal,
  CaregiverHandoff,
  DyadicDiscrepancy,
  AppointmentPreparationItem,
  SharedAppointmentPreparationSummary,
} from '../types/dyadicCareCoordination.types.js';
import { DyadicCareCoordinationService } from '../services/dyadicCareCoordinationService.js';
import { RoutineItem } from '../../../types/index.js';
import { useLanguage } from '../../../context/LanguageContext.js';

export interface PatientSharedCareViewProps {
  patientId: string;
  patientName?: string;
  routines?: RoutineItem[];
}

export const PatientSharedCareView: React.FC<PatientSharedCareViewProps> = ({
  patientId,
  patientName = 'Sunita',
  routines = [],
}) => {
  const { t } = useLanguage();
  // State
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [proposals, setProposals] = useState<CaregiverProposal[]>([]);
  const [handoffs, setHandoffs] = useState<CaregiverHandoff[]>([]);
  const [discrepancies, setDiscrepancies] = useState<DyadicDiscrepancy[]>([]);
  const [appointmentItems, setAppointmentItems] = useState<AppointmentPreparationItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [patientQuestionInput, setPatientQuestionInput] = useState<string>('');
  const [patientQuestions, setPatientQuestions] = useState<string[]>([]);
  const [exportedBrief, setExportedBrief] = useState<SharedAppointmentPreparationSummary | null>(null);

  // New Request Form State
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [requestType, setRequestType] = useState<SupportRequestType>('routine_help');
  const [requestTitle, setRequestTitle] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [relatedActivityId, setRelatedActivityId] = useState<string>('');

  // Discrepancy Clarification State
  const [clarificationInputs, setClarificationInputs] = useState<Record<string, string>>({});

  // Feedback Notification
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  // Load all dyadic data
  const loadData = useCallback(() => {
    if (!patientId) return;
    const reqs = DyadicCareCoordinationService.getSupportRequests(patientId);
    setSupportRequests(reqs);

    const props = DyadicCareCoordinationService.getCaregiverProposals(patientId);
    setProposals(props);

    const hoffs = DyadicCareCoordinationService.getCaregiverHandoffs(patientId);
    // Only patient visible handoffs
    setHandoffs(hoffs.filter((h) => h.isPatientVisible !== false));

    const discs = DyadicCareCoordinationService.getDiscrepancies(patientId);
    setDiscrepancies(discs);

    const apptItems = DyadicCareCoordinationService.getAvailableAppointmentItems(patientId);
    setAppointmentItems(apptItems);
    // Pre-select items flagged for doctor
    setSelectedItemIds(new Set(apptItems.filter((i) => i.isSelectedForDoctor).map((i) => i.id)));
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Submit Support Request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestMessage.trim()) return;

    const title =
      requestTitle.trim() ||
      (requestType === 'routine_help'
        ? 'Assistance with routine activity'
        : requestType === 'find_item'
        ? 'Help finding an item'
        : requestType === 'appointment_prep'
        ? 'Doctor appointment question'
        : requestType === 'instruction_help'
        ? 'Step explanation request'
        : requestType === 'household_task'
        ? 'Household task assistance'
        : 'Support request');

    const relatedRoutine = routines.find((r) => r.id === relatedActivityId);

    try {
      await DyadicCareCoordinationService.createSupportRequest(patientId, {
        patientName,
        requestType,
        title,
        message: requestMessage.trim(),
        relatedActivityId: relatedRoutine ? relatedRoutine.id : undefined,
        relatedActivityTitle: relatedRoutine ? relatedRoutine.title : undefined,
      });

      setRequestTitle('');
      setRequestMessage('');
      setRelatedActivityId('');
      setIsRequestFormOpen(false);
      showFeedback('Your support request has been shared with your caregiver.');
      loadData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to send request');
    }
  };

  // Resolve Request
  const handleResolveRequest = (requestId: string) => {
    DyadicCareCoordinationService.resolveSupportRequest(patientId, requestId, 'patient');
    showFeedback('Support request marked as resolved.');
    loadData();
  };

  // Cancel Request
  const handleCancelRequest = (requestId: string) => {
    DyadicCareCoordinationService.cancelSupportRequest(patientId, requestId, 'Cancelled by patient');
    showFeedback('Support request cancelled.');
    loadData();
  };

  // Review Proposal
  const handleReviewProposal = (
    proposalId: string,
    decision: 'accepted' | 'declined' | 'deferred'
  ) => {
    try {
      DyadicCareCoordinationService.reviewProposalByPatient(patientId, proposalId, decision);
      const text =
        decision === 'accepted'
          ? 'Proposal accepted. Your routine steps have been updated.'
          : decision === 'declined'
          ? 'Proposal declined. Your familiar routine remains unchanged.'
          : 'Proposal saved to review later.';
      showFeedback(text);
      loadData();
    } catch (err: any) {
      showFeedback(err.message || 'Could not update proposal');
    }
  };

  // Revert Proposal
  const handleRevertProposal = (proposalId: string) => {
    DyadicCareCoordinationService.revertAcceptedProposal(patientId, proposalId, 'patient');
    showFeedback('Routine restored to its original familiar baseline.');
    loadData();
  };

  // Clarify Discrepancy
  const handleClarifyDiscrepancy = (discrepancyId: string) => {
    const note = clarificationInputs[discrepancyId];
    if (!note || !note.trim()) return;

    DyadicCareCoordinationService.resolveDiscrepancy(
      patientId,
      discrepancyId,
      'clarified',
      note.trim()
    );
    setClarificationInputs((prev) => ({ ...prev, [discrepancyId]: '' }));
    showFeedback('Clarification saved alongside the observation.');
    loadData();
  };

  // Toggle Appointment Item
  const handleToggleAppointmentItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Add Patient Question
  const handleAddQuestion = () => {
    if (!patientQuestionInput.trim()) return;
    setPatientQuestions((prev) => [...prev, patientQuestionInput.trim()]);
    setPatientQuestionInput('');
  };

  // Export Shared Appointment Brief
  const handleExportAppointmentBrief = () => {
    const selected = appointmentItems.filter((i) => selectedItemIds.has(i.id));
    const brief = DyadicCareCoordinationService.exportSharedAppointmentBrief(
      patientId,
      patientName,
      selected,
      patientQuestions
    );
    setExportedBrief(brief);
    showFeedback('Appointment brief ready for your doctor consultation.');
  };

  return (
    <div className="space-y-6" data-testid="patient-shared-care-view">
      {/* Feedback Toast */}
      {feedbackNotice && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 bg-purple-900 text-white text-xs rounded-xl shadow-lg flex items-center space-x-2 animate-fade-in"
          data-testid="patient-shared-care-feedback"
        >
          <Info className="w-4 h-4 text-lavender-300 shrink-0" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Header & Reassuring Autonomy Banner */}
      <section
        className="bg-gradient-to-r from-purple-800 via-purple-700 to-lavender-700 rounded-3xl p-5 text-white shadow-soft-purple"
        aria-label="Shared Care and Autonomy Information"
      >
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <HeartHandshake className="w-6 h-6 text-yellow-300" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold">{t('shared_care.title')}</h2>
            <p className="text-xs text-lavender-200">
              {t('shared_care.subtitle')}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs">
          <div className="bg-white/10 rounded-xl p-2.5 flex items-start space-x-2 border border-white/10">
            <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">{t('shared_care.auth_title')}</span>
              <span className="text-lavender-100">
                {t('shared_care.auth_desc')}
              </span>
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 flex items-start space-x-2 border border-white/10">
            <UserCheck className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">{t('shared_care.privacy_title')}</span>
              <span className="text-lavender-100">
                {t('shared_care.privacy_desc')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 1. ASK FOR SUPPORT & ACTIVE SUPPORT REQUESTS                        */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple space-y-4"
        aria-label={t('shared_care.ask_title')}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <span>{t('shared_care.ask_title')}</span>
            </h3>
            <p className="text-xs text-gray-500">
              {t('shared_care.ask_desc')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsRequestFormOpen((prev) => !prev)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs"
            data-testid="toggle-request-form-btn"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isRequestFormOpen ? 'Close Request Form' : '+ Ask for Help'}</span>
          </button>
        </div>

        {/* Support Request Form */}
        {isRequestFormOpen && (
          <form
            onSubmit={handleCreateRequest}
            className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-3 animate-fade-in"
            data-testid="patient-support-request-form"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-bold uppercase text-purple-900 mb-1">
                  What kind of help do you need?
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as SupportRequestType)}
                  className="w-full text-xs rounded-xl border-purple-200 bg-white p-2 text-gray-800 font-medium"
                  data-testid="request-type-select"
                >
                  <option value="routine_help">Routine Activity Assistance</option>
                  <option value="find_item">Help Locating an Item</option>
                  <option value="instruction_help">Clarify Daily Steps</option>
                  <option value="appointment_prep">Doctor Appointment Question</option>
                  <option value="household_task">Household Task Support</option>
                  <option value="general_support">General Reassurance / Conversation</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold uppercase text-purple-900 mb-1">
                  Related Activity (Optional)
                </label>
                <select
                  value={relatedActivityId}
                  onChange={(e) => setRelatedActivityId(e.target.value)}
                  className="w-full text-xs rounded-xl border-purple-200 bg-white p-2 text-gray-800 font-medium"
                  data-testid="request-routine-select"
                >
                  <option value="">None / General</option>
                  {routines.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.scheduledTime})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase text-purple-900 mb-1">
                Short Note for Caregiver
              </label>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="e.g. Could you help me check if I have enough tea leaves for this evening?"
                rows={2}
                className="w-full text-xs rounded-xl border border-purple-200 bg-white p-2.5 text-gray-800 placeholder-gray-400 font-medium"
                data-testid="request-message-input"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsRequestFormOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5"
                data-testid="submit-support-request-btn"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send to Caregiver</span>
              </button>
            </div>
          </form>
        )}

        {/* Requests List */}
        {supportRequests.length === 0 ? (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center text-xs text-gray-500">
            No active support requests. Tap "+ Ask for Help" whenever you need assistance.
          </div>
        ) : (
          <div className="space-y-2.5" data-testid="support-requests-list">
            {supportRequests.map((req) => (
              <div
                key={req.id}
                data-testid={`support-request-card-${req.id}`}
                className={`p-3.5 rounded-2xl border transition-all ${
                  req.status === 'resolved' || req.status === 'cancelled'
                    ? 'bg-gray-50 border-gray-200 opacity-75'
                    : req.status === 'assistance_provided'
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : req.status === 'acknowledged'
                    ? 'bg-sky-50/70 border-sky-200'
                    : 'bg-amber-50/70 border-amber-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-2xs font-extrabold uppercase px-2 py-0.5 rounded-md ${
                          req.status === 'resolved'
                            ? 'bg-gray-200 text-gray-700'
                            : req.status === 'cancelled'
                            ? 'bg-gray-200 text-gray-600 line-through'
                            : req.status === 'assistance_provided'
                            ? 'bg-emerald-200 text-emerald-900'
                            : req.status === 'acknowledged'
                            ? 'bg-sky-200 text-sky-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                        data-testid={`request-status-badge-${req.id}`}
                      >
                        {req.status === 'assistance_provided'
                          ? 'Assistance Provided'
                          : req.status === 'acknowledged'
                          ? 'Caregiver Acknowledged'
                          : req.status === 'resolved'
                          ? 'Resolved'
                          : req.status === 'cancelled'
                          ? 'Cancelled'
                          : 'Waiting for Caregiver'}
                      </span>
                      <span className="text-2xs text-gray-500">
                        {new Date(req.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {req.relatedActivityTitle && (
                        <span className="text-3xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-semibold">
                          {req.relatedActivityTitle}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-gray-800">{req.message}</p>
                    {req.responseMessage && (
                      <div className="mt-1 text-xs text-emerald-900 bg-white/80 p-2 rounded-xl border border-emerald-200">
                        <span className="font-bold">Caregiver note: </span>
                        {req.responseMessage}
                      </div>
                    )}
                  </div>

                  {/* Actions for Patient */}
                  <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center">
                    {(req.status === 'pending' ||
                      req.status === 'acknowledged' ||
                      req.status === 'assistance_provided') && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleResolveRequest(req.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-2xs font-bold flex items-center space-x-1"
                          data-testid={`resolve-request-btn-${req.id}`}
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>All Set</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelRequest(req.id)}
                          className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-2xs font-semibold"
                          data-testid={`cancel-request-btn-${req.id}`}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. CAREGIVER ROUTINE PROPOSALS (Patient Decision Authority)        */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple space-y-4"
        aria-label="Caregiver Proposals Review"
        data-testid="patient-proposals-section"
      >
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
            <HeartHandshake className="w-5 h-5 text-purple-600" />
            <span>Caregiver Routine Suggestions</span>
          </h3>
          <p className="text-xs text-gray-500">
            Your caregiver may propose gentle step adjustments based on your daily progress. You
            decide whether to adopt them.
          </p>
        </div>

        {proposals.length === 0 ? (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center text-xs text-gray-500">
            No routine adaptations currently pending your review.
          </div>
        ) : (
          <div className="space-y-3" data-testid="caregiver-proposals-list">
            {proposals.map((prop) => {
              const isLocked = prop.safetyStatus !== 'safe';
              const lockMessage =
                prop.safetyStatus === 'safety_locked_medication'
                  ? '🔒 Medication Schedule Locked: Cannot be altered without clinician supervision.'
                  : prop.safetyStatus === 'safety_locked_flame'
                  ? '🔒 Flame / Stove Locked: Gas and flame activities are safety-locked.'
                  : prop.safetyStatus === 'clinician_prescribed_locked'
                  ? '🔒 Prescribed Routine Locked: Prescribed routine cannot be changed without doctor review.'
                  : null;

              return (
                <div
                  key={prop.id}
                  data-testid={`proposal-card-${prop.id}`}
                  className={`p-4 rounded-2xl border transition-all ${
                    prop.status === 'accepted'
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : prop.status === 'declined'
                      ? 'bg-rose-50/60 border-rose-200'
                      : prop.status === 'deferred'
                      ? 'bg-indigo-50/60 border-indigo-200'
                      : prop.status === 'withdrawn'
                      ? 'bg-gray-100 border-gray-200 opacity-60'
                      : 'bg-purple-50/70 border-purple-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span
                          className={`text-2xs font-bold uppercase px-2 py-0.5 rounded-md ${
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
                          data-testid={`proposal-status-${prop.id}`}
                        >
                          {prop.status === 'accepted'
                            ? 'Accepted & Active'
                            : prop.status === 'declined'
                            ? 'Declined (Original Retained)'
                            : prop.status === 'deferred'
                            ? 'Deferred (Review Later)'
                            : prop.status === 'withdrawn'
                            ? 'Withdrawn by Caregiver'
                            : 'Pending Your Decision'}
                        </span>

                        <span className="text-2xs text-gray-500">
                          Proposed by {prop.authorName} •{' '}
                          {new Date(prop.timestamp).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-gray-900">{prop.title}</h4>
                      <p className="text-xs text-gray-600">{prop.summary}</p>

                      {/* Before / After Preview */}
                      {prop.details.proposedValue && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-2xs bg-white/80 p-2.5 rounded-xl border border-gray-200">
                          <div>
                            <span className="font-semibold text-gray-400 block uppercase">
                              Current Familiar Step
                            </span>
                            <span className="text-gray-700">
                              {prop.details.originalValue || 'Original phrasing'}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-purple-700 block uppercase">
                              Suggested Adaptation
                            </span>
                            <span className="text-purple-900 font-bold">
                              {prop.details.proposedValue}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Safety Warning */}
                      {isLocked && lockMessage && (
                        <div
                          className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded-xl text-2xs text-amber-900 flex items-center space-x-1.5"
                          data-testid={`proposal-safety-lock-warning-${prop.id}`}
                        >
                          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>{lockMessage}</span>
                        </div>
                      )}
                    </div>

                    {/* Decision Actions */}
                    <div className="shrink-0 flex sm:flex-col items-center gap-1.5 self-start">
                      {prop.status === 'pending' || prop.status === 'deferred' ? (
                        <>
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleReviewProposal(prop.id, 'accepted')}
                            className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition flex items-center space-x-1 w-full justify-center ${
                              isLocked
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            }`}
                            data-testid={`accept-proposal-btn-${prop.id}`}
                            title={isLocked ? 'Safety locked' : 'Accept this adaptation'}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReviewProposal(prop.id, 'declined')}
                            className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-2xs font-semibold transition flex items-center space-x-1 w-full justify-center"
                            data-testid={`decline-proposal-btn-${prop.id}`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReviewProposal(prop.id, 'deferred')}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-2xs font-semibold transition flex items-center space-x-1 w-full justify-center"
                            data-testid={`defer-proposal-btn-${prop.id}`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Review Later</span>
                          </button>
                        </>
                      ) : prop.status === 'accepted' ? (
                        <button
                          type="button"
                          onClick={() => handleRevertProposal(prop.id)}
                          className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl text-2xs font-bold flex items-center space-x-1"
                          data-testid={`revert-proposal-btn-${prop.id}`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Revert</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. CAREGIVER SHIFT HANDOFF NOTES (Patient Transparency)             */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple space-y-4"
        aria-label="Caregiver Shift Continuity Notes"
        data-testid="patient-handoffs-section"
      >
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <span>Caregiver Shift Summaries</span>
          </h3>
          <p className="text-xs text-gray-500">
            Factual daily notes logged by your care team to ensure seamless helper continuity.
          </p>
        </div>

        {handoffs.length === 0 ? (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center text-xs text-gray-500">
            No shift handoff notes logged for today.
          </div>
        ) : (
          <div className="space-y-2.5" data-testid="caregiver-handoffs-list">
            {handoffs.map((h) => (
              <div
                key={h.id}
                data-testid={`handoff-card-${h.id}`}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
              >
                <div className="flex items-center justify-between text-2xs">
                  <span className="font-bold text-slate-800 uppercase tracking-wider">
                    {h.shiftPeriod} Shift • {h.shiftDate}
                  </span>
                  <span className="text-slate-500 font-medium">Logged by {h.caregiverName}</span>
                </div>

                {h.assistedActivities.length > 0 && (
                  <div>
                    <span className="text-2xs font-semibold text-slate-600 block mb-1">
                      Activities Supported:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {h.assistedActivities.map((act, i) => (
                        <span
                          key={i}
                          className="text-3xs bg-white text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 font-medium"
                        >
                          {act.activityTitle} ({act.assistanceType.replace('_', ' ')})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {h.patientPreferencesNoted.length > 0 && (
                  <div className="text-2xs text-purple-900 bg-purple-50 p-2 rounded-xl border border-purple-100">
                    <span className="font-bold">Preferences Noted: </span>
                    {h.patientPreferencesNoted.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. DUAL PERSPECTIVE DISCREPANCIES (Neutrally Preserved)            */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple space-y-4"
        aria-label="Dual Perspective Observations"
        data-testid="patient-discrepancies-section"
      >
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
            <Info className="w-5 h-5 text-purple-600" />
            <span>Shared Observations & Clarity</span>
          </h3>
          <p className="text-xs text-gray-500">
            When routine observations differ, Saksham preserves both perspectives neutrally without
            labeling either right or wrong.
          </p>
        </div>

        {discrepancies.length === 0 ? (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center text-xs text-gray-500">
            All recent routine observations are in full harmony.
          </div>
        ) : (
          <div className="space-y-3" data-testid="dyadic-discrepancies-list">
            {discrepancies.map((disc) => (
              <div
                key={disc.id}
                data-testid={`discrepancy-card-${disc.id}`}
                className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2.5"
              >
                <div className="flex items-center justify-between text-2xs">
                  <span className="font-bold text-amber-950 uppercase">{disc.title}</span>
                  <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                    {disc.resolutionStatus === 'clarified'
                      ? 'Clarified by Patient'
                      : disc.resolutionStatus === 'preserved_divergent'
                      ? 'Dual Perspectives Preserved'
                      : 'Dual Perspective Recorded'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs bg-white/90 p-2.5 rounded-xl border border-amber-100">
                  <div>
                    <span className="font-bold text-purple-900 block uppercase">
                      Your Experience
                    </span>
                    <span className="text-gray-800 font-semibold">{disc.patientReport.status}</span>
                    {disc.patientReport.notes && (
                      <p className="text-3xs text-gray-500 mt-0.5">"{disc.patientReport.notes}"</p>
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-teal-900 block uppercase">
                      Caregiver Observation
                    </span>
                    <span className="text-gray-800 font-semibold">
                      {disc.caregiverReport.status}
                    </span>
                    {disc.caregiverReport.notes && (
                      <p className="text-3xs text-gray-500 mt-0.5">
                        "{disc.caregiverReport.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-amber-900 font-medium italic">
                  {disc.neutralExplanation}
                </p>

                {/* Patient clarification field */}
                {disc.resolutionStatus === 'open' && (
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add your own note or clarification..."
                      value={clarificationInputs[disc.id] || ''}
                      onChange={(e) =>
                        setClarificationInputs((prev) => ({
                          ...prev,
                          [disc.id]: e.target.value,
                        }))
                      }
                      className="flex-1 text-xs bg-white rounded-xl border border-amber-200 p-2 text-gray-800"
                      data-testid={`clarification-input-${disc.id}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleClarifyDiscrepancy(disc.id)}
                      className="px-3 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-2xs font-bold shrink-0"
                      data-testid={`save-clarification-btn-${disc.id}`}
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 5. SHARED APPOINTMENT PREPARATION                                  */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple space-y-4"
        aria-label="Doctor Consultation Preparation"
        data-testid="patient-appointment-prep-section"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Doctor Consultation Preparation</span>
            </h3>
            <p className="text-xs text-gray-500">
              Select which observations you wish to share with your doctor. Only chosen items are
              exported.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportAppointmentBrief}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs"
            data-testid="export-appointment-brief-btn"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generate Shared Brief</span>
          </button>
        </div>

        {appointmentItems.length === 0 ? (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center text-xs text-gray-500">
            No logged concerns or routine observations flagged for doctor visits.
          </div>
        ) : (
          <div className="space-y-2" data-testid="appointment-items-selection-list">
            {appointmentItems.map((item) => {
              const isSelected = selectedItemIds.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleAppointmentItem(item.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-200'
                      : 'bg-white border-gray-200 hover:border-indigo-200'
                  }`}
                  data-testid={`appointment-item-${item.id}`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-3xs uppercase font-extrabold px-1.5 py-0.5 bg-white text-indigo-900 rounded border border-indigo-100">
                        {item.authorName}
                      </span>
                      <span className="text-xs font-bold text-gray-800">{item.title}</span>
                    </div>
                    <p className="text-2xs text-gray-600">{item.details}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // Controlled by row onClick
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 ml-2"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Patient Questions to Ask Doctor */}
        <div className="space-y-2 pt-2">
          <label className="block text-2xs font-bold uppercase text-indigo-950">
            Your Questions for the Doctor
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="e.g. Is it normal to feel a bit dizzy in the morning?"
              value={patientQuestionInput}
              onChange={(e) => setPatientQuestionInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
              className="flex-1 text-xs rounded-xl border border-indigo-200 bg-white p-2.5 text-gray-800 font-medium"
              data-testid="patient-question-input"
            />
            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
              data-testid="add-patient-question-btn"
            >
              Add
            </button>
          </div>

          {patientQuestions.length > 0 && (
            <ul className="space-y-1 pt-1" data-testid="patient-questions-list">
              {patientQuestions.map((q, i) => (
                <li
                  key={i}
                  className="text-xs bg-indigo-50/50 text-indigo-950 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center justify-between"
                >
                  <span>
                    {i + 1}. {q}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPatientQuestions((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="text-gray-400 hover:text-rose-600 text-xs font-bold ml-2"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Exported Brief Preview Modal/Drawer */}
        {exportedBrief && (
          <div
            className="p-4 rounded-2xl bg-indigo-900 text-white space-y-3 animate-fade-in"
            data-testid="exported-brief-summary"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                Shared Clinical Brief ({exportedBrief.items.length} Observations Included)
              </span>
              <button
                type="button"
                onClick={() => setExportedBrief(null)}
                className="text-indigo-300 hover:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>

            <p className="text-2xs text-indigo-200 italic">
              {exportedBrief.doctorDisclaimer}
            </p>

            <div className="space-y-1.5 text-xs bg-white/10 p-3 rounded-xl border border-white/15">
              <div className="font-bold text-yellow-300">Consultation Agenda:</div>
              {exportedBrief.patientQuestions.length > 0 && (
                <div>
                  <span className="font-semibold text-indigo-200">Questions:</span>
                  <ul className="list-disc list-inside text-2xs pl-2">
                    {exportedBrief.patientQuestions.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <span className="font-semibold text-indigo-200">Selected Records:</span>
                <ul className="list-disc list-inside text-2xs pl-2">
                  {exportedBrief.items.map((item, idx) => (
                    <li key={idx}>
                      [{item.authorName}] {item.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
