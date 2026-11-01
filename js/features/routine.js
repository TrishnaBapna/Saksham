/* ======================================================================= */
/* SAKSHAM ROUTINE, TASK TIMERS, STEP-RUNNER & DAILY CUES ENGINE           */
/* ======================================================================= */

    if (typeof window.currentCueIndex === 'undefined') {
      window.currentCueIndex = 0;
    }
    var currentCueIndex = window.currentCueIndex;

    function syncLiveTimeTaskIndex(force = false) {
      if (!state || !state.tasks || state.tasks.length === 0) return 0;

      // Don't interrupt an actively running task timer unless forced
      if (!force && state.taskTimer && state.taskTimer.status === 'running' && state.taskTimer.activeTaskId) {
        const activeIdx = state.tasks.findIndex(t => t.id === state.taskTimer.activeTaskId);
        if (activeIdx !== -1) {
          currentCueIndex = activeIdx;
          window.currentCueIndex = activeIdx;
          return currentCueIndex;
        }
      }

      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();

      // 1. Exact minute match
      const exactIdx = state.tasks.findIndex(t => {
        const tm = typeof parseTimeToMinutes === 'function' ? parseTimeToMinutes(t.time) : -1;
        return tm === currentMins;
      });
      if (exactIdx !== -1) {
        currentCueIndex = exactIdx;
        window.currentCueIndex = currentCueIndex;
        return currentCueIndex;
      }

      // 2. Active time slot window: task scheduled within [-45 mins, +30 mins] of now
      let bestIdx = -1;
      for (let i = 0; i < state.tasks.length; i++) {
        const t = state.tasks[i];
        const tm = typeof parseTimeToMinutes === 'function' ? parseTimeToMinutes(t.time) : 0;
        if (!t.done && currentMins >= tm - 30 && currentMins <= tm + 45) {
          bestIdx = i;
          break;
        }
      }

      // 3. Next upcoming pending task today
      if (bestIdx === -1) {
        for (let i = 0; i < state.tasks.length; i++) {
          const t = state.tasks[i];
          const tm = typeof parseTimeToMinutes === 'function' ? parseTimeToMinutes(t.time) : 0;
          if (!t.done && tm >= currentMins) {
            bestIdx = i;
            break;
          }
        }
      }

      // 4. First pending task overall
      if (bestIdx === -1) {
        const firstPending = state.tasks.findIndex(t => !t.done);
        if (firstPending !== -1) bestIdx = firstPending;
      }

      // 5. Closest task to current clock time
      if (bestIdx === -1) {
        let minDiff = Infinity;
        for (let i = 0; i < state.tasks.length; i++) {
          const tm = typeof parseTimeToMinutes === 'function' ? parseTimeToMinutes(state.tasks[i].time) : 0;
          const diff = Math.abs(tm - currentMins);
          if (diff < minDiff) {
            minDiff = diff;
            bestIdx = i;
          }
        }
      }

      currentCueIndex = bestIdx !== -1 ? bestIdx : 0;
      window.currentCueIndex = currentCueIndex;
      return currentCueIndex;
    }
    window.syncLiveTimeTaskIndex = syncLiveTimeTaskIndex;

    function initCueIndexToNextPending() {
      return syncLiveTimeTaskIndex(false);
    }
    window.initCueIndexToNextPending = initCueIndexToNextPending;

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
      const totalSec = Math.round(durationMinutes * 60);

      // Idempotency: If timer is already actively running for this exact task, preserve countdown!
      if (state.taskTimer.status === 'running' && state.taskTimer.activeTaskId === taskId && state.taskTimer.remainingSeconds > 0) {
        if (!state.taskTimer.intervalId) {
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
        }
        updateTimerUI();
        renderDirectTasksList();
        return;
      }

      if (state.taskTimer.intervalId) {
        clearInterval(state.taskTimer.intervalId);
      }
      
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

      // Update live cue card timer elements if active
      const cueClockEl = document.getElementById('cueLiveClock');
      if (cueClockEl) {
        cueClockEl.innerHTML = `<i class="fa-solid fa-stopwatch text-amber-700"></i> ${formatTimerClock(state.taskTimer.remainingSeconds)} Left`;
      }
      const cueClockSmall = document.getElementById('cueLiveClockSmall');
      if (cueClockSmall) {
        cueClockSmall.innerText = `${formatTimerClock(state.taskTimer.remainingSeconds)} / 15:00`;
      }
      const cueBarEl = document.getElementById('cueLiveTimerBar');
      if (cueBarEl && state.taskTimer.totalSeconds > 0) {
        const pct = Math.max(0, Math.min(100, (state.taskTimer.remainingSeconds / state.taskTimer.totalSeconds) * 100));
        cueBarEl.style.width = `${pct}%`;
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
        window.lockScroll();
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
          btn.innerHTML = `<span>Finish Task & Auto-Tick</span> <i class="fa-solid fa-circle-check"></i>`;
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
        speakText(`Wonderful job Kalyani ji! You followed every step and completed ${task.title}. It is marked done on your to-do list!`);
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
          window.unlockScroll();
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

    function startRoutine15mTask(taskId) {
      const task = (state && state.tasks) ? (state.tasks.find(t => t.id === taskId) || state.tasks[currentCueIndex]) : null;
      if (!task) return;

      state.activeRunnerTaskId = task.id;
      startTaskTimer(task.id, 15);

      if (typeof playAudioChime === 'function') playAudioChime('chime');
      if (typeof speakText === 'function') {
        speakText(`15-minute timer started for ${task.title}. Take your time, hydrate and follow each step.`);
      }

      renderActiveCueCard();
      if (typeof renderDirectTasksList === 'function') renderDirectTasksList();

      if (typeof showSakshamToast === 'function') {
        showSakshamToast(`⏱️ 15-Minute Task Started: "${task.title}". Complete & Next Activity when finished!`, 'info');
      }
    }
    window.startRoutine15mTask = startRoutine15mTask;



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
      window.lockScroll();

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
        window.unlockScroll();
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

        // Celebrate task completion
        playAudioChime('fanfare');

        // Check if Hydration Hero should unlock
        if (task.tag === 'Wellness' || task.id === 1) {
          state.waterLogged = Math.min(8, state.waterLogged + 1);
          if (state.waterLogged >= 8) {
            const hBadge = state.badges.find(b => b.id === 'hydration_hero');
            if (hBadge && !hBadge.unlocked) {
              hBadge.unlocked = true;
              hBadge.date = "Unlocked Today!";
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
        const completionAlert = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `✅ Task Completed: ${state.user || 'Kalyani'} finished '${task.title}' in ${elapsedMins}m. Adherence logged.`
        };
        state.caregiverAlerts.unshift(completionAlert);

        if (window.dbService) {
          if (window.dbService.tasks) {
            window.dbService.tasks.update(task.id, {
              latencyMinutes: elapsedMins,
              done: true,
              status: 'all_done',
              attemptsLeft: 3
            });
          }
          if (window.dbService.caregiverAlerts) {
            window.dbService.caregiverAlerts.create(completionAlert, state.uid || 'SAK-PT-8842');
          }
          if (window.dbService.telemetry && state.calendarMonthDays[24]) {
            window.dbService.telemetry.saveRecord(state.calendarMonthDays[24], state.uid || 'SAK-PT-8842');
          }
          if (window.dbService.progression) {
            window.dbService.progression.update(state.uid || 'SAK-PT-8842');
          }
        }

        // Auto-advance currentCueIndex to the next pending activity so the user is never stuck
        const nextPendingIdx = state.tasks.findIndex((t, idx) => idx > currentCueIndex && !t.done);
        if (nextPendingIdx !== -1) {
          currentCueIndex = nextPendingIdx;
        } else {
          const anyPending = state.tasks.findIndex(t => !t.done);
          if (anyPending !== -1) {
            currentCueIndex = anyPending;
          } else if (currentCueIndex < state.tasks.length - 1) {
            currentCueIndex++;
          }
        }
        window.currentCueIndex = currentCueIndex;

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
        window.lockScroll();
        renderTimeframeInsights();
      }
    }

    function closeTelemetryModal() {
      const modal = document.getElementById('modalTelemetryRecord');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        window.unlockScroll();
      }
    }



    /* ==================== 2. ROUTINE CUES WITH 3-CHANCE SYSTEM ==================== */
    function switchRoutineMiniTab(tabType) {
      const cuesEl = document.getElementById('routine-miniview-cues');
      const directEl = document.getElementById('routine-miniview-direct');
      const tabCues = document.getElementById('mini-tab-cues');
      const tabDirect = document.getElementById('mini-tab-direct');

      // REC-3.0-202605: Persist active routine subtab per authenticated account
      try {
        let userId = 'default';
        const userObj = JSON.parse(localStorage.getItem('saksham_active_user') || '{}');
        if (userObj && (userObj.id || userObj.uid || userObj.username)) {
          userId = userObj.id || userObj.uid || userObj.username;
        } else if (typeof state !== 'undefined' && state && state.uid) {
          userId = state.uid;
        }
        localStorage.setItem('saksham_active_routine_subtab_' + userId, tabType);
      } catch (e) {}

      if (cuesEl) cuesEl.classList.toggle('hidden', tabType !== 'cues');
      if (directEl) directEl.classList.toggle('hidden', tabType !== 'direct');

      if (tabType === 'cues') {
        if (tabCues) tabCues.className = "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-teal-700 to-emerald-700 text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer";
        if (tabDirect) tabDirect.className = "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer";
        if (typeof renderActiveCueCard === 'function') renderActiveCueCard();
      } else {
        if (tabDirect) tabDirect.className = "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-teal-700 to-emerald-700 text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer";
        if (tabCues) tabCues.className = "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer";
        if (typeof renderDirectTasksList === 'function') renderDirectTasksList();
      }
    }

    function renderActiveCueCard() {
      if (!state || !state.tasks || state.tasks.length === 0) return;
      if (typeof currentCueIndex === 'undefined' || currentCueIndex >= state.tasks.length || currentCueIndex < 0) {
        currentCueIndex = 0;
      }
      window.currentCueIndex = currentCueIndex;
      const task = state.tasks[currentCueIndex];
      const box = document.getElementById('activeCueBox');
      const indexTxt = document.getElementById('cueCurrentIndexTxt');
      const heartsDisplay = document.getElementById('cueHeartsDisplay');

      if (indexTxt) indexTxt.innerText = `${currentCueIndex + 1} of ${state.tasks.length}`;
      if (!task || !box) return;

      const nextTask = (currentCueIndex < state.tasks.length - 1) ? state.tasks[currentCueIndex + 1] : null;

      // When the task is already completed, display a celebratory completed card with direct action to proceed
      if (task.done) {
        if (heartsDisplay) heartsDisplay.innerText = "✅ Completed!";
        box.innerHTML = `
          <div class="flex justify-between items-center">
            <span class="text-xs font-black text-emerald-800 uppercase tracking-wider bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
              Scheduled: ${task.time} (${task.tag})
            </span>
            <span class="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <i class="fa-solid fa-circle-check text-emerald-600"></i> Completed
            </span>
          </div>

          <div class="p-4 sm:p-5 bg-gradient-to-br from-emerald-50 via-teal-50/60 to-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-950 space-y-3 shadow-xs">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-lg font-black shadow-md shrink-0 mt-0.5">
                <i class="fa-solid fa-check"></i>
              </div>
              <div class="flex-1">
                <h4 class="font-black text-base sm:text-lg text-emerald-950 leading-snug font-heading">
                  "${task.title}" Completed! 🎉
                </h4>
                <p class="text-xs text-emerald-800 mt-1 font-medium">
                  Adherence successfully logged at ${task.time}. Latency: ${task.latencyMinutes || 4} min.
                </p>
              </div>
            </div>

            ${task.photo ? `
              <div class="flex items-center gap-3 p-2.5 bg-white/80 rounded-2xl border border-emerald-300">
                <img src="${task.photo}" class="w-16 h-16 rounded-xl object-cover border border-emerald-400 shadow-xs" alt="Completion Proof">
                <div class="flex-1">
                  <span class="text-xs font-black text-emerald-950">Photo Proof Logged 📸</span>
                  <p class="text-[11px] text-emerald-800 font-medium mt-0.5">Captured with device camera / uploaded file.</p>
                </div>
              </div>
            ` : `
              <div class="flex items-center justify-between p-2 bg-white/50 rounded-xl border border-emerald-200">
                <span class="text-xs font-bold text-emerald-900">Proof photo (camera / file):</span>
                <label class="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-2xs">
                  <i class="fa-solid fa-camera text-emerald-600"></i> Add Photo
                  <input type="file" accept="image/*" capture="environment" class="hidden" onchange="attachTaskPhoto(${task.id}, this)">
                </label>
              </div>
            `}

            ${nextTask ? `
              <div class="pt-3 border-t border-emerald-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div class="text-xs text-emerald-900 font-semibold">
                  <span class="font-black text-emerald-950">Next Activity:</span> ${nextTask.title} (${nextTask.time})
                </div>
                <button onclick="nextCueItem()" class="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer">
                  <span>Go to Next Step</span>
                  <i class="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            ` : `
              <div class="pt-2 border-t border-emerald-200 text-center py-2">
                <span class="text-xs sm:text-sm font-black text-emerald-900">🌟 Outstanding! You have completed all scheduled daily activities!</span>
              </div>
            `}
          </div>

          <div class="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-200/60">
            <button onclick="speakText('Activity ${task.title} is marked completed. You did great!')" class="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50">
              <i class="fa-solid fa-volume-high text-teal-600 mr-1"></i> Speak Status
            </button>
            <div class="flex gap-2">
              <button onclick="openTaskRunner(${task.id})" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition">
                <i class="fa-solid fa-list-ol mr-1"></i> Review Steps
              </button>
              ${nextTask ? `
                <button onclick="nextCueItem()" class="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-xl text-xs font-black shadow transition flex items-center gap-1.5 cursor-pointer">
                  <span>Next Activity (${currentCueIndex + 2}/${state.tasks.length})</span> <i class="fa-solid fa-forward-step"></i>
                </button>
              ` : ''}
            </div>
          </div>
        `;
        return;
      }

      if (task.attemptsLeft === undefined) task.attemptsLeft = 3;
      const heartsStr = task.attemptsLeft === 3 ? "❤️❤️❤️ (3 Left)" : (task.attemptsLeft === 2 ? "❤️❤️🤍 (2 Left)" : (task.attemptsLeft === 1 ? "❤️🤍🤍 (1 Left)" : "🤍🤍🤍 (Guided)"));
      if (heartsDisplay) heartsDisplay.innerText = heartsStr;

      const optionLetters = ['A', 'B', 'C'];
      const isTimed = state.taskTimer.activeTaskId === task.id && state.taskTimer.status === 'running';

      // Check adaptive recommendations for this active cue task
      let cueAdaptiveTrayHtml = '';
      if (!task.done && window.SakshamAdaptiveEngine && typeof window.SakshamAdaptiveEngine.getRecommendations === 'function') {
        try {
          const trialState = window.SakshamPersonalization ? window.SakshamPersonalization.getTrialState() : null;
          const recs = window.SakshamAdaptiveEngine.getRecommendations({
            task: task,
            userProfile: trialState ? trialState.baselinePreferences : null,
            recordedFeedback: trialState ? trialState.difficultiesRecorded : null
          });
          const primary = recs && recs.primaryRecommendation;
          const isDismissed = window._dismissedTaskRecommendations && window._dismissedTaskRecommendations[task.id];

          if (primary && !isDismissed) {
            const helpfulSelected = window._ratedTaskAssistance && window._ratedTaskAssistance[task.id] === 'helpful';
            cueAdaptiveTrayHtml = `
              <div class="p-3.5 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200 text-xs space-y-2">
                <div class="flex items-center justify-between">
                  <span class="font-black text-teal-900 flex items-center gap-1.5">
                    <span>💡</span>
                    <span>Assistance Available: ${primary.label}</span>
                  </span>
                  <button type="button" onclick="dismissAdaptiveAssistance(${task.id})" class="text-slate-400 hover:text-slate-600 font-bold text-xs px-2 py-0.5 rounded cursor-pointer" aria-label="Dismiss">✕</button>
                </div>
                <p class="text-slate-700 leading-relaxed"><strong class="font-bold text-teal-950">Why suggested:</strong> ${primary.description}</p>
                <div class="flex flex-wrap items-center gap-2 pt-1">
                  <button type="button" onclick="applyAdaptiveAssistance(${task.id}, '${primary.category}')" class="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-black shadow-xs cursor-pointer active:scale-95">Try Assistance</button>
                  <button type="button" onclick="rateAdaptiveAssistance(${task.id}, '${primary.category}', 'helpful')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${helpfulSelected ? 'bg-emerald-200 border-emerald-300 text-emerald-900 font-black' : 'bg-white border-teal-200 text-teal-800 hover:bg-teal-100'}">👍 Helpful</button>
                  <button type="button" onclick="rateAdaptiveAssistance(${task.id}, '${primary.category}', 'unhelpful')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer">👎 Not for me</button>
                </div>
              </div>
            `;
          }
        } catch (e) {
          console.warn('[Adaptive Assistance Cue Tray Note]', e);
        }
      }

      const cueDifficultySavedHtml = (window._taskDifficultySavedStatus && window._taskDifficultySavedStatus[task.id]) ? `
        <div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>✓ Difficulty report recorded (${window._taskDifficultySavedStatus[task.id].savedAt}). Adaptive assistance updated!</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full font-bold border ${window._taskDifficultySavedStatus[task.id].isOnline ? 'bg-white text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-900 border-amber-300'}">
            ${window._taskDifficultySavedStatus[task.id].isOnline ? '☁️ Synced' : '⏳ Pending sync'}
          </span>
        </div>
      ` : '';

      if (isTimed) {
        if (heartsDisplay) heartsDisplay.innerText = "⏱️ 15m Task Active";
        box.innerHTML = `
          <div class="flex flex-wrap justify-between items-center gap-2 border-b border-teal-200/60 pb-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-black text-teal-800 uppercase tracking-wider bg-teal-100 px-3 py-1 rounded-full border border-teal-300">
                Scheduled: ${task.time} (${task.tag})
              </span>
              <span class="text-xs font-extrabold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1.5 animate-pulse">
                <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <span>15m Task In Progress</span>
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span id="cueLiveClock" class="text-sm font-mono font-black text-amber-950 bg-amber-200/80 px-3.5 py-1 rounded-xl border border-amber-400 shadow-xs flex items-center gap-1.5">
                <i class="fa-solid fa-stopwatch text-amber-700"></i> ${formatTimerClock(state.taskTimer.remainingSeconds)} Left
              </span>
            </div>
          </div>

          <!-- Active 15m Task Card Body -->
          <div class="p-4 sm:p-5 bg-gradient-to-br from-teal-50/90 via-emerald-50/70 to-teal-50 border-2 border-teal-400/60 rounded-2xl text-slate-900 space-y-3.5 shadow-sm">
            <div class="flex items-start gap-3.5">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center text-xl font-black shadow-md shrink-0 mt-0.5">
                <i class="fa-solid fa-person-walking text-amber-200"></i>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md">
                    Active Clinical Routine
                  </span>
                  <span class="text-xs text-slate-500 font-semibold">• 15-Minute Dedicated Window</span>
                </div>
                <h4 class="font-black text-base sm:text-xl text-slate-900 leading-snug font-heading mt-0.5">
                  ${task.title}
                </h4>
                <p class="text-xs text-slate-600 mt-1 font-medium">
                  ${task.cueHint || 'Please take 15 minutes to calmly perform this activity.'}
                </p>
              </div>
            </div>

            ${cueAdaptiveTrayHtml}
            ${cueDifficultySavedHtml}

            <!-- Live 15m Countdown Progress Bar -->
            <div class="space-y-1.5 pt-1">
              <div class="flex justify-between items-center text-[11px] font-bold text-slate-600">
                <span>Activity Progress</span>
                <span id="cueLiveClockSmall" class="font-mono text-teal-800 font-extrabold">${formatTimerClock(state.taskTimer.remainingSeconds)} / 15:00</span>
              </div>
              <div class="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden p-0.5 shadow-inner">
                <div id="cueLiveTimerBar" class="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 h-full rounded-full transition-all duration-1000 shadow-sm" style="width: ${(state.taskTimer.remainingSeconds / state.taskTimer.totalSeconds) * 100}%"></div>
              </div>
            </div>

            <!-- Step Instructions Preview -->
            <div class="bg-white/90 p-3.5 rounded-xl border border-teal-200/80 space-y-2">
              <span class="text-[11px] font-black uppercase text-teal-900 tracking-wider flex items-center gap-1.5">
                <i class="fa-solid fa-list-check text-teal-600"></i> Quick Step Guide:
              </span>
              <div class="space-y-1.5 text-xs text-slate-700 font-semibold">
                ${(task.runnerSteps || [
                  `Review instructions for ${task.title}`,
                  `Perform at a steady, relaxed pace (approx. 15 minutes)`,
                  `Confirm completed and log adherence`
                ]).map((s, i) => `
                  <div class="flex items-center gap-2">
                    <span class="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black flex items-center justify-center shrink-0">${i+1}</span>
                    <span>${s}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- PRIMARY COMPLETION ACTION: COMPLETE & NEXT ACTIVITY -->
            <div class="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-teal-200/80">
              <div class="text-xs text-slate-600 font-medium">
                Done with this 15m task? Tap below to record adherence and continue!
              </div>
              <button onclick="finishTaskRunnerWithId(${task.id})" class="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-300/40">
                <i class="fa-solid fa-circle-check text-emerald-200 text-base"></i>
                <span>Complete &amp; Next Activity</span>
                <i class="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>

          <!-- Auxiliary Action Controls Row -->
          <div class="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-200/60">
            <div class="flex items-center gap-2">
              <button onclick="extendTaskTimer(5)" class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                <i class="fa-solid fa-clock-rotate-left text-amber-600"></i> +5m More Time
              </button>
              <button onclick="openTaskHelpModal(${task.id})" class="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                <i class="fa-solid fa-hand-holding-hand text-teal-600"></i> Need Assistance?
              </button>
              <button type="button" onclick="openTaskDifficultyModal(${task.id})" class="text-xs font-semibold text-slate-500 hover:text-teal-700 underline flex items-center gap-1 cursor-pointer" aria-label="Having trouble with this task? Report difficulty">
                <i class="fa-solid fa-question-circle text-teal-600"></i> Having trouble?
              </button>
            </div>
            <div class="flex gap-2">
              <button onclick="openTaskRunner(${task.id})" class="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-teal-300 font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer">
                <i class="fa-solid fa-expand text-[10px]"></i> Fullscreen Timer &amp; Checklist
              </button>
            </div>
          </div>
        `;
        return;
      }

      box.innerHTML = `
        <div class="flex justify-between items-center">
          <span class="text-xs font-black text-teal-700 uppercase tracking-wider bg-teal-100 px-3 py-1 rounded-full border border-teal-200">
            Scheduled: ${task.time} (${task.tag})
          </span>
          <div class="flex items-center gap-2">
            ${window._activeTaskAssistance && window._activeTaskAssistance[task.id] ? `<span class="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">Active: ${window._activeTaskAssistance[task.id].replace(/_/g, ' ')}</span>` : ''}
            <span class="text-xs font-bold text-slate-500">Pending Action</span>
          </div>
        </div>

        ${cueAdaptiveTrayHtml}
        ${cueDifficultySavedHtml}

        <h4 class="text-base sm:text-lg font-black text-slate-900 leading-snug font-heading">
          "${task.cueQuestion}"
        </h4>

        <div class="grid grid-cols-1 gap-2.5 pt-1">
          ${task.cueOptions.map((opt, optIdx) => `
            <button onclick="handleTaskCueAnswer(${optIdx})" class="p-3.5 bg-white hover:bg-teal-50/50 border-2 border-slate-200 hover:border-teal-500 rounded-2xl text-left text-xs sm:text-sm font-bold text-slate-800 transition flex items-center space-x-3 shadow-xs cursor-pointer">
              <span class="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 font-black text-xs flex items-center justify-center shrink-0 border border-teal-200">${optionLetters[optIdx]}</span>
              <span>${opt}</span>
            </button>
          `).join('')}
        </div>

        <div id="cueFeedbackAlert" class="hidden p-3 rounded-2xl text-xs font-bold"></div>

        <div class="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-200/60">
          <div class="flex items-center gap-3">
            <button onclick="revealCueHint()" class="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">
              Need a clue? Tap for hint
            </button>
            <button type="button" onclick="openTaskDifficultyModal(${task.id})" class="text-xs font-semibold text-slate-500 hover:text-teal-700 underline flex items-center gap-1 cursor-pointer" aria-label="Having trouble with this task? Report difficulty">
              <i class="fa-solid fa-question-circle text-teal-600"></i> Having trouble with this task?
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <button onclick="speakText('${task.title}')" class="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
              <i class="fa-solid fa-volume-high text-teal-600 mr-1"></i> Speak
            </button>
            <button onclick="startRoutine15mTask(${task.id})" class="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-play"></i> Start 15m Task
            </button>
          </div>
        </div>
      `;
    }

    async function attachTaskPhoto(taskId, input) {
      const file = input && input.files && input.files[0];
      if (!file) return;
      const task = state.tasks && state.tasks.find(t => t.id === taskId);
      if (!task) return;
      try {
        const dataUrl = (typeof window.readLovedOnePhoto === 'function')
          ? await window.readLovedOnePhoto(file)
          : await new Promise((res, rej) => {
              const r = new FileReader();
              r.onload = () => res(r.result);
              r.onerror = rej;
              r.readAsDataURL(file);
            });
        task.photo = dataUrl;
        if (typeof persistTasks === 'function') persistTasks();
        renderActiveCueCard();
        if (typeof showToast === 'function') showToast('Photo proof saved! 📸', 'success');
      } catch (e) {
        alert('Could not attach photo: ' + (e.message || e));
      } finally {
        if (input) input.value = '';
      }
    }
    window.attachTaskPhoto = attachTaskPhoto;

    function prevCueItem() {
      if (currentCueIndex > 0) {
        currentCueIndex--;
        window.currentCueIndex = currentCueIndex;
        renderActiveCueCard();
        playAudioChime('chime');
      }
    }

    function nextCueItem() {
      if (state && state.tasks && currentCueIndex < state.tasks.length - 1) {
        currentCueIndex++;
        window.currentCueIndex = currentCueIndex;
        renderActiveCueCard();
        playAudioChime('chime');
      }
    }

    function handleTaskCueAnswer(selectedIdx) {
      const task = state.tasks[currentCueIndex];
      const alertBox = document.getElementById('cueFeedbackAlert');
      if (!alertBox || !task) return;
      alertBox.classList.remove('hidden');

      if (selectedIdx === task.correctOptionIndex) {
        if (typeof awardGameScore === 'function') {
          awardGameScore(25, 'Task Cue Recall');
        }
        if (typeof playAudioChime === 'function') {
          playAudioChime('fanfare');
        }
        if (typeof confetti === 'function') {
          confetti({ particleCount: 50, spread: 55 });
        }

        alertBox.className = "p-4 rounded-2xl text-xs font-bold bg-emerald-50 border-2 border-emerald-300 text-emerald-950 space-y-3";
        alertBox.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="text-base">⭐</span>
            <span class="font-black text-sm text-emerald-900 font-heading">Perfect Recall! That is correct (+25 XP)!</span>
          </div>
          <p class="text-emerald-800 text-xs">Today's routine task is: <strong>"${task.title}"</strong> at <strong>${task.time}</strong>.</p>
          <p class="text-emerald-700 text-[11px]">Please start your 15-minute routine task to stay on track.</p>
          <div class="flex flex-wrap items-center gap-2 pt-1">
            <button onclick="startRoutine15mTask(${task.id})" class="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer border border-emerald-300/30">
              <i class="fa-solid fa-play"></i> Start 15m Task
            </button>
            <button onclick="openTaskRunner(${task.id})" class="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5">
              <i class="fa-solid fa-list-ol text-teal-600"></i> Review Steps Drill
            </button>
          </div>
        `;

        speakText(`Perfect recall! Now please tap Start 15-minute task for ${task.title}.`);
      } else {
        task.attemptsLeft = Math.max(0, (task.attemptsLeft || 3) - 1);
        if (typeof playAudioChime === 'function') playAudioChime('pulse');

        if (task.attemptsLeft === 2) {
          alertBox.className = "p-3.5 rounded-2xl text-xs font-bold bg-amber-50 border border-amber-200 text-amber-900";
          alertBox.innerHTML = `<strong>Chance 1 missed:</strong> Take a deep breath! You have 2 chances left (❤️❤️🤍). Give it another try!`;
          speakText("First chance missed. Take a calm breath and try again.");
        } else if (task.attemptsLeft === 1) {
          alertBox.className = "p-3.5 rounded-2xl text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-900";
          alertBox.innerHTML = `<strong>Chance 2 missed (Hint Revealed):</strong> ${task.cueHint}. You have 1 chance left (❤️🤍🤍)!`;
          speakText(`Here is a helpful hint: ${task.cueHint}. Try one more time.`);
        } else {
          alertBox.className = "p-4 rounded-2xl text-xs font-bold bg-rose-50 border border-rose-300 text-rose-950 space-y-3";
          alertBox.innerHTML = `
            <div>
              <p class="font-black text-sm text-rose-900">🤍🤍🤍 Direct Guided Assistance:</p>
              <p class="mt-1">No worries at all! Today's exact task is: <strong>${task.title}</strong> at <strong>${task.time}</strong>.</p>
              <p class="text-rose-700 text-[11px] mt-0.5">${task.cueHint}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <button onclick="startRoutine15mTask(${task.id})" class="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition border border-emerald-300/30">
                <i class="fa-solid fa-play"></i> Start 15m Task
              </button>
              <button onclick="openTaskRunner(${task.id})" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5">
                <i class="fa-solid fa-list-ol"></i> Guided Drill
              </button>
            </div>
          `;
          speakText(`All 3 chances completed. Your task right now is: ${task.title}. Tap Start 15-minute task to begin!`);
        }
        const heartsDisplay = document.getElementById('cueHeartsDisplay');
        if (heartsDisplay) {
          heartsDisplay.innerText = task.attemptsLeft === 2 ? "❤️❤️🤍 (2 Left)" : (task.attemptsLeft === 1 ? "❤️🤍🤍 (1 Left)" : "🤍🤍🤍 (Guided)");
        }
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
      if (!container || !state || !state.tasks) return;
      const tier = window.currentAgeTier || 'youth';
      let firstPendingFound = false;

      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();

      container.innerHTML = state.tasks.map(t => {
        const isDone = t.done;
        const isNotDone = t.status === 'not_done';
        const isTimed = state.taskTimer.activeTaskId === t.id && state.taskTimer.status === 'running';
        const isSeniorHalo = tier === 'senior' && !isDone && !isNotDone && !firstPendingFound;
        if (isSeniorHalo) firstPendingFound = true;

        const taskMins = typeof parseTimeToMinutes === 'function' ? parseTimeToMinutes(t.time) : -1;
        const isCurrentLiveSlot = taskMins >= 0 && (Math.abs(taskMins - currentMins) <= 30 || (currentMins >= taskMins && currentMins - taskMins <= 45));

        // Life-stage tailored styling
        let tierBadgeHtml = '';
        if (tier === 'youth') {
          tierBadgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-violet-100 text-violet-800 border border-violet-300">⚡ +25 XP</span>`;
        } else if (tier === 'adult') {
          tierBadgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">⏱️ ~10 mins</span>`;
        } else {
          tierBadgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">🌸 Step</span>`;
        }

        const liveBadgeHtml = (!isDone && isCurrentLiveSlot)
          ? `<span class="text-[10px] font-black text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 animate-pulse"><i class="fa-solid fa-clock"></i> Live Time</span>`
          : '';

        const cardBorderClass = tier === 'senior'
          ? (isDone ? 'bg-emerald-50/70 border-2 border-emerald-300' : (isCurrentLiveSlot ? 'bg-amber-50/60 border-2 border-amber-400 shadow-sm' : 'bg-[#FFFDF9] border-2 border-[#A4C4A8]'))
          : (tier === 'adult'
              ? (isDone ? 'bg-slate-50 border border-slate-300' : (isCurrentLiveSlot ? 'bg-amber-50/40 border-2 border-amber-400 shadow-sm' : 'bg-white border border-slate-200'))
              : (isDone ? 'bg-teal-50/60 border-teal-200' : (isNotDone ? 'bg-rose-50 border-rose-200' : (isTimed ? 'bg-teal-50/50 border-2 border-teal-500 shadow-md ring-2 ring-teal-400/20' : (isCurrentLiveSlot ? 'bg-amber-50/40 border-2 border-amber-400 shadow-sm' : 'bg-white border-slate-200')))));

        const btnTouchClass = tier === 'senior' ? 'min-h-[52px] min-w-[52px]' : 'w-8 h-8';

        // Check adaptive recommendations
        let adaptiveTrayHtml = '';
        if (!isDone && window.SakshamAdaptiveEngine && typeof window.SakshamAdaptiveEngine.getRecommendations === 'function') {
          try {
            const trialState = window.SakshamPersonalization ? window.SakshamPersonalization.getTrialState() : null;
            const recs = window.SakshamAdaptiveEngine.getRecommendations({
              task: t,
              userProfile: trialState ? trialState.baselinePreferences : null,
              recordedFeedback: trialState ? trialState.difficultiesRecorded : null
            });
            const primary = recs && recs.primaryRecommendation;
            const isDismissed = window._dismissedTaskRecommendations && window._dismissedTaskRecommendations[t.id];

            if (primary && !isDismissed) {
              const helpfulSelected = window._ratedTaskAssistance && window._ratedTaskAssistance[t.id] === 'helpful';
              adaptiveTrayHtml = `
                <div class="mt-2.5 p-3.5 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200 text-xs space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="font-black text-teal-900 flex items-center gap-1.5">
                      <span>💡</span>
                      <span>Assistance Available: ${primary.label}</span>
                    </span>
                    <button type="button" onclick="dismissAdaptiveAssistance(${t.id})" class="text-slate-400 hover:text-slate-600 font-bold text-xs px-2 py-0.5 rounded cursor-pointer" aria-label="Dismiss">✕</button>
                  </div>
                  <p class="text-slate-700 leading-relaxed"><strong class="font-bold text-teal-950">Why suggested:</strong> ${primary.description}</p>
                  <div class="flex flex-wrap items-center gap-2 pt-1">
                    <button type="button" onclick="applyAdaptiveAssistance(${t.id}, '${primary.category}')" class="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-black shadow-xs cursor-pointer active:scale-95">Try Assistance</button>
                    <button type="button" onclick="rateAdaptiveAssistance(${t.id}, '${primary.category}', 'helpful')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${helpfulSelected ? 'bg-emerald-200 border-emerald-300 text-emerald-900 font-black' : 'bg-white border-teal-200 text-teal-800 hover:bg-teal-100'}">👍 Helpful</button>
                    <button type="button" onclick="rateAdaptiveAssistance(${t.id}, '${primary.category}', 'unhelpful')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer">👎 Not for me</button>
                  </div>
                </div>
              `;
            }
          } catch (e) {
            console.warn('[Adaptive Assistance Tray Render Note]', e);
          }
        }

        return `
          <div class="task-card-item patient-card p-4 sm:p-5 rounded-2xl ${cardBorderClass} shadow-xs transition space-y-2" data-task-id="${t.id}">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center space-x-3.5 flex-1 cursor-pointer" onclick="toggleTask(${t.id})">
                <button type="button" onclick="event.stopPropagation(); toggleTask(${t.id})" class="${btnTouchClass} rounded-2xl border-2 flex items-center justify-center transition shrink-0 ${isSeniorHalo ? 'guidance-halo' : ''} ${isDone ? 'bg-teal-600 border-teal-600 text-white shadow-sm' : (isNotDone ? 'bg-rose-600 border-rose-600 text-white' : 'border-slate-300 bg-white hover:border-teal-500')}" title="${isDone ? 'Mark as pending' : 'Check off as completed'}">
                  ${isDone ? '<i class="fa-solid fa-check text-base"></i>' : (isNotDone ? '<i class="fa-solid fa-xmark text-base"></i>' : (tier === 'senior' ? '👉' : ''))}
                </button>
                <div class="min-w-0 flex-1">
                  <p class="font-black text-sm sm:text-base ${isDone ? 'line-through text-slate-400' : (tier === 'senior' ? 'text-[#14331C]' : 'text-slate-800')}">${t.title}</p>
                  <div class="flex items-center flex-wrap gap-1.5 mt-1">
                    <span class="text-xs font-mono font-bold text-slate-500">${t.time}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${isDone ? 'bg-teal-100 text-teal-800' : (isNotDone ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700')}">
                      ${isDone ? 'Completed' : (isNotDone ? 'Not Done' : t.tag)}
                    </span>
                    ${tierBadgeHtml}
                    ${liveBadgeHtml}
                    ${isTimed ? `
                      <span id="live-timer-badge-${t.id}" class="text-xs font-mono font-black text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse flex items-center gap-1">
                        ⏱️ ${formatTimerClock(state.taskTimer.remainingSeconds)} left
                      </span>
                    ` : ''}
                    ${t.latencyMinutes >= 15 ? `<span class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">Took ${t.latencyMinutes}m</span>` : ''}
                  </div>
                </div>
              </div>

              <div class="flex items-center flex-wrap gap-2 self-end sm:self-center shrink-0">
                ${!isDone ? `
                  <button onclick="openTaskRunner(${t.id}, 15)" class="px-3 py-1.5 ${isTimed ? 'bg-slate-900 text-teal-300' : 'bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-300'} rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                    <i class="fa-solid fa-stopwatch"></i> ${isTimed ? 'Runner' : 'Start 15m'}
                  </button>
                  ${isTimed ? `
                    <button onclick="openTaskHelpModal(${t.id})" class="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold border border-amber-300 flex items-center gap-1 cursor-pointer">
                      <i class="fa-solid fa-hand-holding-hand"></i> Stuck?
                    </button>
                    <button onclick="finishTaskRunnerWithId(${t.id})" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow transition flex items-center gap-1 cursor-pointer">
                      <i class="fa-solid fa-check"></i> Done
                    </button>
                  ` : `
                    <button onclick="postponeTask(${t.id}, 5)" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer">+5m</button>
                    <button onclick="markTaskNotDone(${t.id})" class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold border border-rose-200 cursor-pointer">Not Done</button>
                  `}
                ` : `
                  <span class="text-xs font-bold text-emerald-600 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-1">
                    <i class="fa-solid fa-circle-check"></i> Done
                  </span>
                `}
                <button onclick="openCaregiverAddTaskModal(${t.id})" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1 cursor-pointer" title="Edit Activity">
                  <i class="fa-solid fa-pen-to-square text-slate-500"></i> <span>Edit</span>
                </button>
                <button onclick="deleteTask(${t.id})" class="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold border border-rose-200 flex items-center gap-1 cursor-pointer" title="Delete Activity">
                  <i class="fa-solid fa-trash-can text-rose-500"></i>
                </button>
                <button onclick="speakText('${t.title} at ${t.time}')" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold flex items-center space-x-1 cursor-pointer" title="Read Aloud">
                  <i class="fa-solid fa-volume-high text-teal-600"></i>
                </button>
              </div>
            </div>

            ${adaptiveTrayHtml}

            ${window._taskDifficultySavedStatus && window._taskDifficultySavedStatus[t.id] ? `
              <div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between">
                <span>✓ Difficulty report recorded (${window._taskDifficultySavedStatus[t.id].savedAt}). Adaptive assistance updated!</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-bold border ${window._taskDifficultySavedStatus[t.id].isOnline ? 'bg-white text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-900 border-amber-300'}">
                  ${window._taskDifficultySavedStatus[t.id].isOnline ? '☁️ Synced' : '⏳ Pending sync'}
                </span>
              </div>
            ` : ''}

            ${!isDone ? `
              <div class="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100/90">
                <button type="button" onclick="openTaskDifficultyModal(${t.id})" class="text-slate-500 hover:text-teal-700 font-semibold underline flex items-center gap-1 cursor-pointer">
                  <i class="fa-solid fa-question-circle text-teal-600"></i> Having trouble with this task?
                </button>
                ${window._activeTaskAssistance && window._activeTaskAssistance[t.id] ? `<span class="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">Active: ${window._activeTaskAssistance[t.id].replace(/_/g, ' ')}</span>` : ''}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      // Update any senior step halo or UI if in senior mode
      try {
        if (typeof updateSeniorStepUI === 'function') updateSeniorStepUI();
      } catch (e) {}
    }

    function toggleTask(id) {
      const task = state.tasks.find(t => t.id === id);
      if (task) {
        task.done = !task.done;
        task.status = task.done ? 'done' : 'pending';
        if (task.done) {
          if (typeof playAudioChime === 'function') playAudioChime('chime');
          if (typeof awardGameScore === 'function') awardGameScore(25, 'Task Completion');
          if (typeof confetti === 'function') confetti({ particleCount: 40, spread: 50 });
          if (typeof speakText === 'function') speakText(`Activity marked completed: ${task.title}. Great dedication!`);
          if (state.taskTimer.activeTaskId === id) {
            stopTaskTimer();
          }
        }
        if (window.dbService && window.dbService.tasks) {
          window.dbService.tasks.update(id, { done: task.done, status: task.status }).catch(e => console.warn(e));
        }
        if (typeof persistTasks === 'function') persistTasks();

        if (typeof renderDirectTasksList === 'function') renderDirectTasksList();
        if (typeof renderActiveCueCard === 'function') renderActiveCueCard();
        if (typeof updateChartsData === 'function') updateChartsData();
        if (typeof renderTimeframeInsights === 'function') renderTimeframeInsights();
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
        task.snoozed = true;
        task.snoozeCount = (task.snoozeCount || 0) + 1;

        const alertText = `Task "${task.title}" postponed by ${minutes} mins to ${task.time} by Kalyani.`;
        const alertObj = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: alertText
        };
        state.caregiverAlerts.unshift(alertObj);

        if (window.dbService && window.dbService.tasks) {
          window.dbService.tasks.update(id, { time: task.time, snoozed: true, snoozeCount: task.snoozeCount });
        }
        if (window.dbService && window.dbService.caregiverAlerts) {
          window.dbService.caregiverAlerts.create(alertObj, state.uid || 'SAK-PT-8842');
        }

        persistTasks();
        renderDirectTasksList();
        renderActiveCueCard();
        renderCaregiverAlerts();
        renderTimeframeInsights();
        if (typeof renderCaregiverOverviewTelemetry === 'function') {
          renderCaregiverOverviewTelemetry();
        }
        if (typeof updateChartsData === 'function') {
          updateChartsData();
        }
        playAudioChime('chime');
        speakText(`Task "${task.title}" postponed by ${minutes} minutes to ${task.time}.`);
      }
    }

    function markTaskNotDone(id) {
      const task = state.tasks.find(t => t.id === id);
      if (task) {
        task.done = false;
        task.status = 'not_done';
        const alertObj = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ Task "${task.title}" marked as Not Done.`
        };
        state.caregiverAlerts.unshift(alertObj);

        if (window.dbService && window.dbService.tasks) {
          window.dbService.tasks.update(id, { done: false, status: 'not_done' });
        }
        if (window.dbService && window.dbService.caregiverAlerts) {
          window.dbService.caregiverAlerts.create(alertObj, state.uid || 'SAK-PT-8842');
        }

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
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '99999';
        window.lockScroll();

        // Clear input and focus
        const titleInput = document.getElementById('newTaskTitle');
        if (titleInput) {
          titleInput.value = '';
          setTimeout(() => titleInput.focus(), 80);
        }

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
        modal.style.display = 'none';
        window.unlockScroll();
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
        if (titleInput) titleInput.focus();
        return;
      }

      const timeMins = typeof parseTimeToMinutes === 'function' ? parseTimeToMinutes(tm) : 0;
      const displayTime = typeof formatMinutesTo12Hour === 'function' ? formatMinutesTo12Hour(timeMins) : tm;

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

      if (typeof alertedTaskMinutes !== 'undefined') {
        delete alertedTaskMinutes[newTask.id];
      }

      state.tasks.push(newTask);
      state.tasks.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
      if (typeof persistTasks === 'function') persistTasks();

      if (window.dbService && window.dbService.tasks) {
        window.dbService.tasks.create(newTask, state.uid || 'SAK-PT-8842').catch(e => console.warn(e));
      }

      try { if (typeof renderDirectTasksList === 'function') renderDirectTasksList(); } catch (e) {}
      try { if (typeof renderActiveCueCard === 'function') renderActiveCueCard(); } catch (e) {}
      try { if (typeof renderCaregiverManagedTasks === 'function') renderCaregiverManagedTasks(); } catch (e) {}
      try { if (typeof updateChartsData === 'function') updateChartsData(); } catch (e) {}
      try { if (typeof renderTimeframeInsights === 'function') renderTimeframeInsights(); } catch (e) {}

      closeAddTaskModal();
      if (titleInput) titleInput.value = '';

      if (typeof playAudioChime === 'function') playAudioChime('chime');
      if (typeof showSakshamToast === 'function') {
        showSakshamToast(`✅ Activity saved: ${t} at ${displayTime}!`, 'success');
      }
      if (typeof speakText === 'function') {
        speakText(`Activity saved: ${t} at ${displayTime}. Saksham will sound an alarm when it is time.`);
      }
      if (typeof checkScheduledReminders === 'function') checkScheduledReminders();
    }

    // Expose explicitly to window
    window.openAddTaskModal = openAddTaskModal;
    window.closeAddTaskModal = closeAddTaskModal;
    window.saveNewTask = saveNewTask;
    window.prevCueItem = prevCueItem;
    window.nextCueItem = nextCueItem;
    window.handleTaskCueAnswer = handleTaskCueAnswer;
    window.renderActiveCueCard = renderActiveCueCard;
    window.revealCueHint = revealCueHint;
    window.finishTaskRunner = finishTaskRunner;
    window.finishTaskRunnerWithId = finishTaskRunnerWithId;
    window.openTaskRunner = openTaskRunner;
    window.closeTaskRunner = closeTaskRunner;
    window.toggleRunnerStepCheckbox = toggleRunnerStepCheckbox;
    window.speakRunnerSteps = speakRunnerSteps;
    window.switchRoutineMiniTab = switchRoutineMiniTab;
    window.toggleTask = toggleTask;
    window.postponeTask = postponeTask;
    window.renderDirectTasksList = renderDirectTasksList;
    window.formatTimerClock = formatTimerClock;

    function adjustFontSize(delta) {
      baseFontSize = Math.max(12, Math.min(22, baseFontSize + delta));
      document.body.style.fontSize = baseFontSize + 'px';
    }

    // Global listener for cross-tab or cross-component task updates
    window.addEventListener('saksham:tasks-updated', () => {
      renderDirectTasksList();
      renderActiveCueCard();
      renderCaregiverManagedTasks();
      updateChartsData();
      renderTimeframeInsights();
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'saksham_tasks') {
        if (typeof loadPersistedTasks === 'function') loadPersistedTasks();
        renderDirectTasksList();
        renderActiveCueCard();
        renderCaregiverManagedTasks();
      }
    });

    window.deleteTask = function(taskId) {
      if (typeof deleteCaregiverTask === 'function') {
        deleteCaregiverTask(taskId);
      }
    };

    /* ======================================================================= */
    /* AGE-ADAPTIVE STRUCTURAL LAYOUT ENGINE (YOUTH / ADULT / SENIOR)          */
    /* ======================================================================= */

    // ─── SENIOR STEP-BY-STEP CAROUSEL STATE ──────────────────────────────────
    window.seniorStepsData = [
      {
        emoji: '🍵',
        stepNumber: 'Gentle Step 1 of 4',
        title: 'Morning Chai & Medicine',
        description: 'Please take a warm sip of tea or fresh water, and take your morning medicine peacefully.',
        buttonText: '🌸 Yes, I Have Taken My Chai & Meds',
        completed: false
      },
      {
        emoji: '☀️',
        stepNumber: 'Gentle Step 2 of 4',
        title: 'Gentle Sunshine Walk',
        description: 'Enjoy 10 minutes of gentle fresh air, soft daylight, and calm breathing.',
        buttonText: '☀️ Yes, I Enjoyed My Walk',
        completed: false
      },
      {
        emoji: '🧸',
        stepNumber: 'Gentle Step 3 of 4',
        title: 'Picture Memories & Loved Ones',
        description: 'Look at photos of loving family and grandchildren to bring a bright smile to your morning.',
        buttonText: '💖 View Loved Ones Photos',
        actionRoute: 'vault',
        completed: false
      },
      {
        emoji: '🍵',
        stepNumber: 'Gentle Step 4 of 4',
        title: 'Afternoon Rest & Soft Melodies',
        description: 'Rest your eyes in a comfortable chair and listen to gentle, soothing melodies.',
        buttonText: '🎵 Play Soft Calming Music',
        actionMusic: true,
        completed: false
      }
    ];
    window.currentSeniorStep = 0;

    function updateSeniorStepUI() {
      const step = window.seniorStepsData[window.currentSeniorStep] || window.seniorStepsData[0];
      const emoji = document.getElementById('seniorStepEmoji');
      const tracker = document.getElementById('seniorStepTracker');
      const title = document.getElementById('seniorStepTitle');
      const cardIcon = document.getElementById('seniorCardIcon');
      const cardHeading = document.getElementById('seniorCardHeading');
      const cardDesc = document.getElementById('seniorCardDescription');
      const btnActionText = document.getElementById('seniorBtnActionText');
      const dotsContainer = document.getElementById('seniorStepDots');

      if (emoji) emoji.innerText = step.emoji;
      if (tracker) tracker.innerText = step.stepNumber;
      if (title) title.innerText = step.title;
      if (cardIcon) cardIcon.innerText = step.emoji;
      if (cardHeading) cardHeading.innerText = step.title;
      if (cardDesc) cardDesc.innerText = step.description;
      if (btnActionText) {
        btnActionText.innerText = step.completed ? `✓ Done: ${step.title}` : step.buttonText;
      }
      if (dotsContainer) {
        dotsContainer.innerHTML = window.seniorStepsData.map((s, idx) => {
          const isActive = idx === window.currentSeniorStep;
          return `<span class="w-3.5 h-3.5 rounded-full ${isActive ? 'bg-[#2A5D34] ring-2 ring-[#8BAE8E]' : (s.completed ? 'bg-emerald-400' : 'bg-slate-300')} transition-all"></span>`;
        }).join('');
      }
    }

    function seniorNextStep() {
      window.currentSeniorStep = (window.currentSeniorStep + 1) % window.seniorStepsData.length;
      updateSeniorStepUI();
      if (typeof playAudioChime === 'function') playAudioChime('chime');
    }

    function seniorPrevStep() {
      window.currentSeniorStep = (window.currentSeniorStep - 1 + window.seniorStepsData.length) % window.seniorStepsData.length;
      updateSeniorStepUI();
      if (typeof playAudioChime === 'function') playAudioChime('chime');
    }

    function seniorCompleteCurrentStep() {
      const step = window.seniorStepsData[window.currentSeniorStep];
      if (!step) return;

      if (step.actionRoute) {
        if (typeof switchTab === 'function') switchTab(step.actionRoute);
        return;
      }

      step.completed = true;
      updateSeniorStepUI();
      if (typeof playAudioChime === 'function') playAudioChime('bell');
      if (typeof confetti === 'function') confetti({ particleCount: 50, spread: 50 });
      if (typeof speakText === 'function') {
        speakText(`Wonderful job, dear Kalyani ji! You have completed ${step.title}. You are doing so well.`);
      }

      setTimeout(() => {
        if (window.currentSeniorStep < window.seniorStepsData.length - 1) {
          window.currentSeniorStep++;
          updateSeniorStepUI();
        }
      }, 1200);
    }

    function seniorReadStepAloud() {
      const step = window.seniorStepsData[window.currentSeniorStep];
      if (step && typeof speakText === 'function') {
        speakText(`${step.title}. ${step.description}`);
      }
    }

    window.updateSeniorStepUI = updateSeniorStepUI;
    window.seniorNextStep = seniorNextStep;
    window.seniorPrevStep = seniorPrevStep;
    window.seniorCompleteCurrentStep = seniorCompleteCurrentStep;
    window.seniorReadStepAloud = seniorReadStepAloud;

    // ─── ADULT BREATHING PACER ENGINE ─────────────────────────────────────────
    let breathingTimer = null;
    let breathingSecondsLeft = 120;
    let isBreathingActive = false;

    function toggleBreathingPacer() {
      const btn = document.getElementById('btnBreathingToggle');
      const circle = document.getElementById('breathingCircle');
      const label = document.getElementById('breathingLabel');

      if (isBreathingActive) {
        clearInterval(breathingTimer);
        isBreathingActive = false;
        if (btn) btn.innerText = "Start 2-Min Pacer";
        if (circle) circle.className = "w-20 h-20 rounded-full bg-teal-500/20 border-2 border-teal-400 flex items-center justify-center text-center transition-all duration-1000 shadow-lg shadow-teal-500/20";
        if (label) label.innerText = "Ready";
        return;
      }

      isBreathingActive = true;
      breathingSecondsLeft = 120;
      if (btn) btn.innerText = "Pause Pacer (2:00)";
      if (typeof playAudioChime === 'function') playAudioChime('bell');
      if (typeof speakText === 'function') speakText("Inhale slowly... fill your lungs.");

      breathingTimer = setInterval(() => {
        breathingSecondsLeft--;
        if (breathingSecondsLeft <= 0) {
          clearInterval(breathingTimer);
          isBreathingActive = false;
          if (btn) btn.innerText = "Completed ✓ (Reset)";
          if (label) label.innerText = "Calm ✓";
          if (typeof speakText === 'function') speakText("Breathing reset complete. Your nervous system is centered.");
          return;
        }

        const mins = Math.floor(breathingSecondsLeft / 60);
        const secs = (breathingSecondsLeft % 60).toString().padStart(2, '0');
        if (btn) btn.innerText = `Pause Pacer (${mins}:${secs})`;

        const cyclePos = (120 - breathingSecondsLeft) % 14;
        if (cyclePos === 0) {
          if (circle) circle.className = "w-28 h-28 rounded-full bg-teal-400/30 border-4 border-teal-300 flex items-center justify-center text-center transition-all duration-1000 shadow-xl shadow-teal-400/40 scale-110";
          if (label) label.innerText = "Inhale (4s)";
          if (typeof speakText === 'function') speakText("Inhale");
        } else if (cyclePos === 4) {
          if (circle) circle.className = "w-28 h-28 rounded-full bg-indigo-500/30 border-4 border-indigo-300 flex items-center justify-center text-center transition-all duration-1000 shadow-xl shadow-indigo-400/40";
          if (label) label.innerText = "Hold (4s)";
        } else if (cyclePos === 8) {
          if (circle) circle.className = "w-20 h-20 rounded-full bg-teal-600/20 border-2 border-teal-500 flex items-center justify-center text-center transition-all duration-1000 shadow-md shadow-teal-500/20 scale-90";
          if (label) label.innerText = "Exhale (6s)";
          if (typeof speakText === 'function') speakText("Exhale gently");
        }
      }, 1000);
    }

    function triggerOverwhelmReset() {
      const widget = document.getElementById('adultBreathingWidget');
      if (widget) {
        widget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      toggleBreathingPacer();
    }

    window.toggleBreathingPacer = toggleBreathingPacer;
    window.triggerOverwhelmReset = triggerOverwhelmReset;

    // ─── ELDORA-INSPIRED DYNAMIC DEMOGRAPHIC ACCENT RENDERER ──────────────────
    // Renders character companion, daily gentle journey, guided task, and support hub per tier

    function getEldoraFamilyAvatarsHtml() {
      const people = (state && Array.isArray(state.familiarPeople) && state.familiarPeople.length > 0)
        ? state.familiarPeople
        : [
            { name: 'Ananya Sharma', role: 'Daughter', phone: '+91 98200 12345', photo: '' },
            { name: 'Vikram Sharma', role: 'Son', phone: '+91 98200 54321', photo: '' }
          ];

      const avatarsHtml = people.slice(0, 4).map((p) => {
        const photoSrc = p.photo && (p.photo.startsWith('data:image') || p.photo.startsWith('http') || p.photo.startsWith('/'))
          ? p.photo
          : (typeof getSafePersonPhoto === 'function' ? getSafePersonPhoto(p.name, p.role) : '');

        const photoHtml = photoSrc
          ? `<img src="${photoSrc}" alt="${p.name}" class="w-13 h-13 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-[#D7E6D9] shadow-xs">`
          : `<div class="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#FCEFDE] border-2 border-[#F4DCBE] flex items-center justify-center text-xl shadow-xs">👵</div>`;

        return `
          <div onclick="if(typeof openCallSimulation==='function'){openCallSimulation('${p.name.replace(/'/g, "\\'")}', '${(p.phone||'').replace(/'/g, "\\'")}');}" class="flex flex-col items-center space-y-1 shrink-0 cursor-pointer group" title="Tap to call ${p.name}">
            <div class="relative group-hover:scale-105 transition-transform">
              ${photoHtml}
              <span class="w-4 h-4 rounded-full bg-emerald-600 border-2 border-white absolute -bottom-0.5 -right-0.5 flex items-center justify-center text-[8px] text-white"><i class="fa-solid fa-phone"></i></span>
            </div>
            <span class="text-xs font-bold text-[#1C2C22] truncate max-w-[70px] text-center">${p.name.split(' ')[0]}</span>
            <span class="text-[10px] text-[#6B7280] truncate max-w-[70px] text-center">${p.role || 'Family'}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="flex items-center gap-3.5 overflow-x-auto pb-1 no-scrollbar">
          ${avatarsHtml}
          
          <!-- Doctor Card -->
          <div onclick="if(typeof openCallSimulation==='function'){openCallSimulation('Dr. Arpan Gupta', '+91 98200 11223');}" class="flex flex-col items-center space-y-1 shrink-0 cursor-pointer group" title="Call Neurologist">
            <div class="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#E8F1F5] border-2 border-[#D5E3EB] flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
              🩺
            </div>
            <span class="text-xs font-bold text-[#1C2C22]">Dr. Gupta</span>
            <span class="text-[10px] text-[#6B7280]">Doctor</span>
          </div>

          <!-- Caregiver Card -->
          <div onclick="if(typeof openCallSimulation==='function'){openCallSimulation('Sunita Sharma', '+91 98199 44556');}" class="flex flex-col items-center space-y-1 shrink-0 cursor-pointer group" title="Call Caregiver">
            <div class="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#F1EBF5] border-2 border-[#E3D6E8] flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
              🤝
            </div>
            <span class="text-xs font-bold text-[#1C2C22]">Sunita</span>
            <span class="text-[10px] text-[#6B7280]">Caregiver</span>
          </div>

          <!-- Add Loved One -->
          <div onclick="if(typeof openAddLovedOneModal==='function') openAddLovedOneModal();" class="flex flex-col items-center space-y-1 shrink-0 cursor-pointer" title="Add Loved One">
            <div class="w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 border-dashed border-[#CBD5E1] flex items-center justify-center text-slate-400 text-lg hover:border-[#234E35] hover:text-[#234E35] transition">
              <i class="fa-solid fa-plus"></i>
            </div>
            <span class="text-xs font-bold text-slate-500">Add</span>
            <span class="text-[10px] text-slate-400">Loved One</span>
          </div>
        </div>
      `;
    }

    function renderDynamicRoutineView(tier) {
      const validTier = ['youth', 'adult', 'senior'].includes(tier) ? tier : 'youth';
      let widget = document.getElementById('routineTierWidget');
      
      // If widget container not found in DOM, inject it before mini-tabs
      if (!widget) {
        const cuesTab = document.getElementById('mini-tab-cues');
        if (cuesTab && cuesTab.parentElement) {
          widget = document.createElement('div');
          widget.id = 'routineTierWidget';
          widget.className = 'w-full space-y-5';
          cuesTab.parentElement.parentElement.insertBefore(widget, cuesTab.parentElement);
        }
      }

      // Always ensure both mini-view components are rendered
      if (typeof renderActiveCueCard === 'function') {
        try { renderActiveCueCard(); } catch(e) {}
      }
      if (typeof renderDirectTasksList === 'function') {
        try { renderDirectTasksList(); } catch(e) {}
      }

      if (!widget) return;

      const total = state && state.tasks ? state.tasks.length : 8;
      const doneCount = state && state.tasks ? state.tasks.filter(t => t.done).length : 0;
      const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

      const pendingTask = (state && state.tasks)
        ? (state.tasks.find(t => !t.done) || state.tasks[0] || { id: 't1', title: 'Gentle Hydration & Morning Mobility', time: '09:00 AM' })
        : { id: 't1', title: 'Gentle Hydration & Morning Mobility', time: '09:00 AM' };

      if (validTier === 'youth') {
        const youthSvg = window.SakshamIllustrations ? window.SakshamIllustrations.getCompanionSvg({ size: 95, expression: 'dynamic' }) : '';
        const youthScore = 350 + doneCount * 25;

        widget.innerHTML = `
          <!-- YOUTH BANNER WITH COMPANION -->
          <section class="eldora-card bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white p-5 sm:p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
            <div class="space-y-1.5 max-w-xl">
              <div class="flex items-center gap-2">
                <span id="routineTierPill" class="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-full border border-amber-300/30">
                  Level 2 Mind Titan
                </span>
                <span id="routineTierExtra" class="text-xs font-mono font-bold text-emerald-200">
                  4-Day Streak 🔥 (<span id="youthScoreVal">${youthScore}</span> XP)
                </span>
              </div>
              <h2 class="text-xl sm:text-2xl font-black text-white leading-tight font-heading" id="lblGreeting">
                What's up, Kalyani! ⚡
              </h2>
              <p class="text-xs sm:text-sm text-indigo-200 leading-relaxed">
                Default wake-up set to <strong class="text-white underline decoration-amber-400 cursor-pointer" onclick="openWakeCustomizer()" id="currentWakeTimeLabel">08:00 AM</strong>. Drill through your brain quests to unlock the Gold streak badge.
              </p>
              <div class="pt-2 flex flex-wrap gap-2">
                <button id="btnTierQuickAction" onclick="awardGameScore(50, 'Quick Brain Sprint Bonus'); if(typeof confetti==='function') confetti({ particleCount: 60, spread: 60 }); if(typeof playAudioChime==='function') playAudioChime('fanfare');" class="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer">
                  <i class="fa-solid fa-bolt"></i> +50 XP Neuro-Boost
                </button>
                <button type="button" onclick="openCharacterStudioModal()" class="px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-amber-300 text-xs font-bold border border-amber-300/30 transition flex items-center gap-1 cursor-pointer" title="Avatar Wardrobe">
                  <i class="fa-solid fa-wand-magic-sparkles"></i>
                  <span>Avatar Wardrobe ⚡</span>
                </button>
                <button onclick="if(typeof openPatientOnboarding==='function') openPatientOnboarding(true, 2);" class="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition cursor-pointer">
                  Profile
                </button>
              </div>
            </div>

            <div class="shrink-0 w-24 h-24 self-center sm:self-auto flex items-center justify-center">
              ${youthSvg}
            </div>
          </section>
        `;
      } else if (validTier === 'adult') {
        const adultSvg = window.SakshamIllustrations ? window.SakshamIllustrations.getCompanionSvg({ size: 95, expression: 'mindful' }) : '';

        widget.innerHTML = `
          <!-- ADULT WELCOME BANNER WITH COMPANION -->
          <section class="eldora-card bg-white p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
            <div class="space-y-1.5 max-w-xl">
              <div class="flex items-center gap-2">
                <span id="routineTierPill" class="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  🌿 Adult Pacing
                </span>
                <span id="routineTierExtra" class="text-xs text-slate-500 font-medium hidden sm:inline">
                  Mindful Pacing &amp; Low Cognitive Noise
                </span>
              </div>
              <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight" id="lblGreeting">
                Good morning, Kalyani.
              </h2>
              <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Default wake-up set to <strong class="text-slate-900 underline decoration-teal-500 cursor-pointer" onclick="openWakeCustomizer()" id="currentWakeTimeLabel">08:00 AM</strong>. Your day is structured into clear milestones. ${doneCount} of ${total} routines completed (${pct}%).
              </p>
              <div class="pt-2 flex flex-wrap gap-2">
                <button id="btnTierQuickAction" onclick="toggleBreathingPacer()" class="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer">
                  <i class="fa-solid fa-lungs"></i>
                  <span>2-Min Breathing Reset</span>
                </button>
                <button type="button" onclick="openCharacterStudioModal()" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer" title="Customize look">
                  <i class="fa-solid fa-shirt text-teal-700"></i>
                  <span>Customize Look 👗</span>
                </button>
                <button onclick="if(typeof openPatientOnboarding==='function') openPatientOnboarding(true, 2);" class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                  <i class="fa-solid fa-sliders text-xs"></i> Settings
                </button>
              </div>
            </div>

            <div class="shrink-0 w-24 h-24 self-center sm:self-auto flex items-center justify-center">
              ${adultSvg}
            </div>
          </section>
        `;
      } else {
        // TIER 3: SENIOR / ELDERLY (60+) — FULL ELDORA-INSPIRED EXPERIENCE
        const companionSvg = window.SakshamIllustrations ? window.SakshamIllustrations.getCompanionSvg({ size: 120, expression: 'waving' }) : '';
        const medSvg = window.SakshamIllustrations ? window.SakshamIllustrations.getActivitySceneSvg('medication', 42) : '💊';
        const gamesSvg = window.SakshamIllustrations ? window.SakshamIllustrations.getActivitySceneSvg('mind_games', 42) : '🧩';
        const moveSvg = window.SakshamIllustrations ? window.SakshamIllustrations.getActivitySceneSvg('movement', 42) : '🚶‍♀️';
        const vaultSvg = window.SakshamIllustrations ? window.SakshamIllustrations.getActivitySceneSvg('memories', 42) : '📸';

        widget.innerHTML = `
          <!-- 1. ELDORA WELCOMING SECTION WITH GUIDE COMPANION -->
          <section class="eldora-card bg-gradient-to-br from-[#FFF9EE] via-[#FDF5E8] to-[#FCEFDE] p-5 sm:p-6 border border-[#F4DCBE] shadow-xs relative overflow-hidden animate-fadeIn">
            <div class="flex items-center justify-between gap-3">
              <div class="space-y-1.5 max-w-[65%]">
                <div class="flex items-center gap-2">
                  <span id="routineTierPill" class="text-[11px] font-black uppercase tracking-wider text-[#9A5B18] bg-[#FCEFDE] px-2.5 py-0.5 rounded-full border border-[#F4DCBE]/80">
                    🌸 Elderly Care
                  </span>
                  <span id="routineTierExtra" class="text-xs text-[#6B5A42] font-semibold hidden sm:inline">
                    Step-by-Step Care • Guided
                  </span>
                </div>
                <h2 class="text-xl sm:text-2xl font-black text-[#1C2C22] leading-tight font-serif-heading" id="lblGreeting">
                  Good morning, Kalyani ji! 👋
                </h2>
                <p class="text-xs sm:text-sm text-[#6B5A42] font-medium leading-relaxed">
                  Default wake-up set to <strong class="text-[#1C2C22] underline decoration-amber-500 decoration-2 underline-offset-4 cursor-pointer" onclick="openWakeCustomizer()" id="currentWakeTimeLabel">08:00 AM</strong>. Let's take care of you today, one peaceful step at a time.
                </p>
                <div class="pt-2 flex flex-wrap gap-2">
                  <button id="btnTierQuickAction" onclick="readActiveTaskAloud()" class="px-4 py-2 rounded-full bg-[#234E35] hover:bg-[#1B3F2B] active:scale-95 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer">
                    <i class="fa-solid fa-volume-high text-[#9FC57C]"></i>
                    <span>Read Next Activity</span>
                  </button>
                  <button type="button" onclick="openCharacterStudioModal()" class="px-3.5 py-2 rounded-full bg-[#FAF7F0] hover:bg-[#F0EBE1] active:scale-95 text-[#234E35] text-xs font-bold border border-[#E2DCCE] shadow-2xs flex items-center gap-1.5 transition cursor-pointer" title="Dress and customize companion (Snapchat Bitmoji style)">
                    <i class="fa-solid fa-shirt text-amber-600"></i>
                    <span>Dress Companion 👗</span>
                  </button>
                  <button onclick="if(typeof openPatientOnboarding==='function') openPatientOnboarding(true, 2);" class="px-3 py-2 rounded-full bg-white/70 hover:bg-white text-[#234E35] text-xs font-bold border border-[#F4DCBE] transition flex items-center gap-1 cursor-pointer">
                    <i class="fa-solid fa-sliders text-xs text-[#9A5B18]"></i> Profile
                  </button>
                </div>
              </div>

              <!-- Character Companion SVG: Dynamically customized -->
              <div class="shrink-0 w-28 h-28 sm:w-36 sm:h-36 relative flex items-center justify-center">
                ${companionSvg}
              </div>
            </div>
          </section>

          <!-- 2. TODAY'S GENTLE JOURNEY (4 Activity Shortcuts) -->
          <section class="space-y-3">
            <div class="flex justify-between items-center px-1">
              <div>
                <h3 class="text-sm sm:text-base font-extrabold text-[#1C2C22] tracking-tight font-serif-heading">Today's Gentle Journey</h3>
                <p class="text-[11px] text-[#5B665E]">Illustrated daily care shortcuts</p>
              </div>
              <span class="text-xs font-bold text-[#234E35] bg-[#EBF3EC] px-2.5 py-1 rounded-full border border-[#D7E6D9]">${doneCount} of ${total} done</span>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
              
              <!-- Card 1: Medication Cues -->
              <div onclick="switchRoutineMiniTab('cues')" class="eldora-card bg-white p-4 border border-[#E8EDE9] shadow-xs flex flex-col justify-between space-y-3 cursor-pointer hover:border-[#234E35]/40 group" title="Open Medication & Activity Cues">
                <div class="flex items-center justify-between">
                  <div class="w-11 h-11 rounded-2xl bg-[#E8F1F5] flex items-center justify-center border border-[#D5E3EB] group-hover:scale-105 transition-transform">
                    ${medSvg}
                  </div>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Active
                  </span>
                </div>
                <div>
                  <h4 class="text-xs sm:text-sm font-extrabold text-[#1C2C22]">Medication Cues</h4>
                  <p class="text-[11px] text-[#6B7280] mt-0.5">3-Chance assisted recall</p>
                </div>
                <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div class="bg-[#2C698D] h-full" style="width: ${pct}%;"></div>
                </div>
              </div>

              <!-- Card 2: Mind Clinic Games -->
              <div onclick="switchTab('games')" class="eldora-card bg-white p-4 border-2 border-[#A4C4A8] shadow-sm flex flex-col justify-between space-y-3 cursor-pointer hover:border-[#234E35] group ring-2 ring-[#234E35]/10" title="Open Mind Clinic Games">
                <div class="flex items-center justify-between">
                  <div class="w-11 h-11 rounded-2xl bg-[#FCEFDE] flex items-center justify-center border border-[#F4DCBE] group-hover:scale-105 transition-transform">
                    ${gamesSvg}
                  </div>
                  <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FCEFDE] text-[#9A5B18] border border-[#F4DCBE] animate-pulse">
                    Next Up
                  </span>
                </div>
                <div>
                  <h4 class="text-xs sm:text-sm font-extrabold text-[#1C2C22]">Mind Exercises</h4>
                  <p class="text-[11px] text-[#6B7280] mt-0.5">Card matching &amp; word recall</p>
                </div>
                <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div class="bg-[#234E35] h-full w-1/2"></div>
                </div>
              </div>

              <!-- Card 3: Gentle Movement -->
              <div onclick="switchTab('movement')" class="eldora-card bg-white p-4 border border-[#E8EDE9] shadow-xs flex flex-col justify-between space-y-3 cursor-pointer hover:border-[#234E35]/40 group" title="Open Movement & Mobility">
                <div class="flex items-center justify-between">
                  <div class="w-11 h-11 rounded-2xl bg-[#EBF3EC] flex items-center justify-center border border-[#D7E6D9] group-hover:scale-105 transition-transform">
                    ${moveSvg}
                  </div>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Mobility
                  </span>
                </div>
                <div>
                  <h4 class="text-xs sm:text-sm font-extrabold text-[#1C2C22]">Gentle Movement</h4>
                  <p class="text-[11px] text-[#6B7280] mt-0.5">15-min mobility &amp; garden walk</p>
                </div>
                <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div class="bg-[#4A7C59] h-full w-1/3"></div>
                </div>
              </div>

              <!-- Card 4: Loved Ones & Memories -->
              <div onclick="switchTab('vault')" class="eldora-card bg-white p-4 border border-[#E8EDE9] shadow-xs flex flex-col justify-between space-y-3 cursor-pointer hover:border-[#234E35]/40 group" title="Open Loved Ones Vault">
                <div class="flex items-center justify-between">
                  <div class="w-11 h-11 rounded-2xl bg-[#F1EBF5] flex items-center justify-center border border-[#E3D6E8] group-hover:scale-105 transition-transform">
                    ${vaultSvg}
                  </div>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    Memories
                  </span>
                </div>
                <div>
                  <h4 class="text-xs sm:text-sm font-extrabold text-[#1C2C22]">Family Memories</h4>
                  <p class="text-[11px] text-[#6B7280] mt-0.5">Photo recall with loved ones</p>
                </div>
                <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div class="bg-[#7A4988] h-full w-2/3"></div>
                </div>
              </div>

            </div>
          </section>
        `;
      }
    }

    function renderYouthQuests() {
      const el = document.getElementById('youthScoreVal');
      if (el && typeof state !== 'undefined') {
        const done = (state.tasks || []).filter(t => t.done).length;
        el.innerText = `${350 + done * 25}`;
      }
    }

    function renderAdultTimeline() {
      // Clean adult view sync
    }

    function clearAllTaskPhotos() {
      if (!state || !state.tasks) return;
      state.tasks.forEach(t => { delete t.photo; });
      if (typeof persistTasks === 'function') persistTasks();
      if (typeof renderActiveCueCard === 'function') renderActiveCueCard();
      if (typeof renderDirectTasksList === 'function') renderDirectTasksList();
    }

    function getRoutineActiveUserId() {
      try {
        const active = JSON.parse(localStorage.getItem('saksham_active_user') || '{}');
        const uid = active.firebaseUid || active.id || active.uid;
        if (uid && String(uid).trim()) return String(uid).trim();
      } catch (e) {}
      if (typeof state !== 'undefined' && state && state.uid) return String(state.uid).trim();
      return 'guest';
    }

    const ASSISTANCE_STORAGE_KEY_PREFIX = 'saksham_task_assistance_';

    function getAssistanceStorageKey(targetUid) {
      return ASSISTANCE_STORAGE_KEY_PREFIX + (targetUid || getRoutineActiveUserId());
    }

    function loadPersistedAssistanceState(targetUid) {
      try {
        const key = getAssistanceStorageKey(targetUid);
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          window._activeTaskAssistance = parsed.active || {};
          window._ratedTaskAssistance = parsed.rated || {};
          window._dismissedTaskRecommendations = parsed.dismissed || {};
          return;
        }
      } catch (e) {
        console.warn('[Routine Assistance] Load error:', e);
      }
      window._activeTaskAssistance = {};
      window._ratedTaskAssistance = {};
      window._dismissedTaskRecommendations = {};
    }

    function savePersistedAssistanceState(targetUid) {
      try {
        const key = getAssistanceStorageKey(targetUid);
        const payload = {
          active: window._activeTaskAssistance || {},
          rated: window._ratedTaskAssistance || {},
          dismissed: window._dismissedTaskRecommendations || {},
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(key, JSON.stringify(payload));
      } catch (e) {
        console.warn('[Routine Assistance] Save error:', e);
      }
    }

    function clearAssistanceStateOnLogout() {
      window._activeTaskAssistance = {};
      window._ratedTaskAssistance = {};
      window._dismissedTaskRecommendations = {};
    }

    // Auto-hydrate assistance state on script load
    loadPersistedAssistanceState();

    function applyAdaptiveAssistance(taskId, category) {
      window._activeTaskAssistance[taskId] = category;
      savePersistedAssistanceState();
      if (category === 'voice_guidance') {
        const task = (state && state.tasks) ? state.tasks.find(t => t.id === taskId) : null;
        if (task && typeof speakText === 'function') {
          speakText(`${task.title} at ${task.time}. Please take your time and follow each step.`);
        }
      } else if (category === 'step_by_step') {
        if (typeof openTaskRunner === 'function') {
          openTaskRunner(taskId, 15);
        }
      } else if (category === 'larger_controls') {
        if (typeof adjustFontSize === 'function') {
          adjustFontSize(2);
        }
      }
      if (typeof renderDirectTasksList === 'function') renderDirectTasksList();
      if (typeof renderActiveCueCard === 'function') renderActiveCueCard();
      if (typeof showSakshamToast === 'function') {
        showSakshamToast(`Applied ${category.replace(/_/g, ' ')} assistance!`, 'success');
      }
    }

    function rateAdaptiveAssistance(taskId, category, rating) {
      window._ratedTaskAssistance[taskId] = rating;
      if (rating === 'unhelpful') {
        window._dismissedTaskRecommendations[taskId] = true;
        delete window._activeTaskAssistance[taskId];
      }
      savePersistedAssistanceState();
      if (window.SakshamPersonalization && typeof window.SakshamPersonalization.recordAssistanceRating === 'function') {
        window.SakshamPersonalization.recordAssistanceRating(category, rating);
      }
      if (typeof renderDirectTasksList === 'function') renderDirectTasksList();
      if (typeof renderActiveCueCard === 'function') renderActiveCueCard();
      if (typeof showSakshamToast === 'function') {
        showSakshamToast(rating === 'helpful' ? 'Marked as helpful! 👍' : 'Feedback noted. Recommendation updated.', 'info');
      }
    }

    function dismissAdaptiveAssistance(taskId) {
      window._dismissedTaskRecommendations[taskId] = true;
      savePersistedAssistanceState();
      if (typeof renderDirectTasksList === 'function') renderDirectTasksList();
      if (typeof renderActiveCueCard === 'function') renderActiveCueCard();
    }

    function openTaskDifficultyModal(taskId) {
      const task = (state && state.tasks) ? state.tasks.find(t => t.id === taskId) : null;
      const modal = document.getElementById('modalTaskDifficulty');
      const idInput = document.getElementById('taskDifficultyTaskId');
      const labelEl = document.getElementById('taskDifficultyTaskLabel');
      if (idInput) idInput.value = taskId;
      if (labelEl) labelEl.textContent = task ? `"${task.title}"` : 'this task';
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.display = 'flex';
      }
      if (typeof window.lockScroll === 'function') window.lockScroll();
    }

    function closeTaskDifficultyModal() {
      const modal = document.getElementById('modalTaskDifficulty');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none';
      }
      if (typeof window.forceUnlockScroll === 'function') window.forceUnlockScroll();
    }

    window._taskDifficultySavedStatus = window._taskDifficultySavedStatus || {};

    function saveTaskDifficultyModal(e) {
      if (e && e.preventDefault) e.preventDefault();
      const taskId = document.getElementById('taskDifficultyTaskId')?.value;
      const cat = document.getElementById('taskDifficultyCategory')?.value || 'other';
      const assist = document.getElementById('taskDifficultyAssistance')?.value || 'step_by_step';
      const notes = document.getElementById('taskDifficultyNotes')?.value || '';
      const enteredBy = document.getElementById('taskDifficultyEnteredBy')?.value || 'user';

      const task = (state && state.tasks) ? state.tasks.find(t => String(t.id) === String(taskId)) : null;
      const taskTitle = task ? task.title : 'Routine Task';
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (window.SakshamPersonalization && typeof window.SakshamPersonalization.recordDifficulty === 'function') {
        window.SakshamPersonalization.recordDifficulty(state && state.uid ? state.uid : 'default', {
          taskId: taskId,
          taskTitle: taskTitle,
          difficultyCategory: cat,
          difficultyType: cat,
          assistanceSelected: assist,
          assistanceOption: assist,
          notes: notes,
          enteredBy: enteredBy,
          helpfulRating: 'helpful'
        });
      }

      if (taskId) {
        window._taskDifficultySavedStatus[taskId] = {
          savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOnline: isOnline
        };
      }

      closeTaskDifficultyModal();
      if (typeof renderDirectTasksList === 'function') renderDirectTasksList();
      if (typeof renderActiveCueCard === 'function') renderActiveCueCard();
      if (typeof showSakshamToast === 'function') {
        showSakshamToast(isOnline ? 'Task difficulty recorded and synced! ☁️' : 'Task difficulty saved locally! Pending cloud sync ⏳', 'success');
      }
    }

    window.applyAdaptiveAssistance = applyAdaptiveAssistance;
    window.rateAdaptiveAssistance = rateAdaptiveAssistance;
    window.dismissAdaptiveAssistance = dismissAdaptiveAssistance;
    window.loadPersistedAssistanceState = loadPersistedAssistanceState;
    window.savePersistedAssistanceState = savePersistedAssistanceState;
    window.clearAssistanceStateOnLogout = clearAssistanceStateOnLogout;
    window.openTaskDifficultyModal = openTaskDifficultyModal;
    window.closeTaskDifficultyModal = closeTaskDifficultyModal;
    window.saveTaskDifficultyModal = saveTaskDifficultyModal;

    window.renderDynamicRoutineView = renderDynamicRoutineView;
    window.renderYouthQuests = renderYouthQuests;
    window.renderAdultTimeline = renderAdultTimeline;
    window.readActiveTaskAloud = readActiveTaskAloud;
    window.handleCueChoice = handleTaskCueAnswer;
    window.attachTaskPhoto = attachTaskPhoto;
    window.clearAllTaskPhotos = clearAllTaskPhotos;

    /* ======================================================================= */
    /* 5. CHARACTER DRESSING STUDIO & COMPANION MASCOT REMINDER ENGINE         */
    /* ======================================================================= */
    let studioTempCustomization = null;
    let companionSnoozeTimerId = null;
    let activeMascotReminderTaskId = null;

    function openCharacterStudioModal() {
      const modal = document.getElementById('modalCharacterStudio');
      if (!modal) return;
      if (window.SakshamIllustrations) {
        studioTempCustomization = Object.assign({}, window.SakshamIllustrations.getSavedCustomization());
      } else {
        studioTempCustomization = {
          character: 'dadi',
          outfitColor: '#4A7C59',
          sareeColor: '#FCEFDE',
          accessory: 'none',
          expression: 'waving',
          animated: true
        };
      }
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      if (typeof window.lockScroll === 'function') window.lockScroll();
      updateStudioUI();
    }

    function closeCharacterStudioModal() {
      const modal = document.getElementById('modalCharacterStudio');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
      if (typeof window.unlockScroll === 'function') window.unlockScroll();
    }

    function updateStudioUI() {
      if (!studioTempCustomization) return;

      // 1. Update Character Picker buttons
      const charButtons = ['dadi', 'miko', 'priya', 'aarav'];
      charButtons.forEach(c => {
        const btn = document.getElementById(`btnChar_${c}`);
        if (btn) {
          if (studioTempCustomization.character === c) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        }
      });

      // 2. Toggle Saree section visibility (only Dadi has saree silk drape)
      const sareeSection = document.getElementById('studioSareeSection');
      if (sareeSection) {
        if (studioTempCustomization.character === 'dadi') {
          sareeSection.classList.remove('hidden');
        } else {
          sareeSection.classList.add('hidden');
        }
      }

      // 3. Update Outfit Swatches
      const outfitSwatches = document.querySelectorAll('#studioOutfitSwatches .studio-swatch');
      outfitSwatches.forEach(sw => {
        const hex = sw.getAttribute('onclick')?.match(/#[0-9a-fA-F]{6}/)?.[0]?.toUpperCase();
        const activeHex = (studioTempCustomization.outfitColor || '').toUpperCase();
        if (hex && hex === activeHex) {
          sw.classList.add('active');
        } else {
          sw.classList.remove('active');
        }
      });

      // 4. Update Saree Swatches
      const sareeSwatches = document.querySelectorAll('#studioSareeSwatches .studio-swatch');
      sareeSwatches.forEach(sw => {
        const hex = sw.getAttribute('onclick')?.match(/#[0-9a-fA-F]{6}/)?.[0]?.toUpperCase();
        const activeHex = (studioTempCustomization.sareeColor || '').toUpperCase();
        if (hex && hex === activeHex) {
          sw.classList.add('active');
        } else {
          sw.classList.remove('active');
        }
      });

      // 5. Update Accessories
      const accButtons = ['none', 'glasses', 'flower', 'headphones'];
      accButtons.forEach(acc => {
        const btn = document.getElementById(`btnAcc_${acc}`);
        if (btn) {
          if ((studioTempCustomization.accessory || 'none') === acc) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        }
      });

      // 6. Update Animation Toggle Button
      const animBtn = document.getElementById('btnStudioAnimToggle');
      if (animBtn) {
        if (studioTempCustomization.animated !== false) {
          animBtn.innerText = '✨ Lively';
          animBtn.className = 'px-3.5 py-1.5 rounded-full text-xs font-black bg-[#234E35] text-white shadow-xs cursor-pointer';
        } else {
          animBtn.innerText = '🧘 Calm';
          animBtn.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700 shadow-xs cursor-pointer';
        }
      }

      // 7. Update Live Preview Stage
      const previewStage = document.getElementById('studioPreviewStage');
      if (previewStage && window.SakshamIllustrations) {
        previewStage.innerHTML = window.SakshamIllustrations.getCompanionSvg(
          Object.assign({}, studioTempCustomization, { size: 128 })
        );
      }

      // 8. Update Name & Description Labels
      const nameLbl = document.getElementById('studioCompanionNameLabel');
      const descLbl = document.getElementById('studioCompanionDescLabel');
      if (nameLbl && descLbl) {
        if (studioTempCustomization.character === 'miko') {
          nameLbl.innerText = 'Miko Robot';
          descLbl.innerText = 'Cute AI companion with animated eyes & glowing antenna';
        } else if (studioTempCustomization.character === 'priya') {
          nameLbl.innerText = 'Priya';
          descLbl.innerText = 'Mindful, calm healthcare guide';
        } else if (studioTempCustomization.character === 'aarav') {
          nameLbl.innerText = 'Aarav';
          descLbl.innerText = 'Energetic mentor with headphones';
        } else {
          nameLbl.innerText = 'Kalyani ji (Dadi)';
          descLbl.innerText = 'Gentle, warm grandmother guide with silk saree & shawl';
        }
      }
    }

    function selectStudioCharacter(charId) {
      if (!studioTempCustomization) return;
      studioTempCustomization.character = charId;
      updateStudioUI();
    }

    function selectStudioOutfitColor(color, name) {
      if (!studioTempCustomization) return;
      studioTempCustomization.outfitColor = color;
      const lbl = document.getElementById('lblActiveOutfitColor');
      if (lbl) lbl.innerText = name || color;
      updateStudioUI();
    }

    function selectStudioSareeColor(color, name) {
      if (!studioTempCustomization) return;
      studioTempCustomization.sareeColor = color;
      const lbl = document.getElementById('lblActiveSareeColor');
      if (lbl) lbl.innerText = name || color;
      updateStudioUI();
    }

    function selectStudioAccessory(accId) {
      if (!studioTempCustomization) return;
      studioTempCustomization.accessory = accId;
      updateStudioUI();
    }

    function toggleStudioAnimation() {
      if (!studioTempCustomization) return;
      studioTempCustomization.animated = !studioTempCustomization.animated;
      updateStudioUI();
    }

    function resetStudioCustomization() {
      if (window.SakshamIllustrations) {
        studioTempCustomization = Object.assign({}, window.SakshamIllustrations.DEFAULT_CUSTOMIZATION);
      }
      updateStudioUI();
    }

    function saveCharacterStudioLook() {
      if (!studioTempCustomization) return;
      if (window.SakshamIllustrations) {
        window.SakshamIllustrations.saveCustomization(studioTempCustomization);
      }
      closeCharacterStudioModal();
      
      // Refresh current active view
      const activeTier = (window.SakshamPersonalisation && typeof window.SakshamPersonalisation.getActiveTier === 'function')
        ? window.SakshamPersonalisation.getActiveTier()
        : 'senior';
      renderDynamicRoutineView(activeTier);

      // Refresh Mascot Reminder SVG if currently visible
      const mascotSvgContainer = document.getElementById('mascotReminderSvgContainer');
      if (mascotSvgContainer && window.SakshamIllustrations) {
        mascotSvgContainer.innerHTML = window.SakshamIllustrations.getCompanionSvg({ size: 76, expression: 'waving' });
      }

      // Refresh Floating Companion Follower Avatar
      if (window.SakshamCompanionFollower && typeof window.SakshamCompanionFollower.refreshAvatar === 'function') {
        window.SakshamCompanionFollower.refreshAvatar();
      }

      if (typeof showSakshamToast === 'function') {
        showSakshamToast('✨ Your companion look was saved and applied!', 'success');
      }
      if (typeof playAudioChime === 'function') playAudioChime('chime');
    }

    /* ==================== COMPANION MASCOT SNOOZE REMINDER ==================== */
    function triggerCompanionMascotReminder(task) {
      const banner = document.getElementById('companionMascotReminderBanner');
      if (!banner) return;

      const targetTask = task || (state && state.tasks ? state.tasks.find(t => !t.done) : null);
      if (!targetTask) return;

      activeMascotReminderTaskId = targetTask.id;

      // Inject animated companion SVG
      const svgContainer = document.getElementById('mascotReminderSvgContainer');
      if (svgContainer && window.SakshamIllustrations) {
        svgContainer.innerHTML = window.SakshamIllustrations.getCompanionSvg({ size: 76, expression: 'waving' });
      }

      const titleEl = document.getElementById('mascotReminderTitle');
      const timePill = document.getElementById('mascotReminderTimePill');
      const descEl = document.getElementById('mascotReminderDesc');

      if (titleEl) titleEl.innerText = `Friendly reminder: ${targetTask.title}`;
      if (timePill) timePill.innerText = targetTask.time ? `Due: ${targetTask.time}` : 'Due Now';
      if (descEl) descEl.innerText = "Ready when you are! Or tap snooze and Miko will check back in 3 minutes.";

      banner.classList.remove('hidden');
    }

    function snoozeCompanionReminder(minutes = 3) {
      const banner = document.getElementById('companionMascotReminderBanner');
      if (banner) banner.classList.add('hidden');

      const activeBanner = document.getElementById('activeReminderBanner');
      if (activeBanner) activeBanner.classList.add('hidden');

      const alarmModal = document.getElementById('alarmModal');
      if (alarmModal) {
        alarmModal.classList.add('hidden');
        alarmModal.classList.remove('flex');
        document.body.style.overflow = '';
      }

      if (companionSnoozeTimerId) {
        clearTimeout(companionSnoozeTimerId);
        companionSnoozeTimerId = null;
      }

      const mins = Number(minutes) || 3;
      if (typeof showSakshamToast === 'function') {
        showSakshamToast(`⏰ Snoozed for ${mins} minutes! Miko will check back with you shortly.`, 'info');
      }

      companionSnoozeTimerId = setTimeout(() => {
        const pending = (state && state.tasks)
          ? (state.tasks.find(t => t.id === activeMascotReminderTaskId && !t.done) || state.tasks.find(t => !t.done))
          : null;
        if (pending) {
          triggerCompanionMascotReminder(pending);
          if (typeof playAudioChime === 'function') playAudioChime('chime');
          if (typeof speakText === 'function') speakText(`Friendly reminder for Kalyani: It is time for ${pending.title}.`);
        }
      }, mins * 60 * 1000);
    }

    function dismissCompanionMascotBanner() {
      const banner = document.getElementById('companionMascotReminderBanner');
      if (banner) banner.classList.add('hidden');
    }

    function startRoutineFromMascotBanner() {
      dismissCompanionMascotBanner();
      if (activeMascotReminderTaskId && typeof openTaskRunner === 'function') {
        openTaskRunner(activeMascotReminderTaskId);
      } else if (typeof switchRoutineMiniTab === 'function') {
        switchRoutineMiniTab('cues');
      }
    }

    function completeFromMascotBanner() {
      dismissCompanionMascotBanner();
      if (activeMascotReminderTaskId && typeof toggleTask === 'function') {
        toggleTask(activeMascotReminderTaskId);
        if (typeof showSakshamToast === 'function') {
          showSakshamToast('Task marked complete! 🌟', 'success');
        }
      }
    }

    window.openCharacterStudioModal = openCharacterStudioModal;
    window.closeCharacterStudioModal = closeCharacterStudioModal;
    window.selectStudioCharacter = selectStudioCharacter;
    window.selectStudioOutfitColor = selectStudioOutfitColor;
    window.selectStudioSareeColor = selectStudioSareeColor;
    window.selectStudioAccessory = selectStudioAccessory;
    window.toggleStudioAnimation = toggleStudioAnimation;
    window.resetStudioCustomization = resetStudioCustomization;
    window.saveCharacterStudioLook = saveCharacterStudioLook;

    window.triggerCompanionMascotReminder = triggerCompanionMascotReminder;
    window.snoozeCompanionReminder = snoozeCompanionReminder;
    window.dismissCompanionMascotBanner = dismissCompanionMascotBanner;
    window.startRoutineFromMascotBanner = startRoutineFromMascotBanner;
    window.completeFromMascotBanner = completeFromMascotBanner;



