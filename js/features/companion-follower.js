/* ======================================================================= */
/* SAKSHAM 2.0 — PERSISTENT PIXEL COMPANION FOLLOWER & REMINDER ENGINE     */
/* Follows user across all tabs, reacts with multi-emotion animations,      */
/* prevents UI overlaps, and delivers proactive out-of-page notifications  */
/* ======================================================================= */

(function(window) {
  'use strict';

  let companionBubbleTimeout = null;
  let isToolbarExpanded = false;
  let isBubbleVisible = true;
  let isMascotMinimized = false;
  let activePendingTask = null;
  let pendingOutOfPageAlert = null;
  let lastAwayTimestamp = 0;

  const PAGE_GREETINGS = {
    'routine': {
      text: "Daily Routines: Let's take your day one peaceful step at a time. 🌸",
      pill: "🌸 Gentle Routine",
      emoji: "🌿",
      emotion: "talking"
    },
    'games': {
      text: "Mind Clinic Games: Ready for some fun brain exercises and puzzle matches? 🧠✨",
      pill: "🧠 Mind Clinic",
      emoji: "🎮",
      emotion: "happy"
    },
    'movement': {
      text: "Movement Therapy: Gentle stretching, breathing, and garden walking! 🚶‍♀️🌿",
      pill: "🚶‍♀️ Mobility Hub",
      emoji: "✨",
      emotion: "talking"
    },
    'vault': {
      text: "Family & Loved Ones Vault: Your circle of care, photos, and quick calls. 💖",
      pill: "💖 Family Vault",
      emoji: "📸",
      emotion: "happy"
    },
    'calendar-hub': {
      text: "Calendar & Schedule: Reviewing upcoming appointments and milestones. 📅",
      pill: "📅 Calendar",
      emoji: "⏰",
      emotion: "thinking"
    },
    'nutrition': {
      text: "Wellness Articles: Helpful cognitive tips and healthy lifestyle guides. 📖",
      pill: "📖 Wellness",
      emoji: "🍵",
      emotion: "talking"
    },
    'notes': {
      text: "Personal Voice Notes: Your thoughts, reminders, and voice memos are safe. 📝",
      pill: "📝 Voice Notes",
      emoji: "🎙️",
      emotion: "talking"
    },
    'caregiver': {
      text: "Caregiver Overview: Keeping loved ones and your care circle in sync. 🛡️",
      pill: "🛡️ Caregiver",
      emoji: "🤝",
      emotion: "talking"
    },
    'doctor': {
      text: "Clinician Directives: Neurologist notes and clinical monitoring. 🩺",
      pill: "🩺 Clinician",
      emoji: "📋",
      emotion: "thinking"
    }
  };

  const SakshamCompanionFollower = {

    init: function() {
      this.refreshAvatar();
      this.checkActiveReminders();
      this.bindNavigationWatcher();
      this.bindInteractiveClickListener();
      this.bindCelebrationHooks();
      this.bindOutOfPageWatcher();
      this.bindServiceWorkerMessages();
    },

    /**
     * Refreshes the companion pixel canvas and SVG backup
     */
    refreshAvatar: function(customOpts = {}) {
      if (window.SakshamPixelCharacter) {
        window.SakshamPixelCharacter.syncCustomizationFromStorage();
        if (customOpts.character || customOpts.outfitColor || customOpts.sareeColor || customOpts.accessory) {
          window.SakshamPixelCharacter.setCustomization(customOpts);
        }
        const canvas = document.getElementById('companionPixelCanvas');
        if (canvas) {
          window.SakshamPixelCharacter.renderToCanvas(canvas);
        }
      }

      // Also refresh SVG backup if present
      const box = document.getElementById('floatingCompanionSvgBox');
      if (box && window.SakshamIllustrations) {
        const saved = window.SakshamIllustrations.getSavedCustomization();
        const opts = Object.assign({}, saved, customOpts, { size: 56, expression: customOpts.expression || 'waving' });
        box.innerHTML = window.SakshamIllustrations.getCompanionSvg(opts);
      }

      // Update bubble pill with companion identity
      const pill = document.getElementById('companionBubblePill');
      if (pill) {
        const char = customOpts.character || (window.SakshamIllustrations ? window.SakshamIllustrations.getSavedCustomization().character : 'dadi');
        if (char === 'miko') {
          pill.innerText = '🤖 Miko Robot';
        } else if (char === 'priya') {
          pill.innerText = '🌿 Priya Guide';
        } else if (char === 'aarav') {
          pill.innerText = '⚡ Aarav Guide';
        } else {
          pill.innerText = "🌸 Kalyani ji's Guide";
        }
      }
    },

    getCompanionName: function() {
      let char = 'dadi';
      try {
        if (window.SakshamIllustrations) {
          char = window.SakshamIllustrations.getSavedCustomization().character;
        }
      } catch(e) {}
      if (char === 'miko') return 'Miko Robot';
      if (char === 'priya') return 'Priya';
      if (char === 'aarav') return 'Aarav';
      return 'Kalyani ji';
    },

    /**
     * Sets pixel character emotion with auto-revert
     */
    setEmotion: function(emotion, durationMs = 0) {
      if (window.SakshamPixelCharacter) {
        window.SakshamPixelCharacter.setEmotion(emotion, durationMs);
      }
      const avatarBtn = document.getElementById('btnFloatingCompanionAvatar');
      if (avatarBtn) {
        avatarBtn.classList.remove('animate-companion-celebrate', 'animate-companion-wiggle');
        if (emotion === 'happy') {
          avatarBtn.classList.add('animate-companion-celebrate');
        } else if (emotion === 'angry') {
          avatarBtn.classList.add('animate-companion-wiggle');
        }
      }
    },

    /**
     * Check if tasks are due or upcoming and populate mini reminder pill
     */
    checkActiveReminders: function() {
      const pill = document.getElementById('companionReminderMiniPill');
      const titleEl = document.getElementById('companionReminderTaskTitle');
      const dot = document.getElementById('companionStatusDot');

      if (!window.state || !window.state.tasks || window.state.tasks.length === 0) {
        if (pill) pill.classList.add('hidden');
        return;
      }

      const pending = window.state.tasks.find(t => !t.done);
      activePendingTask = pending;

      if (pending) {
        if (pill) pill.classList.remove('hidden');
        if (titleEl) titleEl.innerText = `⏰ ${pending.title} (${pending.time || 'Due'})`;
        if (dot) {
          dot.className = 'absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-[8px] text-white font-black shadow-xs animate-pulse';
          dot.innerText = '!';
        }
      } else {
        if (pill) pill.classList.add('hidden');
        if (dot) {
          dot.className = 'absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[8px] text-white font-black shadow-xs';
          dot.innerText = '✓';
        }
      }
    },

    /**
     * Called whenever user switches tabs / pages
     */
    onPageChange: function(tabKey) {
      const cfg = PAGE_GREETINGS[tabKey] || {
        text: `Here to assist you with ${tabKey}! Take your time and enjoy. 🌿`,
        pill: "🌸 Caring Companion",
        emoji: "✨",
        emotion: "talking"
      };

      const textEl = document.getElementById('companionSpeechText');
      const emojiEl = document.getElementById('companionReactionEmoji');

      if (textEl) textEl.innerText = cfg.text;
      if (emojiEl) emojiEl.innerText = cfg.emoji;

      this.setEmotion(cfg.emotion || 'talking', 3500);
      this.showBubbleTemporary(5000);
      this.checkActiveReminders();
    },

    /**
     * Shows speech bubble with message, then auto-fades after duration
     */
    say: function(msg, emoji = '✨', durationMs = 4500, emotion = 'talking') {
      const textEl = document.getElementById('companionSpeechText');
      const emojiEl = document.getElementById('companionReactionEmoji');
      if (textEl) textEl.innerText = msg;
      if (emojiEl) emojiEl.innerText = emoji;

      if (emotion) {
        this.setEmotion(emotion, durationMs);
      }

      this.showBubbleTemporary(durationMs);
    },

    showBubbleTemporary: function(ms = 4500) {
      const bubble = document.getElementById('companionSpeechBubble');
      if (!bubble) return;

      bubble.classList.remove('hidden');
      bubble.style.opacity = '1';
      bubble.style.transform = 'scale(1) translateY(0)';
      isBubbleVisible = true;

      if (companionBubbleTimeout) clearTimeout(companionBubbleTimeout);
      if (ms > 0) {
        companionBubbleTimeout = setTimeout(() => {
          // Keep visible if there is an active reminder banner or pending out-of-page alert
          if (!pendingOutOfPageAlert && !document.getElementById('companionMascotReminderBanner')?.classList.contains('hidden') === false) {
            bubble.style.opacity = '0';
            bubble.style.transform = 'scale(0.9) translateY(8px)';
            setTimeout(() => { bubble.classList.add('hidden'); isBubbleVisible = false; }, 350);
          }
        }, ms);
      }
    },

    toggleSpeechBubble: function(forceState) {
      const bubble = document.getElementById('companionSpeechBubble');
      if (!bubble) return;
      isBubbleVisible = typeof forceState === 'boolean' ? forceState : !isBubbleVisible;
      if (isBubbleVisible) {
        bubble.classList.remove('hidden');
        bubble.style.opacity = '1';
        bubble.style.transform = 'scale(1) translateY(0)';
      } else {
        bubble.style.opacity = '0';
        bubble.style.transform = 'scale(0.9) translateY(8px)';
        setTimeout(() => bubble.classList.add('hidden'), 350);
      }
    },

    toggleMinimizeMascot: function() {
      const aside = document.getElementById('sakshamFloatingCompanion');
      const bubble = document.getElementById('companionSpeechBubble');
      const toolbar = document.getElementById('companionQuickToolbar');
      isMascotMinimized = !isMascotMinimized;

      if (isMascotMinimized) {
        if (bubble) bubble.classList.add('hidden');
        if (toolbar) toolbar.classList.add('hidden');
        isBubbleVisible = false;
        isToolbarExpanded = false;
      } else {
        this.toggleSpeechBubble(true);
      }
    },

    handleAvatarClick: function() {
      const toolbar = document.getElementById('companionQuickToolbar');
      if (toolbar) {
        isToolbarExpanded = !isToolbarExpanded;
        if (isToolbarExpanded) {
          toolbar.classList.remove('hidden');
          this.say("How can I help you right now? Tap an emotion or dress my look! 👗", "👋", 4000, 'talking');
        } else {
          toolbar.classList.add('hidden');
        }
      } else {
        this.toggleSpeechBubble();
      }
      this.animateWiggle();
    },

    /**
     * Celebration Reaction when user completes a task or does something good!
     */
    triggerCelebration: function(type = 'task_done', details = {}) {
      // Set pixel character to ecstatic happy jumping emotion
      this.setEmotion('happy', 6000);

      let msg = "Wonderful job, Kalyani ji! 🌟 Task completed peacefully!";
      let emoji = "🎉";

      if (type === 'task_done') {
        const title = details.title || 'your scheduled activity';
        msg = `Fantastic job completing "${title}"! 🌟 Proud of your dedication!`;
        emoji = "🎉";
      } else if (type === 'game_win') {
        const game = details.gameName || 'Exercise';
        msg = `Brilliant score in ${game}! 🧠 Cognitive focus is flourishing today!`;
        emoji = "🏆";
      } else if (type === 'walk_done') {
        msg = `Wonderful mobility session! Feeling refreshed and energized. 🚶‍♀️🌿`;
        emoji = "⭐";
      } else if (type === 'snooze') {
        msg = `Taking a peaceful 3-minute breather. I'll check back with you shortly! ⏰`;
        emoji = "⏰";
      }

      this.say(msg, emoji, 6000, 'happy');

      // Trigger Confetti & Chime
      if (typeof window.confetti === 'function') {
        window.confetti({ particleCount: 50, spread: 60, origin: { x: 0.85, y: 0.85 } });
      }
      if (typeof window.playAudioChime === 'function') {
        window.playAudioChime('fanfare');
      }

      this.checkActiveReminders();
    },

    triggerCelebrationDemo: function() {
      this.triggerCelebration('task_done', { title: 'Mindful Morning Step' });
    },

    animateWiggle: function() {
      const avatarBtn = document.getElementById('btnFloatingCompanionAvatar');
      if (avatarBtn) {
        avatarBtn.classList.add('animate-companion-wiggle');
        setTimeout(() => avatarBtn.classList.remove('animate-companion-wiggle'), 600);
      }
    },

    handleSnooze3Min: function() {
      if (typeof window.snoozeCompanionReminder === 'function') {
        window.snoozeCompanionReminder(3);
      }
      this.setEmotion('idle', 3000);
      this.triggerCelebration('snooze');
      pendingOutOfPageAlert = null;
    },

    handleGoToTask: function() {
      if (typeof window.switchTab === 'function') {
        window.switchTab('routine');
      }
      if (typeof window.switchRoutineMiniTab === 'function') {
        window.switchRoutineMiniTab('cues');
      }
      this.say("Let's do this step together! I'm right here. 🌟", "🌸", 4000, 'happy');
      pendingOutOfPageAlert = null;
    },

    readCurrentPageGuidance: function() {
      const textEl = document.getElementById('companionSpeechText');
      const text = textEl ? textEl.innerText : "I am your caring Saksham companion.";
      if (typeof window.speakText === 'function') {
        window.speakText(text);
      }
    },

    /* ======================================================================= */
    /* OUT-OF-PAGE NOTIFICATIONS & ARRIVAL REMINDER SEQUENCE                  */
    /* ======================================================================= */
    
    /**
     * Dispatches notification outside the page with the character's pixel avatar
     */
    notifyOutsidePage: function(task) {
      if (!task) return;
      pendingOutOfPageAlert = task;

      // Only dispatch desktop/push notification if supported and permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const compName = this.getCompanionName();
          const iconUrl = window.SakshamPixelCharacter 
            ? window.SakshamPixelCharacter.getNotificationIconDataUrl('angry') 
            : 'icons/icon-192.png';

          const notifOptions = {
            body: `"${task.title}" is scheduled now (${task.time}). Tap here and let's do it together!`,
            icon: iconUrl,
            badge: 'icons/icon-192.png',
            tag: `saksham-task-${task.id}`,
            renotify: true,
            requireInteraction: true,
            vibrate: [400, 200, 400, 200, 400],
            data: { taskId: task.id, title: task.title, time: task.time }
          };

          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(reg => {
              reg.showNotification(`⏰ ${compName}: Time for ${task.title}!`, notifOptions);
            });
          } else {
            new Notification(`⏰ ${compName}: Time for ${task.title}!`, notifOptions);
          }
        } catch(e) {
          console.log('[Companion Notification Note]:', e);
        }
      }
    },

    /**
     * Watches for when user minimizes tab or leaves page, and handles arrival back
     */
    bindOutOfPageWatcher: function() {
      const self = this;
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
          lastAwayTimestamp = Date.now();
          // If a task is currently due while leaving, ensure notification is dispatched
          if (activePendingTask && !activePendingTask.done) {
            self.notifyOutsidePage(activePendingTask);
          }
        } else if (document.visibilityState === 'visible') {
          // User returned back to the page!
          const elapsedSecs = Math.round((Date.now() - lastAwayTimestamp) / 1000);
          if (pendingOutOfPageAlert || (activePendingTask && elapsedSecs >= 30)) {
            self.deliverArrivalReminder(pendingOutOfPageAlert || activePendingTask);
          }
        }
      });

      // Also listen on window focus
      window.addEventListener('focus', function() {
        if (pendingOutOfPageAlert) {
          self.deliverArrivalReminder(pendingOutOfPageAlert);
        }
      });
    },

    /**
     * Character steps up upon return to remind the user (Angry/Stern -> Happy)
     */
    deliverArrivalReminder: function(task) {
      if (!task) return;
      const compName = this.getCompanionName();

      // 1. First: Caring Stern/Angry Stance (Hands on hips, tapping foot, steam particle)
      this.setEmotion('angry', 3500);

      // 2. Play audible reminder chime
      if (typeof window.playAudioChime === 'function') {
        window.playAudioChime('chime');
      }

      // 3. Speech bubble pops open
      const msg = `There you are! I sent a notification to your screen: "${task.title}" is waiting! Let's complete it together now! 🌟`;
      this.say(msg, "⏰", 8000);

      // 4. Voice announcement
      if (typeof window.speakText === 'function') {
        window.speakText(`Activity reminder: It is time for ${task.title}. Let's get started together!`);
      }

      // 5. Transition to happy cheering emotion after 3.5 seconds
      setTimeout(() => {
        this.setEmotion('happy', 4000);
      }, 3500);

      // Keep mascot banner synchronized
      if (typeof window.triggerCompanionMascotReminder === 'function') {
        window.triggerCompanionMascotReminder(task);
      }
    },

    /**
     * Listens for messages from Service Worker when notification is clicked
     */
    bindServiceWorkerMessages: function() {
      const self = this;
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', function(event) {
          if (!event.data) return;
          if (event.data.type === 'NOTIFICATION_ACTION' || event.data.type === 'NOTIFICATION_CLICK_COMPANION') {
            const task = event.data.task || activePendingTask;
            if (task) {
              self.deliverArrivalReminder(task);
            }
          }
        });
      }
    },

    /**
     * Test out-of-page alert demo
     */
    testOutOfPageNotificationDemo: function() {
      const mockTask = activePendingTask || {
        id: 't_demo_reminder',
        title: 'Morning Blood Pressure & Heart Medication',
        time: '09:00 AM'
      };

      if (!('Notification' in window) || Notification.permission !== 'granted') {
        if (typeof window.requestNotificationPermission === 'function') {
          window.requestNotificationPermission();
        }
      }

      this.notifyOutsidePage(mockTask);
      this.say("I sent a notification outside the page! When you switch tabs or look at your screen, you'll see my reminder! 🔔", "🔔", 5000, 'talking');
    },

    /**
     * Automatically hooks into switchTab to follow user on page transitions
     */
    bindNavigationWatcher: function() {
      const self = this;
      const originalSwitchTab = window.switchTab;
      if (typeof originalSwitchTab === 'function') {
        window.switchTab = function(tabKey) {
          const res = originalSwitchTab.apply(this, arguments);
          try {
            self.onPageChange(tabKey);
          } catch(e) {}
          return res;
        };
      }
    },

    /**
     * Listens for user clicks on tasks, games, hints, and loved one cards
     */
    bindInteractiveClickListener: function() {
      const self = this;
      document.addEventListener('click', function(e) {
        const target = e.target;
        if (!target) return;

        // 1. Clicked on a Task item or card
        const taskCard = target.closest('.task-item, .task-card, [id^="task-item-"]');
        if (taskCard && !target.closest('button, input[type="checkbox"]')) {
          const title = taskCard.querySelector('h4, .font-bold')?.innerText || 'this activity';
          self.say(`Focused on: "${title}". Take it at your comfortable pace! 🌸`, "✨", 3500, 'talking');
          self.animateWiggle();
          return;
        }

        // 2. Clicked on Cue Hint / Stuck button
        if (target.closest('[onclick*="revealCueHint"], [onclick*="openTaskHelpModal"]')) {
          self.say("Here is a gentle memory clue to help you! No pressure at all. 💡", "💡", 3500, 'thinking');
          self.animateWiggle();
          return;
        }

        // 3. Clicked on loved one card
        const contactCard = target.closest('.loved-one-card, .face-quiz-card');
        if (contactCard) {
          const name = contactCard.querySelector('h4, .font-black')?.innerText || 'your loved one';
          self.say(`Family circle: ${name}. Tap to connect or share memories! 💖`, "💖", 3500, 'happy');
          self.animateWiggle();
          return;
        }

        // 4. Clicked on Audio / Read aloud
        if (target.closest('[onclick*="readActiveTaskAloud"], [onclick*="speakRunnerSteps"], [onclick*="speakText"]')) {
          self.say("Reading aloud for you with clear, gentle voice! 🔊", "🔊", 3000, 'talking');
          return;
        }
      }, true);
    },

    /**
     * Automatically hooks into toggleTask, finishTaskRunner, awardGameScore to celebrate
     */
    bindCelebrationHooks: function() {
      const self = this;

      // 1. Hook toggleTask
      const originalToggleTask = window.toggleTask;
      if (typeof originalToggleTask === 'function') {
        window.toggleTask = function(id) {
          const task = (window.state && window.state.tasks) ? window.state.tasks.find(t => t.id === id) : null;
          const wasDone = task ? task.done : false;
          const res = originalToggleTask.apply(this, arguments);
          if (task && !wasDone && task.done) {
            try {
              self.triggerCelebration('task_done', { title: task.title });
            } catch(e) {}
          }
          return res;
        };
      }

      // 2. Hook finishTaskRunner
      const originalFinishRunner = window.finishTaskRunner;
      if (typeof originalFinishRunner === 'function') {
        window.finishTaskRunner = function() {
          const taskId = window.state ? window.state.activeRunnerTaskId : null;
          const task = (window.state && window.state.tasks) ? window.state.tasks.find(t => t.id === taskId) : null;
          const res = originalFinishRunner.apply(this, arguments);
          try {
            self.triggerCelebration('task_done', { title: task ? task.title : 'Guided Routine Steps' });
          } catch(e) {}
          return res;
        };
      }

      // 3. Hook awardGameScore
      const originalAwardScore = window.awardGameScore;
      if (typeof originalAwardScore === 'function') {
        window.awardGameScore = function(points, gameName) {
          const res = originalAwardScore.apply(this, arguments);
          try {
            self.triggerCelebration('game_win', { points, gameName });
          } catch(e) {}
          return res;
        };
      }
    }

  };

  window.SakshamCompanionFollower = SakshamCompanionFollower;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SakshamCompanionFollower.init());
  } else {
    setTimeout(() => SakshamCompanionFollower.init(), 300);
  }

})(window);
