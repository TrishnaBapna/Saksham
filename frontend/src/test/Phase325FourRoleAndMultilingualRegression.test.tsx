import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider, useLanguage, SupportedLanguage } from '../context/LanguageContext.js';
import { AuthProvider } from '../context/AuthContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { PatientExperienceProvider } from '../context/PatientExperienceContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { RoleSelector } from '../features/auth/components/RoleSelector.js';
import { LoginPage } from '../features/auth/pages/LoginPage.js';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute.js';
import { verifyRoleMatch } from '../features/auth/services/roleService.js';
import { AuthService } from '../features/auth/services/authService.js';
import { LanguageSwitcherPill } from '../components/layout/LanguageSwitcherPill.js';
import { AdminDashboard } from '../pages/admin/AdminDashboard.js';
import { CaregiverDashboard } from '../pages/caregiver/CaregiverDashboard.js';
import { DoctorDashboard } from '../pages/doctor/DoctorDashboard.js';
import { AshaDemoPage } from '../pages/demo/AshaDemoPage.js';
import { NotesSanctuaryModal } from '../features/notes/components/NotesSanctuaryModal.js';
import { CalendarSanctuaryModal } from '../features/calendar/components/CalendarSanctuaryModal.js';
import { PersonalMemoryGraphEditor } from '../features/memory/components/PersonalMemoryGraphEditor.js';
import { LivingMemoryTimeline } from '../features/memory/components/LivingMemoryTimeline.js';
import { SpeechService } from '../services/speechService.js';
import { ALL_LANGUAGES } from '../i18n/index.js';

const ALL_7_CODES: SupportedLanguage[] = ['en', 'hi', 'mr', 'bn', 'ta', 'te', 'kn'];

const ProvidersWrapper: React.FC<{ initialRoute?: string; children: React.ReactNode }> = ({
  initialRoute = '/login',
  children,
}) => (
  <MemoryRouter initialEntries={[initialRoute]}>
    <AuthProvider>
      <LanguageProvider>
        <AccessibilityProvider>
          <PatientExperienceProvider>
            <CharacterProvider>{children}</CharacterProvider>
          </PatientExperienceProvider>
        </AccessibilityProvider>
      </LanguageProvider>
    </AuthProvider>
  </MemoryRouter>
);

const LangController: React.FC<{ lang: SupportedLanguage }> = ({ lang }) => {
  const { setLanguage } = useLanguage();
  return (
    <button type="button" data-testid={`set-lang-${lang}`} onClick={() => setLanguage(lang)}>
      {lang}
    </button>
  );
};

