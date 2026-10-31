/* ======================================================================= */
/* SAKSHAM 2.0 — PERSONALISATION SETTINGS CENTRE & AGE ADAPTATION ENGINE   */
/* Priority 4: User-Controlled Personalisation, Age-Band Invariants & Sync */
/* ======================================================================= */

(function (window, document) {
  'use strict';

  var BASE_STORAGE_KEY = 'saksham_personalisation_settings';

  /**
   * Safely determine current authenticated patient/caregiver UID
   */
  function getActiveUserId() {
    try {
      var activeStr = localStorage.getItem('saksham_active_user');
      if (activeStr) {
        var u = JSON.parse(activeStr);
        var uid = u.firebaseUid || u.id || u.uid;
        if (uid && String(uid).trim()) return String(uid).trim();
      }
      if (window.firebase && window.firebase.auth) {
        var cur = window.firebase.auth().currentUser;
        if (cur && cur.uid) return String(cur.uid).trim();
      }
      if (window.dbService && typeof window.dbService.getCurrentUserId === 'function') {
        var dbUid = window.dbService.getCurrentUserId();
        if (dbUid && String(dbUid).trim()) return String(dbUid).trim();
      }
    } catch (e) {}
    return 'guest';
  }

  /**
   * Returns UID-scoped localStorage key
   */
  function getStorageKey(targetUid) {
    var uid = targetUid || getActiveUserId();
    return BASE_STORAGE_KEY + '_' + uid;
  }

  var PRESETS = {
    everyday: {
      name: 'Everyday',
      description: 'Balanced comfort layout with standard typography, muted sage accents and smooth pacing.',
      settings: {
        wallpaper: 'default',
        colorTheme: 'sage',
        colorMode: 'light',
        navMode: 'standard',
        cardDensity: 'standard',
        dashboardFocus: 'grid',
        textSize: 'standard',
        buttonSize: 'comfort',
        highContrast: false,
        animationSpeed: 'normal',
        soundEffects: true,
        voiceReadouts: false,
        gamification: false,
        reminderStyle: 'chime'
      }
    },
    simple: {
      name: 'Simple',
      description: 'Clean single-task hero focus, high contrast, extra-large touch buttons.',
      settings: {
        wallpaper: 'default',
        colorTheme: 'sage',
        colorMode: 'light',
        navMode: 'simple',
        cardDensity: 'spacious',
        dashboardFocus: 'hero',
        textSize: 'large',
        buttonSize: 'extra_large',
        highContrast: true,
        animationSpeed: 'low',
        soundEffects: true,
        voiceReadouts: true,
        gamification: false,
        reminderStyle: 'banner'
      }
    },
    reading: {
      name: 'Reading',
      description: 'Maximum legibility, extra-large text, comfortable line-height, zero noise.',
      settings: {
        wallpaper: 'forest',
        colorTheme: 'slate',
        colorMode: 'light',
        navMode: 'standard',
        cardDensity: 'spacious',
        dashboardFocus: 'checklist',
        textSize: 'extra_large',
        buttonSize: 'comfort',
        highContrast: true,
        animationSpeed: 'low',
        soundEffects: false,
        voiceReadouts: true,
        gamification: false,
        reminderStyle: 'banner'
      }
    },
    night: {
      name: 'Night',
      description: 'Midnight dark calming background, muted chimes, zero bright flashes.',
      settings: {
        wallpaper: 'midnight',
        colorTheme: 'slate',
        colorMode: 'dark',
        navMode: 'standard',
        cardDensity: 'standard',
        dashboardFocus: 'hero',
        textSize: 'large',
        buttonSize: 'comfort',
        highContrast: false,
        animationSpeed: 'low',
        soundEffects: false,
        voiceReadouts: false,
        gamification: false,
        reminderStyle: 'banner'
      }
    }
  };

  /**
   * Return default settings tailored to demographic tier
   */
  function getDefaultSettingsForTier(tier) {
    var base = {
      wallpaper: 'default',
      colorTheme: 'sage',
      colorMode: 'light',
      navMode: 'standard',
      cardDensity: 'standard',
      dashboardFocus: 'grid',
      textSize: 'standard',
      buttonSize: 'standard',
      highContrast: false,
      animationSpeed: 'normal',
      soundEffects: true,
      voiceReadouts: false,
      gamification: false,
      reminderStyle: 'chime',
      customPreset: null,
      updatedAt: new Date().toISOString()
    };

    if (tier === 'youth') {
      base.wallpaper = 'default';
      base.colorTheme = 'ocean';
      base.gamification = true;
      base.dashboardFocus = 'grid';
      base.buttonSize = 'standard';
      base.textSize = 'standard';
    } else if (tier === 'adult') {
      base.wallpaper = 'default';
      base.colorTheme = 'slate';
      base.gamification = false;
      base.dashboardFocus = 'checklist';
      base.buttonSize = 'comfort';
      base.textSize = 'standard';
    } else {
      // Elderly (Senior 60+)
      base.wallpaper = 'default';
      base.colorTheme = 'sage';
      base.cardDensity = 'spacious';
      base.dashboardFocus = 'hero';
      base.textSize = 'large';
      base.buttonSize = 'extra_large';
      base.highContrast = false;
      base.voiceReadouts = true;
      base.gamification = false;
    }

    return base;
  }

  function getStoredSettings(targetUid) {
    var uid = targetUid || getActiveUserId();
    var activeTier = window.currentAgeTier || 'senior';
    var key = getStorageKey(uid);
    try {
      var raw = localStorage.getItem(key);
      if (raw) {
        var parsed = JSON.parse(raw);
        return Object.assign({}, getDefaultSettingsForTier(activeTier), parsed);
      }
      // If user-specific key not yet set, check legacy un-scoped key if current user is active
      if (uid !== 'guest') {
        var legacyRaw = localStorage.getItem(BASE_STORAGE_KEY);
        if (legacyRaw) {
          var legacyParsed = JSON.parse(legacyRaw);
          var migrated = Object.assign({}, getDefaultSettingsForTier(activeTier), legacyParsed);
          localStorage.setItem(key, JSON.stringify(migrated));
          localStorage.removeItem(BASE_STORAGE_KEY);
          return migrated;
        }
      }
    } catch (e) {
      console.warn('[Personalisation] Error reading localStorage for ' + uid + ':', e);
    }
    return getDefaultSettingsForTier(activeTier);
  }

  /**
   * Apply settings to the DOM (Body attributes, classes, and styles)
   */
  function applySettingsToDom(settings) {
    if (!settings || !document.body) return;

    // 1. Wallpaper
    document.body.setAttribute('data-wallpaper', settings.wallpaper || 'default');
    document.body.classList.remove('wallpaper-forest', 'wallpaper-midnight', 'wallpaper-dawn');
    if (settings.wallpaper && settings.wallpaper !== 'default') {
      document.body.classList.add('wallpaper-' + settings.wallpaper);
    }

    // 2. Color Mode (Dark / Light)
    document.body.setAttribute('data-color-mode', settings.colorMode || 'light');
    if (settings.colorMode === 'dark') {
      document.body.classList.add('mode-dark');
    } else {
      document.body.classList.remove('mode-dark');
    }

    // 3. Text Size
    document.body.setAttribute('data-text-size', settings.textSize || 'standard');
    document.body.classList.remove('text-large', 'text-extra-large');
    if (settings.textSize === 'large') document.body.classList.add('text-large');
    if (settings.textSize === 'extra_large') document.body.classList.add('text-extra-large');

    // 4. Button Size
    document.body.setAttribute('data-button-size', settings.buttonSize || 'standard');
    document.body.classList.remove('btn-comfort', 'btn-extra-large');
    if (settings.buttonSize === 'comfort') document.body.classList.add('btn-comfort');
    if (settings.buttonSize === 'extra_large') document.body.classList.add('btn-extra-large');

    // 5. High Contrast
    document.body.setAttribute('data-high-contrast', settings.highContrast ? 'true' : 'false');
    if (settings.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }

    // 6. Animation Speed
    document.body.setAttribute('data-animation-speed', settings.animationSpeed || 'normal');
    document.body.classList.remove('reduce-motion', 'low-motion');
    if (settings.animationSpeed === 'off') document.body.classList.add('reduce-motion');
    if (settings.animationSpeed === 'low') document.body.classList.add('low-motion');

    // 7. Card Density
    document.body.setAttribute('data-card-density', settings.cardDensity || 'standard');

    // 8. Dashboard Focus (Hero vs Grid vs Checklist)
    document.body.setAttribute('data-dashboard-focus', settings.dashboardFocus || 'grid');
    if (settings.dashboardFocus === 'hero') {
      if (typeof window.switchRoutineMiniTab === 'function') window.switchRoutineMiniTab('cues');
    } else if (settings.dashboardFocus === 'checklist') {
      if (typeof window.switchRoutineMiniTab === 'function') window.switchRoutineMiniTab('direct');
    }

    // 9. Color Theme (Sage, Emerald, Ocean, Amber, Slate, Lavender)
    document.body.setAttribute('data-color-theme', settings.colorTheme || 'sage');

    // 10. Navigation Mode (Standard, Bottom, Simple)
    document.body.setAttribute('data-nav-mode', settings.navMode || 'standard');

    // 11. Gamification Toggle (XP, Streaks, Levels)
    document.body.setAttribute('data-gamification', settings.gamification ? 'true' : 'false');

    // 12. Reminder Presentation Style
    document.body.setAttribute('data-reminder-style', settings.reminderStyle || 'chime');

    // 13. Audio / Voice settings update
    if (window.SakshamAudio) {
      window.SakshamAudio.soundEnabled = settings.soundEffects !== false;
    }
  }

  /**
   * Save and sync settings isolated per UID
   */
  function saveSettings(settings, announce, targetUid) {
    var uid = targetUid || getActiveUserId();
    settings.updatedAt = new Date().toISOString();
    var key = getStorageKey(uid);
    try {
      localStorage.setItem(key, JSON.stringify(settings));
    } catch (e) {
      console.warn('[Personalisation] Failed to save settings for ' + uid + ':', e);
    }

    // Only apply to active DOM if target user is currently active or guest
    if (!targetUid || targetUid === getActiveUserId()) {
      applySettingsToDom(settings);
    }

    // Sync to user profile in Firestore / offline queue if authenticated
    if (uid !== 'guest') {
      try {
        if (window.dbService && window.dbService.profiles) {
          window.dbService.profiles.update(uid, {
            personalisationSettings: settings,
            textSizePreference: settings.textSize,
            contrastPreference: settings.highContrast ? 'high_contrast' : 'standard',
            voiceAssistanceEnabled: !!settings.voiceReadouts,
            updatedAt: settings.updatedAt
          });
        }
        var syncService = window.offlineSyncService || window.offlineSync;
        if (syncService && typeof syncService.enqueueOperation === 'function') {
          syncService.enqueueOperation(uid, 'profile', 'update', {
            personalisationSettings: settings,
            updatedAt: settings.updatedAt
          }, 'sync_pref_' + uid + '_' + Date.now(), false);
        }
      } catch (e) {
        console.warn('[Personalisation] Sync to Firestore error for ' + uid + ':', e);
      }
    }

    if (announce && typeof window.showSakshamToast === 'function') {
      window.showSakshamToast('🎨 Personalisation preferences saved & applied!', 'success');
    }
  }

  // ─── Modal Open / Close / Tabs ──────────────────────────────────────────────

  function applyLiveModalPreview() {
    var settings = readSettingsFromModal();
    applySettingsToDom(settings);
  }

  function openPersonaliseModal(initialTab) {
    var modal = document.getElementById('modalPersonaliseMySaksham');
    if (!modal) return;

    var currentSettings = getStoredSettings();
    populateModalForm(currentSettings);
    switchPersonaliseTab(initialTab || 'appearance');

    if (!modal._liveListenerAttached) {
      modal.addEventListener('change', function(e) {
        if (e.target && e.target.name) {
          var radios = document.getElementsByName(e.target.name);
          for (var r = 0; r < radios.length; r++) {
            highlightChoiceCard(radios[r]);
          }
        }
        applyLiveModalPreview();
      });
      modal._liveListenerAttached = true;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
  }

  function closePersonaliseModal(revertUnsaved) {
    var modal = document.getElementById('modalPersonaliseMySaksham');
    if (!modal) return;

    if (revertUnsaved !== false) {
      var currentStored = getStoredSettings();
      applySettingsToDom(currentStored);
    }

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
  }

  function switchPersonaliseTab(tabName) {
    var tabs = ['appearance', 'layout', 'text', 'interaction', 'reminders', 'presets'];
    tabs.forEach(function (t) {
      var btn = document.getElementById('tabBtnPersonalise_' + t);
      var pane = document.getElementById('tabPanePersonalise_' + t);
      if (t === tabName) {
        if (btn) {
          btn.className = "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-[#1B4225] text-white shadow-sm border border-emerald-500/40 cursor-pointer";
        }
        if (pane) {
          pane.classList.remove('hidden');
          pane.classList.add('block');
        }
      } else {
        if (btn) {
          btn.className = "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition";
        }
        if (pane) {
          pane.classList.add('hidden');
          pane.classList.remove('block');
        }
      }
    });
  }

  function populateModalForm(s) {
    // Wallpaper radio / buttons
    setRadioGroupValue('prefWallpaper', s.wallpaper || 'default');
    // Color theme
    setRadioGroupValue('prefColorTheme', s.colorTheme || 'emerald');
    // Mode
    setRadioGroupValue('prefColorMode', s.colorMode || 'light');
    // Navigation mode
    setRadioGroupValue('prefNavMode', s.navMode || 'standard');
    // Card density
    setRadioGroupValue('prefCardDensity', s.cardDensity || 'standard');
    // Dashboard focus
    setRadioGroupValue('prefDashboardFocus', s.dashboardFocus || 'grid');
    // Text size
    setRadioGroupValue('prefTextSize', s.textSize || 'standard');
    // Button size
    setRadioGroupValue('prefButtonSize', s.buttonSize || 'standard');
    // High contrast
    var chkContrast = document.getElementById('prefHighContrast');
    if (chkContrast) chkContrast.checked = !!s.highContrast;
    // Animation speed
    setRadioGroupValue('prefAnimationSpeed', s.animationSpeed || 'normal');
    // Sound FX
    var chkSound = document.getElementById('prefSoundEffects');
    if (chkSound) chkSound.checked = s.soundEffects !== false;
    // Voice readouts
    var chkVoice = document.getElementById('prefVoiceReadouts');
    if (chkVoice) chkVoice.checked = !!s.voiceReadouts;
    // Gamification
    var chkGamify = document.getElementById('prefGamification');
    if (chkGamify) chkGamify.checked = !!s.gamification;
    // Reminder style
    setRadioGroupValue('prefReminderStyle', s.reminderStyle || 'chime');
  }

  function setRadioGroupValue(groupName, value) {
    var radios = document.getElementsByName(groupName);
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].value === value) {
        radios[i].checked = true;
        // visual highlight card
        highlightChoiceCard(radios[i]);
      }
    }
  }

  function getRadioGroupValue(groupName, defaultValue) {
    var radios = document.getElementsByName(groupName);
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) return radios[i].value;
    }
    return defaultValue;
  }

  function highlightChoiceCard(radioInput) {
    if (!radioInput) return;
    var group = document.getElementsByName(radioInput.name);
    for (var i = 0; i < group.length; i++) {
      var parent = group[i].closest('.choice-card');
      if (parent) {
        if (group[i].checked) {
          parent.classList.add('border-[#1B4225]', 'bg-emerald-50/50', 'ring-2', 'ring-[#1B4225]');
          parent.classList.remove('border-slate-200', 'bg-white');
        } else {
          parent.classList.remove('border-[#1B4225]', 'bg-emerald-50/50', 'ring-2', 'ring-[#1B4225]');
          parent.classList.add('border-slate-200', 'bg-white');
        }
      }
    }
  }

  function readSettingsFromModal() {
    var chkContrast = document.getElementById('prefHighContrast');
    var chkSound = document.getElementById('prefSoundEffects');
    var chkVoice = document.getElementById('prefVoiceReadouts');
    var chkGamify = document.getElementById('prefGamification');

    var current = getStoredSettings();

    return {
      wallpaper: getRadioGroupValue('prefWallpaper', 'default'),
      colorTheme: getRadioGroupValue('prefColorTheme', 'emerald'),
      colorMode: getRadioGroupValue('prefColorMode', 'light'),
      navMode: getRadioGroupValue('prefNavMode', 'standard'),
      cardDensity: getRadioGroupValue('prefCardDensity', 'standard'),
      dashboardFocus: getRadioGroupValue('prefDashboardFocus', 'grid'),
      textSize: getRadioGroupValue('prefTextSize', 'standard'),
      buttonSize: getRadioGroupValue('prefButtonSize', 'standard'),
      highContrast: chkContrast ? chkContrast.checked : false,
      animationSpeed: getRadioGroupValue('prefAnimationSpeed', 'normal'),
      soundEffects: chkSound ? chkSound.checked : true,
      voiceReadouts: chkVoice ? chkVoice.checked : false,
      gamification: chkGamify ? chkGamify.checked : false,
      reminderStyle: getRadioGroupValue('prefReminderStyle', 'chime'),
      customPreset: current.customPreset || null,
      updatedAt: new Date().toISOString()
    };
  }

  function handleSaveAndApply() {
    var settings = readSettingsFromModal();
    saveSettings(settings, true);
    closePersonaliseModal(false);
  }

  function applyPreset(presetKey) {
    var p = PRESETS[presetKey];
    if (!p) return;

    var current = getStoredSettings();
    var merged = Object.assign({}, current, p.settings, { updatedAt: new Date().toISOString() });
    populateModalForm(merged);
    saveSettings(merged, false);

    if (typeof window.showSakshamToast === 'function') {
      window.showSakshamToast('⚡ Preset "' + p.name + '" applied!', 'success');
    }
  }

  function saveCustomPreset() {
    var settings = readSettingsFromModal();
    settings.customPreset = Object.assign({}, settings);
    saveSettings(settings, false);

    if (typeof window.showSakshamToast === 'function') {
      window.showSakshamToast('💾 Custom layout preset saved successfully!', 'success');
    }
  }

  function restoreCustomPreset() {
    var current = getStoredSettings();
    if (!current.customPreset) {
      if (typeof window.showSakshamToast === 'function') {
        window.showSakshamToast('No saved custom preset found.', 'warning');
      }
      return;
    }

    var restored = Object.assign({}, current.customPreset, { updatedAt: new Date().toISOString() });
    populateModalForm(restored);
    saveSettings(restored, true);
  }

  function resetToDefaults() {
    var tier = window.currentAgeTier || 'senior';
    var defs = getDefaultSettingsForTier(tier);
    populateModalForm(defs);
    saveSettings(defs, true);
  }

  // ─── Profile / Date of Birth Correction Flow (Fixed Age Identity) ───────────

  function openDobCorrectionModal() {
    var modal = document.getElementById('modalDobCorrection');
    if (!modal) return;

    var curDob = getCurrentUserDob();
    var inp = document.getElementById('inputDobCorrection');
    if (inp) {
      inp.value = curDob;
      inp.max = new Date().toISOString().split('T')[0];
    }
    updateDobCorrectionPreview(curDob);

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
  }

  function closeDobCorrectionModal() {
    var modal = document.getElementById('modalDobCorrection');
    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
  }

  function getCurrentUserDob() {
    try {
      var activeStr = localStorage.getItem('saksham_active_user');
      if (activeStr) {
        var u = JSON.parse(activeStr);
        if (u.dateOfBirth || u.dob) return u.dateOfBirth || u.dob;
      }
    } catch (e) {}

    if (typeof state !== 'undefined' && state.profile && state.profile.dob) {
      return state.profile.dob;
    }
    return localStorage.getItem('saksham_user_dob') || '1958-05-15'; // default senior (68 yrs)
  }

  function updateDobCorrectionPreview(dobVal) {
    var previewBox = document.getElementById('dobCorrectionPreview');
    var btnSave = document.getElementById('btnSaveDobCorrection');
    if (!previewBox) return;

    if (!dobVal) {
      previewBox.innerHTML = '<span class="text-xs text-slate-500">Please select a valid date of birth.</span>';
      if (btnSave) btnSave.disabled = true;
      return;
    }

    var res = window.resolveAgeTier ? window.resolveAgeTier(dobVal) : { supported: false, error: 'Age resolution unavailable.' };

    if (!res.supported) {
      previewBox.innerHTML = [
        '<div class="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-2">',
        '  <i class="fa-solid fa-triangle-exclamation text-rose-600 mt-0.5 shrink-0"></i>',
        '  <div>',
        '    <strong>Age Not Supported:</strong> ' + res.error,
        '  </div>',
        '</div>'
      ].join('');
      if (btnSave) btnSave.disabled = true;
    } else {
      var badgeColors = {
        youth: 'bg-amber-100 text-amber-950 border-amber-300',
        adult: 'bg-teal-100 text-teal-950 border-teal-300',
        senior: 'bg-emerald-100 text-emerald-950 border-emerald-300'
      };
      var tierIcon = res.tier === 'youth' ? '⚡' : (res.tier === 'adult' ? '💼' : '🌸');

      previewBox.innerHTML = [
        '<div class="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">',
        '  <div class="flex items-center justify-between">',
        '    <span class="font-extrabold text-slate-900">Calculated Age: ' + res.age + ' years</span>',
        '    <span class="px-2.5 py-0.5 rounded-full font-black text-[11px] border ' + (badgeColors[res.tier] || '') + '">',
        '      ' + tierIcon + ' ' + res.label,
        '    </span>',
        '  </div>',
        '  <p class="text-[11px] text-slate-600">',
        '    Your interface will automatically adjust to the ' + res.label + ' experience upon saving.',
        '  </p>',
        '</div>'
      ].join('');
      if (btnSave) btnSave.disabled = false;
    }
  }

  function handleSaveDobCorrection() {
    var inp = document.getElementById('inputDobCorrection');
    if (!inp || !inp.value) return;

    var newDob = inp.value;
    var res = window.resolveAgeTier(newDob);
    if (!res.supported) {
      if (typeof window.showSakshamToast === 'function') {
        window.showSakshamToast(res.error, 'error');
      }
      return;
    }

    // Persist new DOB
    try {
      localStorage.setItem('saksham_user_dob', newDob);
      var activeStr = localStorage.getItem('saksham_active_user');
      if (activeStr) {
        var u = JSON.parse(activeStr);
        u.dateOfBirth = newDob;
        u.dob = newDob;
        u.ageTier = res.tier;
        u.interfaceProfile = res.tier;
        localStorage.setItem('saksham_active_user', JSON.stringify(u));

        var uid = u.firebaseUid || u.id;
        if (uid && window.dbService && window.dbService.profiles) {
          window.dbService.profiles.update(uid, {
            dateOfBirth: newDob,
            ageTier: res.tier,
            interfaceProfile: res.tier,
            updatedAt: new Date().toISOString()
          });
        }
      }
      if (typeof state !== 'undefined' && state.profile) {
        state.profile.dob = newDob;
        state.ageTier = res.tier;
      }
    } catch (e) {
      console.warn('[Personalisation] Failed saving DOB:', e);
    }

    // Apply resolved age tier
    if (typeof window.setAgeTier === 'function') {
      window.setAgeTier(res.tier, true, 'dob');
    }

    closeDobCorrectionModal();

    if (typeof window.showSakshamToast === 'function') {
      window.showSakshamToast('🎂 Date of Birth updated! Interface adjusted to ' + res.label + '.', 'success');
    }
  }

  // ─── User Session Lifecycle & Isolation ─────────────────────────────────────

  function handleLogout() {
    // 1. Remove legacy un-scoped key to prevent leakage to guest or next user
    try {
      localStorage.removeItem(BASE_STORAGE_KEY);
    } catch (e) {}

    // 2. Reset DOM styles to default clean guest baseline
    var defaultSettings = getDefaultSettingsForTier('senior');
    applySettingsToDom(defaultSettings);

    // 3. Reset and close modals if open
    closePersonaliseModal();
    closeDobCorrectionModal();

    // 4. Reset age tier to default senior gentle
    window.currentAgeTier = 'senior';
    window.currentAgeMode = 'senior';
    if (document.body) {
      document.body.classList.remove('tier-youth', 'tier-adult', 'mode-dynamic-gamified');
      document.body.classList.add('tier-senior', 'mode-senior-gentle');
    }
  }

  function handleUserChange(newUid, newTier) {
    if (!newUid) return;

    // Apply demographic tier if supplied
    if (newTier) {
      window.currentAgeTier = newTier;
      window.currentAgeMode = newTier === 'senior' ? 'senior' : 'dynamic';
      if (document.body) {
        document.body.classList.remove('tier-youth', 'tier-adult', 'tier-senior', 'mode-senior-gentle', 'mode-dynamic-gamified');
        document.body.classList.add('tier-' + newTier);
        if (newTier === 'senior') {
          document.body.classList.add('mode-senior-gentle');
        } else {
          document.body.classList.add('mode-dynamic-gamified');
        }
      }
    }

    // Load and apply this user's isolated preferences
    var userSettings = getStoredSettings(newUid);
    applySettingsToDom(userSettings);

    // If modal is open, refresh form values
    var modal = document.getElementById('modalPersonaliseMySaksham');
    if (modal && !modal.classList.contains('hidden')) {
      populateModalForm(userSettings);
    }
  }

  // ─── Initialization on App Load ─────────────────────────────────────────────

  function initPersonalisation() {
    // 1. Resolve age tier from DOB
    var userDob = getCurrentUserDob();
    if (userDob && window.resolveAgeTier) {
      var res = window.resolveAgeTier(userDob);
      if (res.supported && res.tier) {
        window.currentAgeTier = res.tier;
        try { localStorage.setItem('saksham_age_tier', res.tier); } catch (e) {}
      }
    }

    // 2. Load stored personalisation settings & apply to DOM
    var settings = getStoredSettings();
    applySettingsToDom(settings);
  }

  // Expose to window
  window.SakshamPersonalisation = {
    openModal: openPersonaliseModal,
    closeModal: closePersonaliseModal,
    switchTab: switchPersonaliseTab,
    applyLivePreview: applyLiveModalPreview,
    saveAndApply: handleSaveAndApply,
    applyPreset: applyPreset,
    saveCustomPreset: saveCustomPreset,
    restoreCustomPreset: restoreCustomPreset,
    resetToDefaults: resetToDefaults,
    openDobModal: openDobCorrectionModal,
    closeDobModal: closeDobCorrectionModal,
    updateDobPreview: updateDobCorrectionPreview,
    saveDobCorrection: handleSaveDobCorrection,
    getSettings: getStoredSettings,
    saveSettings: saveSettings,
    applySettingsToDom: applySettingsToDom,
    handleLogout: handleLogout,
    handleUserChange: handleUserChange,
    getActiveUserId: getActiveUserId,
    getStorageKey: getStorageKey,
    getCurrentUserDob: getCurrentUserDob,
    init: initPersonalisation
  };

  // Run initial styling as soon as script runs
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPersonalisation);
  } else {
    initPersonalisation();
  }

})(window, document);
