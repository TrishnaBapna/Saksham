import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '../context/LanguageContext.js';
import { AuthProvider } from '../context/AuthContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { DEMO_USERS } from '../features/auth/services/roleService.js';
import {
  ScreenshotDiagnosticService,
  EphemeralScreenshotPayload,
} from '../features/admin/services/screenshotDiagnosticService.js';
import { DeveloperScreenshotDiagnosticPanel } from '../features/admin/components/DeveloperScreenshotDiagnosticPanel.js';
import { AdminDashboard } from '../pages/admin/AdminDashboard.js';
import { FirebaseAILogicService } from '../features/ai-companion/services/firebaseAILogicService.js';
import { AshaRemoteAdapter } from '../features/ai-companion/services/ashaRemoteAdapter.js';
import { SupportedLanguage } from '../i18n/types.js';
import { DailyProgressRing } from '../features/routines/components/DailyProgressRing.js';
import { TaskHistoryTable } from '../features/routines/components/TaskHistoryTable.js';
import { WeeklyRoutineView } from '../features/routines/components/WeeklyRoutineView.js';
import { MemoryChallengeCard } from '../features/routines/components/MemoryChallengeCard.js';
import { MathSprintGame } from '../features/games/components/runners/MathSprintGame.js';
import { AlternatingTapsGame } from '../features/games/components/runners/AlternatingTapsGame.js';
import { NotificationBell } from '../features/notifications/components/NotificationBell.js';
import { CaregiverObservationReport } from '../features/caregiver/components/CaregiverObservationReport.js';
import { CaregiverSafeZoneMap } from '../features/safety/components/CaregiverSafeZoneMap.js';
import { LivingMemoryTimeline } from '../features/memory/components/LivingMemoryTimeline.js';
import { PersonalMemoryGraphEditor } from '../features/memory/components/PersonalMemoryGraphEditor.js';
import { CaregiverProposalReview } from '../features/caregiver/components/CaregiverProposalReview.js';
import { CaregiverDyadicCoordinationView } from '../features/caregiver/components/CaregiverDyadicCoordinationView.js';
import { PatientSharedCareView } from '../features/caregiver/components/PatientSharedCareView.js';

// Import 7 dictionaries to assert live in-memory switching against exact translations
import { enTranslations } from '../i18n/locales/en.js';
import { hiTranslations } from '../i18n/locales/hi.js';
import { mrTranslations } from '../i18n/locales/mr.js';
import { bnTranslations } from '../i18n/locales/bn.js';
import { taTranslations } from '../i18n/locales/ta.js';
import { teTranslations } from '../i18n/locales/te.js';
import { knTranslations } from '../i18n/locales/kn.js';

const DICTS: Record<'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te' | 'kn', Record<string, string>> = {
  en: enTranslations,
  hi: hiTranslations,
  mr: mrTranslations,
  bn: bnTranslations,
  ta: taTranslations,
  te: teTranslations,
  kn: knTranslations,
};

const ALL_7_LANGS: Array<'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te' | 'kn'> = [
  'en',
  'hi',
  'mr',
  'bn',
  'ta',
  'te',
  'kn',
];

const samplePayload: EphemeralScreenshotPayload = {
  fileName: 'patient-bug.png',
  mimeType: 'image/png',
  sizeBytes: 2048,
  base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
};

