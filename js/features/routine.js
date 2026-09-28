/* ======================================================================= */
/* SAKSHAM ROUTINE, TASK TIMERS, STEP-RUNNER & DAILY CUES ENGINE           */
/* ======================================================================= */

    function toggleEveningGuard() {
      state.eveningGuardActive = !state.eveningGuardActive;
      const body = document.body;
      const guardContainer = document.getElementById('evening-guard-container');
      const btnLabel = document.getElementById('eveningGuardBtnText');
      const btn = document.getElementById('btn-evening-guard');

      if (state.eveningGuardActive) {
        body.classList.add('evening-guard-active');
        if (guardContainer) guardContainer.classList.remove('hidden');
        if (btnLabel) btnLabel.innerText = "Evening Guard: ON";
        if (btn) btn.className = "px-3 py-1.5 rounded-xl border border-amber-400 bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md";
        speakText("Evening Cognitive Guard active. Visual clutter dimmed for peaceful sundowning protection.");
      } else {
        body.classList.remove('evening-guard-active');
        if (guardContainer) guardContainer.classList.add('hidden');
        if (btnLabel) btnLabel.innerText = "Evening Guard: OFF";
        if (btn) btn.className = "px-3 py-1.5 rounded-xl border border-amber-400/40 bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm";
        speakText("Day routine mode active.");
      }
    }

    function toggleEveningStep(stepNum) {
      const chk = document.getElementById(`chk-evening-step-${stepNum}`);
      if (chk) {
        chk.checked = !chk.checked;
        if (chk.checked) {
          awardXp(15, `Evening Step ${stepNum}`);
          playAudioChime('chime');
        }
      }
    }



    function formatTimerClock(totalSec) {
      const s = Math.max(0, Math.floor(totalSec));
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function startTaskTimer(taskId, durationMinutes = 15) {
      if (state.taskTimer.intervalId) {
        clearInterval(state.taskTimer.intervalId);
      }
      
      const totalSec = Math.round(durationMinutes * 60);
      state.taskTimer.activeTaskId = taskId;
      state.taskTimer.totalSeconds = totalSec;
      state.taskTimer.remainingSeconds = totalSec;
      state.taskTimer.status = 'running';
      state.taskTimer.startTime = Date.now();
      state.taskTimer.elapsedSeconds = 0;

      // Update button styling in runner modal
      const btn10 = document.getElementById('btnTimerPreset10');
      const btn15 = document.getElementById('btnTimerPreset15');
      if (btn10 && btn15) {
        if (durationMinutes === 10) {
          btn10.className = "px-2 py-0.5 text-[10px] font-bold rounded-lg border border-teal-500/50 bg-teal-500/20 text-teal-300";
          btn15.className = "px-2 py-0.5 text-[10px] font-bold rounded-lg border border-slate-600 hover:bg-white/10 text-slate-300";
        } else {
          btn15.className = "px-2 py-0.5 text-[10px] font-bold rounded-lg border border-teal-500/50 bg-teal-500/20 text-teal-300";
          btn10.className = "px-2 py-0.5 text-[10px] font-bold rounded-lg border border-slate-600 hover:bg-white/10 text-slate-300";
        }
      }

      updateTimerUI();

      state.taskTimer.intervalId = setInterval(() => {
        if (state.taskTimer.status !== 'running') return;

        state.taskTimer.remainingSeconds--;
        state.taskTimer.elapsedSeconds++;

        updateTimerUI();

        if (state.taskTimer.remainingSeconds <= 0) {
          clearInterval(state.taskTimer.intervalId);
          state.taskTimer.intervalId = null;
          state.taskTimer.status = 'expired';
          triggerTaskTimeoutHelp(taskId);
        }
      }, 1000);

      // Re-render task lists so active badge shows immediately
      renderDirectTasksList();
    }

    function updateTimerUI() {
      const clockEl = document.getElementById('runnerTimerClock');
      const barEl = document.getElementById('runnerTimerBar');
      const pulseEl = document.getElementById('runnerTimerPulse');
      const statusEl = document.getElementById('runnerTimerStatus');

      if (clockEl) {
        clockEl.innerText = formatTimerClock(state.taskTimer.remainingSeconds);
      }

      const percent = Math.max(0, Math.min(100, (state.taskTimer.remainingSeconds / state.taskTimer.totalSeconds) * 100));

      if (barEl) {
        barEl.style.width = `${percent}%`;
        if (state.taskTimer.remainingSeconds <= 60) {
          barEl.className = "bg-gradient-to-r from-rose-500 to-red-600 h-2 rounded-full transition-[width] duration-500";
          if (pulseEl) pulseEl.className = "w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping";
          if (statusEl) { statusEl.className = "text-[11px] sm:text-xs font-bold text-rose-400"; statusEl.innerText = "Ending Soon"; }
        } else if (state.taskTimer.remainingSeconds <= 300) {
          barEl.className = "bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-[width] duration-500";
          if (pulseEl) pulseEl.className = "w-2.5 h-2.5 rounded-full bg-amber-400";
          if (statusEl) { statusEl.className = "text-[11px] sm:text-xs font-bold text-amber-400"; statusEl.innerText = "< 5m Left"; }
        } else {
          barEl.className = "bg-gradient-to-r from-emerald-400 to-teal-400 h-2 rounded-full transition-[width] duration-500";
          if (pulseEl) pulseEl.className = "w-2.5 h-2.5 rounded-full bg-emerald-400";
          if (statusEl) { statusEl.className = "text-[11px] sm:text-xs font-bold text-teal-400"; statusEl.innerText = "Remaining"; }
        }
      }

      // Update live badge in task list if active
      if (state.taskTimer.activeTaskId) {
        const liveBadge = document.getElementById(`live-timer-badge-${state.taskTimer.activeTaskId}`);
        if (liveBadge) {
          liveBadge.innerText = `⏱️ ${formatTimerClock(state.taskTimer.remainingSeconds)} left`;
        }
      }
    }

    function stopTaskTimer() {
      if (state.taskTimer.intervalId) {
        clearInterval(state.taskTimer.intervalId);
        state.taskTimer.intervalId = null;
      }
      state.taskTimer.status = 'idle';
      state.taskTimer.activeTaskId = null;
    }

    function extendTaskTimer(extraMinutes = 5) {
      state.taskTimer.remainingSeconds += extraMinutes * 60;
      state.taskTimer.totalSeconds += extraMinutes * 60;
      state.taskTimer.status = 'running';
      updateTimerUI();
      playAudioChime('pulse');
      renderDirectTasksList();
    }

    function setTaskTimerDuration(mins) {
      if (state.activeRunnerTaskId) {
        startTaskTimer(state.activeRunnerTaskId, mins);
        playAudioChime('pulse');
      }
    }

    function triggerTaskTimeoutHelp(taskId) {
      const task = state.tasks.find(t => t.id === taskId) || state.tasks[currentCueIndex];
      const elapsedMins = Math.max(1, Math.round(state.taskTimer.totalSeconds / 60));

      // Mark latency on task
      if (task) {
        task.latencyMinutes = elapsedMins;
      }

      // Record in caregiver alert log
      state.caregiverAlerts.unshift({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `⏱️ 15m Timeout: Kalyani Sharma working on '${task ? task.title : 'Routine Task'}'. Assisted check-in prompted.`
      });
      renderCaregiverAlerts();

      playAudioChime('bell');
      openTaskHelpModal(taskId);
      speakText(`Kalyani ji, the 15-minute timer has completed for ${task ? task.title : 'your task'}. Are you stuck, or do you need some help?`);
    }

    let currentDiagTaskId = null;
    let currentDiagStepIndex = 0;
    let currentDiagCheckpointsList = [];

    function openTaskHelpModal(taskId) {
      const id = taskId || state.activeRunnerTaskId || (state.tasks[currentCueIndex] ? state.tasks[currentCueIndex].id : 1);
      const task = state.tasks.find(t => t.id === id);
      if (!task) return;

      currentDiagTaskId = task.id;
      state.activeRunnerTaskId = task.id;

      // Update Header Text & Badges
      const titleEl = document.getElementById('helpTaskTitle');
      if (titleEl) titleEl.innerText = task.title;

      const modalTitleEl = document.getElementById('diagModalTitle');
      if (modalTitleEl) {
        modalTitleEl.innerText = task.diagnosticQuestion || `What are you doing right now, Kalyani ji?`;
      }

      const modalBadgeEl = document.getElementById('diagModalBadge');
      if (modalBadgeEl) {
        modalBadgeEl.innerText = task.tag || `Cognitive Step Guide`;
      }

      const elapsedMins = Math.max(1, Math.round(state.taskTimer.elapsedSeconds / 60) || 15);
      const elapsedEl = document.getElementById('helpElapsedTxt');
      if (elapsedEl) elapsedEl.innerText = `${elapsedMins} minutes`;
      const diagElapsedEl = document.getElementById('diagTimerElapsedTxt');
      if (diagElapsedEl) diagElapsedEl.innerText = `${elapsedMins}m Elapsed`;

      // Reset views: show Question View, hide Next Step View
      const qView = document.getElementById('diagQuestionView');
      const sView = document.getElementById('diagNextStepView');
      if (qView) qView.classList.remove('hidden');
      if (sView) sView.classList.add('hidden');

      // Populate Checkpoints
      renderDiagnosticCheckpoints(task);

      const modal = document.getElementById('modalTaskHelp');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
      }
      playAudioChime('pulse');

      // Spoken cue for cognitive alignment
      speakText(`${task.diagnosticQuestion || "What are you doing right now, Kalyani ji?"} Pick where you are right now, and I will guide your exact next step.`);
    }

    function renderDiagnosticCheckpoints(task) {
      const container = document.getElementById('diagnosticCheckpointContainer');
      if (!container) return;

      if (task.diagnosticCheckpoints && task.diagnosticCheckpoints.length > 0) {
        currentDiagCheckpointsList = task.diagnosticCheckpoints;
      } else {
        // Fallback: derive dynamic checkpoints from runnerSteps
        const steps = (task.runnerSteps && task.runnerSteps.length) ? task.runnerSteps : [
          `Review instructions for ${task.title}`,
          `Perform the task at a calm and steady pace`,
          `Confirm all actions are finished`
        ];
        currentDiagCheckpointsList = [
          {
            icon: "❓",
            currentDoing: `I just started or forgot where to begin`,
            nextStepSummary: steps[0],
            nextStep: steps[0],
            spokenCue: `Start with step 1: ${steps[0]}`,
            stepIndex: 0,
            tip: `Take a deep breath and begin calmly.`
          },
          ...steps.slice(0, -1).map((s, idx) => ({
            icon: idx === 0 ? "⚡" : (idx === 1 ? "🔄" : "📌"),
            currentDoing: `I just finished: ${s}`,
            nextStepSummary: steps[idx + 1],
            nextStep: steps[idx + 1],
            spokenCue: `Great progress! Next step: ${steps[idx + 1]}`,
            stepIndex: idx + 1,
            tip: `Keep going at your own pace.`
          }))
        ];
      }

      container.innerHTML = currentDiagCheckpointsList.map((cp, idx) => `
        <button onclick="selectDiagnosticCheckpoint(${idx})" class="w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/70 shadow-xs hover:shadow-md transition flex items-center justify-between group active:scale-[0.99]">
          <div class="flex items-center space-x-3 sm:space-x-3.5">
            <span class="text-2xl p-2 rounded-xl bg-amber-100 group-hover:bg-amber-200 transition shrink-0">${cp.icon || '📍'}</span>
            <div>
              <p class="text-xs sm:text-sm font-black text-slate-900 group-hover:text-amber-950">${cp.currentDoing}</p>
              <p class="text-[11px] sm:text-xs text-slate-500 group-hover:text-amber-800 flex items-center gap-1.5 mt-0.5">
                <i class="fa-solid fa-arrow-right text-[10px] text-amber-600"></i> Next: <span class="font-bold text-amber-900">${cp.nextStepSummary || cp.nextStep}</span>
              </p>
            </div>
          </div>
          <div class="shrink-0 text-slate-400 group-hover:text-amber-600 transition pl-2">
            <i class="fa-solid fa-chevron-right"></i>
          </div>
        </button>
      `).join('');
    }

    function selectDiagnosticCheckpoint(idx) {
      const task = state.tasks.find(t => t.id === currentDiagTaskId) || state.tasks.find(t => t.id === state.activeRunnerTaskId);
      if (!task) return;

      const cp = currentDiagCheckpointsList[idx];
      if (!cp) return;

      currentDiagStepIndex = (cp.stepIndex !== undefined) ? cp.stepIndex : 0;

      // Switch to Step View
      const qView = document.getElementById('diagQuestionView');
      const sView = document.getElementById('diagNextStepView');
      if (qView) qView.classList.add('hidden');
      if (sView) sView.classList.remove('hidden');

      renderDiagnosticActiveStep(task, currentDiagStepIndex, cp);
      playAudioChime('pulse');
    }

    function renderDiagnosticActiveStep(task, stepIdx, customCp) {
      const totalSteps = (task.runnerSteps && task.runnerSteps.length) ? task.runnerSteps.length : 4;
      const currentNum = Math.min(stepIdx + 1, totalSteps);

      const badgeEl = document.getElementById('diagStepBadge');
      if (badgeEl) badgeEl.innerText = `Your Exact Next Step (Step ${currentNum} of ${totalSteps})`;

      const statusEl = document.getElementById('diagCurrentStatusTxt');
      if (statusEl) {
        statusEl.innerText = (currentNum === totalSteps) ? "Final Step" : "In Progress";
      }

      const instrEl = document.getElementById('diagInstructionTxt');
      const tipEl = document.getElementById('diagSpokenTipTxt');

      let instructionText = "";
      let tipText = "";
      let spokenCue = "";

      if (customCp && customCp.stepIndex === stepIdx) {
        instructionText = customCp.nextStep;
        tipText = customCp.tip || "Take your time. You are doing great.";
        spokenCue = customCp.spokenCue || customCp.nextStep;
      } else if (task.runnerSteps && task.runnerSteps[stepIdx]) {
        instructionText = task.runnerSteps[stepIdx];
        tipText = "Focus on just this one action. Breathe gently.";
        spokenCue = `Step ${currentNum}: ${instructionText}`;
      } else {
        instructionText = `Complete your ${task.title} action calmly.`;
        tipText = "Take your time Kalyani ji.";
        spokenCue = instructionText;
      }

      if (instrEl) instrEl.innerText = instructionText;
      if (tipEl) tipEl.innerText = tipText;

      const btn = document.getElementById('btnAdvanceDiagStep');
      if (btn) {
        if (stepIdx >= totalSteps - 1) {
          btn.innerHTML = `<span>Finish Task & Auto-Tick (+25 XP)</span> <i class="fa-solid fa-circle-check"></i>`;
          btn.className = "flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2";
        } else {
          btn.innerHTML = `<span>I did this step! Next Step</span> <i class="fa-solid fa-arrow-right"></i>`;
          btn.className = "flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2";
        }
      }

      if (spokenCue) {
        speakText(spokenCue);
      }
    }

    function advanceDiagnosticStep() {
      const task = state.tasks.find(t => t.id === currentDiagTaskId) || state.tasks.find(t => t.id === state.activeRunnerTaskId);
      if (!task) return;

      const totalSteps = (task.runnerSteps && task.runnerSteps.length) ? task.runnerSteps.length : 4;

      if (currentDiagStepIndex < totalSteps - 1) {
        currentDiagStepIndex++;
        playAudioChime('pulse');
        renderDiagnosticActiveStep(task, currentDiagStepIndex, null);
      } else {
        // Completed final step!
        closeTaskHelpModal();
        finishTaskRunnerWithId(task.id);
        if (typeof window !== 'undefined' && window.confetti) {
          window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
        speakText(`Wonderful job Kalyani ji! You followed every step and completed ${task.title}. Twenty-five XP awarded, and it is marked done on your to-do list!`);
      }
    }

    function speakCurrentDiagnosticStep() {
      const instrEl = document.getElementById('diagInstructionTxt');
      const tipEl = document.getElementById('diagSpokenTipTxt');
      const text = (instrEl ? instrEl.innerText : "") + ". " + (tipEl ? tipEl.innerText : "");
      if (text.trim()) {
        speakText(text);
      }
    }

    function backToDiagnosticQuestions() {
      const qView = document.getElementById('diagQuestionView');
      const sView = document.getElementById('diagNextStepView');
      if (qView) qView.classList.remove('hidden');
      if (sView) sView.classList.add('hidden');
      playAudioChime('pulse');
      speakText("Pick where you are right now, and I will guide your next step.");
    }

    function closeTaskHelpModal() {
      const modal = document.getElementById('modalTaskHelp');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        const runnerModal = document.getElementById('modalTaskRunner');
        if (!runnerModal || runnerModal.classList.contains('hidden')) {
          document.body.style.overflow = '';
        }
      }
    }

    function speakHelpPrompt() {
      const task = state.tasks.find(t => t.id === (currentDiagTaskId || state.activeRunnerTaskId));
      const prompt = task && task.diagnosticQuestion ? task.diagnosticQuestion : "What are you doing right now, Kalyani ji?";
      speakText(`${prompt} Tell us what you have done or what you see, and we will give you your exact next step.`);
    }

    function handleHelpAction(action) {
      const taskId = state.activeRunnerTaskId;
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return;

      if (action === 'freeze') {
        closeTaskHelpModal();
        toggleMetronomeBeep(); // Starts 100 BPM rhythm cue
        speakText("Starting 100 beats per minute rhythm metronome. Stop, take a deep breath, shift your weight from left to right, and step in time with the sound.");
        state.caregiverAlerts.unshift({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `🚶 Gait Freezing Alert: Kalyani activated 100 BPM rhythmic cadence cue for '${task.title}'.`
        });
        renderCaregiverAlerts();
      } else if (action === 'more_time') {
        extendTaskTimer(5);
        closeTaskHelpModal();
        speakText("Added 5 more minutes to your timer. Take your time, there is no hurry at all Kalyani ji.");
      } else if (action === 'caregiver') {
        closeTaskHelpModal();
        state.caregiverAlerts.unshift({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `🚨 URGENT ASSISTANCE: Kalyani requested check-in help from Aarav for '${task.title}' after 15m timer timeout.`
        });
        renderCaregiverAlerts();
        const msg = encodeURIComponent(`🚨 SAKSHAM ASSISTANCE REQUEST: Kalyani Sharma needs help with scheduled activity: "${task.title}". The 15-minute timer elapsed. Aarav, please check in!`);
        window.open(`https://wa.me/919876543210?text=${msg}`, '_blank');
        speakText("I have sent a priority WhatsApp alert to Aarav. He is checking in on you now.");
      } else if (action === 'breakdown') {
        closeTaskHelpModal();
        task.runnerSteps = [
          `Take 3 slow deep breaths to relax your muscles`,
          `Look directly at what you need for ${task.title}`,
          `Do just the first small action slowly and steadily`,
          `Pause for 10 seconds, then complete the next step`
        ];
        // Re-render steps inside modal
        const container = document.getElementById('runnerStepsContainer');
        if (container) {
          container.innerHTML = task.runnerSteps.map((s, idx) => `
            <div class="p-3.5 rounded-2xl border-2 border-purple-200 hover:border-purple-400 bg-purple-50/60 flex items-center space-x-3 cursor-pointer transition" onclick="toggleRunnerStepCheckbox(${idx})">
              <input type="checkbox" id="runner-step-chk-${idx}" class="w-6 h-6 rounded-lg text-purple-600 focus:ring-purple-500 cursor-pointer" onclick="event.stopPropagation(); playAudioChime('pulse');">
              <span class="text-xs sm:text-sm font-bold text-purple-950">${idx + 1}. ${s}</span>
            </div>
          `).join('');
        }
        speakText(`I have simplified the steps for ${task.title}. Take it one small step at a time.`);
      } else if (action === 'finished') {
        closeTaskHelpModal();
        finishTaskRunner();
      }
    }

    function finishTaskRunnerWithId(id) {
      state.activeRunnerTaskId = id;
      finishTaskRunner();
    }



    /* ==================== STEP-BY-STEP TASK RUNNER ENGINE ==================== */
    function openTaskRunner(taskId, customDurationMinutes = 15) {
      const task = state.tasks.find(t => t.id === taskId) || state.tasks[currentCueIndex];
      if (!task) return;
      state.activeRunnerTaskId = task.id;

      document.getElementById('runnerTaskTitle').innerText = task.title;
      document.getElementById('runnerTagBadge').innerText = `${task.tag} • ${task.time}`;

      const steps = task.runnerSteps || [
        `Review instructions for ${task.title}`,
        `Perform the task at a calm and steady pace`,
        `Confirm all actions are finished`
      ];

      const container = document.getElementById('runnerStepsContainer');
      container.innerHTML = steps.map((s, idx) => `
        <div class="p-3.5 rounded-2xl border-2 border-slate-200 hover:border-teal-400 bg-slate-50 flex items-center space-x-3 cursor-pointer transition" onclick="toggleRunnerStepCheckbox(${idx})">
          <input type="checkbox" id="runner-step-chk-${idx}" class="w-6 h-6 rounded-lg text-teal-600 focus:ring-teal-500 cursor-pointer" onclick="event.stopPropagation(); playAudioChime('pulse');">
          <span class="text-xs sm:text-sm font-bold text-slate-800">${idx + 1}. ${s}</span>
        </div>
      `).join('');

      const modal = document.getElementById('modalTaskRunner');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.body.style.overflow = 'hidden';

      // Start the 15-minute countdown timer
      startTaskTimer(task.id, customDurationMinutes);

      // Play instrument cue for category
      if (task.tag === 'Medication') playInstrumentCue('bell');
      else if (task.tag === 'Food' || task.tag === 'Wellness') playInstrumentCue('sax');
      else playInstrumentCue('marimba');

      speakText(`Starting guided task: ${task.title}. Follow each step on your screen. The 15-minute timer has started.`);
    }

    function toggleRunnerStepCheckbox(idx) {
      const chk = document.getElementById(`runner-step-chk-${idx}`);
      if (chk) {
        chk.checked = !chk.checked;
        playAudioChime('pulse');
      }
    }

    function closeTaskRunner() {
      const modal = document.getElementById('modalTaskRunner');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
      }
    }

    function finishTaskRunner() {
      const taskId = state.activeRunnerTaskId;
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        // Calculate latency
        const elapsedMins = Math.max(1, Math.round(state.taskTimer.elapsedSeconds / 60) || 5);
        task.latencyMinutes = elapsedMins;
        task.done = true;
        task.status = 'all_done';
        task.attemptsLeft = 3;

        // Stop the countdown timer
        stopTaskTimer();

        // Award points & celebration
        awardXp(25, `${task.title} Completed`);
        playAudioChime('fanfare');

        // Check if Hydration Hero should unlock
        if (task.tag === 'Wellness' || task.id === 1) {
          state.waterLogged = Math.min(8, state.waterLogged + 1);
          if (state.waterLogged >= 8) {
            const hBadge = state.badges.find(b => b.id === 'hydration_hero');
            if (hBadge && !hBadge.unlocked) {
              hBadge.unlocked = true;
              hBadge.date = "Unlocked Today!";
              awardXp(50, "Hydration Hero Badge");
            }
          }
        }

        // Update Today's calendar status in simulation
        if (state.calendarMonthDays[24]) {
          state.calendarMonthDays[24].completed = Math.min(5, state.calendarMonthDays[24].completed + 1);
          state.calendarMonthDays[24].status = 'all_done';
          state.calendarMonthDays[24].latency = elapsedMins;
        }

        // Log completion in caregiver alerts
        state.caregiverAlerts.unshift({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `✅ Task Completed: Kalyani finished '${task.title}' in ${elapsedMins}m. Adherence logged.`
        });

        renderBadgesUI();
        renderActiveCueCard();
        renderDirectTasksList();
        renderTimeframeInsights();
        renderInteractiveMonthlyGrid();
        renderCaregiverAlerts();
        updateChartsData();

        speakText(`Wonderful job Kalyani ji! ${task.title} is completed and marked as done on your to-do list.`);
      }
      closeTaskRunner();
    }

    function speakRunnerSteps() {
      const taskId = state.activeRunnerTaskId;
      const task = state.tasks.find(t => t.id === taskId);
      if (!task || !task.runnerSteps) return;
      speakText(`Steps for ${task.title}: ` + task.runnerSteps.join('. Next step: '));
    }



    function openTelemetryModal() {
      const modal = document.getElementById('modalTelemetryRecord');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        renderTimeframeInsights();
      }
    }

    function closeTelemetryModal() {
      const modal = document.getElementById('modalTelemetryRecord');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
      }
    }



    /* ==================== 2. ROUTINE CUES WITH 3-CHANCE SYSTEM ==================== */
    function switchRoutineMiniTab(tabType) {
      document.getElementById('routine-miniview-cues').classList.toggle('hidden', tabType !== 'cues');
      document.getElementById('routine-miniview-direct').classList.toggle('hidden', tabType !== 'direct');

      if (tabType === 'cues') {
        document.getElementById('mini-tab-cues').className = "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md flex items-center justify-center gap-2 transition-all";
        document.getElementById('mini-tab-direct').className = "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center gap-2 transition-all";
        renderActiveCueCard();
      } else {
        document.getElementById('mini-tab-direct').className = "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md flex items-center justify-center gap-2 transition-all";
        document.getElementById('mini-tab-cues').className = "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center gap-2 transition-all";
        renderDirectTasksList();
      }
    }

    function renderActiveCueCard() {
      const task = state.tasks[currentCueIndex];
      const box = document.getElementById('activeCueBox');
      document.getElementById('cueCurrentIndexTxt').innerText = `${currentCueIndex + 1} of ${state.tasks.length}`;

      if (task.attemptsLeft === undefined) task.attemptsLeft = 3;
      const heartsStr = task.attemptsLeft === 3 ? "❤️❤️❤️ (3 Left)" : (task.attemptsLeft === 2 ? "❤️❤️🤍 (2 Left)" : (task.attemptsLeft === 1 ? "❤️🤍🤍 (1 Left)" : "🤍🤍🤍 (Guided)"));
      document.getElementById('cueHeartsDisplay').innerText = heartsStr;

      const optionLetters = ['A', 'B', 'C'];
      const isTimed = state.taskTimer.activeTaskId === task.id && state.taskTimer.status === 'running';

      box.innerHTML = `
        <div class="flex justify-between items-center">
          <span class="text-xs font-black text-teal-700 uppercase tracking-wider bg-teal-100 px-3 py-1 rounded-full border border-teal-200">
            Scheduled: ${task.time} (${task.tag})
          </span>
          <div class="flex items-center gap-2">
            ${isTimed ? `
              <span id="live-timer-badge-${task.id}" class="text-xs font-mono font-black text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse flex items-center gap-1">
                ⏱️ ${formatTimerClock(state.taskTimer.remainingSeconds)} left
              </span>
            ` : ''}
            <span class="text-xs font-bold text-slate-500">${task.done ? '<span class="text-emerald-600 font-extrabold"><i class="fa-solid fa-circle-check"></i> Completed</span>' : 'Pending Action'}</span>
          </div>
        </div>

        <h4 class="text-base sm:text-lg font-black text-slate-900 leading-snug font-heading">
          "${task.cueQuestion}"
        </h4>

        <div class="grid grid-cols-1 gap-2.5 pt-1">
          ${task.cueOptions.map((opt, optIdx) => `
            <button onclick="handleTaskCueAnswer(${optIdx})" class="p-3.5 bg-white hover:bg-teal-50/50 border-2 border-slate-200 hover:border-teal-500 rounded-2xl text-left text-xs sm:text-sm font-bold text-slate-800 transition flex items-center space-x-3 shadow-xs">
              <span class="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 font-black text-xs flex items-center justify-center shrink-0 border border-teal-200">${optionLetters[optIdx]}</span>
              <span>${opt}</span>
            </button>
          `).join('')}
        </div>

        <div id="cueFeedbackAlert" class="hidden p-3 rounded-2xl text-xs font-bold"></div>

        <div class="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-200/60">
          <button onclick="revealCueHint()" class="text-xs font-bold text-indigo-600 hover:underline">
            Need a clue? Tap for hint
          </button>
          <div class="flex flex-wrap gap-2">
            <button onclick="speakText('${task.title}')" class="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50">
              <i class="fa-solid fa-volume-high text-teal-600 mr-1"></i> Speak
            </button>
            ${isTimed ? `
              <button onclick="openTaskHelpModal(${task.id})" class="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1">
                <i class="fa-solid fa-hand-holding-hand"></i> Stuck?
              </button>
              <button onclick="finishTaskRunnerWithId(${task.id})" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1">
                <i class="fa-solid fa-check"></i> Complete & Tick
              </button>
              <button onclick="openTaskRunner(${task.id})" class="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-teal-300 font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1">
                <i class="fa-solid fa-stopwatch"></i> View Timer
              </button>
            ` : `
              <button onclick="openTaskRunner(${task.id}, 15)" class="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5">
                <i class="fa-solid fa-play"></i> Start 15m Task
              </button>
            `}
          </div>
        </div>
      `;
    }

    function prevCueItem() {
      if (currentCueIndex > 0) {
        currentCueIndex--;
        renderActiveCueCard();
      }
    }

    function nextCueItem() {
      if (currentCueIndex < state.tasks.length - 1) {
        currentCueIndex++;
        renderActiveCueCard();
      }
    }

    function handleTaskCueAnswer(selectedIdx) {
      const task = state.tasks[currentCueIndex];
      const alertBox = document.getElementById('cueFeedbackAlert');
      alertBox.classList.remove('hidden');

      if (selectedIdx === task.correctOptionIndex) {
        awardXp(25, "Task Recall");
        alertBox.className = "p-3.5 rounded-2xl text-xs font-bold bg-teal-50 border border-teal-200 text-teal-900";
        alertBox.innerHTML = `<strong>⭐ Perfect Recall!</strong> That is correct! Opening the guided task now...`;
        speakText("Perfect recall! Opening the step-by-step task now.");
        setTimeout(() => {
          openTaskRunner(task.id);
        }, 800);
      } else {
        task.attemptsLeft = Math.max(0, (task.attemptsLeft || 3) - 1);
        playAudioChime('pulse');

        if (task.attemptsLeft === 2) {
          alertBox.className = "p-3.5 rounded-2xl text-xs font-bold bg-amber-50 border border-amber-200 text-amber-900";
          alertBox.innerHTML = `<strong>Chance 1 missed:</strong> Take a deep breath! You have 2 chances left (❤️❤️🤍). Give it another try!`;
          speakText("First chance missed. Take a calm breath and try again.");
        } else if (task.attemptsLeft === 1) {
          alertBox.className = "p-3.5 rounded-2xl text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-900";
          alertBox.innerHTML = `<strong>Chance 2 missed (Hint Revealed):</strong> ${task.cueHint}. You have 1 chance left (❤️🤍🤍)!`;
          speakText(`Here is a helpful hint: ${task.cueHint}. Try one more time.`);
        } else {
          alertBox.className = "p-4 rounded-2xl text-xs font-bold bg-rose-50 border border-rose-300 text-rose-950 space-y-2";
          alertBox.innerHTML = `
            <div>
              <p class="font-black text-sm text-rose-900">🤍🤍🤍 Direct Guided Assistance:</p>
              <p class="mt-1">No worries at all! Today's exact task is: <strong>${task.title}</strong> at <strong>${task.time}</strong>.</p>
              <p class="text-rose-700 text-[11px] mt-0.5">${task.cueHint}</p>
            </div>
            <button onclick="openTaskRunner(${task.id})" class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow">
              Do Activity Now: "${task.title}" (+15 XP)
            </button>
          `;
          speakText(`All 3 chances completed. Your task right now is: ${task.title}. Let's do it together!`);
        }
        document.getElementById('cueHeartsDisplay').innerText = task.attemptsLeft === 2 ? "❤️❤️🤍 (2 Left)" : (task.attemptsLeft === 1 ? "❤️🤍🤍 (1 Left)" : "🤍🤍🤍 (Guided)");
      }
    }

    function revealCueHint() {
      const task = state.tasks[currentCueIndex];
      const alertBox = document.getElementById('cueFeedbackAlert');
      alertBox.classList.remove('hidden');
      alertBox.className = "p-3 rounded-2xl text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-900";
      alertBox.innerHTML = `<strong>Clinical Hint:</strong> ${task.cueHint}`;
    }

    function completeTaskFromCue(taskId) {
      openTaskRunner(taskId);
    }

    function renderDirectTasksList() {
      const container = document.getElementById('allTasksDirectList');
      container.innerHTML = state.tasks.map(t => {
        const isDone = t.done;
        const isNotDone = t.status === 'not_done';
        const isTimed = state.taskTimer.activeTaskId === t.id && state.taskTimer.status === 'running';

        return `
          <div class="p-4 rounded-2xl border ${isDone ? 'bg-teal-50/60 border-teal-200' : (isNotDone ? 'bg-rose-50 border-rose-200' : (isTimed ? 'bg-teal-50/50 border-2 border-teal-500 shadow-md ring-2 ring-teal-400/20' : 'bg-white border-slate-200'))} flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition">
            <div class="flex items-center space-x-3.5">
              <button onclick="toggleTask(${t.id})" class="w-8 h-8 rounded-xl border-2 flex items-center justify-center transition shrink-0 ${isDone ? 'bg-teal-600 border-teal-600 text-white shadow-sm' : (isNotDone ? 'bg-rose-600 border-rose-600 text-white' : 'border-slate-300 bg-white hover:border-teal-500')}" title="Toggle task completed">
                ${isDone ? '<i class="fa-solid fa-check text-xs"></i>' : (isNotDone ? '<i class="fa-solid fa-xmark text-xs"></i>' : '')}
              </button>
              <div>
                <p class="font-bold text-sm ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}">${t.title}</p>
                <div class="flex items-center flex-wrap gap-1.5 mt-0.5">
                  <span class="text-xs font-mono font-bold text-slate-500">${t.time}</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${isDone ? 'bg-teal-100 text-teal-800' : (isNotDone ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700')}">
                    ${isDone ? 'Completed' : (isNotDone ? 'Not Done' : t.tag)}
                  </span>
                  ${isTimed ? `
                    <span id="live-timer-badge-${t.id}" class="text-xs font-mono font-black text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse flex items-center gap-1">
                      ⏱️ ${formatTimerClock(state.taskTimer.remainingSeconds)} left
                    </span>
                  ` : ''}
                  ${t.latencyMinutes >= 15 ? `<span class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">Took ${t.latencyMinutes}m</span>` : ''}
                </div>
              </div>
            </div>

            <div class="flex items-center flex-wrap gap-1.5 self-end sm:self-center">
              ${!isDone ? `
                <button onclick="openTaskRunner(${t.id}, 15)" class="px-3 py-1.5 ${isTimed ? 'bg-slate-900 text-teal-300' : 'bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-300'} rounded-xl text-xs font-bold transition flex items-center gap-1">
                  <i class="fa-solid fa-stopwatch"></i> ${isTimed ? 'Runner' : '15m Timer'}
                </button>
                ${isTimed ? `
                  <button onclick="openTaskHelpModal(${t.id})" class="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold border border-amber-300 flex items-center gap-1">
                    <i class="fa-solid fa-hand-holding-hand"></i> Stuck?
                  </button>
                  <button onclick="finishTaskRunnerWithId(${t.id})" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow transition flex items-center gap-1">
                    <i class="fa-solid fa-check"></i> Done
                  </button>
                ` : `
                  <button onclick="postponeTask(${t.id}, 5)" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200">+5m</button>
                  <button onclick="markTaskNotDone(${t.id})" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold border border-rose-200">Not Done</button>
                `}
              ` : `
                <span class="text-xs font-bold text-emerald-600 px-2.5 py-1 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-1">
                  <i class="fa-solid fa-circle-check"></i> Done
                </span>
              `}
              <button onclick="speakText('${t.title} at ${t.time}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-extrabold flex items-center space-x-1" title="Read Aloud">
                <i class="fa-solid fa-volume-high text-teal-600"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    function toggleTask(id) {
      const task = state.tasks.find(t => t.id === id);
      if (task) {
        task.done = !task.done;
        task.status = task.done ? 'done' : 'pending';
        if (task.done) {
          awardXp(25, task.title);
        }
        persistTasks();
        renderDirectTasksList();
        renderActiveCueCard();
        updateChartsData();
        renderTimeframeInsights();
      }
    }

    function postponeTask(id, minutes) {
      const task = state.tasks.find(t => t.id === id);
      if (task) {
        const curMins = parseTimeToMinutes(task.time);
        const newMins = (curMins + minutes) % 1440;
        task.time = formatMinutesTo12Hour(newMins);
        task.alertedToday = false;
        task.alertedForThisMinute = false;

        state.caregiverAlerts.unshift({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Task "${task.title}" postponed by ${minutes} mins to ${task.time} by Kalyani.`
        });

        persistTasks();
        renderDirectTasksList();
        renderActiveCueCard();
        renderCaregiverAlerts();
        renderTimeframeInsights();
        playAudioChime('chime');
        speakText(`Task "${task.title}" postponed by ${minutes} minutes to ${task.time}.`);
      }
    }

    function markTaskNotDone(id) {
      const task = state.tasks.find(t => t.id === id);
      if (task) {
        task.done = false;
        task.status = 'not_done';
        state.caregiverAlerts.unshift({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ Task "${task.title}" marked as Not Done.`
        });
        persistTasks();
        renderDirectTasksList();
        renderCaregiverAlerts();
        updateChartsData();
        renderTimeframeInsights();
      }
    }

    function readActiveTaskAloud() {
      const pending = state.tasks.filter(t => !t.done && t.status !== 'not_done');
      if (pending.length > 0) {
        speakText(`Your next scheduled activity is: ${pending[0].title} at ${pending[0].time}.`);
      } else {
        speakText("All activities for today are completed! Great dedication.");
      }
    }



    function openAddTaskModal() { 
      const modal = document.getElementById('modalAddTask');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';

        // Auto-set default time to Current Time + 1 Minute for fast testing
        const now = new Date();
        now.setMinutes(now.getMinutes() + 1);
        const defH = String(now.getHours()).padStart(2, '0');
        const defM = String(now.getMinutes()).padStart(2, '0');
        const timeInput = document.getElementById('newTaskTime');
        if (timeInput) timeInput.value = `${defH}:${defM}`;
      }
    }

    function closeAddTaskModal() { 
      const modal = document.getElementById('modalAddTask');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
      }
    }

    function saveNewTask() {
      const titleInput = document.getElementById('newTaskTitle');
      const timeInput = document.getElementById('newTaskTime');
      const catSelect = document.getElementById('newTaskCat');
      
      const t = titleInput ? titleInput.value.trim() : '';
      const tm = timeInput ? timeInput.value : '14:00';
      const c = catSelect ? catSelect.value : 'Wellness';

      if (!t) {
        alert("Please enter a title for your activity.");
        return;
      }

      const timeMins = parseTimeToMinutes(tm);
      const displayTime = formatMinutesTo12Hour(timeMins);

      const newTask = {
        id: Date.now(),
        title: t,
        time: displayTime,
        rawTime: tm,
        sound: c === 'Medication' ? 'bell' : (c === 'Food' || c === 'Wellness' ? 'sax' : 'marimba'),
        done: false,
        tag: c,
        status: 'pending',
        latencyMinutes: 5,
        cueQuestion: `It is ${displayTime}. Time for your ${t}. Are you ready?`,
        cueOptions: [t, "Take an unprescribed nap", "Skip to tomorrow"],
        correctOptionIndex: 0,
        cueHint: `Check your routine: ${t}`,
        attemptsLeft: 3,
        alertedToday: false,
        alertedForThisMinute: false,
        runnerSteps: [
          `Review instructions for ${t}`,
          `Perform ${t} at a calm and steady pace`,
          `Confirm completion and relax`
        ],
        diagnosticQuestion: `What are you doing right now with ${t}?`,
        diagnosticCheckpoints: [
          {
            icon: "❓",
            currentDoing: `I just started or forgot where to begin`,
            nextStepSummary: `Begin ${t} calmly`,
            nextStep: `Take a deep breath and start step 1 of ${t}.`,
            spokenCue: `Start step 1 of ${t} calmly.`,
            stepIndex: 0,
            tip: `Take your time. You are doing great.`
          }
        ]
      };

      state.tasks.push(newTask);
      // Sort chronologically by time
      state.tasks.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

      if (typeof alertedTaskMinutes !== 'undefined') {
        delete alertedTaskMinutes[newTask.id];
      }
      persistTasks();
      renderDirectTasksList();
      renderActiveCueCard();
      renderCaregiverManagedTasks();
      updateChartsData();
      renderTimeframeInsights();
      closeAddTaskModal();
      if (titleInput) titleInput.value = '';

      playAudioChime('chime');
      speakText(`Activity saved: ${t} at ${displayTime}. Saksham will sound an alarm when it is time.`);
      checkScheduledReminders();
    }

    function adjustFontSize(delta) {
      baseFontSize = Math.max(12, Math.min(22, baseFontSize + delta));
      document.body.style.fontSize = baseFontSize + 'px';
    }


