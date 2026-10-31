/* ======================================================================= */
/* SAKSHAM 2-SECOND HARDWARE & TOUCH HOLD VOICE ASSISTANT TRIGGER          */
/* Wakes up "Hi Saksham, how can I help you?" via Volume / Power / Hold    */
/* ======================================================================= */

(function () {
  'use strict';

  const HOLD_DURATION_MS = 2000; // 2 seconds hold for desktop
  const HOLD_DURATION_MOBILE_MS = 1400; // 1.4 seconds on mobile avoids triggering native text selection popup
  let holdTimer = null;
  let holdStartTime = 0;
  let currentHoldDuration = HOLD_DURATION_MS;
  let progressInterval = null;
  let isHoldActive = false;
  let hiSakshamRecognition = null;
  let isHiSakshamListening = false;
  let hiSakshamSilenceTimer = null;
  let hiSakshamLatestTranscript = '';

  // Prevent mobile long-press contextmenu / text selection bubbles during hold
  window.addEventListener('contextmenu', (e) => {
    if (isHoldActive) {
      e.preventDefault();
      return false;
    }
  }, { capture: true });

  // Get active modal element (supports both modalHiSakshamAssist and legacy modalHiGeminiAssist)
  function getModal() {
    return document.getElementById('modalHiSakshamAssist') || document.getElementById('modalHiGeminiAssist');
  }

  // Visual Hold Progress HUD Management
  function showHoldHUD(durationMs = HOLD_DURATION_MS) {
    const hud = document.getElementById('sakshamHoldProgressHUD');
    const circle = document.getElementById('sakshamHoldProgressCircle');
    if (!hud) return;
    hud.classList.remove('hidden');
    hud.classList.add('flex');
    if (circle) circle.setAttribute('stroke-dashoffset', '100');

    document.body.classList.add('holding-screen-trigger');

    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
      const elapsed = Date.now() - holdStartTime;
      const progress = Math.min(1, elapsed / durationMs);
      const offset = 100 - (progress * 100);
      if (circle) circle.setAttribute('stroke-dashoffset', offset.toFixed(1));
    }, 40);
  }

  function hideHoldHUD() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    const hud = document.getElementById('sakshamHoldProgressHUD');
    const circle = document.getElementById('sakshamHoldProgressCircle');
    if (hud) {
      hud.classList.add('hidden');
      hud.classList.remove('flex');
    }
    if (circle) circle.setAttribute('stroke-dashoffset', '100');
    document.body.classList.remove('holding-screen-trigger');
  }

  function startHoldTimer(source) {
    if (holdTimer) return;
    const modal = getModal();
    if (modal && !modal.classList.contains('hidden') && modal.style.display !== 'none') return; // Already open

    const isMobile = source === 'touch_screen_hold';
    currentHoldDuration = isMobile ? HOLD_DURATION_MOBILE_MS : HOLD_DURATION_MS;
    holdStartTime = Date.now();
    isHoldActive = true;
    showHoldHUD(currentHoldDuration);

    holdTimer = setTimeout(() => {
      triggerHiSakshamActivation(source);
    }, currentHoldDuration);
  }

  function cancelHoldTimer() {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    hideHoldHUD();
    isHoldActive = false;
  }

  function triggerHiSakshamActivation(source) {
    cancelHoldTimer();
    console.log(`[Saksham] 2-Second long press trigger activated via: ${source}`);

    // Haptic feedback for elderly/tremor physical confirmation
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([80, 50, 100]); } catch (e) {}
    }

    // Soft, pleasant audio chime
    if (typeof playAudioChime === 'function') {
      try { playAudioChime('chime'); } catch(e) {}
    }

    openHiSakshamAssistant(true);
  }

  /* ==================== EVENT LISTENERS FOR HARDWARE & TOUCH ==================== */
  // 1. Keyboard & Hardware Buttons (Space, V, Volume Up/Down, Power, Headset)
  window.addEventListener('keydown', (e) => {
    // If target is typing in an input/textarea, do not intercept normal typing unless Volume/Power
    const isInput = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);

    // Hardware Volume Keys on Android / Keyboards
    const isVolume = e.key === 'AudioVolumeUp' || e.key === 'AudioVolumeDown' ||
                     e.key === 'VolumeUp' || e.key === 'VolumeDown' ||
                     e.key === 'VolumeMute' || e.keyCode === 174 || e.keyCode === 175 ||
                     e.keyCode === 24 || e.keyCode === 25;

    // Hardware Power Key
    const isPower = e.key === 'Power' || e.keyCode === 26;

    // Headset / Media Key
    const isMedia = e.key === 'MediaPlayPause' || e.key === 'HeadsetHook';

    // Universal Desktop / MacBook Assistive Keys: Hold Spacebar or 'V' (Voice)
    const isSpaceHold = !isInput && (e.code === 'Space' || e.key === ' ');
    const isVoiceKey = !isInput && (e.code === 'KeyV' || e.key === 'v' || e.key === 'V');

    if (isVolume || isPower || isMedia || isSpaceHold || isVoiceKey) {
      if (e.repeat) return; // Prevent repeated keydown spam
      startHoldTimer(isSpaceHold ? 'Spacebar_Hold' : (isVoiceKey ? 'V_Key_Hold' : (e.key || e.code || 'hardware_key')));
    }
  }, { passive: true });

  window.addEventListener('keyup', (e) => {
    cancelHoldTimer();
  }, { passive: true });

  // 2. Trackpad / Mouse Hold on MacBook & Desktops (Hold click anywhere for 2s)
  let mouseDownStartX = 0;
  let mouseDownStartY = 0;

  window.addEventListener('mousedown', (e) => {
    // Don't trigger if clicking inside text inputs or textareas
    const isInput = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
    if (isInput) return;
    // Only primary left button
    if (e.button !== 0) return;

    mouseDownStartX = e.clientX;
    mouseDownStartY = e.clientY;
    startHoldTimer('mouse_click_hold');
  }, { passive: true });

  window.addEventListener('mousemove', (e) => {
    if (!isHoldActive) return;
    const deltaX = Math.abs(e.clientX - mouseDownStartX);
    const deltaY = Math.abs(e.clientY - mouseDownStartY);
    if (deltaX > 20 || deltaY > 20) {
      cancelHoldTimer(); // User is dragging or selecting
    }
  }, { passive: true });

  window.addEventListener('mouseup', cancelHoldTimer, { passive: true });

  // 3. Mobile Touch-and-Hold (Hold anywhere on screen for 2s without dragging)
  let touchStartX = 0;
  let touchStartY = 0;

  window.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const target = e.target;
    if (!target) return;
    // Only exclude active text editing inputs so touch hold works seamlessly on all phones
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    startHoldTimer('touch_screen_hold');
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isHoldActive) return;
    if (e.touches.length !== 1) { cancelHoldTimer(); return; }
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
    if (deltaX > 20 || deltaY > 20) {
      cancelHoldTimer(); // User is scrolling
    }
  }, { passive: true });

  window.addEventListener('touchend', cancelHoldTimer, { passive: true });
  window.addEventListener('touchcancel', cancelHoldTimer, { passive: true });

  /* ==================== "HI SAKSHAM" ASSISTANT DIALOG ==================== */
  function openHiSakshamAssistant(greeting = false) {
    const modal = getModal();
    if (!modal) return;

    // Stop ongoing speech synthesis immediately so mic doesn't capture computer speaker echo
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.display = 'flex';
    if (typeof window.lockScroll === 'function') window.lockScroll();

    // Reset transcription display
    const transcriptEl = document.getElementById('hiSakshamTranscript') || document.getElementById('hiGeminiTranscript');
    if (transcriptEl) {
      transcriptEl.innerHTML = '<span class="text-emerald-300 font-medium">Listening for your voice... Take your time. Speak in any language or tap a quick action below.</span>';
    }

    const waveform = document.getElementById('hiSakshamWaveform');
    if (waveform) waveform.classList.remove('opacity-40');

    // Start speech recognition listening immediately
    setTimeout(() => {
      startHiSakshamListening();
    }, 200);
  }

  function closeHiSakshamAssistant() {
    const modal = getModal();
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.style.display = 'none';
    if (typeof window.unlockScroll === 'function') window.unlockScroll();
    stopHiSakshamListening();
  }

  function startHiSakshamListening() {
    const modal = getModal();
    // Do not start if modal is closed
    if (modal && (modal.classList.contains('hidden') || modal.style.display === 'none')) return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const transcriptEl = document.getElementById('hiSakshamTranscript') || document.getElementById('hiGeminiTranscript');
    const micBtn = document.getElementById('btnHiSakshamMic') || document.getElementById('btnHiGeminiMic');

    if (!SpeechRec) {
      if (transcriptEl) {
        transcriptEl.innerHTML = '<span class="text-amber-300 font-bold">Microphone speech recognition is not supported in this browser. Please tap any quick action below.</span>';
      }
      return;
    }

    try {
      if (hiSakshamRecognition) {
        try { hiSakshamRecognition.stop(); } catch(e) {}
      }

      hiSakshamRecognition = new SpeechRec();
      hiSakshamRecognition.continuous = true; // KEEP LISTENING CONTINUOUSLY — DO NOT AUTO-TERMINATE ON PAUSE!
      hiSakshamRecognition.interimResults = true;
      hiSakshamLatestTranscript = '';

      const curLangKey = (window.currentVoiceLang || localStorage.getItem('saksham_voice_lang') || 'en').toLowerCase();
      const bcp = (window.SAKSHAM_INDIAN_LANGUAGES && window.SAKSHAM_INDIAN_LANGUAGES[curLangKey]?.bcp47) || 'en-IN';
      hiSakshamRecognition.lang = bcp;

      hiSakshamRecognition.onstart = function() {
        isHiSakshamListening = true;
        if (micBtn) micBtn.classList.add('ring-8', 'ring-emerald-400/60', 'animate-pulse');
        const waveform = document.getElementById('hiSakshamWaveform');
        if (waveform) waveform.classList.remove('opacity-40');
      };

      hiSakshamRecognition.onresult = function(event) {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        hiSakshamLatestTranscript = text.trim();
        if (transcriptEl && hiSakshamLatestTranscript) {
          transcriptEl.innerHTML = `<span class="text-white font-black text-sm sm:text-base">"${hiSakshamLatestTranscript}"</span>`;
        }

        // Commit when user finishes utterance or pauses for 1.5 seconds
        if (hiSakshamSilenceTimer) clearTimeout(hiSakshamSilenceTimer);
        hiSakshamSilenceTimer = setTimeout(() => {
          if (hiSakshamLatestTranscript && isHiSakshamListening) {
            processHiSakshamSpeech(hiSakshamLatestTranscript);
          }
        }, 1500);
      };

      hiSakshamRecognition.onerror = function(err) {
        console.warn('[Hi Saksham Voice] error:', err.error);
        if (err.error === 'no-speech') {
          // DO NOT CLOSE MODAL ON NO-SPEECH! Calmly continue listening.
          if (transcriptEl && !hiSakshamLatestTranscript) {
            transcriptEl.innerHTML = '<span class="text-emerald-300 font-medium">Listening for your voice... Take your time and speak whenever you are ready.</span>';
          }
          return;
        }
        // For other network/hardware errors, keep modal open
        if (err.error !== 'aborted') {
          stopHiSakshamListening();
        }
      };

      hiSakshamRecognition.onend = function() {
        const m = getModal();
        const isStillOpen = m && !m.classList.contains('hidden') && m.style.display !== 'none';
        if (isStillOpen && isHiSakshamListening) {
          // Restart recognition seamlessly so assistant never abruptly vanishes!
          try {
            hiSakshamRecognition.start();
          } catch(e) {}
        } else {
          stopHiSakshamListening();
        }
      };

      hiSakshamRecognition.start();
    } catch (err) {
      console.warn('[Hi Saksham Voice] start err:', err);
      stopHiSakshamListening();
    }
  }

  function stopHiSakshamListening() {
    isHiSakshamListening = false;
    if (hiSakshamSilenceTimer) {
      clearTimeout(hiSakshamSilenceTimer);
      hiSakshamSilenceTimer = null;
    }
    const micBtn = document.getElementById('btnHiSakshamMic') || document.getElementById('btnHiGeminiMic');
    if (micBtn) micBtn.classList.remove('ring-8', 'ring-emerald-400/60', 'animate-pulse');
    const waveform = document.getElementById('hiSakshamWaveform');
    if (waveform) waveform.classList.add('opacity-40');
    try {
      if (hiSakshamRecognition) hiSakshamRecognition.stop();
    } catch(e) {}
  }

  function toggleHiSakshamListening() {
    if (isHiSakshamListening) {
      stopHiSakshamListening();
    } else {
      startHiSakshamListening();
    }
  }

  /* ==================== SPEECH COMMAND PROCESSING ==================== */
  function processHiSakshamSpeech(rawQuery) {
    if (!rawQuery) return;
    const q = rawQuery.toLowerCase().trim();
    console.log('[Hi Saksham Voice] processing speech:', q);

    // Filter out synthesizer self-echo
    if (q === 'hi saksham' || q === 'saksham' || q === 'how can i help you' || q === 'how can i help' || q === 'hello saksham') {
      const transcriptEl = document.getElementById('hiSakshamTranscript') || document.getElementById('hiGeminiTranscript');
      if (transcriptEl) {
        transcriptEl.innerHTML = '<span class="text-emerald-300 font-bold">"Hello! What would you like to do? Speak your request or tap any action below."</span>';
      }
      return;
    }

    hiSakshamLatestTranscript = '';

    const transcriptEl = document.getElementById('hiSakshamTranscript') || document.getElementById('hiGeminiTranscript');

    // 1. Task Execution Commands: "Start 15m task", "Start task", "Start routine"
    if (q.includes('start 15m') || q.includes('start 15 minute') || q.includes('start 15 min') ||
        q.includes('start task') || q.includes('start timer') || q.includes('begin task') ||
        q.includes('15 minute task') || q.includes('15m task') || q.includes('शुरू') || q.includes('टास्क')) {
      executeHiSakshamAction('start_task');
      return;
    }

    // 2. Next Task Query: "What is my next task?", "What task do I have?", "Next activity"
    if (q.includes('what is my next') || q.includes('next task') || q.includes('upcoming') ||
        q.includes('what task') || q.includes('what do i do') || q.includes('schedule') || q.includes('अगला')) {
      executeHiSakshamAction('next_task');
      return;
    }

    // 3. Mark Task Done: "Completed task", "Task done", "Finished"
    if (q.includes('mark done') || q.includes('task done') || q.includes('finished task') || q.includes('complete task') || q.includes('हो गया')) {
      executeHiSakshamAction('mark_done');
      return;
    }

    // 4. Tab Navigation: Routine, Family, Games, Movement, Care Team, SOS, Water
    if (q.includes('routine') || q.includes('tasks') || q.includes('to-do') || q.includes('checklist') || q.includes('दिनचर्या')) {
      executeHiSakshamAction('routine');
      return;
    }

    if (q.includes('family') || q.includes('daughter') || q.includes('loved one') || q.includes('photo') || q.includes('vault') || q.includes('परिवार') || q.includes('घरचे')) {
      executeHiSakshamAction('loved_ones');
      return;
    }

    if (q.includes('game') || q.includes('mind clinic') || q.includes('puzzle') || q.includes('maze') || q.includes('math') || q.includes('खेल')) {
      executeHiSakshamAction('mind_games');
      return;
    }

    if (q.includes('walk') || q.includes('movement') || q.includes('speech') || q.includes('metronome') || q.includes('exercise') || q.includes('कसरत')) {
      executeHiSakshamAction('movement_speech');
      return;
    }

    if (q.includes('sos') || q.includes('emergency') || q.includes('doctor') || q.includes('help me') || q.includes('danger') || q.includes('मदद') || q.includes('बचाओ')) {
      executeHiSakshamAction('sos');
      return;
    }

    if (q.includes('water') || q.includes('drink') || q.includes('hydration') || q.includes('पानी') || q.includes('पाणी')) {
      executeHiSakshamAction('water');
      return;
    }

    if (q.includes('where am i') || q.includes('what is this') || q.includes('explain')) {
      executeHiSakshamAction('where_am_i');
      return;
    }

    // 5. Intelligent Companion Response (Autonomous or Gemini Guidance)
    if (transcriptEl) {
      transcriptEl.innerHTML = `<span class="text-amber-200 font-bold">Thinking...</span>`;
    }
    const activeVoiceLang = window.currentVoiceLang || window.currentLang || 'en';
    let reply = "";
    if (typeof generateAutonomousAiResponse === 'function') {
      reply = generateAutonomousAiResponse(rawQuery, activeVoiceLang);
    } else {
      reply = `I heard you ask: "${rawQuery}". Let's take you to your daily wellness routine.`;
    }

    const cleanReply = reply.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[#*•-]/g, '').trim();
    if (transcriptEl) {
      transcriptEl.innerHTML = `
        <div class="space-y-2">
          <p class="text-emerald-200 font-medium">${cleanReply}</p>
          <div class="flex items-center justify-center gap-2 pt-1">
            <button onclick="startHiSakshamListening()" class="px-3 py-1 bg-emerald-600/60 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer">
              <i class="fa-solid fa-microphone text-[10px]"></i> Speak Again
            </button>
            <button onclick="closeHiSakshamAssistant()" class="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition cursor-pointer">
              Close
            </button>
          </div>
        </div>
      `;
    }
    if (typeof speakText === 'function') {
      speakText(cleanReply, activeVoiceLang);
    }
  }

  function executeHiSakshamAction(actionType, extraData) {
    const transcriptEl = document.getElementById('hiSakshamTranscript') || document.getElementById('hiGeminiTranscript');

    // Action 1: Start 15m Task
    if (actionType === 'start_task') {
      const task = (state && state.tasks) ? (state.tasks[window.currentCueIndex || 0] || state.tasks.find(t => !t.done) || state.tasks[0]) : null;
      if (task) {
        if (transcriptEl) {
          transcriptEl.innerHTML = `<span class="text-emerald-300 font-black text-sm">▶ Starting 15-minute task: "${task.title}"</span>`;
        }
        if (typeof speakText === 'function') {
          speakText(`Starting your 15-minute task: ${task.title}. Follow each step calmly.`);
        }
        setTimeout(() => {
          closeHiSakshamAssistant();
          if (typeof startRoutine15mTask === 'function') startRoutine15mTask(task.id);
          if (typeof openTaskRunner === 'function') openTaskRunner(task.id, 15);
        }, 800);
      }
      return;
    }

    // Action 2: Next Task Query
    if (actionType === 'next_task') {
      const task = (state && state.tasks) ? (state.tasks.find(t => !t.done) || state.tasks[0]) : null;
      if (task) {
        const msg = `Your next scheduled activity is "${task.title}" at ${task.time}.`;
        if (transcriptEl) {
          transcriptEl.innerHTML = `
            <div class="space-y-1 text-center">
              <p class="text-xs text-emerald-300 font-bold">📋 Next Routine Activity</p>
              <p class="text-sm font-black text-white">${task.title} (${task.time})</p>
              <button onclick="closeHiSakshamAssistant(); openTaskRunner(${task.id}, 15);" class="mt-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black cursor-pointer">▶ Start 15m Task Now</button>
            </div>
          `;
        }
        if (typeof speakText === 'function') speakText(msg);
      }
      return;
    }

    // Action 3: Mark Task Done
    if (actionType === 'mark_done') {
      const activeId = state?.taskTimer?.activeTaskId || (state?.tasks?.[window.currentCueIndex || 0]?.id);
      if (activeId && typeof finishTaskRunnerWithId === 'function') {
        finishTaskRunnerWithId(activeId);
        if (transcriptEl) transcriptEl.innerHTML = `<span class="text-emerald-300 font-black">✓ Task marked completed! Excellent progress.</span>`;
        if (typeof speakText === 'function') speakText('Task marked as completed! Wonderful adherence.');
        setTimeout(() => closeHiSakshamAssistant(), 1200);
      }
      return;
    }

    // Action 4: Where Am I?
    if (actionType === 'where_am_i') {
      const activeTab = (window.SAKSHAM_PATIENT_TABS || []).find(t => {
        const v = document.getElementById(`view-${t.key}`);
        return v && !v.classList.contains('hidden');
      });
      const name = activeTab ? activeTab.title : 'Daily Routine';
      const msg = `You are currently on the ${name} page of Saksham. You can tell me to start a task, show your family, or open mind games.`;
      if (transcriptEl) transcriptEl.innerHTML = `<span class="text-sky-200 font-bold">${msg}</span>`;
      if (typeof speakText === 'function') speakText(msg);
      return;
    }

    // Action 5: Routine Navigation
    if (actionType === 'routine') {
      closeHiSakshamAssistant();
      if (typeof switchTab === 'function') switchTab('routine');
      if (typeof speakText === 'function') speakText('Opening your daily routine and schedule.');
      return;
    }

    // Action 6: Family & Loved Ones
    if (actionType === 'loved_ones') {
      closeHiSakshamAssistant();
      if (typeof switchTab === 'function') switchTab('vault');
      if (typeof speakText === 'function') speakText('Opening your family and loved ones photo vault.');
      return;
    }

    // Action 7: Mind Games & Clinic
    if (actionType === 'mind_games') {
      closeHiSakshamAssistant();
      if (typeof switchTab === 'function') switchTab('games');
      if (typeof speakText === 'function') speakText('Opening brain sprint and cognitive games.');
      return;
    }

    // Action 8: Movement & Voice
    if (actionType === 'movement_speech') {
      closeHiSakshamAssistant();
      if (typeof switchTab === 'function') switchTab('movement');
      if (typeof speakText === 'function') speakText('Opening movement metronome and voice practice.');
      return;
    }

    // Action 9: Emergency SOS
    if (actionType === 'sos') {
      closeHiSakshamAssistant();
      if (typeof openEmergencyModal === 'function') openEmergencyModal();
      if (typeof speakText === 'function') speakText('Emergency SOS triggered. Alerting emergency contacts.');
      return;
    }

    // Action 10: Log Water
    if (actionType === 'water') {
      if (typeof logWaterGlass === 'function') logWaterGlass(1);
      if (transcriptEl) transcriptEl.innerHTML = `<span class="text-teal-300 font-black">💧 Logged 1 glass of water!</span>`;
      if (typeof speakText === 'function') speakText('Logged 1 glass of fresh water. Keep hydrating steadily.');
      setTimeout(() => closeHiSakshamAssistant(), 1200);
      return;
    }
  }

  // Export functions onto window
  window.openHiSakshamAssistant = openHiSakshamAssistant;
  window.closeHiSakshamAssistant = closeHiSakshamAssistant;
  window.toggleHiSakshamListening = toggleHiSakshamListening;
  window.startHiSakshamListening = startHiSakshamListening;
  window.stopHiSakshamListening = stopHiSakshamListening;
  window.processHiSakshamSpeech = processHiSakshamSpeech;
  window.hiSakshamAction = executeHiSakshamAction;

  // Backwards compatibility aliases
  window.openHiGeminiAssistant = openHiSakshamAssistant;
  window.closeHiGeminiAssistant = closeHiSakshamAssistant;
  window.toggleHiGeminiListening = toggleHiSakshamListening;
  window.hiGeminiAction = executeHiSakshamAction;
})();
