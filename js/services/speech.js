/* ======================================================================= */
/* SAKSHAM SPEECH SERVICE (TTS & STT SPEECH RECOGNITION)                   */
/* Supporting All 22 Official 8th-Schedule Indian Languages + English      */
/* ======================================================================= */

    const SAKSHAM_INDIAN_LANGUAGES = {
      en: { code: 'en', bcp47: 'en-IN', name: 'English (India)', native: 'English', prompt: 'Speak now, I am listening...' },
      hi: { code: 'hi', bcp47: 'hi-IN', name: 'Hindi', native: 'हिन्दी', prompt: 'बोलिए, मैं सुन रहा हूँ...' },
      mr: { code: 'mr', bcp47: 'mr-IN', name: 'Marathi', native: 'मराठी', prompt: 'बोला, मी ऐकत आहे...' },
      ta: { code: 'ta', bcp47: 'ta-IN', name: 'Tamil', native: 'தமிழ்', prompt: 'பேசுங்கள், நான் கேட்கிறேன்...' },
      te: { code: 'te', bcp47: 'te-IN', name: 'Telugu', native: 'తెలుగు', prompt: 'మాట్లాడండి, వింటున్నాను...' },
      bn: { code: 'bn', bcp47: 'bn-IN', name: 'Bengali', native: 'বাংলা', prompt: 'বলুন, আমি শুনছি...' },
      gu: { code: 'gu', bcp47: 'gu-IN', name: 'Gujarati', native: 'ગુજરાતી', prompt: 'બોલો, હું સાંભળું છું...' },
      kn: { code: 'kn', bcp47: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ', prompt: 'ಮಾತನಾಡಿ, ಕೇಳುತ್ತಿದ್ದೇನೆ...' },
      ml: { code: 'ml', bcp47: 'ml-IN', name: 'Malayalam', native: 'മലയാളം', prompt: 'സംസാരിക്കൂ, ഞാൻ കേൾക്കുന്നു...' },
      pa: { code: 'pa', bcp47: 'pa-IN', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', prompt: 'ਬੋਲੋ, ਮੈਂ ਸੁਣ ਰਿਹਾ ਹਾਂ...' },
      or: { code: 'or', bcp47: 'or-IN', name: 'Odia', native: 'ଓଡ଼ିଆ', prompt: 'କୁହନ୍ତୁ, ମୁଁ ଶୁଣୁଛି...' },
      as: { code: 'as', bcp47: 'as-IN', name: 'Assamese', native: 'অসমীয়া', prompt: 'কওক, মই শুনি আছোঁ...' },
      ur: { code: 'ur', bcp47: 'ur-IN', name: 'Urdu', native: 'اردو', prompt: 'فرمائیے، میں سن رہا ہوں...' },
      sa: { code: 'sa', bcp47: 'sa-IN', name: 'Sanskrit', native: 'संस्कृतम्', prompt: 'वदतु, शृणोमि...' },
      ne: { code: 'ne', bcp47: 'ne-NP', name: 'Nepali', native: 'नेपाली', prompt: 'भन्नुहोस्, म सुन्दैछु...' },
      kok: { code: 'kok', bcp47: 'kok-IN', name: 'Konkani', native: 'कोंकणी', prompt: 'सांगा, हांव आयकतां...' },
      mai: { code: 'mai', bcp47: 'mai-IN', name: 'Maithili', native: 'मैथिली', prompt: 'कहूं, हम सुनि रहल छी...' },
      sd: { code: 'sd', bcp47: 'sd-IN', name: 'Sindhi', native: 'سنڌي', prompt: 'چئو، مان ٻڌي رهيو آهيان...' },
      doi: { code: 'doi', bcp47: 'doi-IN', name: 'Dogri', native: 'डोगरी', prompt: 'बोलो, मैं सुन्ना आं...' },
      mni: { code: 'mni', bcp47: 'mni-IN', name: 'Manipuri', native: 'মৈতৈলোন্', prompt: 'হায়বিয়ু, ঐ তাশিল্পি...' },
      sat: { code: 'sat', bcp47: 'sat-IN', name: 'Santhali', native: 'ᱥᱟᱱᱛᱟᱲᱤ', prompt: 'ᱞᱟᱹᱭ ᱢᱮ, ᱤᱧ ᱟᱸᱡᱚᱢᱮᱫᱟ...' },
      ks: { code: 'ks', bcp47: 'ks-IN', name: 'Kashmiri', native: 'کٲشُر', prompt: 'وَنِو، بَہ چھُس بوزان...' },
      brx: { code: 'brx', bcp47: 'brx-IN', name: 'Bodo', native: 'बड़ो', prompt: 'बुं, आं खनासं गासिनो दं...' }
    };

    var currentVoiceLang = window.currentVoiceLang = localStorage.getItem('saksham_voice_lang') || 'en';

    function setVoiceLanguage(lang) {
      if (!lang) lang = 'en';
      const key = lang.toLowerCase();
      const info = SAKSHAM_INDIAN_LANGUAGES[key] || SAKSHAM_INDIAN_LANGUAGES.en;
      currentVoiceLang = info.code;
      window.currentVoiceLang = info.code;
      try {
        localStorage.setItem('saksham_voice_lang', info.code);
      } catch (e) {}

      // Update badge if exists
      const badge = document.getElementById('currentVoiceLangBadge');
      if (badge) badge.innerText = `${info.code.toUpperCase()} (${info.bcp47})`;

      // Update dropdown if exists
      const select = document.getElementById('aiVoiceLangSelect');
      if (select && select.value !== info.code) select.value = info.code;

      // Update big voice button prompt text if exists
      const bigVoiceText = document.getElementById('aiBigVoiceText');
      if (bigVoiceText) {
        bigVoiceText.innerHTML = `🎙️ Tap to Speak (Direct Multi-Language Voice)`;
      }

      // Update prompt input placeholder if exists
      const input = document.getElementById('aiInputPrompt');
      if (input) {
        input.placeholder = `Speak or type in any language (English, हिन्दी, मराठी, தமிழ், etc.)...`;
      }
    }
    window.setVoiceLanguage = setVoiceLanguage;
    window.setVoiceLang = setVoiceLanguage;

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
        bn: { vault: '📸 পরিবার (Vault)', games: '🎮 মন ক্লিনিক গেমস', routine: '💊 ওষুধ ও রুটিন', movement: '🚶 হাঁটা ও স্বর', nutrition: '🥗 পুষ্টি ও খাদ্য', calendar: '📅 ক্যালেন্ডার' },
        pa: { vault: '📸 ਪਰਿਵਾਰ (Vault)', games: '🎮 ਮਾਈਂਡ ਗੇਮਜ਼ (Games)', routine: '💊 ਦਵਾਈਆਂ ਤੇ ਰੁਟੀਨ', movement: '🚶 ਕਸਰਤ ਤੇ ਅਵਾਜ਼', nutrition: '🥗 ਖੁਰਾਕ ਤੇ ਪੋਸ਼ਣ', calendar: '📅 ਕੈਲੰਡਰ' },
        or: { vault: '📸 ପରିବାର (Vault)', games: '🎮 ଖେଳ (Games)', routine: '💊 ଔଷଧ ଓ ଦିନଚର୍ଯ୍ୟା', movement: '🚶 ବ୍ୟାୟାମ', nutrition: '🥗 ଆହାର', calendar: '📅 କ୍ୟାଲେଣ୍ଡର' },
        ur: { vault: '📸 خاندان (Vault)', games: '🎮 کھیل (Games)', routine: '💊 دوا اور معمولات', movement: '🚶 ورزش اور آواز', nutrition: '🥗 غذا اور پرہیز', calendar: '📅 کیلنڈر' }
      };
      const c = chipData[lang] || chipData['en'];
      if (document.getElementById('chip-vault')) document.getElementById('chip-vault').innerText = c.vault;
      if (document.getElementById('chip-games')) document.getElementById('chip-games').innerText = c.games;
      if (document.getElementById('chip-routine')) document.getElementById('chip-routine').innerText = c.routine;
      if (document.getElementById('chip-movement')) document.getElementById('chip-movement').innerText = c.movement;
      if (document.getElementById('chip-nutrition')) document.getElementById('chip-nutrition').innerText = c.nutrition;
      if (document.getElementById('chip-calendar')) document.getElementById('chip-calendar').innerText = c.calendar;
    }
    window.updateAiQuickChips = updateAiQuickChips;

    function updateBigVoiceButtonPrompt(langKey) {
      const bigVoiceText = document.getElementById('aiBigVoiceText');
      if (bigVoiceText) {
        bigVoiceText.innerHTML = `🎙️ Tap to Speak (Direct Multi-Language Voice)`;
      }
    }
    window.updateBigVoiceButtonPrompt = updateBigVoiceButtonPrompt;

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

    // Helper: Detect script from text to accurately pick Indian speech synthesizer voice
    function detectScriptLanguage(txt) {
      if (!txt) return null;
      if (/[\u0900-\u097F]/.test(txt)) return 'hi-IN'; // Devanagari (Hindi, Marathi, Sanskrit, Nepali, Konkani, Maithili, Dogri, Bodo)
      if (/[\u0B80-\u0BFF]/.test(txt)) return 'ta-IN'; // Tamil
      if (/[\u0C00-\u0C7F]/.test(txt)) return 'te-IN'; // Telugu
      if (/[\u0980-\u09FF]/.test(txt)) return 'bn-IN'; // Bengali / Assamese / Manipuri
      if (/[\u0A80-\u0AFF]/.test(txt)) return 'gu-IN'; // Gujarati
      if (/[\u0C80-\u0CFF]/.test(txt)) return 'kn-IN'; // Kannada
      if (/[\u0D00-\u0D7F]/.test(txt)) return 'ml-IN'; // Malayalam
      if (/[\u0A00-\u0A7F]/.test(txt)) return 'pa-IN'; // Gurmukhi / Punjabi
      if (/[\u0B00-\u0B7F]/.test(txt)) return 'or-IN'; // Odia
      if (/[\u0600-\u06FF]/.test(txt)) return 'ur-IN'; // Urdu / Sindhi Arabic
      return null;
    }

    function speakText(txt, targetLangCode = null) {
      if (!('speechSynthesis' in window)) return;
      if (!txt || !txt.trim()) return;

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
      } catch (e) {}

      setTimeout(() => {
        try {
          // Guarantee cached voices are populated
          let voices = window.cachedVoices || [];
          if ((!voices || voices.length === 0) && 'speechSynthesis' in window && window.speechSynthesis.getVoices) {
            voices = window.speechSynthesis.getVoices();
            window.cachedVoices = voices;
          }

          const rate = parseFloat(document.getElementById('ttsRateSelect')?.value || (window.currentAgeTier === 'senior' ? '0.85' : '0.95'));
          const u = new SpeechSynthesisUtterance(txt);
          u.rate = rate;
          u.pitch = 1.0;
          u.volume = 1.0;

          // Determine desired BCP-47 language tag
          let desiredLang = 'en-IN';
          if (targetLangCode) {
            desiredLang = SAKSHAM_INDIAN_LANGUAGES[targetLangCode]?.bcp47 || targetLangCode;
          } else {
            const detectedScript = detectScriptLanguage(txt);
            if (detectedScript) {
              desiredLang = detectedScript;
            } else {
              const activeVoice = window.currentVoiceLang || currentVoiceLang || 'en';
              desiredLang = SAKSHAM_INDIAN_LANGUAGES[activeVoice]?.bcp47 || 'en-IN';
            }
          }
          u.lang = desiredLang;

          // Select the most natural voice available for this target language
          if (voices && voices.length > 0) {
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
          u.onerror = (e) => { 
            console.warn('[TTS Error]:', e);
            if (banner) banner.classList.add('hidden'); 
          };

          // Chrome watchdog to prevent speech synthesis stall on longer utterances
          const resumeTimer = setInterval(() => {
            if (!window.speechSynthesis || !window.speechSynthesis.speaking) {
              clearInterval(resumeTimer);
            } else {
              window.speechSynthesis.pause();
              window.speechSynthesis.resume();
            }
          }, 8000);

          window.speechSynthesis.speak(u);
        } catch (err) {
          console.warn('[TTS Note]:', err);
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
    let aiSpeechSilenceTimer = null;
    let aiSpeechLatestTranscript = '';

    function toggleAiVoiceInput() {
      const micBtn = document.getElementById('btnAiMic');
      const bigVoiceBtn = document.getElementById('btnAiBigVoice');
      const bigVoiceIcon = document.getElementById('aiBigVoiceIcon');
      const bigVoiceText = document.getElementById('aiBigVoiceText');
      const bigVoicePulseRing = document.getElementById('aiBigVoicePulseRing');
      const voiceStatusPill = document.getElementById('aiVoiceStatusPill');

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser. You can click any of the voice action buttons to navigate directly!");
        return;
      }

      const activeLangKey = window.currentVoiceLang || currentVoiceLang || 'en';
      const activeLangObj = SAKSHAM_INDIAN_LANGUAGES[activeLangKey] || SAKSHAM_INDIAN_LANGUAGES.en;

      function setListeningUI(listening) {
        isRecognizing = listening;
        if (listening) {
          if (micBtn) micBtn.classList.add('bg-rose-500', 'text-white', 'animate-pulse');
          if (bigVoiceBtn) {
            bigVoiceBtn.classList.remove('from-sky-600', 'to-teal-600');
            bigVoiceBtn.classList.add('from-rose-600', 'to-red-600', 'animate-pulse');
          }
          if (bigVoiceIcon) bigVoiceIcon.className = "fa-solid fa-microphone-lines text-base text-white animate-bounce";
          if (bigVoiceText) bigVoiceText.innerText = `🔴 Listening... Speak now in any language`;
          if (bigVoicePulseRing) bigVoicePulseRing.className = "w-8 h-8 rounded-xl bg-white/30 flex items-center justify-center text-white shrink-0 animate-ping";
          if (voiceStatusPill) {
            voiceStatusPill.classList.remove('hidden');
            voiceStatusPill.innerText = `● Listening in any language...`;
          }
        } else {
          if (micBtn) micBtn.classList.remove('bg-rose-500', 'text-white', 'animate-pulse');
          if (bigVoiceBtn) {
            bigVoiceBtn.classList.add('from-sky-600', 'to-teal-600');
            bigVoiceBtn.classList.remove('from-rose-600', 'to-red-600', 'animate-pulse');
          }
          if (bigVoiceIcon) bigVoiceIcon.className = "fa-solid fa-microphone text-base text-amber-300";
          if (bigVoiceText) {
            bigVoiceText.innerHTML = `🎙️ Tap to Speak (Direct Multi-Language Voice)`;
          }
          if (bigVoicePulseRing) bigVoicePulseRing.className = "w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0";
          if (voiceStatusPill) voiceStatusPill.classList.add('hidden');
        }
      }

      // Stop speech synthesis if speaking so mic doesn't capture synthesizer audio
      if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }

      function commitAndSend(text) {
        if (!text || !text.trim()) return;
        recognitionStopRequested = true;
        if (aiSpeechSilenceTimer) {
          clearTimeout(aiSpeechSilenceTimer);
          aiSpeechSilenceTimer = null;
        }
        try { if (recognition) recognition.stop(); } catch (e) {}
        setListeningUI(false);
        const input = document.getElementById('aiInputPrompt');
        if (input) input.value = text.trim();
        aiSpeechLatestTranscript = '';
        if (typeof sendAiMessage === 'function') {
          sendAiMessage(true);
        }
      }

      if (isRecognizing) {
        recognitionStopRequested = true;
        if (aiSpeechSilenceTimer) {
          clearTimeout(aiSpeechSilenceTimer);
          aiSpeechSilenceTimer = null;
        }
        if (recognition) {
          try { recognition.stop(); } catch (e) {}
        }
        setListeningUI(false);
      } else {
        try {
          recognitionStopRequested = false;
          aiSpeechLatestTranscript = '';
          if (aiSpeechSilenceTimer) {
            clearTimeout(aiSpeechSilenceTimer);
            aiSpeechSilenceTimer = null;
          }

          recognition = new SpeechRecognition();
          // Directly understand language: check currentVoiceLang, then appLang, then browser language
          const curLangKey = (window.currentVoiceLang || localStorage.getItem('saksham_voice_lang') || (typeof currentLang !== 'undefined' && currentLang) || 'en').toLowerCase();
          const targetLangObj = SAKSHAM_INDIAN_LANGUAGES[curLangKey] || SAKSHAM_INDIAN_LANGUAGES.en;
          recognition.lang = targetLangObj.bcp47 || 'en-IN';
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;

          recognition.onstart = () => {
            setListeningUI(true);
          };

          recognition.onresult = (e) => {
            let finalTranscript = '';
            let interimTranscript = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
              if (e.results[i].isFinal) {
                finalTranscript += e.results[i][0].transcript;
              } else {
                interimTranscript += e.results[i][0].transcript;
              }
            }

            const heardText = (finalTranscript || interimTranscript).trim();
            if (!heardText) return;
            aiSpeechLatestTranscript = heardText;

            // Auto-detect Indian script and switch voice language dynamically if Indian script is spoken
            const scriptLang = detectScriptLanguage(heardText);
            if (scriptLang) {
              const langCodeByBcp = Object.keys(SAKSHAM_INDIAN_LANGUAGES).find(k => SAKSHAM_INDIAN_LANGUAGES[k].bcp47 === scriptLang);
              if (langCodeByBcp && langCodeByBcp !== window.currentVoiceLang) {
                setVoiceLanguage(langCodeByBcp);
              }
            }

            // Live visual feedback directly in the prompt input field
            const input = document.getElementById('aiInputPrompt');
            if (input) input.value = heardText;

            // Live visual feedback on the big speech button
            if (bigVoiceText) {
              bigVoiceText.innerHTML = `🗣️ "${heardText}"`;
            }

            // If browser finalized transcript, commit immediately!
            if (finalTranscript.trim()) {
              commitAndSend(finalTranscript);
              return;
            }

            // Otherwise, reset silence timer: after 1100ms pause, auto-submit interim transcript
            if (aiSpeechSilenceTimer) clearTimeout(aiSpeechSilenceTimer);
            aiSpeechSilenceTimer = setTimeout(() => {
              if (aiSpeechLatestTranscript.trim() && isRecognizing) {
                commitAndSend(aiSpeechLatestTranscript);
              }
            }, 1100);
          };

          recognition.onerror = (err) => {
            console.warn("Speech recognition notice:", err.error);
            if (err.error === 'no-speech') {
              if (aiSpeechLatestTranscript.trim()) {
                commitAndSend(aiSpeechLatestTranscript);
                return;
              }
            }
            recognitionStopRequested = true;
            setListeningUI(false);
          };

          recognition.onend = () => {
            if (aiSpeechSilenceTimer) {
              clearTimeout(aiSpeechSilenceTimer);
              aiSpeechSilenceTimer = null;
            }
            if (aiSpeechLatestTranscript.trim() && !recognitionStopRequested) {
              commitAndSend(aiSpeechLatestTranscript);
              return;
            }
            setListeningUI(false);
          };

          recognition.start();
        } catch (err) {
          console.error("Failed to start speech recognition:", err);
          setListeningUI(false);
        }
      }
    }

    // Auto-init active language UI on boot
    setTimeout(() => {
      const savedLang = localStorage.getItem('saksham_voice_lang') || 'en';
      setVoiceLanguage(savedLang);
    }, 100);

    window.SAKSHAM_INDIAN_LANGUAGES = SAKSHAM_INDIAN_LANGUAGES;
    window.setVoiceLanguage = setVoiceLanguage;
    window.setVoiceLang = setVoiceLanguage;
    window.toggleAiVoiceInput = toggleAiVoiceInput;
    window.speakText = speakText;
    window.stopSpeaking = stopSpeaking;
    window.speakPageSummary = speakPageSummary;
    window.speakCurrentCue = speakCurrentCue;
    window.speakNutritionOverview = speakNutritionOverview;
    window.setVoiceRate = setVoiceRate;

    // Global fallbacks for notes and language change handlers
    if (typeof window.handleLanguageChange !== 'function') {
      window.handleLanguageChange = function(code) {
        if (window.SakshamNotes && typeof window.SakshamNotes.handleLanguageChange === 'function') {
          return window.SakshamNotes.handleLanguageChange(code);
        }
        setVoiceLanguage(code);
      };
    }
    if (typeof window.testVocalPlayback !== 'function') {
      window.testVocalPlayback = function() {
        if (window.SakshamNotes && typeof window.SakshamNotes.testVocalPlayback === 'function') {
          return window.SakshamNotes.testVocalPlayback();
        }
        speakText("Testing vocal playback in your selected Indian voice.");
      };
    }
