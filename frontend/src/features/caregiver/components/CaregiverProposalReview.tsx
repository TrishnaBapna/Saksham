/**
 * SAKSHAM — STAGE 3 PHASE C: CAREGIVER PROPOSAL REVIEW INTERFACE
 * Accessible review dashboard for authorized caregivers to inspect evidence,
 * respect patient preferences, approve/decline adjustments, and safely revert changes.
 * 100% Spark Free Plan compliant — strictly non-diagnostic.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lock,
  Gamepad2,
  CalendarCheck,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  CareAdaptationProposal,
  AdaptationObservation,
  AdaptationStatus,
} from '../../adaptive/types/adaptive.types.js';
import { AdaptiveSupportService } from '../../adaptive/services/adaptiveSupportService.js';
import { useLanguage } from '../../../context/LanguageContext.js';

interface CaregiverProposalReviewProps {
  patientId: string;
  patientName: string;
  caregiverId: string;
  isAuthorized: boolean;
}

export const CaregiverProposalReview: React.FC<CaregiverProposalReviewProps> = ({
  patientId,
  patientName,
  caregiverId,
  isAuthorized,
}) => {
  const { t } = useLanguage();
  const [proposals, setProposals] = useState<CareAdaptationProposal[]>(() =>
    patientId ? AdaptiveSupportService.getProposals(patientId) : []
  );
  const [observations, setObservations] = useState<AdaptationObservation[]>(() =>
    patientId ? AdaptiveSupportService.getObservations(patientId) : []
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [expandedObservationsId, setExpandedObservationsId] = useState<string | null>(null);

  // Confirmation Modals
  const [confirmApproveModal, setConfirmApproveModal] = useState<CareAdaptationProposal | null>(null);
  const [confirmRevertModal, setConfirmRevertModal] = useState<CareAdaptationProposal | null>(null);
  const [revertReason, setRevertReason] = useState<string>('Caregiver requested return to familiar configuration');

  const loadData = useCallback(async () => {
    if (!patientId || !isAuthorized) {
      setIsLoading(false);
      return;
    }

    setIsSyncing(true);
    try {
      const synced = await AdaptiveSupportService.syncProposalsFromFirestore(patientId);
      setProposals(synced);
      const obs = AdaptiveSupportService.getObservations(patientId);
      setObservations(obs);
    } catch (err) {
      console.warn('[CaregiverProposalReview] Sync fallback to local proposals:', err);
      setProposals(AdaptiveSupportService.getProposals(patientId));
      setObservations(AdaptiveSupportService.getObservations(patientId));
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [patientId, isAuthorized]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (proposal: CareAdaptationProposal) => {
    if (proposal.isClinicianPrescribed) {
      return; // Protected
    }
    setActionInProgressId(proposal.id);
    try {
      await AdaptiveSupportService.approveProposal(patientId, proposal.id, caregiverId, 'caregiver');
      await loadData();
      setConfirmApproveModal(null);
    } catch (err) {
      console.error('[CaregiverProposalReview] Approve failed:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDecline = async (proposal: CareAdaptationProposal) => {
    setActionInProgressId(proposal.id);
    try {
      await AdaptiveSupportService.declineProposal(patientId, proposal.id, caregiverId);
      await loadData();
    } catch (err) {
      console.error('[CaregiverProposalReview] Decline failed:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRevert = async (proposal: CareAdaptationProposal) => {
    setActionInProgressId(proposal.id);
    try {
      await AdaptiveSupportService.revertProposal(
        patientId,
        proposal.id,
        caregiverId,
        revertReason || 'Caregiver requested return to familiar configuration'
      );
      await loadData();
      setConfirmRevertModal(null);
    } catch (err) {
      console.error('[CaregiverProposalReview] Revert failed:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const getStatusBadge = (status: AdaptationStatus) => {
    switch (status) {
      case 'recommendation_generated':
      case 'awaiting_approval':
        return (
          <span
            data-testid="proposal-status-awaiting"
            className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1"
          >
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Awaiting Review</span>
          </span>
        );
      case 'activated':
        return (
          <span
            data-testid="proposal-status-active"
            className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1"
          >
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            <span>Active</span>
          </span>
        );
      case 'accepted':
        return (
          <span
            data-testid="proposal-status-accepted"
            className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1"
          >
            <Check className="w-3 h-3 text-blue-600" />
            <span>Approved</span>
          </span>
        );
      case 'declined':
        return (
          <span
            data-testid="proposal-status-declined"
            className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1"
          >
            <XCircle className="w-3 h-3 text-gray-500" />
            <span>Declined</span>
          </span>
        );
      case 'reverted':
        return (
          <span
            data-testid="proposal-status-reverted"
            className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3 text-purple-600" />
            <span>Reverted</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  if (!isAuthorized) {
    return null;
  }

  const pendingProposals = proposals.filter(
    (p) => p.status === 'recommendation_generated' || p.status === 'awaiting_approval'
  );

  return (
    <section
      data-testid="caregiver-proposal-review-section"
      className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft-purple space-y-5"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-saksham-darkText">
              {t('caregiver.prop_title')}
            </h2>
            {pendingProposals.length > 0 && (
              <span
                data-testid="pending-proposals-count-badge"
                className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-white shadow-2xs animate-pulse"
              >
                {t('caregiver.prop_pending_badge', { count: pendingProposals.length })}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 max-w-xl">
            {t('caregiver.prop_subtitle', { name: patientName })}
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="p-2 rounded-xl text-emerald-700 hover:bg-emerald-50 transition border border-emerald-200 self-start sm:self-center flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          title={t('caregiver.prop_refresh')}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{t('caregiver.prop_refresh')}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-gray-500">{t('caregiver.prop_loading')}</div>
      ) : proposals.length === 0 ? (
        <div className="py-8 text-center rounded-2xl bg-gray-50/70 border border-gray-200">
          <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700">{t('caregiver.prop_none_title')}</p>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {t('caregiver.prop_none_desc')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => {
            const isPending =
              proposal.status === 'recommendation_generated' ||
              proposal.status === 'awaiting_approval';
            const isActive = proposal.status === 'activated';
            const isActionBusy = actionInProgressId === proposal.id;
            const activityObservations = observations.filter(
              (o) => o.activityId === proposal.activityId
            );
            const isExpanded = expandedObservationsId === proposal.id;

            return (
              <div
                key={proposal.id}
                data-testid={`caregiver-proposal-card-${proposal.id}`}
                className={`p-5 rounded-2xl border transition-all ${
                  isPending
                    ? 'bg-amber-50/30 border-amber-200 hover:border-amber-300 shadow-2xs'
                    : isActive
                    ? 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-300'
                    : 'bg-white border-gray-200 opacity-90'
                }`}
              >
                {/* Proposal Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-2xs font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 flex items-center gap-1">
                        {proposal.domain === 'game_difficulty' ? (
                          <>
                            <Gamepad2 className="w-3 h-3" />
                            <span>Mind Game</span>
                          </>
                        ) : (
                          <>
                            <CalendarCheck className="w-3 h-3" />
                            <span>Daily Routine</span>
                          </>
                        )}
                      </span>
                      <span className="text-xs text-gray-400">
                        Proposed on {new Date(proposal.createdAt).toLocaleDateString()}
                      </span>
                      {proposal.isClinicianPrescribed && (
                        <span
                          data-testid="clinician-prescribed-badge"
                          className="text-3xs font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1"
                        >
                          <Lock className="w-2.5 h-2.5 text-blue-700" />
                          <span>Prescribed by Physician</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-gray-900">
                      {proposal.activityTitle}
                    </h3>
                  </div>

                  <div className="shrink-0 self-start sm:self-center">
                    {getStatusBadge(proposal.status)}
                  </div>
                </div>

                {/* Patient Preference Indicator */}
                {proposal.patientConsent && (
                  <div
                    data-testid="proposal-patient-preference-banner"
                    className={`mt-3 p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      proposal.patientConsent === 'keep_familiar'
                        ? 'bg-blue-50/80 border-blue-200 text-blue-900 font-semibold'
                        : proposal.patientConsent === 'accepted'
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 font-semibold'
                        : 'bg-gray-100 border-gray-200 text-gray-700'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      {proposal.patientConsent === 'keep_familiar'
                        ? `Patient preference: ${patientName} chose to keep their familiar version. Saksham respects patient agency and familiar routines.`
                        : proposal.patientConsent === 'accepted'
                        ? `Patient preference: ${patientName} expressed interest in smaller steps.`
                        : `Patient preference: ${patientName} declined this adjustment.`}
                    </span>
                  </div>
                )}

                {/* Neutral Pattern Explanation (Zero Diagnostic/Deficit Terms) */}
                <div className="mt-3.5 space-y-1.5 text-xs text-gray-700 bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
                  <span className="font-extrabold uppercase text-[10px] text-gray-400 block tracking-wider">
                    Why Saksham Is Recommending This
                  </span>
                  <p className="leading-relaxed font-medium">
                    {proposal.rationale}
                  </p>
                  <p className="text-gray-500 text-2xs italic mt-1">
                    ASHA Reassurance: "{proposal.calmExplanation?.en || proposal.rationale}"
                  </p>
                </div>

                {/* Configuration Comparison */}
                <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-white border border-gray-200">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                      Current Configuration
                    </span>
                    <span className="font-semibold text-gray-800">
                      {proposal.domain === 'game_difficulty'
                        ? `Difficulty: ${proposal.previousConfig.difficulty || 'Gentle'}, Pacing: ${proposal.previousConfig.pacing || 'calm'}`
                        : 'Standard multi-action task'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200">
                    <span className="text-[10px] font-bold uppercase text-purple-800 block mb-1">
                      Proposed Adjustment
                    </span>
                    <span className="font-bold text-purple-950">
                      {proposal.domain === 'game_difficulty'
                        ? `Difficulty: ${proposal.proposedConfig.difficulty}, Pacing: ${proposal.proposedConfig.pacing}`
                        : 'Divided into micro-steps with single-step focus & gentle breaks'}
                    </span>
                  </div>
                </div>

                {/* Clinician-Prescribed Task Protection Warning */}
                {proposal.isClinicianPrescribed && isPending && (
                  <div
                    data-testid="clinician-lock-warning"
                    className="mt-3.5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>
                      This activity was prescribed by a physician. Caregivers cannot modify doctor-prescribed activities; changes require clinician authorization.
                    </span>
                  </div>
                )}

                {/* Action Controls */}
                <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedObservationsId(isExpanded ? null : proposal.id)
                    }
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>
                      {isExpanded ? 'Hide Observation History' : 'View Observation History'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Pending Controls */}
                    {isPending && (
                      <>
                        <button
                          type="button"
                          data-testid={`decline-proposal-btn-${proposal.id}`}
                          disabled={isActionBusy}
                          onClick={() => handleDecline(proposal)}
                          className="px-3.5 py-1.5 min-h-[38px] rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Keep Familiar</span>
                        </button>
                        <button
                          type="button"
                          data-testid={`approve-proposal-btn-${proposal.id}`}
                          disabled={isActionBusy || proposal.isClinicianPrescribed}
                          onClick={() => setConfirmApproveModal(proposal)}
                          className="px-4 py-1.5 min-h-[38px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            proposal.isClinicianPrescribed
                              ? 'Clinician-prescribed activities require doctor approval'
                              : 'Approve adjustment'
                          }
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Adjustment</span>
                        </button>
                      </>
                    )}

                    {/* Active Controls */}
                    {isActive && (
                      <button
                        type="button"
                        data-testid={`revert-proposal-btn-${proposal.id}`}
                        disabled={isActionBusy}
                        onClick={() => setConfirmRevertModal(proposal)}
                        className="px-3.5 py-1.5 min-h-[38px] rounded-xl border border-purple-300 text-purple-700 hover:bg-purple-50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revert to Familiar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Observation History */}
                {isExpanded && (
                  <div
                    data-testid="observation-history-drawer"
                    className="mt-3.5 pt-3.5 border-t border-gray-100 space-y-2 animate-in fade-in"
                  >
                    <span className="text-2xs font-extrabold uppercase text-gray-500 block">
                      Recorded Observations ({activityObservations.length} Sessions)
                    </span>
                    {activityObservations.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No detailed sessions logged yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {activityObservations.slice(0, 5).map((obs) => (
                          <div
                            key={obs.id}
                            className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-2xs flex items-center justify-between text-gray-700"
                          >
                            <div>
                              <span className="font-bold">
                                {new Date(obs.timestamp).toLocaleDateString()}{' '}
                                {new Date(obs.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>{' '}
                              • Duration: {obs.durationSeconds}s • Status:{' '}
                              <span className="capitalize">{obs.completionStatus}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {obs.assistanceRequested && (
                                <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                  Hints: {obs.hintsUsedCount}
                                </span>
                              )}
                              {obs.pauseCount > 0 && (
                                <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                                  Pauses: {obs.pauseCount}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal: Approve Proposal */}
      {confirmApproveModal && (
        <div
          data-testid="confirm-approve-modal"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-emerald-100 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Confirm Adjustment Approval
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              You are approving the adaptive adjustment for{' '}
              <strong>"{confirmApproveModal.activityTitle}"</strong>. This will activate smaller
              steps or a calmer pace for {patientName}.
            </p>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold">
              You can return to the familiar configuration at any time using the "Revert to Familiar" option.
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmApproveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-approve-proceed-btn"
                onClick={() => handleApprove(confirmApproveModal)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer shadow-xs"
              >
                Confirm & Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Revert Proposal */}
      {confirmRevertModal && (
        <div
          data-testid="confirm-revert-modal"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-purple-100 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Revert to Familiar Configuration
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Restore the original familiar configuration for{' '}
              <strong>"{confirmRevertModal.activityTitle}"</strong>.
            </p>
            <div className="space-y-1">
              <label htmlFor="revert-reason-input" className="text-2xs font-extrabold uppercase text-gray-500">
                Reason for Reversion
              </label>
              <input
                id="revert-reason-input"
                type="text"
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="e.g. Patient prefers familiar standard routine"
                className="w-full p-2.5 rounded-xl border border-gray-300 text-xs text-gray-800 focus:outline-none focus:border-purple-600"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRevertModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-revert-proceed-btn"
                onClick={() => handleRevert(confirmRevertModal)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition cursor-pointer shadow-xs"
              >
                Restore Familiar Version
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
