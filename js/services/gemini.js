/* ======================================================================= */
/* SAKSHAM GEMINI AI & AUTONOMOUS COGNITIVE CONVERSATIONAL SERVICE         */
/* ======================================================================= */

    function openAiSettingsModal() {
      document.getElementById('geminiApiKeyInput').value = state.geminiApiKey;
      document.getElementById('aiSettingsModal').classList.remove('hidden');
      document.getElementById('aiSettingsModal').classList.add('flex');
    }

    function closeAiSettingsModal() {
      document.getElementById('aiSettingsModal').classList.add('hidden');
      document.getElementById('aiSettingsModal').classList.remove('flex');
    }

    function saveGeminiApiKey() {
      const key = document.getElementById('geminiApiKeyInput').value.trim();
      state.geminiApiKey = key;
      localStorage.setItem('saksham_gemini_api_key', key);
      closeAiSettingsModal();
      alert(key ? "Gemini API key configured successfully! Real-time AI is enabled." : "API key cleared.");
    }

    function clearGeminiApiKey() {
      state.geminiApiKey = '';
      localStorage.removeItem('saksham_gemini_api_key');
      localStorage.removeItem('harmony_gemini_api_key');
      document.getElementById('geminiApiKeyInput').value = '';
      alert("API key removed.");
    }



    async function sendAiMessage(fromVoice = false) {
      const input = document.getElementById('aiInputPrompt');
      const query = input.value.trim();
      if (!query) return;

      appendAiMessage('user', query);
      input.value = '';

      // Check for tremor-safe multilingual voice navigation intent first
      if (handleVoiceNavigationIntent(query, false)) {
        return;
      }

      const typingId = appendAiTypingIndicator();
      let fallbackNotice = '';

      if (state.geminiApiKey) {
        try {
          const response = await callGeminiApi(query);
          removeAiTypingIndicator(typingId);
          appendAiMessage('assistant', response, currentLang);
          // Auto-speak reply out loud for hands-free tremor accessibility in user's reading language
          const cleanVoiceText = response.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[#*•-]/g, '').trim();
          speakText(cleanVoiceText, currentLang);
          return;
        } catch (err) {
          console.error("Gemini API error, falling back to autonomous engine", err);
          fallbackNotice = 'Live Gemini is unavailable right now. Here is offline guidance instead.\n\n';
        }
      } else {
        fallbackNotice = 'Gemini is not configured. This is offline guidance; add an API key in AI settings for live answers.\n\n';
      }

      setTimeout(() => {
        removeAiTypingIndicator(typingId);
        const reply = fallbackNotice + generateAutonomousAiResponse(query, currentLang);
        appendAiMessage('assistant', reply, currentLang);
        // Auto-speak reply out loud for hands-free tremor accessibility in user's reading language
        const cleanVoiceText = reply.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[#*•-]/g, '').trim();
        speakText(cleanVoiceText, currentLang);
      }, 700);
    }

    async function callGeminiApi(prompt) {
      const langNames = { hi: 'Hindi', mr: 'Marathi', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', ta: 'Tamil', te: 'Telugu', bn: 'Bengali', raj: 'Rajasthani / Marwari', en: 'English' };
      const chosenLangName = langNames[currentLang] || 'English';
      const systemInstruction = `You are SakshamAI, a warm, expert cognitive wellness and Parkinson's disease medical companion. Support the current authenticated user and their care team without assuming or inventing names. Provide clear, empathetic, clinically accurate advice regarding Levodopa timing (protein spacing), speech loudness (LSVT LOUD 'AHHH' drills), fine motor exercises, gait freezing cues, and emotional encouragement. Please reply warmly in ${chosenLangName} unless the user explicitly requested another language. Keep formatting clean with bullet points and short friendly sentences.`;
      
      const endpoint = new URL('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
      endpoint.searchParams.set('key', state.geminiApiKey);
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        })
      });

      let data;
      try {
        data = await res.json();
      } catch (error) {
        throw new Error(`Gemini returned an unreadable response (${res.status}).`);
      }
      if (!res.ok) throw new Error(data.error?.message || `Gemini request failed (${res.status}).`);

      const responseText = data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || '')
        .join('')
        .trim();
      if (responseText) return responseText;
      throw new Error(data.promptFeedback?.blockReason || 'Gemini returned no text response.');
    }

    function generateAutonomousAiResponse(q, overrideLang = null) {
      const lower = q.toLowerCase();
      // Always output in user's selected reading language (currentLang)
      const lang = overrideLang || currentLang || 'en';

      // 1. Protein & Levodopa Timing
      if (lower.includes('protein') || lower.includes('levodopa') || lower.includes('medication') || lower.includes('absorb') || lower.includes('दाल') || lower.includes('दवा') || lower.includes('ಪ್ರೋಟೀನ್') || lower.includes('മാംസ്യം')) {
        if (lang === 'hi') {
          return `**लेवोडोपा और प्रोटीन नियम:**
• **नियम:** लेवोडोपा गोली खाने से **30 से 45 मिनट पहले** या भोजन के **1.5 से 2 घंटे बाद** लें।
• **कारण:** दाल, दूध और प्रोटीन युक्त भोजन लेवोडोपा के असर को कम कर सकते हैं।
• **सलाह:** भारी प्रोटीन शाम के भोजन में लें ताकि दिन में गति सुचारू रहे।`;
        }
        if (lang === 'mr') {
          return `**लेवोडोपा आणि प्रथिनांचे वेळापत्रक:**
• **नियम:** लेवोडोपा गोळी जेवणाच्या **30 ते 45 मिनिटे आधी** किंवा जेवणानंतर **1.5 ते 2 तासांनी** भरपूर पाण्यासोबत घ्या.
• **कारण:** डाळी आणि प्रथिने लेवोडोपाच्या शोषणात अडथळा आणू शकतात.`;
        }
        if (lang === 'gu') {
          return `**લેવોડોપા અને પ્રોટીન નિયમ:**
• **નિયમ:** લેવોડોપા ગોળી જમવાના **30 થી 45 મિનિટ પહેલાં** અથવા જમ્યા પછી **1.5 થી 2 કલાકે** લો.
• **સલાહ:** પ્રોટીન યુક્ત ખોરાક સાંજ પછી લેવો વધુ હિતાવહ છે.`;
        }
        if (lang === 'kn') {
          return `**ಲೆವೊಡೋಪಾ ಮತ್ತು ಪ್ರೋಟೀನ್ ನಿಯಮ:**
• **ನಿಯಮ:** ಲೆವೊಡೋಪಾ ಮಾತ್ರೆ ಊಟಕ್ಕೆ **30 ರಿಂದ 45 ನಿಮಿಷಗಳ ಮೊದಲು** ಅಥವಾ ಊಟದ **1.5 ರಿಂದ 2 ಗಂಟೆಗಳ ನಂತರ** ತೆಗೆದುಕೊಳ್ಳಿ.
• **ಕಾರಣ:** ಪ್ರೋಟೀನ್ ಅಂಶಗಳು ಔಷಧಿಯ ಹೀರಿಕೊಳ್ಳುವಿಕೆಯನ್ನು ಕಡಿಮೆ ಮಾಡಬಹುದು.`;
        }
        if (lang === 'ta') {
          return `**லெவோடோபா மற்றும் புரத விதிமுறை:**
• **விதி:** லெவோடோபா மாத்திரையை உணவுக்கு **30 முதல் 45 நிமிடங்களுக்கு முன்** அல்லது உணவுக்குப் பிறகு **1.5 முதல் 2 மணி நேரம் கழித்து** உட்கொள்ளுங்கள்.`;
        }
        if (lang === 'te') {
          return `**లెవోడోపా మరియు ప్రొటీన్ నియమం:**
• **నియమం:** లెవోడోపా మాత్రను భోజనానికి **30 నుండి 45 నిమిషాల ముందు** లేదా భోజనం తర్వాత **1.5 నుండి 2 గంటల తర్వాత** తీసుకోండి.`;
        }
        if (lang === 'ml') {
          return `**ലെവോഡോപയും പ്രോട്ടീനും:**
• **നിയമം:** ലെവോഡോപ ഗുളിക ഭക്ഷണത്തിന് **30-45 മിനിറ്റ് മുമ്പോ** അല്ലെങ്കിൽ ഭക്ഷണത്തിന് **1.5-2 മണിക്കൂറിന് ശേഷമോ** കഴിക്കുക.`;
        }
        return `**Levodopa & Protein Spacing Protocol:**
• **Why it matters:** Dietary amino acids in protein compete directly with Levodopa for transportation across the blood-brain barrier.
• **Clinical Rule:** Take your Levodopa tablet with a full glass of water **30 to 45 minutes before meals**, or wait 1.5 to 2 hours after high-protein meals.
• **Meal Strategy:** Keep heavier proteins for the evening meal so your motor agility stays smooth during the day!`;
      }

      // 2. Freezing of Gait
      if (lower.includes('freeze') || lower.includes('walking') || lower.includes('gait') || lower.includes('stuck') || lower.includes('कदम') || lower.includes('पाय') || lower.includes('ನಡಿಗೆ')) {
        if (lang === 'hi') {
          return `**पैर जमने (फ्रीजिंग) से निकलने के उपाय:**
1. **रुकें और गहरी सांस लें:** घबराएं नहीं।
2. **रेखा पार करें:** फर्श पर एक काल्पनिक रेखा देखें और उसे पार करने का प्रयास करें।
3. **वजन बदलें:** वजन हल्के से एक पैर से दूसरे पर बदलें।
4. **मेट्रोनोम प्रयोग करें:** 100 BPM मेट्रोनोम की ताल पर कदम बढ़ाएं।`;
        }
        if (lang === 'kn') {
          return `**ನಡಿಗೆ ನಿಂತುಹೋದಾಗ (Gait Freezing) ಏನು ಮಾಡಬೇಕು:**
1. **ನಿಲ್ಲಿಸಿ ಮತ್ತು ವಿಶ್ರಮಿಸಿ:** ಆತಂಕಪಡಬೇಡಿ, ದೀರ್ಘ ಉಸಿರು ತೆಗೆದುಕೊಳ್ಳಿ.
2. **ಗೆರೆ ದಾಟಿ:** ನೆಲದ ಮೇಲಿನ ಕಾಲ್ಪನಿಕ ಗೆರೆಯನ್ನು ದಾಟಲು ಪ್ರಯತ್ನಿಸಿ.
3. **ತೂಕ ಬದಲಾಯಿಸಿ:** ಬಲದಿಂದ ಎಡಗಾಲಿಗೆ ತೂಕವನ್ನು ನಿಧಾನವಾಗಿ ವರ್ಗಾಯಿಸಿ.
4. **ಮೆಟ್ರೋನೊಮ್ ಬಳಸಿ:** ಟ್ಯಾಬ್ 4 ರಲ್ಲಿರುವ 100 BPM ಮೆಟ್ರೋನೊಮ್ ಲಯದಲ್ಲಿ ಹೆಜ್ಜೆ ಇಡಿ!`;
        }
        return `**How to Break a Gait Freeze (Auditory & Visual Cues):**
1. **Stop & Reset:** Don't fight the freeze; take one slow, deep breath.
2. **Visual Step Target:** Imagine stepping over a small stick or a line on the floor.
3. **Weight Shift:** Gently sway your weight from your right hip to your left hip.
4. **Use Metronome:** Turn on the 100 BPM Metronome in Tab 4 (Movement) and step in time with the rhythmic click!`;
      }

      // Localized Default Friendly Response in the User's Chosen Reading Language
      if (lang === 'en') {
        return `Hello! 🌿 Welcome to Saksham.
• **Loved Ones Vault:** Say "Family" or "Parivar" to view cherished memories.
• **Mind Clinic Games:** Say "Game" or "Khel" to start memory training.
• **Routine & Meds:** Say "Routine" or "Dawa" to check today's schedule.
• **Movement & Speech:** Say "Walking" or "Chalna" to start the metronome.`;
      }
      if (lang === 'kn') {
        return `ನಮಸ್ಕಾರ ಕಲ್ಯಾಣಿ ಜಿ! 🌿 ಸಕ್ಷಮ್‌ಗೆ ಸುಸ್ವಾಗತ.
• **ಕುಟುಂಬ ವಾಲ್ಟ್:** 'ಕುಟುಂಬ' ಅಥವಾ 'family' ಎಂದು ಹೇಳಿ ಫೋಟೋಗಳನ್ನು ನೋಡಿ.
• **ಮೈಂಡ್ ಗೇಮ್ಸ್:** 'ಆಟ' ಅಥವಾ 'game' ಎಂದು ಹೇಳಿ ಮೆದುಳಿನ ತರಬೇತಿ ಪ್ರಾರಂಭಿಸಿ.
• **ದಿನಚರಿ & ಔಷಧಿ:** 'ಔಷಧ' ಅಥವಾ 'routine' ಎಂದು ಹೇಳಿ ವೇಳಾಪಟ್ಟಿ ನೋಡಿ.
• **ನಡಿಗೆ & ವ್ಯಾಯಾಮ:** 'ನಡಿಗೆ' ಅಥವಾ 'walk' ಎಂದು ಹೇಳಿ ಮೆಟ್ರೋನೊಮ್ ಪ್ರಾರಂಭಿಸಿ.`;
      }
      if (lang === 'hi') {
        return `नमस्ते! 🌿 सक्षम में आपका स्वागत है।
• **परिवार वॉल्ट:** 'परिवार' बोलकर अपनों की तस्वीरें देखें।
• **दिमागी खेल:** 'खेल' बोलकर माइंड क्लिनिक गेम्स खेलें।
• **दवा व दिनचर्या:** 'दवा' बोलकर समय सारणी देखें।
• **चलना व आवाज:** 'चलना' बोलकर मेट्रोनोम शुरू करें।`;
      }
      if (lang === 'mr') {
        return `नमस्कार! 🌿 सक्षममध्ये आपले स्वागत आहे.
• **कुटुंब वॉल्ट:** 'कुटुंब' बोलून आपुलकीच्या आठवणी पहा.
• **खेळ:** 'खेळ' बोलून मेंदूचे सराव सुरू करा.
• **औषध:** 'औषध' बोलून वेळापत्रक पहा.
• **चालणे:** 'चालणे' बोलून व्यायाम सुरू करा.`;
      }
      if (lang === 'gu') {
        return `નમસ્તે! 🌿 સક્ષમમાં આપનું સ્વાગત છે.
• **પરિવાર વૉલ્ટ:** 'પરિવાર' બોલીને સ્વજનોની યાદો જુઓ.
• **રમતો:** 'રમત' બોલીને માઇન્ડ ક્લિનિક રમતો રમો.
• **દવા:** 'દવા' બોલીને સમયપત્રક જુઓ.
• **કસરત:** 'ચાલવું' બોલીને વૉકિંગ ગાઇડ ખોલો.`;
      }
      if (lang === 'ta') {
        return `வணக்கம் கல்யாணி ஜி! 🌿 சக்ஷம் உங்களை வரவேற்கிறது.
• **குடும்ப பெட்டகம்:** 'குடும்பம்' அல்லது 'family' என்று கூறி நினைவுகளைப் பாருங்கள்.
• **மன விளையாட்டுகள்:** 'விளையாட்டு' அல்லது 'game' என்று கூறி மூளைப் பயிற்சி தொடங்குங்கள்.
• **அன்றாட வழக்கம்:** 'மருந்து' அல்லது 'routine' என்று கூறி அட்டவணையைப் பாருங்கள்.`;
      }
      if (lang === 'te') {
        return `నమస్కారం కళ్యాణి గారూ! 🌿 సక్షమ్‌కు స్వాగతం.
• **కుటుంబ వాల్ట్:** 'కుటుంబం' లేదా 'family' అని చెప్పి జ్ఞాపకాలను చూడండి.
• **మైండ్ గేమ్స్:** 'ఆట' లేదా 'game' అని చెప్పి మెదడు సాధన ప్రారంభించండి.
• **దినచర్య:** 'మందులు' లేదా 'routine' అని చెప్పి సమయ పట్టిక చూడండి.`;
      }
      if (lang === 'ml') {
        return `നമസ്കാരം കല്യാണി ജി! 🌿 സക്ഷമിലേക്ക് സ്വാഗതം.
• **കുടുംബം:** 'കുടുംബം' അല്ലെങ്കിൽ 'family' എന്ന് പറഞ്ഞ് ഫോട്ടോ വോൾട്ട് തുറക്കൂ.
• **കളികൾ:** 'കളി' അല്ലെങ്കിൽ 'game' എന്ന് പറഞ്ഞ് കളികൾ ആരംഭിക്കൂ.
• **മരുന്ന്:** 'മരുന്ന്' അല്ലെങ്കിൽ 'routine' എന്ന് പറഞ്ഞ് സമയക്രമം കാണൂ.`;
      }

      return `Hello! 🌿 Welcome to Saksham.
• **Stay Hydrated:** Drink your next glass of water to support gut motility.
• **Mind Clinic:** Speak "game" to train memory with Shape Match or Maze Trace.
• **Photo Vault:** Speak "family" to view beloved family members.`;
    }

    function appendAiMessage(role, text, lang = null) {
      const container = document.getElementById('aiChatMessages');
      const isUser = role === 'user';
      const msgDiv = document.createElement('div');
      msgDiv.className = `flex items-start space-x-2.5 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`;

      const speechLang = lang || currentVoiceLang || 'hi';
      const cleanSpeakText = text.replace(/<[^>]*>/g, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/'/g, "\\'").replace(/\n/g, ' ').trim();

      msgDiv.innerHTML = `
        <div class="w-8 h-8 rounded-xl ${isUser ? 'bg-teal-600' : 'bg-gradient-to-tr from-indigo-600 to-purple-600'} text-white flex items-center justify-center shrink-0 text-xs shadow">
          <i class="fa-solid ${isUser ? 'fa-user' : 'fa-robot'}"></i>
        </div>
        <div class="${isUser ? 'bg-indigo-600 text-white rounded-br-xs' : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200'} p-3.5 rounded-2xl text-xs space-y-1.5 shadow-xs max-w-[85%] leading-relaxed">
          <div class="whitespace-pre-line">${text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
          ${!isUser ? `
            <div class="pt-1 flex items-center gap-2 border-t border-slate-100">
              <button onclick="speakText('${cleanSpeakText}', '${speechLang}')" class="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
                <i class="fa-solid fa-volume-high"></i> Listen (${speechLang.toUpperCase()})
              </button>
            </div>
          ` : ''}
        </div>
      `;
      container.appendChild(msgDiv);
      container.scrollTop = container.scrollHeight;
    }

    function appendAiTypingIndicator() {
      const container = document.getElementById('aiChatMessages');
      const id = 'typing-' + Date.now();
      const div = document.createElement('div');
      div.id = id;
      div.className = "flex items-start space-x-2.5";
      div.innerHTML = `
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 text-xs shadow">
          <i class="fa-solid fa-robot"></i>
        </div>
        <div class="bg-white p-3 rounded-2xl rounded-tl-xs border border-slate-200 text-xs text-slate-500 shadow-xs flex items-center space-x-1.5">
          <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse delay-75"></span>
          <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse delay-150"></span>
          <span class="ml-1 text-[11px]">Thinking...</span>
        </div>
      `;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
      return id;
    }

    function removeAiTypingIndicator(id) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }

    function clearAiChat() {
      document.getElementById('aiChatMessages').innerHTML = '';
      appendAiMessage('assistant', "Chat cleared! How can I support your cognitive routine or wellness today?");
    }

