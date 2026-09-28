/* ======================================================================= */
/* SAKSHAM MONTHLY ADHERENCE CALENDAR & DATE TELEMETRY CONTROLLER          */
/* ======================================================================= */

    function renderInteractiveMonthlyGrid() {
      const grid = document.getElementById('interactiveCalendarGrid');
      if (!grid) return;
      grid.innerHTML = '';

      state.calendarMonthDays.forEach(item => {
        const isCurrentDay = item.day === 25; // Sept 25
        let statusBadge = '';
        let cellBg = 'bg-white hover:bg-slate-100';

        if (item.status === 'all_done') {
          statusBadge = '<span class="w-2.5 h-2.5 rounded-full bg-emerald-500" title="All Completed"></span>';
        } else if (item.status === 'delayed') {
          statusBadge = '<span class="w-2.5 h-2.5 rounded-full bg-amber-500" title="Needed More Time"></span>';
          cellBg = 'bg-amber-50/50 hover:bg-amber-100/60 border-amber-200';
        } else if (item.status === 'missed') {
          statusBadge = '<span class="w-2.5 h-2.5 rounded-full bg-rose-500" title="Missed Tasks"></span>';
          cellBg = 'bg-rose-50/50 hover:bg-rose-100/60 border-rose-200';
        } else {
          statusBadge = '<span class="w-2 h-2 rounded-full bg-slate-300"></span>';
        }

        const cell = document.createElement('div');
        cell.className = `p-2.5 min-h-[62px] rounded-2xl border ${cellBg} flex flex-col justify-between cursor-pointer transition shadow-2xs ${isCurrentDay ? 'ring-2 ring-teal-500 bg-teal-50' : 'border-slate-200'}`;
        cell.onclick = () => inspectCalendarDay(item);

        cell.innerHTML = `
          <div class="flex justify-between items-center text-xs font-black">
            <span class="${isCurrentDay ? 'text-teal-800' : 'text-slate-800'}">${item.day}</span>
            ${statusBadge}
          </div>
          <div class="text-[10px] font-bold text-slate-500 text-right">
            ${item.completed > 0 ? `${item.completed}/${item.total}` : ''}
          </div>
        `;
        grid.appendChild(cell);
      });

      // Default inspect today
      inspectCalendarDay(state.calendarMonthDays[24]);
    }

    function inspectCalendarDay(dayItem) {
      const card = document.getElementById('calendarDayInspectionCard');
      if (!card) return;

      const dateStr = `September ${dayItem.day}, 2026`;
      const isMissed = dayItem.status === 'missed';
      const isDelayed = dayItem.status === 'delayed';

      card.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-teal-200/80 pb-2">
          <div>
            <span class="text-[10px] font-black uppercase text-teal-800 tracking-wider">Detailed Day Telemetry</span>
            <h4 class="text-base font-black text-slate-900 font-heading">Inspection Log: ${dateStr}</h4>
          </div>
          <div class="flex gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${isMissed ? 'bg-rose-100 text-rose-800' : (isDelayed ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')}">
              ${isMissed ? '⚠️ Tasks Missed' : (isDelayed ? '⏳ Slower Tasks / Latency' : '✅ 100% Completed')}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <p class="font-bold text-slate-700">Completed Score:</p>
            <p class="text-xl font-black text-slate-900">${dayItem.completed} of ${dayItem.total} Tasks Completed</p>
            <p class="text-slate-500 mt-1">Daily Latency / Extra Time: <strong>${dayItem.latency} minutes</strong></p>
          </div>
          <div class="space-y-1">
            <p class="font-bold text-slate-700">Clinical Observations & Alerts:</p>
            <p class="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-800 font-medium">
              ${dayItem.notes}
            </p>
          </div>
        </div>

        <div class="flex justify-between items-center pt-1 text-xs">
          <button onclick="speakText('Day inspection for ${dateStr}. ${dayItem.notes}. ${dayItem.completed} of ${dayItem.total} tasks completed.')" class="text-teal-700 font-bold hover:underline flex items-center gap-1">
            <i class="fa-solid fa-volume-high"></i> Listen to Day Summary
          </button>
          <span class="text-slate-500 text-[11px]">Synchronized with Caregiver Hub</span>
        </div>
      `;
    }

    /* ==================== REAL CALENDAR DATE CHANGE & TIMEFRAME ==================== */
    function openHeaderDatePicker() {
      const picker = document.getElementById('globalCalendarPicker');
      if (picker) {
        if (typeof picker.showPicker === 'function') {
          try {
            picker.showPicker();
          } catch(err) {
            picker.click();
          }
        } else {
          picker.click();
        }
      }
    }

    function updateHeaderDateDisplay(dateStr) {
      if (!dateStr) return;
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const d = new Date(year, month, day);
          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
          const monthName = d.toLocaleDateString('en-US', { month: 'short' });
          const customFormatted = `${dayName}, ${day} ${monthName} ${year}`;
          const el = document.getElementById('headerFormattedDate');
          if (el) el.innerText = customFormatted;
        }
      } catch(e) {
        console.warn("Date format error:", e);
      }
    }

    function onCalendarDateChanged(newDateStr) {
      state.selectedDate = newDateStr;
      updateHeaderDateDisplay(newDateStr);
      renderTimeframeInsights();
    }

    function setTimeframeMode(mode) {
      state.timeframeMode = mode;
      ['daily', 'weekly', 'monthly'].forEach(m => {
        const btn = document.getElementById(`tf-btn-${m}`);
        if (btn) {
          if (m === mode) {
            btn.className = "tf-btn px-3 py-1 rounded-lg font-black bg-white text-teal-900 shadow-xs transition";
          } else {
            btn.className = "tf-btn px-3 py-1 rounded-lg text-teal-100 hover:text-white transition";
          }
        }
      });

      if (mode === 'monthly') {
        switchTab('calendar-hub');
        closeTelemetryModal();
      } else {
        renderTimeframeInsights();
      }
    }


