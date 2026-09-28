/* ======================================================================= */
/* SAKSHAM AI ASSISTANT DRAWER & VOICE NAVIGATION INTEGRATION              */
/* ======================================================================= */

    function toggleAiDrawer(open) {
      const drawer = document.getElementById('aiDrawer');
      const backdrop = document.getElementById('aiDrawerBackdrop');
      if (open) {
        backdrop.classList.remove('hidden');
        drawer.style.transform = 'translateX(0)';
      } else {
        drawer.style.transform = 'translateX(100%)';
        setTimeout(() => backdrop.classList.add('hidden'), 250);
      }
    }



    function sendQuickPrompt(txt) {
      document.getElementById('aiInputPrompt').value = txt;
      sendAiMessage();
    }

    function openAiWithVoice() {
      toggleAiDrawer(true);
      setTimeout(() => {
        toggleAiVoiceInput();
      }, 350);
    }



    function handleVoiceNavigationIntent(rawQuery, appendUserBubble = true) {
      if (!rawQuery) return false;
      const q = rawQuery.toLowerCase().trim();

      const result = detectMultilingualIntent(rawQuery, currentVoiceLang);
      if (!result) return false;

      // Helper to append user bubble when triggered from quick chip buttons
      if (appendUserBubble) {
        appendAiMessage('user', rawQuery);
      }

      // The user wants to READ and HEAR responses in their SELECTED READING LANGUAGE (currentLang)
      // Even if they spoke in Hindi, English, Kannada, etc.!
      const outputLang = currentLang || 'en';

      if (result.intent === 'sos') {
        const resp = MULTILINGUAL_RESPONSES.sos;
        const spokenNotice = resp.spoken[outputLang] || resp.spoken['en'] || resp.spoken['hi'];
        const chatNotice = `🚨 **Emergency Triggered:** ${spokenNotice}`;
        appendAiMessage('assistant', chatNotice, outputLang);
        speakText(spokenNotice, outputLang);
        toggleAiDrawer(false);
        openEmergencyModal();
        return true;
      }

      if (result.intent === 'calm') {
        const resp = MULTILINGUAL_RESPONSES.calm;
        const spokenNotice = resp.spoken[outputLang] || resp.spoken['en'] || resp.spoken['hi'];
        const chatNotice = `🌬️ **Sensory Calm Activated:** ${spokenNotice}`;
        appendAiMessage('assistant', chatNotice, outputLang);
        speakText(spokenNotice, outputLang);
        toggleAiDrawer(false);
        triggerOverwhelmReset();
        return true;
      }

      const resp = MULTILINGUAL_RESPONSES[result.intent];
      if (!resp) return false;

      let specificGameId = null;
      let specificGameName = resp.name;
      if (result.intent === 'games') {
        if (q.includes('maze')) { specificGameId = 5; specificGameName = "Motor Maze Trace"; }
        else if (q.includes('math')) { specificGameId = 8; specificGameName = "Speed Math Sprint"; }
        else if (q.includes('color') || q.includes('sequence')) { specificGameId = 1; specificGameName = "Color Sequence Recall"; }
        else if (q.includes('word') || q.includes('scramble')) { specificGameId = 2; specificGameName = "Word Unscramble"; }
        else if (q.includes('reflex') || q.includes('reaction') || (q.includes('tap') && !q.includes('speak'))) { specificGameId = 3; specificGameName = "Reaction Tap Reflex"; }
        else if (q.includes('card') || q.includes('pair')) { specificGameId = 6; specificGameName = "Card Pair Match"; }
      }

      const spokenNotice = resp.spoken[outputLang] || resp.spoken['en'] || resp.spoken['hi'];
      const btnLabel = resp.buttonText[outputLang] || resp.buttonText['en'] || 'Open Now';

      const chatNotice = `
        <div class="space-y-2">
          <div class="font-extrabold text-[#1B4225] flex items-center gap-1.5">
            <i class="fa-solid ${resp.icon} text-amber-500"></i> ${resp.name}
          </div>
          <p class="text-xs text-slate-700 leading-relaxed">${spokenNotice}</p>
          <div class="pt-1.5">
            <button onclick="directOpenPage('${resp.page}'${specificGameId ? `, ${specificGameId}` : ''})" class="w-full py-2.5 bg-gradient-to-r ${resp.theme} hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow flex items-center justify-center gap-2 active:scale-95 transition">
              <i class="fa-solid ${resp.icon}"></i> ${btnLabel}
            </button>
          </div>
        </div>
      `;

      appendAiMessage('assistant', chatNotice, outputLang);
      speakText(spokenNotice, outputLang);

      setTimeout(() => {
        directOpenPage(resp.page, specificGameId);
      }, 250);

      return true;
    }


