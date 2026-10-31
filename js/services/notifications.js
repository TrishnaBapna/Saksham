/* ======================================================================= */
/* SAKSHAM PROACTIVE REMINDERS & SYSTEM NOTIFICATIONS SERVICE              */
/* Multi-Companion Awareness, Quiet Hours, Idempotent Scoped Scheduling    */
/* ======================================================================= */

    /* ==================== PROACTIVE REMINDER & ALARM ENGINE ==================== */
    let reminderBannerDismissedId = null;
    let screenWakeLock = null;
    let lastEvaluatedReminderMinute = -1;

    function getActiveUid() {
      try {
        if (window.SakshamPersonalisation && typeof window.SakshamPersonalisation.getActiveUserId === 'function') {
          return window.SakshamPersonalisation.getActiveUserId();
        }
        const activeStr = localStorage.getItem('saksham_active_user');
        if (activeStr) {
          const u = JSON.parse(activeStr);
          return u.firebaseUid || u.id || u.uid || 'guest';
        }
      } catch(e) {}
      return 'guest';
    }

    function getAlertedRecords() {
      try {
        const uid = getActiveUid();
        const raw = localStorage.getItem('saksham_alerted_reminders_' + uid);
        return raw ? JSON.parse(raw) : {};
      } catch(e) {
        return {};
      }
    }

    function markTaskAlerted(taskId, minuteKey) {
      try {
        const uid = getActiveUid();
        const records = getAlertedRecords();
        records[taskId] = minuteKey;
        localStorage.setItem('saksham_alerted_reminders_' + uid, JSON.stringify(records));
      } catch(e) {}
    }

    function areRemindersGloballyEnabled() {
      try {
        const s = (window.SakshamPersonalisation && typeof window.SakshamPersonalisation.getStoredSettings === 'function')
          ? window.SakshamPersonalisation.getStoredSettings()
          : null;
        if (s && typeof s.remindersEnabled === 'boolean') {
          return s.remindersEnabled;
        }
      } catch(e) {}
      return true;
    }

    function isQuietHoursActive() {
      try {
        const s = (window.SakshamPersonalisation && typeof window.SakshamPersonalisation.getStoredSettings === 'function')
          ? window.SakshamPersonalisation.getStoredSettings()
          : null;
        if (!s || !s.quietHoursEnabled) return false;
        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const startParts = (s.quietHoursStart || '22:00').split(':');
        const endParts = (s.quietHoursEnd || '07:00').split(':');
        const startMins = (parseInt(startParts[0], 10) || 0) * 60 + (parseInt(startParts[1], 10) || 0);
        const endMins = (parseInt(endParts[0], 10) || 0) * 60 + (parseInt(endParts[1], 10) || 0);
        if (startMins <= endMins) {
          return nowMins >= startMins && nowMins < endMins;
        } else {
          return nowMins >= startMins || nowMins < endMins;
        }
      } catch(e) {
        return false;
      }
    }

    function getCompanionReminderMessage(task) {
      const char = (window.SakshamIllustrations && typeof window.SakshamIllustrations.getSavedCustomization === 'function')
        ? (window.SakshamIllustrations.getSavedCustomization().character || 'dadi')
        : 'dadi';
      const title = (task && task.title) ? task.title : 'scheduled activity';

      if (char === 'miko') {
        return {
          compName: 'Miko Robot',
          text: `Reminder alert! Your ${title} is ready.`,
          speech: `Reminder alert! Your ${title} is ready.`
        };
      } else if (char === 'priya') {
        return {
          compName: 'Priya',
          text: `Your ${title} is ready. Let's take it one step at a time.`,
          speech: `Your ${title} is ready. Let's take it one step at a time.`
        };
      } else if (char === 'aarav') {
        return {
          compName: 'Aarav',
          text: `It's time for ${title}. Tap to continue.`,
          speech: `It's time for ${title}. Tap to continue.`
        };
      } else {
        return {
          compName: 'Kalyani ji',
          text: `It's time for your ${title}. Shall we do it together?`,
          speech: `It is time for your ${title}. Shall we do it together?`
        };
      }
    }

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

    function checkScheduledReminders() {
      if (!areRemindersGloballyEnabled()) return;
      if (!window.state || !Array.isArray(window.state.tasks)) return;

      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const nowMins = h * 60 + m;
      const todayDateStr = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
      const alertedRecords = getAlertedRecords();

      // Check all active uncompleted tasks
      const due = state.tasks.find(t => {
        if (t.done || t.status === 'not_done' || t.status === 'all_done') return false;
        const taskMins = parseTimeToMinutes(t.time);
        if (taskMins < 0) return false;

        // Check exact minute OR overdue grace within 15 minutes window
        const isExactMinute = (taskMins === nowMins);
        const isOverdueGrace = (nowMins > taskMins && (nowMins - taskMins) <= 15);

        // Check if already alerted today
        const lastAlert = alertedRecords[t.id];
        const alreadyAlertedToday = (lastAlert && String(lastAlert).startsWith(todayDateStr));

        return (isExactMinute || isOverdueGrace) && !alreadyAlertedToday;
      });

      if (due) {
        markTaskAlerted(due.id, `${todayDateStr}_${h}:${m}`);
        triggerTaskAlarm(due);
      }

      // Avoid redundant DOM querying if minute hasn't elapsed
      if (lastEvaluatedReminderMinute === nowMins && !due) return;
      lastEvaluatedReminderMinute = nowMins;

      // Update sticky top banner
      updateReminderBanner(nowMins);

      // Keep live-time routine index synchronized with active clock
      if (typeof syncLiveTimeTaskIndex === 'function' && (!state.taskTimer || state.taskTimer.status !== 'running')) {
        syncLiveTimeTaskIndex(false);
      }

      // Keep service worker updated with upcoming schedule
      syncUpcomingAlarmsWithServiceWorker();
    }

    function testAlarmNow() {
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
        title: "Mindful Health Check",
        time: timeStr,
        tag: "Medication",
        done: false
      };

      triggerTaskAlarm(testTask);
    }

    function syncUpcomingAlarmsWithServiceWorker() {
      if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return;
      try {
        if (!window.state || !Array.isArray(window.state.tasks)) return;
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
      if (!task) return;
      activeAlarmTaskId = task.id;

      const userSettings = (window.SakshamPersonalisation && typeof window.SakshamPersonalisation.getStoredSettings === 'function')
        ? window.SakshamPersonalisation.getStoredSettings()
        : {};

      const inQuietHours = isQuietHoursActive();
      const msgObj = getCompanionReminderMessage(task);

      // In quiet hours: preserve peace, do not play audible sound or show loud modal
      if (inQuietHours) {
        console.log('[Saksham Reminder]: Quiet hours active. Muting audible alarm and modal.');
        showActiveReminderBanner(task);
        sendSystemNotification(task, true); // Silent notification
        if (window.SakshamCompanionFollower) {
          window.SakshamCompanionFollower.checkActiveReminders();
        }
        return;
      }

      // Audible / Voice Preparation
      try {
        initAudio();
        if ('speechSynthesis' in window && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (e) {
        console.log('[Saksham Reminder Audio Note]:', e);
      }

      // Wake lock during reminder
      requestScreenWakeLock();

      // Mobile haptic vibration feedback
      if (navigator.vibrate) {
        try { navigator.vibrate([300, 150, 300, 150, 300]); } catch(e) {}
      }

      // 1. Update and show the Real-Time Alarm Modal
      const modal = document.getElementById('alarmModal');
      const titleEl = document.getElementById('alarmModalTitle');
      const subEl = document.getElementById('alarmModalSubtitle');
      if (titleEl) titleEl.innerText = task.title;
      if (subEl) subEl.innerText = `${msgObj.compName}: "${msgObj.text}"`;
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
      }

      // 2. Play audible alarm sound (honoring user preferences)
      const soundPref = userSettings.reminderSound || (userSettings.soundEffects === false ? 'silent' : 'chime');
      if (soundPref !== 'silent') {
        if (soundPref === 'bell' || task.tag === 'Medication') {
          playInstrumentCue('bell');
        } else {
          playAudioChime('chime');
        }
      }

      // 3. Spoken voice announcement (only if voice guidance is enabled)
      const voiceAllowed = (userSettings.voiceGuidance !== false && userSettings.voiceReadouts !== false);
      if (voiceAllowed && typeof speakText === 'function') {
        speakText(msgObj.speech);
      }

      // 4. Trigger Web / System Notification
      sendSystemNotification(task, false);

      // 5. Update top sticky reminder banner
      showActiveReminderBanner(task);

      // 6. Set companion emotion to attentive (caring reminder, never angry)
      if (window.SakshamCompanionFollower) {
        window.SakshamCompanionFollower.setEmotion('attentive', 8000);
        window.SakshamCompanionFollower.checkActiveReminders();
      }
    }

    function updateReminderBanner(nowMins) {
      if (!window.state || !Array.isArray(window.state.tasks)) return;
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
      const currentDue = (window.state && Array.isArray(window.state.tasks))
        ? (state.tasks.find(t => !t.done && parseTimeToMinutes(t.time) <= nowMins) || state.tasks.find(t => !t.done) || state.tasks[0])
        : null;

      if (currentDue) {
        hideActiveReminderBanner();
        openTaskRunner(currentDue.id);
      }
    }

    function completeFromReminder() {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      if (!window.state || !Array.isArray(window.state.tasks)) return;
      const currentDue = state.tasks.find(t => {
        if (t.done || t.status === 'not_done' || t.status === 'all_done') return false;
        const taskMins = parseTimeToMinutes(t.time);
        return (nowMins >= taskMins && (nowMins - taskMins) <= 60);
      });

      if (currentDue) {
        toggleTask(currentDue.id);
        hideActiveReminderBanner();
        playAudioChime('fanfare');
        speakText(`Completed: ${currentDue.title}. Wonderful dedication!`);
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
      if (activeAlarmTaskId != null && typeof toggleTask === 'function') {
        toggleTask(activeAlarmTaskId);
      }
      activeAlarmTaskId = null;
      dismissAlarmModalOnly();
      hideActiveReminderBanner();
      if (typeof playAudioChime === 'function') playAudioChime('fanfare');
    }

    function postponeActiveAlarm(minutes) {
      let mins = Number(minutes);
      if (!mins || mins <= 0) {
        const s = (window.SakshamPersonalisation && typeof window.SakshamPersonalisation.getStoredSettings === 'function')
          ? window.SakshamPersonalisation.getStoredSettings()
          : {};
        mins = Number(s.snoozeDuration) || 5;
      }

      if (activeAlarmTaskId != null && typeof postponeTask === 'function') {
        postponeTask(activeAlarmTaskId, mins);
      }
      activeAlarmTaskId = null;
      dismissAlarmModalOnly();
      hideActiveReminderBanner();
      if (typeof snoozeCompanionReminder === 'function') {
        snoozeCompanionReminder(mins);
      }
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
          speakText("Reminders activated! You will receive gentle notifications for all scheduled routines.");
          try {
            const comp = getCompanionReminderMessage({ title: 'Daily Wellness' });
            new Notification(`Saksham Reminders Active 🔔`, {
              body: `${comp.compName}: You will receive automatic alerts when activities are due.`,
              icon: "icons/icon-192.png"
            });
          } catch (e) {
            console.log("Notification dispatch note:", e);
          }
          syncUpcomingAlarmsWithServiceWorker();
        } else if (permission === 'denied') {
          console.log('[Notification]: Permission was denied by user.');
        }
      });
    }

    function sendSystemNotification(task, silent = false) {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      try {
        const msgObj = getCompanionReminderMessage(task);
        const iconUrl = (window.SakshamPixelCharacter && typeof window.SakshamPixelCharacter.getNotificationIconDataUrl === 'function')
          ? window.SakshamPixelCharacter.getNotificationIconDataUrl('attentive')
          : 'icons/icon-192.png';

        const heroCardUrl = (window.SakshamPixelCharacter && typeof window.SakshamPixelCharacter.getNotificationHeroCardDataUrl === 'function')
          ? window.SakshamPixelCharacter.getNotificationHeroCardDataUrl(task, 'attentive')
          : iconUrl;

        const notifOptions = {
          body: msgObj.text,
          icon: iconUrl,
          image: heroCardUrl,
          badge: 'icons/icon-192.png',
          vibrate: silent ? [] : [300, 150, 300, 150, 300],
          silent: !!silent,
          tag: `saksham-task-${task.id}`,
          renotify: true,
          requireInteraction: !silent,
          actions: [
            { action: 'start', title: '▶ Start Activity' },
            { action: 'done', title: '✓ Mark Done' }
          ],
          data: { taskId: task.id, title: task.title, time: task.time }
        };

        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(`⏰ ${msgObj.compName}: Time for ${task.title}!`, notifOptions);
          });
        } else {
          new Notification(`⏰ ${msgObj.compName}: Time for ${task.title}!`, notifOptions);
        }

        if (window.SakshamCompanionFollower && typeof window.SakshamCompanionFollower.notifyOutsidePage === 'function') {
          window.SakshamCompanionFollower.notifyOutsidePage(task);
        }
      } catch (err) {
        console.log('[Saksham Notification Error]:', err);
      }
    }

    function updateNotificationButtonUI(perm) {
      const btnDesk = document.getElementById('btn-enable-notifications');
      const btnMob = document.getElementById('mobDrawerNotifBtn');
      const currentPerm = perm || (typeof Notification !== 'undefined' ? Notification.permission : 'default');

      if (btnDesk) {
        if (currentPerm === 'granted') {
          btnDesk.innerHTML = `<i class="fa-solid fa-bell text-[#9FC57C]"></i> <span class="hidden lg:inline">Reminders: ON</span>`;
          btnDesk.className = "px-3 py-1.5 rounded-xl border border-[#9FC57C]/40 bg-[#14331C] text-[#F5F4E0] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm";
          btnDesk.title = "System reminders are active";
        } else if (currentPerm === 'denied') {
          btnDesk.innerHTML = `<i class="fa-solid fa-bell-slash text-rose-300"></i> <span class="hidden lg:inline">Blocked</span>`;
          btnDesk.className = "px-3 py-1.5 rounded-xl border border-rose-400/40 bg-rose-950/40 text-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-help";
          btnDesk.title = "Notifications are blocked in your browser. Tap site settings to allow.";
        } else {
          btnDesk.innerHTML = `<i class="fa-regular fa-bell text-amber-300 animate-bounce"></i> <span class="hidden lg:inline">Enable Reminders</span>`;
          btnDesk.className = "px-3 py-1.5 rounded-xl border border-amber-400/60 bg-amber-500/20 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm";
          btnDesk.title = "Tap to enable reminder alerts";
        }
      }

      if (btnMob) {
        if (currentPerm === 'granted') {
          btnMob.innerText = 'ON';
          btnMob.className = "px-3.5 py-2 rounded-xl bg-emerald-700 text-white font-black text-xs shadow-xs";
        } else if (currentPerm === 'denied') {
          btnMob.innerText = 'BLOCKED';
          btnMob.className = "px-3.5 py-2 rounded-xl bg-rose-700 text-white font-black text-xs shadow-xs";
        } else {
          btnMob.innerText = 'OFF';
          btnMob.className = "px-3.5 py-2 rounded-xl bg-amber-500 text-slate-900 font-black text-xs shadow-xs animate-pulse";
        }
      }

      // Also update settings modal notification status pill if present
      const modalPermPill = document.getElementById('notifPermissionStatusPill');
      if (modalPermPill) {
        if (currentPerm === 'granted') {
          modalPermPill.innerHTML = '<span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">Active & Ready 🔔</span>';
        } else if (currentPerm === 'denied') {
          modalPermPill.innerHTML = '<span class="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">Blocked in Browser 🔒</span>';
        } else {
          modalPermPill.innerHTML = '<span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">Permission Needed ⚠️</span>';
        }
      }
    }

    // Explicit window exports for notification actions
    window.checkScheduledReminders = checkScheduledReminders;
    window.updateNotificationButtonUI = updateNotificationButtonUI;
    window.dismissReminderBanner = dismissReminderBanner;
    window.completeFromReminder = completeFromReminder;
    window.startRoutineFromReminder = startRoutineFromReminder;
    window.postponeActiveAlarm = postponeActiveAlarm;
    window.dismissAlarmDone = dismissAlarmDone;
    window.markActiveAlarmNotDone = markActiveAlarmNotDone;
    window.startRoutineFromAlarmModal = startRoutineFromAlarmModal;
    window.requestNotificationPermission = requestNotificationPermission;
    window.triggerTaskAlarm = triggerTaskAlarm;
    window.syncUpcomingAlarmsWithServiceWorker = syncUpcomingAlarmsWithServiceWorker;
    window.getCompanionReminderMessage = getCompanionReminderMessage;
    window.isQuietHoursActive = isQuietHoursActive;
    window.areRemindersGloballyEnabled = areRemindersGloballyEnabled;
