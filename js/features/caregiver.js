/* ======================================================================= */
/* SAKSHAM CAREGIVER HUB & CLINICIAN TELEMETRY LOGS                        */
/* ======================================================================= */

    /* ==================== SAFE HTML ESCAPE HELPER ==================== */
    function escapeHtmlCaregiver(str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    /* ==================== 8. CAREGIVER & DOCTOR LOGS ==================== */
    function renderCaregiverAlerts() {
      const el = document.getElementById('caregiverAlertList');
      if (!el) return; // Guard: caregiver portal may not be active
      el.innerHTML = state.caregiverAlerts.map(a => `
        <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 flex justify-between items-center shadow-xs">
          <div><strong class="text-amber-700">${escapeHtmlCaregiver(a.time)}:</strong> ${escapeHtmlCaregiver(a.text)}</div>
          <button onclick="speakText('${escapeHtmlCaregiver(a.text)}')" class="text-slate-400 hover:text-slate-700"><i class="fa-solid fa-volume-high"></i></button>
        </div>
      `).join('');
    }


    /* ==================== PATIENT TO-DO LIST & ROUTINE MANAGEMENT (CAREGIVER HUB) ==================== */
    let currentCaregiverTaskFilter = 'all';

    function renderCaregiverManagedTasks(filterCategory) {
      if (filterCategory !== undefined) {
        currentCaregiverTaskFilter = filterCategory;
      }
      const filter = currentCaregiverTaskFilter;

      // Update statistics badges
      const total = state.tasks.length;
      const completed = state.tasks.filter(t => t.done).length;
      const pending = total - completed;
      const meds = state.tasks.filter(t => t.tag === 'Medication').length;

      const elTotal = document.getElementById('cgStatTotalTasks');
      if (elTotal) elTotal.innerText = total;
      const elComp = document.getElementById('cgStatCompletedTasks');
      if (elComp) elComp.innerText = completed;
      const elPend = document.getElementById('cgStatPendingTasks');
      if (elPend) elPend.innerText = pending;
      const elMeds = document.getElementById('cgStatMedTasks');
      if (elMeds) elMeds.innerText = meds;

      const badge = document.getElementById('cgTaskListBadge');
      if (badge) badge.innerText = `${total} Tasks (${completed} Done)`;

      // Update filter tabs
      const filterBtns = ['all', 'pending', 'completed', 'Medication'];
      filterBtns.forEach(f => {
        const btn = document.getElementById(`cgFilter-${f}`);
        if (btn) {
          if (f === filter) {
            btn.className = "px-3 py-1.5 rounded-xl text-xs font-black bg-teal-600 text-white shadow-xs";
          } else {
            btn.className = "px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700";
          }
        }
      });

      const listContainer = document.getElementById('caregiverManagedTasksList');
      if (!listContainer) return;

      // Filter tasks according to selected tab
      let displayedTasks = state.tasks;
      if (filter === 'pending') {
        displayedTasks = state.tasks.filter(t => !t.done);
      } else if (filter === 'completed') {
        displayedTasks = state.tasks.filter(t => t.done);
      } else if (filter === 'Medication') {
        displayedTasks = state.tasks.filter(t => t.tag === 'Medication');
      }

      if (displayedTasks.length === 0) {
        listContainer.innerHTML = `
          <div class="text-center py-10 px-4 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 space-y-3">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center text-2xl shadow-inner">
              <i class="fa-solid fa-clipboard-check"></i>
            </div>
            <div>
              <h4 class="font-black text-slate-800 text-sm">No activities found in this view</h4>
              <p class="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Add a new task above or tap one of the 1-Tap Presets to assign directly to Kalyani's to-do list.
              </p>
            </div>
            <button onclick="openCaregiverAddTaskModal()" class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer">
              + Add First Activity
            </button>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = displayedTasks.map(t => {
        const isDone = Boolean(t.done);
        const tagEmoji = t.tag === 'Medication' ? '💊' : (t.tag === 'Food' ? '🥗' : (t.tag === 'Physical' ? '🏃' : (t.tag === 'Speech' ? '🗣️' : (t.tag === 'Cognitive' ? '🧠' : '🍵'))));
        const soundEmoji = t.sound === 'bell' ? '🔔 Bell' : (t.sound === 'sax' ? '🎷 Saxophone' : '🎵 Marimba');

        return `
          <div class="p-4 sm:p-5 rounded-2xl border transition-all ${isDone ? 'bg-teal-50/50 border-teal-200' : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'} flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <!-- Left: Checkbox & Task Information -->
            <div class="flex items-start sm:items-center space-x-3.5 flex-1 min-w-0">
              <button onclick="toggleCaregiverTask(${t.id})" class="mt-0.5 sm:mt-0 w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer ${isDone ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' : 'border-slate-300 bg-white hover:border-teal-500 text-transparent'}" title="${isDone ? 'Mark as Pending' : 'Mark as Done'}">
                <i class="fa-solid fa-check text-sm ${isDone ? 'block' : 'opacity-0'}"></i>
              </button>
              
              <div class="flex-1 min-w-0 space-y-1">
                <div class="flex items-center flex-wrap gap-2">
                  <span class="text-xs font-mono font-black px-2.5 py-0.5 rounded-lg ${isDone ? 'bg-slate-200 text-slate-600' : 'bg-teal-100 text-teal-900 border border-teal-300'}">
                    ${t.time}
                  </span>
                  <span class="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${t.tag === 'Medication' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}">
                    ${tagEmoji} ${t.tag}
                  </span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    ${soundEmoji}
                  </span>
                  <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}">
                    ${isDone ? '✅ Completed by Patient' : '⏳ Pending Patient Action'}
                  </span>
                </div>

                <p class="font-extrabold text-sm sm:text-base text-slate-900 ${isDone ? 'line-through text-slate-400' : ''} truncate">
                  ${escapeHtml(t.title)}
                </p>

                ${t.caregiverNote ? `
                  <p class="text-xs text-slate-600 bg-slate-50 border border-slate-200/80 p-2 rounded-xl flex items-center gap-1.5 max-w-xl">
                    <i class="fa-solid fa-notes-medical text-teal-600 shrink-0"></i>
                    <span class="truncate"><strong>Caregiver Note:</strong> ${escapeHtml(t.caregiverNote)}</span>
                  </p>
                ` : ''}
              </div>
            </div>

            <!-- Right: Caregiver Controls -->
            <div class="flex items-center flex-wrap gap-1.5 self-end md:self-center shrink-0">
              <button onclick="previewTaskSpeechPrompt(${t.id})" class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 text-xs font-bold border border-slate-200 flex items-center gap-1 transition cursor-pointer" title="Test Audio Memory Cue">
                <i class="fa-solid fa-volume-high text-teal-600"></i>
                <span class="hidden sm:inline">Voice Cue</span>
              </button>
              
              <button onclick="shareTaskViaWhatsApp(${t.id})" class="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1 transition cursor-pointer" title="Send WhatsApp Reminder">
                <i class="fa-brands fa-whatsapp text-emerald-600"></i>
                <span class="hidden sm:inline">WhatsApp</span>
              </button>

              <button onclick="openCaregiverAddTaskModal(${t.id})" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold border border-slate-200 flex items-center gap-1 transition cursor-pointer" title="Edit Task">
                <i class="fa-solid fa-pen-to-square text-slate-600"></i>
                <span>Edit</span>
              </button>

              <button onclick="deleteCaregiverTask(${t.id})" class="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold border border-rose-200 flex items-center gap-1 transition cursor-pointer" title="Delete Task from Patient List">
                <i class="fa-solid fa-trash-can text-rose-600"></i>
              </button>
            </div>

          </div>
        `;
      }).join('');
    }

    function filterCaregiverTasks(filter) {
      renderCaregiverManagedTasks(filter);
    }

    function handleCaregiverQuickAddTask() {
      const titleInput = document.getElementById('cgQuickTaskTitle');
      const timeInput = document.getElementById('cgQuickTaskTime');
      const catSelect = document.getElementById('cgQuickTaskCat');

      const title = titleInput ? titleInput.value.trim() : '';
      const rawTime = timeInput ? timeInput.value : '09:00';
      const category = catSelect ? catSelect.value : 'Medication';

      if (!title) {
        alert("Please enter a task or medication title.");
        if (titleInput) titleInput.focus();
        return;
      }

      addCaregiverTaskDirect(title, rawTime, category, '', category === 'Medication' ? 'bell' : 'sax');

      if (titleInput) titleInput.value = '';
    }

    function addCaregiverTaskDirect(title, rawTime, category, note = '', sound = null, latency = 15) {
      const timeMins = parseTimeToMinutes(rawTime);
      const displayTime = formatMinutesTo12Hour(timeMins);
      const chosenSound = sound || (category === 'Medication' ? 'bell' : (category === 'Food' ? 'sax' : 'marimba'));

      const newTask = {
        id: Date.now(),
        title: title,
        time: displayTime,
        rawTime: rawTime,
        sound: chosenSound,
        done: false,
        tag: category,
        status: 'pending',
        latencyMinutes: latency,
        cueQuestion: `It is ${displayTime}. Time for your ${title}. Are you ready?`,
        cueOptions: [title, "Take a brief 5-min rest", "Ask caregiver for assistance"],
        correctOptionIndex: 0,
        cueHint: `Check your daily routine: ${title}`,
        attemptsLeft: 3,
        alertedToday: false,
        alertedForThisMinute: false,
        caregiverNote: note,
        createdBy: 'caregiver',
        runnerSteps: [
          `Review instructions for ${title}`,
          `Perform ${title} at a calm and steady pace`,
          `Confirm completion and relax`
        ],
        diagnosticQuestion: `What are you doing right now with ${title}?`,
        diagnosticCheckpoints: [
          {
            icon: "❓",
            currentDoing: `I just started or forgot where to begin`,
            nextStepSummary: `Begin ${title} calmly`,
            nextStep: `Take a deep breath and start step 1 of ${title}.`,
            spokenCue: `Start step 1 of ${title} calmly.`,
            stepIndex: 0,
            tip: `Take your time. You are doing great.`
          }
        ]
      };

      // 1. Add to local state & sort
      state.tasks.push(newTask);
      state.tasks.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

      // 2. Persist to localStorage
      persistTasks();

      // 3. Sync to Cloud Firestore if connected
      if (window.dbService && window.dbService.tasks) {
        window.dbService.tasks.create(newTask, state.uid || 'SAK-PT-8842');
      }

      // 4. Synchronize all views immediately
      renderCaregiverManagedTasks();
      if (typeof renderDirectTasksList === 'function') renderDirectTasksList();
      if (typeof renderActiveCueCard === 'function') renderActiveCueCard();
      if (typeof updateChartsData === 'function') updateChartsData();
      if (typeof renderTimeframeInsights === 'function') renderTimeframeInsights();
      if (typeof checkScheduledReminders === 'function') checkScheduledReminders();

      // 5. Broadcast custom event
      window.dispatchEvent(new CustomEvent('saksham:tasks-updated', { detail: { action: 'create', task: newTask } }));

      // 6. User feedback
      if (typeof playAudioChime === 'function') playAudioChime('chime');
      if (typeof showSakshamToast === 'function') {
        showSakshamToast(`✅ "${title}" added directly to Kalyani's to-do list at ${displayTime}!`, 'success');
      }
    }

    function deleteCaregiverTask(taskId) {
      const idNum = Number(taskId);
      const task = state.tasks.find(t => t.id === idNum || t.id === taskId);
      const title = task ? task.title : 'Task';

      if (!confirm(`Remove "${title}" from the patient's to-do list?`)) return;

      state.tasks = state.tasks.filter(t => t.id !== idNum && t.id !== taskId);
      persistTasks();

      if (window.dbService && window.dbService.tasks) {
        window.dbService.tasks.delete(taskId);
      }

      renderCaregiverManagedTasks();
      if (typeof renderDirectTasksList === 'function') renderDirectTasksList();
      if (typeof renderActiveCueCard === 'function') renderActiveCueCard();
      if (typeof updateChartsData === 'function') updateChartsData();
      if (typeof renderTimeframeInsights === 'function') renderTimeframeInsights();
      if (typeof checkScheduledReminders === 'function') checkScheduledReminders();

      window.dispatchEvent(new CustomEvent('saksham:tasks-updated', { detail: { action: 'delete', taskId } }));

      if (typeof playAudioChime === 'function') playAudioChime('click');
      if (typeof showSakshamToast === 'function') {
        showSakshamToast(`🗑️ "${title}" removed from patient's to-do list.`, 'delete');
      }
    }

    function toggleCaregiverTask(taskId) {
      const idNum = Number(taskId);
      const task = state.tasks.find(t => t.id === idNum || t.id === taskId);
      if (!task) return;

      task.done = !task.done;
      task.status = task.done ? 'done' : 'pending';

      persistTasks();

      if (window.dbService && window.dbService.tasks) {
        window.dbService.tasks.update(task.id, { done: task.done, status: task.status }, state.uid || 'SAK-PT-8842');
      }

      renderCaregiverManagedTasks();
      if (typeof renderDirectTasksList === 'function') renderDirectTasksList();
      if (typeof renderActiveCueCard === 'function') renderActiveCueCard();
      if (typeof updateChartsData === 'function') updateChartsData();
      if (typeof renderTimeframeInsights === 'function') renderTimeframeInsights();
      if (typeof checkScheduledReminders === 'function') checkScheduledReminders();

      window.dispatchEvent(new CustomEvent('saksham:tasks-updated', { detail: { action: 'toggle', task } }));

      if (typeof showSakshamToast === 'function') {
        showSakshamToast(task.done ? `✅ Marked "${task.title}" as Completed` : `⏳ Marked "${task.title}" as Pending`, 'success');
      }
    }

    function openCaregiverAddTaskModal(taskId = null) {
      const modal = document.getElementById('modalCaregiverTask');
      if (!modal) return;

      const idInput = document.getElementById('cgEditTaskId');
      const titleInput = document.getElementById('cgModalTaskTitle');
      const timeInput = document.getElementById('cgModalTaskTime');
      const catSelect = document.getElementById('cgModalTaskCat');
      const soundSelect = document.getElementById('cgModalTaskSound');
      const latencySelect = document.getElementById('cgModalTaskLatency');
      const notesText = document.getElementById('cgModalTaskNotes');
      const modalTitle = document.getElementById('cgModalTitle');
      const submitBtn = document.getElementById('cgModalSubmitBtnText');

      if (taskId) {
        const idNum = Number(taskId);
        const task = state.tasks.find(t => t.id === idNum || t.id === taskId);
        if (task) {
          if (idInput) idInput.value = task.id;
          if (titleInput) titleInput.value = task.title;
          if (timeInput) timeInput.value = task.rawTime || '09:00';
          if (catSelect) catSelect.value = task.tag || 'Medication';
          if (soundSelect) soundSelect.value = task.sound || 'bell';
          if (latencySelect) latencySelect.value = task.latencyMinutes || 15;
          if (notesText) notesText.value = task.caregiverNote || '';
          if (modalTitle) modalTitle.innerText = "Edit Patient Activity";
          if (submitBtn) submitBtn.innerText = "Update & Sync to Patient";
        }
      } else {
        // New task mode
        if (idInput) idInput.value = '';
        if (titleInput) titleInput.value = '';
        const now = new Date();
        now.setMinutes(now.getMinutes() + 15);
        const defH = String(now.getHours()).padStart(2, '0');
        const defM = String(now.getMinutes()).padStart(2, '0');
        if (timeInput) timeInput.value = `${defH}:${defM}`;
        if (catSelect) catSelect.value = 'Medication';
        if (soundSelect) soundSelect.value = 'bell';
        if (latencySelect) latencySelect.value = '15';
        if (notesText) notesText.value = '';
        if (modalTitle) modalTitle.innerText = "Add Task to Patient To-Do List";
        if (submitBtn) submitBtn.innerText = "Save Directly to Patient List";
      }

      modal.classList.remove('hidden');
      modal.classList.add('flex');
      modal.style.display = 'flex';
      modal.style.zIndex = '99999';
      window.lockScroll();
    }

    function closeCaregiverTaskModal() {
      const modal = document.getElementById('modalCaregiverTask');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none';
        window.unlockScroll();
      }
    }

    function saveCaregiverModalTask() {
      const idInput = document.getElementById('cgEditTaskId');
      const titleInput = document.getElementById('cgModalTaskTitle');
      const timeInput = document.getElementById('cgModalTaskTime');
      const catSelect = document.getElementById('cgModalTaskCat');
      const soundSelect = document.getElementById('cgModalTaskSound');
      const latencySelect = document.getElementById('cgModalTaskLatency');
      const notesText = document.getElementById('cgModalTaskNotes');

      const editId = idInput ? idInput.value : '';
      const title = titleInput ? titleInput.value.trim() : '';
      const rawTime = timeInput ? timeInput.value : '09:00';
      const category = catSelect ? catSelect.value : 'Medication';
      const sound = soundSelect ? soundSelect.value : 'bell';
      const latency = latencySelect ? parseInt(latencySelect.value, 10) : 15;
      const notes = notesText ? notesText.value.trim() : '';

      if (!title) {
        alert("Please enter a title for the activity.");
        if (titleInput) titleInput.focus();
        return;
      }

      const timeMins = parseTimeToMinutes(rawTime);
      const displayTime = formatMinutesTo12Hour(timeMins);

      if (editId) {
        // Edit existing task
        const idNum = Number(editId);
        const taskIndex = state.tasks.findIndex(t => t.id === idNum || t.id === editId);
        if (taskIndex >= 0) {
          const updated = {
            ...state.tasks[taskIndex],
            title,
            time: displayTime,
            rawTime,
            tag: category,
            sound,
            latencyMinutes: latency,
            caregiverNote: notes,
            cueQuestion: `It is ${displayTime}. Time for your ${title}. Are you ready?`,
            cueOptions: [title, "Take a brief 5-min rest", "Ask caregiver for assistance"],
            cueHint: `Check your daily routine: ${title}`
          };
          state.tasks[taskIndex] = updated;
          state.tasks.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
          persistTasks();

          if (window.dbService && window.dbService.tasks) {
            window.dbService.tasks.update(editId, updated, state.uid || 'SAK-PT-8842');
          }

          if (typeof showSakshamToast === 'function') {
            showSakshamToast(`✏️ Updated "${title}" in Patient's To-Do List`, 'success');
          }
        }
      } else {
        // Add new task
        addCaregiverTaskDirect(title, rawTime, category, notes, sound, latency);
      }

      renderCaregiverManagedTasks();
      if (typeof renderDirectTasksList === 'function') renderDirectTasksList();
      if (typeof renderActiveCueCard === 'function') renderActiveCueCard();
      if (typeof updateChartsData === 'function') updateChartsData();
      if (typeof renderTimeframeInsights === 'function') renderTimeframeInsights();
      if (typeof checkScheduledReminders === 'function') checkScheduledReminders();

      closeCaregiverTaskModal();
    }

    function addCaregiverTaskPreset(presetKey) {
      const presets = {
        meds_morning: {
          title: "Morning Levodopa (100mg) with Water",
          time: "08:30",
          category: "Medication",
          note: "Take with light crackers, avoid protein within 30 mins",
          sound: "bell"
        },
        water: {
          title: "Drink 1 Full Glass of Water (Hydration)",
          time: "11:00",
          category: "Wellness",
          note: "Optimal hydration reduces orthostatic tremor drops",
          sound: "sax"
        },
        lunch: {
          title: "Nutritious Lunch & Fiber Salad",
          time: "13:00",
          category: "Food",
          note: "Eat seated upright, chew slowly and take steady swallows",
          sound: "sax"
        },
        walk: {
          title: "15-Minute Assisted Garden Walk",
          time: "16:30",
          category: "Physical",
          note: "Focus on big rhythmic arm swings and broad stance steps",
          sound: "marimba"
        },
        cognitive: {
          title: "Mind Clinic Cognitive Game Practice",
          time: "18:00",
          category: "Cognitive",
          note: "Play Pattern Matching or Word Recall to stimulate synapses",
          sound: "marimba"
        },
        meds_night: {
          title: "Evening Medication & Herbal Chamomile Tea",
          time: "20:30",
          category: "Medication",
          note: "Nighttime protocol to maintain overnight dopaminergic tone",
          sound: "bell"
        }
      };

      const p = presets[presetKey];
      if (!p) return;

      addCaregiverTaskDirect(p.title, p.time, p.category, p.note, p.sound);
    }

    function previewTaskSpeechPrompt(taskId) {
      const idNum = Number(taskId);
      const task = state.tasks.find(t => t.id === idNum || t.id === taskId);
      if (!task) return;
      const promptText = task.cueQuestion || `It is ${task.time}. Time for your ${task.title}. Are you ready?`;
      if (typeof speakText === 'function') {
        speakText(promptText);
      }
    }

    function shareTaskViaWhatsApp(taskId) {
      const idNum = Number(taskId);
      const task = state.tasks.find(t => t.id === idNum || t.id === taskId);
      if (!task) return;

      const msg = `🌿 *Saksham Patient Task Alert*\nPatient: Kalyani Sharma\nActivity: *${task.title}*\nScheduled Time: *${task.time}*\nCategory: ${task.tag}\nStatus: ${task.done ? '✅ Completed' : '⏳ Pending'}\nCaregiver Note: ${task.caregiverNote || 'None'}\n\nTrack progress on Saksham Cognitive Portal.`;
      const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function renderCaregiverNotes() {
      const container = document.getElementById('cgDoctorNotesLog');
      if (!container) return;
      container.innerHTML = (state.caregiverDoctorNotes || []).map(n => `
        <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1 shadow-xs">
          <strong class="text-indigo-900">${escapeHtmlCaregiver(n.title)}</strong>
          <p class="text-slate-600">${escapeHtmlCaregiver(n.body)}</p>
        </div>
      `).join('');
    }

    function saveCaregiverDoctorNote() {
      const t = document.getElementById('cgDoctorNoteTitle').value.trim();
      const b = document.getElementById('cgDoctorNoteBody').value.trim();
      if (t && b) {
        const noteData = {
          title: t,
          body: b,
          authorRole: 'caregiver',
          authorName: state.user || 'Aarav Sharma',
          date: 'Just now'
        };
        if (window.dbService && window.dbService.clinicalNotes) {
          window.dbService.clinicalNotes.create(noteData, state.uid || 'SAK-PT-8842');
        } else {
          state.caregiverDoctorNotes.unshift(noteData);
        }
        if (typeof persistCareNotes === 'function') persistCareNotes();
        renderCaregiverNotes();
        renderDoctorLogs();
        renderPatientCareTeamMessages();
        document.getElementById('cgDoctorNoteTitle').value = '';
        document.getElementById('cgDoctorNoteBody').value = '';
        alert("Clinical note recorded and synchronized across Doctor and Patient portals!");
      }
    }

    function renderDoctorLogs() {
      if (typeof renderDoctorTrialSummary === 'function') {
        renderDoctorTrialSummary();
      }
      const container = document.getElementById('doctorLogFeed');
      if (!container) return;
      container.innerHTML = (state.caregiverDoctorNotes || []).map(n => `
        <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
          <div class="flex justify-between items-center">
            <span class="font-black text-sky-800">${escapeHtmlCaregiver(n.title)}</span>
            <span class="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold">Caregiver Submission</span>
          </div>
          <p class="text-slate-600">${escapeHtmlCaregiver(n.body)}</p>
        </div>
      `).join('');
    }

    function renderDoctorDirectivesList() {
      const container = document.getElementById('docDirectivesList');
      if (!container) return;
      container.innerHTML = (state.doctorDirectives || []).map(d => `
        <div class="p-3 bg-teal-50/60 rounded-2xl border border-teal-200 text-xs space-y-1">
          <p class="font-bold text-teal-900">${escapeHtmlCaregiver(d.title)}</p>
          <p class="text-slate-700">${escapeHtmlCaregiver(d.body)}</p>
        </div>
      `).join('');
    }

    function saveDoctorDirective() {
      const t = document.getElementById('docDirectiveTitle').value.trim();
      const b = document.getElementById('docDirectiveBody').value.trim();
      if (t && b) {
        const dirData = {
          title: t,
          body: b,
          doctorName: state.user || 'Dr. Rajesh Verma, MD',
          date: 'Just now'
        };
        if (window.dbService && window.dbService.doctorDirectives) {
          window.dbService.doctorDirectives.create(dirData, state.uid || 'SAK-PT-8842');
        } else {
          state.doctorDirectives.unshift(dirData);
        }
        if (typeof persistCareNotes === 'function') persistCareNotes();
        document.getElementById('docDirectiveTitle').value = '';
        document.getElementById('docDirectiveBody').value = '';
        renderDoctorDirectivesList();
        renderPatientCareTeamMessages();
        alert("Professional directive recorded and updated in Caregiver and Patient portals!");
      }
    }

    function renderPatientCareTeamMessages() {
      const docContainer = document.getElementById('patientDocDirectivesList');
      const cgContainer = document.getElementById('patientCgNotesList');

      if (docContainer) {
        const directives = (state.doctorDirectives && state.doctorDirectives.length > 0)
          ? state.doctorDirectives
          : (typeof DEFAULT_DOCTOR_DIRECTIVES !== 'undefined' ? DEFAULT_DOCTOR_DIRECTIVES : []);
        
        docContainer.innerHTML = directives.map(d => `
          <div class="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 text-xs space-y-1.5 transition hover:bg-sky-50">
            <div class="flex items-center justify-between gap-1">
              <strong class="text-sky-950 font-bold">${escapeHtmlCaregiver(d.title)}</strong>
              <span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-sky-200/80 text-sky-900 shrink-0">Rx Directive</span>
            </div>
            <p class="text-slate-700 text-xs leading-relaxed">${escapeHtmlCaregiver(d.body)}</p>
            <div class="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-sky-200/40">
              <span class="font-medium text-slate-600">${escapeHtmlCaregiver(d.doctorName || 'Dr. Rajesh Verma, MD')}</span>
              <span class="text-sky-800 font-bold">${escapeHtmlCaregiver(d.date || 'Active')}</span>
            </div>
          </div>
        `).join('');
      }

      if (cgContainer) {
        const notes = (state.caregiverDoctorNotes && state.caregiverDoctorNotes.length > 0)
          ? state.caregiverDoctorNotes
          : (typeof DEFAULT_CAREGIVER_NOTES !== 'undefined' ? DEFAULT_CAREGIVER_NOTES : []);

        cgContainer.innerHTML = notes.map(n => `
          <div class="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-1.5 transition hover:bg-emerald-50">
            <div class="flex items-center justify-between gap-1">
              <strong class="text-[#1B4225] font-bold">${escapeHtmlCaregiver(n.title)}</strong>
              <span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-200/80 text-[#1B4225] shrink-0">Daily Note</span>
            </div>
            <p class="text-slate-700 text-xs leading-relaxed">${escapeHtmlCaregiver(n.body)}</p>
            <div class="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-emerald-200/40">
              <span class="font-medium text-slate-600">${escapeHtmlCaregiver(n.author || n.authorName || 'Aarav Sharma (Caregiver)')}</span>
              <span class="text-emerald-800 font-bold">${escapeHtmlCaregiver(n.date || 'Today')}</span>
            </div>
          </div>
        `).join('');
      }
    }

    function readCareTeamNotesAloud() {
      const directives = (state.doctorDirectives && state.doctorDirectives.length > 0)
        ? state.doctorDirectives
        : (typeof DEFAULT_DOCTOR_DIRECTIVES !== 'undefined' ? DEFAULT_DOCTOR_DIRECTIVES : []);
      const notes = (state.caregiverDoctorNotes && state.caregiverDoctorNotes.length > 0)
        ? state.caregiverDoctorNotes
        : (typeof DEFAULT_CAREGIVER_NOTES !== 'undefined' ? DEFAULT_CAREGIVER_NOTES : []);

      let speech = "Here are your care team instructions. ";
      if (directives.length > 0) {
        speech += `Doctor Verma advises: ${directives[0].title}. ${directives[0].body}. `;
      }
      if (notes.length > 0) {
        speech += `Caregiver Aarav notes: ${notes[0].title}. ${notes[0].body}.`;
      }
      if (typeof speakText === 'function') {
        speakText(speech);
      }
    }

    window.renderPatientCareTeamMessages = renderPatientCareTeamMessages;
    window.readCareTeamNotesAloud = readCareTeamNotesAloud;

    // Expose Caregiver Task Management suite globally
    window.renderCaregiverManagedTasks = renderCaregiverManagedTasks;
    window.filterCaregiverTasks = filterCaregiverTasks;
    window.handleCaregiverQuickAddTask = handleCaregiverQuickAddTask;
    window.addCaregiverTaskDirect = addCaregiverTaskDirect;
    window.deleteCaregiverTask = deleteCaregiverTask;
    window.toggleCaregiverTask = toggleCaregiverTask;
    window.openCaregiverAddTaskModal = openCaregiverAddTaskModal;
    window.closeCaregiverTaskModal = closeCaregiverTaskModal;
    window.saveCaregiverModalTask = saveCaregiverModalTask;
    window.addCaregiverTaskPreset = addCaregiverTaskPreset;
    window.previewTaskSpeechPrompt = previewTaskSpeechPrompt;
    window.shareTaskViaWhatsApp = shareTaskViaWhatsApp;

    /* ======================================================================= */
    /* CAREGIVER OVERVIEW TELEMETRY & TASK PERFORMANCE ANALYTICS               */
    /* ======================================================================= */

    function computeTaskChartStats() {
      const tasks = (typeof state !== 'undefined' && Array.isArray(state.tasks)) ? state.tasks : [];

      let doneCount = 0;
      let slowCount = 0;
      let snoozedCount = 0;
      let pendingCount = 0;

      tasks.forEach(t => {
        if (t.snoozed || (t.snoozeCount && t.snoozeCount > 0)) {
          snoozedCount++;
        } else if (t.latencyMinutes && t.latencyMinutes >= 15) {
          slowCount++;
        } else if (t.done) {
          doneCount++;
        } else {
          pendingCount++;
        }
      });

      const barLabels = [];
      const baselineData = [];
      const actualData = [];
      const barColors = [];

      const displayTasks = tasks.length > 0 ? tasks.slice(0, 8) : [];
      displayTasks.forEach(t => {
        const shortTitle = t.title.length > 18 ? t.title.substring(0, 16) + '…' : t.title;
        barLabels.push(shortTitle);
        const baseline = 5;
        baselineData.push(baseline);
        const actual = Number(t.latencyMinutes) || (t.done ? 6 : 5);
        actualData.push(actual);
        barColors.push(actual >= 15 ? '#EF4444' : '#10B981');
      });

      return {
        total: tasks.length,
        doneCount,
        slowCount,
        snoozedCount,
        pendingCount,
        barLabels,
        baselineData,
        actualData,
        barColors
      };
    }

    function renderCaregiverOverviewTelemetry() {
      const stats = computeTaskChartStats();

      // Update KPI metrics
      const elTotal = document.getElementById('cgOverviewTotalTasks');
      if (elTotal) elTotal.innerText = stats.total;

      const elDone = document.getElementById('cgOverviewDoneTasks');
      if (elDone) elDone.innerText = stats.doneCount;

      const elSlow = document.getElementById('cgOverviewSlowTasks');
      if (elSlow) elSlow.innerText = stats.slowCount;

      const elSnoozed = document.getElementById('cgOverviewSnoozedTasks');
      if (elSnoozed) elSnoozed.innerText = stats.snoozedCount;

      const elDoneRate = document.getElementById('cgOverviewDoneRate');
      if (elDoneRate) {
        const pct = stats.total > 0 ? Math.round((stats.doneCount / stats.total) * 100) : 0;
        elDoneRate.innerText = `${pct}% Met Target`;
      }

      // Update Pie Chart legend values
      const pDone = document.getElementById('cgPieDoneVal');
      if (pDone) pDone.innerText = stats.doneCount;
      const pSlow = document.getElementById('cgPieSlowVal');
      if (pSlow) pSlow.innerText = stats.slowCount;
      const pSnoozed = document.getElementById('cgPieSnoozedVal');
      if (pSnoozed) pSnoozed.innerText = stats.snoozedCount;
      const pPending = document.getElementById('cgPiePendingVal');
      if (pPending) pPending.innerText = stats.pendingCount;

      // Doctor legend values if present
      const docDone = document.getElementById('docPieDoneVal');
      if (docDone) docDone.innerText = stats.doneCount;
      const docSlow = document.getElementById('docPieSlowVal');
      if (docSlow) docSlow.innerText = stats.slowCount;
      const docSnoozed = document.getElementById('docPieSnoozedVal');
      if (docSnoozed) docSnoozed.innerText = stats.snoozedCount;
      const docPending = document.getElementById('docPiePendingVal');
      if (docPending) docPending.innerText = stats.pendingCount;

      // Patient pill values
      const ptDone = document.getElementById('patientDonePill');
      if (ptDone) ptDone.innerText = `✅ Done: ${stats.doneCount}`;
      const ptSlow = document.getElementById('patientSlowPill');
      if (ptSlow) ptSlow.innerText = `⏳ Needed Time: ${stats.slowCount}`;

      // Populate Slow Tasks Table
      const slowContainer = document.getElementById('cgOverviewSlowTasksList');
      if (slowContainer) {
        const slowTasks = (state.tasks || []).filter(t => (t.latencyMinutes >= 15) || (t.snoozed) || (t.snoozeCount > 0));
        if (slowTasks.length === 0) {
          slowContainer.innerHTML = `
            <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
              <span class="flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i>
                <span>All routine activities today completed at normal baseline speeds with zero delays!</span>
              </span>
              <span class="text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded-full font-black">Normal Motor Tone</span>
            </div>
          `;
        } else {
          slowContainer.innerHTML = slowTasks.map(t => {
            const isSnoozed = t.snoozed || (t.snoozeCount > 0);
            return `
              <div class="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition shadow-2xs">
                <div class="flex items-center space-x-3">
                  <div class="w-9 h-9 rounded-xl ${isSnoozed ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'} flex items-center justify-center font-bold text-sm shrink-0">
                    <i class="fa-solid ${isSnoozed ? 'fa-hourglass-half' : 'fa-clock-rotate-left'}"></i>
                  </div>
                  <div>
                    <h4 class="text-xs sm:text-sm font-black text-slate-900">${escapeHtml(t.title)}</h4>
                    <p class="text-[11px] text-slate-500 font-medium">
                      Scheduled: <strong>${t.time}</strong> • Category: <span class="font-bold text-slate-700">${t.tag}</span> • Normal Target: 5 mins
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2 self-end sm:self-center">
                  <span class="px-2.5 py-1 rounded-xl text-xs font-black ${isSnoozed ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}">
                    ${isSnoozed ? `Snoozed (+${(t.snoozeCount || 1) * 5}m)` : `Recorded: ${t.latencyMinutes} mins`}
                  </span>
                  <button onclick="openCaregiverAddTaskModal(${t.id})" class="px-3 py-1 bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition">
                    Edit / Assist
                  </button>
                </div>
              </div>
            `;
          }).join('');
        }
      }

      if (typeof updateChartsData === 'function') {
        updateChartsData();
      }

      if (typeof renderCaregiverTrialOverview === 'function') {
        renderCaregiverTrialOverview();
      }
    }

    /* ==================== 7-DAY PERSONALISATION TRIAL & CAREGIVER/CLINICIAN OVERVIEWS ==================== */
    function renderCaregiverTrialOverview() {
      const container = document.getElementById('cgPersonalisationTrialCard');
      if (!container) return;

      const patientId = (state && state.uid) ? state.uid : 'default';
      const trial = window.SakshamPersonalization ? window.SakshamPersonalization.getTrialState(patientId) : null;
      if (!trial) return;

      const hasPendingSync = (trial.difficultiesRecorded || []).some(r => r.synced === false);
      const pendingCount = (trial.difficultiesRecorded || []).filter(r => r.synced === false).length;

      const patientDiffs = (trial.difficultiesRecorded || []).filter(r => r.enteredBy !== 'caregiver');
      const cgObservations = (trial.difficultiesRecorded || []).filter(r => r.enteredBy === 'caregiver');

      container.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                Module 2: 7-Day Personalisation Trial
              </span>
              <span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${hasPendingSync ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}">
                ${hasPendingSync ? '⏳ Pending Sync (' + pendingCount + ' local)' : '☁️ All Data Synced'}
              </span>
            </div>
            <h3 class="text-base font-black text-slate-900 mt-1">
              Care Support &amp; Trial Overview for ${escapeHtmlCaregiver(trial.baselinePreferences && trial.baselinePreferences.displayName ? trial.baselinePreferences.displayName : 'Kalyani')}
            </h3>
          </div>
          <button type="button" onclick="loadCaregiverDemoTrial()" class="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer">
            🧪 Load 7-Day Demo
          </button>
        </div>

        <!-- Stepper (Read-Only) -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Current Trial Phase: Day ${trial.currentDay} of 7</span>
            <span class="text-teal-700 font-extrabold capitalize">Status: ${trial.status.replace(/_/g, ' ')}</span>
          </div>
          <div class="grid grid-cols-7 gap-1.5 pt-1">
            ${[1, 2, 3, 4, 5, 6, 7].map(d => {
              const isComp = (trial.completedDays || []).includes(d);
              const isCurr = trial.currentDay === d;
              return `
                <div class="py-1.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center select-none ${isCurr ? 'bg-teal-700 text-white shadow-xs ring-2 ring-teal-400' : isComp ? 'bg-teal-50 text-teal-900 border border-teal-200' : 'bg-slate-100 text-slate-400'}">
                  <span>D${d}</span>
                  <span class="text-[9px] font-normal">${d === 1 ? 'Base' : d <= 3 ? 'Diff' : d <= 5 ? 'Assist' : 'Review'}</span>
                </div>
              `;
            }).join('')}
          </div>
          <p class="text-[11px] text-slate-400 italic">Progress updates automatically as the patient completes tasks.</p>
        </div>

        <!-- Active Support Preferences (Read-Only) -->
        <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5">
          <div class="flex justify-between items-center">
            <span class="font-black text-slate-800 text-[11px] uppercase tracking-wider">
              Active Support Preferences (Patient Configured — Read-Only)
            </span>
            <span class="text-[10px] text-slate-400 font-medium">🔒 Protected from silent modification</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 pt-1">
            <div>
              <span class="text-slate-400 block text-[10px]">Guidance Style</span>
              <span class="font-bold capitalize">${((trial.baselinePreferences && trial.baselinePreferences.guidanceStyle) || 'step_by_step').replace(/_/g, ' ')}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px]">Text Size</span>
              <span class="font-bold capitalize">${(trial.baselinePreferences && trial.baselinePreferences.textSizePreference) || 'Standard'}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px]">Contrast</span>
              <span class="font-bold capitalize">${((trial.baselinePreferences && trial.baselinePreferences.contrastPreference) || 'standard').replace(/_/g, ' ')}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px]">Adaptive Engine</span>
              <span class="font-bold text-teal-700">${(trial.baselinePreferences && trial.baselinePreferences.adaptiveAssistanceEnabled !== false) ? 'Active' : 'Disabled'}</span>
            </div>
          </div>
        </div>

        <!-- Difficulties & Observations -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-black text-slate-800 text-xs block">
              Reported Difficulties &amp; Caregiver Observations (${(trial.difficultiesRecorded || []).length})
            </span>
          </div>

          ${(trial.completedDays || []).length === 0 ? `
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
              Trial Not Initiated: The patient has not yet started the 7-day personalization trial. No activity data recorded.
            </div>
          ` : (trial.difficultiesRecorded || []).length === 0 ? `
            <div class="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
              ✓ No Difficulties Reported: No difficulties have been reported by the patient or caregiver so far during completed trial days.
            </div>
          ` : `
            <div class="space-y-3">
              <!-- Patient Self-Reports -->
              <div class="space-y-1.5">
                <span class="text-[11px] font-bold text-teal-800 flex items-center gap-1">
                  <span>👤 Patient Self-Reported Difficulties (${patientDiffs.length})</span>
                </span>
                ${patientDiffs.length === 0 ? `<p class="text-[11px] text-slate-400 italic pl-1">No patient self-reported difficulties recorded.</p>` : `
                  <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    ${patientDiffs.map(r => `
                      <div class="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs flex justify-between items-center">
                        <div class="space-y-0.5">
                          <div class="flex items-center gap-1.5">
                            <span class="font-black text-amber-950">${escapeHtmlCaregiver(r.taskTitle)}</span>
                            <span class="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 font-bold border border-teal-200">
                              👤 Patient Self-Report
                            </span>
                          </div>
                          <p class="text-amber-800 text-[11px]">
                            Category: <strong>${escapeHtmlCaregiver(r.difficultyCategory.replace(/_/g, ' '))}</strong>
                            ${r.notes ? ' — "' + escapeHtmlCaregiver(r.notes) + '"' : ''}
                          </p>
                          <span class="text-slate-500 text-[10px] block">
                            ${new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            ${r.helpfulRating !== 'unrated' ? '<span class="ml-1.5 font-bold text-slate-700">• Feedback: ' + (r.helpfulRating === 'helpful' ? '👍 Helpful' : '👎 Not for me') + '</span>' : ''}
                          </span>
                        </div>
                        <div class="flex flex-col items-end gap-1 shrink-0 ml-2">
                          ${r.assistanceSelected ? '<span class="px-2 py-0.5 bg-teal-100 text-teal-900 font-bold rounded-lg text-[10px]">' + escapeHtmlCaregiver(r.assistanceSelected.replace(/_/g, ' ')) + '</span>' : ''}
                          <span class="text-[9px] px-1.5 py-0.5 rounded-md font-bold ${r.synced === false ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-white text-emerald-800 border border-emerald-200'}">
                            ${r.synced === false ? '⏳ Pending' : '☁️ Synced'}
                          </span>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>

              <!-- Caregiver Observations -->
              <div class="space-y-1.5 pt-1">
                <span class="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                  <span>🤝 Caregiver Support Observations (${cgObservations.length})</span>
                </span>
                ${cgObservations.length === 0 ? `<p class="text-[11px] text-slate-400 italic pl-1">No caregiver observations recorded yet.</p>` : `
                  <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    ${cgObservations.map(r => `
                      <div class="p-2.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-xs flex justify-between items-center">
                        <div class="space-y-0.5">
                          <div class="flex items-center gap-1.5">
                            <span class="font-black text-indigo-950">${escapeHtmlCaregiver(r.taskTitle)}</span>
                            <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-bold border border-indigo-200">
                              🤝 Caregiver Observation
                            </span>
                          </div>
                          <p class="text-indigo-900 text-[11px]">
                            Domain: <strong>${escapeHtmlCaregiver(r.difficultyCategory.replace(/_/g, ' '))}</strong>
                            ${r.notes ? ' — "' + escapeHtmlCaregiver(r.notes) + '"' : ''}
                          </p>
                          <span class="text-slate-500 text-[10px] block">
                            Recorded on ${new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div class="flex flex-col items-end gap-1 shrink-0 ml-2">
                          <span class="text-[9px] px-1.5 py-0.5 rounded-md font-bold ${r.synced === false ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-white text-emerald-800 border border-emerald-200'}">
                            ${r.synced === false ? '⏳ Pending' : '☁️ Synced'}
                          </span>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>
            </div>
          `}
        </div>

        <!-- Helpful vs Unhelpful -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs">
            <span class="font-black text-emerald-900 block">👍 Patient-Confirmed Helpful Options</span>
            <div class="flex flex-wrap gap-1 pt-1">
              ${(trial.helpfulAssistanceOptions || []).length === 0 ? `<span class="text-emerald-700 italic text-[11px]">No options rated helpful yet</span>` : trial.helpfulAssistanceOptions.map(opt => `<span class="px-2 py-0.5 bg-emerald-200/70 text-emerald-950 rounded-lg text-[10px] font-bold">${escapeHtmlCaregiver(opt.replace(/_/g, ' '))}</span>`).join('')}
            </div>
          </div>
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
            <span class="font-black text-slate-800 block">👎 Patient-Discontinued Options</span>
            <div class="flex flex-wrap gap-1 pt-1">
              ${(trial.unhelpfulAssistanceOptions || []).length === 0 ? `<span class="text-slate-500 italic text-[11px]">No options discontinued</span>` : trial.unhelpfulAssistanceOptions.map(opt => `<span class="px-2 py-0.5 bg-slate-200 text-slate-800 rounded-lg text-[10px] font-bold">${escapeHtmlCaregiver(opt.replace(/_/g, ' '))}</span>`).join('')}
            </div>
          </div>
        </div>

        <!-- Caregiver Observation Form -->
        <form onsubmit="handleSaveCaregiverTrialObservation(event)" class="pt-3 border-t border-slate-100 space-y-2">
          <div class="flex items-center justify-between">
            <label for="cgObsNotes" class="block text-xs font-bold text-slate-800">
              Record Caregiver Support Observation
            </label>
            <span class="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
              Attributed as Caregiver Observation
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label class="block text-[10px] text-slate-500 font-bold mb-1">Observation Domain</label>
              <select id="cgObsCategory" class="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800">
                <option value="motor">Motor / Movement (Tremor or physical difficulty)</option>
                <option value="memory">Memory (Remembering what to do)</option>
                <option value="sequence">Steps / Sequencing (Order of operations)</option>
                <option value="sensory">Sensory (Vision, font size, contrast)</option>
                <option value="other">Other daily observation</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] text-slate-500 font-bold mb-1">Routine Task / Context</label>
              <input id="cgObsTask" type="text" placeholder="e.g. Morning Dressing or General Routine" class="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800">
            </div>
          </div>
          <div class="flex gap-2">
            <input id="cgObsNotes" type="text" placeholder="e.g., Patient felt steadier with 1-step prompts..." class="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs">
            <button type="submit" class="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer">
              Record Observation
            </button>
          </div>
          <div id="cgObsSavedNotice" class="hidden text-emerald-700 font-bold text-xs">
            ✓ Caregiver observation recorded and attributed to Caregiver.
          </div>
        </form>
      `;
    }

    function loadCaregiverDemoTrial() {
      const patientId = (state && state.uid) ? state.uid : 'default';
      if (window.SakshamPersonalization) {
        window.SakshamPersonalization.loadDemoTrialData(patientId);
        renderCaregiverTrialOverview();
        if (typeof showSakshamToast === 'function') {
          showSakshamToast('7-day personalization demo loaded into Caregiver Portal!', 'success');
        }
      }
    }

    function handleSaveCaregiverTrialObservation(e) {
      if (e && e.preventDefault) e.preventDefault();
      const cat = document.getElementById('cgObsCategory')?.value || 'other';
      const task = document.getElementById('cgObsTask')?.value || 'General Routine Activity';
      const notes = document.getElementById('cgObsNotes')?.value || '';
      if (!notes.trim()) return;

      const patientId = (state && state.uid) ? state.uid : 'default';
      if (window.SakshamPersonalization) {
        window.SakshamPersonalization.recordDifficulty(patientId, {
          taskId: Date.now(),
          taskTitle: task.trim() || 'General Routine Activity',
          difficultyCategory: cat,
          notes: notes.trim(),
          enteredBy: 'caregiver',
          helpfulRating: 'unrated'
        });
      }

      const notice = document.getElementById('cgObsSavedNotice');
      if (notice) {
        notice.classList.remove('hidden');
        setTimeout(() => notice.classList.add('hidden'), 3000);
      }

      const inputNotes = document.getElementById('cgObsNotes');
      if (inputNotes) inputNotes.value = '';

      renderCaregiverTrialOverview();
      if (typeof showSakshamToast === 'function') {
        showSakshamToast('Caregiver observation recorded and attributed to Caregiver.', 'success');
      }
    }

    function renderDoctorTrialSummary() {
      const container = document.getElementById('docPersonalisationTrialCard');
      const previewBox = document.getElementById('previewReportBox');

      const patientId = (state && state.uid) ? state.uid : 'default';
      const trial = window.SakshamPersonalization ? window.SakshamPersonalization.getTrialState(patientId) : null;
      if (!trial) return;

      const summary = window.SakshamPersonalization.getTrialReviewSummary(patientId);
      const patientDiffs = (trial.difficultiesRecorded || []).filter(r => r.enteredBy !== 'caregiver');
      const cgObservations = (trial.difficultiesRecorded || []).filter(r => r.enteredBy === 'caregiver');
      const hasPendingSync = (trial.difficultiesRecorded || []).some(r => r.synced === false);

      const reportText = `=============================================================
SAKSHAM HEALTHCARE CONSULTATION REPORT (NON-DIAGNOSTIC SUMMARY)
Patient: ${escapeHtmlCaregiver((trial.baselinePreferences && trial.baselinePreferences.displayName) || 'Kalyani Sharma')}
Patient Identifier: ${patientId}
Generated At: ${new Date().toISOString()}
Data Freshness: Synchronized from local and Firestore persistent cache ${hasPendingSync ? '[Local Records Pending Sync]' : '[Cloud Synced]'}
-------------------------------------------------------------
1. FUNCTIONAL SUPPORT & TRIAL OVERVIEW
Status: ${trial.status}
Completed Days: ${(trial.completedDays || []).join(', ') || '1'} of 7
Guidance Preference: ${(trial.baselinePreferences && trial.baselinePreferences.guidanceStyle) || 'step_by_step'}
Text Scaling Preference: ${(trial.baselinePreferences && trial.baselinePreferences.textSizePreference) || 'large'}
Contrast Preference: ${(trial.baselinePreferences && trial.baselinePreferences.contrastPreference) || 'standard'}

2. REPORTED ACTIVITY DIFFICULTIES BY DOMAIN
Total Recorded Incidents: ${summary.totalDifficulties}
${Object.entries(summary.byCategory || {}).map(([cat, count]) => {
  const catIncidents = (trial.difficultiesRecorded || []).filter(d => d.difficultyCategory === cat);
  const dates = catIncidents.map(i => new Date(i.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })).join(', ');
  return `  - ${cat.replace(/_/g, ' ')}: ${count} incident(s) [Dates: ${dates || 'N/A'}]`;
}).join('\n')}

3. PATIENT SELF-REPORTS VS CAREGIVER OBSERVATIONS
A. Patient Self-Reports (${patientDiffs.length} entries):
${patientDiffs.map(d => `  [${new Date(d.timestamp).toLocaleDateString()}] ${d.taskTitle}: ${d.difficultyCategory} (Assistance: ${d.assistanceSelected || 'none'}, Rating: ${d.helpfulRating}) - "${d.notes || 'None'}"`).join('\n') || '  No patient self-reported difficulties recorded.'}

B. Caregiver Observations (${cgObservations.length} entries):
${cgObservations.map(d => `  [${new Date(d.timestamp).toLocaleDateString()}] ${d.taskTitle}: ${d.difficultyCategory} - "${d.notes || 'None'}" [Attributed: Caregiver]`).join('\n') || '  No caregiver observations recorded.'}

4. ASSISTANCE UTILITY RATINGS
Patient-Confirmed Helpful Options:
${(summary.helpfulOptions || []).map(h => `  - ${h.replace(/_/g, ' ')}`).join('\n') || '  None recorded'}

Options Found Unhelpful / Discontinued:
${(summary.unhelpfulOptions || []).map(u => `  - ${u.replace(/_/g, ' ')}`).join('\n') || '  None'}

5. CAREGIVER ASSISTANCE DISPATCHES
Tasks Requiring Human Support: ${(summary.humanAssistanceRequests || []).length}
${(trial.humanAssistanceRequestedTasks || []).map(t => `  - Task ID ${t}`).join('\n') || '  None'}

=============================================================
NON-DIAGNOSTIC CLINICAL DISCLAIMER:
This summary records observational daily-life functional support
needs and user-selected assistive options. It does not provide clinical
diagnoses, disease progression predictions, or medication directives.
All clinical evaluations require formal assessment by the attending physician.
=============================================================`;

      if (previewBox) {
        previewBox.innerText = reportText;
      }

      if (container) {
        container.innerHTML = `
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  Module 8: Healthcare Telemetry &amp; Trial Review
                </span>
                <span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${hasPendingSync ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}">
                  ${hasPendingSync ? '⏳ Pending Sync Records' : '☁️ Cloud Synced'}
                </span>
              </div>
              <h3 class="text-base font-black text-slate-900 mt-1">
                Clinical Consultation Summary — ${escapeHtmlCaregiver((trial.baselinePreferences && trial.baselinePreferences.displayName) || 'Kalyani Sharma')}
              </h3>
              <p class="text-xs text-slate-500">
                Objective adherence, observed difficulties, and assistive option utility (Non-Diagnostic Framing)
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="loadDoctorDemoTrial()" class="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer">
                🧪 Load 7-Day Demo
              </button>
              <button type="button" onclick="exportDoctorReport()" class="text-xs px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer">
                📄 Export Summary
              </button>
            </div>
          </div>

          <!-- Non-Diagnostic Disclaimer -->
          <div class="p-3 bg-sky-50/70 border border-sky-200 rounded-xl text-xs text-sky-900 leading-relaxed flex items-start gap-2">
            <span class="font-bold shrink-0">ℹ️ Non-Diagnostic Framing:</span>
            <span>
              This summary records observed activity completion, self-reported difficulties, and patient-approved
              assistance options. It does NOT generate clinical diagnoses, predict disease progression, or recommend medication. Consult
              the attending neurologist for clinical evaluations.
            </span>
          </div>

          <!-- Metrics Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span class="text-[10px] font-bold text-slate-500 uppercase block">Trial Progress</span>
              <span class="text-lg font-black text-slate-900">${(trial.completedDays || []).length} / 7 Days</span>
            </div>
            <div class="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-center">
              <span class="text-[10px] font-bold text-amber-800 uppercase block">Reported Difficulties</span>
              <span class="text-lg font-black text-amber-950">${summary.totalDifficulties}</span>
            </div>
            <div class="p-3 bg-teal-50/60 rounded-xl border border-teal-100 text-center">
              <span class="text-[10px] font-bold text-teal-800 uppercase block">Helpful Assist Options</span>
              <span class="text-lg font-black text-teal-950">${(summary.helpfulOptions || []).length}</span>
            </div>
            <div class="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-center">
              <span class="text-[10px] font-bold text-purple-800 uppercase block">Caregiver Requests</span>
              <span class="text-lg font-black text-purple-950">${(summary.humanAssistanceRequests || []).length}</span>
            </div>
          </div>

          <!-- Categories & Dates -->
          <div class="space-y-2">
            <span class="text-xs font-black text-slate-800 block">Reported Difficulties by Domain &amp; Dates</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              ${Object.entries(summary.byCategory || {}).map(([cat, count]) => {
                const catIncidents = (trial.difficultiesRecorded || []).filter(d => d.difficultyCategory === cat);
                const dates = catIncidents.map(i => new Date(i.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })).join(', ');
                return `
                  <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between gap-1">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-slate-700 capitalize">${cat.replace(/_/g, ' ')}</span>
                      <span class="px-2 py-0.5 bg-slate-200 text-slate-800 rounded-lg text-xs font-bold">${count} incident(s)</span>
                    </div>
                    ${dates ? '<span class="text-[10px] text-slate-500">Dates: <strong>' + dates + '</strong></span>' : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Patient vs Caregiver Attribution -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <span class="font-bold text-slate-900 block">👤 Patient Self-Reports (${patientDiffs.length})</span>
              ${patientDiffs.length === 0 ? '<p class="text-slate-400 italic text-[11px]">No patient self-reports recorded</p>' : `
                <div class="space-y-1 max-h-36 overflow-y-auto pr-1">
                  ${patientDiffs.map(d => `
                    <div class="p-1.5 bg-white rounded-lg border border-slate-100 text-[11px]">
                      <div class="flex justify-between font-bold text-slate-800">
                        <span>${escapeHtmlCaregiver(d.taskTitle)}</span>
                        <span class="text-teal-700">${escapeHtmlCaregiver(d.difficultyCategory.replace(/_/g, ' '))}</span>
                      </div>
                      <div class="flex justify-between text-slate-500 text-[10px]">
                        <span>${new Date(d.timestamp).toLocaleDateString()}</span>
                        <span>Rating: ${escapeHtmlCaregiver(d.helpfulRating)}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <span class="font-bold text-slate-900 block">🤝 Caregiver Support Observations (${cgObservations.length})</span>
              ${cgObservations.length === 0 ? '<p class="text-slate-400 italic text-[11px]">No caregiver observations recorded</p>' : `
                <div class="space-y-1 max-h-36 overflow-y-auto pr-1">
                  ${cgObservations.map(d => `
                    <div class="p-1.5 bg-white rounded-lg border border-slate-100 text-[11px]">
                      <div class="flex justify-between font-bold text-slate-800">
                        <span>${escapeHtmlCaregiver(d.taskTitle)}</span>
                        <span class="text-indigo-700">${escapeHtmlCaregiver(d.difficultyCategory.replace(/_/g, ' '))}</span>
                      </div>
                      <div class="text-slate-600 text-[10px] mt-0.5 truncate">"${escapeHtmlCaregiver(d.notes)}"</div>
                      <div class="text-slate-400 text-[9px]">Observed on ${new Date(d.timestamp).toLocaleDateString()}</div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          </div>
        `;
      }
    }

    function loadDoctorDemoTrial() {
      const patientId = (state && state.uid) ? state.uid : 'default';
      if (window.SakshamPersonalization) {
        window.SakshamPersonalization.loadDemoTrialData(patientId);
        renderDoctorTrialSummary();
        if (typeof showSakshamToast === 'function') {
          showSakshamToast('7-day personalization telemetry loaded into Clinician Portal!', 'success');
        }
      }
    }

    window.renderCaregiverTrialOverview = renderCaregiverTrialOverview;
    window.loadCaregiverDemoTrial = loadCaregiverDemoTrial;
    window.handleSaveCaregiverTrialObservation = handleSaveCaregiverTrialObservation;
    window.renderDoctorTrialSummary = renderDoctorTrialSummary;
    window.loadDoctorDemoTrial = loadDoctorDemoTrial;

    window.computeTaskChartStats = computeTaskChartStats;
    window.renderCaregiverOverviewTelemetry = renderCaregiverOverviewTelemetry;


