/**
 * SAKSHAM — STAGE 3 PHASE C TEST SUITE
 * Patient Change Reassurance, Caregiver Proposal Review, and In-App Notifications
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdaptiveSupportService } from '../features/adaptive/services/adaptiveSupportService.js';
import { AdaptiveDifficultyService } from '../features/games/services/adaptiveDifficultyService.js';
import { NotificationService } from '../features/notifications/services/notificationService.js';
import { ConversationEngine } from '../features/ai-companion/services/conversationEngine.js';
import { CaregiverProposalReview } from '../features/caregiver/components/CaregiverProposalReview.js';
import { NotificationBell } from '../features/notifications/components/NotificationBell.js';
import { CareAdaptationProposal } from '../features/adaptive/types/adaptive.types.js';

// Mock AuthContext
vi.mock('../context/AuthContext.js', () => ({
  useAuth: () => ({
    currentUser: { uid: 'caregiver-01', displayName: 'Priya Sharma', role: 'caregiver' },
    role: 'caregiver',
    logout: vi.fn(),
  }),
}));

describe('Stage 3 Phase C: Patient Reassurance & Caregiver Transparency', () => {
  const patientId = 'test-patient-transparency-01';
  const caregiverId = 'caregiver-01';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    AdaptiveSupportService.clearCache();
    AdaptiveDifficultyService.clearAll();
    NotificationService.clearCache();
    vi.clearAllMocks();
  });

  const createSampleRoutineProposal = (
    overrides?: Partial<CareAdaptationProposal>
  ): CareAdaptationProposal => ({
    id: 'prop-routine-01',
    patientId,
    activityId: 'routine-dressing',
    activityTitle: 'Morning Dressing & Buttoning',
    domain: 'routine_step_split',
    previousConfig: { mode: 'standard_steps' },
    proposedConfig: { mode: 'micro_step_split', singleStepFocus: true, offerRestBreak: true },
    rationale: 'Observed repeated requests for step help across 2 recent sessions.',
    calmExplanation: {
      en: 'I noticed this step took a little extra effort recently. Would you like me to break it into smaller steps, showing one at a time?',
      hi: 'मैंने देखा कि इस कार्य में थोड़ा अधिक प्रयास लगा। क्या आप चाहेंगे कि मैं इसे छोटे-छोटे चरणों में दिखाऊं?',
      mr: 'मला आढळले की या कृतीसाठी थोडा जास्त वेळ लागला. मी ही कृती लहान पायऱ्यांमध्ये विभागून दाखवू का?',
    },
    evidenceSummary: {
      windowDays: 7,
      totalSessionsObserved: 3,
      struggleCount: 2,
      comfortableCount: 1,
      assistanceRequestCount: 2,
      consecutiveCount: 2,
    },
    status: 'recommendation_generated',
    isClinicianPrescribed: false,
    requiresCaregiverApproval: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  const createSampleClinicianGameProposal = (): CareAdaptationProposal => ({
    id: 'prop-game-clinician-01',
    patientId,
    activityId: 'game-matching-dr',
    activityTitle: 'Memory Card Sequence (Prescribed)',
    domain: 'game_difficulty',
    previousConfig: { difficulty: 'Moderate', pacing: 'balanced' },
    proposedConfig: { difficulty: 'Gentle', pacing: 'calm' },
    rationale: 'Patient requested multiple hints during recent prescribed cognitive activity.',
    calmExplanation: {
      en: 'Would you like a little more help with this game? We can make it simpler whenever you want.',
      hi: 'क्या आप इस खेल में थोड़ी अधिक सहायता चाहेंगे?',
      mr: 'आपल्याला या खेळात थोडी मदत हवी आहे का?',
    },
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
    prescribingDoctorId: 'doctor-neuro-01',
    requiresCaregiverApproval: true,
    createdAt: new Date().toISOString(),
  });

  describe('1. Patient Experience & Reassurance Flows', () => {
    it('does NOT silently activate persistent configuration when explanation is displayed', async () => {
      const proposal = createSampleRoutineProposal();
      await AdaptiveSupportService.saveProposal(proposal);

      // ASHA records that explanation was displayed to the patient
      await AdaptiveSupportService.recordExplanationDisplayed(patientId, proposal.id);

      const refreshed = AdaptiveSupportService.getProposals(patientId)[0];
      expect(refreshed.explanationDisplayedAt).toBeDefined();
      // Status MUST remain un-activated
      expect(refreshed.status).toBe('recommendation_generated');
      expect(refreshed.status).not.toBe('activated');
    });

    it('records patient choice to keep familiar version, marks proposal declined, and preserves configuration', async () => {
      const proposal = createSampleRoutineProposal();
      await AdaptiveSupportService.saveProposal(proposal);

      // Patient says "Keep familiar"
      const res = await AdaptiveSupportService.recordPatientChoice(
        patientId,
        proposal.id,
        'keep_familiar',
        'Patient prefers familiar routine'
      );

      expect(res.status).toBe('declined');
      expect(res.declinedBy).toBe('patient');
      expect(res.patientConsent).toBe('keep_familiar');

      // Proposal is NOT active
      const active = AdaptiveSupportService.getActiveProposalForActivity(patientId, proposal.activityId);
      expect(active).toBeNull();

      // Caregiver receives transparency notification
      const notifs = NotificationService.getNotifications(patientId, 'caregiver');
      expect(notifs.some((n) => n.type === 'PATIENT_KEPT_FAMILIAR')).toBe(true);
      expect(notifs[0].message).toContain('preferred to keep familiar version');
    });

    it('records patient choice when patient accepts support requiring caregiver approval', async () => {
      const proposal = createSampleRoutineProposal({ requiresCaregiverApproval: true });
      await AdaptiveSupportService.saveProposal(proposal);

      // Patient clicks "Yes, smaller steps"
      const res = await AdaptiveSupportService.recordPatientChoice(
        patientId,
        proposal.id,
        'accepted'
      );

      // Since caregiver approval is required, status is 'awaiting_approval', NOT 'activated'!
      expect(res.status).toBe('awaiting_approval');
      expect(res.patientConsent).toBe('accepted');
      expect(res.status).not.toBe('activated');

      // Notification sent to caregiver
      const notifs = NotificationService.getNotifications(patientId, 'caregiver');
      expect(notifs.some((n) => n.type === 'PROPOSAL_AWAITING_REVIEW')).toBe(true);
      expect(notifs[0].message).toContain('Patient expressed interest in smaller steps');
    });

    it('ASHA conversation handles patient saying keep familiar and provides calming non-diagnostic reassurance', async () => {
      const proposal = createSampleRoutineProposal();
      await AdaptiveSupportService.saveProposal(proposal);

      const conversationRes = await ConversationEngine.process(
        'keep the same level',
        { patientId } as any,
        'en'
      );
      expect(conversationRes.intent).toBe('ADAPTATION_KEEP_LEVEL');
      expect(conversationRes.speech).toContain('keep things the way you know them');

      // Strict dignity invariant: zero deficit words
      const blacklist = ['decline', 'deterioration', 'impairment', 'deficit', 'failing', 'severity'];
      blacklist.forEach((word) => {
        expect(conversationRes.speech.toLowerCase()).not.toContain(word);
      });

      // Proposal marked with keep_familiar
      const refreshed = AdaptiveSupportService.getProposals(patientId)[0];
      expect(refreshed.status).toBe('declined');
      expect(refreshed.patientConsent).toBe('keep_familiar');
    });
  });

  describe('2. Caregiver Proposal Review Interface', () => {
    it('renders proposal card with activity details, neutral evidence, and patient preference', async () => {
      const proposal = createSampleRoutineProposal({
        patientConsent: 'keep_familiar',
      });
      await AdaptiveSupportService.saveProposal(proposal);

      render(
        <MemoryRouter>
          <CaregiverProposalReview
            patientId={patientId}
            patientName="Sunita Sharma"
            caregiverId={caregiverId}
            isAuthorized={true}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Morning Dressing & Buttoning')).toBeInTheDocument();
      expect(screen.getByText(/Why Saksham Is Recommending This/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Patient preference: Sunita Sharma chose to keep their familiar version/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Standard multi-action task/i)).toBeInTheDocument();
      expect(screen.getByText(/Divided into micro-steps/i)).toBeInTheDocument();
    });

    it('strictly hides proposal review section for unauthorized or unlinked caregivers', () => {
      const proposal = createSampleRoutineProposal();
      AdaptiveSupportService.saveProposal(proposal);

      const { container } = render(
        <MemoryRouter>
          <CaregiverProposalReview
            patientId={patientId}
            patientName="Sunita Sharma"
            caregiverId="unauthorized-cg"
            isAuthorized={false}
          />
        </MemoryRouter>
      );

      expect(container.firstChild).toBeNull();
    });

    it('allows caregiver to approve a permitted pending proposal and activates configuration', async () => {
      const proposal = createSampleRoutineProposal({
        status: 'awaiting_approval',
        patientConsent: 'accepted',
      });
      await AdaptiveSupportService.saveProposal(proposal);

      render(
        <MemoryRouter>
          <CaregiverProposalReview
            patientId={patientId}
            patientName="Sunita Sharma"
            caregiverId={caregiverId}
            isAuthorized={true}
          />
        </MemoryRouter>
      );

      const approveBtn = screen.getByTestId(`approve-proposal-btn-${proposal.id}`);
      fireEvent.click(approveBtn);

      // Confirm modal opens
      expect(screen.getByTestId('confirm-approve-modal')).toBeInTheDocument();
      const proceedBtn = screen.getByTestId('confirm-approve-proceed-btn');
      fireEvent.click(proceedBtn);

      await waitFor(() => {
        const updated = AdaptiveSupportService.getProposals(patientId)[0];
        expect(updated.status).toBe('activated');
        expect(updated.approvedBy).toBe(caregiverId);
      });
    });

    it('strictly forbids caregiver from approving clinician-prescribed proposals', async () => {
      const clinicianProposal = createSampleClinicianGameProposal();
      await AdaptiveSupportService.saveProposal(clinicianProposal);

      render(
        <MemoryRouter>
          <CaregiverProposalReview
            patientId={patientId}
            patientName="Sunita Sharma"
            caregiverId={caregiverId}
            isAuthorized={true}
          />
        </MemoryRouter>
      );

      // Clinician lock badge is visible
      expect(screen.getByTestId('clinician-prescribed-badge')).toBeInTheDocument();
      expect(screen.getByTestId('clinician-lock-warning')).toBeInTheDocument();

      // Approve button is disabled
      const approveBtn = screen.getByTestId(`approve-proposal-btn-${clinicianProposal.id}`);
      expect(approveBtn).toBeDisabled();

      // Programmatic direct attempt is also rejected
      await expect(
        AdaptiveSupportService.approveProposal(patientId, clinicianProposal.id, caregiverId, 'caregiver')
      ).rejects.toThrow(/Clinician-prescribed activities require doctor approval/);
    });

    it('allows caregiver to revert an activated proposal and restores previous configuration', async () => {
      const proposal = createSampleRoutineProposal({
        domain: 'game_difficulty',
        status: 'activated',
        previousConfig: { difficulty: 'Gentle', pacing: 'calm' },
        proposedConfig: { difficulty: 'Moderate', pacing: 'balanced' },
      });
      await AdaptiveSupportService.saveProposal(proposal);

      render(
        <MemoryRouter>
          <CaregiverProposalReview
            patientId={patientId}
            patientName="Sunita Sharma"
            caregiverId={caregiverId}
            isAuthorized={true}
          />
        </MemoryRouter>
      );

      const revertBtn = screen.getByTestId(`revert-proposal-btn-${proposal.id}`);
      fireEvent.click(revertBtn);

      expect(screen.getByTestId('confirm-revert-modal')).toBeInTheDocument();
      const proceedRevertBtn = screen.getByTestId('confirm-revert-proceed-btn');
      fireEvent.click(proceedRevertBtn);

      await waitFor(() => {
        const updated = AdaptiveSupportService.getProposals(patientId)[0];
        expect(updated.status).toBe('reverted');
        expect(updated.revertedBy).toBe(caregiverId);
      });
    });

    it('expands observation history drawer without crashing', async () => {
      const proposal = createSampleRoutineProposal();
      await AdaptiveSupportService.saveProposal(proposal);
      await AdaptiveSupportService.recordObservation({
        id: 'obs-01',
        patientId,
        activityId: proposal.activityId,
        activityTitle: proposal.activityTitle,
        activityType: 'routine',
        timestamp: new Date().toISOString(),
        sessionId: 'sess-01',
        assistanceRequested: true,
        hintsUsedCount: 1,
        repeatedInstructionCount: 1,
        completionStatus: 'completed',
        pauseCount: 2,
        durationSeconds: 120,
        isInterrupted: false,
        currentLevel: 'Standard',
      });

      render(
        <MemoryRouter>
          <CaregiverProposalReview
            patientId={patientId}
            patientName="Sunita Sharma"
            caregiverId={caregiverId}
            isAuthorized={true}
          />
        </MemoryRouter>
      );

      const toggleHistoryBtn = screen.getByText(/View Observation History/i);
      fireEvent.click(toggleHistoryBtn);

      expect(screen.getByTestId('observation-history-drawer')).toBeInTheDocument();
      expect(screen.getByText(/Hints: 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Pauses: 2/i)).toBeInTheDocument();
    });
  });

  describe('3. In-App Notification System & Privacy', () => {
    it('creates notification and displays unread badge in NotificationBell', async () => {
      await NotificationService.createNotification({
        patientId,
        recipientRole: 'caregiver',
        type: 'PROPOSAL_AWAITING_REVIEW',
        title: 'Care Support Update',
        message: 'A new gentle adjustment proposal was generated.',
        proposalId: 'prop-01',
      });

      render(<NotificationBell patientId={patientId} />);

      expect(screen.getByTestId('notification-unread-badge')).toHaveTextContent('1');

      // Click to open drawer
      const bellBtn = screen.getByTestId('notification-bell-btn');
      fireEvent.click(bellBtn);

      expect(screen.getByTestId('notification-dropdown-panel')).toBeInTheDocument();
      expect(screen.getByText('Care Support Update')).toBeInTheDocument();
    });

    it('deduplicates identical notifications within 24 hours to prevent spamming', async () => {
      await NotificationService.createNotification({
        patientId,
        recipientRole: 'caregiver',
        type: 'PROPOSAL_AWAITING_REVIEW',
        title: 'Care Support Update',
        message: 'Adjustment generated.',
        proposalId: 'prop-duplicate-check',
      });

      await NotificationService.createNotification({
        patientId,
        recipientRole: 'caregiver',
        type: 'PROPOSAL_AWAITING_REVIEW',
        title: 'Care Support Update',
        message: 'Adjustment generated.',
        proposalId: 'prop-duplicate-check',
      });

      const list = NotificationService.getNotifications(patientId, 'caregiver');
      expect(list.length).toBe(1);
    });

    it('marks notification as read when clicked or when mark all is clicked', async () => {
      await NotificationService.createNotification({
        patientId,
        recipientRole: 'caregiver',
        type: 'CAREGIVER_APPROVED',
        title: 'Adjustment Approved',
        message: 'Adjustment activated.',
      });

      expect(NotificationService.getUnreadCount(patientId, 'caregiver')).toBe(1);

      render(<NotificationBell patientId={patientId} />);
      const bellBtn = screen.getByTestId('notification-bell-btn');
      fireEvent.click(bellBtn);

      const markAllBtn = screen.getByTestId('mark-all-read-btn');
      fireEvent.click(markAllBtn);

      await waitFor(() => {
        expect(NotificationService.getUnreadCount(patientId, 'caregiver')).toBe(0);
      });
    });

    it('enforces that notification titles and previews contain zero stigmatizing or diagnostic words', async () => {
      const notif1 = await NotificationService.createNotification({
        patientId,
        recipientRole: 'all',
        type: 'PROPOSAL_AWAITING_REVIEW',
        title: 'Care Support Recommendation',
        message: 'A new gentle adjustment proposal was generated for "Morning Dressing".',
      });

      const notif2 = await NotificationService.createNotification({
        patientId,
        recipientRole: 'all',
        type: 'PATIENT_KEPT_FAMILIAR',
        title: 'Activity Preference Recorded',
        message: 'Patient preferred to keep familiar version of "Card Matching".',
      });

      const forbidden = ['deficit', 'deterioration', 'impairment', 'failing', 'disease', 'dementia stage'];
      [notif1, notif2].forEach((n) => {
        forbidden.forEach((word) => {
          expect(n.title.toLowerCase()).not.toContain(word);
          expect(n.message.toLowerCase()).not.toContain(word);
        });
      });
    });
  });
});
