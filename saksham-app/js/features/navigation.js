/* ======================================================================= */
/* SAKSHAM NAVIGATION, ROLE ISOLATION & GLOBAL VIEW CONTROLLER             */
/* ======================================================================= */

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

      const dict = I18N_DICTIONARY[langKey] || I18N_DICTIONARY['en'];
      
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
          el.innerText = dict[key];
        }
      });

      // Update AI quick chips and voice prompt to match user's reading language
      updateAiQuickChips(langKey);
      updateBigVoiceButtonPrompt(langKey);

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

      // 2. Ensure patient portal view container & navigation are active and visible
      state.role = 'patient';
      const portalPatient = document.getElementById('portal-patient-container');
      const portalCaregiver = document.getElementById('portal-caregiver-container');
      const portalDoctor = document.getElementById('portal-doctor-container');
      const navPatient = document.getElementById('nav-patient');
      const navCaregiver = document.getElementById('nav-caregiver');
      const navDoctor = document.getElementById('nav-doctor');

      if (portalPatient) portalPatient.classList.remove('hidden');
      if (portalCaregiver) portalCaregiver.classList.add('hidden');
      if (portalDoctor) portalDoctor.classList.add('hidden');
      if (navPatient) navPatient.classList.remove('hidden');
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

      // 5. Close AI drawer immediately so patient lands directly on the page!
      toggleAiDrawer(false);

      // 6. Scroll smoothly to the target page section
      setTimeout(() => {
        const target = document.getElementById(`view-${tabKey}`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
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


    function applyRolePermissions(role, userObj) {
      state.role = role || 'patient';
      
      const navPatient = document.getElementById('nav-patient');
      const navCaregiver = document.getElementById('nav-caregiver');
      const navDoctor = document.getElementById('nav-doctor');
      const mobBottomNav = document.getElementById('mobile-bottom-nav');
      const mobPatientViews = document.getElementById('mobDrawerPatientViews');

      const portalPatient = document.getElementById('portal-patient-container');
      const portalCaregiver = document.getElementById('portal-caregiver-container');
      const portalDoctor = document.getElementById('portal-doctor-container');

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
        state.user = (userObj && userObj.name) ? userObj.name : 'Kalyani Sharma';
        if (roleTxt) roleTxt.innerText = "Patient Portal";
        if (badge) badge.className = "text-[11px] px-3 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-extrabold uppercase tracking-wider border border-teal-400/40 backdrop-blur-xs flex items-center gap-1.5";
        if (avatarDot) avatarDot.className = "w-2.5 h-2.5 rounded-full bg-[#387D82]";
        
        // Navigation: Show patient desktop nav & mobile bottom nav, hide caregiver & doctor
        showElem(navPatient, 'md:block');
        hideElem(navCaregiver);
        hideElem(navDoctor);
        showElem(mobBottomNav);
        showElem(mobPatientViews);

        // Portals: Show patient, hide caregiver & doctor
        showElem(portalPatient);
        hideElem(portalCaregiver);
        hideElem(portalDoctor);
        switchTab('routine');

        // Dynamic, personalized greeting
        const greeting = document.getElementById('lblGreeting');
        if (greeting) {
          greeting.innerHTML = `Good Morning, ${state.user}! 🌿`;
        }
      } else if (role === 'caregiver') {
        state.user = (userObj && userObj.name) ? userObj.name : 'Aarav Sharma (Caregiver)';
        if (roleTxt) roleTxt.innerText = "Caregiver Hub";
        if (badge) badge.className = "text-[11px] px-3 py-0.5 rounded-full bg-[#387D82]/30 text-[#9FC57C] font-extrabold uppercase tracking-wider border border-[#9FC57C]/40 backdrop-blur-xs flex items-center gap-1.5";
        if (avatarDot) avatarDot.className = "w-2.5 h-2.5 rounded-full bg-[#1B4225]";

        // Navigation: Hide patient desktop & mobile bottom nav, hide doctor nav, show caregiver nav
        hideElem(navPatient);
        showElem(navCaregiver);
        hideElem(navDoctor);
        hideElem(mobBottomNav);
        hideElem(mobPatientViews);

        // Portals: Hide patient & doctor, show caregiver portal
        hideElem(portalPatient);
        showElem(portalCaregiver);
        hideElem(portalDoctor);
        switchCaregiverSubTab('cg-overview');
      } else if (role === 'doctor') {
        state.user = (userObj && userObj.name) ? userObj.name : 'Dr. Rajesh Verma, MD';
        if (roleTxt) roleTxt.innerText = "Clinician Portal";
        if (badge) badge.className = "text-[11px] px-3 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-extrabold uppercase tracking-wider border border-sky-400/40 backdrop-blur-xs flex items-center gap-1.5";
        if (avatarDot) avatarDot.className = "w-2.5 h-2.5 rounded-full bg-sky-500";

        // Navigation: Hide patient desktop & mobile bottom nav, hide caregiver nav, show doctor nav
        hideElem(navPatient);
        hideElem(navCaregiver);
        showElem(navDoctor);
        hideElem(mobBottomNav);
        hideElem(mobPatientViews);

        // Portals: Hide patient & caregiver, show doctor portal
        hideElem(portalPatient);
        hideElem(portalCaregiver);
        showElem(portalDoctor);
        switchDoctorSubTab('doc-telemetry');
      }

      const lblAuth = document.getElementById('lblAuthUser');
      if (lblAuth) lblAuth.innerText = state.user;
      const mobName = document.getElementById('mobDrawerUserName');
      if (mobName) mobName.innerText = state.user;
      const mobRole = document.getElementById('mobDrawerRole');
      if (mobRole) mobRole.innerText = role === 'patient' ? 'Patient' : (role === 'caregiver' ? 'Caregiver' : 'Doctor');

      renderTimeframeInsights();
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

    function switchTab(tabKey) {
      document.querySelectorAll('#portal-patient-container .tab-view').forEach(view => view.classList.add('hidden'));
      document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.className = "nav-tab-btn px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-2 whitespace-nowrap";
      });

      const targetView = document.getElementById(`view-${tabKey}`);
      const targetBtn = document.getElementById(`tab-${tabKey}`);
      if (targetView) targetView.classList.remove('hidden');
      if (targetBtn) {
        targetBtn.className = "nav-tab-btn px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md flex items-center gap-2 whitespace-nowrap";
      }

      if (tabKey === 'vault') loadFaceQuizCard(0);
      if (tabKey === 'calendar-hub') renderInteractiveMonthlyGrid();

      // Sync Mobile Bottom Navigation Active Highlight
      const mobMap = {
        'routine': 'mob-nav-routine',
        'games': 'mob-nav-games',
        'vault': 'mob-nav-vault',
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
      const activeMobId = mobMap[tabKey];
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
      ['cg-overview', 'cg-alerts', 'cg-schedule', 'cg-notes'].forEach(id => {
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

      if (subId === 'cg-overview') {
        if (ringChartInst) ringChartInst.resize();
        if (lineChartInst) lineChartInst.resize();
      }
      if (subId === 'cg-alerts') renderCaregiverAlerts();
      if (subId === 'cg-schedule') renderCaregiverManagedTasks();
      if (subId === 'cg-notes') renderCaregiverNotes();
    }

    function switchDoctorSubTab(subId) {
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

      if (subId === 'doc-telemetry') {
        renderDoctorLogs();
        if (doctorPieChartInst) doctorPieChartInst.resize();
        if (doctorBarChartInst) doctorBarChartInst.resize();
      }
      if (subId === 'doc-directives') renderDoctorDirectivesList();
    }



    /* ==================== MOBILE TOOLS DRAWER LOGIC ==================== */
    function openMobileToolsDrawer() {
      const drawer = document.getElementById('mobileToolsDrawer');
      if (drawer) {
        drawer.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
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
      document.body.style.overflow = '';
    }

    function openPrivacyModal() {
      const modal = document.getElementById('modalPrivacyPolicy');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
      }
    }

    function closePrivacyModal() {
      const modal = document.getElementById('modalPrivacyPolicy');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
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
        document.body.style.overflow = 'hidden';
      }
    }

    function closeDbSettingsModal() {
      const modal = document.getElementById('dbSettingsModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
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


