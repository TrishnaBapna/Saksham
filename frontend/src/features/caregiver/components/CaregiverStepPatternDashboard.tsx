/**
 * SAKSHAM NEURO-CARE — PHASE 3.4
 * CAREGIVER DYADIC STEP-PATTERN DASHBOARD & PATIENT-DRIVEN ADAPTIVE SUPPORT
 * Displays 14-day rolling micro-interaction patterns, step choke-points,
 * safety safeguards, micro-action proposals, and reversible challenges.
 * 100% Spark Free Plan compliant — strictly non-diagnostic.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  Layers,
  Check,
  X,
  History,
  Lock,
} from 'lucide-react';
import {
  StepPerformancePattern,
  StepSimplificationProposal,
  FamiliarityPreservingChallengeProposal,
  DyadicModificationRecord,
} from '../../routines/types/stepPattern.types.js';
import { StepPatternService } from '../../routines/services/stepPatternService.js';
import { TaskLifecycleService } from '../../routines/services/taskLifecycleService.js';
import { RecurringTask } from '../../routines/types/taskLifecycle.types.js';
import { useLanguage } from '../../../context/LanguageContext.js';

export interface CaregiverStepPatternDashboardProps {
  patientId: string;
  patientName?: string;
  isAuthorized?: boolean;
  initialRoutineId?: string;
}

// Fallback routines when none are found in storage
const FALLBACK_ROUTINES: RecurringTask[] = [
  {
    id: 'tea-prep-daily',
    patientId: 'default-patient',
    title: 'Morning Tea Preparation',
    description: 'Calm morning tea making routine',
    category: 'hydration',
    period: 'morning',
    scheduledTime: '08:00 AM',
    durationMinutes: 10,
    recurrence: 'daily',
    supportLevel: 'independent',
    createdBy: 'caregiver',
    lifecycleStatus: 'active',
    reminderConfig: {
      enabled: true,
      leadTimeMinutes: 5,
      followUpMinutes: 10,
      maxFollowUps: 2,
    },
    steps: [
      'Take clean cup from cupboard',
      'Fill electric kettle with fresh water',
      'Boil water safely and warm the teapot',
      'Prepare tea bag and steep gently',
      'Pour tea into cup and rest',
      'Return utensils to drying rack',
    ],
    modificationHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'morning-med-daily',
    patientId: 'default-patient',
    title: 'Morning Prescription Medication',
    description: 'Prescription morning medication schedule',
    category: 'medication',
    period: 'morning',
    scheduledTime: '08:30 AM',
    durationMinutes: 5,
    recurrence: 'daily',
    supportLevel: 'guided',
    createdBy: 'clinician',
    lifecycleStatus: 'active',
    reminderConfig: {
      enabled: true,
      leadTimeMinutes: 0,
      followUpMinutes: 5,
      maxFollowUps: 3,
    },
    steps: [
      'Take morning dose organizer box',
      'Confirm current day compartment',
      'Swallow medication with full glass of water',
      'Close organizer and return to cool drawer',
    ],
    modificationHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const CaregiverStepPatternDashboard: React.FC<CaregiverStepPatternDashboardProps> = ({
  patientId,
  patientName = 'Patient',
  isAuthorized = true,
  initialRoutineId,
}) => {
  const { t } = useLanguage();
  const [routines, setRoutines] = useState<RecurringTask[]>([]);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>(initialRoutineId || '');
  const [patterns, setPatterns] = useState<StepPerformancePattern[]>([]);
  const [proposals, setProposals] = useState<StepSimplificationProposal[]>([]);
  const [challenges, setChallenges] = useState<FamiliarityPreservingChallengeProposal[]>([]);
  const [modifications, setModifications] = useState<DyadicModificationRecord[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Load recurring routines for routine selector
  const loadRoutines = useCallback(() => {
    if (!patientId) return;
    try {
      const live = TaskLifecycleService.getRecurringTasks(patientId);
      if (live && live.length > 0) {
        setRoutines(live);
        if (!selectedRoutineId) {
          setSelectedRoutineId(initialRoutineId || live[0].id);
        }
      } else {
        setRoutines(FALLBACK_ROUTINES);
        if (!selectedRoutineId) {
          setSelectedRoutineId(initialRoutineId || FALLBACK_ROUTINES[0].id);
        }
      }
    } catch {
      setRoutines(FALLBACK_ROUTINES);
      if (!selectedRoutineId) {
        setSelectedRoutineId(initialRoutineId || FALLBACK_ROUTINES[0].id);
      }
    }
  }, [patientId, selectedRoutineId, initialRoutineId]);

  // Load telemetry, proposals, challenges, and dyadic modifications
  const refreshPatternData = useCallback(() => {
    if (!patientId || !selectedRoutineId) return;
    setIsRefreshing(true);

    const activeRoutine = routines.find((r) => r.id === selectedRoutineId) || FALLBACK_ROUTINES[0];
    const stepsCount = activeRoutine?.steps?.length || 3;

    try {
      const analyzedPatterns = StepPatternService.analyzeStepPatterns(
        patientId,
        selectedRoutineId,
        stepsCount
      );
      setPatterns(analyzedPatterns);

      const activeProposals = StepPatternService.getSimplificationProposals(
        patientId,
        selectedRoutineId
      );
      setProposals(activeProposals);

      const activeChallenges = StepPatternService.getChallengeProposals(
        patientId,
        selectedRoutineId
      );
      setChallenges(activeChallenges);

      const mods = StepPatternService.getDyadicModifications(patientId, selectedRoutineId);
      setModifications(mods);
    } catch (err) {
      console.warn('[CaregiverStepPatternDashboard] Failed to load telemetry patterns:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [patientId, selectedRoutineId, routines]);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  useEffect(() => {
    refreshPatternData();
  }, [refreshPatternData]);

  const selectedRoutine = useMemo(() => {
    return routines.find((r) => r.id === selectedRoutineId) || routines[0] || FALLBACK_ROUTINES[0];
  }, [routines, selectedRoutineId]);

  // Handlers for Simplification Proposals (Feature C)
  const handleAcceptProposal = (proposalId: string, customNote?: string) => {
    if (!isAuthorized) return;
    const note = customNote || 'Caregiver reviewed and accepted micro-actions';
    StepPatternService.updateProposalStatus(patientId, proposalId, 'accepted', 'caregiver', note);
    refreshPatternData();
  };

  const handleDeclineProposal = (proposalId: string, customNote?: string) => {
    if (!isAuthorized) return;
    const note = customNote || 'Caregiver preferred retaining current step instruction';
    StepPatternService.updateProposalStatus(patientId, proposalId, 'declined', 'caregiver', note);
    refreshPatternData();
  };

  const handleRevertProposal = (proposalId: string, customNote?: string) => {
    if (!isAuthorized) return;
    const note = customNote || 'Reverted to original step instruction';
    StepPatternService.updateProposalStatus(patientId, proposalId, 'reverted', 'caregiver', note);
    refreshPatternData();
  };

  // Handlers for Challenge Proposals (Feature D)
  const handleAllowChallenge = (challengeId: string) => {
    if (!isAuthorized) return;
    StepPatternService.updateChallengeStatus(patientId, challengeId, 'available', 'caregiver');
    refreshPatternData();
  };

  const handleDeclineChallenge = (challengeId: string) => {
    if (!isAuthorized) return;
    StepPatternService.updateChallengeStatus(patientId, challengeId, 'declined', 'caregiver');
    refreshPatternData();
  };

  return (
    <div
      data-testid="caregiver-step-pattern-dashboard"
      className="bg-white rounded-3xl p-6 sm:p-7 border border-indigo-100 shadow-soft-purple space-y-6"
    >
      {/* 1. Header & Non-Diagnostic Disclaimer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-50 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200 shadow-2xs">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">
                {t('caregiver.step_title')}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                {t('caregiver.step_rolling_badge')}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              {t('caregiver.step_subtitle', { name: patientName })}
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="refresh-patterns-btn"
          onClick={refreshPatternData}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 transition shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{t('caregiver.step_refresh')}</span>
        </button>
      </div>

      {/* Non-Diagnostic Clinical Disclaimer Banner */}
      <div
        data-testid="non-diagnostic-banner"
        className="p-3.5 bg-emerald-50/90 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5"
      >
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-bold">{t('caregiver.step_nondiag_title')}</strong>{' '}
          {t('caregiver.step_nondiag_desc')}
        </p>
      </div>

      {/* 2. Routine Selector & Overview Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
        <div className="space-y-1">
          <label htmlFor="routine-select" className="text-xs font-bold text-slate-700 block">
            {t('caregiver.step_select_routine')}
          </label>
          <select
            id="routine-select"
            data-testid="routine-selector"
            value={selectedRoutineId}
            onChange={(e) => setSelectedRoutineId(e.target.value)}
            className="px-3.5 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer min-w-[240px]"
          >
            {routines.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.steps?.length || 0} steps)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="font-semibold">Category:</span>
          <span
            data-testid="routine-category-badge"
            className="capitalize px-2.5 py-0.5 bg-white border border-slate-200 rounded-full font-bold text-slate-700"
          >
            {selectedRoutine?.category || 'general'}
          </span>
          <span className="font-semibold">Scheduled:</span>
          <span className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-full font-bold text-slate-700">
            {selectedRoutine?.scheduledTime || '08:00 AM'}
          </span>
        </div>
      </div>

      {/* 3. Non-Punitive Philosophy Reassurance */}
      <div
        data-testid="unattempted-note"
        className="text-[11px] text-slate-600 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 leading-relaxed"
      >
        🌿 <strong className="font-semibold text-slate-800">Dignity-Preserving Observation:</strong> Skipped
        or unattempted routines reflect personal rhythm and healthy rest, not unsuccessful performance.
        Classifications require at least 3 completed observations before proposing adjustments.
      </div>

      {/* 4. Step-by-Step Performance Table / Cards (Feature A & B) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">
            Step-Level Telemetry & Pattern Analysis ({patterns.length} Steps)
          </h4>
          <span className="text-xs text-slate-500 font-medium">14-Day Rolling Window</span>
        </div>

        <div className="space-y-3">
          {patterns.map((pattern) => {
            const stepInstruction =
              selectedRoutine?.steps?.[pattern.stepIndex] || `Step ${pattern.stepIndex + 1}`;
            const safetyCheck = StepPatternService.evaluateSafetyLock(
              stepInstruction,
              selectedRoutine?.category || 'general'
            );
            const patternLabel = StepPatternService.getPatternLabel(
              pattern.classification,
              safetyCheck.isSafetyLocked
            );
            const factualExplanation = StepPatternService.getFactualExplanation(
              pattern,
              safetyCheck
            );
            const isEvidenceSufficient = pattern.totalAttempts >= 3;

            return (
              <div
                key={pattern.stepIndex}
                data-testid={`step-pattern-card-${pattern.stepIndex}`}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3 transition hover:border-indigo-200"
              >
                {/* Header: Step Index & Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-xs font-black flex items-center justify-center shrink-0">
                      {pattern.stepIndex + 1}
                    </span>
                    <h5 className="font-bold text-sm text-slate-900 leading-snug">
                      {stepInstruction}
                    </h5>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Evidence Sufficiency Badge */}
                    <span
                      data-testid={`evidence-badge-${pattern.stepIndex}`}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isEvidenceSufficient
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {isEvidenceSufficient
                        ? `Sufficient Evidence (${pattern.totalAttempts} attempts)`
                        : `Observing (< 3 attempts)`}
                    </span>

                    {/* Pattern Classification Badge */}
                    <span
                      data-testid={`pattern-status-${pattern.stepIndex}`}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {patternLabel}
                    </span>
                  </div>
                </div>

                {/* Telemetry Counts Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-xl text-center border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                      Recorded
                    </span>
                    <span
                      data-testid={`total-attempts-${pattern.stepIndex}`}
                      className="font-black text-slate-800 text-sm"
                    >
                      {pattern.totalAttempts}
                    </span>
                  </div>

                  <div className="p-2 bg-emerald-50/70 rounded-xl text-center border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 font-bold block uppercase tracking-wider">
                      Independent
                    </span>
                    <span
                      data-testid={`independent-count-${pattern.stepIndex}`}
                      className="font-black text-emerald-800 text-sm"
                    >
                      {pattern.independentCount}
                    </span>
                  </div>

                  <div className="p-2 bg-indigo-50/70 rounded-xl text-center border border-indigo-100">
                    <span className="text-[10px] text-indigo-700 font-bold block uppercase tracking-wider">
                      Hints Used
                    </span>
                    <span
                      data-testid={`hint-count-${pattern.stepIndex}`}
                      className="font-black text-indigo-800 text-sm"
                    >
                      {pattern.hintCount}
                    </span>
                  </div>

                  <div className="p-2 bg-purple-50/70 rounded-xl text-center border border-purple-100">
                    <span className="text-[10px] text-purple-700 font-bold block uppercase tracking-wider">
                      Assisted
                    </span>
                    <span
                      data-testid={`assisted-count-${pattern.stepIndex}`}
                      className="font-black text-purple-800 text-sm"
                    >
                      {pattern.assistedCount}
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-xl text-center border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                      Skipped (Rested)
                    </span>
                    <span
                      data-testid={`skipped-count-${pattern.stepIndex}`}
                      className="font-black text-slate-700 text-sm"
                    >
                      {pattern.skippedCount}
                    </span>
                  </div>
                </div>

                {/* Safety-Lock Safeguard Notice (if applicable) */}
                {safetyCheck.isSafetyLocked && (
                  <div
                    data-testid={`safety-lock-badge-${pattern.stepIndex}`}
                    className="p-2.5 bg-rose-50/90 rounded-xl border border-rose-200 text-xs text-rose-900 flex items-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                    <span>
                      <strong className="font-bold">Physical Safety Safeguard Active:</strong>{' '}
                      {safetyCheck.reason}
                    </span>
                  </div>
                )}

                {/* Factual, Non-Diagnostic Explanation Card (Feature B) */}
                <div
                  data-testid={`step-explanation-${pattern.stepIndex}`}
                  className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed font-medium"
                >
                  {factualExplanation}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Step Simplification Review Section (Feature C) */}
      <div data-testid="simplification-proposals-section" className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">
              Micro-Action Simplification Proposals ({proposals.length})
            </h4>
          </div>
          <span className="text-xs text-slate-500 font-medium">Caregiver Dyadic Review</span>
        </div>

        {proposals.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
            No step-simplification proposals currently recommended. Standard instructions remain familiar.
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((proposal) => {
              const isProposed = proposal.status === 'proposed';
              const isAccepted = proposal.status === 'accepted';

              return (
                <div
                  key={proposal.id}
                  data-testid={`proposal-card-${proposal.id}`}
                  className="p-4 bg-white rounded-2xl border-2 border-indigo-100 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-indigo-800">
                        Step {proposal.stepIndex + 1} Adaptation
                      </span>
                      <h5
                        data-testid={`proposal-original-${proposal.id}`}
                        className="font-bold text-sm text-slate-900"
                      >
                        "{proposal.originalStepText}"
                      </h5>
                    </div>
                    <span
                      data-testid={`proposal-status-${proposal.id}`}
                      className={`px-3 py-1 rounded-full text-xs font-extrabold capitalize border ${
                        isAccepted
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : proposal.status === 'declined'
                          ? 'bg-slate-100 text-slate-600 border-slate-300'
                          : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                      }`}
                    >
                      {proposal.status}
                    </span>
                  </div>

                  {/* Micro-actions breakdown */}
                  <div className="p-3 bg-indigo-50/70 rounded-xl space-y-1.5 border border-indigo-100">
                    <span className="text-[11px] font-extrabold text-indigo-900 block uppercase tracking-wider">
                      Proposed 2 Micro-Actions:
                    </span>
                    <ul
                      data-testid={`proposal-microactions-${proposal.id}`}
                      className="text-xs text-indigo-950 space-y-1 font-semibold"
                    >
                      {proposal.proposedMicroActions.map((act, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-indigo-600 font-bold">•</span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Contextual orientation cue */}
                  <div
                    data-testid={`proposal-cue-${proposal.id}`}
                    className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-900 font-medium"
                  >
                    {proposal.contextualCue}
                  </div>

                  {/* Factual rationale */}
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {proposal.rationale}
                  </p>

                  {/* Review Attribution if already reviewed */}
                  {proposal.reviewedBy && (
                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>
                        Reviewed by <strong className="capitalize">{proposal.reviewedBy}</strong> on{' '}
                        {proposal.reviewedAt ? new Date(proposal.reviewedAt).toLocaleDateString() : 'recent'}
                        {proposal.reviewNotes && ` — "${proposal.reviewNotes}"`}
                      </span>
                    </div>
                  )}

                  {/* Interactive Action Controls */}
                  <div className="flex items-center gap-2 pt-2 flex-wrap">
                    {isProposed && (
                      <>
                        <button
                          type="button"
                          data-testid={`accept-simplification-btn-${proposal.id}`}
                          onClick={() => handleAcceptProposal(proposal.id)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept Proposal</span>
                        </button>
                        <button
                          type="button"
                          data-testid={`decline-simplification-btn-${proposal.id}`}
                          onClick={() => handleDeclineProposal(proposal.id)}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-slate-300 shadow-2xs cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Decline Proposal</span>
                        </button>
                      </>
                    )}

                    {isAccepted && (
                      <button
                        type="button"
                        data-testid={`revert-simplification-btn-${proposal.id}`}
                        onClick={() => handleRevertProposal(proposal.id)}
                        className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-amber-300 shadow-2xs cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revert to Original Step</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Grounded Familiarity Challenges Section (Feature D) */}
      <div data-testid="challenge-proposals-section" className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">
              Familiarity-Preserving Challenge Oversight ({challenges.length})
            </h4>
          </div>
          <span className="text-xs text-slate-500 font-medium">Reversible Synaptic Support</span>
        </div>

        {challenges.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
            No challenge exercises generated for this routine. Challenges only unlock after confirmed independent comfort.
          </div>
        ) : (
          <div className="space-y-3">
            {challenges.map((challenge) => {
              return (
                <div
                  key={challenge.id}
                  data-testid={`challenge-card-${challenge.id}`}
                  className="p-4 bg-white rounded-2xl border-2 border-amber-200 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-amber-800">
                        Step {challenge.stepIndex + 1}: {challenge.stepTitle}
                      </span>
                      <p className="font-bold text-sm text-slate-900 mt-0.5">
                        {challenge.promptQuestion}
                      </p>
                    </div>

                    <span
                      data-testid={`challenge-status-${challenge.id}`}
                      className={`px-3 py-1 rounded-full text-xs font-extrabold capitalize border ${
                        challenge.status === 'available'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : challenge.status === 'declined'
                          ? 'bg-slate-100 text-slate-600 border-slate-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {challenge.status}
                    </span>
                  </div>

                  {/* Safety Lock Indicator */}
                  {challenge.isSafetyLocked && (
                    <div
                      data-testid={`challenge-safety-locked-${challenge.id}`}
                      className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 flex items-center gap-2"
                    >
                      <Lock className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                      <span>
                        <strong className="font-bold">Challenge Blocked by Safety Safeguard:</strong>{' '}
                        {challenge.safetyExemptReason}
                      </span>
                    </div>
                  )}

                  {/* Patient 1-Tap Restore Reassurance */}
                  <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100 text-xs text-amber-950 font-medium leading-relaxed">
                    🌿 <strong className="font-bold text-amber-900">Patient 1-Tap Restore:</strong> During
                    task execution, {patientName} can tap "Reveal Step (Keep Familiar)" at any time to
                    instantly restore standard instructions without penalty.
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-2 pt-1">
                    {challenge.status === 'available' && (
                      <button
                        type="button"
                        data-testid={`decline-challenge-btn-${challenge.id}`}
                        onClick={() => handleDeclineChallenge(challenge.id)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-300 shadow-2xs cursor-pointer"
                      >
                        Decline Challenge
                      </button>
                    )}

                    {challenge.status === 'declined' && !challenge.isSafetyLocked && (
                      <button
                        type="button"
                        data-testid={`allow-challenge-btn-${challenge.id}`}
                        onClick={() => handleAllowChallenge(challenge.id)}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        Allow Challenge
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. Dyadic Review & Modification Audit Trail (Feature E) */}
      <div data-testid="dyadic-audit-trail" className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-700" />
            <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">
              Dyadic Audit Trail & Modification History ({modifications.length})
            </h4>
          </div>
          <span className="text-xs text-slate-500 font-medium">Actor Attribution & Autonomy Protection</span>
        </div>

        {/* Dyadic Boundary Guard Notice */}
        <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-xs text-indigo-950 leading-relaxed font-medium">
          🛡️ <strong className="font-bold text-indigo-900">Dyadic Boundary Guard:</strong> Caregivers cannot
          fabricate patient completions or silently overwrite patient records. All actions record actor,
          timestamp, previous state, and reason. Patient autonomy and preference are strictly preserved.
        </div>

        {modifications.length === 0 ? (
          <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
            No modifications recorded for this routine yet.
          </div>
        ) : (
          <div className="space-y-2">
            {modifications.slice(0, 5).map((mod) => (
              <div
                key={mod.id}
                data-testid={`modification-record-${mod.id}`}
                className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      mod.actor === 'patient'
                        ? 'bg-emerald-100 text-emerald-800'
                        : mod.actor === 'caregiver'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {mod.actor}
                  </span>
                  <span className="font-bold text-slate-800 capitalize">
                    {mod.modificationType.replace(/_/g, ' ')}
                  </span>
                  {mod.reason && <span className="text-slate-500">— {mod.reason}</span>}
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                  {new Date(mod.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 8. Non-Diagnostic Disclaimer Footer */}
      <div
        data-testid="non-diagnostic-disclaimer"
        className="text-[11px] text-slate-500 text-center border-t border-slate-100 pt-4 leading-relaxed"
      >
        Saksham Neuro-Care Adaptive Daily Living Engine • Descriptive behavioral observations for routine
        comfort • 100% Spark Free Plan Compliant • Zero Diagnostic or Cognitive Decline Inferences
      </div>
    </div>
  );
};
