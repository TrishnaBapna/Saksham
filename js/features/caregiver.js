/* ======================================================================= */
/* SAKSHAM CAREGIVER HUB & CLINICIAN TELEMETRY LOGS                        */
/* ======================================================================= */

    /* ==================== 8. CAREGIVER & DOCTOR LOGS ==================== */
    function renderCaregiverAlerts() {
      document.getElementById('caregiverAlertList').innerHTML = state.caregiverAlerts.map(a => `
        <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 flex justify-between items-center shadow-xs">
          <div><strong class="text-amber-700">${a.time}:</strong> ${a.text}</div>
          <button onclick="speakText('${a.text}')" class="text-slate-400 hover:text-slate-700"><i class="fa-solid fa-volume-high"></i></button>
        </div>
      `).join('');
    }

    function renderCaregiverManagedTasks() {
      document.getElementById('caregiverManagedTasksList').innerHTML = state.tasks.map(t => `
        <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
          <div>
            <p class="font-bold text-slate-900">${t.title}</p>
            <p class="text-slate-500">${t.time} • <span class="text-teal-600 font-bold">${t.tag}</span></p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${t.done ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}">
              ${t.done ? 'Done' : 'Pending'}
            </span>
            <button onclick="toggleTask(${t.id})" class="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-bold">
              Toggle
            </button>
          </div>
        </div>
      `).join('');
    }

    function renderCaregiverNotes() {
      document.getElementById('cgDoctorNotesLog').innerHTML = state.caregiverDoctorNotes.map(n => `
        <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1 shadow-xs">
          <strong class="text-indigo-900">${n.title}</strong>
          <p class="text-slate-600">${n.body}</p>
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
          authorName: state.user || 'Aarav Sharma'
        };
        if (window.dbService && window.dbService.clinicalNotes) {
          window.dbService.clinicalNotes.create(noteData, state.uid || 'SAK-PT-8842');
        } else {
          state.caregiverDoctorNotes.unshift({ title: t, body: b });
        }
        renderCaregiverNotes();
        renderDoctorLogs();
        document.getElementById('cgDoctorNoteTitle').value = '';
        document.getElementById('cgDoctorNoteBody').value = '';
        alert("Clinical note recorded and synchronized with Doctor portal!");
      }
    }

    function renderDoctorLogs() {
      document.getElementById('doctorLogFeed').innerHTML = state.caregiverDoctorNotes.map(n => `
        <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
          <div class="flex justify-between items-center">
            <span class="font-black text-sky-800">${n.title}</span>
            <span class="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold">Caregiver Submission</span>
          </div>
          <p class="text-slate-600">${n.body}</p>
        </div>
      `).join('');
    }

    function renderDoctorDirectivesList() {
      document.getElementById('docDirectivesList').innerHTML = state.doctorDirectives.map(d => `
        <div class="p-3 bg-teal-50/60 rounded-2xl border border-teal-200 text-xs space-y-1">
          <p class="font-bold text-teal-900">${d.title}</p>
          <p class="text-slate-700">${d.body}</p>
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
          doctorName: state.user || 'Dr. Rajesh Verma'
        };
        if (window.dbService && window.dbService.doctorDirectives) {
          window.dbService.doctorDirectives.create(dirData, state.uid || 'SAK-PT-8842');
        } else {
          state.doctorDirectives.unshift({ title: t, body: b });
        }
        document.getElementById('docDirectiveTitle').value = '';
        document.getElementById('docDirectiveBody').value = '';
        renderDoctorDirectivesList();
        alert("Professional directive recorded and updated across portals!");
      }
    }


