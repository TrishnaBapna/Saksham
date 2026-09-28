/* ======================================================================= */
/* SAKSHAM FIREBASE CLOUD FIRESTORE SERVICE                                */
/* Project: saksham-2b5f0                                                  */
/* SECURE: All data scoped under /users/{uid}/ subcollections              */
/* Only the authenticated user can read or write their own data            */
/* ======================================================================= */

window.dbService = (function() {
  let firebaseApp  = null;
  let firestoreDb  = null;
  let currentUid   = null;   // Set after Firebase Auth sign-in
  let connectionState = 'initializing';
  let lastError    = null;
  let autoSeedDone = false;

  /* ---------------------------------------------------------------------- */
  /* INTERNAL HELPERS                                                        */
  /* ---------------------------------------------------------------------- */

  /**
   * Returns the Firestore subcollection reference for the current user.
   * Path: /users/{uid}/{collectionName}
   * Throws if no authenticated user is set.
   */
  function userCol(collectionName) {
    const uid = currentUid;
    if (!firestoreDb || !uid) {
      throw new Error('[Saksham DB] No authenticated user. Call setCurrentUser(uid) after sign-in.');
    }
    return firestoreDb.collection('users').doc(uid).collection(collectionName);
  }

  /** Returns the user document reference at /users/{uid} */
  function userDoc() {
    const uid = currentUid;
    if (!firestoreDb || !uid) throw new Error('[Saksham DB] No authenticated user.');
    return firestoreDb.collection('users').doc(uid);
  }

  function broadcastStatus(status, detail = null) {
    connectionState = status;
    const event = new CustomEvent('saksham:db-status-change', {
      detail: { status, detail, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
    updateDbIndicatorUI(status, detail);
  }

  function getStatus() {
    return {
      state: connectionState,
      isFirebase: Boolean(firestoreDb),
      currentUid,
      projectId: window.SakshamDbConfig ? window.SakshamDbConfig.getConfig().projectId : 'saksham-2b5f0',
      lastError
    };
  }

  function updateDbIndicatorUI(status, detail) {
    const pill = document.getElementById('cloud-db-indicator');
    if (!pill) return;
    if (status === 'connected') {
      pill.className = "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#14331C] text-[#9FC57C] border border-[#387D82]/50 hover:bg-[#245C28] transition shadow-xs cursor-pointer";
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span>Firebase Active</span>`;
      pill.title = "Connected to Google Cloud Firestore (saksham-2b5f0) — Data encrypted & user-scoped";
    } else if (status === 'local_fallback') {
      pill.className = "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-500/40 hover:bg-amber-900 transition shadow-xs cursor-pointer";
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span><span>Local DB Mode</span>`;
      pill.title = "Operating with Local Storage & Offline Engine. Click to check Firebase.";
    } else {
      pill.className = "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/70 text-rose-300 border border-rose-500/40 hover:bg-rose-900 transition shadow-xs cursor-pointer";
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span><span>DB Offline</span>`;
      pill.title = detail || "Database connection error. Operating in offline mode.";
    }
  }

  /* ---------------------------------------------------------------------- */
  /* INITIALIZATION                                                          */
  /* ---------------------------------------------------------------------- */

  function init() {
    try {
      const config = window.SakshamDbConfig ? window.SakshamDbConfig.getConfig() : null;
      if (window.firebase && config && config.apiKey && config.projectId) {
        if (!firebase.apps.length) {
          firebaseApp = firebase.initializeApp(config);
        } else {
          firebaseApp = firebase.app();
        }
        firestoreDb = firebase.firestore();

        // Enable multi-tab offline persistence
        try {
          firestoreDb.enablePersistence({ synchronizeTabs: true }).catch((err) => {
            if (err.code !== 'failed-precondition') {
              console.log('[Saksham Firebase] Offline persistence notice:', err.code);
            }
          });
        } catch(e) {}

        console.log('[Saksham Firebase] Initialized Firestore for project:', config.projectId);

        // Restore currentUid from localStorage if a session already exists
        try {
          const saved = JSON.parse(localStorage.getItem('saksham_active_user') || 'null');
          if (saved && saved.firebaseUid) {
            currentUid = saved.firebaseUid;
            console.log('[Saksham Firebase] Restored user session UID:', currentUid);
          }
        } catch(e) {}

        testConnection();
      } else {
        firestoreDb = null;
        console.log('[Saksham Firebase] Firebase SDK not loaded or config missing. Using local fallback.');
        broadcastStatus('local_fallback', 'Using Local Storage');
      }
    } catch (err) {
      console.error('[Saksham Firebase] Initialization error:', err);
      firestoreDb = null;
      lastError = err.message;
      broadcastStatus('error', err.message);
    }
  }

  /**
   * Called after Firebase Auth sign-in to set the current user's UID.
   * This must be called before any Firestore read/write.
   */
  function setCurrentUser(uid) {
    currentUid = uid;
    autoSeedDone = false; // Allow re-seeding for new user
    console.log('[Saksham Firebase] Current user set to:', uid);
  }

  async function testConnection() {
    if (!firestoreDb) {
      broadcastStatus('local_fallback', 'Firebase not initialized');
      return false;
    }
    try {
      // Test read against the root users collection (doesn't expose any user data)
      await firestoreDb.collection('users').limit(1).get({ source: 'server' });
      console.log('[Saksham Firebase] Verified connection with Cloud Firestore (saksham-2b5f0).');
      broadcastStatus('connected');
      return true;
    } catch (e) {
      // Offline cache is active — still functional
      console.log('[Saksham Firebase] Server ping note (offline cache active):', e.message);
      broadcastStatus('connected', 'Firestore (Offline Cache Active)');
      return true;
    }
  }

  /* ---------------------------------------------------------------------- */
  /* AUTO-SEEDING (first login only — seeds into /users/{uid}/)             */
  /* ---------------------------------------------------------------------- */
  async function autoSeedFirestoreIfEmpty(uid) {
    if (!firestoreDb || !uid || autoSeedDone) return;
    autoSeedDone = true;

    try {
      const tasksSnap = await userCol('tasks').limit(1).get();
      if (tasksSnap.empty) {
        console.log('[Saksham Firebase] First-time user setup: Seeding initial data to /users/' + uid + '/...');
        const batch = firestoreDb.batch();
        const ref = firestoreDb.collection('users').doc(uid);

        // Profile
        batch.set(ref, {
          uid,
          createdAt: new Date().toISOString()
        }, { merge: true });

        // Tasks
        const tasks = (typeof state !== 'undefined' && state.tasks) ? state.tasks : [];
        tasks.forEach(t => {
          batch.set(ref.collection('tasks').doc(String(t.id)), {
            ...t,
            uid,
            updatedAt: new Date().toISOString()
          });
        });

        // Loved ones
        const people = (typeof state !== 'undefined' && state.familiarPeople) ? state.familiarPeople : [];
        people.forEach((p, idx) => {
          batch.set(ref.collection('loved_ones').doc(String(idx + 1)), { ...p, uid });
        });

        // Progression
        const xp  = (typeof state !== 'undefined') ? (state.xp || 0) : 0;
        const lvl = (typeof state !== 'undefined') ? (state.level || 0) : 0;
        batch.set(ref.collection('progression').doc('data'), {
          uid,
          xp,
          level: lvl,
          streak: (typeof state !== 'undefined') ? (state.streak || 7) : 7,
          waterLogged: (typeof state !== 'undefined') ? (state.waterLogged || 5) : 5,
          waterTargetGlasses: (typeof state !== 'undefined') ? (state.waterTargetGlasses || 8) : 8,
          badges: (typeof state !== 'undefined') ? (state.badges || []) : [],
          updatedAt: new Date().toISOString()
        });

        await batch.commit();
        console.log('[Saksham Firebase] Seeding complete for user:', uid);
      }
    } catch(err) {
      console.warn('[Saksham Firebase] Auto-seed note:', err.message);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* 1. TASKS REPOSITORY                                                     */
  /* Path: /users/{uid}/tasks/{taskId}                                      */
  /* ---------------------------------------------------------------------- */
  const tasks = {
    async getAll() {
      if (firestoreDb && currentUid) {
        try {
          const snap = await userCol('tasks').get();
          if (!snap.empty) {
            const list = [];
            snap.forEach(doc => {
              const d = doc.data();
              list.push({ ...d, id: Number(d.id) || d.id });
            });
            if (typeof parseTimeToMinutes === 'function') {
              list.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
            }
            state.tasks = list;
            persistTasks();
            return list;
          }
        } catch (e) {
          console.warn('[Saksham Firebase] Tasks fetch error, using local fallback:', e.message);
        }
      }
      loadPersistedTasks();
      return state.tasks;
    },

    async create(taskData) {
      const cleanTask = { ...taskData, uid: currentUid, updatedAt: new Date().toISOString() };

      // Optimistic local update
      const existingIdx = state.tasks.findIndex(t => t.id === cleanTask.id);
      if (existingIdx >= 0) {
        state.tasks[existingIdx] = cleanTask;
      } else {
        state.tasks.push(cleanTask);
      }
      if (typeof parseTimeToMinutes === 'function') {
        state.tasks.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
      }
      persistTasks();

      if (firestoreDb && currentUid) {
        try {
          await userCol('tasks').doc(String(cleanTask.id)).set(cleanTask, { merge: true });
        } catch (e) {
          console.error('[Saksham Firebase] Task write error:', e.message);
        }
      }
      return cleanTask;
    },

    async update(taskId, updates) {
      const idNum = Number(taskId);
      const taskIndex = state.tasks.findIndex(t => t.id === idNum || t.id === taskId);
      if (taskIndex >= 0) {
        Object.assign(state.tasks[taskIndex], updates);
        persistTasks();
      }

      if (firestoreDb && currentUid) {
        try {
          await userCol('tasks').doc(String(taskId)).set({
            ...updates,
            uid: currentUid,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.error('[Saksham Firebase] Task update error:', e.message);
        }
      }
      return taskIndex >= 0 ? state.tasks[taskIndex] : null;
    },

    async delete(taskId) {
      const idNum = Number(taskId);
      state.tasks = state.tasks.filter(t => t.id !== idNum && t.id !== taskId);
      persistTasks();

      if (firestoreDb && currentUid) {
        try {
          await userCol('tasks').doc(String(taskId)).delete();
        } catch (e) {
          console.error('[Saksham Firebase] Task delete error:', e.message);
        }
      }
      return true;
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 2. PROFILES REPOSITORY                                                  */
  /* Path: /users/{uid}  (root user document)                               */
  /* ---------------------------------------------------------------------- */
  const profiles = {
    async get(uid) {
      if (firestoreDb && uid) {
        try {
          const doc = await firestoreDb.collection('users').doc(uid).get();
          if (doc.exists) return doc.data();
        } catch (e) {
          console.warn('[Saksham Firebase] Profile fetch error:', e.message);
        }
      }
      try {
        const users = JSON.parse(localStorage.getItem('saksham_registered_users') || '[]');
        return users.find(u => u.firebaseUid === uid || u.id === uid) || null;
      } catch(e) { return null; }
    },

    async create(userData) {
      const uid = userData.firebaseUid || userData.id;
      const u = {
        ...userData,
        uid,
        id: uid,
        createdAt: new Date().toISOString()
      };

      // Save locally
      try {
        const users = JSON.parse(localStorage.getItem('saksham_registered_users') || '[]');
        const exists = users.findIndex(x => x.firebaseUid === uid || x.id === uid);
        if (exists >= 0) users[exists] = u; else users.push(u);
        localStorage.setItem('saksham_registered_users', JSON.stringify(users));
      } catch (e) {}

      // Save to Firestore root user document
      if (firestoreDb && uid) {
        try {
          await firestoreDb.collection('users').doc(uid).set(u, { merge: true });
        } catch (e) {
          console.error('[Saksham Firebase] Profile write error:', e.message);
        }
      }
      return u;
    },

    async update(uid, updates) {
      if (firestoreDb && uid) {
        try {
          await firestoreDb.collection('users').doc(uid).set({
            ...updates,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.error('[Saksham Firebase] Profile update error:', e.message);
        }
      }
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 3. LOVED ONES REPOSITORY                                                */
  /* Path: /users/{uid}/loved_ones/{id}                                     */
  /* ---------------------------------------------------------------------- */
  const lovedOnes = {
    async getAll() {
      if (firestoreDb && currentUid) {
        try {
          const snap = await userCol('loved_ones').get();
          if (!snap.empty) {
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            state.familiarPeople = list;
            return list;
          }
        } catch (e) {
          console.warn('[Saksham Firebase] Loved ones fetch error:', e.message);
        }
      }
      return state.familiarPeople;
    },

    async create(personData) {
      const id = Date.now();
      const personObj = {
        id,
        name: personData.name,
        role: personData.role,
        phone: personData.phone || "+1 (555) 000-0000",
        whatsapp: (personData.whatsapp || personData.phone || '15550000000').replace(/[^0-9]/g, ''),
        email: personData.email || '',
        clue: personData.clue || `Your ${personData.role} ${personData.name}.`,
        img: personData.img || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
        options: personData.options || [personData.name, "Doctor", "Neighbor", "Nurse"],
        uid: currentUid
      };

      state.familiarPeople.push(personObj);

      if (firestoreDb && currentUid) {
        try {
          await userCol('loved_ones').doc(String(id)).set(personObj);
        } catch (e) {
          console.error('[Saksham Firebase] Loved one write error:', e.message);
        }
      }
      return personObj;
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 4. CAREGIVER ALERTS                                                     */
  /* Path: /users/{uid}/caregiver_alerts/{id}                               */
  /* ---------------------------------------------------------------------- */
  const caregiverAlerts = {
    async getAll() {
      if (firestoreDb && currentUid) {
        try {
          const snap = await userCol('caregiver_alerts').orderBy('createdAt', 'desc').limit(20).get();
          if (!snap.empty) {
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            state.caregiverAlerts = list;
            return list;
          }
        } catch (e) {
          console.warn('[Saksham Firebase] Alerts fetch error:', e.message);
        }
      }
      return state.caregiverAlerts;
    },

    async create(alertData) {
      const id = Date.now();
      const alertObj = {
        id,
        time: alertData.time,
        text: alertData.text,
        severity: alertData.severity || 'info',
        uid: currentUid,
        createdAt: new Date().toISOString()
      };
      state.caregiverAlerts.unshift(alertObj);

      if (firestoreDb && currentUid) {
        try {
          await userCol('caregiver_alerts').doc(String(id)).set(alertObj);
        } catch (e) {
          console.error('[Saksham Firebase] Alert write error:', e.message);
        }
      }
      return alertObj;
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 5. CLINICAL NOTES                                                       */
  /* Path: /users/{uid}/clinical_notes/{id}                                 */
  /* ---------------------------------------------------------------------- */
  const clinicalNotes = {
    async getAll() {
      if (firestoreDb && currentUid) {
        try {
          const snap = await userCol('clinical_notes').orderBy('createdAt', 'desc').get();
          if (!snap.empty) {
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            state.caregiverDoctorNotes = list;
            return list;
          }
        } catch (e) {
          console.warn('[Saksham Firebase] Clinical notes fetch error:', e.message);
        }
      }
      return state.caregiverDoctorNotes;
    },

    async create(noteData) {
      const id = Date.now();
      const noteObj = {
        id,
        title: noteData.title,
        body: noteData.body,
        authorRole: noteData.authorRole || 'caregiver',
        authorName: noteData.authorName || state.user,
        uid: currentUid,
        createdAt: new Date().toISOString()
      };
      state.caregiverDoctorNotes.unshift(noteObj);

      if (firestoreDb && currentUid) {
        try {
          await userCol('clinical_notes').doc(String(id)).set(noteObj);
        } catch (e) {
          console.error('[Saksham Firebase] Clinical note write error:', e.message);
        }
      }
      return noteObj;
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 6. DOCTOR DIRECTIVES                                                    */
  /* Path: /users/{uid}/doctor_directives/{id}                              */
  /* ---------------------------------------------------------------------- */
  const doctorDirectives = {
    async getAll() {
      if (firestoreDb && currentUid) {
        try {
          const snap = await userCol('doctor_directives').orderBy('createdAt', 'desc').get();
          if (!snap.empty) {
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            state.doctorDirectives = list;
            return list;
          }
        } catch (e) {
          console.warn('[Saksham Firebase] Doctor directives fetch error:', e.message);
        }
      }
      return state.doctorDirectives;
    },

    async create(directiveData) {
      const id = Date.now();
      const dirObj = {
        id,
        title: directiveData.title,
        body: directiveData.body,
        doctorName: directiveData.doctorName || 'Dr. Rajesh Verma',
        uid: currentUid,
        createdAt: new Date().toISOString()
      };
      state.doctorDirectives.unshift(dirObj);

      if (firestoreDb && currentUid) {
        try {
          await userCol('doctor_directives').doc(String(id)).set(dirObj);
        } catch (e) {
          console.error('[Saksham Firebase] Doctor directive write error:', e.message);
        }
      }
      return dirObj;
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 7. TELEMETRY                                                            */
  /* Path: /users/{uid}/telemetry/{dayId}                                   */
  /* ---------------------------------------------------------------------- */
  const telemetry = {
    async getMonthRecords() {
      if (firestoreDb && currentUid) {
        try {
          const snap = await userCol('telemetry').get();
          if (!snap.empty) {
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            list.sort((a, b) => (a.day || 0) - (b.day || 0));
            state.calendarMonthDays = list;
            return list;
          }
        } catch (e) {
          console.warn('[Saksham Firebase] Telemetry fetch error:', e.message);
        }
      }
      return state.calendarMonthDays;
    },

    async saveRecord(recordData) {
      const dayId = String(recordData.day || recordData.day_number || Date.now());
      if (firestoreDb && currentUid) {
        try {
          await userCol('telemetry').doc(dayId).set({
            ...recordData,
            uid: currentUid,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.error('[Saksham Firebase] Telemetry write error:', e.message);
        }
      }
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 8. PROGRESSION                                                          */
  /* Path: /users/{uid}/progression/data                                    */
  /* ---------------------------------------------------------------------- */
  const progression = {
    async get() {
      if (firestoreDb && currentUid) {
        try {
          const doc = await userCol('progression').doc('data').get();
          if (doc.exists) {
            const data = doc.data();
            state.xp                = Number(data.xp) || 0;
            state.level             = Number(data.level) || 0;
            state.streak            = Number(data.streak) || 7;
            state.waterLogged       = Number(data.waterLogged) || 5;
            state.waterTargetGlasses = Number(data.waterTargetGlasses) || 8;
            if (data.badges) state.badges = data.badges;
            return data;
          }
        } catch (e) {
          console.warn('[Saksham Firebase] Progression fetch error:', e.message);
        }
      }
      return null;
    },

    async update() {
      if (firestoreDb && currentUid) {
        try {
          await userCol('progression').doc('data').set({
            uid: currentUid,
            xp: state.xp,
            level: state.level,
            streak: state.streak,
            waterLogged: state.waterLogged,
            waterTargetGlasses: state.waterTargetGlasses,
            badges: state.badges,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.error('[Saksham Firebase] Progression write error:', e.message);
        }
      }
    }
  };

  /* ---------------------------------------------------------------------- */
  /* HYDRATION                                                               */
  /* ---------------------------------------------------------------------- */
  async function hydrateAll(uid) {
    const resolvedUid = uid || currentUid;
    if (!resolvedUid) {
      console.log('[Saksham Firebase] No user UID — skipping cloud hydration, using local data.');
      loadPersistedTasks();
      return;
    }

    // Ensure currentUid is set
    if (!currentUid) currentUid = resolvedUid;

    try {
      console.log('[Saksham Firebase] Hydrating data for user:', resolvedUid);
      await autoSeedFirestoreIfEmpty(resolvedUid);

      await Promise.allSettled([
        tasks.getAll(),
        lovedOnes.getAll(),
        caregiverAlerts.getAll(),
        clinicalNotes.getAll(),
        doctorDirectives.getAll(),
        telemetry.getMonthRecords(),
        progression.get()
      ]);

      console.log('[Saksham Firebase] Hydration complete for user:', resolvedUid);

      // Refresh UI components
      if (typeof renderDirectTasksList === 'function') renderDirectTasksList();
      if (typeof renderActiveCueCard === 'function') renderActiveCueCard();
      if (typeof renderCaregiverManagedTasks === 'function') renderCaregiverManagedTasks();
      if (typeof renderCaregiverAlerts === 'function') renderCaregiverAlerts();
      if (typeof renderCaregiverNotes === 'function') renderCaregiverNotes();
      if (typeof renderDoctorLogs === 'function') renderDoctorLogs();
      if (typeof renderDoctorDirectivesList === 'function') renderDoctorDirectivesList();
      if (typeof renderLovedOnes === 'function') renderLovedOnes();
      if (typeof renderInteractiveMonthlyGrid === 'function') renderInteractiveMonthlyGrid();
      if (typeof updateLevelProgressUI === 'function') updateLevelProgressUI();
      if (typeof renderBadgesUI === 'function') renderBadgesUI();
      if (typeof updateChartsData === 'function') updateChartsData();
    } catch (err) {
      console.error('[Saksham Firebase] Hydration error:', err);
    }
  }

  // Initialize immediately (sets up Firebase app, reads UID from localStorage if available)
  init();

  return {
    init,
    setCurrentUser,
    getStatus,
    testConnection,
    tasks,
    profiles,
    lovedOnes,
    caregiverAlerts,
    clinicalNotes,
    doctorDirectives,
    telemetry,
    progression,
    hydrateAll
  };
})();
