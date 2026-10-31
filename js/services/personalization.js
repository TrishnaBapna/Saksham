/* ======================================================================= */
/* SAKSHAM 2.0 — PERSONALISATION & SEVEN-DAY TRIAL SERVICE                 */
/* Implements Module 2: Seven-Day Personalisation Trial                    */
/* ======================================================================= */

(function(window) {
  'use strict';

  const STORAGE_KEY_PREFIX = 'saksham_trial_';

  function getKey(userId) {
    return STORAGE_KEY_PREFIX + (userId || 'default');
  }

  const INITIAL_STATE = {
    userId: 'default',
    status: 'not_started', // 'not_started' | 'active' | 'paused' | 'completed'
    currentDay: 1,
    startDate: new Date().toISOString(),
    completedDays: [],
    baselinePreferences: {},
    difficultiesRecorded: [],
    helpfulAssistanceOptions: [],
    unhelpfulAssistanceOptions: [],
    humanAssistanceRequestedTasks: [],
    summaryApprovedByUser: false,
    updatedAt: new Date().toISOString()
  };

  function getTrialState(userId) {
    try {
      const raw = localStorage.getItem(getKey(userId));
      if (!raw) return Object.assign({}, INITIAL_STATE, { userId: userId || 'default' });
      return Object.assign({}, INITIAL_STATE, JSON.parse(raw), { userId: userId || 'default' });
    } catch (e) {
      console.warn('[Saksham Trial] Read error:', e);
      return Object.assign({}, INITIAL_STATE, { userId: userId || 'default' });
    }
  }

  function saveTrialState(state) {
    try {
      state.updatedAt = new Date().toISOString();
      localStorage.setItem(getKey(state.userId), JSON.stringify(state));
      // Notify any active UI listeners
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('saksham:trial_updated', { detail: state }));
      }
    } catch (e) {
      console.warn('[Saksham Trial] Save error:', e);
    }
  }

  function startTrial(userId, baseline) {
    const current = getTrialState(userId);
    const now = new Date().toISOString();
    const next = Object.assign({}, current, {
      userId: userId || 'default',
      status: 'active',
      currentDay: 1,
      startDate: now,
      lastActivityDate: now,
      completedDays: [1],
      baselinePreferences: Object.assign({}, baseline || {}),
      updatedAt: now
    });
    saveTrialState(next);
    return next;
  }

  function recordDifficulty(userId, params) {
    const state = getTrialState(userId);
    const now = new Date().toISOString();

    const record = {
      id: 'diff_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      userId: userId || 'default',
      taskId: params.taskId || null,
      taskTitle: params.taskTitle || 'Daily Activity',
      timestamp: now,
      difficultyCategory: params.difficultyCategory || 'other',
      assistanceOffered: params.assistanceOffered || [],
      assistanceSelected: params.assistanceSelected || null,
      helpfulRating: params.helpfulRating || 'unrated',
      notes: params.notes || '',
      enteredBy: params.enteredBy || 'user',
      synced: false
    };

    const difficulties = [record].concat(state.difficultiesRecorded || []);
    const humanRequests = (state.humanAssistanceRequestedTasks || []).slice();

    if (
      (params.difficultyCategory === 'caregiver_requested' ||
        params.assistanceSelected === 'caregiver_assistance') &&
      params.taskTitle &&
      humanRequests.indexOf(params.taskTitle) === -1
    ) {
      humanRequests.push(params.taskTitle);
    }

    const completed = (state.completedDays || []).slice();
    if (state.currentDay >= 2 && state.currentDay <= 3 && completed.indexOf(2) === -1) completed.push(2);
    if (state.currentDay >= 4 && state.currentDay <= 5 && completed.indexOf(4) === -1) completed.push(4);

    const next = Object.assign({}, state, {
      lastActivityDate: now,
      completedDays: completed.sort(function(a, b) { return a - b; }),
      difficultiesRecorded: difficulties,
      humanAssistanceRequestedTasks: humanRequests,
      updatedAt: now
    });

    saveTrialState(next);

    // Queue for background sync
    if (window.offlineSyncService && typeof window.offlineSyncService.enqueueOperation === 'function') {
      window.offlineSyncService.enqueueOperation(userId, 'difficulty', 'create', record, record.id);
    }

    return record;
  }

  function recordFeedback(userId, difficultyIdOrCat, rating, notes) {
    const state = getTrialState(userId);
    const now = new Date().toISOString();
    let targetCat = null;
    let found = false;

    const updated = (state.difficultiesRecorded || []).map(function(d) {
      if (d.id === difficultyIdOrCat || d.assistanceSelected === difficultyIdOrCat) {
        found = true;
        targetCat = d.assistanceSelected || difficultyIdOrCat;
        return Object.assign({}, d, {
          helpfulRating: rating,
          notes: notes !== undefined ? notes : d.notes,
          updatedAt: now
        });
      }
      return d;
    });

    if (!found) {
      targetCat = difficultyIdOrCat;
      const newRec = {
        id: 'diff_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        userId: userId || 'default',
        taskId: null,
        taskTitle: 'Daily Activity',
        timestamp: now,
        difficultyCategory: 'other',
        assistanceOffered: [targetCat],
        assistanceSelected: targetCat,
        helpfulRating: rating,
        notes: notes || '',
        enteredBy: 'user',
        synced: false
      };
      updated.unshift(newRec);
    }

    const helpful = (state.helpfulAssistanceOptions || []).filter(function(x) { return x !== targetCat; });
    const unhelpful = (state.unhelpfulAssistanceOptions || []).filter(function(x) { return x !== targetCat; });

    if (targetCat) {
      if (rating === 'helpful') helpful.push(targetCat);
      if (rating === 'unhelpful') unhelpful.push(targetCat);
    }

    const next = Object.assign({}, state, {
      lastActivityDate: now,
      difficultiesRecorded: updated,
      helpfulAssistanceOptions: helpful,
      unhelpfulAssistanceOptions: unhelpful,
      updatedAt: now
    });

    saveTrialState(next);

    // Queue sync for feedback update
    if (window.offlineSyncService && typeof window.offlineSyncService.enqueueOperation === 'function') {
      window.offlineSyncService.enqueueOperation(userId || 'default', 'feedback', 'update', {
        targetCat: targetCat,
        rating: rating,
        notes: notes,
        timestamp: now
      });
    }

    return next;
  }

  function setTrialDay(userId, day) {
    const state = getTrialState(userId);
    const now = new Date().toISOString();
    const completed = (state.completedDays || []).slice();
    if (completed.indexOf(day) === -1) completed.push(day);

    const next = Object.assign({}, state, {
      currentDay: day,
      lastActivityDate: now,
      completedDays: completed.sort(function(a, b) { return a - b; }),
      status: day === 7 ? 'completed' : 'active',
      updatedAt: now
    });

    saveTrialState(next);
    return next;
  }

  function getTrialReviewSummary(userId) {
    const state = getTrialState(userId);
    const byCategory = {};
    let helpfulCount = 0;
    let unhelpfulCount = 0;

    (state.difficultiesRecorded || []).forEach(function(d) {
      byCategory[d.difficultyCategory] = (byCategory[d.difficultyCategory] || 0) + 1;
      if (d.helpfulRating === 'helpful') helpfulCount++;
      if (d.helpfulRating === 'unhelpful') unhelpfulCount++;
    });

    const recommendations = [];
    if ((state.helpfulAssistanceOptions || []).indexOf('step_by_step') !== -1) {
      recommendations.push('Deliver morning medication and dressing routines in single, calm micro-steps.');
    }
    if ((state.helpfulAssistanceOptions || []).indexOf('voice_guidance') !== -1) {
      recommendations.push('Enable automatic audio read-aloud prompts for scheduled activities.');
    }
    if ((state.helpfulAssistanceOptions || []).indexOf('larger_controls') !== -1) {
      recommendations.push('Keep high-target touch padding and tremor-friendly tap spacing enabled.');
    }
    if ((state.helpfulAssistanceOptions || []).indexOf('text_simplification') !== -1) {
      recommendations.push('Shorten reminder descriptions to essential 1-line instructions.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Standard calm assistance with optional voice-notes and visual flashcards.');
    }

    return {
      totalDifficulties: (state.difficultiesRecorded || []).length,
      byCategory: byCategory,
      helpfulCount: helpfulCount,
      unhelpfulCount: unhelpfulCount,
      helpfulOptions: state.helpfulAssistanceOptions || [],
      unhelpfulOptions: state.unhelpfulAssistanceOptions || [],
      humanAssistanceRequests: state.humanAssistanceRequestedTasks || [],
      daysRecorded: (state.completedDays || []).length,
      isReadyForProfileCreation: (state.difficultiesRecorded || []).length >= 2 || (state.completedDays || []).length >= 4,
      recommendationsPreview: recommendations
    };
  }

  function loadDemoTrialData(userId) {
    const now = new Date();
    function d(daysAgo) {
      return new Date(now.getTime() - daysAgo * 86400000).toISOString();
    }

    const demoDifficulties = [
      {
        id: 'demo_diff_1',
        userId: userId || 'default',
        taskId: 1,
        taskTitle: 'Morning Herbal Tea & Hydration',
        timestamp: d(5),
        difficultyCategory: 'instructions_complicated',
        assistanceOffered: ['step_by_step', 'text_simplification'],
        assistanceSelected: 'step_by_step',
        helpfulRating: 'helpful',
        notes: '4-step checklist made it very easy to follow without feeling rushed.',
        enteredBy: 'user',
        synced: true
      },
      {
        id: 'demo_diff_2',
        userId: userId || 'default',
        taskId: 2,
        taskTitle: 'Buttoning Shirt & Morning Dressing',
        timestamp: d(4),
        difficultyCategory: 'motor_tremor_difficulty',
        assistanceOffered: ['larger_controls', 'caregiver_assistance'],
        assistanceSelected: 'larger_controls',
        helpfulRating: 'helpful',
        notes: 'Larger touch targets and +5m calm timer extension prevented panic.',
        enteredBy: 'user',
        synced: true
      },
      {
        id: 'demo_diff_3',
        userId: userId || 'default',
        taskId: 3,
        taskTitle: 'Afternoon Memory Exercise',
        timestamp: d(3),
        difficultyCategory: 'sequence_hard_to_remember',
        assistanceOffered: ['voice_guidance', 'visual_cues'],
        assistanceSelected: 'voice_guidance',
        helpfulRating: 'helpful',
        notes: 'Spoken clue helped recall daughter photo immediately.',
        enteredBy: 'caregiver',
        synced: true
      },
      {
        id: 'demo_diff_4',
        userId: userId || 'default',
        taskId: 4,
        taskTitle: 'Evening Walk & Posture Drill',
        timestamp: d(2),
        difficultyCategory: 'other',
        assistanceOffered: ['repeated_instructions', 'text_simplification'],
        assistanceSelected: 'repeated_instructions',
        helpfulRating: 'unhelpful',
        notes: 'Repeating text was unnecessary; steady metronome sound in Tab 4 worked much better.',
        enteredBy: 'user',
        synced: true
      }
    ];

    const demoState = {
      userId: userId || 'default',
      status: 'completed',
      currentDay: 7,
      startDate: d(7),
      lastActivityDate: d(0),
      completedDays: [1, 2, 3, 4, 5, 6, 7],
      baselinePreferences: {
        displayName: 'Kalyani Sharma',
        preferredLanguage: 'en',
        textSizePreference: 'large',
        contrastPreference: 'standard',
        voiceAssistanceEnabled: true,
        guidanceStyle: 'step_by_step',
        pathway: 'parkinsons',
        adaptiveAssistanceEnabled: true
      },
      difficultiesRecorded: demoDifficulties,
      helpfulAssistanceOptions: ['step_by_step', 'larger_controls', 'voice_guidance'],
      unhelpfulAssistanceOptions: ['repeated_instructions'],
      humanAssistanceRequestedTasks: ['Buttoning Shirt & Morning Dressing'],
      summaryApprovedByUser: true,
      updatedAt: new Date().toISOString()
    };

    saveTrialState(demoState);
    return demoState;
  }

  function resetTrialState(userId) {
    try {
      localStorage.removeItem(getKey(userId));
    } catch (e) {}
    return Object.assign({}, INITIAL_STATE, { userId: userId || 'default' });
  }

  // Window exports
  window.SakshamPersonalization = {
    getStorageKey: getKey,
    getTrialState: getTrialState,
    saveTrialState: saveTrialState,
    startTrial: startTrial,
    recordDifficulty: recordDifficulty,
    recordFeedback: recordFeedback,
    recordAssistanceRating: function(cat, rating, notes) { return recordFeedback(null, cat, rating, notes); },
    setTrialDay: setTrialDay,
    getTrialReviewSummary: getTrialReviewSummary,
    loadDemoTrialData: loadDemoTrialData,
    resetTrialState: resetTrialState
  };

})(typeof window !== 'undefined' ? window : this);
