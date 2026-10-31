/* ======================================================================= */
/* SAKSHAM NAVIGATION, ROLE ISOLATION & GLOBAL VIEW CONTROLLER             */
/* ======================================================================= */

// Global Canonical Disease Navigation Mapping - Strictly mapped per medical profile
window.SAKSHAM_CONDITION_TABS = {
  parkinsons: ['routine', 'games', 'movement', 'nutrition', 'calendar-hub'],
  alzheimers: ['routine', 'games', 'vault', 'nutrition', 'calendar-hub'],
  dementia: ['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub'],
  parkinsons_dementia: ['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub'],
  both: ['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub'],
  other: ['routine', 'games', 'nutrition', 'calendar-hub']
};

    /* ==================== SCROLL LOCK MANAGER ==================== */
    /* Centralised reference-counted scroll lock.                    */
    /* Always call window.lockScroll() on modal open, window.unlockScroll() on     */
    /* close. The body scroll is only restored when all locks are    */
    /* released, and a watchdog catches any orphaned locks.          */
    window._scrollLockCount = 0;
    window.lockScroll = function lockScroll() {
      window._scrollLockCount++;
      document.body.style.overflow = 'hidden';
      document.body.style.overflowY = 'hidden';
    };
    window.unlockScroll = function unlockScroll() {
      window._scrollLockCount = Math.max(0, (window._scrollLockCount || 0) - 1);
      if (window._scrollLockCount === 0) {
        document.body.style.overflow = '';
        document.body.style.overflowY = '';
        document.documentElement.style.overflow = '';
      }
    };
    window.forceUnlockScroll = function forceUnlockScroll() {
      window._scrollLockCount = 0;
      document.body.style.overflow = '';
      document.body.style.overflowY = '';
      document.documentElement.style.overflow = '';
    };
    // Global Escape key: close any open overlay and restore scroll
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape') return;
      const overlayIds = [
        'mobileToolsDrawer','modalPrivacyPolicy','dbSettingsModal',
        'modalTaskHelp','modalTaskRunner','modalAddTask','modalCaregiverTask',
        'alarmModal','patientOnboardingContainer','authGatewayScreen',
        'modalHiGeminiAssist','modalHiSakshamAssist','addLovedOneModal',
        'webcamModal','modalProfilePhoto','emergencyModal','aiSettingsModal'
      ];
      overlayIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden')) {
          el.classList.add('hidden');
          el.classList.remove('flex');
          el.style.display = 'none';
        }
      });
      window.forceUnlockScroll();
    });
    // Watchdog: every 2s, if no modal is open force-release scroll
    setInterval(function() {
      if ((window._scrollLockCount || 0) <= 0) return;
      const overlayIds = [
        'mobileToolsDrawer','modalPrivacyPolicy','dbSettingsModal',
        'modalTaskHelp','modalTaskRunner','modalAddTask','modalCaregiverTask',
        'alarmModal','patientOnboardingContainer','addLovedOneModal',
        'webcamModal','modalProfilePhoto','emergencyModal','aiSettingsModal'
      ];
      const anyOpen = overlayIds.some(id => {
        const el = document.getElementById(id);
        return el && !el.classList.contains('hidden') && el.style.display !== 'none';
      });
      if (!anyOpen) window.forceUnlockScroll();
    }, 2000);


    function changeLanguage(langKey) {
      currentLang = langKey;
      currentVoiceLang = langKey;
      try {
        localStorage.setItem('saksham_lang', langKey);
        localStorage.setItem('saksham_voice_lang', langKey);
      } catch (e) {}
      
      const langSelect = document.getElementById('languageSelect');
      if (langSelect && langSelect.value !== langKey) {
        langSelect.value = langKey;
      }
      syncLangSelectors(langKey);

      const allDicts = (typeof I18N_DICTIONARY !== 'undefined' ? I18N_DICTIONARY : window.I18N_DICTIONARY) || {};
      const dict = allDicts[langKey] || allDicts['en'] || {};
      
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
          el.innerText = dict[key];
        }
      });

      // Update AI quick chips and voice prompt to match user's reading language
      if (typeof updateAiQuickChips === 'function') updateAiQuickChips(langKey);
      if (typeof updateBigVoiceButtonPrompt === 'function') updateBigVoiceButtonPrompt(langKey);

      // Synchronize with background Google Translate engine if available
      try {
        document.cookie = `googtrans=/en/${langKey}; path=/;`;
        document.cookie = `googtrans=/en/${langKey}; domain=${window.location.hostname}; path=/;`;
      } catch (e) {}

      const select = document.querySelector('.goog-te-combo');
      if (select) {
        select.value = langKey;
        select.dispatchEvent(new Event('change'));
      }

      // Re-render components that contain dynamic localized text
      renderBadgesUI();
      renderActiveCueCard();
      renderTimeframeInsights();
      try {
        let activeCond = 'parkinsons';
        const stored = JSON.parse(localStorage.getItem('saksham_active_user') || '{}');
        if (stored.condition) activeCond = stored.condition;
        if (activeCond === 'both' || activeCond === 'parkinsons_dementia') activeCond = 'dementia';
        const condTabs = window.SAKSHAM_CONDITION_TABS || {
          parkinsons: ['routine', 'games', 'movement', 'nutrition', 'calendar-hub'],
          alzheimers: ['routine', 'games', 'vault', 'nutrition', 'calendar-hub'],
          dementia: ['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub'],
          parkinsons_dementia: ['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub'],
          both: ['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub'],
          other: ['routine', 'games', 'nutrition', 'calendar-hub']
        };
        const allowed = condTabs[activeCond] || condTabs['parkinsons'];
        const activeTabKey = (window.SAKSHAM_PATIENT_TABS || []).find(t => {
          const v = document.getElementById(`view-${t.key}`);
          return v && !v.classList.contains('hidden');
        })?.key || allowed[0];
        if (typeof renderSequentialPatientTabs === 'function') {
          renderSequentialPatientTabs(allowed, activeTabKey);
        }
      } catch (e) {}
      playAudioChime('chime');
    }




    function navigateToHomeForRole() {
      if (state.role === 'caregiver') {
        switchCaregiverSubTab('cg-overview');
      } else if (state.role === 'doctor') {
        switchDoctorSubTab('doc-telemetry');
      } else {
        switchTab('routine');
      }
    }

    function quickSwitchPersona(role) {
      if (role !== 'patient' && state.role === 'patient') {
        if (typeof requestRoleLogin === 'function') {
          requestRoleLogin(role);
        } else {
          alert("Role switching is protected. Please log in with authorized credentials.");
        }
        return;
      }
      let name = '';
      if (role === 'patient') name = 'Kalyani Sharma';
      else if (role === 'caregiver') name = 'Aarav Sharma (Caregiver)';
      else if (role === 'doctor') name = 'Dr. Rajesh Verma, MD';
      const userObj = { name, role, lang: (typeof currentLang !== 'undefined' ? currentLang : 'en') };
      localStorage.setItem('saksham_active_user', JSON.stringify(userObj));
      applyRolePermissions(role, userObj);
      playAudioChime('chime');
    }

    function syncLangSelectors(val) {
      const mainSelect = document.getElementById('languageSelect');
      if (mainSelect) mainSelect.value = val;
    }


    function directOpenPage(tabKey, subId = null) {
      // 1. Dismiss any overlay screens or auth modals that might block the UI
      if (typeof hideAuthGateway === 'function') hideAuthGateway();
      if (typeof closeAuthModal === 'function') closeAuthModal();
      toggleAiDrawer(false);

      if (state.role === 'caregiver') {
        // Stay in Caregiver Hub — never forcibly convert caregiver to patient
        if (tabKey === 'routine' || tabKey === 'schedule' || tabKey === 'todo') {
          switchCaregiverSubTab('cg-schedule');
        } else if (tabKey === 'gps' || tabKey === 'tracker' || tabKey === 'safepath') {
          switchCaregiverSubTab('cg-gps');
        } else if (tabKey === 'notes') {
          switchCaregiverSubTab('cg-notes');
        } else {
          switchCaregiverSubTab('cg-overview');
        }
        setTimeout(() => {
          const target = document.getElementById('portal-caregiver-container');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
        return;
      }

      if (tabKey === 'alerts' || tabKey === 'sos' || tabKey === 'emergency') {
        if (typeof patientSendEmergencyWhatsApp === 'function') {
          patientSendEmergencyWhatsApp('sos');
        } else if (typeof openEmergencyModal === 'function') {
          openEmergencyModal();
        }
        return;
      }

      if (state.role === 'doctor') {
        // Stay in Clinician Portal — never forcibly convert doctor to patient
        if (tabKey === 'telemetry' || tabKey === 'charts') {
          switchDoctorSubTab('doc-telemetry');
        } else if (tabKey === 'directives' || tabKey === 'rx') {
          switchDoctorSubTab('doc-directives');
        } else {
          switchDoctorSubTab('doc-reports');
        }
        setTimeout(() => {
          const target = document.getElementById('portal-doctor-container');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
        return;
      }

      // Patient navigation
      state.role = 'patient';
      const portalPatient = document.getElementById('portal-patient-container');
      const portalCaregiver = document.getElementById('portal-caregiver-container');
      const portalDoctor = document.getElementById('portal-doctor-container');
      const navPatient = document.getElementById('nav-patient');
      const navCaregiver = document.getElementById('nav-caregiver');
      const navDoctor = document.getElementById('nav-doctor');

      if (portalPatient) {
        portalPatient.classList.remove('hidden');
        portalPatient.style.display = '';
      }
      if (portalCaregiver) portalCaregiver.classList.add('hidden');
      if (portalDoctor) portalDoctor.classList.add('hidden');
      if (navPatient) {
        navPatient.classList.remove('hidden');
        navPatient.style.display = '';
      }
      if (navCaregiver) navCaregiver.classList.add('hidden');
      if (navDoctor) navDoctor.classList.add('hidden');

      // 3. Switch to target patient tab
      if (typeof switchTab === 'function') {
        switchTab(tabKey);
      }

      // 4. If mini game requested in Games tab
      if (tabKey === 'games' && subId && typeof switchMiniGame === 'function') {
        switchMiniGame(subId);
      }

      // 5. Scroll to top of page on tab switch (scrollIntoView disrupts layout scroll)
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }



    function toggleHeaderMenu(e) {
      if (e) e.stopPropagation();
      const dropdown = document.getElementById('headerMenuDropdown');
      if (dropdown) {
        dropdown.classList.toggle('hidden');
        const isExpanded = !dropdown.classList.contains('hidden');
        const btn = document.getElementById('btnHeaderMenu');
        if (btn) btn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      }
    }

    function closeHeaderMenu() {
      const dropdown = document.getElementById('headerMenuDropdown');
      if (dropdown && !dropdown.classList.contains('hidden')) {
        dropdown.classList.add('hidden');
        const btn = document.getElementById('btnHeaderMenu');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    }

    document.addEventListener('click', function(e) {
      const dropdown = document.getElementById('headerMenuDropdown');
      const btn = document.getElementById('btnHeaderMenu');
      if (dropdown && !dropdown.classList.contains('hidden')) {
        if (!dropdown.contains(e.target) && (!btn || !btn.contains(e.target))) {
          dropdown.classList.add('hidden');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        }
      }
    });

    function renderTimeframeInsights() {
      const container = document.getElementById('timeframe-display-container');
      if (!container || typeof state === 'undefined' || !state.tasks) return;
      const isDaily = state.timeframeMode === 'daily';
      const isWeekly = state.timeframeMode === 'weekly';
      const tasksTakingMoreTime = state.tasks.filter(t => t.latencyMinutes >= 15);

      if (isDaily) {
        container.innerHTML = `
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-3">
            <div>
              <span class="text-[10px] font-black uppercase text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">Daily Telemetry Record</span>
              <h3 class="text-base sm:text-lg font-black text-slate-900 mt-1 font-heading">
                Daily Activity Log & Tasks Requiring More Time (${state.selectedDate})
              </h3>
            </div>
            <div class="flex gap-2">
              <span class="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200">
                ✅ Completed: ${state.tasks.filter(t => t.done).length} / ${state.tasks.length}
              </span>
              <span class="px-2.5 py-1 bg-amber-50 text-amber-800 font-bold text-xs rounded-xl border border-amber-200">
                ⏳ Slow Tasks: ${tasksTakingMoreTime.length}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <h4 class="font-black text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                <i class="fa-solid fa-list-check text-teal-600"></i> Today's Schedule Overview
              </h4>
              <div class="space-y-1.5 max-h-36 overflow-y-auto">
                ${state.tasks.map(t => `
                  <div class="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                    <span class="font-bold text-slate-800">${t.time} - ${t.title}</span>
                    <span class="font-bold text-[10px] px-2 py-0.5 rounded-full ${t.done ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}">
                      ${t.done ? 'Done' : 'Pending'} (${t.latencyMinutes}m)
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 space-y-2">
              <h4 class="font-black text-amber-900 uppercase text-[11px] flex items-center gap-1.5">
                <i class="fa-solid fa-clock-rotate-left text-amber-600"></i> Activities That Needed More Time Today
              </h4>
              <div class="space-y-1.5">
                ${tasksTakingMoreTime.map(t => `
                  <div class="bg-white p-2.5 rounded-xl border border-amber-300 shadow-2xs flex justify-between items-center">
                    <div>
                      <strong class="text-slate-900 font-bold">${t.title}</strong>
                      <p class="text-slate-500 text-[10px]">Normal: 5-8 mins | Recorded: <span class="text-rose-600 font-black">${t.latencyMinutes} mins</span></p>
                    </div>
                    <span class="px-2 py-1 bg-amber-100 text-amber-900 font-extrabold text-[10px] rounded-lg">Caregiver Alerted</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      } else if (isWeekly) {
        container.innerHTML = `
          <div class="border-b border-slate-100 pb-3">
            <span class="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">Weekly Progress Rollup</span>
            <h3 class="text-base sm:text-lg font-black text-slate-900 mt-1 font-heading">
              7-Day Motor Stability & Routine Completion Progress
            </h3>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <p class="text-[11px] text-slate-500 font-bold">Weekly Adherence</p>
              <p class="text-2xl font-black text-teal-600 font-heading">95.2%</p>
            </div>
            <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <p class="text-[11px] text-slate-500 font-bold">Speech Loudness Avg</p>
              <p class="text-2xl font-black text-indigo-600 font-heading">69.4 dB</p>
            </div>
            <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <p class="text-[11px] text-slate-500 font-bold">Tremor Variance</p>
              <p class="text-2xl font-black text-amber-500 font-heading">1.2 cm</p>
            </div>
            <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <p class="text-[11px] text-slate-500 font-bold">Assisted Tasks</p>
              <p class="text-2xl font-black text-rose-500 font-heading">4 Tasks</p>
            </div>
          </div>
        `;
      }
    }

    /* ==================== 1. ROLE ISOLATION & SESSION ==================== */

    function updateCareTeamDetails(userObj) {
      let profile = userObj || {};
      if (!userObj) {
        try { profile = JSON.parse(localStorage.getItem('saksham_active_user') || '{}'); } catch (e) { profile = {}; }
      }

      const patientName = profile.name || 'Patient';
      const caregiverName = (profile.caregiverName || '').trim();
      const caregiverPhone = (profile.caregiverPhone || '').trim();
      const doctorName = (profile.doctorName || profile.attendingDoctorName || '').trim();
      const doctorPhone = (profile.doctorPhone || profile.attendingDoctorPhone || '').trim();
      const phoneDigits = value => value.replace(/[^0-9+]/g, '');
      const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
      };
      const setCallLink = (id, phone, nameId, phoneId) => {
        const link = document.getElementById(id);
        if (!link) return;
        const nameEl = document.getElementById(nameId);
        const phoneEl = document.getElementById(phoneId);
        if (phone) {
          link.href = `tel:${phoneDigits(phone)}`;
          link.classList.remove('hidden');
          link.classList.add('flex');
          if (phoneEl) phoneEl.innerText = phone;
        } else {
          link.classList.add('hidden');
          link.classList.remove('flex');
          if (nameEl) nameEl.innerText = nameId.includes('Doctor') ? 'Doctor not configured' : 'Caregiver not configured';
          if (phoneEl) phoneEl.innerText = '';
        }
      };

      setText('patientCaregiverLabel', caregiverName ? `Caregiver: ${caregiverName}` : 'Caregiver not configured');
      setText('patientCaregiverNotify', caregiverName ? `Notify ${caregiverName} to check in on you` : 'Notify your caregiver to check in on you');
      setText('patientCareTeamNames', caregiverName || doctorName
        ? [doctorName, caregiverName].filter(Boolean).join(' & ')
        : 'Care team details not configured');
      setText('patientDoctorDirectivesTitle', doctorName ? `${doctorName}'s Directives` : "Doctor's Directives");
      setText('patientCaregiverNotesTitle', caregiverName ? `${caregiverName}'s Reminders` : "Caregiver's Reminders");
      setCallLink('patientCaregiverCall', caregiverPhone, 'patientCaregiverLabel', null);

      setText('emergencyCaregiverName', caregiverName ? `${caregiverName} (Caregiver)` : 'Caregiver not configured');
      setText('emergencyWhatsAppText', caregiverName ? `Sends an urgent message to ${caregiverName}` : 'Caregiver contact is not configured');
      setCallLink('emergencyCaregiverCall', caregiverPhone, 'emergencyCaregiverName', 'emergencyCaregiverPhone');
      setText('emergencyDoctorName', doctorName || 'Doctor not configured');
      setCallLink('emergencyDoctorCall', doctorPhone, 'emergencyDoctorName', 'emergencyDoctorPhone');

      setText('caregiverPortalTitle', caregiverName ? `${caregiverName} - Patient Care Oversight Hub` : 'Caregiver Portal');
      setText('caregiverPortalSubtitle', `Patient: ${patientName}`);
      setText('doctorPortalTitle', doctorName ? `${doctorName} - Telemetry Portal` : 'Clinician Portal');
      setText('doctorPortalSubtitle', `Patient: ${patientName}`);
    }


    function applyRolePermissions(role, userObj) {
      state.role = role || 'patient';
      state.uid = userObj?.patientWorkspaceUid || userObj?.firebaseUid || userObj?.id || state.uid;

      // Set body role class for bulletproof CSS isolation
      document.body.classList.remove('role-patient', 'role-caregiver', 'role-doctor');
      document.body.classList.add('role-' + (role || 'patient'));

      // Strictly isolate patient-only features (badges, audio cue bar, 3D cube)
      document.querySelectorAll('.patient-only-feature').forEach(el => {
        el.style.display = (role === 'patient') ? '' : 'none';
      });
      
      const navPatient = document.getElementById('nav-patient');
      const navCaregiver = document.getElementById('nav-caregiver');
      const navDoctor = document.getElementById('nav-doctor');
      const navAdmin = document.getElementById('nav-admin');
      const mobBottomNav = document.getElementById('mobile-bottom-nav');
      const mobPatientViews = document.getElementById('mobDrawerPatientViews');

      const portalPatient = document.getElementById('portal-patient-container');
      const portalCaregiver = document.getElementById('portal-caregiver-container');
      const portalDoctor = document.getElementById('portal-doctor-container');
      const portalAdmin = document.getElementById('portal-admin-container');

      const badge = document.getElementById('headerRoleBadge');
      const roleTxt = document.getElementById('txtHeaderRoleName');
      const avatarDot = document.getElementById('userAvatarDot');

      // Helper to strictly hide an element and avoid media query overrides
      const hideElem = (el) => {
        if (!el) return;
        el.classList.add('hidden');
        el.classList.remove('md:block', 'flex', 'block');
        el.style.display = 'none';
      };

      // Helper to cleanly show an element
      const showElem = (el, displayClass = '') => {
        if (!el) return;
        el.classList.remove('hidden');
        if (displayClass) el.classList.add(displayClass);
        el.style.display = '';
      };

      if (role === 'patient') {
        state.user = (userObj && userObj.name) ? userObj.name : 'Patient';
        if (roleTxt) roleTxt.innerText = "Patient Portal";
        if (badge) badge.className = "text-[11px] px-3 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-extrabold uppercase tracking-wider border border-teal-400/40 backdrop-blur-xs flex items-center gap-1.5";
        if (avatarDot) avatarDot.className = "w-2.5 h-2.5 rounded-full bg-[#387D82]";
        
        // Navigation: Show patient desktop nav & mobile bottom nav, hide caregiver, doctor, admin
        showElem(navPatient, 'md:block');
        hideElem(navCaregiver);
        hideElem(navDoctor);
        hideElem(navAdmin);
        showElem(mobBottomNav);
        showElem(mobPatientViews);

        // Portals: Show patient, hide caregiver, doctor, admin
        showElem(portalPatient);
        hideElem(portalCaregiver);
        hideElem(portalDoctor);
        hideElem(portalAdmin);

        // Determine condition with alias normalization
        let activeCond = userObj?.condition || 'parkinsons';
        if (activeCond === 'both' || activeCond === 'parkinsons_dementia') activeCond = 'dementia';
        const condTabs = window.SAKSHAM_CONDITION_TABS || (window.SakshamOnboarding && window.SakshamOnboarding.CONDITION_TABS) || {
          parkinsons: ['routine', 'games', 'movement', 'nutrition', 'calendar-hub'],
          alzheimers: ['routine', 'games', 'vault', 'nutrition', 'calendar-hub'],
          dementia: ['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub'],
          parkinsons_dementia: ['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub'],
          both: ['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub'],
          other: ['routine', 'games', 'nutrition', 'calendar-hub']
        };
        const allowed = (condTabs && (condTabs[activeCond] || condTabs['parkinsons'])) || condTabs.parkinsons;
        // Restore previously active tab if valid for this condition, otherwise default to 'routine'
        const savedTab = localStorage.getItem('saksham_active_tab');
        const targetTab = (savedTab && allowed.includes(savedTab))
          ? savedTab
          : ((allowed && allowed.includes('routine')) ? 'routine' : (allowed ? allowed[0] : 'routine'));
        switchTab(targetTab);

        // Dynamic, personalized greeting
        const greeting = document.getElementById('lblGreeting');
        if (greeting) {
          greeting.innerHTML = `Good Morning, ${state.user}! 🌿`;
        }

        // Apply condition-based care modules if configured
        if (window.SakshamOnboarding && typeof window.SakshamOnboarding.applyDiseaseModules === 'function') {
          window.SakshamOnboarding.applyDiseaseModules(activeCond);
        }
        if (typeof window.setAgeTier === 'function') {
          const prefTier = localStorage.getItem('saksham_age_tier') || window.currentAgeTier || userObj?.ageTier || 'youth';
          window.setAgeTier(prefTier, false);
        }
      } else if (role === 'caregiver') {
        state.user = (userObj && userObj.name) ? userObj.name : 'Caregiver';
        if (roleTxt) roleTxt.innerText = "Caregiver Hub";
        if (badge) badge.className = "text-[11px] px-3 py-0.5 rounded-full bg-[#387D82]/30 text-[#9FC57C] font-extrabold uppercase tracking-wider border border-[#9FC57C]/40 backdrop-blur-xs flex items-center gap-1.5";
        if (avatarDot) avatarDot.className = "w-2.5 h-2.5 rounded-full bg-[#1B4225]";

        // Navigation: Hide patient, doctor, admin nav; show caregiver nav
        hideElem(navPatient);
        showElem(navCaregiver);
        hideElem(navDoctor);
        hideElem(navAdmin);
        showElem(mobBottomNav);
        hideElem(mobPatientViews);

        // Portals: Hide patient, doctor, admin; show caregiver portal
        hideElem(portalPatient);
        showElem(portalCaregiver);
        hideElem(portalDoctor);
        hideElem(portalAdmin);
        const savedCgTab = localStorage.getItem('saksham_active_cg_subtab') || 'cg-overview';
        switchCaregiverSubTab(savedCgTab);
      } else if (role === 'doctor') {
        state.user = (userObj && userObj.name) ? userObj.name : 'Clinician';
        if (roleTxt) roleTxt.innerText = "Clinician Portal";
        if (badge) badge.className = "text-[11px] px-3 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-extrabold uppercase tracking-wider border border-sky-400/40 backdrop-blur-xs flex items-center gap-1.5";
        if (avatarDot) avatarDot.className = "w-2.5 h-2.5 rounded-full bg-sky-500";

        // Navigation: Hide patient, caregiver, admin nav; show doctor nav
        hideElem(navPatient);
        hideElem(navCaregiver);
        showElem(navDoctor);
        hideElem(navAdmin);
        showElem(mobBottomNav);
        hideElem(mobPatientViews);

        // Portals: Hide patient, caregiver, admin; show doctor portal
        hideElem(portalPatient);
        hideElem(portalCaregiver);
        showElem(portalDoctor);
        hideElem(portalAdmin);
        const savedDocTab = localStorage.getItem('saksham_active_doc_subtab') || 'doc-telemetry';
        switchDoctorSubTab(savedDocTab);
      } else if (role === 'administrator') {
        state.user = (userObj && userObj.name) ? userObj.name : 'System Administrator';
        if (roleTxt) roleTxt.innerText = "System Administrator";
        if (badge) badge.className = "text-[11px] px-3 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-extrabold uppercase tracking-wider border border-purple-400/40 backdrop-blur-xs flex items-center gap-1.5";
        if (avatarDot) avatarDot.className = "w-2.5 h-2.5 rounded-full bg-purple-500";

        // Navigation: Hide patient, caregiver, doctor nav; show admin nav
        hideElem(navPatient);
        hideElem(navCaregiver);
        hideElem(navDoctor);
        showElem(navAdmin);
        showElem(mobBottomNav);
        hideElem(mobPatientViews);

        // Portals: Hide patient, caregiver, doctor; show admin portal
        hideElem(portalPatient);
        hideElem(portalCaregiver);
        hideElem(portalDoctor);
        showElem(portalAdmin);
        if (typeof window.switchAdminSubTab === 'function') {
          window.switchAdminSubTab('adm-users');
        }
        if (typeof window.renderAdminPortal === 'function') {
          window.renderAdminPortal();
        }
      }

      updateCareTeamDetails(userObj);

      // Sync role-tailored AI chips and mobile bottom navigation bar
      updateAiChipsForRole(role);
      updateMobileBottomNavForRole(role);

      const lblAuth = document.getElementById('lblAuthUser');
      if (lblAuth) lblAuth.innerText = state.user;
      const mobName = document.getElementById('mobDrawerUserName');
      if (mobName) mobName.innerText = state.user;
      const mobRole = document.getElementById('mobDrawerRole');
      if (mobRole) mobRole.innerText = role === 'patient' ? 'Patient' : (role === 'caregiver' ? 'Caregiver' : 'Doctor');

      const headerRoleBadge = document.getElementById('headerProfileRoleBadge');
      if (headerRoleBadge) {
        if (role === 'patient') {
          headerRoleBadge.innerText = '🌿 Patient';
          headerRoleBadge.className = 'text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#9FC57C]/20 text-[#9FC57C] border border-[#9FC57C]/40';
        } else if (role === 'caregiver') {
          headerRoleBadge.innerText = '🛡️ Caregiver';
          headerRoleBadge.className = 'text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/40';
        } else if (role === 'doctor') {
          headerRoleBadge.innerText = '🩺 Clinician';
          headerRoleBadge.className = 'text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40';
        }
      }

      // Synchronize profile photos for active role
      try {
        if (typeof updateProfileAvatars === 'function') {
          updateProfileAvatars(role);
        }
      } catch (e) {
        console.warn('[Avatar Sync Error]', e);
      }

      renderTimeframeInsights();
      if (role === 'patient' && typeof renderPatientCareTeamMessages === 'function') {
        renderPatientCareTeamMessages();
      }
      // Defer heavy renders (charts, telemetry) to idle time to prevent UI lag
      const runWhenIdle = typeof requestIdleCallback === 'function'
        ? (fn) => requestIdleCallback(fn, { timeout: 1000 })
        : (fn) => setTimeout(fn, 50);
      runWhenIdle(() => {
        if (role === 'caregiver' && typeof renderCaregiverOverviewTelemetry === 'function') {
          try { renderCaregiverOverviewTelemetry(); } catch(e) {}
        }
        if (typeof updateChartsData === 'function') {
          try { updateChartsData(); } catch(e) {}
        }
      });
    }

    function selectQuickPersona(role) {
      closeAuthModal();
      let name = '';
      if (role === 'patient') name = 'Kalyani Sharma';
      else if (role === 'caregiver') name = 'Aarav Sharma (Caregiver)';
      else if (role === 'doctor') name = 'Dr. Rajesh Verma, MD';
      const userObj = { name, role, lang: 'en' };
      localStorage.setItem('saksham_active_user', JSON.stringify(userObj));
      applyRolePermissions(role, userObj);
      playAudioChime('chime');
    }

    window.openPatientOnboarding = function(isEditMode = false, startStep = null) {
      const drawer = document.getElementById('mobileToolsDrawer');
      if (drawer) drawer.classList.add('hidden');
      const dropdown = document.getElementById('headerMenuDropdown');
      if (dropdown) dropdown.classList.add('hidden');
      if (window.SakshamOnboarding && typeof window.SakshamOnboarding.open === 'function') {
        window.SakshamOnboarding.open(isEditMode, startStep);
      }
    };

window.SAKSHAM_PATIENT_TABS = [
  { key: 'routine', id: 'tab-routine', icon: '<i class="fa-solid fa-list-check"></i>', title: 'Daily Routine & Cues', i18n: 'nav_routine' },
  { key: 'games', id: 'tab-games', icon: '<i class="fa-solid fa-puzzle-piece text-indigo-500"></i>', title: 'Mind Clinic Games', i18n: 'nav_games' },
  { key: 'vault', id: 'tab-vault', icon: '<i class="fa-solid fa-heart text-rose-500"></i>', title: 'Loved Ones & Peace', i18n: 'nav_vault' },
  { key: 'movement', id: 'tab-movement', icon: '<i class="fa-solid fa-person-walking text-teal-600"></i>', title: 'Movement & Speech', i18n: 'nav_movement' },
  { key: 'nutrition', id: 'tab-nutrition', icon: '<i class="fa-solid fa-book-medical text-amber-500"></i>', title: 'Articles & Wellbeing', i18n: 'nav_nutrition' },
  { key: 'calendar-hub', id: 'tab-calendar-hub', icon: '<i class="fa-solid fa-calendar-check text-purple-600"></i>', title: 'Calendar & Tracker', i18n: 'nav_calendar_hub' }
];

function renderSequentialPatientTabs(allowed, effectiveTab) {
  let seqIdx = 1;
  const langKey = (typeof currentLang !== 'undefined') ? currentLang : 'en';
  const dict = (typeof I18N_DICTIONARY !== 'undefined' && I18N_DICTIONARY[langKey]) ? I18N_DICTIONARY[langKey] : null;

  window.SAKSHAM_PATIENT_TABS.forEach(tab => {
    const btn = document.getElementById(tab.id);
    if (!btn) return;

    if (allowed.includes(tab.key)) {
      btn.classList.remove('hidden');
      btn.style.display = '';

      let labelText = tab.title;
      if (dict && dict[tab.i18n]) {
        // Strip any hardcoded leading sequence numbering like "1. ", "4. "
        labelText = dict[tab.i18n].replace(/^\d+[\.\s\-]+\s*/, '');
      }

      btn.innerHTML = `${tab.icon} <span data-i18n-tab="${tab.i18n}">${seqIdx}. ${labelText}</span>`;

      if (tab.key === effectiveTab) {
        btn.className = "nav-tab-btn px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md flex items-center gap-2 whitespace-nowrap";
      } else {
        btn.className = "nav-tab-btn px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-2 whitespace-nowrap";
      }
      seqIdx++;
    } else {
      btn.classList.add('hidden');
      btn.style.display = 'none';
    }
  });
}
window.renderSequentialPatientTabs = renderSequentialPatientTabs;

    function switchTab(tabKey) {
      // 1. Determine active condition & allowed tabs
      let activeCond = 'parkinsons';
      try {
        const stored = JSON.parse(localStorage.getItem('saksham_active_user') || '{}');
        if (stored.condition) activeCond = stored.condition;
        else if (window.SakshamOnboarding && typeof window.SakshamOnboarding.getState === 'function') {
          activeCond = window.SakshamOnboarding.getState().condition || 'parkinsons';
        }
      } catch (e) {}

      if (activeCond === 'both' || activeCond === 'parkinsons_dementia') activeCond = 'dementia';
      const condTabs = window.SAKSHAM_CONDITION_TABS || (window.SakshamOnboarding && window.SakshamOnboarding.CONDITION_TABS) || {
        parkinsons: ['routine', 'games', 'movement', 'nutrition', 'calendar-hub'],
        alzheimers: ['routine', 'games', 'vault', 'nutrition', 'calendar-hub'],
        dementia: ['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub'],
        parkinsons_dementia: ['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub'],
        both: ['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub'],
        other: ['routine', 'games', 'nutrition', 'calendar-hub']
      };
      const allowed = condTabs[activeCond] || condTabs['parkinsons'];

      // If requested tab is not allowed for this disease profile, redirect safely
      let effectiveTab = tabKey;
      if (!allowed.includes(tabKey)) {
        console.warn(`[Saksham Guard] Tab '${tabKey}' is restricted for condition '${activeCond}'. Redirecting to primary.`);
        effectiveTab = allowed.includes('routine') ? 'routine' : (allowed[0] || 'routine');
      }

      // Persist active tab so page refresh preserves current view
      try {
        localStorage.setItem('saksham_active_tab', effectiveTab);
      } catch (e) {}

      // Ensure patient portal container is visible
      const portalPatient = document.getElementById('portal-patient-container');
      if (portalPatient) {
        portalPatient.classList.remove('hidden');
        portalPatient.style.display = '';
      }

      // Hide all patient tab views
      document.querySelectorAll('#portal-patient-container .tab-view').forEach(view => {
        view.classList.add('hidden');
        try { view.style.display = 'none'; } catch (e) {}
      });

      // Update Desktop Tab Buttons — STRICTLY show ONLY allowed tabs in sequential order (1, 2, 3...)
      renderSequentialPatientTabs(allowed, effectiveTab);

      const targetView = document.getElementById(`view-${effectiveTab}`);
      if (targetView) {
        targetView.classList.remove('hidden');
        try { targetView.style.display = ''; } catch (e) {}
      }

      // Spoken voiceover for accessibility
      if (typeof speakText === 'function' && typeof voiceoverEnabled !== 'undefined' && voiceoverEnabled) {
        const tabNames = {
          'games': 'Mind Clinic Games',
          'movement': 'Movement and Speech Therapy',
          'vault': 'Loved Ones and Peace Vault',
          'nutrition': 'Articles and Wellbeing',
          'calendar-hub': 'Calendar and Tracker',
          'routine': 'Daily Routine and Cues'
        };
        if (tabNames[effectiveTab]) {
          speakText(tabNames[effectiveTab]);
        }
      }

      if (effectiveTab === 'games') {
        try {
          if (typeof switchMiniGame === 'function') switchMiniGame(1);
        } catch (e) {}
      }
      if (effectiveTab === 'vault') loadFaceQuizCard(0);
      if (effectiveTab === 'calendar-hub') renderInteractiveMonthlyGrid();

      // Sync Mobile Bottom Navigation Active Highlight
      const mobMap = {
        'routine': 'mob-nav-routine',
        'games': 'mob-nav-games',
        'vault': 'mob-nav-vault',
        'movement': 'mob-nav-movement',
        'nutrition': 'mob-nav-nutrition',
        'calendar-hub': 'mob-nav-calendar'
      };
      document.querySelectorAll('.mob-nav-item').forEach(b => {
        b.classList.remove('text-[#9FC57C]');
        b.classList.add('text-[#F5F4E0]/70');
        const iconBox = b.querySelector('div');
        if (iconBox) {
          iconBox.classList.remove('bg-[#387D82]/30', 'ring-1', 'ring-[#9FC57C]/40', 'shadow-xs');
        }
      });
      const activeMobId = mobMap[effectiveTab];
      if (activeMobId) {
        const activeBtn = document.getElementById(activeMobId);
        if (activeBtn) {
          activeBtn.classList.remove('text-[#F5F4E0]/70');
          activeBtn.classList.add('text-[#9FC57C]');
          const iconBox = activeBtn.querySelector('div');
          if (iconBox) {
            iconBox.classList.add('bg-[#387D82]/30', 'ring-1', 'ring-[#9FC57C]/40', 'shadow-xs');
          }
        }
      }
    }

    function switchCaregiverSubTab(subId) {
      if (state.role === 'patient') {
        alert("Caregiver Hub is protected for patient safety. Your care team notes are available in your Patient Dashboard.");
        switchTab('routine');
        return;
      }
      if (subId === 'cg-schedule') subId = 'cg-overview';
      try { localStorage.setItem('saksham_active_cg_subtab', subId); } catch (e) {}
      ['cg-overview', 'cg-notes', 'cg-gps'].forEach(id => {
        const view = document.getElementById(`cg-subview-${id.replace('cg-', '')}`);
        const btn = document.getElementById(`tab-${id}`);
        if (view) view.classList.toggle('hidden', id !== subId);
        if (btn) {
          if (id === subId) {
            btn.className = "cg-subnav-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md flex items-center gap-2 whitespace-nowrap";
          } else {
            btn.className = "cg-subnav-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-2 whitespace-nowrap";
          }
        }
      });

      // Sync Mobile Bottom Navigation Active Highlight for Caregiver
      const cgMobMap = {
        'cg-overview': 'mob-cg-overview',
        'cg-notes': 'mob-cg-notes',
        'cg-gps': 'mob-cg-gps'
      };
      document.querySelectorAll('#mobile-bottom-nav .mob-nav-item').forEach(b => {
        b.classList.remove('text-[#9FC57C]');
        b.classList.add('text-[#F5F4E0]/70');
        const iconBox = b.querySelector('div');
        if (iconBox) iconBox.classList.remove('bg-[#387D82]/30', 'ring-1', 'ring-[#9FC57C]/40', 'shadow-xs');
      });
      const activeCgMob = document.getElementById(cgMobMap[subId]);
      if (activeCgMob) {
        activeCgMob.classList.remove('text-[#F5F4E0]/70');
        activeCgMob.classList.add('text-[#9FC57C]');
        const iconBox = activeCgMob.querySelector('div');
        if (iconBox) iconBox.classList.add('bg-[#387D82]/30', 'ring-1', 'ring-[#9FC57C]/40', 'shadow-xs');
      }

      if (subId === 'cg-overview') {
        if (typeof renderCaregiverOverviewTelemetry === 'function') {
          renderCaregiverOverviewTelemetry();
        }
        if (typeof caregiverPieChartInst !== 'undefined' && caregiverPieChartInst) caregiverPieChartInst.resize();
        if (typeof caregiverBarChartInst !== 'undefined' && caregiverBarChartInst) caregiverBarChartInst.resize();
      }
      if (subId === 'cg-schedule') renderCaregiverManagedTasks();
      if (subId === 'cg-notes') renderCaregiverNotes();
      if (subId === 'cg-gps') {
        if (window.SakshamGpsTracker && typeof window.SakshamGpsTracker.initMap === 'function') {
          window.SakshamGpsTracker.initMap();
        }
      }
    }

    function switchDoctorSubTab(subId) {
      if (state.role === 'patient') {
        alert("Clinician Portal is protected. Your doctor directives are available in your Patient Dashboard.");
        switchTab('routine');
        return;
      }
      try { localStorage.setItem('saksham_active_doc_subtab', subId); } catch (e) {}
      ['doc-telemetry', 'doc-directives', 'doc-reports'].forEach(id => {
        const view = document.getElementById(`doc-subview-${id.replace('doc-', '')}`);
        const btn = document.getElementById(`tab-${id}`);
        if (view) view.classList.toggle('hidden', id !== subId);
        if (btn) {
          if (id === subId) {
            btn.className = "doc-subnav-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all bg-gradient-to-r from-sky-600 to-teal-600 text-white shadow-md flex items-center gap-2 whitespace-nowrap";
          } else {
            btn.className = "doc-subnav-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center gap-2 whitespace-nowrap";
          }
        }
      });

      // Sync Mobile Bottom Navigation Active Highlight for Doctor
      const docMobMap = {
        'doc-telemetry': 'mob-doc-telemetry',
        'doc-directives': 'mob-doc-directives',
        'doc-reports': 'mob-doc-reports'
      };
      document.querySelectorAll('#mobile-bottom-nav .mob-nav-item').forEach(b => {
        b.classList.remove('text-[#9FC57C]');
        b.classList.add('text-[#F5F4E0]/70');
        const iconBox = b.querySelector('div');
        if (iconBox) iconBox.classList.remove('bg-[#387D82]/30', 'ring-1', 'ring-[#9FC57C]/40', 'shadow-xs');
      });
      const activeDocMob = document.getElementById(docMobMap[subId]);
      if (activeDocMob) {
        activeDocMob.classList.remove('text-[#F5F4E0]/70');
        activeDocMob.classList.add('text-[#9FC57C]');
        const iconBox = activeDocMob.querySelector('div');
        if (iconBox) iconBox.classList.add('bg-[#387D82]/30', 'ring-1', 'ring-[#9FC57C]/40', 'shadow-xs');
      }

      if (subId === 'doc-telemetry') {
        renderDoctorLogs();
        if (doctorPieChartInst) doctorPieChartInst.resize();
        if (doctorBarChartInst) doctorBarChartInst.resize();
      }
      if (subId === 'doc-directives') renderDoctorDirectivesList();
    }

    /* ==================== ROLE-TAILORED AI CHIPS & MOBILE BOTTOM NAV ==================== */
    function updateAiChipsForRole(role) {
      const container = document.getElementById('aiQuickChipsBar');
      if (!container) return;

      if (role === 'caregiver') {
        container.innerHTML = `
          <button onclick="directOpenPage('overview')" class="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 text-xs font-black rounded-xl shadow-xs whitespace-nowrap flex items-center gap-1.5 active:scale-95 transition">
            <i class="fa-solid fa-chart-pie text-indigo-200"></i> <span>📊 Telemetry & Overview</span>
          </button>
          <button onclick="directOpenPage('gps')" class="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:opacity-90 text-xs font-black rounded-xl shadow-xs whitespace-nowrap flex items-center gap-1.5 active:scale-95 transition">
            <i class="fa-solid fa-location-dot text-emerald-200"></i> <span>📍 Live Patient GPS</span>
          </button>
          <button onclick="directOpenPage('notes')" class="px-3 py-2 bg-white hover:bg-teal-50 text-teal-800 text-xs font-bold rounded-xl border border-teal-200 whitespace-nowrap shadow-2xs flex items-center gap-1.5 active:scale-95 transition">
            <i class="fa-solid fa-book-medical text-teal-600"></i> <span>📝 Clinical Notes</span>
          </button>
        `;
      } else if (role === 'doctor') {
        container.innerHTML = `
          <button onclick="switchDoctorSubTab('doc-telemetry')" class="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-teal-600 text-white hover:opacity-90 text-xs font-black rounded-xl shadow-xs whitespace-nowrap flex items-center gap-1.5 active:scale-95 transition">
            <i class="fa-solid fa-chart-line text-sky-200"></i> <span>📈 Telemetry & Logs</span>
          </button>
          <button onclick="switchDoctorSubTab('doc-directives')" class="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 text-xs font-black rounded-xl shadow-xs whitespace-nowrap flex items-center gap-1.5 active:scale-95 transition">
            <i class="fa-solid fa-clipboard-prescription text-amber-200"></i> <span>📋 Medical Directives</span>
          </button>
          <button onclick="switchDoctorSubTab('doc-reports')" class="px-3 py-2 bg-white hover:bg-teal-50 text-teal-800 text-xs font-bold rounded-xl border border-teal-200 whitespace-nowrap shadow-2xs flex items-center gap-1.5 active:scale-95 transition">
            <i class="fa-solid fa-file-signature text-teal-600"></i> <span>📄 Official Reports & PDF</span>
          </button>
        `;
      } else {
        // Patient role
        container.innerHTML = `
          <button onclick="directOpenPage('vault')" class="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:opacity-90 text-xs font-black rounded-xl shadow-xs whitespace-nowrap flex items-center gap-1.5 active:scale-95 transition">
            <i class="fa-solid fa-images text-amber-200"></i> <span id="chip-vault">📸 Loved Ones (Vault)</span>
          </button>
          <button onclick="directOpenPage('games')" class="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 text-xs font-black rounded-xl shadow-xs whitespace-nowrap flex items-center gap-1.5 active:scale-95 transition">
            <i class="fa-solid fa-gamepad text-amber-300"></i> <span id="chip-games">🎮 Mind Clinic Games</span>
          </button>
          <button onclick="directOpenPage('routine')" class="px-3 py-2 bg-white hover:bg-teal-50 text-teal-800 text-xs font-bold rounded-xl border border-teal-200 whitespace-nowrap shadow-2xs flex items-center gap-1.5 active:scale-95 transition">
            <span id="chip-routine">💊 Routine & Meds</span>
          </button>
          <button onclick="directOpenPage('movement')" class="px-3 py-2 bg-white hover:bg-rose-50 text-rose-800 text-xs font-bold rounded-xl border border-rose-200 whitespace-nowrap shadow-2xs flex items-center gap-1.5 active:scale-95 transition">
            <span id="chip-movement">🚶 Movement & Speech</span>
          </button>
          <button onclick="directOpenPage('nutrition')" class="px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 whitespace-nowrap shadow-2xs flex items-center gap-1.5 active:scale-95 transition">
            <span id="chip-nutrition">🥗 Nutrition & Diet</span>
          </button>
          <button onclick="directOpenPage('calendar-hub')" class="px-3 py-2 bg-white hover:bg-sky-50 text-sky-800 text-xs font-bold rounded-xl border border-sky-200 whitespace-nowrap shadow-2xs flex items-center gap-1.5 active:scale-95 transition">
            <span id="chip-calendar">📅 Calendar & Progress</span>
          </button>
        `;
      }
    }

    function updateMobileBottomNavForRole(role, conditionOverride) {
      const navContainer = document.getElementById('mobile-bottom-nav');
      if (!navContainer) return;

      if (role === 'caregiver') {
        navContainer.innerHTML = `
          <div class="grid grid-cols-4 h-16 items-center px-1">
            <button onclick="switchCaregiverSubTab('cg-overview')" id="mob-cg-overview" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#9FC57C] transition-all">
              <div class="w-8 h-8 rounded-xl bg-[#387D82]/30 ring-1 ring-[#9FC57C]/40 shadow-xs flex items-center justify-center text-sm">
                <i class="fa-solid fa-chart-pie"></i>
              </div>
              <span class="text-[10px] font-black mt-0.5 font-heading">Overview</span>
            </button>
            <button onclick="switchCaregiverSubTab('cg-notes')" id="mob-cg-notes" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#F5F4E0]/70 hover:text-white transition-all">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm">
                <i class="fa-solid fa-book-medical text-rose-300"></i>
              </div>
              <span class="text-[10px] font-bold mt-0.5">Notes</span>
            </button>
            <button onclick="switchCaregiverSubTab('cg-gps')" id="mob-cg-gps" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#F5F4E0]/70 hover:text-white transition-all">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm">
                <i class="fa-solid fa-location-dot text-emerald-300"></i>
              </div>
              <span class="text-[10px] font-bold mt-0.5">Live GPS</span>
            </button>
            <button onclick="openMobileToolsDrawer()" id="mob-nav-more" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#F5F4E0]/70 hover:text-white transition-all">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm">
                <i class="fa-solid fa-ellipsis text-[#9FC57C]"></i>
              </div>
              <span class="text-[10px] font-bold mt-0.5">More</span>
            </button>
          </div>
        `;
      } else if (role === 'doctor') {
        navContainer.innerHTML = `
          <div class="grid grid-cols-4 h-16 items-center px-1">
            <button onclick="switchDoctorSubTab('doc-telemetry')" id="mob-doc-telemetry" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#9FC57C] transition-all">
              <div class="w-8 h-8 rounded-xl bg-[#387D82]/30 ring-1 ring-[#9FC57C]/40 shadow-xs flex items-center justify-center text-sm">
                <i class="fa-solid fa-chart-line"></i>
              </div>
              <span class="text-[10px] font-black mt-0.5 font-heading">Telemetry</span>
            </button>
            <button onclick="switchDoctorSubTab('doc-directives')" id="mob-doc-directives" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#F5F4E0]/70 hover:text-white transition-all">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm">
                <i class="fa-solid fa-clipboard-prescription text-sky-300"></i>
              </div>
              <span class="text-[10px] font-bold mt-0.5">Directives</span>
            </button>
            <button onclick="switchDoctorSubTab('doc-reports')" id="mob-doc-reports" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#F5F4E0]/70 hover:text-white transition-all">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm">
                <i class="fa-solid fa-file-signature text-teal-300"></i>
              </div>
              <span class="text-[10px] font-bold mt-0.5">Reports</span>
            </button>
            <button onclick="openMobileToolsDrawer()" id="mob-nav-more" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#F5F4E0]/70 hover:text-white transition-all">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm">
                <i class="fa-solid fa-ellipsis text-[#9FC57C]"></i>
              </div>
              <span class="text-[10px] font-bold mt-0.5">More</span>
            </button>
          </div>
        `;
      } else {
        // Patient role - condition-tailored bottom navigation
        let cond = conditionOverride;
        if (!cond && window.SakshamOnboarding && typeof window.SakshamOnboarding.getState === 'function') {
          cond = window.SakshamOnboarding.getState().condition;
        }
        if (!cond) {
          try {
            const uStr = localStorage.getItem('saksham_active_user');
            if (uStr) {
              const u = JSON.parse(uStr);
              if (u.condition) cond = u.condition;
            }
          } catch(e) {}
        }
        cond = cond || 'parkinsons';

        if (cond === 'parkinsons') {
          // Parkinson's: Mind Clinic Games, Movement & Speech, Articles & Wellbeing, Calendar & Tracker, More
          navContainer.innerHTML = `
            <div class="grid grid-cols-5 h-16 items-center px-1">
              <button onclick="switchTab('games')" id="mob-nav-games" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#F5F4E0]/70 hover:text-white transition-all">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm">
                  <i class="fa-solid fa-puzzle-piece text-indigo-300"></i>
                </div>
                <span class="text-[10px] font-bold mt-0.5">Games</span>
              </button>
              <button onclick="switchTab('movement')" id="mob-nav-movement" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#F5F4E0]/70 hover:text-white transition-all">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm">
                  <i class="fa-solid fa-person-walking text-teal-300"></i>
                </div>
                <span class="text-[10px] font-bold mt-0.5">Movement</span>
              </button>
              <button onclick="switchTab('nutrition')" id="mob-nav-nutrition" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#F5F4E0]/70 hover:text-white transition-all">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm">
                  <i class="fa-solid fa-book-medical text-amber-300"></i>
                </div>
                <span class="text-[10px] font-bold mt-0.5">Articles</span>
              </button>
              <button onclick="switchTab('calendar-hub')" id="mob-nav-calendar" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#F5F4E0]/70 hover:text-white transition-all">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm">
                  <i class="fa-solid fa-calendar-check text-purple-300"></i>
                </div>
                <span class="text-[10px] font-bold mt-0.5">Calendar</span>
              </button>
              <button onclick="openMobileToolsDrawer()" id="mob-nav-more" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#F5F4E0]/70 hover:text-white transition-all">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm">
                  <i class="fa-solid fa-ellipsis text-[#9FC57C]"></i>
                </div>
                <span class="text-[10px] font-bold mt-0.5">More</span>
              </button>
            </div>
          `;
        } else {
          // Alzheimer's and Parkinson's Dementia Disease (& Other):
          // Routines, Games, Loved Ones, Calendar, More
          navContainer.innerHTML = `
            <div class="grid grid-cols-5 h-16 items-center px-1">
              <button onclick="switchTab('routine')" id="mob-nav-routine" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#9FC57C] transition-all">
                <div class="w-8 h-8 rounded-xl bg-[#387D82]/30 ring-1 ring-[#9FC57C]/40 shadow-xs flex items-center justify-center text-sm">
                  <i class="fa-solid fa-list-check"></i>
                </div>
                <span class="text-[10px] font-black mt-0.5 font-heading">Routines</span>
              </button>
              <button onclick="switchTab('games')" id="mob-nav-games" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#F5F4E0]/70 hover:text-white transition-all">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm">
                  <i class="fa-solid fa-puzzle-piece text-indigo-300"></i>
                </div>
                <span class="text-[10px] font-bold mt-0.5">Games</span>
              </button>
              <button onclick="switchTab('vault')" id="mob-nav-vault" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#F5F4E0]/70 hover:text-white transition-all">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm">
                  <i class="fa-solid fa-heart text-rose-300"></i>
                </div>
                <span class="text-[10px] font-bold mt-0.5">Loved Ones</span>
              </button>
              <button onclick="switchTab('calendar-hub')" id="mob-nav-calendar" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#F5F4E0]/70 hover:text-white transition-all">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm">
                  <i class="fa-solid fa-calendar-check text-purple-300"></i>
                </div>
                <span class="text-[10px] font-bold mt-0.5">Calendar</span>
              </button>
              <button onclick="openMobileToolsDrawer()" id="mob-nav-more" class="mob-nav-item flex flex-col items-center justify-center py-1 text-[#F5F4E0]/70 hover:text-white transition-all">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm">
                  <i class="fa-solid fa-ellipsis text-[#9FC57C]"></i>
                </div>
                <span class="text-[10px] font-bold mt-0.5">More</span>
              </button>
            </div>
          `;
        }

        // Highlight active tab icon in mobile bar
        syncActiveMobileNavHighlight();
      }
    }

    function syncActiveMobileNavHighlight(activeTabKey) {
      const mobActiveMap = {
        'routine': 'mob-nav-routine',
        'games': 'mob-nav-games',
        'vault': 'mob-nav-vault',
        'movement': 'mob-nav-movement',
        'nutrition': 'mob-nav-nutrition',
        'calendar-hub': 'mob-nav-calendar'
      };
      let activeTab = activeTabKey;
      if (!activeTab) {
        activeTab = Object.keys(mobActiveMap).find(t => {
          const v = document.getElementById(`view-${t}`);
          return v && !v.classList.contains('hidden');
        });
      }
      document.querySelectorAll('#mobile-bottom-nav .mob-nav-item').forEach(b => {
        b.classList.remove('text-[#9FC57C]');
        b.classList.add('text-[#F5F4E0]/70');
        const ib = b.querySelector('div');
        if (ib) ib.classList.remove('bg-[#387D82]/30', 'ring-1', 'ring-[#9FC57C]/40', 'shadow-xs');
      });
      if (activeTab && mobActiveMap[activeTab]) {
        const ab = document.getElementById(mobActiveMap[activeTab]);
        if (ab) {
          ab.classList.remove('text-[#F5F4E0]/70');
          ab.classList.add('text-[#9FC57C]');
          const ib = ab.querySelector('div');
          if (ib) ib.classList.add('bg-[#387D82]/30', 'ring-1', 'ring-[#9FC57C]/40', 'shadow-xs');
        }
      }
    }

    /* ==================== MOBILE TOOLS DRAWER CONDITION SYNC ==================== */
    function updateMobileDrawerConditionViews(condKey) {
      let cond = condKey;
      if (!cond && window.SakshamOnboarding && typeof window.SakshamOnboarding.getState === 'function') {
        cond = window.SakshamOnboarding.getState().condition;
      }
      if (!cond) {
        try {
          const uStr = localStorage.getItem('saksham_active_user');
          if (uStr) {
            const u = JSON.parse(uStr);
            if (u.condition) cond = u.condition;
          }
        } catch(e) {}
      }
      cond = cond || 'parkinsons';

      const drawerSection = document.getElementById('mobDrawerPatientViews');
      const movBtn = document.getElementById('mobDrawerMovementBtn');
      const nutBtn = document.getElementById('mobDrawerNutritionBtn');
      if (!drawerSection || !movBtn || !nutBtn) return;

      // Alzheimer's has NO movement module.
      // Parkinson's, Parkinson's Dementia, and Other have movement module.
      const hasMovement = (cond !== 'alzheimers');
      const hasArticles = true;

      if (hasMovement) {
        movBtn.classList.remove('hidden');
        movBtn.style.display = '';
      } else {
        movBtn.classList.add('hidden');
        movBtn.style.display = 'none';
      }

      if (hasArticles) {
        nutBtn.classList.remove('hidden');
        nutBtn.style.display = '';
      } else {
        nutBtn.classList.add('hidden');
        nutBtn.style.display = 'none';
      }

      // If only one button is visible (like Alzheimer's where Movement is hidden),
      // make the remaining button span full width (col-span-2)
      if (hasMovement && hasArticles) {
        drawerSection.classList.remove('hidden');
        movBtn.classList.remove('col-span-2');
        nutBtn.classList.remove('col-span-2');
      } else if (!hasMovement && hasArticles) {
        drawerSection.classList.remove('hidden');
        nutBtn.classList.add('col-span-2');
      } else if (hasMovement && !hasArticles) {
        drawerSection.classList.remove('hidden');
        movBtn.classList.add('col-span-2');
      } else {
        drawerSection.classList.add('hidden');
      }
    }

    window.updateAiChipsForRole = updateAiChipsForRole;
    window.updateMobileBottomNavForRole = updateMobileBottomNavForRole;
    window.updateMobileDrawerConditionViews = updateMobileDrawerConditionViews;
    window.syncActiveMobileNavHighlight = syncActiveMobileNavHighlight;
    window.switchTab = switchTab;

    // Listen for global condition changes and ensure docks across pages update
    document.addEventListener('saksham:conditionChanged', function(e) {
      try {
        const cond = e?.detail?.condition || (window.SakshamOnboarding && window.SakshamOnboarding.getState && window.SakshamOnboarding.getState().condition) || 'parkinsons';

        // Update mobile drawer & bottom nav specifically for new condition
        try { updateMobileDrawerConditionViews(cond); } catch (err) {}
        try { updateMobileBottomNavForRole('patient', cond); } catch (err) {}

        // Re-sync active mobile highlight to reflect any new buttons
        try { syncActiveMobileNavHighlight(); } catch (err) {}

        // Toggle any condition-sensitive elements across pages.
        // Convention: elements with `data-conditions="parkinsons,alzheimers"` will be shown only for listed conditions.
        document.querySelectorAll('[data-conditions]').forEach(el => {
          try {
            const list = (el.getAttribute('data-conditions') || '').split(',').map(s => s.trim()).filter(Boolean);
            if (list.length === 0) return;
            if (list.includes(cond)) {
              el.classList.remove('hidden');
              el.style.display = '';
            } else {
              el.classList.add('hidden');
              el.style.display = 'none';
            }
          } catch (ie) {}
        });

      } catch (outer) {
        console.warn('[nav] conditionChanged handler error', outer);
      }
    });

    /* ==================== MOBILE TOOLS DRAWER LOGIC ==================== */
    function openMobileToolsDrawer() {
      const drawer = document.getElementById('mobileToolsDrawer');
      if (drawer) {
        drawer.classList.remove('hidden');
        window.lockScroll();

        // sync condition-tailored views in drawer
        updateMobileDrawerConditionViews();

        // sync language
        const currentLang = localStorage.getItem('saksham_lang') || 'en';
        const sel = document.getElementById('mobileDrawerLangSelect');
        if (sel) sel.value = currentLang;
        // sync role & user display
        const rName = document.getElementById('mobDrawerRole');
        const uName = document.getElementById('mobDrawerUserName');
        if (rName) rName.innerText = state.role === 'patient' ? 'Patient' : (state.role === 'caregiver' ? 'Caregiver' : 'Doctor');
        if (uName) uName.innerText = state.user;
        // sync evening guard button
        const egBtn = document.getElementById('mobDrawerEveningBtn');
        if (egBtn) {
          egBtn.innerText = state.eveningGuardActive ? 'ON' : 'OFF';
          egBtn.className = state.eveningGuardActive 
            ? "px-3.5 py-2 rounded-xl bg-amber-500 text-stone-900 font-black text-xs shadow-xs" 
            : "px-3.5 py-2 rounded-xl bg-[#14331C] text-[#9FC57C] font-black text-xs border border-[#387D82]/50 shadow-xs";
        }
      }
    }

    function closeMobileToolsDrawer() {
      const drawer = document.getElementById('mobileToolsDrawer');
      if (drawer) drawer.classList.add('hidden');
      const ob = document.getElementById('patientOnboardingContainer');
      const isObOpen = ob && !ob.classList.contains('hidden') && ob.style.display !== 'none';
      if (!isObOpen) {
        window.unlockScroll();
      }
    }

    function openPrivacyModal() {
      const modal = document.getElementById('modalPrivacyPolicy');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        window.lockScroll();
      }
    }

    function closePrivacyModal() {
      const modal = document.getElementById('modalPrivacyPolicy');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        window.unlockScroll();
      }
    }

    /* ==================== CLOUD DATABASE SETTINGS MODAL ==================== */
    function updateModalDbStatus() {
      const txt = document.getElementById('dbModalStatusText');
      if (!txt) return;
      if (window.dbService) {
        const s = window.dbService.getStatus();
        if (s.state === 'connected') {
          txt.innerText = 'Connected: Cloud Firestore (saksham-2b5f0)';
          txt.className = 'text-emerald-700 font-black';
        } else if (s.state === 'local_fallback') {
          txt.innerText = 'Local Storage Mode (Offline / Unconfigured)';
          txt.className = 'text-amber-700 font-black';
        } else {
          txt.innerText = 'DB Offline (Error)';
          txt.className = 'text-rose-700 font-black';
        }
      }
    }

    function openDbSettingsModal() {
      const modal = document.getElementById('dbSettingsModal');
      if (modal) {
        const testRes = document.getElementById('dbTestResultStatus');
        if (testRes) testRes.innerText = '';
        updateModalDbStatus();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        window.lockScroll();
      }
    }

    function closeDbSettingsModal() {
      const modal = document.getElementById('dbSettingsModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        window.unlockScroll();
      }
    }

    async function saveDbSettings() {
      if (window.dbService) {
        const ok = await window.dbService.testConnection();
        if (ok) {
          playAudioChime('chime');
          alert("Connected to Firebase Cloud Firestore successfully! Synchronizing data...");
          window.dbService.hydrateAll(state.uid);
        } else {
          alert("Operating with local offline cache until Firebase endpoint responds.");
        }
      }
      closeDbSettingsModal();
    }

    async function testDbConnectionFromModal() {
      const statusEl = document.getElementById('dbTestResultStatus');
      if (statusEl) {
        statusEl.innerText = "Testing connection to Firebase project saksham-2b5f0...";
        statusEl.className = "text-xs font-bold text-amber-600";
      }
      if (window.dbService) {
        const ok = await window.dbService.testConnection();
        updateModalDbStatus();
        if (statusEl) {
          if (ok) {
            statusEl.innerText = "✅ Successfully connected to Cloud Firestore (saksham-2b5f0)!";
            statusEl.className = "text-xs font-bold text-emerald-600";
          } else {
            statusEl.innerText = "⚠️ Cloud Firestore offline. Persistent local cache is actively handling requests.";
            statusEl.className = "text-xs font-bold text-amber-600";
          }
        }
      }
    }

    function clearDbSettings() {
      if (window.SakshamDbConfig) {
        window.SakshamDbConfig.resetToDefault();
      }
      updateModalDbStatus();
      const statusEl = document.getElementById('dbTestResultStatus');
      if (statusEl) {
        statusEl.innerText = "Reset configuration to default Firebase project saksham-2b5f0.";
        statusEl.className = "text-xs font-bold text-teal-700";
      }
      alert("Reset configuration to default Firebase project saksham-2b5f0.");
    }


    function triggerOverwhelmReset() {
      document.getElementById('modalBreathing').classList.remove('hidden');
      document.getElementById('modalBreathing').classList.add('flex');
    }
    function closeBreathingModal() {
      document.getElementById('modalBreathing').classList.add('hidden');
      document.getElementById('modalBreathing').classList.remove('flex');
    }

    function openWakeCustomizer() { document.getElementById('modalWakeTime').classList.remove('hidden'); }
    function closeWakeCustomizer() { document.getElementById('modalWakeTime').classList.add('hidden'); }
    function saveWakeTime() {
      const val = document.getElementById('inputWakeTime').value;
      if (val) {
        state.wakeTime = val;
        document.getElementById('currentWakeTimeLabel').innerText = val;
        if (state.tasks.length > 0) state.tasks[0].time = val;
        renderDirectTasksList();
        renderActiveCueCard();
        closeWakeCustomizer();
      }
    }

    /* ==================== ROLE PROFILE PHOTO MANAGEMENT ==================== */
    const DEFAULT_PROFILE_PHOTOS = {
      patient: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
      caregiver: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      doctor: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&q=80'
    };

    function getRoleProfilePhoto(role) {
      const normRole = (role || (typeof state !== 'undefined' && state.role) || 'patient').toLowerCase();
      const stored = localStorage.getItem('saksham_profile_photo_' + normRole);
      if (stored) return stored;
      if (normRole === 'patient') {
        try {
          const active = JSON.parse(localStorage.getItem('saksham_active_user') || '{}');
          if (active.photoUrl) return active.photoUrl;
        } catch (e) {}
      }
      return DEFAULT_PROFILE_PHOTOS[normRole] || DEFAULT_PROFILE_PHOTOS.patient;
    }

    function setRoleProfilePhoto(role, photoData) {
      const normRole = (role || (typeof state !== 'undefined' && state.role) || 'patient').toLowerCase();
      localStorage.setItem('saksham_profile_photo_' + normRole, photoData);
      if (normRole === 'patient') {
        try {
          const active = JSON.parse(localStorage.getItem('saksham_active_user') || '{}');
          active.photoUrl = photoData;
          localStorage.setItem('saksham_active_user', JSON.stringify(active));
        } catch (e) {}
      }
      updateProfileAvatars((typeof state !== 'undefined' && state.role) || 'patient');
    }

    function updateProfileAvatars(currentRole) {
      const role = (currentRole || (typeof state !== 'undefined' && state.role) || 'patient').toLowerCase();
      const photo = getRoleProfilePhoto(role);

      const headerAvatarImg = document.getElementById('headerUserAvatarImg');
      if (headerAvatarImg) headerAvatarImg.src = photo;

      const headerBarAvatar = document.getElementById('headerBarAvatarImg');
      if (headerBarAvatar) headerBarAvatar.src = photo;

      const mobDrawerImg = document.getElementById('mobDrawerUserAvatarImg');
      if (mobDrawerImg) mobDrawerImg.src = photo;

      const obPreview = document.getElementById('obProfilePhotoPreview');
      if (obPreview) obPreview.src = getRoleProfilePhoto('patient');

      const subLbl = document.getElementById('lblAuthUserSub');
      const mobSubLbl = document.getElementById('mobDrawerUserSub');
      let subText = 'Patient #PD-8842';
      if (role === 'caregiver') subText = 'Primary Caregiver';
      else if (role === 'doctor') subText = 'Attending Neurologist';
      if (subLbl) subLbl.innerText = subText;
      if (mobSubLbl) mobSubLbl.innerText = subText;
    }

    let activePhotoModalRole = 'patient';
    function openProfilePhotoChangeModal(targetRole) {
      activePhotoModalRole = targetRole || (typeof state !== 'undefined' && state.role) || 'patient';
      if (activePhotoModalRole === 'administrator') activePhotoModalRole = 'doctor';
      const modal = document.getElementById('modalProfilePhoto');
      if (!modal) return;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      if (typeof window.lockScroll === 'function') window.lockScroll();
      renderProfilePhotoModalUI();
    }

    function closeProfilePhotoChangeModal() {
      const modal = document.getElementById('modalProfilePhoto');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
      if (typeof window.unlockScroll === 'function') window.unlockScroll();
    }

    function selectProfilePhotoRoleTab(role) {
      activePhotoModalRole = role;
      renderProfilePhotoModalUI();
    }

    function renderProfilePhotoModalUI() {
      const roles = ['patient', 'caregiver', 'doctor'];
      roles.forEach(r => {
        const tabBtn = document.getElementById(`photoRoleTab_${r}`);
        if (tabBtn) {
          if (r === activePhotoModalRole) {
            tabBtn.className = "flex-1 py-2 px-2.5 rounded-xl text-xs font-black bg-[#1B4225] text-white shadow-sm flex items-center justify-center gap-1.5 transition";
          } else {
            tabBtn.className = "flex-1 py-2 px-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center gap-1.5 transition";
          }
        }
      });

      const preview = document.getElementById('modalPhotoPreviewImg');
      if (preview) {
        preview.src = getRoleProfilePhoto(activePhotoModalRole);
      }

      const roleTitle = document.getElementById('modalPhotoRoleTitle');
      const roleSubtitle = document.getElementById('modalPhotoRoleSubtitle');
      if (roleTitle) {
        if (activePhotoModalRole === 'patient') roleTitle.innerText = "Kalyani Sharma (Patient)";
        else if (activePhotoModalRole === 'caregiver') roleTitle.innerText = "Aarav Sharma (Caregiver)";
        else roleTitle.innerText = "Dr. Rajesh Verma, MD (Doctor)";
      }
      if (roleSubtitle) {
        if (activePhotoModalRole === 'patient') roleSubtitle.innerText = "Active care recipient • Daily routine and cues";
        else if (activePhotoModalRole === 'caregiver') roleSubtitle.innerText = "Primary caregiver • Telemetry & emergency hub";
        else roleSubtitle.innerText = "Attending neurologist • Directives & clinical telemetry";
      }
    }

    function triggerProfilePhotoCamera() {
      closeProfilePhotoChangeModal();
      window._webcamPhotoCallback = function(snapshot) {
        if (snapshot) {
          setRoleProfilePhoto(activePhotoModalRole, snapshot);
          if (typeof showSakshamToast === 'function') {
            showSakshamToast(`📸 Profile photo updated for ${activePhotoModalRole}!`, 'success');
          }
          if (typeof playAudioChime === 'function') playAudioChime('chime');
        }
      };
      if (typeof openLiveFaceScanModal === 'function') {
        openLiveFaceScanModal();
      }
    }

    async function handleProfilePhotoFileSelect(event) {
      const file = event?.target?.files?.[0];
      if (!file) return;
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target.result;
          setRoleProfilePhoto(activePhotoModalRole, dataUrl);
          const preview = document.getElementById('modalPhotoPreviewImg');
          if (preview) preview.src = dataUrl;
          if (typeof showSakshamToast === 'function') {
            showSakshamToast(`📁 Photo loaded for ${activePhotoModalRole}!`, 'success');
          }
          if (typeof playAudioChime === 'function') playAudioChime('chime');
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('[Photo File Error]', err);
      }
      if (event.target) event.target.value = '';
    }

    async function pasteProfilePhotoFromClipboard() {
      try {
        if (navigator.clipboard && navigator.clipboard.read) {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            for (const type of item.types) {
              if (type.startsWith('image/')) {
                const blob = await item.getType(type);
                const reader = new FileReader();
                reader.onload = (e) => {
                  const dataUrl = e.target.result;
                  setRoleProfilePhoto(activePhotoModalRole, dataUrl);
                  const preview = document.getElementById('modalPhotoPreviewImg');
                  if (preview) preview.src = dataUrl;
                  if (typeof showSakshamToast === 'function') {
                    showSakshamToast(`📋 Photo pasted for ${activePhotoModalRole}!`, 'success');
                  }
                  if (typeof playAudioChime === 'function') playAudioChime('chime');
                };
                reader.readAsDataURL(blob);
                return;
              }
            }
          }
          if (typeof showSakshamToast === 'function') {
            showSakshamToast('No image found in clipboard. Copy an image first!', 'info');
          }
        } else {
          if (typeof showSakshamToast === 'function') {
            showSakshamToast('Clipboard reading not supported. Please use File or Camera.', 'info');
          }
        }
      } catch (err) {
        console.warn('[Clipboard Paste Error]', err);
        if (typeof showSakshamToast === 'function') {
          showSakshamToast('Please allow clipboard permission or choose a file.', 'info');
        }
      }
    }

    function resetProfilePhotoToDefault() {
      localStorage.removeItem('saksham_profile_photo_' + activePhotoModalRole);
      updateProfileAvatars((typeof state !== 'undefined' && state.role) || 'patient');
      const preview = document.getElementById('modalPhotoPreviewImg');
      if (preview) preview.src = getRoleProfilePhoto(activePhotoModalRole);
      if (typeof showSakshamToast === 'function') {
        showSakshamToast(`🔄 Reset ${activePhotoModalRole} photo to default`, 'info');
      }
    }

    window.getRoleProfilePhoto = getRoleProfilePhoto;
    window.setRoleProfilePhoto = setRoleProfilePhoto;
    window.updateProfileAvatars = updateProfileAvatars;
    window.openProfilePhotoChangeModal = openProfilePhotoChangeModal;
    window.closeProfilePhotoChangeModal = closeProfilePhotoChangeModal;
    window.selectProfilePhotoRoleTab = selectProfilePhotoRoleTab;
    window.triggerProfilePhotoCamera = triggerProfilePhotoCamera;
    window.handleProfilePhotoFileSelect = handleProfilePhotoFileSelect;
    window.pasteProfilePhotoFromClipboard = pasteProfilePhotoFromClipboard;
    window.resetProfilePhotoToDefault = resetProfilePhotoToDefault;

    window.toggleHeaderMenu = toggleHeaderMenu;
    window.closeHeaderMenu = closeHeaderMenu;
    window.applyRolePermissions = applyRolePermissions;
    window.navigateToHomeForRole = navigateToHomeForRole;
    window.renderTimeframeInsights = renderTimeframeInsights;
    window.triggerOverwhelmReset = triggerOverwhelmReset;
    window.closeBreathingModal = closeBreathingModal;
    window.openWakeCustomizer = openWakeCustomizer;
    window.closeWakeCustomizer = closeWakeCustomizer;
    window.saveWakeTime = saveWakeTime;


