/* ======================================================================= */
/* SAKSHAM 3.0 — ADAPTIVE ASSISTANCE PROFILE & PATIENT-CENTRED ENGINE       */
/* Phase 5: Individual Functional Adaptations, 3 Modes & Feedback Learning */
/* ======================================================================= */

(function (window, document) {
  'use strict';

  var STORAGE_PREFIX = 'saksham_adaptive_profile_';

  function getActiveUserId() {
    try {
      var u = JSON.parse(localStorage.getItem('saksham_active_user') || '{}');
      var uid = u.firebaseUid || u.id || u.uid || u.username;
      if (uid && String(uid).trim()) return String(uid).trim();
      if (window.state && window.state.uid) return String(window.state.uid).trim();
      if (window.dbService && typeof window.dbService.getCurrentUserId === 'function') {
        var dbUid = window.dbService.getCurrentUserId();
        if (dbUid && String(dbUid).trim()) return String(dbUid).trim();
      }
    } catch (e) {}
    return 'default';
  }

  function getStorageKey(userId) {
    return STORAGE_PREFIX + (userId || getActiveUserId());
  }

  // Pre-configured Assistance Modes (Assistance Levels, NOT clinical severity ratings)
  var MODE_DEFAULTS = {
    guided: {
      mode: 'guided',
      label: 'Guided Interface',
      tagline: 'Step-by-step assistance, larger controls, and reassuring cues',
      textSize: 'large',
      buttonSize: 'extra_large',
      interfaceDensity: 'spacious',
      motionSpeed: 'low',
      stepByStepGuidance: true,
      oneInstructionAtATime: true,
      guidanceFrequency: 'frequent',
      restSuggestionsEnabled: true,
      gamePacingDefault: 'calm',
      visualCuesProminent: true,
      audioGuidanceEnabled: true
    },
    assisted: {
      mode: 'assisted',
      label: 'Assisted Interface',
      tagline: 'Standard navigation with helpful tips and contextual reminders',
      textSize: 'standard',
      buttonSize: 'comfort',
      interfaceDensity: 'standard',
      motionSpeed: 'normal',
      stepByStepGuidance: false,
      oneInstructionAtATime: false,
      guidanceFrequency: 'balanced',
      restSuggestionsEnabled: true,
      gamePacingDefault: 'balanced',
      visualCuesProminent: false,
      audioGuidanceEnabled: false
    },
    independent: {
      mode: 'independent',
      label: 'Independent Interface',
      tagline: 'Comfortable independent use with assistance available on request',
      textSize: 'standard',
      buttonSize: 'standard',
      interfaceDensity: 'standard',
      motionSpeed: 'normal',
      stepByStepGuidance: false,
      oneInstructionAtATime: false,
      guidanceFrequency: 'minimal',
      restSuggestionsEnabled: false,
      gamePacingDefault: 'balanced',
      visualCuesProminent: false,
      audioGuidanceEnabled: false
    }
  };

  var DEFAULT_DIFFICULTIES = {
    memoryRecall: false,
    smallButtons: false,
    handMovement: false,
    readingText: false,
    multiInstructions: false,
    informationOverwhelm: false,
    hearingSpoken: false,
    preferVisual: false,
    fatigueDuringTasks: false,
    preferIndependent: false
  };

  function createInitialProfile(userId, customMode) {
    var modeKey = customMode || 'assisted';
    var baseDefaults = MODE_DEFAULTS[modeKey] || MODE_DEFAULTS.assisted;

    return {
      userId: userId || getActiveUserId(),
      assistanceMode: modeKey,
      difficulties: Object.assign({}, DEFAULT_DIFFICULTIES),
      preferences: Object.assign({}, baseDefaults),
      configuredBy: 'default',
      isCustomized: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function getProfile(userId) {
    var uid = userId || getActiveUserId();
    try {
      var raw = localStorage.getItem(getStorageKey(uid));
      if (raw) {
        var parsed = JSON.parse(raw);
        var baseMode = parsed.assistanceMode || 'assisted';
        var modeDef = MODE_DEFAULTS[baseMode] || MODE_DEFAULTS.assisted;
        return {
          userId: uid,
          assistanceMode: baseMode,
          difficulties: Object.assign({}, DEFAULT_DIFFICULTIES, parsed.difficulties || {}),
          preferences: Object.assign({}, modeDef, parsed.preferences || {}),
          configuredBy: parsed.configuredBy || 'default',
          isCustomized: !!parsed.isCustomized,
          createdAt: parsed.createdAt || new Date().toISOString(),
          updatedAt: parsed.updatedAt || new Date().toISOString()
        };
      }
    } catch (e) {
      console.warn('[Adaptive Profile] Error reading profile for ' + uid + ':', e);
    }
    return createInitialProfile(uid);
  }

  function deriveEffectivePreferences(mode, difficulties, customPrefs) {
    var base = Object.assign({}, MODE_DEFAULTS[mode] || MODE_DEFAULTS.assisted);
    var diffs = difficulties || {};
    var prefs = Object.assign({}, base, customPrefs || {});

    // Adapt to specific self-reported difficulties
    if (diffs.readingText) {
      if (prefs.textSize === 'standard') prefs.textSize = 'large';
    }
    if (diffs.smallButtons || diffs.handMovement) {
      prefs.buttonSize = 'extra_large';
      prefs.interfaceDensity = 'spacious';
      if (prefs.motionSpeed === 'normal') prefs.motionSpeed = 'low';
    }
    if (diffs.multiInstructions || diffs.informationOverwhelm) {
      prefs.oneInstructionAtATime = true;
      prefs.stepByStepGuidance = true;
      prefs.interfaceDensity = 'spacious';
    }
    if (diffs.memoryRecall) {
      prefs.visualCuesProminent = true;
      if (prefs.guidanceFrequency === 'minimal') prefs.guidanceFrequency = 'balanced';
    }
    if (diffs.preferVisual) {
      prefs.visualCuesProminent = true;
    }
    if (diffs.hearingSpoken) {
      prefs.audioGuidanceEnabled = false;
      prefs.visualCuesProminent = true;
    }
    if (diffs.fatigueDuringTasks) {
      prefs.restSuggestionsEnabled = true;
      if (mode === 'guided') prefs.gamePacingDefault = 'calm';
    }
    if (diffs.preferIndependent) {
      prefs.guidanceFrequency = 'minimal';
    }

    return prefs;
  }

  function saveProfile(profileData, userId, authorRole) {
    var uid = userId || getActiveUserId();
    var existing = getProfile(uid);
    var role = authorRole || 'patient';

    var mode = profileData.assistanceMode || existing.assistanceMode || 'assisted';
    var diffs = Object.assign({}, existing.difficulties, profileData.difficulties || {});
    var effectivePrefs = deriveEffectivePreferences(mode, diffs, profileData.preferences);

    var updated = {
      userId: uid,
      assistanceMode: mode,
      difficulties: diffs,
      preferences: effectivePrefs,
      configuredBy: role === 'caregiver' ? 'caregiver' : 'patient',
      isCustomized: true,
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(getStorageKey(uid), JSON.stringify(updated));
    } catch (e) {
      console.warn('[Adaptive Profile] Failed to save profile for ' + uid + ':', e);
    }

    // Apply to DOM if updating currently active user
    if (uid === getActiveUserId() || uid === 'default') {
      applyProfileToDom(updated);
    }

    // Synchronize to Firestore and offline sync queue
    syncProfileToCloud(updated);

    // Notify listeners
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('saksham:adaptive_profile_updated', { detail: updated }));
    }

    return updated;
  }

  function applyProfileToDom(profile) {
    if (!profile || !document.body) return;
    var prefs = profile.preferences || {};
    var mode = profile.assistanceMode || 'assisted';

    // 1. Root Assistance Mode Attribute
    document.body.setAttribute('data-assistance-mode', mode);

    // 2. Behavioral Instruction Attributes
    document.body.setAttribute('data-one-instruction', prefs.oneInstructionAtATime ? 'true' : 'false');
    document.body.setAttribute('data-step-guidance', prefs.stepByStepGuidance ? 'true' : 'false');
    document.body.setAttribute('data-rest-suggestions', prefs.restSuggestionsEnabled ? 'true' : 'false');
    document.body.setAttribute('data-visual-cues', prefs.visualCuesProminent ? 'true' : 'false');

    // 3. Connect to Personalisation Settings system for physical tokens
    if (window.SakshamPersonalisationSettings && typeof window.SakshamPersonalisationSettings.getSettings === 'function') {
      var currentSettings = window.SakshamPersonalisationSettings.getSettings();
      var needsSettingsUpdate = false;

      if (prefs.textSize && currentSettings.textSize !== prefs.textSize) {
        currentSettings.textSize = prefs.textSize;
        needsSettingsUpdate = true;
      }
      if (prefs.buttonSize && currentSettings.buttonSize !== prefs.buttonSize) {
        currentSettings.buttonSize = prefs.buttonSize;
        needsSettingsUpdate = true;
      }
      if (prefs.interfaceDensity && currentSettings.cardDensity !== prefs.interfaceDensity) {
        currentSettings.cardDensity = prefs.interfaceDensity;
        needsSettingsUpdate = true;
      }
      if (prefs.motionSpeed) {
        var mappedMotion = prefs.motionSpeed === 'off' ? 'off' : (prefs.motionSpeed === 'low' ? 'low' : 'normal');
        if (currentSettings.animationSpeed !== mappedMotion) {
          currentSettings.animationSpeed = mappedMotion;
          needsSettingsUpdate = true;
        }
      }

      if (needsSettingsUpdate) {
        window.SakshamPersonalisationSettings.saveSettings(currentSettings, false);
      } else if (typeof window.SakshamPersonalisationSettings.applySettingsToDom === 'function') {
        window.SakshamPersonalisationSettings.applySettingsToDom(currentSettings);
      }
    }

    // 4. Update Header Mode Indicator Badge
    updateAdaptiveBadgeUI(profile);

    // 5. Connect to Mind Clinic Game Pacing if not explicitly altered
    if (window.getGamePacing && window.setGamePacing && prefs.gamePacingDefault) {
      var currentPacing = window.getGamePacing();
      var uid = getActiveUserId();
      var userPacingExplicit = localStorage.getItem('saksham_game_pacing_' + uid);
      if (!userPacingExplicit && currentPacing !== prefs.gamePacingDefault) {
        window.setGamePacing(prefs.gamePacingDefault);
      }
    }

    // 6. Update Dashboard Layout Elements for Guided Mode
    applyDashboardGuidedLayout(mode === 'guided');
  }

  function updateAdaptiveBadgeUI(profile) {
    var badge = document.getElementById('btnAdaptiveModeBadge');
    if (!badge) return;

    var mode = profile.assistanceMode || 'assisted';
    var icon = mode === 'guided' ? '🌿' : (mode === 'independent' ? '⭐' : '⚖️');
    var label = mode === 'guided' ? 'Guided Mode' : (mode === 'independent' ? 'Independent' : 'Assisted');

    badge.innerHTML = `<span class="text-xs">${icon}</span> <span class="hidden sm:inline text-xs font-black">${label}</span>`;
    badge.setAttribute('aria-label', `Assistive Mode: ${label}. Tap to adjust personal assistance needs.`);
    badge.setAttribute('title', `Assistive Mode: ${label}`);
  }

  function applyDashboardGuidedLayout(isGuided) {
    var heroSection = document.getElementById('heroNextTaskContainer');
    if (heroSection) {
      if (isGuided) {
        heroSection.classList.add('guided-mode-focus');
      } else {
        heroSection.classList.remove('guided-mode-focus');
      }
    }

    // In guided mode, ensure the Rest Suggestions tray is visible if user is active
    var restTray = document.getElementById('adaptiveRestSuggestionTray');
    if (restTray) {
      if (isGuided && document.body.getAttribute('data-rest-suggestions') === 'true') {
        restTray.classList.remove('hidden');
      } else {
        restTray.classList.add('hidden');
      }
    }
  }

  function syncProfileToCloud(profile) {
    var uid = profile.userId;
    if (!uid || uid === 'default' || uid === 'guest') return;

    // 1. Firestore profile update
    if (window.dbService && window.dbService.profiles && typeof window.dbService.profiles.update === 'function') {
      try {
        window.dbService.profiles.update(uid, {
          adaptiveProfile: profile,
          updatedAt: profile.updatedAt
        });
      } catch (e) {
        console.warn('[Adaptive Profile] Cloud sync note:', e);
      }
    }

    // 2. Offline sync queue
    var syncService = window.offlineSyncService || window.offlineSync;
    if (syncService && typeof syncService.enqueueOperation === 'function') {
      try {
        syncService.enqueueOperation(uid, 'adaptive_profile', 'update', profile, 'adaptive_' + uid);
      } catch (e) {
        console.warn('[Adaptive Profile] Offline queue note:', e);
      }
    }
  }

  // Task Pause and Resume Controller (Section 3.F & 5)
  var taskPauseState = {};

  function pauseTask(taskId) {
    taskPauseState[taskId] = {
      pausedAt: new Date().toISOString(),
      status: 'paused'
    };

    // Pause any active taskTimer in state
    if (window.state && window.state.taskTimer && window.state.taskTimer.activeTaskId === taskId) {
      window.state.taskTimer.status = 'paused';
    }

    if (typeof window.showSakshamToast === 'function') {
      window.showSakshamToast('Task paused. Take your time to rest! ☕', 'info');
    }

    updateTaskPauseUI(taskId, true);
  }

  function resumeTask(taskId) {
    if (taskPauseState[taskId]) {
      taskPauseState[taskId].status = 'resumed';
    }

    if (window.state && window.state.taskTimer && window.state.taskTimer.activeTaskId === taskId) {
      window.state.taskTimer.status = 'running';
    }

    if (typeof window.showSakshamToast === 'function') {
      window.showSakshamToast('Resuming task at your pace! 🌟', 'success');
    }

    updateTaskPauseUI(taskId, false);
  }

  function updateTaskPauseUI(taskId, isPaused) {
    var pauseBtn = document.getElementById(`btnTaskPause_${taskId}`) || document.getElementById('btnRunnerPause');
    var resumeBtn = document.getElementById(`btnTaskResume_${taskId}`) || document.getElementById('btnRunnerResume');
    var pauseBanner = document.getElementById(`taskPauseBanner_${taskId}`) || document.getElementById('runnerPauseBanner');

    if (pauseBtn) pauseBtn.classList.toggle('hidden', isPaused);
    if (resumeBtn) resumeBtn.classList.toggle('hidden', !isPaused);
    if (pauseBanner) pauseBanner.classList.toggle('hidden', !isPaused);
  }

  // Interaction Learning & Reversible Recommendations (Section 7)
  function checkInteractionForRecommendations() {
    var uid = getActiveUserId();
    var profile = getProfile(uid);

    // If user is already in guided mode or dismissed recently, don't nag
    if (profile.assistanceMode === 'guided') return;
    var dismissedUntil = localStorage.getItem('saksham_adaptive_rec_dismissed_' + uid);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) return;

    // Check recorded difficulty count from SakshamPersonalization trial state
    var trialState = (window.SakshamPersonalization && typeof window.SakshamPersonalization.getTrialState === 'function')
      ? window.SakshamPersonalization.getTrialState(uid)
      : null;

    var diffs = (trialState && trialState.difficultiesRecorded) ? trialState.difficultiesRecorded : [];
    if (!diffs || diffs.length < 2) return;

    // Count tremor or touch difficulties in recent entries
    var touchIssues = 0;
    var overwhelmIssues = 0;
    diffs.slice(0, 5).forEach(function (d) {
      if (d.difficultyCategory === 'buttons_hard_to_tap' || d.difficultyCategory === 'physical_tremor') touchIssues++;
      if (d.difficultyCategory === 'too_much_info' || d.difficultyCategory === 'confusing_screen') overwhelmIssues++;
    });

    var recommendationBanner = document.getElementById('adaptiveRecommendationBanner');
    var recText = document.getElementById('adaptiveRecText');
    var btnApply = document.getElementById('btnApplyAdaptiveRec');

    if (touchIssues >= 2 && profile.preferences.buttonSize !== 'extra_large') {
      if (recText) {
        recText.textContent = '💡 We noticed tapping smaller buttons was tricky recently. Would you like to switch to Comfort Controls (larger buttons and calm spacing)?';
      }
      if (btnApply) {
        btnApply.onclick = function () {
          profile.difficulties.smallButtons = true;
          profile.difficulties.handMovement = true;
          profile.preferences.buttonSize = 'extra_large';
          profile.preferences.interfaceDensity = 'spacious';
          saveProfile(profile, uid, 'patient');
          dismissAdaptiveRecommendation();
          if (typeof window.showSakshamToast === 'function') {
            window.showSakshamToast('Applied Comfort Controls! Buttons are now larger and easier to tap.', 'success');
          }
        };
      }
      if (recommendationBanner) recommendationBanner.classList.remove('hidden');
    } else if (overwhelmIssues >= 2 && profile.assistanceMode !== 'guided') {
      if (recText) {
        recText.textContent = '💡 Following multiple steps seemed difficult today. Would you like to try Guided Mode (one step at a time with calm prompts)?';
      }
      if (btnApply) {
        btnApply.onclick = function () {
          profile.assistanceMode = 'guided';
          saveProfile(profile, uid, 'patient');
          dismissAdaptiveRecommendation();
          if (typeof window.showSakshamToast === 'function') {
            window.showSakshamToast('Switched to Guided Mode! Assistance can be changed anytime.', 'success');
          }
        };
      }
      if (recommendationBanner) recommendationBanner.classList.remove('hidden');
    }
  }

  function dismissAdaptiveRecommendation() {
    var uid = getActiveUserId();
    // Dismiss for 24 hours
    localStorage.setItem('saksham_adaptive_rec_dismissed_' + uid, String(Date.now() + 24 * 60 * 60 * 1000));
    var banner = document.getElementById('adaptiveRecommendationBanner');
    if (banner) banner.classList.add('hidden');
  }

  // ==================== MODAL UI CONTROLLER ====================
  var selectedModalMode = 'assisted';

  function openAdaptiveAssessmentModal() {
    var uid = getActiveUserId();
    var profile = getProfile(uid);
    selectedModalMode = profile.assistanceMode || 'assisted';

    // 1. Highlight mode card
    updateModalModeCards(selectedModalMode);

    // 2. Hydrate checkboxes
    var diffs = profile.difficulties || {};
    setChk('adaptiveDiff_memory', diffs.memoryRecall);
    setChk('adaptiveDiff_smallButtons', diffs.smallButtons);
    setChk('adaptiveDiff_handMovement', diffs.handMovement);
    setChk('adaptiveDiff_readingText', diffs.readingText);
    setChk('adaptiveDiff_multiInstructions', diffs.multiInstructions);
    setChk('adaptiveDiff_informationOverwhelm', diffs.informationOverwhelm);
    setChk('adaptiveDiff_hearingSpoken', diffs.hearingSpoken);
    setChk('adaptiveDiff_preferVisual', diffs.preferVisual);
    setChk('adaptiveDiff_fatigueDuringTasks', diffs.fatigueDuringTasks);
    setChk('adaptiveDiff_preferIndependent', diffs.preferIndependent);

    // 3. Hydrate fine-tuned selectors
    var prefs = profile.preferences || {};
    setVal('adaptivePref_textSize', prefs.textSize || 'standard');
    setVal('adaptivePref_buttonSize', prefs.buttonSize || 'comfort');
    setVal('adaptivePref_cardDensity', prefs.interfaceDensity || 'standard');
    setVal('adaptivePref_motion', prefs.motionSpeed || 'normal');

    // 4. Update configured by label
    var lbl = document.getElementById('lblAdaptiveConfiguredBy');
    if (lbl) {
      lbl.textContent = profile.configuredBy === 'caregiver' ? 'Caregiver Assisted' : (profile.isCustomized ? 'Customized' : 'Default');
    }

    var modal = document.getElementById('modalAdaptiveAssessment');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    if (typeof window.lockScroll === 'function') window.lockScroll();
  }

  function closeAdaptiveAssessmentModal() {
    var modal = document.getElementById('modalAdaptiveAssessment');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    if (typeof window.unlockScroll === 'function') window.unlockScroll();
  }

  function selectAdaptiveMode(mode) {
    if (!MODE_DEFAULTS[mode]) mode = 'assisted';
    selectedModalMode = mode;
    updateModalModeCards(mode);

    // Auto-update fine-tuned dropdowns to match selected mode defaults
    var defs = MODE_DEFAULTS[mode];
    setVal('adaptivePref_textSize', defs.textSize);
    setVal('adaptivePref_buttonSize', defs.buttonSize);
    setVal('adaptivePref_cardDensity', defs.interfaceDensity);
    setVal('adaptivePref_motion', defs.motionSpeed);

    if (mode === 'independent') {
      setChk('adaptiveDiff_preferIndependent', true);
    }
  }

  function updateModalModeCards(activeMode) {
    var modes = ['guided', 'assisted', 'independent'];
    modes.forEach(function (m) {
      var cardId = 'cardMode' + m.charAt(0).toUpperCase() + m.slice(1);
      var card = document.getElementById(cardId);
      if (!card) return;

      var isSelected = m === activeMode;
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      var dot = card.querySelector('.mode-check-dot');

      if (isSelected) {
        card.className = 'p-3.5 rounded-2xl border-2 border-teal-600 bg-teal-50/50 cursor-pointer transition flex flex-col justify-between space-y-1.5 ring-2 ring-teal-500/30';
        if (dot) {
          dot.className = 'mode-check-dot w-4 h-4 rounded-full border-2 border-teal-600 bg-teal-600 flex items-center justify-center text-[10px] text-white font-black';
          dot.textContent = '✓';
        }
      } else {
        card.className = 'p-3.5 rounded-2xl border-2 border-slate-200 hover:border-teal-500 bg-slate-50/70 hover:bg-teal-50/40 cursor-pointer transition flex flex-col justify-between space-y-1.5';
        if (dot) {
          dot.className = 'mode-check-dot w-4 h-4 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] text-teal-700 font-black';
          dot.textContent = '';
        }
      }
    });
  }

  function saveAdaptiveAssessmentForm() {
    var uid = getActiveUserId();
    var currentRole = localStorage.getItem('saksham_user_role') || 'patient';

    var difficulties = {
      memoryRecall: getChk('adaptiveDiff_memory'),
      smallButtons: getChk('adaptiveDiff_smallButtons'),
      handMovement: getChk('adaptiveDiff_handMovement'),
      readingText: getChk('adaptiveDiff_readingText'),
      multiInstructions: getChk('adaptiveDiff_multiInstructions'),
      informationOverwhelm: getChk('adaptiveDiff_informationOverwhelm'),
      hearingSpoken: getChk('adaptiveDiff_hearingSpoken'),
      preferVisual: getChk('adaptiveDiff_preferVisual'),
      fatigueDuringTasks: getChk('adaptiveDiff_fatigueDuringTasks'),
      preferIndependent: getChk('adaptiveDiff_preferIndependent')
    };

    var customPreferences = {
      textSize: getVal('adaptivePref_textSize') || 'standard',
      buttonSize: getVal('adaptivePref_buttonSize') || 'comfort',
      interfaceDensity: getVal('adaptivePref_cardDensity') || 'standard',
      motionSpeed: getVal('adaptivePref_motion') || 'normal'
    };

    saveProfile({
      assistanceMode: selectedModalMode,
      difficulties: difficulties,
      preferences: customPreferences
    }, uid, currentRole);

    closeAdaptiveAssessmentModal();

    if (typeof window.showSakshamToast === 'function') {
      window.showSakshamToast('Adaptive profile saved! Saksham has adjusted to your preferences. 🌟', 'success');
    }
  }

  function setChk(id, val) {
    var el = document.getElementById(id);
    if (el) el.checked = !!val;
  }
  function getChk(id) {
    var el = document.getElementById(id);
    return el ? !!el.checked : false;
  }
  function setVal(id, val) {
    var el = document.getElementById(id);
    if (el && val) el.value = val;
  }
  function getVal(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  // Bind to global window
  window.openAdaptiveAssessmentModal = openAdaptiveAssessmentModal;
  window.closeAdaptiveAssessmentModal = closeAdaptiveAssessmentModal;
  window.selectAdaptiveMode = selectAdaptiveMode;
  window.saveAdaptiveAssessmentForm = saveAdaptiveAssessmentForm;

  // Public API
  window.SakshamAdaptiveProfile = {
    MODE_DEFAULTS: MODE_DEFAULTS,
    DEFAULT_DIFFICULTIES: DEFAULT_DIFFICULTIES,
    getActiveUserId: getActiveUserId,
    getProfile: getProfile,
    saveProfile: saveProfile,
    applyProfileToDom: applyProfileToDom,
    deriveEffectivePreferences: deriveEffectivePreferences,
    pauseTask: pauseTask,
    resumeTask: resumeTask,
    checkInteractionForRecommendations: checkInteractionForRecommendations,
    dismissAdaptiveRecommendation: dismissAdaptiveRecommendation,
    openAdaptiveAssessmentModal: openAdaptiveAssessmentModal,
    closeAdaptiveAssessmentModal: closeAdaptiveAssessmentModal,
    selectAdaptiveMode: selectAdaptiveMode,
    saveAdaptiveAssessmentForm: saveAdaptiveAssessmentForm
  };

  // Safe auto-initialization
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        var p = getProfile();
        applyProfileToDom(p);
      });
    } else {
      var p = getProfile();
      applyProfileToDom(p);
    }
  } catch (e) {}

})(window, document);
