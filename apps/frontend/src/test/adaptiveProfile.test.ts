import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Saksham 3.0 — Phase 5: Adaptive Personalised Interface Unit & Integration Tests', () => {
  const rootDir = path.resolve(__dirname, '../../../../');
  const servicePath = path.join(rootDir, 'js/services/adaptive-profile.js');
  const swPath = path.join(rootDir, 'sw.js');
  const stylePath = path.join(rootDir, 'css/style.css');
  const indexPath = path.join(rootDir, 'index.html');

  let adaptiveProfileCode: string;
  let mockWindow: any;
  let mockDocument: any;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    adaptiveProfileCode = fs.readFileSync(servicePath, 'utf8');

    // Create a sandboxed mock environment for executing adaptive-profile.js
    mockDocument = {
      body: {
        attributes: {} as Record<string, string>,
        setAttribute: vi.fn((k: string, v: string) => {
          mockDocument.body.attributes[k] = v;
        }),
        getAttribute: vi.fn((k: string) => mockDocument.body.attributes[k] || null),
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          toggle: vi.fn(),
          contains: vi.fn(),
        },
      },
      getElementById: vi.fn((_id: string) => null),
      querySelectorAll: vi.fn(() => []),
      readyState: 'complete',
      addEventListener: vi.fn(),
    };

    mockWindow = {
      localStorage,
      document: mockDocument,
      state: { uid: 'test_kalyani_1' },
      SakshamPersonalisationSettings: {
        getSettings: () => ({ textSize: 'standard', buttonSize: 'standard', cardDensity: 'standard', animationSpeed: 'normal' }),
        saveSettings: vi.fn(),
        applySettingsToDom: vi.fn(),
      },
      showSakshamToast: vi.fn(),
      dispatchEvent: vi.fn(),
      CustomEvent: class CustomEvent {
        type: string;
        detail: any;
        constructor(type: string, opts: any) {
          this.type = type;
          this.detail = opts?.detail;
        }
      },
    };

    // Execute the code in mockWindow scope
    const runInMock = new Function('window', 'document', adaptiveProfileCode);
    runInMock(mockWindow, mockDocument);
  });

  describe('1. Mode Defaults & Configuration', () => {
    it('defines the three distinct assistance modes: guided, assisted, independent', () => {
      const { MODE_DEFAULTS } = mockWindow.SakshamAdaptiveProfile;
      expect(MODE_DEFAULTS).toBeDefined();
      expect(MODE_DEFAULTS.guided).toBeDefined();
      expect(MODE_DEFAULTS.assisted).toBeDefined();
      expect(MODE_DEFAULTS.independent).toBeDefined();

      // Guided Mode defaults
      expect(MODE_DEFAULTS.guided.textSize).toBe('large');
      expect(MODE_DEFAULTS.guided.buttonSize).toBe('extra_large');
      expect(MODE_DEFAULTS.guided.interfaceDensity).toBe('spacious');
      expect(MODE_DEFAULTS.guided.oneInstructionAtATime).toBe(true);
      expect(MODE_DEFAULTS.guided.stepByStepGuidance).toBe(true);
      expect(MODE_DEFAULTS.guided.restSuggestionsEnabled).toBe(true);
      expect(MODE_DEFAULTS.guided.gamePacingDefault).toBe('calm');

      // Assisted Mode defaults
      expect(MODE_DEFAULTS.assisted.textSize).toBe('standard');
      expect(MODE_DEFAULTS.assisted.buttonSize).toBe('comfort');
      expect(MODE_DEFAULTS.assisted.interfaceDensity).toBe('standard');
      expect(MODE_DEFAULTS.assisted.oneInstructionAtATime).toBe(false);

      // Independent Mode defaults
      expect(MODE_DEFAULTS.independent.textSize).toBe('standard');
      expect(MODE_DEFAULTS.independent.buttonSize).toBe('standard');
      expect(MODE_DEFAULTS.independent.guidanceFrequency).toBe('minimal');
    });

    it('creates initial default profile when no saved profile exists', () => {
      const profile = mockWindow.SakshamAdaptiveProfile.getProfile('user_aarav_99');
      expect(profile).toBeDefined();
      expect(profile.userId).toBe('user_aarav_99');
      expect(profile.assistanceMode).toBe('assisted');
      expect(profile.isCustomized).toBe(false);
      expect(profile.difficulties.memoryRecall).toBe(false);
      expect(profile.difficulties.smallButtons).toBe(false);
    });
  });

  describe('2. Ten Functional Difficulty Mappings & Derived Preferences', () => {
    it('maps self-reported reading difficulties to large text size', () => {
      const derived = mockWindow.SakshamAdaptiveProfile.deriveEffectivePreferences('assisted', {
        readingText: true,
      });
      expect(derived.textSize).toBe('large');
    });

    it('maps tremor / hand movement / small button difficulties to extra large buttons and spacious density', () => {
      const derived = mockWindow.SakshamAdaptiveProfile.deriveEffectivePreferences('assisted', {
        smallButtons: true,
        handMovement: true,
      });
      expect(derived.buttonSize).toBe('extra_large');
      expect(derived.interfaceDensity).toBe('spacious');
      expect(derived.motionSpeed).toBe('low');
    });

    it('maps multi-instruction and overwhelm difficulties to one-instruction-at-a-time focus', () => {
      const derived = mockWindow.SakshamAdaptiveProfile.deriveEffectivePreferences('assisted', {
        multiInstructions: true,
        informationOverwhelm: true,
      });
      expect(derived.oneInstructionAtATime).toBe(true);
      expect(derived.stepByStepGuidance).toBe(true);
      expect(derived.interfaceDensity).toBe('spacious');
    });

    it('maps fatigue difficulties to active rest suggestions and calm pacing', () => {
      const derived = mockWindow.SakshamAdaptiveProfile.deriveEffectivePreferences('guided', {
        fatigueDuringTasks: true,
      });
      expect(derived.restSuggestionsEnabled).toBe(true);
      expect(derived.gamePacingDefault).toBe('calm');
    });

    it('maps hearing difficulty to prominent visual cues and audio guidance disabled', () => {
      const derived = mockWindow.SakshamAdaptiveProfile.deriveEffectivePreferences('assisted', {
        hearingSpoken: true,
        preferVisual: true,
      });
      expect(derived.audioGuidanceEnabled).toBe(false);
      expect(derived.visualCuesProminent).toBe(true);
    });
  });

  describe('3. Account Scoping & UID Isolation', () => {
    it('stores profiles under isolated keys saksham_adaptive_profile_<userId>', () => {
      const kalyaniProfile = {
        assistanceMode: 'guided',
        difficulties: { memoryRecall: true, smallButtons: true },
      };
      const aaravProfile = {
        assistanceMode: 'independent',
        difficulties: { preferIndependent: true },
      };

      mockWindow.SakshamAdaptiveProfile.saveProfile(kalyaniProfile, 'kalyani_uid', 'patient');
      mockWindow.SakshamAdaptiveProfile.saveProfile(aaravProfile, 'aarav_uid', 'caregiver');

      // Verify separate keys in localStorage
      expect(localStorage.getItem('saksham_adaptive_profile_kalyani_uid')).not.toBeNull();
      expect(localStorage.getItem('saksham_adaptive_profile_aarav_uid')).not.toBeNull();

      const k = mockWindow.SakshamAdaptiveProfile.getProfile('kalyani_uid');
      const a = mockWindow.SakshamAdaptiveProfile.getProfile('aarav_uid');

      expect(k.assistanceMode).toBe('guided');
      expect(k.preferences.buttonSize).toBe('extra_large');
      expect(k.configuredBy).toBe('patient');

      expect(a.assistanceMode).toBe('independent');
      expect(a.preferences.buttonSize).toBe('standard');
      expect(a.configuredBy).toBe('caregiver');
    });
  });

  describe('4. DOM Attributes & Dynamic Application', () => {
    it('sets data-assistance-mode, data-one-instruction, and data-rest-suggestions on document.body', () => {
      const profile = {
        assistanceMode: 'guided',
        preferences: {
          oneInstructionAtATime: true,
          stepByStepGuidance: true,
          restSuggestionsEnabled: true,
          visualCuesProminent: true,
          textSize: 'large',
          buttonSize: 'extra_large',
          interfaceDensity: 'spacious',
          motionSpeed: 'low',
        },
      };

      mockWindow.SakshamAdaptiveProfile.applyProfileToDom(profile);

      expect(mockDocument.body.setAttribute).toHaveBeenCalledWith('data-assistance-mode', 'guided');
      expect(mockDocument.body.setAttribute).toHaveBeenCalledWith('data-one-instruction', 'true');
      expect(mockDocument.body.setAttribute).toHaveBeenCalledWith('data-rest-suggestions', 'true');
      expect(mockDocument.body.setAttribute).toHaveBeenCalledWith('data-step-guidance', 'true');
      expect(mockDocument.body.setAttribute).toHaveBeenCalledWith('data-visual-cues', 'true');
    });
  });

  describe('5. Task Pause and Resume Mechanics', () => {
    it('manages task timer pause and resume status without data loss', () => {
      mockWindow.state = {
        taskTimer: {
          activeTaskId: 101,
          status: 'running',
          remainingSeconds: 600,
          totalSeconds: 900,
        },
      };

      mockWindow.SakshamAdaptiveProfile.pauseTask(101);
      expect(mockWindow.state.taskTimer.status).toBe('paused');
      expect(mockWindow.showSakshamToast).toHaveBeenCalledWith(
        expect.stringContaining('Task paused'),
        'info'
      );

      mockWindow.SakshamAdaptiveProfile.resumeTask(101);
      expect(mockWindow.state.taskTimer.status).toBe('running');
      expect(mockWindow.showSakshamToast).toHaveBeenCalledWith(
        expect.stringContaining('Resuming task'),
        'success'
      );
    });
  });

  describe('6. Reversible Learning Recommendations', () => {
    it('dismisses recommendations for 24 hours when user clicks dismiss', () => {
      const uid = 'test_kalyani_1';
      mockWindow.SakshamAdaptiveProfile.dismissAdaptiveRecommendation();
      const dismissedUntil = localStorage.getItem('saksham_adaptive_rec_dismissed_' + uid);
      expect(dismissedUntil).not.toBeNull();
      const expiry = parseInt(dismissedUntil || '0', 10);
      expect(expiry).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
    });
  });

  describe('7. File Integrity & Architecture Invariants', () => {
    it('ensures sw.js precaches js/services/adaptive-profile.js', () => {
      const sw = fs.readFileSync(swPath, 'utf8');
      expect(sw).toContain('./js/services/adaptive-profile.js');
      expect(sw).toContain('./js/services/adaptive-profile.js?v=67');
    });

    it('ensures index.html includes the adaptive assessment modal and trigger badge', () => {
      const index = fs.readFileSync(indexPath, 'utf8');
      expect(index).toContain('id="btnAdaptiveModeBadge"');
      expect(index).toContain('id="modalAdaptiveAssessment"');
      expect(index).toContain('id="cardModeGuided"');
      expect(index).toContain('id="cardModeAssisted"');
      expect(index).toContain('id="cardModeIndependent"');
      expect(index).toContain('id="adaptiveDiff_readingText"');
      expect(index).toContain('id="adaptiveDiff_smallButtons"');
      expect(index).toContain('id="adaptiveRecommendationBanner"');
      expect(index).toContain('js/services/adaptive-profile.js');
    });

    it('ensures style.css preserves all six core tabs without hiding them in simple mode', () => {
      const style = fs.readFileSync(stylePath, 'utf8');
      // Must NOT contain display: none !important for non-routine tabs
      expect(style).not.toMatch(/body\[data-nav-mode="simple"\]\s+#nav-patient\s+\.nav-tab-btn:not\(\[data-tab="routine"\]\):not\(\[data-tab="games"\]\):not\(\[data-tab="vault"\]\)\s*\{\s*display:\s*none\s*!important;\s*\}/);
      // Must contain Phase 5 adaptive assistance styles
      expect(style).toContain('body[data-assistance-mode="guided"]');
      expect(style).toContain('body[data-one-instruction="true"]');
      expect(style).toContain('.task-pause-banner');
    });
  });
});
