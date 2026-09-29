/* ======================================================================= */
/* SAKSHAM SPEECH SERVICE (TTS & STT SPEECH RECOGNITION)                   */
/* ======================================================================= */

    function updateBigVoiceButtonPrompt(lang = 'en') {
      const bigVoiceText = document.getElementById('aiBigVoiceText');
      if (!bigVoiceText) return;
      const prompts = {
        en: '🎙️ Tap to Speak (Any Language • Speak Hindi, English, etc.)',
        hi: '🎙️ बोलिए (कोई भी भाषा • हिन्दी, English आदि बोलें)',
        mr: '🎙️ बोला (कोणतीही भाषा • मराठी, English बोला)',
        gu: '🎙️ બોલો (કોઈપણ ભાષા • ગુજરાતી, English બોલો)',
        kn: '🎙️ ಮಾತನಾಡಿ (ಯಾವುದೇ ಭಾಷೆ • ಕನ್ನಡ, English ಮಾತನಾಡಿ)',
        ta: '🎙️ பேசுங்கள் (எந்த மொழியிலும் பேசலாம் • தமிழ், English)',
        te: '🎙️ మాట్లాడండి (ఏ భాషలోనైనా మాట్లాడండి • తెలుగు, English)',
        ml: '🎙️ സംസാരിക്കൂ (ഏത് ഭാഷയിലും സംസാരിക്കാം • മലയാളം, English)',
        bn: '🎙️ কথা বলুন (যেকোনো ভাষায় কথা বলুন • বাংলা, English)'
      };
      bigVoiceText.innerText = prompts[lang] || prompts['en'];
    }

    function updateAiQuickChips(lang = 'en') {
      const chipData = {
        en: { vault: '📸 Loved Ones (Vault)', games: '🎮 Mind Clinic Games', routine: '💊 Routine & Meds', movement: '🚶 Movement & Speech', nutrition: '🥗 Nutrition & Diet', calendar: '📅 Calendar & Progress' },
        hi: { vault: '📸 परिवार (Vault)', games: '🎮 खेल (Games)', routine: '💊 दवा व दिनचर्या', movement: '🚶 चलना व आवाज', nutrition: '🥗 आहार व भोजन', calendar: '📅 कैलेंडर' },
        mr: { vault: '📸 कुटुंब (Vault)', games: '🎮 खेळ (Games)', routine: '💊 औषध व वेळापत्रक', movement: '🚶 चालणे व आवाज', nutrition: '🥗 आहार व पोषण', calendar: '📅 कॅलेंडर' },
        gu: { vault: '📸 પરિવાર (Vault)', games: '🎮 રમતો (Games)', routine: '💊 દવા અને દિનચર્યા', movement: '🚶 ચાલવું અને અવાજ', nutrition: '🥗 ખોરાક અને આહાર', calendar: '📅 કૅલેન્ડર' },
        kn: { vault: '📸 ಕುಟುಂಬ (Vault)', games: '🎮 ಆಟಗಳು (Games)', routine: '💊 ಔಷಧಿ ಮತ್ತು ದಿನಚರಿ', movement: '🚶 ನಡಿಗೆ ಮತ್ತು ಧ್ವನಿ', nutrition: '🥗 ಆಹಾರ ಮತ್ತು ಪೋಷಣೆ', calendar: '📅 ಕ್ಯಾಲೆಂಡರ್' },
        ta: { vault: '📸 குடும்பம் (Vault)', games: '🎮 விளையாட்டுகள் (Games)', routine: '💊 மருந்து & வழக்கங்கள்', movement: '🚶 நடை & பேச்சு', nutrition: '🥗 உணவு & ஊட்டச்சத்து', calendar: '📅 நாட்காட்டி' },
        te: { vault: '📸 కుటుంబం (Vault)', games: '🎮 ఆటలు (Games)', routine: '💊 మందులు & దినచర్య', movement: '🚶 నడక & స్వరం', nutrition: '🥗 ఆహారం & పోషణ', calendar: '📅 క్యాలెండర్' },
        ml: { vault: '📸 കുടുംബം (Vault)', games: '🎮 കളികൾ (Games)', routine: '💊 മരുന്നും ദിനചര്യയും', movement: '🚶 നടത്തവും ശബ്ദവും', nutrition: '🥗 ഭക്ഷണക്രമം', calendar: '📅 കലണ്ടർ' },
        bn: { vault: '📸 পরিবার (Vault)', games: '🎮 মন ক্লিনিক গেমস', routine: '💊 ওষুধ ও রুটিন', movement: '🚶 হাঁটা ও স্বর', nutrition: '🥗 পুষ্টি ও খাদ্য', calendar: '📅 ক্যালেন্ডার' }
      };
      const c = chipData[lang] || chipData['en'];
      if (document.getElementById('chip-vault')) document.getElementById('chip-vault').innerText = c.vault;
      if (document.getElementById('chip-games')) document.getElementById('chip-games').innerText = c.games;
      if (document.getElementById('chip-routine')) document.getElementById('chip-routine').innerText = c.routine;
      if (document.getElementById('chip-movement')) document.getElementById('chip-movement').innerText = c.movement;
      if (document.getElementById('chip-nutrition')) document.getElementById('chip-nutrition').innerText = c.nutrition;
      if (document.getElementById('chip-calendar')) document.getElementById('chip-calendar').innerText = c.calendar;
    }

    function setVoiceLang(lang) {
      currentVoiceLang = lang;
      try {
        localStorage.setItem('saksham_voice_lang', lang);
      } catch (e) {}
      updateBigVoiceButtonPrompt(lang);
      updateAiQuickChips(lang);
    }



    // cachedVoices is declared in store.js as window.cachedVoices — do not re-declare here
    function loadVoices() {
      if ('speechSynthesis' in window) {
        window.cachedVoices = window.speechSynthesis.getVoices();
      }
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    }

    function speakText(txt, targetLangCode = null) {
      if (!('speechSynthesis' in window)) return;

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
      } catch (e) {}

      setTimeout(() => {
        try {
          const rate = parseFloat(document.getElementById('ttsRateSelect')?.value || '0.95');
          const u = new SpeechSynthesisUtterance(txt);
          u.rate = rate;
          u.pitch = 1.0;
          u.volume = 1.0;

          const langCodes = { 
            en: 'en-IN', 
            hi: 'hi-IN', 
            mr: 'mr-IN', 
            gu: 'gu-IN', 
            kn: 'kn-IN', 
            ml: 'ml-IN', 
            raj: 'hi-IN', 
            marwari: 'hi-IN',
            ta: 'ta-IN', 
            te: 'te-IN', 
            bn: 'bn-IN' 
          };
          
          let desiredLang = 'en-IN';
          if (targetLangCode) {
            desiredLang = langCodes[targetLangCode] || targetLangCode;
          } else {
            desiredLang = langCodes[currentLang] || langCodes[currentVoiceLang] || 'en-IN';
          }
          u.lang = desiredLang;

          // Select the most natural voice available for this target language
          const voices = window.cachedVoices || [];
          if (voices.length > 0) {
            const prefix = desiredLang.slice(0, 2).toLowerCase();
            // 1. Try exact language match with natural/neural quality
            let bestVoice = voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(desiredLang.toLowerCase()) && 
              (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural') || v.name.includes('Lekha') || v.name.includes('Neel') || v.name.includes('Premium')));
            
            // 2. Try any voice matching the language prefix
            if (!bestVoice) {
              bestVoice = voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(prefix));
            }
            // 3. Fallback to Hindi or Indian English voice for Indian accents if specific language voice not installed
            if (!bestVoice && desiredLang !== 'en-US' && desiredLang !== 'en-IN') {
              bestVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
            }
            if (bestVoice) u.voice = bestVoice;
          }

          const banner = document.getElementById('ttsSpeakingBanner');
          const txtEl = document.getElementById('ttsSpeakingText');
          if (banner && txtEl) {
            txtEl.innerText = txt.length > 80 ? txt.substring(0, 80) + '...' : txt;
            banner.classList.remove('hidden');
          }

        u.onend = () => { if (banner) banner.classList.add('hidden'); };
        u.onerror = () => { if (banner) banner.classList.add('hidden'); };

        window.speechSynthesis.speak(u);
      } catch (err) {
        console.log('[TTS Note]:', err);
      }
    }, 50);
  }

    function stopSpeaking() {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      const banner = document.getElementById('ttsSpeakingBanner');
      if (banner) banner.classList.add('hidden');
    }

    function speakPageSummary() {
      if (state.role === 'patient') {
        const nextPending = state.tasks.find(t => !t.done && t.status !== 'not_done');
        const taskMsg = nextPending ? `Your upcoming task is: ${nextPending.title} at ${nextPending.time}.` : "All routine tasks for today are completed!";
        speakText(`Saksham Patient Portal for Kalyani. ${taskMsg}`);
      } else if (state.role === 'caregiver') {
        speakText(`Caregiver Oversight Hub for Aarav Sharma. Kalyani's adherence is 94.8 percent. Tasks taking longer include Buttoning Shirt.`);
      } else {
        speakText(`Doctor Portal for Dr. Rajesh Verma. Medication adherence 94.8 percent. Tremor index 1.2 centimeters.`);
      }
    }

    function speakCurrentCue() {
      const task = state.tasks[currentCueIndex];
      speakText(`${task.time}. Activity: ${task.title}. Question: ${task.cueQuestion}`);
    }

    function speakNutritionOverview() {
      speakText("Important Parkinson's nutrition tip: space high protein meals 45 to 60 minutes away from your Levodopa dose to allow maximum brain absorption.");
    }




    function setVoiceRate(rate) {
      state.ttsRate = rate;
      const s = document.getElementById('ttsRateSelect');
      if (s) s.value = String(rate);
      playAudioChime('chime');
    }


    let recognition = null;
    let isRecognizing = false;
    let recognitionStopRequested = false;
    function toggleAiVoiceInput() {
      const micBtn = document.getElementById('btnAiMic');
      const bigVoiceBtn = document.getElementById('btnAiBigVoice');
      const bigVoiceIcon = document.getElementById('aiBigVoiceIcon');
      const bigVoiceText = document.getElementById('aiBigVoiceText');
      const bigVoicePulseRing = document.getElementById('aiBigVoicePulseRing');
      const voiceStatusPill = document.getElementById('aiVoiceStatusPill');

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser. You can click any of the voice action buttons (e.g. '🎮 I want game') to navigate directly!");
        return;
      }

      function setListeningUI(listening) {
        isRecognizing = listening;
        const listenPrompts = {
          hi: '🔴 सुन रहे हैं... बोलिए (उदा. "परिवार" या "खेल")',
          mr: '🔴 ऐकत आहे... बोला (उदा. "कुटुंब" किंवा "खेळ")',
          gu: '🔴 સાંભળી રહ્યા છીએ... બોલો (દા.ત. "પરિવાર" અથવા "રમત")',
          kn: '🔴 ಆಲಿಸಲಾಗುತ್ತಿದೆ... ಮಾತನಾಡಿ (ಉದಾ. "ಕುಟುಂಬ" ಅಥವಾ "ಆಟ")',
          ta: '🔴 கேட்கிறது... பேசுங்கள் (எ.கா. "குடும்பம்" அல்லது "விளையாட்டு")',
          te: '🔴 వింటున్నాము... మాట్లాడండి (ఉదా. "కుటుంబం" లేదా "ఆట")',
          ml: '🔴 കേൾക്കുന്നു... സംസാരിക്കൂ (ഉദാ. "കുടുംബം" അല്ലെങ്കിൽ "കളി")',
          bn: '🔴 শুনছি... কথা বলুন (उदा. "পরিবার" বা "খেলা")',
          raj: '🔴 सुण रया हां... बोलो (उदा. "परिवार" या "खेल")',
          en: '🔴 Listening... Speak now (e.g. "Family" or "Game")'
        };

        if (listening) {
          if (micBtn) micBtn.classList.add('bg-rose-500', 'text-white', 'animate-pulse');
          if (bigVoiceBtn) {
            bigVoiceBtn.classList.remove('from-[#387D82]', 'to-[#1B4225]');
            bigVoiceBtn.classList.add('from-rose-600', 'to-red-600', 'animate-pulse');
          }
          if (bigVoiceIcon) bigVoiceIcon.className = "fa-solid fa-microphone-lines text-base text-white animate-bounce";
          if (bigVoiceText) bigVoiceText.innerText = listenPrompts[currentLang] || listenPrompts['en'];
          if (bigVoicePulseRing) bigVoicePulseRing.className = "w-8 h-8 rounded-xl bg-white/30 flex items-center justify-center text-white shrink-0 animate-ping";
          if (voiceStatusPill) {
            voiceStatusPill.classList.remove('hidden');
            voiceStatusPill.innerText = "● Listening to your voice...";
          }
        } else {
          if (micBtn) micBtn.classList.remove('bg-rose-500', 'text-white', 'animate-pulse');
          if (bigVoiceBtn) {
            bigVoiceBtn.classList.add('from-[#387D82]', 'to-[#1B4225]');
            bigVoiceBtn.classList.remove('from-rose-600', 'to-red-600', 'animate-pulse');
          }
          if (bigVoiceIcon) bigVoiceIcon.className = "fa-solid fa-microphone text-base text-amber-300";
          if (typeof updateBigVoiceButtonPrompt === 'function') {
            updateBigVoiceButtonPrompt(currentLang);
          } else if (bigVoiceText) {
            bigVoiceText.innerText = '🎙️ Tap to Speak (Any Language)';
          }
          if (bigVoicePulseRing) bigVoicePulseRing.className = "w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0";
          if (voiceStatusPill) voiceStatusPill.classList.add('hidden');
        }
      }

      // Stop speech synthesis if speaking so mic doesn't capture synthesizer audio
      if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }

      if (isRecognizing) {
        recognitionStopRequested = true;
        if (recognition) {
          try { recognition.stop(); } catch (e) {}
        }
        setListeningUI(false);
      } else {
        try {
          recognitionStopRequested = false;
          recognition = new SpeechRecognition();
          const langCodes = { 
            en: 'en-IN', 
            hi: 'hi-IN', 
            mr: 'mr-IN', 
            gu: 'gu-IN', 
            kn: 'kn-IN', 
            ml: 'ml-IN', 
            ta: 'ta-IN',
            te: 'te-IN',
            bn: 'bn-IN',
            raj: 'hi-IN' 
          };
          recognition.lang = langCodes[currentLang] || langCodes[currentVoiceLang] || 'en-IN';
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;

          recognition.onstart = () => {
            setListeningUI(true);
          };

          recognition.onresult = (e) => {
            let transcript = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
              if (e.results[i].isFinal) transcript += e.results[i][0].transcript;
            }
            if (!transcript.trim()) return;

            const input = document.getElementById('aiInputPrompt');
            if (input) input.value = transcript;
            recognitionStopRequested = true;
            try { recognition.stop(); } catch (e) {}
            setListeningUI(false);
            sendAiMessage(true);
          };

          recognition.onerror = (err) => {
            console.warn("Speech recognition error:", err);
            const terminalError = ['not-allowed', 'service-not-allowed', 'audio-capture'].includes(err.error);
            if (terminalError) {
              recognitionStopRequested = true;
              setListeningUI(false);
            }
          };

          recognition.onend = () => {
            if (recognitionStopRequested || !isRecognizing) {
              setListeningUI(false);
              return;
            }

            // Mobile browsers end recognition after silence; resume the same session.
            setTimeout(() => {
              if (recognitionStopRequested || !isRecognizing) return;
              try { recognition.start(); } catch (e) {}
            }, 150);
          };

          recognition.start();
        } catch (err) {
          console.error("Failed to start speech recognition:", err);
          setListeningUI(false);
        }
      }
    }