const LiveLanguageController: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, setLanguage } = useLanguage();
  return (
    <div>
      <div data-testid="active-lang-code">{language}</div>
      <div className="flex gap-1">
        {ALL_7_LANGS.map((lang) => (
          <button
            key={lang}
            type="button"
            data-testid={`switch-lang-${lang}`}
            onClick={() => setLanguage(lang as SupportedLanguage)}
          >
            {lang}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
};

describe('Phase 3.24: Scoped Screenshot-to-Gemini Diagnostics & 7-Language Nested Transition Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Part A: Developer Screenshot-to-Gemini Diagnostics Authorization, Privacy & Report Flow', () => {
    it('blocks non-admin roles (patient, caregiver, doctor) cleanly without invoking Gemini or local gateway', async () => {
      const cloudSpy = vi.spyOn(FirebaseAILogicService, 'analyzeScreenshotMultimodal');
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      for (const role of ['patient', 'caregiver', 'doctor'] as const) {
        const res = await ScreenshotDiagnosticService.analyzeScreenshot({
          callerRole: role,
          screenshot: samplePayload,
          issueDescription: 'Button text looks cropped on Tamil view',
        });

        expect(res.ok).toBe(false);
        expect(res.blockedReason).toBe('UNAUTHORIZED_ROLE');
      }

      expect(cloudSpy).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('renders unauthorized state in DeveloperScreenshotDiagnosticPanel when caller is patient or caregiver', () => {
      const patientUser = Object.values(DEMO_USERS).find((u) => u.role === 'patient')!;
      localStorage.setItem('saksham_auth_user', JSON.stringify(patientUser));

      render(
        <BrowserRouter>
          <AuthProvider>
            <LanguageProvider>
              <DeveloperScreenshotDiagnosticPanel />
            </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      );

      expect(screen.getByTestId('developer-diagnostic-unauthorized')).toBeInTheDocument();
      expect(screen.queryByTestId('developer-screenshot-diagnostic-panel')).not.toBeInTheDocument();
    });

    it('validates allowed image MIME types and rejects unsupported or empty files', async () => {
      const badFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
      await expect(ScreenshotDiagnosticService.prepareEphemeralScreenshot(badFile)).rejects.toThrow(
        /Unsupported image format/i
      );

      const emptyPng = new File([], 'empty.png', { type: 'image/png' });
      await expect(ScreenshotDiagnosticService.prepareEphemeralScreenshot(emptyPng)).rejects.toThrow(
        /non-empty/i
      );
    });

    it('never calls localhost gateway on remote hosts when Firebase AI Logic fails', async () => {
      vi.spyOn(AshaRemoteAdapter, 'shouldUseLocalGateway').mockReturnValue(false);
      vi.spyOn(FirebaseAILogicService, 'getStatus').mockReturnValue({
        sdkReady: true,
        isProductionHost: true,
        appCheckReady: true,
        canDispatchCloudGemini: true,
        modelName: 'gemini-3.5-flash-lite',
        blockedReason: null,
        statusMessage: 'Ready',
      });
      vi.spyOn(FirebaseAILogicService, 'analyzeScreenshotMultimodal').mockResolvedValue({
        ok: false,
        modelUsed: 'gemini-3.5-flash-lite',
        latencyMs: 50,
        blockedReason: 'NETWORK_ERROR',
        errorMessage: 'Simulated remote failure',
      });
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const res = await ScreenshotDiagnosticService.analyzeScreenshot({
        callerRole: 'admin',
        screenshot: samplePayload,
        issueDescription: 'Check remote failure behavior',
      });

      expect(res.ok).toBe(false);
      expect(res.blockedReason).toBe('NETWORK_ERROR');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('generates structured 7-section report & Antigravity prompt in AdminDashboard without persisting screenshot data', async () => {
      const adminUser = Object.values(DEMO_USERS).find((u) => u.role === 'admin')!;
      localStorage.setItem('saksham_auth_user', JSON.stringify(adminUser));
      localStorage.setItem('saksham_lang_guest', 'en');

      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
      });
      if (typeof URL.createObjectURL !== 'function') {
        Object.defineProperty(URL, 'createObjectURL', {
          value: vi.fn(() => 'blob:mock-screenshot-preview'),
          configurable: true,
        });
      }
      if (typeof URL.revokeObjectURL !== 'function') {
        Object.defineProperty(URL, 'revokeObjectURL', {
          value: vi.fn(),
          configurable: true,
        });
      }

      vi.spyOn(FirebaseAILogicService, 'getStatus').mockReturnValue({
        sdkReady: true,
        isProductionHost: false,
        appCheckReady: true,
        canDispatchCloudGemini: true,
        modelName: 'gemini-3.5-flash-lite',
        blockedReason: null,
        statusMessage: 'Ready',
      });

      const analyzeSpy = vi.spyOn(FirebaseAILogicService, 'analyzeScreenshotMultimodal').mockResolvedValue({
        ok: true,
        modelUsed: 'gemini-3.5-flash-lite',
        latencyMs: 145,
        analysis: {
          observedIssue: 'Toggle button aria-label reads paused when active.',
          affectedComponent: 'PatientLocationConsentModal.tsx',
          expectedBehavior: 'Aria-label matches Pause location sharing when active.',
          reproductionSteps: ['Open Patient Profile', 'Open Location Safety modal'],
          likelyCauseHypothesis: 'Hypothesis: Ternary branches in toggle button are inverted.',
          suggestedRemediation: ['Swap the ternary translation keys inside PatientLocationConsentModal.tsx'],
          suggestedVerificationTests: ['Run CaregiverSafeZone.test.tsx'],
        },
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <LanguageProvider>
              <AccessibilityProvider>
                <AdminDashboard />
              </AccessibilityProvider>
            </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      );

      fireEvent.click(screen.getByTestId('admin-tab-diagnostics'));
      expect(screen.getByTestId('developer-screenshot-diagnostic-panel')).toBeInTheDocument();

      const pngFile = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'bug-capture.png', {
        type: 'image/png',
      });
      const uploadInput = screen.getByTestId('screenshot-upload-input');
      fireEvent.change(uploadInput, { target: { files: [pngFile] } });

      await waitFor(() => {
        expect(screen.getByText('bug-capture.png')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('diagnostic-issue-textarea'), {
        target: { value: 'Location consent button aria-label appears inverted on Patient Profile' },
      });

      fireEvent.click(screen.getByTestId('analyze-screenshot-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostic-report-card')).toBeInTheDocument();
      });

      expect(analyzeSpy).toHaveBeenCalledTimes(1);
      const reportCard = screen.getByTestId('diagnostic-report-card');
      expect(within(reportCard).getAllByText(/PatientLocationConsentModal\.tsx/i).length).toBeGreaterThan(0);
      expect(within(reportCard).getAllByText(/Hypothesis: Ternary branches/i).length).toBeGreaterThan(0);

      const promptText = screen.getByTestId('antigravity-prompt-preview').textContent || '';
      expect(promptText).toContain('# SAKSHAM UI DIAGNOSTIC REMEDIATION TASK');
      expect(promptText).toContain('Likely Cause (Hypothesis');

      fireEvent.click(screen.getByTestId('copy-antigravity-prompt-btn'));
      expect(writeTextMock).toHaveBeenCalledWith(promptText);

      // Ensure zero screenshot bytes or file keys were persisted to localStorage
      const serializedStorage = JSON.stringify(localStorage);
      expect(serializedStorage).not.toContain('bug-capture.png');
      expect(serializedStorage).not.toContain(samplePayload.base64Data);
    });
  });

  describe('Part B: Dynamic 7-Language Switching Without Page Reload Across Nested Components', () => {
    it('updates nested Routine, Game Runner, Notification, Memory, and Caregiver views immediately across all 7 languages', async () => {
      const caregiverUser = Object.values(DEMO_USERS).find((u) => u.role === 'caregiver')!;
      localStorage.setItem('saksham_auth_user', JSON.stringify(caregiverUser));
      localStorage.setItem('saksham_lang_guest', 'en');

      render(
        <BrowserRouter>
          <AuthProvider>
            <LanguageProvider>
              <AccessibilityProvider>
                <LiveLanguageController>
                  <DailyProgressRing completed={2} total={4} />
                  <TaskHistoryTable instances={[]} />
                  <WeeklyRoutineView recurringTasks={[]} />
                  <MemoryChallengeCard
                    taskId="task-01"
                    patientId="patient-demo-01"
                    config={{
                      enabled: true,
                      challengeType: 'location_recall',
                      groundedItemKey: 'keys',
                      groundedLocationHint: 'Verandah hook',
                    }}
                  />
                  <MathSprintGame difficulty="Gentle" onComplete={vi.fn()} />
                  <AlternatingTapsGame difficulty="Gentle" onComplete={vi.fn()} />
                  <NotificationBell patientId="patient-demo-01" />
                  <CaregiverObservationReport patientId="patient-demo-01" patientName="Sunita" />
                  <CaregiverSafeZoneMap patientId="patient-demo-01" patientName="Sunita" />
                  <LivingMemoryTimeline patientId="patient-demo-01" patientName="Sunita" />
                  <PersonalMemoryGraphEditor patientId="patient-demo-01" isCaregiver={true} />
                  <CaregiverProposalReview
                    patientId="patient-demo-01"
                    patientName="Sunita"
                    caregiverId="cg-01"
                    isAuthorized={true}
                  />
                  <CaregiverDyadicCoordinationView
                    patientId="patient-demo-01"
                    patientName="Sunita"
                    caregiverId="cg-01"
                    isAuthorized={true}
                  />
                  <PatientSharedCareView patientId="patient-demo-01" patientName="Sunita" />
                </LiveLanguageController>
              </AccessibilityProvider>
            </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      );

      // Step cleanly through all 7 languages + back to English without unmounting/reloading
      for (const lang of [...ALL_7_LANGS, 'en' as const]) {
        fireEvent.click(screen.getByTestId(`switch-lang-${lang}`));

        await waitFor(() => {
          expect(screen.getByTestId('active-lang-code')).toHaveTextContent(lang);
        });

        const dict = DICTS[lang];
        expect(screen.getByText(dict['routines.hist_empty_title'])).toBeInTheDocument();
        expect(screen.getByText(dict['routines.weekly_title'])).toBeInTheDocument();
        expect(screen.getByText(dict['games_runner.math_choose'])).toBeInTheDocument();
        expect(screen.getByText(dict['games_runner.taps_start'])).toBeInTheDocument();
        expect(screen.getByText(dict['caregiver.obs_title'])).toBeInTheDocument();
        expect(screen.getByText(dict['memory.graph_title'])).toBeInTheDocument();
        expect(screen.getByText(dict['caregiver.prop_title'])).toBeInTheDocument();
        expect(screen.getByText(dict['caregiver.dyadic_title'])).toBeInTheDocument();
        expect(screen.getByText(dict['shared_care.title'])).toBeInTheDocument();
      }
    });
  });
});
