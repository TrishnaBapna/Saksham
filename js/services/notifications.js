/* ======================================================================= */
/* SAKSHAM PROACTIVE REMINDERS & SYSTEM NOTIFICATIONS SERVICE              */
/* ======================================================================= */

    /* ==================== PROACTIVE REMINDER & ALARM ENGINE ==================== */
    let reminderBannerDismissedId = null;
    let screenWakeLock = null;
    let alertedTaskMinutes = {}; // Track which task already alerted for which minute: { [taskId]: 'YYYY-MM-DD_HH:MM' }

    async function requestScreenWakeLock() {
      try {
        if ('wakeLock' in navigator && !screenWakeLock) {
          screenWakeLock = await navigator.wakeLock.request('screen');
          screenWakeLock.addEventListener('release', () => { screenWakeLock = null; });
        }
      } catch (e) {
        console.log('[WakeLock Note]:', e);
      }
    }

    function releaseScreenWakeLock() {
      if (screenWakeLock) {
        screenWakeLock.release().catch(() => {});
        screenWakeLock = null;
      }
    }

    let lastEvaluatedReminderMinute = -1;
    function checkScheduledReminders() {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const nowMins = h * 60 + m;
      const currentMinuteKey = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}_${h}:${m}`;

      // Check all active uncompleted tasks
      const due = state.tasks.find(t => {
        if (t.done || t.status === 'not_done' || t.status === 'all_done') return false;
        const taskMins = parseTimeToMinutes(t.time);

        // Does this task match the current clock minute?
        if (taskMins === nowMins && alertedTaskMinutes[t.id] !== currentMinuteKey) {
          return true;
        }
        return false;
      });

      if (due) {
        alertedTaskMinutes[due.id] = currentMinuteKey;
        triggerTaskAlarm(due);
      }

      // Avoid redundant DOM querying and service worker message posting if minute hasn't elapsed
      if (lastEvaluatedReminderMinute === nowMins && !due) return;
      lastEvaluatedReminderMinute = nowMins;

      // Check if there is any pending task currently due or past due to display the sticky top banner
      updateReminderBanner(nowMins);

      // Keep service worker updated with upcoming schedule
      syncUpcomingAlarmsWithServiceWorker();
    }

    function testAlarmNow() {
      // Explicitly unlock audio on click
      initAudio();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const timeStr = `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;

      const testTask = {
        id: 'test-' + Date.now(),
        title: "Test Reminder Alarm",
        time: timeStr,
        tag: "Medication",
        done: false
      };

      triggerTaskAlarm(testTask);
    }

    function syncUpcomingAlarmsWithServiceWorker() {
      if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return;
      try {
        const upcoming = state.tasks
          .filter(t => !t.done && t.status !== 'not_done')
          .map(t => {
            const parts = (t.time || '').trim().split(' ');
            const timeParts = (parts[0] || '').split(':');
            let hours = parseInt(timeParts[0], 10) || 0;
            const mins = parseInt(timeParts[1], 10) || 0;
            if (parts[1] && parts[1].toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (parts[1] && parts[1].toUpperCase() === 'AM' && hours === 12) hours = 0;

            const triggerDate = new Date();
            triggerDate.setHours(hours, mins, 0, 0);
            if (triggerDate.getTime() <= Date.now()) {
              triggerDate.setDate(triggerDate.getDate() + 1);
            }

            return {
              id: t.id,
              title: t.title,
              time: t.time,
              triggerTimestamp: triggerDate.getTime()
            };
          });

        navigator.serviceWorker.controller.postMessage({
          type: 'SCHEDULE_REMINDERS',
          tasks: upcoming
        });
      } catch (err) {
        console.log('[Saksham SW Sync Note]:', err);
      }
    }

    function triggerTaskAlarm(task) {
      activeAlarmTaskId = task.id;

      // Make sure browser audio/speech is active before the reminder auto-triggers.
      try {
        initAudio();
        if ('speechSynthesis' in window && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (e) {
        console.log('[Saksham Reminder Audio Note]:', e);
      }

      // Keep phone screen awake during alarm reminder
      requestScreenWakeLock();

      // Mobile haptic vibration feedback
      if (navigator.vibrate) {
        try { navigator.vibrate([400, 200, 400, 200, 400]); } catch(e) {}
      }

      // 1. Update and show the Real-Time Alarm Modal
      const modal = document.getElementById('alarmModal');
      const titleEl = document.getElementById('alarmModalTitle');
      const subEl = document.getElementById('alarmModalSubtitle');
      if (titleEl) titleEl.innerText = task.title;
      if (subEl) subEl.innerText = `Scheduled right now for ${task.time}. Time to begin!`;
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
      }

      // 2. Play audible alarm sound (Loud double-tone alarm chime)
      if (task.tag === 'Medication') {
        playInstrumentCue('bell');
        setTimeout(() => playInstrumentCue('bell'), 750);
      } else {
        playAudioChime('chime');
        setTimeout(() => playAudioChime('chime'), 850);
      }

      // 3. Spoken voice announcement
      speakText(`Activity Reminder for Kalyani: It is time for ${task.title}. Scheduled for ${task.time}.`);

      // 4. Trigger Web / System Notification (works on Android & desktop Chrome)
      sendSystemNotification(task);

      // 5. Update top sticky reminder banner
      showActiveReminderBanner(task);
    }

    function updateReminderBanner(nowMins) {
      const currentDue = state.tasks.find(t => {
        if (t.done || t.status === 'not_done' || t.status === 'all_done') return false;
        const taskMins = parseTimeToMinutes(t.time);
        return (nowMins >= taskMins && (nowMins - taskMins) <= 60);
      });

      if (currentDue && reminderBannerDismissedId !== currentDue.id) {
        showActiveReminderBanner(currentDue);
      } else if (!currentDue) {
        hideActiveReminderBanner();
      }
    }

    function showActiveReminderBanner(task) {
      const banner = document.getElementById('activeReminderBanner');
      const timeEl = document.getElementById('reminderBannerTime');
      const titleEl = document.getElementById('reminderBannerTitle');
      if (banner && timeEl && titleEl) {
        timeEl.innerText = `Due at ${task.time}`;
        titleEl.innerText = task.title;
        banner.classList.remove('hidden');
      }
    }

    function hideActiveReminderBanner() {
      const banner = document.getElementById('activeReminderBanner');
      if (banner) banner.classList.add('hidden');
    }

    function dismissReminderBanner() {
      if (activeAlarmTaskId) reminderBannerDismissedId = activeAlarmTaskId;
      hideActiveReminderBanner();
    }

    function startRoutineFromReminder() {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const currentDue = state.tasks.find(t => {
        if (t.done || t.status === 'not_done' || t.status === 'all_done') return false;
        const taskMins = parseTimeToMinutes(t.time);
        return (nowMins >= taskMins && (nowMins - taskMins) <= 60);
      }) || state.tasks.find(t => !t.done) || state.tasks[0];

      if (currentDue) {
        hideActiveReminderBanner();
        openTaskRunner(currentDue.id);
      }
    }

    function completeFromReminder() {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const currentDue = state.tasks.find(t => {
        if (t.done || t.status === 'not_done' || t.status === 'all_done') return false;
        const taskMins = parseTimeToMinutes(t.time);
        return (nowMins >= taskMins && (nowMins - taskMins) <= 60);
      });

      if (currentDue) {
        toggleTask(currentDue.id);
        hideActiveReminderBanner();
        playAudioChime('fanfare');
        speakText(`Completed: ${currentDue.title}. Wonderful progress!`);
      }
    }

    function startRoutineFromAlarmModal() {
      const id = activeAlarmTaskId;
      dismissAlarmModalOnly();
      activeAlarmTaskId = null;
      if (id && typeof id === 'number') {
        openTaskRunner(id);
      }
    }

    function dismissAlarmModalOnly() {
      releaseScreenWakeLock();
      activeAlarmTaskId = null;
      const modal = document.getElementById('alarmModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
      }
    }

    function dismissAlarmDone() {
      if (activeAlarmTaskId && typeof activeAlarmTaskId === 'number') {
        toggleTask(activeAlarmTaskId);
      }
      activeAlarmTaskId = null;
      dismissAlarmModalOnly();
      hideActiveReminderBanner();
      playAudioChime('fanfare');
    }

    function postponeActiveAlarm(minutes) {
      if (activeAlarmTaskId && typeof activeAlarmTaskId === 'number') {
        postponeTask(activeAlarmTaskId, minutes);
      }
      activeAlarmTaskId = null;
      dismissAlarmModalOnly();
      hideActiveReminderBanner();
    }

    function markActiveAlarmNotDone() {
      if (activeAlarmTaskId && typeof activeAlarmTaskId === 'number') {
        markTaskNotDone(activeAlarmTaskId);
      }
      activeAlarmTaskId = null;
      dismissAlarmModalOnly();
      hideActiveReminderBanner();
    }

    /* ==================== SYSTEM WEB NOTIFICATIONS API ==================== */
    function requestNotificationPermission() {
      initAudio();
      if (!('Notification' in window)) {
        alert("This browser does not support desktop notifications. Audio chimes and in-app reminders will continue working!");
        return;
      }
      Notification.requestPermission().then(permission => {
        updateNotificationButtonUI(permission);
        if (permission === 'granted') {
          playAudioChime('chime');
          speakText("Reminders activated! You will receive notification alerts for all scheduled routines.");
          try {
            new Notification("Saksham Reminders Active 🔔", {
              body: "You will receive automatic alerts and alarms when activities are due.",
              icon: "icons/icon-192.png"
            });
          } catch (e) {
            console.log("Notification dispatch note:", e);
          }
          syncUpcomingAlarmsWithServiceWorker();
        }
      });
    }

    function sendSystemNotification(task) {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      try {
        const notifOptions = {
          body: `Scheduled for ${task.time}. Tap to open guided steps or mark completed.`,
          icon: 'icons/icon-192.png',
          badge: 'icons/icon-192.png',
          vibrate: [300, 150, 300, 150, 300],
          tag: `saksham-task-${task.id}`,
          renotify: true,
          requireInteraction: true,
          actions: [
            { action: 'start', title: '▶ Start Activity' },
            { action: 'done', title: '✓ Mark Done' }
          ]
        };

        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(`⏰ Activity Reminder: ${task.title}`, notifOptions);
          });
        } else {
          new Notification(`⏰ Activity Reminder: ${task.title}`, notifOptions);
        }
      } catch (err) {
        console.log('[Saksham Notification Error]:', err);
      }
    }

    function updateNotificationButtonUI(perm) {
      const btnDesk = document.getElementById('btn-enable-notifications');
      const btnMob = document.getElementById('mobDrawerNotifBtn');
      const isGranted = (perm || (typeof Notification !== 'undefined' ? Notification.permission : 'default')) === 'granted';

      if (btnDesk) {
        btnDesk.innerHTML = isGranted 
          ? `<i class="fa-solid fa-bell text-[#9FC57C]"></i> <span class="hidden lg:inline">Reminders: ON</span>` 
          : `<i class="fa-regular fa-bell text-amber-300 animate-bounce"></i> <span class="hidden lg:inline">Enable Reminders</span>`;
        btnDesk.className = isGranted
          ? "px-3 py-1.5 rounded-xl border border-[#9FC57C]/40 bg-[#14331C] text-[#F5F4E0] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          : "px-3 py-1.5 rounded-xl border border-amber-400/60 bg-amber-500/20 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm";
      }

      if (btnMob) {
        btnMob.innerText = isGranted ? 'ON' : 'OFF';
        btnMob.className = isGranted
          ? "px-3.5 py-2 rounded-xl bg-emerald-700 text-white font-black text-xs shadow-xs"
          : "px-3.5 py-2 rounded-xl bg-amber-500 text-slate-900 font-black text-xs shadow-xs animate-pulse";
      }
    }


