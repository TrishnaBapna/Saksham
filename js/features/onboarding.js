/* ======================================================================= */
/* SAKSHAM PERSONALIZED DISEASE-BASED PATIENT ONBOARDING & CARE MODULES     */
/* Supports: Parkinson's, Alzheimer's, Dementia, Other / Not Diagnosed     */
/* ======================================================================= */

window.SakshamOnboarding = (function() {

  // Dynamic modules configuration mapped by condition
  const DISEASE_MODULES = {
    parkinsons: [
      "mindClinic",
      "movement",
      "speech",
      "articles",
      "calendar",
      "safepath"
    ],
    alzheimers: [
      "routine",
      "mindClinic",
      "lovedOnesPeace",
      "articles",
      "calendar",
      "safepath"
    ],
    dementia: [
      "routine",
      "mindClinic",
      "lovedOnesPeace",
      "movement",
      "speech",
      "articles",
      "calendar",
      "safepath"
    ],
    parkinsons_dementia: [
      "routine",
      "mindClinic",
      "lovedOnesPeace",
      "movement",
      "speech",
      "articles",
      "calendar",
      "safepath"
    ],
    other: [
      "routine",
      "mindClinic",
      "lovedOnesPeace",
      "movement",
      "speech",
      "articles",
      "calendar",
      "safepath"
    ]
  };

  const DISEASE_CONFIGS = {
    parkinsons: {
      name: "Parkinson's Disease",
      icon: "fa-solid fa-person-walking",
      badgeColor: "bg-teal-50 text-teal-900 border-teal-300",
      pillBadge: "bg-teal-700 text-teal-50",
      tagline: "Focused care for mind clinic games, movement & speech therapy, articles and calendar.",
      mindClinicFocus: "Visual agility, math rhythm & coordination drills",
      movementFocus: "Tremor stability monitoring, range of motion & stride pacing",
      speechFocus: "Vocal loudness calibration & articulation cues",
      lovedOnesFocus: "Loved Ones & Peace — familiar memories & calming audio",
      articles: [
        {
          title: "Safe Movement & Freezing-of-Gait Strategies",
          category: "Movement & Motor Safety",
          icon: "fa-solid fa-person-walking",
          readTime: "3 min read",
          summary: "Learn auditory cueing and rhythmic stepping tricks to overcome gait freezing when transitioning through doorways."
        },
        {
          title: "Speech Clarity & Loudness Calibration",
          category: "Speech Therapy",
          icon: "fa-solid fa-microphone-lines",
          readTime: "4 min read",
          summary: "Daily high-effort vocal exercises to preserve speech volume, pitch inflection, and conversational confidence."
        },
        {
          title: "Personalized Wellness & Condition Guide",
          category: "Condition Education",
          icon: "fa-solid fa-book-open-reader",
          readTime: "5 min read",
          summary: "A practical condition-specific wellness and educational guide for daily routine support, movement, and caregiver coordination.",
          url: "https://share.google/wH3XQrp7nkuj8fafJ"
        },
        {
          title: "Nutritional Timing: Protein & Levodopa Absorption",
          category: "Dietary Guidance",
          icon: "fa-solid fa-utensils",
          readTime: "3 min read",
          summary: "Why spacing dietary proteins 1 hour apart from morning dopaminergic medications supports smoother absorption."
        }
      ]
    },
    alzheimers: {
      name: "Alzheimer's Disease",
      icon: "fa-solid fa-brain",
      badgeColor: "bg-rose-50 text-rose-900 border-rose-300",
      pillBadge: "bg-rose-700 text-rose-50",
      tagline: "Personalized care for daily routines, mind clinic games, loved ones & peace, articles and calendar.",
      mindClinicFocus: "Familiar photo recall, episodic memory flip & pattern matching",
      movementFocus: "Gentle physical grounding and sensory orientation strolls",
      speechFocus: "Conversational validation and empathetic emotional grounding",
      lovedOnesFocus: "Loved Ones & Peace — familiar people photos, relationship ties & calming voice notes",
      articles: [
        {
          title: "Visual Routine Cues & Object Anchoring",
          category: "Memory Care",
          icon: "fa-solid fa-eye",
          readTime: "3 min read",
          summary: "Reducing cognitive fatigue by establishing predictable daily visual stations and labeled personal spaces."
        },
        {
          title: "Loved Ones & Peace: Fostering Emotional Grounding",
          category: "Family & Social Connection",
          icon: "fa-solid fa-heart",
          readTime: "4 min read",
          summary: "Using multi-sensory familiar face recognition quizzes and audio greetings to relieve disorientation."
        },
        {
          title: "Evening Comfort: Mitigating Sundowning",
          category: "Circadian Health",
          icon: "fa-solid fa-moon",
          readTime: "3 min read",
          summary: "Warm indirect lighting, calming raga music, and scheduled chamomile tea to ease late-afternoon restlessness."
        }
      ]
    },
    dementia: {
      name: "Parkinson's Dementia Disease",
      icon: "fa-solid fa-brain",
      badgeColor: "bg-amber-50 text-amber-900 border-amber-300",
      pillBadge: "bg-amber-700 text-amber-50",
      tagline: "Comprehensive dual-care support for daily routines, mind clinic games, loved ones & peace, movement, speech, articles and calendar.",
      mindClinicFocus: "Cognitive flexibility, audio recall & dual-task agility drills",
      movementFocus: "Gait stability, gentle range of motion & tremor management",
      speechFocus: "Vocal loudness calibration & empathetic validation cues",
      lovedOnesFocus: "Loved Ones & Peace — familiar memories, family audio notes & calming mode",
      articles: [
        {
          title: "Dual Care: Balancing Movement & Memory Health",
          category: "Dual-Care Strategies",
          icon: "fa-solid fa-brain",
          readTime: "4 min read",
          summary: "Holistic pacing combining gentle rhythmic walking cues with calm, familiar memory anchors to minimize fatigue."
        },
        {
          title: "Sensory De-escalation & Quiet Mode Reset",
          category: "Behavioral Wellness",
          icon: "fa-solid fa-wind",
          readTime: "3 min read",
          summary: "Step-by-step 1-minute box breathing and soothing environmental resets during sensory overwhelm."
        },
        {
          title: "Empathetic Communication & Validation Therapy",
          category: "Caregiver Communication",
          icon: "fa-solid fa-comments",
          readTime: "4 min read",
          summary: "Prioritizing emotional truth over factual corrections to maintain dignity and reduce agitation."
        },
        {
          title: "SafePath Geofencing & Wandering Protection",
          category: "Physical Safety",
          icon: "fa-solid fa-location-dot",
          readTime: "3 min read",
          summary: "Balancing outdoor independence with automatic safe-zone perimeter monitoring and immediate caregiver alerts."
        }
      ]
    },
    other: {
      name: "Other / Not Diagnosed",
      icon: "fa-solid fa-spa",
      badgeColor: "bg-emerald-50 text-emerald-900 border-emerald-300",
      pillBadge: "bg-emerald-700 text-emerald-50",
      tagline: "Continue with general Saksham support suite.",
      mindClinicFocus: "Comprehensive cognitive vitality, math agility & memory training",
      movementFocus: "Daily physical exercise reminders and mobility tracking",
      speechFocus: "Speech clarity, pronunciation games & vocal practice",
      lovedOnesFocus: "Loved Ones & Peace — family contacts, voice greetings & social check-ins",
      articles: [
        {
          title: "Everyday Neuroplasticity & Brain Vitality",
          category: "General Cognitive Health",
          icon: "fa-solid fa-seedling",
          readTime: "3 min read",
          summary: "Evidence-based habits: novelty, regular cardiovascular exercise, and structured daily social engagement."
        },
        {
          title: "Hydration & Sleep: The Cognitive Pillars",
          category: "Physical Wellbeing",
          icon: "fa-solid fa-glass-water",
          readTime: "3 min read",
          summary: "Maintaining consistent hydration cues and deep sleep hygiene to prevent brain fog and fatigue."
        },
        {
          title: "Proactive Family & Safety Planning",
          category: "Emergency Readiness",
          icon: "fa-solid fa-shield-halved",
          readTime: "4 min read",
          summary: "Setting up trusted caregiver alerts, emergency contact cards, and SafePath location guardrails."
        }
      ]
    }
  };

  // Alias parkinsons_dementia to dementia config
  DISEASE_CONFIGS.parkinsons_dementia = DISEASE_CONFIGS.dementia;

  let state = {
    step: 1,
    isEditMode: false,
    profile: {
      name: '',
      dob: '',
      phone: '',
      email: ''
    },
    condition: 'parkinsons',
    locationSharing: false,
    locationData: null,
    caregiver: {
      name: '',
      relationship: 'Son',
      phone: '',
      sosAlerts: true,
      locationAccess: true
    }
  };

  /* ---------------------------------------------------------------------- */
  /* INITIALIZATION & ROUTING                                                */
  /* ---------------------------------------------------------------------- */

  function isPatientOnboardingRoute() {
    if (typeof window === 'undefined' || !window.location) return false;
    return (
      window.location.hash === '#patient-onboarding' ||
      window.location.pathname.endsWith('/patient-onboarding') ||
      window.location.pathname.includes('/patient-onboarding')
    );
  }

  function init() {
    // Check if URL (pathname or hash) requests onboarding
    if (isPatientOnboardingRoute()) {
      setTimeout(() => open(false), 200);
    }

    // Listen to hash and browser history popstate changes
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('hashchange', () => {
        if (isPatientOnboardingRoute()) open(false);
      });
      window.addEventListener('popstate', () => {
        if (isPatientOnboardingRoute()) {
          open(false);
        } else {
          const container = document.getElementById('patientOnboardingContainer');
          if (container && !container.classList.contains('hidden')) {
            close();
          }
        }
      });
    }

    // Check if active user needs onboarding (only for new patient with onboardingCompleted === false)
    checkPatientOnboardingRequirement();
  }

  function checkPatientOnboardingRequirement() {
    try {
      const activeStr = localStorage.getItem('saksham_active_user');
      let cond = 'parkinsons';
      if (activeStr) {
        const user = JSON.parse(activeStr);
        if (user.role === 'patient') {
          if (user.onboardingCompleted === false) {
            setTimeout(() => open(false), 300);
            return;
          }
          if (user.condition) cond = user.condition;
        }
      }
      applyDiseaseModules(cond);
    } catch (e) {
      console.warn('[Saksham Onboarding] Check notice:', e);
      applyDiseaseModules('parkinsons');
    }
  }

  /* ---------------------------------------------------------------------- */
  /* OPEN / CLOSE CONTROLLER                                                 */
  /* ---------------------------------------------------------------------- */

  function open(isEditMode = false, startStep = null) {
    state.isEditMode = isEditMode;
    state.step = startStep || (isEditMode ? 2 : 1);

    // Prefill from active user profile if available
    try {
      const activeStr = localStorage.getItem('saksham_active_user');
      if (activeStr) {
        const u = JSON.parse(activeStr);
        state.profile.name = u.name || state.profile.name || '';
        state.profile.email = u.email || state.profile.email || '';
        state.profile.phone = u.phone || u.caregiverPhone || state.profile.phone || '';
        state.profile.dob = u.dateOfBirth || u.dob || state.profile.dob || '';
        if (u.condition) state.condition = u.condition;
        if (typeof u.locationSharing === 'boolean') state.locationSharing = u.locationSharing;
        if (u.caregiverName) {
          state.caregiver.name = u.caregiverName;
          state.caregiver.phone = u.caregiverPhone || '';
        }
      }
    } catch (e) {}

    const container = document.getElementById('patientOnboardingContainer');
    if (!container) return;

    // Dynamically update wizard header text depending on mode
    const titleEl = document.getElementById('obHeaderTitle');
    if (titleEl) {
      titleEl.innerText = isEditMode ? 'Edit Care Profile & Condition 💙' : 'Welcome to Saksham 💙';
    }
    const subEl = document.getElementById('obHeaderSubtitle');
    if (subEl) {
      subEl.innerText = isEditMode ? 'Customize your health condition, alerts, and caregiver preferences.' : "Let's personalize your care experience.";
    }

    // Guarantee login gateway or role security modals never obstruct onboarding
    const gw = document.getElementById('authGatewayScreen');
    if (gw) { gw.classList.add('hidden'); gw.style.display = 'none'; }

    container.classList.remove('hidden');
    container.classList.add('flex');
    container.style.display = 'flex';
    document.body.classList.remove('overflow-hidden'); // ensure class is clean
    if (typeof window.lockScroll === 'function') window.lockScroll();

    renderStep(state.step);

    // Redirect / update URL to /patient-onboarding as specified
    try {
      if (!isEditMode) {
        const basePath = window.location.pathname.replace(/\/patient-onboarding\/?$/, '').replace(/\/$/, '');
        const targetPath = (basePath || '') + '/patient-onboarding';
        try {
          window.history.pushState({ onboarding: true }, 'Saksham Patient Onboarding', targetPath);
        } catch (e) {
          window.location.hash = '#patient-onboarding';
        }
      }
    } catch (e) {}
  }

  function close() {
    const container = document.getElementById('patientOnboardingContainer');
    if (container) {
      container.classList.add('hidden');
      container.classList.remove('flex');
      container.style.display = 'none';
    }
    document.body.classList.remove('overflow-hidden');
    if (typeof window.unlockScroll === 'function') window.unlockScroll();
    if (typeof window.forceUnlockScroll === 'function') window.forceUnlockScroll(); // reset counter fully on close

    // Clean URL /patient-onboarding or hash back to base route
    try {
      if (window.location.pathname.includes('/patient-onboarding')) {
        const cleanPath = window.location.pathname.replace(/\/patient-onboarding\/?$/, '') || '/';
        window.history.pushState({}, '', cleanPath + window.location.search);
      } else if (window.location.hash === '#patient-onboarding') {
        window.history.pushState({}, '', window.location.pathname + window.location.search);
      }
    } catch (e) {}
  }

  /* ---------------------------------------------------------------------- */
  /* STEP RENDERER & PROGRESS BAR                                            */
  /* ---------------------------------------------------------------------- */

  function setStep(stepNum) {
    if (stepNum < 1 || stepNum > 5) return;

    // Validate step 1 before advancing
    if (state.step === 1 && stepNum > 1) {
      const nameInput = document.getElementById('obFullName');
      const dobInput = document.getElementById('obDob');
      const phoneInput = document.getElementById('obPhone');
      const emailInput = document.getElementById('obEmail');

      if (nameInput) state.profile.name = nameInput.value.trim();
      if (dobInput) state.profile.dob = dobInput.value;
      if (phoneInput) state.profile.phone = phoneInput.value.trim();
      if (emailInput) state.profile.email = emailInput.value.trim();

      if (!state.profile.name) {
        alert("Please enter your full name to personalize your care experience.");
        if (nameInput) nameInput.focus();
        return;
      }
    }

    // Capture caregiver inputs if advancing from step 4
    if (state.step === 4 && stepNum > 4) {
      captureCaregiverForm();
    }

    state.step = stepNum;
    renderStep(stepNum);

    // Play subtle audio cue
    try {
      if (window.playAudioChime) playAudioChime('chime');
    } catch (e) {}
  }

  function renderStep(step) {
    // Update progress steps UI
    updateProgressBar(step);

    // Toggle step contents
    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById(`obStep${i}`);
      if (el) {
        if (i === step) {
          el.classList.remove('hidden');
          el.classList.add('block');
        } else {
          el.classList.add('hidden');
          el.classList.remove('block');
        }
      }
    }

    // Step-specific initializers
    if (step === 1) {
      const nameInput = document.getElementById('obFullName');
      const dobInput = document.getElementById('obDob');
      const phoneInput = document.getElementById('obPhone');
      const emailInput = document.getElementById('obEmail');
      if (nameInput && state.profile.name) nameInput.value = state.profile.name;
      if (dobInput && state.profile.dob) dobInput.value = state.profile.dob;
      if (phoneInput && state.profile.phone) phoneInput.value = state.profile.phone;
      if (emailInput && state.profile.email) emailInput.value = state.profile.email;
    } else if (step === 2) {
      highlightSelectedConditionCard(state.condition);
    } else if (step === 3) {
      updateLocationStepUI();
    } else if (step === 4) {
      const cgName = document.getElementById('obCgName');
      const cgRel = document.getElementById('obCgRelationship');
      const cgPhone = document.getElementById('obCgPhone');
      const cgSos = document.getElementById('obCgSosAlerts');
      const cgLoc = document.getElementById('obCgLocationAccess');
      if (cgName && state.caregiver.name) cgName.value = state.caregiver.name;
      if (cgRel && state.caregiver.relationship) cgRel.value = state.caregiver.relationship;
      if (cgPhone && state.caregiver.phone) cgPhone.value = state.caregiver.phone;
      if (cgSos) cgSos.checked = state.caregiver.sosAlerts;
      if (cgLoc) cgLoc.checked = state.caregiver.locationAccess;
    } else if (step === 5) {
      renderSummaryStep();
    }
  }

  function updateProgressBar(step) {
    const steps = [
      { id: 'obProgressPill1', num: 1, label: 'Profile' },
      { id: 'obProgressPill2', num: 2, label: 'Care Profile' },
      { id: 'obProgressPill3', num: 3, label: 'Safety' },
      { id: 'obProgressPill4', num: 4, label: 'Caregiver' },
      { id: 'obProgressPill5', num: 5, label: 'Complete' }
    ];

    steps.forEach((s) => {
      const el = document.getElementById(s.id);
      if (!el) return;
      el.style.cursor = 'pointer';
      el.onclick = () => setStep(s.num);
      if (s.num < step) {
        // Completed step
        el.className = "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1B4225] text-white border border-[#9FC57C] cursor-pointer hover:opacity-90 transition";
        el.innerHTML = `<i class="fa-solid fa-check text-[10px] text-[#9FC57C]"></i> <span class="hidden sm:inline">${s.label}</span>`;
      } else if (s.num === step) {
        // Active step
        el.className = "flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-[#387D82] text-white ring-2 ring-[#9FC57C] shadow-sm cursor-pointer transition";
        el.innerHTML = `<span class="w-4 h-4 rounded-full bg-white text-[#387D82] text-[10px] flex items-center justify-center font-black">${s.num}</span> <span>${s.label}</span>`;
      } else {
        // Upcoming step
        el.className = "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#DDDAB3]/40 text-slate-700 border border-[#DDDAB3] cursor-pointer hover:bg-[#DDDAB3]/70 transition";
        el.innerHTML = `<span class="w-4 h-4 rounded-full bg-[#DDDAB3] text-slate-700 text-[10px] flex items-center justify-center font-bold">${s.num}</span> <span class="hidden sm:inline">${s.label}</span>`;
      }
    });

    const percent = Math.round(((step - 1) / 4) * 100);
    const bar = document.getElementById('obProgressLine');
    if (bar) bar.style.width = `${percent}%`;
  }

  /* ---------------------------------------------------------------------- */
  /* STEP 2: CONDITION SELECTION                                             */
  /* ---------------------------------------------------------------------- */

  function selectCondition(conditionKey) {
    if (!DISEASE_CONFIGS[conditionKey]) return;
    state.condition = conditionKey;
    highlightSelectedConditionCard(conditionKey);

    // Immediately persist selected condition to active session and Firestore
    try {
      const activeStr = localStorage.getItem('saksham_active_user');
      if (activeStr) {
        const u = JSON.parse(activeStr);
        u.condition = conditionKey;
        localStorage.setItem('saksham_active_user', JSON.stringify(u));
        const uid = u.firebaseUid || u.id;
        if (uid && window.dbService && window.dbService.profiles) {
          window.dbService.profiles.update(uid, { condition: conditionKey });
        }
      }
    } catch (e) {}

    // Apply disease modules immediately so dashboard, desktop tabs, bottom bar, and drawer update live
    applyDiseaseModules(conditionKey);

    // Audio confirmation
    try {
      if (window.playAudioChime) playAudioChime('chime');
    } catch (e) {}
  }

  function highlightSelectedConditionCard(selectedKey) {
    const cards = ['parkinsons', 'alzheimers', 'dementia', 'other'];
    cards.forEach(k => {
      const card = document.getElementById(`obConditionCard_${k}`);
      const check = document.getElementById(`obConditionCheck_${k}`);
      if (!card) return;
      if (k === selectedKey) {
        card.classList.remove('border-slate-200', 'bg-white', 'opacity-80');
        card.classList.add('border-[#387D82]', 'bg-[#FCFBF5]', 'ring-2', 'ring-[#387D82]', 'shadow-md');
        if (check) {
          check.className = "w-6 h-6 rounded-full bg-[#1B4225] text-[#9FC57C] flex items-center justify-center text-xs shadow";
          check.innerHTML = '<i class="fa-solid fa-check"></i>';
        }
      } else {
        card.classList.remove('border-[#387D82]', 'bg-[#FCFBF5]', 'ring-2', 'ring-[#387D82]', 'shadow-md');
        card.classList.add('border-slate-200', 'bg-white', 'opacity-80');
        if (check) {
          check.className = "w-6 h-6 rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center text-xs text-transparent";
          check.innerHTML = '';
        }
      }
    });
  }

  /* ---------------------------------------------------------------------- */
  /* STEP 3: SAFETY & LOCATION SHARING                                       */
  /* ---------------------------------------------------------------------- */

  function requestLocationPermission() {
    const feedback = document.getElementById('obLocationFeedback');
    const btn = document.getElementById('obBtnEnableLocation');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Requesting Permission…';
    }

    if (!('geolocation' in navigator)) {
      if (feedback) {
        feedback.innerHTML = `
          <div class="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center gap-2">
            <i class="fa-solid fa-triangle-exclamation text-amber-600"></i>
            <span>Geolocation API is not supported by your current browser. You can still use Saksham safely!</span>
          </div>
        `;
      }
      state.locationSharing = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-location-dot"></i> Enable Location Sharing';
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.locationSharing = true;
        state.locationData = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 15),
          timestamp: Date.now()
        };

        // Notify GPS module
        if (window.SakshamGpsTracker && window.SakshamGpsTracker.startBroadcasterWithConsent) {
          window.SakshamGpsTracker.startBroadcasterWithConsent();
        }

        updateLocationStepUI();
        if (btn) {
          btn.disabled = false;
          btn.className = "px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow flex items-center gap-2";
          btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Location Enabled';
        }
        try { if (window.playAudioChime) playAudioChime('chime'); } catch (e) {}
      },
      (err) => {
        console.warn('[Saksham Onboarding] Geolocation declined/error:', err.message);
        state.locationSharing = false;
        if (feedback) {
          feedback.innerHTML = `
            <div class="p-3 bg-slate-100 border border-slate-300 rounded-xl text-slate-700 text-xs flex items-center gap-2">
              <i class="fa-solid fa-circle-info text-slate-500"></i>
              <span>Location permission was not granted (${err.message}). Location sharing is kept disabled. You can always enable it later.</span>
            </div>
          `;
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-location-dot"></i> Try Again';
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  }

  function skipLocationPermission() {
    state.locationSharing = false;
    updateLocationStepUI();
    setStep(4);
  }

  function updateLocationStepUI() {
    const feedback = document.getElementById('obLocationFeedback');
    if (!feedback) return;

    if (state.locationSharing) {
      const acc = state.locationData ? state.locationData.accuracy : 12;
      feedback.innerHTML = `
        <div class="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs space-y-1.5">
          <div class="flex items-center gap-2 font-black text-emerald-800">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>🟢 Location Sharing Enabled</span>
          </div>
          <p class="text-[11px] text-emerald-700">
            "Your location can be used for safety and emergency assistance."
          </p>
          <div class="text-[10px] text-emerald-600 font-mono bg-white/70 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
            Accuracy: ±${acc}m • Updates throttled to 15–30s or meaningful movement
          </div>
        </div>
      `;
    } else {
      feedback.innerHTML = `
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 text-xs flex items-center gap-2">
          <i class="fa-solid fa-location-cross text-slate-400"></i>
          <span>Location sharing is currently <strong>Inactive</strong>. No GPS coordinates will be recorded.</span>
        </div>
      `;
    }
  }

  /* ---------------------------------------------------------------------- */
  /* STEP 4: CAREGIVER MANAGEMENT                                            */
  /* ---------------------------------------------------------------------- */

  function captureCaregiverForm() {
    const cgName = document.getElementById('obCgName');
    const cgRel = document.getElementById('obCgRelationship');
    const cgPhone = document.getElementById('obCgPhone');
    const cgSos = document.getElementById('obCgSosAlerts');
    const cgLoc = document.getElementById('obCgLocationAccess');

    state.caregiver.name = cgName ? cgName.value.trim() : '';
    state.caregiver.relationship = cgRel ? cgRel.value.trim() : 'Caregiver';
    state.caregiver.phone = cgPhone ? cgPhone.value.trim() : '';
    state.caregiver.sosAlerts = cgSos ? cgSos.checked : true;
    state.caregiver.locationAccess = cgLoc ? cgLoc.checked : true;
  }

  function skipCaregiver() {
    state.caregiver.name = '';
    state.caregiver.phone = '';
    setStep(5);
  }

  /* ---------------------------------------------------------------------- */
  /* STEP 5: SUMMARY & COMPLETION                                            */
  /* ---------------------------------------------------------------------- */

  function renderSummaryStep() {
    const condConfig = DISEASE_CONFIGS[state.condition] || DISEASE_CONFIGS['parkinsons'];

    const summaryCond = document.getElementById('obSummaryCondition');
    const summaryLoc = document.getElementById('obSummaryLocation');
    const summaryCg = document.getElementById('obSummaryCaregiver');

    if (summaryCond) {
      summaryCond.innerHTML = `
        <div class="flex items-center gap-2 font-black text-slate-800">
          <i class="${condConfig.icon} text-[#387D82]"></i>
          <span>${condConfig.name}</span>
        </div>
        <p class="text-[11px] text-slate-500 mt-0.5">${condConfig.tagline}</p>
      `;
    }

    if (summaryLoc) {
      summaryLoc.innerHTML = state.locationSharing
        ? `<span class="inline-flex items-center gap-1.5 font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300">
             <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Enabled (SafePath Active)
           </span>`
        : `<span class="inline-flex items-center gap-1.5 font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
             <span class="w-2 h-2 rounded-full bg-slate-400"></span> Not Enabled
           </span>`;
    }

    if (summaryCg) {
      summaryCg.innerHTML = state.caregiver.name
        ? `<div class="font-black text-slate-800">${state.caregiver.name} <span class="text-xs text-slate-500 font-normal">(${state.caregiver.relationship})</span></div>
           <div class="text-[11px] text-slate-500">${state.caregiver.phone || 'Phone configured'} • SOS alerts enabled</div>`
        : `<div class="font-bold text-slate-500">Skipped for now (Can be added anytime)</div>`;
    }
  }

  async function finishOnboarding() {
    const btn = document.getElementById('obBtnFinish');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Personalizing Saksham Workspace…';
    }

    try {
      // 1. Retrieve active user or create structured object
      let activeUser = {};
      try {
        activeUser = JSON.parse(localStorage.getItem('saksham_active_user') || '{}');
      } catch (e) {}

      const uid = activeUser.firebaseUid || activeUser.id || ('USER-' + Date.now());

      const updatedUser = {
        ...activeUser,
        name: state.profile.name || activeUser.name || 'Saksham Patient',
        role: 'patient',
        dateOfBirth: state.profile.dob || activeUser.dateOfBirth || '',
        phone: state.profile.phone || activeUser.phone || '',
        email: state.profile.email || activeUser.email || '',
        condition: state.condition,
        onboardingCompleted: true,
        locationSharing: Boolean(state.locationSharing),
        caregiverName: state.caregiver.name || activeUser.caregiverName || 'Aarav Sharma',
        caregiverPhone: state.caregiver.phone || activeUser.caregiverPhone || '+91 98765 43210',
        updatedAt: new Date().toISOString()
      };

      // 2. Persist to localStorage active user & registered users list
      localStorage.setItem('saksham_active_user', JSON.stringify(updatedUser));
      try {
        let savedUsers = JSON.parse(localStorage.getItem('saksham_registered_users') || '[]');
        const idx = savedUsers.findIndex(u => (u.firebaseUid === uid || u.id === uid));
        if (idx >= 0) savedUsers[idx] = updatedUser; else savedUsers.push(updatedUser);
        localStorage.setItem('saksham_registered_users', JSON.stringify(savedUsers));
      } catch (e) {}

      // 3. Persist to profiles repository & Firestore
      if (window.dbService && window.dbService.profiles) {
        try {
          await window.dbService.profiles.update(uid, {
            name: updatedUser.name,
            dateOfBirth: updatedUser.dateOfBirth,
            phone: updatedUser.phone,
            email: updatedUser.email,
            role: 'patient',
            condition: updatedUser.condition,
            onboardingCompleted: true,
            locationSharing: updatedUser.locationSharing
          });
        } catch (e) {}
      }

      if (window.firebase && firebase.firestore) {
        try {
          const db = firebase.firestore();
          // Update root user profile
          await db.collection('users').doc(uid).set({
            name: updatedUser.name,
            dateOfBirth: updatedUser.dateOfBirth,
            phone: updatedUser.phone,
            email: updatedUser.email,
            role: 'patient',
            condition: updatedUser.condition,
            onboardingCompleted: true,
            locationSharing: updatedUser.locationSharing,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          // Save caregiver under /users/{uid}/caregivers/{caregiverId}
          if (state.caregiver.name) {
            const cgId = 'cg_' + Date.now();
            await db.collection('users').doc(uid).collection('caregivers').doc(cgId).set({
              name: state.caregiver.name,
              relationship: state.caregiver.relationship,
              phone: state.caregiver.phone,
              sosAlerts: Boolean(state.caregiver.sosAlerts),
              locationAccess: Boolean(state.caregiver.locationAccess),
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
          }

          // Save safety profile under /users/{uid}/safety/profile
          await db.collection('users').doc(uid).collection('safety').doc('profile').set({
            locationSharing: Boolean(state.locationSharing),
            safeZoneEnabled: true,
            safeZone: {
              radiusMeters: 500,
              type: 'Home Base'
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

        } catch (dbErr) {
          console.warn('[Saksham Onboarding] Firestore save notice:', dbErr.message);
        }
      }

      // Update global state and header labels immediately
      if (typeof state !== 'undefined') {
        state.user = updatedUser.name;
        state.condition = updatedUser.condition;
      }
      const lbl = document.getElementById('lblAuthUser');
      if (lbl) lbl.innerText = updatedUser.name;
      const mobLbl = document.getElementById('mobDrawerUserName');
      if (mobLbl) mobLbl.innerText = updatedUser.name;

      // 4. Apply dynamic condition modules to dashboard & nav
      applyDiseaseModules(state.condition);

      // 5. If location sharing is enabled, start SafePath broadcaster
      if (state.locationSharing && window.SakshamSafePath) {
        window.SakshamSafePath.startSharing();
      }

      // 6. Audio celebration & close modal
      try {
        if (window.playAudioChime) playAudioChime('fanfare');
        if (typeof confetti === 'function') {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        }
      } catch (e) {}

      if (typeof showSakshamToast === 'function') {
        showSakshamToast(state.isEditMode ? '✅ Care Profile updated successfully!' : '✅ Saksham care profile ready!', 'success');
      }

      close();

      // Show welcome vocal greeting
      setTimeout(() => {
        try {
          if (window.speakText) {
            const condName = (DISEASE_CONFIGS[state.condition] || {}).name || '';
            window.speakText(`Your personalized Saksham care profile for ${condName} is ready. Welcome, ${updatedUser.name}.`);
          }
        } catch (e) {}
      }, 600);

    } catch (err) {
      console.error('[Saksham Onboarding] finish error:', err);
      alert("Profile personalized locally! Entering dashboard.");
      close();
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Go to My Dashboard →';
      }
    }
  }

  /* ---------------------------------------------------------------------- */
  /* DYNAMIC CONDITION-BASED DASHBOARD MODULE CONTROLLER                     */
  /* ---------------------------------------------------------------------- */

  const CONDITION_TABS = {
    parkinsons: ['games', 'movement', 'nutrition', 'calendar-hub'],
    alzheimers: ['routine', 'games', 'vault', 'nutrition', 'calendar-hub'],
    dementia: ['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub'],
    parkinsons_dementia: ['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub'],
    other: ['routine', 'games', 'vault', 'movement', 'nutrition', 'calendar-hub']
  };

  function applyDiseaseModules(conditionKey) {
    const key = conditionKey || 'parkinsons';
    const modules = DISEASE_MODULES[key] || DISEASE_MODULES['parkinsons'];
    const cfg = DISEASE_CONFIGS[key] || DISEASE_CONFIGS['parkinsons'];
    const allowed = CONDITION_TABS[key] || CONDITION_TABS['parkinsons'];

    console.log(`[Saksham Modules] Applying modules for condition: ${key}`, { modules, allowed });

    // 1. Update Patient Condition Banner in Dashboard
    renderConditionCareBanner(key, cfg);

    // 2. Adjust Desktop Navigation Tabs strictly according to condition specification
    const tabConfig = {
      'routine': {
        id: 'tab-routine',
        html: '<i class="fa-solid fa-list-check"></i> <span data-i18n="nav_routine">1. Daily Routine & Cues</span>'
      },
      'games': {
        id: 'tab-games',
        html: '<i class="fa-solid fa-puzzle-piece text-indigo-500"></i> <span data-i18n="nav_games">2. Mind Clinic Games</span>'
      },
      'vault': {
        id: 'tab-vault',
        html: '<i class="fa-solid fa-heart text-rose-500"></i> <span data-i18n="nav_vault">3. Loved Ones & Peace</span>'
      },
      'movement': {
        id: 'tab-movement',
        html: '<i class="fa-solid fa-person-walking text-teal-600"></i> <span data-i18n="nav_movement">4. Movement & Speech</span>'
      },
      'nutrition': {
        id: 'tab-nutrition',
        html: '<i class="fa-solid fa-book-medical text-amber-500"></i> <span data-i18n="nav_nutrition">5. Articles & Wellbeing</span>'
      },
      'calendar-hub': {
        id: 'tab-calendar-hub',
        html: '<i class="fa-solid fa-calendar-check text-purple-600"></i> <span data-i18n="nav_calendar_hub">6. Calendar & Tracker</span>'
      }
    };

    Object.keys(tabConfig).forEach(tabKey => {
      const btn = document.getElementById(tabConfig[tabKey].id);
      if (btn) {
        if (allowed.includes(tabKey)) {
          btn.classList.remove('hidden');
          btn.innerHTML = tabConfig[tabKey].html;
        } else {
          btn.classList.add('hidden');
        }
      }
    });

    // 3. Ensure active tab is allowed; if not, automatically switch to first allowed tab
    const currentActiveTab = Object.keys(tabConfig).find(t => {
      const v = document.getElementById(`view-${t}`);
      return v && !v.classList.contains('hidden');
    });

    if (!currentActiveTab || !allowed.includes(currentActiveTab)) {
      if (typeof window.switchTab === 'function') {
        window.switchTab(allowed[0]);
      }
    }

    // 4. Update mobile drawer buttons strictly per condition
    if (typeof window.updateMobileDrawerConditionViews === 'function') {
      window.updateMobileDrawerConditionViews(key);
    } else {
      const mobDrawerMovement = document.getElementById('mobDrawerMovementBtn');
      if (mobDrawerMovement) {
        mobDrawerMovement.style.display = (key !== 'alzheimers') ? '' : 'none';
        if (key === 'alzheimers') mobDrawerMovement.classList.add('hidden');
        else mobDrawerMovement.classList.remove('hidden');
      }
      const mobDrawerNutrition = document.getElementById('mobDrawerNutritionBtn');
      if (mobDrawerNutrition) {
        mobDrawerNutrition.style.display = '';
        mobDrawerNutrition.classList.remove('hidden');
        if (key === 'alzheimers') mobDrawerNutrition.classList.add('col-span-2');
        else mobDrawerNutrition.classList.remove('col-span-2');
      }
    }

    // 5. Update mobile bottom navigation bar if active role is patient
    if (typeof window.updateMobileBottomNavForRole === 'function') {
      window.updateMobileBottomNavForRole('patient', key);
    }

    // 3. Inject Condition-Tailored Articles into Nutrition & Wellbeing section
    renderTailoredArticles(key, cfg);

    // 4. Update SafePath Widget on Patient Dashboard
    if (window.SakshamSafePath) {
      window.SakshamSafePath.updatePatientSafePathWidget();
    }
  }

  function renderConditionCareBanner(key, cfg) {
    const bannerContainer = document.getElementById('patientConditionCareBanner');
    if (!bannerContainer) return;
    bannerContainer.innerHTML = '';
  }

  function renderTailoredArticles(key, cfg) {
    const container = document.getElementById('conditionTailoredArticlesContainer');
    if (!container) return;

    const articles = cfg.articles || [];
    container.innerHTML = articles.map(a => `
      <div class="p-4 bg-white rounded-2xl border border-[#DDDAB3] hover:border-[#387D82] transition shadow-xs space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            ${a.category}
          </span>
          <span class="text-[10px] text-slate-400 font-medium">${a.readTime}</span>
        </div>
        <h4 class="text-sm font-black text-slate-900 font-heading">${a.title}</h4>
        <p class="text-xs text-slate-600 line-clamp-2">${a.summary}</p>
        <button onclick="${a.url ? `window.open('${a.url}', '_blank', 'noopener,noreferrer')` : `alert('${a.title}:\\n\\n${a.summary}\\n\\nConsult your attending neurologist or healthcare specialist for personalized treatment pacing.');`}" class="text-xs font-bold text-[#387D82] hover:text-[#1B4225] flex items-center gap-1 transition cursor-pointer">
          Read Guide <i class="fa-solid fa-arrow-right text-[10px]"></i>
        </button>
      </div>
    `).join('');
  }

  /* ---------------------------------------------------------------------- */
  /* PUBLIC API EXPORTS                                                      */
  /* ---------------------------------------------------------------------- */

  return {
    init,
    open,
    close,
    setStep,
    selectCondition,
    requestLocationPermission,
    skipLocationPermission,
    skipCaregiver,
    finishOnboarding,
    applyDiseaseModules,
    getConditionConfig: (k) => DISEASE_CONFIGS[k] || DISEASE_CONFIGS['parkinsons'],
    getModules: () => DISEASE_MODULES,
    getState: () => state
  };

})();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.SakshamOnboarding.init());
} else {
  window.SakshamOnboarding.init();
}
