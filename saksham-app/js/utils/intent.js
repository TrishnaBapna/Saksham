/* ======================================================================= */
/* SAKSHAM MULTILINGUAL NLP INTENT DETECTION UTILITY                       */
/* ======================================================================= */

    function detectMultilingualIntent(rawQuery, currentVoiceLang = 'en') {
      if (!rawQuery) return null;
      const q = rawQuery.toLowerCase().trim();

      const has = (terms) => terms.some(t => {
        if (typeof t === 'string') return q.includes(t.toLowerCase());
        return t.test(q);
      });

      const isDevanagari = /[\u0900-\u097F]/.test(q);
      const isGujarati = /[\u0A80-\u0AFF]/.test(q);
      const isKannada = /[\u0C80-\u0CFF]/.test(q);
      const isMalayalam = /[\u0D00-\u0D7F]/.test(q);

      // 1. EMERGENCY / SOS INTENT
      const isSos = has([
        'emergency', 'sos', 'danger', 'fall', 'fallen', 'help',
        'मदद', 'बचाओ', 'इमरजेंसी', 'गिर गया', 'गिर गई', 'डॉक्टर', 'madad', 'bachao', 'gir gaya',
        'मदत', 'वाचवा', 'पडलो', 'पडले', 'madat', 'vachva', 'padlo',
        'મદદ', 'બચાવો', 'પડી ગયો', 'ઇમરજન્સી', 'bachavo', 'padi gayo',
        'ಸಹಾಯ', 'ಉಳಿಸಿ', 'ಬಿದ್ದೆ', 'ತುರ್ತು', 'sahaya', 'ulisi', 'bidde',
        'സഹായം', 'രക്ഷിക്കൂ', 'വീണു', 'അടിയന്തിരം', 'sahayam', 'rakshikku', 'veenu',
        'पड़ ग्यो', 'पड़ गी', 'सहायता', 'pad gyo'
      ]);
      if (isSos) {
        let lang = currentVoiceLang || 'en';
        if (isMalayalam || has(['sahayam', 'rakshikku', 'veenu'])) lang = 'ml';
        else if (isKannada || has(['sahaya', 'ulisi', 'bidde'])) lang = 'kn';
        else if (isGujarati || has(['bachavo', 'padi gayo'])) lang = 'gu';
        else if (has(['मदत', 'वाचवा', 'padlo', 'madat'])) lang = 'mr';
        else if (has(['पड़ ग्यो', 'पड़ गी'])) lang = 'raj';
        else if (isDevanagari || has(['madad', 'bachao', 'gir gaya'])) lang = 'hi';
        else if (has(['emergency', 'sos', 'danger', 'help'])) lang = (currentVoiceLang === 'en' ? 'en' : currentVoiceLang);
        return { intent: 'sos', lang, page: 'sos' };
      }

      // 2. CALM / BREATHING RESET
      const isCalm = has([
        'calm', 'breathe', 'breathing', 'panic', 'anxious', 'overwhelm', 'relax',
        'शांत', 'सांस', 'घबराहट', 'shant', 'saans', 'ghabrahat',
        'शांतता', 'श्वास', 'काळजी', 'shwas',
        'શાંતિ', 'શ્વાસ', 'ગભરાટ', 'shanti', 'shwas',
        'ಶಾಂತ', 'ಉಸಿರು', 'ಆತಂಕ', 'shanta', 'usiru',
        'ശാന്തം', 'ശ്വാസം', 'shantham', 'shwasam'
      ]);
      if (isCalm) {
        let lang = currentVoiceLang || 'en';
        if (isMalayalam) lang = 'ml';
        else if (isKannada) lang = 'kn';
        else if (isGujarati) lang = 'gu';
        else if (isDevanagari) lang = (currentVoiceLang === 'mr' ? 'mr' : (currentVoiceLang === 'raj' ? 'raj' : 'hi'));
        return { intent: 'calm', lang, page: 'calm' };
      }

      // 3. LOVED ONES / FAMILY PHOTO VAULT INTENT
      // Matches "parivar" in Hindi, "kutumb" in Marathi/Gujarati, "kudumbam" in Malayalam, "kutumba" in Kannada, "gharala" in Marwari, "family" in English
      const isVault = has([
        'family', 'loved one', 'loved ones', 'vault', 'face', 'photo', 'photos', 'who is', 'relative', 'relatives',
        'parivar', 'parivaar', 'pariwar', 'kutumb', 'ghar wale', 'gharwale', 'rishtedar', 'tasveer', 'yaad', 'yaadein',
        'natevaik', 'gharche', 'aathvani', 'svajan', 'chhabi',
        'kudumbam', 'veettukaar', 'bandhukkal', 'ormakal', 'chithram',
        'kutumba', 'maneyavaru', 'bandhugalu', 'nenapugalu', 'chitra',
        'gharala', 'tabar', 'tabaran',
        'परिवार', 'घर वाले', 'कुटुंब', 'रिश्तेदार', 'नाते', 'फोटो', 'तस्वीर', 'यादें',
        'नातेवाईक', 'घरचे', 'आठवणी', 'नातवंडे',
        'પરિવાર', 'કુટુંબ', 'સ્વજનો', 'સંબંધી', 'યાદો', 'ફોટો', 'છબી',
        'ಕುಟುಂಬ', 'ಮನೆಯವರು', 'ಬಂಧುಗಳು', 'ನೆನಪುಗಳು', 'ಚಿತ್ರ', 'ಫೋಟೋ',
        'കുടുംബം', 'വീട്ടുകാർ', 'ബന്ധുക്കൾ', 'ഓർമ്മകൾ', 'ഫോട്ടോ', 'ചിത്രം',
        'घराळा', 'टाबर', 'टाबरां'
      ]);
      if (isVault) {
        let lang = currentVoiceLang || 'hi';
        if (isMalayalam || has(['kudumbam', 'veettukaar', 'ormakal', 'chithram'])) lang = 'ml';
        else if (isKannada || has(['kutumba', 'maneyavaru', 'nenapugalu', 'chitra'])) lang = 'kn';
        else if (isGujarati || has(['svajan', 'chhabi'])) lang = 'gu';
        else if (has(['नातेवाईक', 'घरचे', 'आठवणी', 'natevaik', 'gharche', 'aathvani'])) lang = 'mr';
        else if (has(['घराळा', 'टाबर', 'टाबरां', 'gharala', 'tabar', 'tabaran'])) lang = 'raj';
        else if (has(['kutumb', 'कुटुंब'])) lang = (currentVoiceLang === 'mr' || currentVoiceLang === 'gu') ? currentVoiceLang : 'mr';
        else if (has(['parivar', 'parivaar', 'pariwar', 'परिवार', 'घर वाले', 'tasveer', 'yaadein'])) lang = (currentVoiceLang === 'raj' ? 'raj' : (currentVoiceLang === 'gu' ? 'gu' : 'hi'));
        else if (has(['family', 'vault', 'photo', 'photos', 'who is', 'loved one'])) lang = currentVoiceLang;
        return { intent: 'vault', lang, page: 'vault' };
      }

      // 4. MIND CLINIC GAMES & TECH LAB INTENT
      // Matches "khel" in Hindi/Marathi, "ramat" in Gujarati, "aata" in Kannada, "kali" in Malayalam, "game"/"tech"/"lab" in English
      const isGames = has([
        'game', 'games', 'khel', 'khela', 'ramat', 'ramato', 'aata', 'aatagalu', 'kali', 'kalikal',
        'play', 'tech', 'technology', 'lab', 'labs', 'maze', 'puzzle', 'reflex', 'reaction',
        'drill', 'drills', 'exercise', 'exercises', 'card', 'cards', 'math sprint',
        'खेल', 'गेम', 'दिमागी खेल', 'पहेली', 'कसरत',
        'खेळ', 'खेळा', 'कोडे', 'मेंदूचे खेळ', 'सराव',
        'રમત', 'રમતો', 'કોયડો', 'દિમાગી કસરત',
        'ಆಟ', 'ಆಟಗಳು', 'ಒಗಟು', 'ಮೆದುಳಿನ ಕಸರತ್ತು',
        'കളി', 'കളികൾ', 'പസിൽ', 'തലച്ചോറ് വ്യായാമം'
      ]);
      if (isGames) {
        let lang = currentVoiceLang || 'hi';
        if (isMalayalam || has(['kali', 'kalikal', 'കളി', 'കളികൾ'])) lang = 'ml';
        else if (isKannada || has(['aata', 'aatagalu', 'ಆಟ', 'ಆಟಗಳು'])) lang = 'kn';
        else if (isGujarati || has(['ramat', 'ramato', 'રમત', 'રમતો'])) lang = 'gu';
        else if (has(['खेळ', 'खेळा', 'कोडे', 'मेंदूचे खेळ', 'khela'])) lang = 'mr';
        else if (has(['khel', 'खेल'])) lang = (currentVoiceLang === 'mr' ? 'mr' : (currentVoiceLang === 'raj' ? 'raj' : 'hi'));
        else if (has(['game', 'games', 'play', 'tech', 'lab', 'maze'])) lang = currentVoiceLang;
        return { intent: 'games', lang, page: 'games' };
      }

      // 5. ROUTINE & MEDICATION INTENT
      // Matches "dawa" in Hindi, "aushadh" in Marathi, "dava" in Gujarati, "maatre" in Kannada, "marunnu" in Malayalam, "medicine" in English
      const isRoutine = has([
        'routine', 'medicine', 'medication', 'pill', 'pills', 'meds', 'schedule', 'alarm',
        'dawa', 'dawaii', 'dawai', 'goli', 'goliyan', 'dincharya',
        'aushadh', 'aushadhe', 'golya', 'velpatrak',
        'dava', 'davao', 'golio', 'samaypatrak',
        'aushadha', 'maatre', 'maatregalu', 'dinachari',
        'marunnu', 'marunnukal', 'gulika', 'samayakramam', 'dinacharya',
        'दवा', 'दवाई', 'गोली', 'दिनचर्या', 'समय',
        'औषध', 'औषधे', 'गोळी', 'गोळ्या', 'वेळापत्रक',
        'દવા', 'દવાઓ', 'ગોળી', 'ગોળીઓ', 'સમયપત્રક',
        'ಔಷಧ', 'ಮಾತ್ರೆ', 'ಮಾತ್ರೆಗಳು', 'ವೇಳಾಪಟ್ಟಿ', 'ದಿನಚರಿ',
        'മരുന്ന്', 'മരുന്നുകൾ', 'ഗുളിക', 'ദിനചര്യ'
      ]);
      if (isRoutine) {
        let lang = currentVoiceLang || 'hi';
        if (isMalayalam || has(['marunnu', 'marunnukal', 'gulika'])) lang = 'ml';
        else if (isKannada || has(['aushadha', 'maatre', 'maatregalu'])) lang = 'kn';
        else if (isGujarati || has(['dava', 'davao', 'golio', 'samaypatrak'])) lang = 'gu';
        else if (has(['aushadh', 'aushadhe', 'golya', 'velpatrak', 'औषध', 'गोळी'])) lang = 'mr';
        else if (has(['dawa', 'dawaii', 'goli', 'दवा', 'दवाई', 'दिनचर्या'])) lang = (currentVoiceLang === 'raj' ? 'raj' : 'hi');
        else if (has(['routine', 'medicine', 'medication', 'pill', 'pills', 'schedule'])) lang = currentVoiceLang;
        return { intent: 'routine', lang, page: 'routine' };
      }

      // 6. MOVEMENT & SPEECH THERAPY INTENT
      // Matches "chalna" in Hindi, "chalne" in Marathi, "chalvu" in Gujarati, "nadige" in Kannada, "nadatham" in Malayalam, "walking" in English
      const isMovement = has([
        'speech', 'loud', 'vocal', 'freeze', 'gait', 'metronome', 'walk', 'walking', 'movement',
        'chalna', 'bolna', 'aawaz', 'vyayam', 'kampan', 'pair', 'kadam',
        'chalne', 'paul', 'bhashan', 'tharkap',
        'chalvu', 'paglu', 'dhrujari',
        'nadige', 'hejje', 'dhwani', 'maatu', 'naduka',
        'nadatham', 'chuvadu', 'shabdam', 'samsaaram', 'virayal',
        'chalno',
        'चलना', 'कदम', 'आवाज', 'बोलना', 'व्यायाम', 'कंपन',
        'चालणे', 'पाऊल', 'भाषण', 'थरकाप',
        'ચાલવું', 'પગલું', 'બોલવું', 'ધ્રુજારી',
        'ನಡಿಗೆ', 'ಹೆಜ್ಜೆ', 'ಧ್ವನಿ', 'ಮಾತು', 'ನಡುಕ',
        'നടത്തം', 'ചുവട്', 'ശബ്ദം', 'സംസാരം', 'വിറയൽ',
        'चालणो'
      ]);
      if (isMovement) {
        let lang = currentVoiceLang || 'hi';
        if (isMalayalam || has(['nadatham', 'chuvadu', 'samsaaram', 'virayal'])) lang = 'ml';
        else if (isKannada || has(['nadige', 'hejje', 'dhwani', 'maatu', 'naduka'])) lang = 'kn';
        else if (isGujarati || has(['chalvu', 'paglu', 'dhrujari'])) lang = 'gu';
        else if (has(['chalne', 'paul', 'bhashan', 'tharkap', 'चालणे'])) lang = 'mr';
        else if (has(['chalno', 'चालणो'])) lang = 'raj';
        else if (isDevanagari || has(['chalna', 'bolna', 'aawaz', 'vyayam', 'kadam'])) lang = 'hi';
        else if (has(['walk', 'walking', 'speech', 'loud', 'gait', 'metronome'])) lang = currentVoiceLang;
        return { intent: 'movement', lang, page: 'movement' };
      }

      // 7. NUTRITION & LEVODOPA GUIDE
      // Matches "khana" in Hindi, "jevan" in Marathi, "khorak" in Gujarati, "oota" in Kannada, "bhakshanam" in Malayalam, "food" in English
      const isNutrition = has([
        'food', 'diet', 'nutrition', 'protein', 'meal', 'eating',
        'khana', 'bhojan', 'aahar', 'poshan',
        'jevan', 'ann',
        'khorak', 'jamvanu',
        'oota', 'aahara', 'thindi',
        'bhakshanam', 'aahaaram',
        'खाना', 'भोजन', 'आहार', 'पोषण',
        'जेवण', 'अन्न',
        'ખોરાક', 'જમવાનું',
        'ಊಟ', 'ಆಹಾರ',
        'ഭക്ഷണം', 'ആഹാരം'
      ]);
      if (isNutrition) {
        let lang = currentVoiceLang || 'hi';
        if (isMalayalam || has(['bhakshanam', 'aahaaram'])) lang = 'ml';
        else if (isKannada || has(['oota', 'thindi'])) lang = 'kn';
        else if (isGujarati || has(['khorak', 'jamvanu'])) lang = 'gu';
        else if (has(['jevan', 'ann', 'जेवण'])) lang = 'mr';
        else if (isDevanagari || has(['khana', 'bhojan', 'aahar'])) lang = 'hi';
        else if (has(['food', 'diet', 'nutrition', 'protein', 'meal'])) lang = currentVoiceLang;
        return { intent: 'nutrition', lang, page: 'nutrition' };
      }

      // 8. CALENDAR HUB
      const isCalendar = has([
        'calendar', 'month', 'history', 'adherence', 'date',
        'tareekh', 'taarikh', 'mahina', 'dinanka', 'thingalu', 'theeyathi', 'maasam',
        'कैलेंडर', 'तारीख', 'महीना',
        'કૅલેન્ડર', 'તારીખ',
        'ಕ್ಯಾಲೆಂಡರ್', 'ದಿನಾಂಕ',
        'കലണ്ടർ', 'തീയതി'
      ]);
      if (isCalendar) {
        let lang = currentVoiceLang || 'en';
        if (isMalayalam || has(['theeyathi', 'maasam'])) lang = 'ml';
        else if (isKannada || has(['dinanka', 'thingalu'])) lang = 'kn';
        else if (isGujarati) lang = 'gu';
        else if (isDevanagari || has(['tareekh', 'taarikh', 'mahina'])) lang = 'hi';
        return { intent: 'calendar', lang, page: 'calendar-hub' };
      }

      return null;
    }


