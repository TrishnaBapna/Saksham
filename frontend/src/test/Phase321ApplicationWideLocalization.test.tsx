/**
 * SAKSHAM NEURO-CARE — PHASE 3.21
 * Automated Test Suite: Application-Wide Localization Audit, Translation Completion & Language Switching Integrity
 * Target Event: AIU Anveshan National Student Research Convention — 2 December 2026
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '../context/LanguageContext.js';
import { AuthProvider } from '../context/AuthContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { getTranslatedRelationship } from '../features/lovedOnes/utils/relationshipTranslation.js';
import { FamilyMemberCard } from '../features/lovedOnes/components/FamilyMemberCard.js';
import { LovedOnes } from '../pages/patient/LovedOnes.js';
import { AssistedFamilyRecallQuiz } from '../features/lovedOnes/components/AssistedFamilyRecallQuiz.js';
import { RoutineChecklist } from '../features/routines/components/RoutineChecklist.js';
import { TopBar } from '../components/layout/TopBar.js';
import { PatientProfile } from '../pages/patient/PatientProfile.js';
import { PatientCognitiveJournal } from '../features/clinical/components/PatientCognitiveJournal.js';
import { AssistedRecallEngine } from '../features/routines/components/AssistedRecallEngine.js';
import { DEFAULT_PATIENT_ROUTINES } from '../features/routines/services/routineService.js';
import { DEFAULT_LOVED_ONES } from '../features/lovedOnes/services/lovedOnesService.js';
import { DEMO_USERS } from '../features/auth/services/roleService.js';
import { RoutineItem } from '../types/index.js';

// Dictionaries
import { enTranslations } from '../i18n/locales/en.js';
import { hiTranslations } from '../i18n/locales/hi.js';
import { mrTranslations } from '../i18n/locales/mr.js';
import { taTranslations } from '../i18n/locales/ta.js';
import { teTranslations } from '../i18n/locales/te.js';
import { knTranslations } from '../i18n/locales/kn.js';
import { bnTranslations } from '../i18n/locales/bn.js';

const allLanguages = {
  en: enTranslations,
  hi: hiTranslations,
  mr: mrTranslations,
  ta: taTranslations,
  te: teTranslations,
  kn: knTranslations,
  bn: bnTranslations,
};

const enDict = enTranslations;
const hiDict = hiTranslations;
const mrDict = mrTranslations;
const taDict = taTranslations;
const teDict = teTranslations;
const knDict = knTranslations;
const bnDict = bnTranslations;

const mockRoutine: RoutineItem = {
  id: 'routine-live-01',
  title: 'Morning Cardamom Tea',
  scheduledTime: '08:30 AM',
  category: 'hydration',
  isCompleted: false,
  status: 'pending',
  streakCount: 4,
  description: 'Drink warm water and enjoy cardamom tea on the sunny verandah',
  steps: ['1. Pour water into kettle', '2. Heat and steep tea', '3. Sip calmly'],
  enableAssistedRecall: false,
};

// Test wrapper with active language switcher
const LanguageSwitcherTestHarness: React.FC<{
  initialLang?: 'en' | 'hi' | 'mr' | 'ta' | 'te' | 'kn' | 'bn';
  children: React.ReactNode;
}> = ({ initialLang = 'en', children }) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('saksham_lang_guest', initialLang);
    window.localStorage.setItem('saksham_lang_user_demo-patient-001', initialLang);
  }
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <LanguageInitializer targetLang={initialLang} />
          <AccessibilityProvider>
            <CharacterProvider>
              <LanguageControl />
              {children}
            </CharacterProvider>
          </AccessibilityProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

const LanguageInitializer: React.FC<{ targetLang?: string }> = ({ targetLang }) => {
  const { setLanguage } = useLanguage();
  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    if (!initializedRef.current && targetLang) {
      initializedRef.current = true;
      setLanguage(targetLang as any);
    }
  }, [targetLang, setLanguage]);
  return null;
};

const LanguageControl: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  return (
    <div data-testid="language-controller">
      <span data-testid="current-lang">{language}</span>
      <button onClick={() => setLanguage('hi')}>Switch to Hindi</button>
      <button onClick={() => setLanguage('mr')}>Switch to Marathi</button>
      <button onClick={() => setLanguage('ta')}>Switch to Tamil</button>
      <button onClick={() => setLanguage('en')}>Switch to English</button>
    </div>
  );
};

describe('Phase 3.21: Application-Wide Localization & Language Switching Integrity Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // GROUP 1: MULTILINGUAL KEY PARITY ACROSS ALL 7 OFFICIAL INDIC LANGUAGES
  // =========================================================================
  describe('Group 1: 100% Dictionary Key Parity Across 7 Indic Languages', () => {
    it('1. Verifies exact key count parity with English baseline across all 7 languages', () => {
      const enKeys = Object.keys(enDict);
      const baselineCount = enKeys.length;

      expect(baselineCount).toBeGreaterThanOrEqual(499);

      for (const [code, dict] of Object.entries(allLanguages)) {
        const langKeys = Object.keys(dict);
        expect(langKeys.length, `Key count mismatch for language: ${code}`).toBe(baselineCount);

        // Verify every key in en exists in other language
        for (const key of enKeys) {
          expect(dict[key], `Missing key "${key}" in language "${code}"`).toBeDefined();
          expect(typeof dict[key], `Key "${key}" in "${code}" is not string`).toBe('string');
          expect(dict[key].trim().length, `Key "${key}" in "${code}" is empty`).toBeGreaterThan(0);
        }
      }
    });

    it('2. Verifies all Phase 3.21 family memory and routine keys exist in all 7 languages', () => {
      const criticalKeys = [
        'loved_ones.header_title',
        'loved_ones.header_subtitle',
        'loved_ones.asha_banner_title',
        'loved_ones.asha_banner_badge',
        'loved_ones.asha_banner_welcome',
        'loved_ones.explore_photos',
        'loved_ones.gentle_memory_clue',
        'loved_ones.hear_voice_memories',
        'loved_ones.quiz_badge',
        'loved_ones.quiz_desc',
        'loved_ones.quiz_start',
        'loved_ones.quiz_focus',
        'loved_ones.vault_title',
        'loved_ones.vault_desc',
        'loved_ones.empty_album_title',
        'loved_ones.empty_album_desc',
        'loved_ones.add_first_loved_one',
        'loved_ones.clear_search',
        'loved_ones.stats_stored',
        'loved_ones.also_known_as',
        'loved_ones.gentle_cues',
        'loved_ones.view_profile',
        'loved_ones.call_member',
        'loved_ones.whatsapp_member',
        'loved_ones.relationship_daughter_caregiver',
        'loved_ones.relationship_grandson_age',
        'loved_ones.relationship_son_brother',
        'loved_ones.relationship_lifelong_friend',
        'loved_ones.quiz_header_title',
        'loved_ones.quiz_header_badge',
        'loved_ones.quiz_counter',
        'loved_ones.quiz_question',
        'loved_ones.quiz_anchor_label',
        'loved_ones.quiz_answer_reveal',
        'loved_ones.quiz_reveal_hint',
        'loved_ones.quiz_reveal_answer',
        'loved_ones.quiz_hide_answer',
        'loved_ones.quiz_listen_clue',
        'loved_ones.quiz_voice_memory',
        'loved_ones.quiz_playing_voice',
        'loved_ones.quiz_view_full_profile',
        'loved_ones.quiz_correct_feedback',
        'loved_ones.quiz_incorrect_feedback',
        'loved_ones.quiz_options_prompt',
        'routines.direct_schedule_title',
        'routines.direct_schedule_subtitle',
        'routines.read_next_task',
        'routines.add_activity',
        'routines.add_first_routine',
        'routines.action_runner',
        'routines.action_stuck',
        'routines.action_done',
        'routines.action_start_15m',
        'routines.action_snooze_5m',
        'routines.action_not_done',
        'routines.badge_live_time',
        'routines.runner_mode_display',
        'routines.runner_mode_single',
        'routines.runner_mode_checklist',
        'routines.runner_repeat_instruction',
        'routines.runner_give_hint',
        'routines.runner_asha_guidance',
        'routines.runner_complete_task',
        'routines.runner_stuck_question',
      ];

      for (const [code, dict] of Object.entries(allLanguages)) {
        for (const key of criticalKeys) {
          expect(dict[key], `Missing critical key "${key}" in ${code}`).toBeTruthy();
        }
      }
    });

    it('3. Verifies Indic translations are culturally appropriate and do not contain raw English fallback strings', () => {
      // In Hindi and Marathi, header_title must contain Indic script, not English
      expect(hiDict['loved_ones.header_title']).toContain('पारिवारिक');
      expect(mrDict['loved_ones.header_title']).toContain('कौटुंबिक');
      expect(taDict['loved_ones.header_title']).toContain('குடும்ப');
      expect(teDict['loved_ones.header_title']).toContain('కుటుంబ');
      expect(knDict['loved_ones.header_title']).toContain('ಕೌಟುಂಬಿಕ');
      expect(bnDict['loved_ones.header_title']).toContain('পারিবারিক');

      // Check daughter caregiver translation
      expect(hiDict['loved_ones.relationship_daughter_caregiver']).toBe('बेटी और मुख्य देखभालकर्ता');
      expect(mrDict['loved_ones.relationship_daughter_caregiver']).toBe('मुलगी आणि मुख्य काळजीवाहक');
      expect(taDict['loved_ones.relationship_daughter_caregiver']).toBe('மகள் மற்றும் முதன்மை பராமரிப்பாளர்');
      expect(teDict['loved_ones.relationship_daughter_caregiver']).toBe('కుమార్తె మరియు ప్రాథమిక సంరక్షకురాలు');
      expect(knDict['loved_ones.relationship_daughter_caregiver']).toBe('ಮಗಳು ಮತ್ತು ಪ್ರಾಥಮಿಕ ಆರೈಕೆದಾರರು');
      expect(bnDict['loved_ones.relationship_daughter_caregiver']).toBe('মেয়ে ও প্রাথমিক পরিচর্যাকারী');
    });
  });

  // =========================================================================
  // GROUP 2: CATEGORY C DATA PRESERVATION & RELATIONSHIP TRANSLATOR
  // =========================================================================
  describe('Group 2: Category C Data Preservation vs Relationship Localization', () => {
    it('4. getTranslatedRelationship correctly translates compound roles in Hindi', () => {
      const mockT = (k: string) => hiDict[k] || k;

      expect(getTranslatedRelationship('Daughter & Primary Caregiver', mockT)).toBe(
        'बेटी और मुख्य देखभालकर्ता'
      );
      expect(getTranslatedRelationship('Grandson (Age 9)', mockT)).toBe('पोता (उम्र ९)');
      expect(getTranslatedRelationship('Son (Elder Brother to Ananya)', mockT)).toBe(
        'बेटा (अनन्या का बड़ा भाई)'
      );
      expect(getTranslatedRelationship('Lifelong Best Friend', mockT)).toBe(
        'आजीवन सबसे अच्छी सहेली'
      );
    });

    it('5. getTranslatedRelationship correctly translates simple standard roles', () => {
      const mockT = (k: string) => hiDict[k] || k;

      expect(getTranslatedRelationship('Daughter', mockT)).toBe('बेटी');
      expect(getTranslatedRelationship('Son', mockT)).toBe('बेटा');
      expect(getTranslatedRelationship('Husband', mockT)).toBe('पति');
      expect(getTranslatedRelationship('Wife', mockT)).toBe('पत्नी');
      expect(getTranslatedRelationship('Grandson', mockT)).toBe('पोता / नाती');
      expect(getTranslatedRelationship('Sister', mockT)).toBe('बहन');
      expect(getTranslatedRelationship('Brother', mockT)).toBe('भाई');
      expect(getTranslatedRelationship('Friend', mockT)).toBe('मित्र');
      expect(getTranslatedRelationship('Caregiver', mockT)).toBe('देखभालकर्ता');
    });

    it('6. getTranslatedRelationship preserves custom Category C user-entered relationship verbatim', () => {
      const mockT = (k: string) => hiDict[k] || k;

      const customRole = 'Retired Principal from Lucknow Model School';
      expect(getTranslatedRelationship(customRole, mockT)).toBe(customRole);

      const customUncle = 'Maternal Uncle (Mama ji)';
      expect(getTranslatedRelationship(customUncle, mockT)).toBe(customUncle);
    });

    it('7. FamilyMemberCard preserves personal names verbatim while localizing relationship and UI actions in Hindi', () => {
      const ananya = DEFAULT_LOVED_ONES[0]; // Ananya Sharma

      render(
        <LanguageSwitcherTestHarness initialLang="hi">
          <FamilyMemberCard
            member={ananya}
            isPlayingVoice={false}
            onSelect={() => {}}
            onPlayVoice={() => {}}
            onOpenCues={() => {}}
          />
        </LanguageSwitcherTestHarness>
      );

      // Category C personal data preserved verbatim
      expect(screen.getByText('Ananya Sharma')).toBeInTheDocument();
      expect(screen.getByText(/Anu/)).toBeInTheDocument();

      // Category A / Relationship localized in Hindi
      expect(screen.getByText('बेटी और मुख्य देखभालकर्ता')).toBeInTheDocument();
      expect(screen.getByText('प्यार से पुकारते हैं "Anu"')).toBeInTheDocument();
      expect(screen.getByText('सहज संकेत')).toBeInTheDocument();
      expect(screen.getByText('प्रोफ़ाइल देखें')).toBeInTheDocument();
      expect(screen.getByText('कॉल करें')).toBeInTheDocument();

      // Zero English leakage for action buttons
      expect(screen.queryByText('Gentle Cues')).not.toBeInTheDocument();
      expect(screen.queryByText('View Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Daughter & Primary Caregiver')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // GROUP 3: DYNAMIC LANGUAGE SWITCHING WITHOUT REFRESH
  // =========================================================================
  describe('Group 3: Immediate Dynamic Language Switching Without Browser Refresh', () => {
    it('8. FamilyMemberCard updates immediately from English to Hindi without reload upon language change', async () => {
      const ananya = DEFAULT_LOVED_ONES[0];

      render(
        <LanguageSwitcherTestHarness initialLang="en">
          <FamilyMemberCard
            member={ananya}
            isPlayingVoice={false}
            onSelect={() => {}}
            onPlayVoice={() => {}}
            onOpenCues={() => {}}
          />
        </LanguageSwitcherTestHarness>
      );

      // Initially in English
      expect(screen.getByText('Daughter & Primary Caregiver')).toBeInTheDocument();
      expect(screen.getByText('Gentle Cues')).toBeInTheDocument();
      expect(screen.getByText('View Profile')).toBeInTheDocument();
      expect(screen.getByText(/Also known as/)).toBeInTheDocument();

      // Switch to Hindi via test controller
      fireEvent.click(screen.getByText('Switch to Hindi'));

      // Immediately updates to Hindi without reload
      await waitFor(() => {
        expect(screen.getByText('बेटी और मुख्य देखभालकर्ता')).toBeInTheDocument();
        expect(screen.getByText('सहज संकेत')).toBeInTheDocument();
        expect(screen.getByText('प्रोफ़ाइल देखें')).toBeInTheDocument();
        expect(screen.getByText(/प्यार से पुकारते हैं/)).toBeInTheDocument();
      });

      // English labels are gone
      expect(screen.queryByText('Gentle Cues')).not.toBeInTheDocument();
      expect(screen.queryByText('View Profile')).not.toBeInTheDocument();
    });

    it('9. RoutineChecklist renders in Hindi without English leakage for buttons and badges', () => {
      render(
        <LanguageSwitcherTestHarness initialLang="hi">
          <RoutineChecklist
            routines={[mockRoutine]}
            onToggleComplete={() => {}}
            onSnooze={() => {}}
            onLaunchTaskRunner={() => {}}
            onLaunchAssistedRecall={() => {}}
            onOpenAddModal={() => {}}
            language="hi"
          />
        </LanguageSwitcherTestHarness>
      );

      // Header in Hindi
      expect(screen.getByText('दैनिक दिनचर्या सूची')).toBeInTheDocument();
      expect(screen.getByText('पूरा करें, कुछ देर टालें, या बोलकर सुनें।')).toBeInTheDocument();
      expect(screen.getByText('अगला कार्य सुनें')).toBeInTheDocument();
      expect(screen.getByText('+ कार्य जोड़ें')).toBeInTheDocument();

      // Action buttons in Hindi
      expect(screen.getByText('१५ मिनट शुरू')).toBeInTheDocument();
      expect(screen.getByText('+५ मिनट')).toBeInTheDocument();
      expect(screen.getByText('अभी नहीं')).toBeInTheDocument();
      expect(screen.getByText('बदलें')).toBeInTheDocument();

      // Badges in Hindi
      expect(screen.getByText(/दिन का क्रम/)).toBeInTheDocument();

      // Zero English leakage for these UI controls
      expect(screen.queryByText('Direct Routine Schedule')).not.toBeInTheDocument();
      expect(screen.queryByText('Read Next Task')).not.toBeInTheDocument();
      expect(screen.queryByText('+ Add Activity')).not.toBeInTheDocument();
      expect(screen.queryByText('Start 15m')).not.toBeInTheDocument();
      expect(screen.queryByText('Not Done')).not.toBeInTheDocument();
    });

    it('10. AssistedFamilyRecallQuiz renders in Hindi with localized prompts and zero English leakage', () => {
      render(
        <LanguageSwitcherTestHarness initialLang="hi">
          <AssistedFamilyRecallQuiz
            lovedOnes={DEFAULT_LOVED_ONES}
            onClose={() => {}}
            onOpenProfile={() => {}}
          />
        </LanguageSwitcherTestHarness>
      );

      // Header in Hindi
      expect(screen.getByText('पारिवारिक स्मृति स्मरण')).toBeInTheDocument();
      expect(screen.getByText('सहज और समय सीमा रहित')).toBeInTheDocument();
      expect(screen.getByText(/प्रिय मुस्कुराते चेहरों से जुड़ें/)).toBeInTheDocument();

      // Navigation buttons in Hindi
      expect(screen.getByText('अगला चेहरा')).toBeInTheDocument();

      // Question in Hindi
      expect(screen.getByText('"क्या आपको याद है यह कौन हैं?"')).toBeInTheDocument();
      expect(screen.getByText('स्मृति संबल संकेत:')).toBeInTheDocument();

      // Actions in Hindi
      expect(screen.getByText('💡 संकेत देखें')).toBeInTheDocument();
      expect(screen.getByText('उत्तर देखें')).toBeInTheDocument();
      expect(screen.getByText('संकेत सुनें')).toBeInTheDocument();
      expect(screen.getByText('पूरी प्रोफ़ाइल देखें')).toBeInTheDocument();
      expect(screen.getByText('यह प्यारी याद किसकी है?')).toBeInTheDocument();

      // Zero English leakage
      expect(screen.queryByText('Family Memory Recall')).not.toBeInTheDocument();
      expect(screen.queryByText('Gentle & Non-Timed')).not.toBeInTheDocument();
      expect(screen.queryByText('Next Person')).not.toBeInTheDocument();
      expect(screen.queryByText('"Do you remember who this is?"')).not.toBeInTheDocument();
      expect(screen.queryByText('Memory Anchor Clue:')).not.toBeInTheDocument();
      expect(screen.queryByText('Reveal Answer')).not.toBeInTheDocument();
      expect(screen.queryByText('View Full Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Who brings you this warm memory?')).not.toBeInTheDocument();
    });

    it('11. LovedOnes home page renders in Hindi with localized headers and Asha prompts', () => {
      render(
        <LanguageSwitcherTestHarness initialLang="hi">
          <LovedOnes />
        </LanguageSwitcherTestHarness>
      );

      // Header in Hindi
      expect(screen.getByText('परिचित चेहरे और पारिवारिक स्मृति संबल')).toBeInTheDocument();
      expect(
        screen.getByText('दैनिक जुड़ाव और अपनेपन के लिए परिचित चेहरे, व्यक्तिगत यादें और सहज स्मरण गतिविधियाँ')
      ).toBeInTheDocument();

      // Asha banner in Hindi
      expect(screen.getByText('आशा एआई साथी')).toBeInTheDocument();
      expect(screen.getByText(/तस्वीरें देखें/)).toBeInTheDocument();
      expect(screen.getAllByText(/सहज स्मृति संकेत/)[0]).toBeInTheDocument();
      expect(screen.getByText(/आवाज की यादें सुनें/)).toBeInTheDocument();

      // Verified vault note in Hindi
      expect(screen.getByText('सत्यापित पारिवारिक स्मृति संग्रह:')).toBeInTheDocument();

      // Zero English leakage in title
      expect(screen.queryByText('Familiar Faces & Family Memory Anchor')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // GROUP 4: MULTILINGUAL SCRIPT DIRECTION & ACCESSIBILITY ATTRIBUTES
  // =========================================================================
  describe('Group 4: Script Direction, HTML Lang Attribute & Accessibility', () => {
    it('12. Updates document.documentElement.lang to active language on language switch', async () => {
      render(
        <LanguageSwitcherTestHarness initialLang="en">
          <div>Test Content</div>
        </LanguageSwitcherTestHarness>
      );

      expect(document.documentElement.lang).toBe('en');

      fireEvent.click(screen.getByText('Switch to Tamil'));
      await waitFor(() => {
        expect(document.documentElement.lang).toBe('ta');
      });

      fireEvent.click(screen.getByText('Switch to Marathi'));
      await waitFor(() => {
        expect(document.documentElement.lang).toBe('mr');
      });
    });
  });

  // =========================================================================
  // GROUP 5: SCREENSHOT-DRIVEN REGRESSION COVERAGE (TOPBAR, PROFILE, JOURNAL, RECALL, LOVED ONES)
  // =========================================================================
  describe('Group 5: Screenshot-Driven Hindi Localization & Category C Preservation', () => {
    it('13. TopBar localizes tagline, Asha Demo, and Role pill dynamically between Hindi and Marathi', async () => {
      localStorage.setItem('saksham_auth_user', JSON.stringify(DEMO_USERS['patient@saksham.care']));

      render(
        <LanguageSwitcherTestHarness initialLang="hi">
          <TopBar />
        </LanguageSwitcherTestHarness>
      );

      expect(screen.getByText('आशा डेमो')).toBeInTheDocument();
      expect(screen.getByText(/भूमिका: मरीज़/)).toBeInTheDocument();
      expect(screen.queryByText('AI Neuro-Care Companion Ecosystem')).not.toBeInTheDocument();
      expect(screen.queryByText('Asha Demo')).not.toBeInTheDocument();
      expect(screen.queryByText('Role: Patient')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Switch to Marathi'));
      await waitFor(() => {
        expect(screen.getByText(/भूमिका: रुग्ण/)).toBeInTheDocument();
      });
    });

    it('14. PatientProfile localizes Clinical Care Pathway, Reading Mode, Accessibility, and Emergency Contact in Hindi', () => {
      localStorage.setItem('saksham_auth_user', JSON.stringify(DEMO_USERS['patient@saksham.care']));

      render(
        <LanguageSwitcherTestHarness initialLang="hi">
          <PatientProfile />
        </LanguageSwitcherTestHarness>
      );

      expect(screen.getByText('मरीज़ खाता • सत्यापित')).toBeInTheDocument();
      expect(screen.getByText('चिकित्सीय देखभाल पथ')).toBeInTheDocument();
      expect(screen.getByText('चिकित्सीय मूल्यांकन लंबित')).toBeInTheDocument();
      expect(screen.getByText('भाषा प्राथमिकताएं और बहुभाषी आवाज़ सेटिंग्स')).toBeInTheDocument();
      expect(screen.getByText('पाठ और बोली जाने वाली आवाज़')).toBeInTheDocument();
      expect(screen.getByText('आवाज़ और पाठ दोनों')).toBeInTheDocument();
      expect(screen.getByText('डिफ़ॉल्ट पर लौटें')).toBeInTheDocument();
      expect(screen.getByText('उच्च कंट्रास्ट मोड')).toBeInTheDocument();
      expect(screen.getByText('एक समय में एक कदम (सहज गति)')).toBeInTheDocument();
      expect(screen.getByText('Ananya Sharma (बेटी)')).toBeInTheDocument();
      expect(screen.getByText('कॉल करें')).toBeInTheDocument();
      expect(screen.getByText('स्थान साझाकरण और डेटा गोपनीयता प्रबंधित करें')).toBeInTheDocument();

      expect(screen.queryByText('Patient Account • Verified')).not.toBeInTheDocument();
      expect(screen.queryByText('Clinical Care Pathway')).not.toBeInTheDocument();
      expect(screen.queryByText('Both Audio & Text')).not.toBeInTheDocument();
      expect(screen.queryByText('Restore Defaults')).not.toBeInTheDocument();
      expect(screen.queryByText('High Contrast Mode')).not.toBeInTheDocument();
      expect(screen.queryByText('Ananya Sharma (Daughter)')).not.toBeInTheDocument();
    });

    it('15. PatientCognitiveJournal localizes sync status, experience chips, and empty state in Hindi', () => {
      render(
        <LanguageSwitcherTestHarness initialLang="hi">
          <PatientCognitiveJournal
            patientId="demo-patient-001"
            patientName="Sunita Sharma"
          />
        </LanguageSwitcherTestHarness>
      );

      expect(screen.getByText('आपके दैनिक नोट्स और अनुभव डायरी')).toBeInTheDocument();
      expect(screen.getByText('+ जो कठिन लगा उसे लिखें')).toBeInTheDocument();
      expect(screen.getByText('+ मैं भूल गया/गई कि मैं क्या करने जा रहा/रही था।')).toBeInTheDocument();
      expect(screen.getByText('अभी तक कोई डायरी प्रविष्टि दर्ज नहीं है।')).toBeInTheDocument();

      expect(screen.queryByText('✓ All notes & tasks safely backed up')).not.toBeInTheDocument();
      expect(screen.queryByText('Your Daily Notes & Experience Journal')).not.toBeInTheDocument();
      expect(screen.queryByText('No journal entries recorded yet.')).not.toBeInTheDocument();
    });

    it('16. AssistedRecallEngine localizes headers, chances pill, and seeded routine-01 recall cue in Hindi', () => {
      render(
        <LanguageSwitcherTestHarness initialLang="hi">
          <AssistedRecallEngine
            routines={[DEFAULT_PATIENT_ROUTINES[0]]}
            currentIndex={0}
            onNavigateIndex={vi.fn()}
            onComplete={vi.fn()}
            onLaunchTaskRunner={vi.fn()}
            onRecordAttempt={vi.fn()}
          />
        </LanguageSwitcherTestHarness>
      );

      expect(screen.getByText('कदम-दर-कदम कार्य शुरुआत')).toBeInTheDocument();
      expect(screen.getByText('संवादात्मक गतिविधि संकेत (3-अवसर सहायक स्मरण)')).toBeInTheDocument();
      expect(screen.getByText('प्रश्न सुनें')).toBeInTheDocument();
      expect(screen.getByText('अवसर:')).toBeInTheDocument();
      expect(screen.getByText(/आप सुबह 08:00 AM बजे उठे हैं/)).toBeInTheDocument();
      expect(screen.getByText('केतली में साफ पानी से गुनगुनी हर्बल चाय तैयार करें')).toBeInTheDocument();
      expect(screen.getByText(/स्वास्थ्य/)).toBeInTheDocument();
      expect(screen.getByText('15 मिनट का कार्य शुरू करें')).toBeInTheDocument();

      expect(screen.queryByText('STEP-BY-STEP TASK INITIATION')).not.toBeInTheDocument();
      expect(screen.queryByText('Interactive Activity Cues (3-Chance Assisted Recall)')).not.toBeInTheDocument();
      expect(screen.queryByText(/You woke up at 08:00 AM/)).not.toBeInTheDocument();
      expect(screen.queryByText('Start 15m Task')).not.toBeInTheDocument();
    });

    it('17. FamilyMemberCard localizes seeded demo loved-02 content in Hindi while preserving custom Category C descriptions verbatim', () => {
      const aarav = DEFAULT_LOVED_ONES[1];
      const customAarav = {
        ...aarav,
        description: 'Visited us from Pune last Diwali and brought marigold garlands.',
      };

      const { rerender } = render(
        <LanguageSwitcherTestHarness initialLang="hi">
          <FamilyMemberCard
            member={aarav}
            isPlayingVoice={false}
            onSelect={() => {}}
            onPlayVoice={() => {}}
            onOpenCues={() => {}}
          />
        </LanguageSwitcherTestHarness>
      );

      expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
      expect(screen.getByText(/Chhotu/)).toBeInTheDocument();
      expect(screen.getByText(hiDict['loved_ones.demo_02_desc'])).toBeInTheDocument();
      expect(screen.getByText(new RegExp(hiDict['loved_ones.demo_02_phrase']))).toBeInTheDocument();
      expect(screen.queryByText(/Ananya's son\. Full of cheerful curiosity/)).not.toBeInTheDocument();

      rerender(
        <LanguageSwitcherTestHarness initialLang="hi">
          <FamilyMemberCard
            member={customAarav}
            isPlayingVoice={false}
            onSelect={() => {}}
            onPlayVoice={() => {}}
            onOpenCues={() => {}}
          />
        </LanguageSwitcherTestHarness>
      );

      expect(screen.getByText('Visited us from Pune last Diwali and brought marigold garlands.')).toBeInTheDocument();
    });
  });
});
