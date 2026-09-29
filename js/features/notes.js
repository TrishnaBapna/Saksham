/* ======================================================================= */
/* SAKSHAM PERSONAL NOTES SERVICE (VOICE DICTATION & MULTILINGUAL VOCAL)   */
/* ======================================================================= */

window.SakshamNotes = (function() {
  const STORAGE_KEY = 'saksham_personal_notes';

  const LANGUAGE_OPTIONS = [
    { code: 'hi-IN', name: 'हिन्दी (Hindi)', flag: '🇮🇳' },
    { code: 'en-IN', name: 'English (India)', flag: '🇮🇳' },
    { code: 'mr-IN', name: 'मराठी (Marathi)', flag: '🇮🇳' },
    { code: 'gu-IN', name: 'ગુજરાતી (Gujarati)', flag: '🇮🇳' },
    { code: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
    { code: 'ta-IN', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
    { code: 'te-IN', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
    { code: 'bn-IN', name: 'বাংলা (Bengali)', flag: '🇮🇳' },
    { code: 'ml-IN', name: 'മലയാളം (Malayalam)', flag: '🇮🇳' },
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
    { code: 'es-ES', name: 'Español (Spanish)', flag: '🇪🇸' },
    { code: 'fr-FR', name: 'Français (French)', flag: '🇫🇷' },
    { code: 'de-DE', name: 'Deutsch (German)', flag: '🇩🇪' },
    { code: 'ar-SA', name: 'العربية (Arabic)', flag: '🇸🇦' }
  ];

  const CATEGORY_TAGS = [
    { id: 'health', label: '🩺 Health & Tremor', color: 'rose' },
    { id: 'general', label: '💡 General Thought', color: 'emerald' },
    { id: 'medication', label: '💊 Medication Log', color: 'amber' },
    { id: 'doctor', label: '👨‍⚕️ Doctor Query', color: 'sky' },
    { id: 'gratitude', label: '🌸 Calm & Gratitude', color: 'purple' },
    { id: 'family', label: '🏡 Family Memory', color: 'teal' }
  ];

  let notes = [];
  let recognition = null;
  let isDictating = false;
  let dictationStopRequested = false;
  let currentDictationLang = 'hi-IN';
  let currentlyPlayingNoteId = null;
  let selectedTag = 'general';

  /* ======================================================================= */
  /* INITIALIZATION & STORAGE                                                */
  /* ======================================================================= */

  function init() {
    loadLocalNotes();
  }

  function loadLocalNotes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        notes = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[Saksham Notes] Error loading local notes:', e);
      notes = [];
    }
  }

  function saveLocalNotes() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      console.warn('[Saksham Notes] Error saving local notes:', e);
    }
    updateNotesCountBadge();
  }

  function seedDefaultNotes() {
    const now = new Date();
    notes = [
      {
        id: 'note_seed_1',
        title: 'Morning Tremor Observation',
        content: 'आज सुबह चाय पीते समय हाथ में कम कंपकंपी महसूस हुई। प्राणायाम से शांति मिली।',
        lang: 'hi-IN',
        langName: 'हिन्दी (Hindi)',
        tag: 'health',
        createdAt: new Date(now.getTime() - 3600000 * 4).toISOString(),
        updatedAt: new Date(now.getTime() - 3600000 * 4).toISOString()
      },
      {
        id: 'note_seed_2',
        title: 'Question for Dr. Verma Next Visit',
        content: 'Ask if evening dose of Syndopa should be taken before dinner or 1 hour after dinner.',
        lang: 'en-IN',
        langName: 'English (India)',
        tag: 'doctor',
        createdAt: new Date(now.getTime() - 3600000 * 24).toISOString(),
        updatedAt: new Date(now.getTime() - 3600000 * 24).toISOString()
      }
    ];
    saveLocalNotes();
  }

  /* ======================================================================= */
  /* FIRESTORE CLOUD SYNCHRONIZATION                                         */
  /* ======================================================================= */

  async function syncNoteToFirestore(note) {
    try {
      if (window.firebase && firebase.firestore) {
        const active = JSON.parse(localStorage.getItem('saksham_active_user') || 'null');
        const uid = active ? (active.firebaseUid || active.id) : null;
        if (!uid) return;

        const db = firebase.firestore();
        await db.collection('users').doc(uid).collection('notes').doc(note.id).set({
          id: note.id,
          title: note.title,
          content: note.content,
          lang: note.lang,
          langName: note.langName,
          tag: note.tag,
          createdAt: note.createdAt,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    } catch (err) {
      console.log('[Saksham Notes] Firestore sync note:', err.message);
    }
  }

  async function deleteNoteFromFirestore(noteId) {
    try {
      if (window.firebase && firebase.firestore) {
        const active = JSON.parse(localStorage.getItem('saksham_active_user') || 'null');
        const uid = active ? (active.firebaseUid || active.id) : null;
        if (!uid) return;

        const db = firebase.firestore();
        await db.collection('users').doc(uid).collection('notes').doc(noteId).delete();
      }
    } catch (err) {
      console.log('[Saksham Notes] Firestore delete note:', err.message);
    }
  }

  /* ======================================================================= */
  /* VOICE DICTATION (SPEECH-TO-TEXT IN ANY LANGUAGE)                        */
  /* ======================================================================= */

  function toggleDictation() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please type your note using the keyboard.");
      return;
    }

    if (isDictating) {
      stopDictation();
    } else {
      startDictation();
    }
  }

  function startDictation() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Get currently selected language from dropdown
    const langSelect = document.getElementById('noteVoiceLangSelect');
    currentDictationLang = langSelect ? langSelect.value : 'hi-IN';

    // Cancel any active speech synthesis so audio output doesn't feed into input
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    try {
      dictationStopRequested = false;
      recognition = new SpeechRecognition();
      recognition.lang = currentDictationLang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isDictating = true;
        updateDictationUI(true);
        try { if (window.playAudioChime) playAudioChime('chime'); } catch (e) {}
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const contentEl = document.getElementById('noteContentInput');
        const interimEl = document.getElementById('noteDictationInterimText');

        if (contentEl && finalTranscript) {
          const currentVal = contentEl.value.trim();
          contentEl.value = currentVal ? (currentVal + ' ' + finalTranscript.trim()) : finalTranscript.trim();
        }

        if (interimEl) {
          interimEl.innerText = interimTranscript ? `“${interimTranscript}”` : '';
        }
      };

      recognition.onerror = (err) => {
        console.warn('[Saksham Notes] Dictation error:', err.error);
        if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(err.error)) {
          dictationStopRequested = true;
          stopDictation();
        }
      };

      recognition.onend = () => {
        if (isDictating && !dictationStopRequested) {
          // Mobile browsers end recognition after silence; resume the same dictation session.
          setTimeout(() => {
            if (!isDictating || dictationStopRequested || !recognition) return;
            try { recognition.start(); } catch (e) {}
          }, 150);
        } else if (isDictating) {
          isDictating = false;
          updateDictationUI(false);
        }
      };

      recognition.start();
    } catch (err) {
      console.error('[Saksham Notes] Failed to start recognition:', err);
      isDictating = false;
      updateDictationUI(false);
    }
  }

  function stopDictation() {
    isDictating = false;
    dictationStopRequested = true;
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
      recognition = null;
    }
    updateDictationUI(false);
    try { if (window.playAudioChime) playAudioChime('tap'); } catch (e) {}
  }

  function updateDictationUI(listening) {
    const btn = document.getElementById('btnNoteDictation');
    const statusTxt = document.getElementById('noteDictationStatusTxt');
    const waveEl = document.getElementById('noteDictationWaves');
    const interimEl = document.getElementById('noteDictationInterimText');
    const langSelect = document.getElementById('noteVoiceLangSelect');
    const selOption = langSelect ? langSelect.options[langSelect.selectedIndex]?.text : 'Selected Language';

    if (btn) {
      if (listening) {
        btn.className = "w-full p-4 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white font-black text-sm shadow-lg flex items-center justify-between transition-all animate-pulse border-2 border-rose-300 cursor-pointer active:scale-98";
      } else {
        btn.className = "w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-[#1B4225] hover:opacity-95 text-white font-black text-sm shadow-md flex items-center justify-between transition-all border-2 border-emerald-400/60 cursor-pointer active:scale-98";
      }
    }

    if (statusTxt) {
      if (listening) {
        statusTxt.innerHTML = `<span class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-white animate-ping"></span><span>🔴 Listening in ${selOption}... Speak now!</span></span>`;
      } else {
        statusTxt.innerHTML = `<span class="flex items-center gap-2"><i class="fa-solid fa-microphone text-amber-300 text-base"></i><span>Tap to Dictate (Speak in ${selOption})</span></span>`;
      }
    }

    if (waveEl) {
      waveEl.style.display = listening ? 'flex' : 'none';
    }

    if (interimEl && !listening) {
      interimEl.innerText = '';
    }
  }

  /* ======================================================================= */
  /* VOCAL PLAYBACK (TEXT-TO-SPEECH IN ANY LANGUAGE)                         */
  /* ======================================================================= */

  function speakNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.content) return;

    if (currentlyPlayingNoteId === noteId) {
      stopSpeakingNote();
      return;
    }

    stopSpeakingNote();
    currentlyPlayingNoteId = noteId;

    const fullUtterance = (note.title ? note.title + '. ' : '') + note.content;

    if (window.speakText) {
      window.speakText(fullUtterance, note.lang);
    }

    updatePlayButtonsUI();

    // Check when speech ends to reset playback buttons
    if ('speechSynthesis' in window) {
      const checkEnd = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          currentlyPlayingNoteId = null;
          updatePlayButtonsUI();
          clearInterval(checkEnd);
        }
      }, 300);
    }
  }

  function stopSpeakingNote() {
    currentlyPlayingNoteId = null;
    if (window.stopSpeaking) {
      window.stopSpeaking();
    }
    updatePlayButtonsUI();
  }

  function testVocalPlayback() {
    const content = (document.getElementById('noteContentInput')?.value || '').trim();
    const title = (document.getElementById('noteTitleInput')?.value || '').trim();
    const langSelect = document.getElementById('noteVoiceLangSelect');
    const lang = langSelect ? langSelect.value : 'hi-IN';

    const textToSpeak = (title ? title + '. ' : '') + (content || 'Hello, this is a vocal test of your personal note.');

    if (window.speakText) {
      window.speakText(textToSpeak, lang);
    }
  }

  function updatePlayButtonsUI() {
    notes.forEach(n => {
      const btn = document.getElementById(`btnPlayNote_${n.id}`);
      if (!btn) return;
      if (currentlyPlayingNoteId === n.id) {
        btn.innerHTML = '<i class="fa-solid fa-stop text-rose-500"></i> Stop Vocal';
        btn.className = 'px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs border border-rose-300 flex items-center gap-1.5 transition cursor-pointer';
      } else {
        btn.innerHTML = '<i class="fa-solid fa-volume-high text-teal-600"></i> Read Aloud';
        btn.className = 'px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-black text-xs border border-teal-200 flex items-center gap-1.5 transition cursor-pointer';
      }
    });
  }

  /* ======================================================================= */
  /* CRUD OPERATIONS                                                         */
  /* ======================================================================= */

  async function saveNote() {
    const titleInput = document.getElementById('noteTitleInput');
    const contentInput = document.getElementById('noteContentInput');
    const langSelect = document.getElementById('noteVoiceLangSelect');

    const title = (titleInput?.value || '').trim();
    const content = (contentInput?.value || '').trim();

    if (!content) {
      alert("Please type or speak some content for your note first.");
      if (contentInput) contentInput.focus();
      return;
    }

    const langCode = langSelect ? langSelect.value : 'hi-IN';
    const langObj = LANGUAGE_OPTIONS.find(l => l.code === langCode) || { name: 'हिन्दी (Hindi)' };

    const newNote = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: title || (content.length > 30 ? content.substring(0, 30) + '…' : 'Personal Note'),
      content: content,
      lang: langCode,
      langName: langObj.name,
      tag: selectedTag || 'general',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Prepend new note to the list
    notes.unshift(newNote);
    saveLocalNotes();

    // Async sync to Firestore
    syncNoteToFirestore(newNote);

    // Audio & UX feedback
    try { if (window.playAudioChime) playAudioChime('fanfare'); } catch (e) {}

    // Clear form
    if (titleInput) titleInput.value = '';
    if (contentInput) contentInput.value = '';

    // Switch to Saved Notes tab and render
    switchTab('list');
    renderNotesList();
  }

  async function deleteNote(noteId) {
    if (!confirm("Are you sure you want to delete this personal note?")) return;

    if (currentlyPlayingNoteId === noteId) {
      stopSpeakingNote();
    }

    notes = notes.filter(n => n.id !== noteId);
    saveLocalNotes();
    deleteNoteFromFirestore(noteId);

    try { if (window.playAudioChime) playAudioChime('tap'); } catch (e) {}
    renderNotesList();
  }

  function copyNoteContent(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const fullText = (note.title ? note.title + '\n' : '') + note.content;
    navigator.clipboard.writeText(fullText).then(() => {
      alert("Note copied to clipboard! ✓");
    }).catch(() => {
      alert("Note: " + fullText);
    });
  }

  /* ======================================================================= */
  /* MODAL DISPLAY & TAB CONTROLLERS                                         */
  /* ======================================================================= */

  function openModal(defaultTab = 'create') {
    const modal = document.getElementById('personalNotesModal');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden'; // kept for notes modal scope
    window.lockScroll();

    // Populate language options in select if empty
    populateLanguageSelect();
    populateCategoryTags();

    switchTab(defaultTab);
    renderNotesList();
    updateNotesCountBadge();
  }

  function closeModal() {
    const modal = document.getElementById('personalNotesModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    document.body.style.overflow = '';
    window.unlockScroll();

    stopDictation();
    stopSpeakingNote();
  }

  function switchTab(tab) {
    const secCreate = document.getElementById('notesSectionCreate');
    const secList = document.getElementById('notesSectionList');
    const tabBtnCreate = document.getElementById('notesTabBtnCreate');
    const tabBtnList = document.getElementById('notesTabBtnList');

    if (tab === 'create') {
      if (secCreate) secCreate.classList.remove('hidden');
      if (secList) secList.classList.add('hidden');

      if (tabBtnCreate) {
        tabBtnCreate.className = 'flex-1 py-2.5 px-4 rounded-xl font-black text-xs bg-[#1B4225] text-white shadow-sm flex items-center justify-center gap-2 transition cursor-pointer';
      }
      if (tabBtnList) {
        tabBtnList.className = 'flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2 transition cursor-pointer border border-[#DDDAB3]';
      }
    } else {
      if (secCreate) secCreate.classList.add('hidden');
      if (secList) secList.classList.remove('hidden');

      if (tabBtnCreate) {
        tabBtnCreate.className = 'flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2 transition cursor-pointer border border-[#DDDAB3]';
      }
      if (tabBtnList) {
        tabBtnList.className = 'flex-1 py-2.5 px-4 rounded-xl font-black text-xs bg-[#1B4225] text-white shadow-sm flex items-center justify-center gap-2 transition cursor-pointer';
      }
      renderNotesList();
    }
  }

  function selectCategoryTag(tagId) {
    selectedTag = tagId;
    populateCategoryTags();
  }

  function populateCategoryTags() {
    const container = document.getElementById('noteCategoryChipsContainer');
    if (!container) return;

    container.innerHTML = CATEGORY_TAGS.map(t => {
      const isSelected = selectedTag === t.id;
      const baseClass = "px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ";
      const activeClass = isSelected
        ? "bg-[#1B4225] text-white shadow-sm ring-2 ring-[#9FC57C]"
        : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200";

      return `<button type="button" onclick="window.SakshamNotes.selectCategoryTag('${t.id}')" class="${baseClass} ${activeClass}">
        ${t.label}
      </button>`;
    }).join('');
  }

  function populateLanguageSelect() {
    const select = document.getElementById('noteVoiceLangSelect');
    if (!select || select.children.length > 0) return;

    // Detect user's current app language to set sensible default
    const savedLang = localStorage.getItem('saksham_lang') || 'hi';
    const defaultCode = savedLang === 'en' ? 'en-IN' : (savedLang === 'mr' ? 'mr-IN' : (savedLang === 'gu' ? 'gu-IN' : (savedLang === 'kn' ? 'kn-IN' : (savedLang === 'ta' ? 'ta-IN' : (savedLang === 'te' ? 'te-IN' : (savedLang === 'bn' ? 'bn-IN' : 'hi-IN'))))));

    select.innerHTML = LANGUAGE_OPTIONS.map(opt => {
      const sel = opt.code === defaultCode ? 'selected' : '';
      return `<option value="${opt.code}" ${sel}>${opt.flag} ${opt.name}</option>`;
    }).join('');

    currentDictationLang = defaultCode;
    updateDictationUI(false);
  }

  function handleLanguageChange(newCode) {
    currentDictationLang = newCode;
    updateDictationUI(false);
  }

  function updateNotesCountBadge() {
    const countBadge = document.getElementById('notesCountBadge');
    if (countBadge) {
      countBadge.innerText = notes.length;
    }
  }

  /* ======================================================================= */
  /* RENDERING SAVED NOTES LIST                                              */
  /* ======================================================================= */

  function renderNotesList() {
    const container = document.getElementById('savedNotesListContainer');
    const searchInput = document.getElementById('notesSearchInput');
    const filterTagSelect = document.getElementById('notesFilterTagSelect');
    if (!container) return;

    const searchTerm = (searchInput?.value || '').toLowerCase().trim();
    const filterTag = filterTagSelect ? filterTagSelect.value : 'all';

    let filtered = notes.slice();

    if (filterTag && filterTag !== 'all') {
      filtered = filtered.filter(n => n.tag === filterTag);
    }

    if (searchTerm) {
      filtered = filtered.filter(n => 
        (n.title && n.title.toLowerCase().includes(searchTerm)) ||
        (n.content && n.content.toLowerCase().includes(searchTerm)) ||
        (n.langName && n.langName.toLowerCase().includes(searchTerm))
      );
    }

    updateNotesCountBadge();

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center bg-white rounded-3xl border border-dashed border-[#DDDAB3] space-y-3">
          <div class="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mx-auto shadow-inner">
            <i class="fa-solid fa-microphone-lines"></i>
          </div>
          <div>
            <h4 class="font-black text-sm text-[#1B4225]">No personal notes found</h4>
            <p class="text-xs text-slate-500 mt-0.5">
              ${searchTerm ? 'Try a different search word' : 'Speak or type your first personal note now!'}
            </p>
          </div>
          <button type="button" onclick="window.SakshamNotes.switchTab('create')" class="px-4 py-2 bg-gradient-to-r from-[#1B4225] to-[#387D82] text-white font-black text-xs rounded-xl shadow transition cursor-pointer">
            <i class="fa-solid fa-plus mr-1"></i> Create Voice Note
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(note => {
      const dateStr = note.createdAt ? new Date(note.createdAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : '';

      const tagObj = CATEGORY_TAGS.find(t => t.id === note.tag) || { label: '💡 General', color: 'emerald' };
      const isPlaying = currentlyPlayingNoteId === note.id;

      return `
        <div class="p-4 rounded-2xl bg-white border border-[#DDDAB3] shadow-xs space-y-2.5 transition hover:border-[#387D82] relative">
          <!-- Card Header -->
          <div class="flex flex-wrap items-center justify-between gap-1.5">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                ${tagObj.label}
              </span>
              <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                🗣️ ${note.langName || note.lang}
              </span>
            </div>
            <span class="text-[10px] text-slate-400 font-bold">${dateStr}</span>
          </div>

          <!-- Note Title -->
          <h4 class="text-xs font-black text-[#1B4225]">${note.title || 'Untitled Note'}</h4>

          <!-- Note Content Body -->
          <p class="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">${note.content}</p>

          <!-- Card Actions (Vocal Read Aloud, Copy, Delete) -->
          <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div class="flex items-center gap-1.5">
              <button type="button" id="btnPlayNote_${note.id}" onclick="window.SakshamNotes.speakNote('${note.id}')" class="px-3 py-1.5 rounded-xl ${isPlaying ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-teal-50 text-teal-800 border-teal-200'} hover:bg-teal-100 font-black text-xs border flex items-center gap-1.5 transition cursor-pointer">
                <i class="fa-solid ${isPlaying ? 'fa-stop text-rose-500' : 'fa-volume-high text-teal-600'}"></i>
                <span>${isPlaying ? 'Stop Vocal' : 'Read Aloud'}</span>
              </button>
              <button type="button" onclick="window.SakshamNotes.copyNoteContent('${note.id}')" class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer" title="Copy text">
                <i class="fa-solid fa-copy"></i>
              </button>
            </div>

            <button type="button" onclick="window.SakshamNotes.deleteNote('${note.id}')" class="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 font-bold text-xs transition cursor-pointer" title="Delete note">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Initialize on script load
  init();

  return {
    init,
    openModal,
    closeModal,
    switchTab,
    toggleDictation,
    stopDictation,
    speakNote,
    stopSpeakingNote,
    testVocalPlayback,
    saveNote,
    deleteNote,
    copyNoteContent,
    selectCategoryTag,
    handleLanguageChange,
    renderNotesList,
    getNotes: () => notes
  };
})();

// Global shortcuts for onclick handlers
window.openPersonalNotesModal = function(tab = 'create') {
  if (window.SakshamNotes) window.SakshamNotes.openModal(tab);
};
window.closePersonalNotesModal = function() {
  if (window.SakshamNotes) window.SakshamNotes.closeModal();
};

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const modal = document.getElementById('personalNotesModal');
    if (modal && !modal.classList.contains('hidden')) {
      window.closePersonalNotesModal();
    }
  }
});