describe('Phase 3.25 — Four-Role Login Restoration, RBAC & 7-Language End-to-End Parity', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('exposes all 4 role cards (Patient, Caregiver, Doctor, Admin) cleanly on /login with language switcher', () => {
    render(
      <ProvidersWrapper initialRoute="/login">
        <LoginPage />
      </ProvidersWrapper>
    );

    expect(screen.getByTestId('role-card-patient')).toBeInTheDocument();
    expect(screen.getByTestId('role-card-caregiver')).toBeInTheDocument();
    expect(screen.getByTestId('role-card-doctor')).toBeInTheDocument();
    expect(screen.getByTestId('role-card-admin')).toBeInTheDocument();
    expect(screen.getByTestId('auth-language-switcher')).toBeInTheDocument();

    // Selecting Caregiver opens Caregiver Portal form; Admin opens System Administrator form
    fireEvent.click(screen.getByTestId('role-card-caregiver'));
    expect(screen.getByText('Caregiver Access')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Change Portal/i));
    fireEvent.click(screen.getByTestId('role-card-admin'));
    expect(screen.getByText('System Administrator')).toBeInTheDocument();
    expect(screen.getByText(/No Public Registration:/i)).toBeInTheDocument();
  });

  it('never grants privileges on frontend role selection and blocks cross-role signIn/routes', async () => {
    expect(verifyRoleMatch('patient', 'admin').matches).toBe(false);
    expect(verifyRoleMatch('caregiver', 'admin').matches).toBe(false);

    await expect(
      AuthService.signIn('patient@saksham.care', 'password123', 'admin')
    ).rejects.toThrow(/Account Role Mismatch/i);

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <LanguageProvider>
            <Routes>
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <div data-testid="secret-admin-panel">Admin Secret Console</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </LanguageProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Default local session starts as patient; /admin must deny access and never render secret content
    expect(screen.queryByTestId('secret-admin-panel')).not.toBeInTheDocument();
    expect(screen.getByText('Unauthorized Dashboard Access')).toBeInTheDocument();
  });

  it('translates RoleSelector & auth cards immediately across all 7 languages', () => {
    render(
      <ProvidersWrapper>
        <LanguageSwitcherPill />
        <RoleSelector onSelectRole={vi.fn()} />
      </ProvidersWrapper>
    );

    const switcher = screen.getByTestId('auth-language-switcher') as HTMLSelectElement;

    const expectedPatientTitle: Record<string, string> = {
      en: 'Patient Sanctuary',
      hi: 'रोगी अभयारण्य',
      mr: 'रुग्ण अभयारण्य',
      bn: 'রোগীর আশ্রয়',
      ta: 'நோயாளி இல்லம்',
      te: 'రోగి నిలయం',
      kn: 'ರೋಗಿ ನಿಲಯ',
    };

    const expectedAdminTitle: Record<string, string> = {
      en: 'Administrator Hub',
      hi: 'प्रशासक केंद्र',
      mr: 'प्रशासक केंद्र',
      bn: 'প্রশাসক কেন্দ্র',
      ta: 'நிர்வாக மையம்',
      te: 'నిర్వాహక కేంద్రం',
      kn: 'ನಿರ್ವಾಹಕ ಕೇಂದ್ರ',
    };

    for (const lang of ALL_7_CODES) {
      fireEvent.change(switcher, { target: { value: lang } });
      expect(screen.getByText(expectedPatientTitle[lang])).toBeInTheDocument();
      expect(screen.getByText(expectedAdminTitle[lang])).toBeInTheDocument();
    }
  });

  it('translates Notes, Calendar, Memory Graph, Timeline, and Portal headers cleanly into Hindi & Marathi without English leaks', () => {
    render(
      <ProvidersWrapper>
        <LangController lang="hi" />
        <LangController lang="mr" />
        <NotesSanctuaryModal isOpen={true} onClose={vi.fn()} />
        <CalendarSanctuaryModal isOpen={true} onClose={vi.fn()} />
        <PersonalMemoryGraphEditor patientId="demo-patient-001" isCaregiver={true} />
        <LivingMemoryTimeline patientId="demo-patient-001" isCaregiver={true} />
      </ProvidersWrapper>
    );

    fireEvent.click(screen.getByTestId('set-lang-hi'));
    expect(screen.getAllByText(/नया नोट/).length).toBeGreaterThan(0);
    expect(screen.getByText('सभी स्मृतियाँ', { selector: '[role="tab"]' })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('set-lang-mr'));
    expect(screen.getAllByText(/नवीन नोंद/).length).toBeGreaterThan(0);
    expect(screen.getByText('सर्व टप्पे')).toBeInTheDocument();
  });

  it('translates Admin, Caregiver, Doctor, and AshaDemo portals without losing sandbox state', () => {
    localStorage.setItem('saksham_auth_user', JSON.stringify({
      uid: 'demo-admin-001',
      email: 'admin@saksham.care',
      displayName: 'System Security Administrator',
      role: 'admin',
      status: 'verified',
    }));

    render(
      <ProvidersWrapper>
        <LangController lang="hi" />
        <AdminDashboard />
        <CaregiverDashboard />
        <DoctorDashboard />
        <AshaDemoPage />
      </ProvidersWrapper>
    );

    fireEvent.click(screen.getByTestId('set-lang-hi'));
    expect(screen.getByText('पंजीकृत खाते और सत्यापित भूमिकाएँ')).toBeInTheDocument();
    expect(screen.getByText('लाइव डेमो')).toBeInTheDocument();
  });

  it('verifies SpeechService BCP-47 mapping, voice matching, and 7-language calm error fallbacks', () => {
    expect(ALL_LANGUAGES.map((l) => l.code)).toEqual(
      expect.arrayContaining(['en', 'hi', 'mr', 'bn', 'ta', 'te', 'kn'])
    );
    expect(SpeechService.getBCP47('hi_IN')).toBe('hi-IN');
    expect(SpeechService.getBCP47('non_existent')).toBe('en-IN');
    expect(SpeechService.getBCP47('kn')).toBe('kn-IN');
    expect(SpeechService.getBCP47('ta')).toBe('ta-IN');

    for (const lang of ALL_7_CODES) {
      const msg = SpeechService.getCalmVoiceErrorMessage('not-allowed', lang);
      expect(msg.length).toBeGreaterThan(10);
      if (lang !== 'en') {
        expect(msg).not.toMatch(/^Microphone access is paused/i);
      }
    }
  });
});
