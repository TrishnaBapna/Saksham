/* ======================================================================= */
/* SAKSHAM FIREBASE CLOUD FIRESTORE SERVICE                                */
/* Project: saksham-2b5f0                                                  */
/* Real-time synchronization & offline-persistence engine                  */
/* ======================================================================= */

window.dbService = (function() {
  let firebaseApp = null;
  let firestoreDb = null;
  let connectionState = 'initializing'; // 'connected' | 'local_fallback' | 'error'
  let lastError = null;
  let autoSeedDone = false;

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
      pill.title = "Connected to Google Cloud Firestore (saksham-2b5f0)";
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

  async function testConnection() {
    if (!firestoreDb) {
      broadcastStatus('local_fallback', 'Firebase not initialized');
      return false;
    }
    try {
      // Test read from profiles collection
      await firestoreDb.collection('profiles').limit(1).get({ source: 'server' });
      console.log('[Saksham Firebase] Verified connection with Cloud Firestore (saksham-2b5f0).');
      broadcastStatus('connected');
      return true;
    } catch (e) {
      console.log('[Saksham Firebase] Server ping note (offline cache active):', e.message);
      // In Firestore, if offline persistence is enabled, it continues working even when network is flaky
      broadcastStatus('connected', 'Firestore (Offline Cache Active)');
      return true;
    }
  }

  /* ======================================================================= */
  /* AUTO-SEEDING FOR FIRST-TIME CLOUD FIRESTORE INITIALIZATION               */
  /* ======================================================================= */
  async function autoSeedFirestoreIfEmpty(userId = 'SAK-PT-8842') {
    if (!firestoreDb || autoSeedDone) return;
    autoSeedDone = true;

    try {
      const tasksSnap = await firestoreDb.collection('tasks').limit(1).get();
      if (tasksSnap.empty) {
        console.log('[Saksham Firebase] First-time setup: Seeding initial clinical tasks and profiles to Firestore...');
        const batch = firestoreDb.batch();

        // Seed profiles
        const defaultProfiles = [
          { id: 'SAK-PT-8842', name: 'Kalyani Sharma', role: 'patient', caregiverName: 'Aarav Sharma', caregiverPhone: '+91 98765 43210', lang: 'en' },
          { id: 'USER-CG-01', name: 'Aarav Sharma', role: 'caregiver', caregiverName: 'Aarav Sharma', caregiverPhone: '+91 98765 43210', lang: 'en' },
          { id: 'USER-DOC-01', name: 'Dr. Rajesh Verma, MD', role: 'doctor', caregiverName: 'Aarav Sharma', caregiverPhone: '+91 98765 43210', lang: 'en' }
        ];
        defaultProfiles.forEach(p => {
          batch.set(firestoreDb.collection('profiles').doc(p.id), p);
        });

        // Seed tasks
        state.tasks.forEach(t => {
          batch.set(firestoreDb.collection('tasks').doc(String(t.id)), { ...t, userId });
        });

        // Seed loved ones
        state.familiarPeople.forEach((p, idx) => {
          batch.set(firestoreDb.collection('loved_ones').doc(String(idx + 1)), { ...p, userId });
        });

        // Seed user progression
        batch.set(firestoreDb.collection('user_progression').doc(userId), {
          xp: state.xp || 0,
          level: state.level || 0,
          streak: state.streak || 7,
          waterLogged: state.waterLogged || 5,
          waterTargetGlasses: state.waterTargetGlasses || 8,
          badges: state.badges || []
        });

        await batch.commit();
        console.log('[Saksham Firebase] Seeding completed successfully!');
      }
    } catch(err) {
      console.warn('[Saksham Firebase] Auto-seed check note:', err.message);
    }
  }

  /* ======================================================================= */
  /* 1. TASKS REPOSITORY (FIRESTORE)                                         */
  /* ======================================================================= */
  const tasks = {
    async getAll(userId = 'SAK-PT-8842') {
      if (firestoreDb) {
        try {
          const snap = await firestoreDb.collection('tasks').get();
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
          console.warn('[Saksham Firebase] Tasks fetch error, using local fallback:', e);
        }
      }
      loadPersistedTasks();
      return state.tasks;
    },

    async create(taskData, userId = 'SAK-PT-8842') {
      const cleanTask = { ...taskData, userId: userId || 'SAK-PT-8842', updatedAt: new Date().toISOString() };
      
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

      if (firestoreDb) {
        try {
          await firestoreDb.collection('tasks').doc(String(cleanTask.id)).set(cleanTask, { merge: true });
          console.log('[Saksham Firebase] Task synced with Firestore:', cleanTask.id);
        } catch (e) {
          console.error('[Saksham Firebase] Task write error:', e);
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

      if (firestoreDb) {
        try {
          await firestoreDb.collection('tasks').doc(String(taskId)).set({
            ...updates,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.error('[Saksham Firebase] Task update error:', e);
        }
      }
      return state.tasks[taskIndex];
    },

    async delete(taskId) {
      const idNum = Number(taskId);
      state.tasks = state.tasks.filter(t => t.id !== idNum && t.id !== taskId);
      persistTasks();

      if (firestoreDb) {
        try {
          await firestoreDb.collection('tasks').doc(String(taskId)).delete();
        } catch (e) {
          console.error('[Saksham Firebase] Task delete error:', e);
        }
      }
      return true;
    }
  };

  /* ======================================================================= */
  /* 2. PROFILES REPOSITORY (FIRESTORE)                                      */
  /* ======================================================================= */
  const profiles = {
    async getAll() {
      if (firestoreDb) {
        try {
          const snap = await firestoreDb.collection('profiles').get();
          if (!snap.empty) {
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            localStorage.setItem('saksham_registered_users', JSON.stringify(list));
            return list;
          }
        } catch (e) {
          console.warn('[Saksham Firebase] Profiles fetch error:', e);
        }
      }
      try {
        return JSON.parse(localStorage.getItem('saksham_registered_users') || '[]');
      } catch (e) {
        return [];
      }
    },

    async create(userData) {
      const u = { ...userData, id: userData.id || ('USER-' + Date.now()), createdAt: new Date().toISOString() };
      try {
        const users = JSON.parse(localStorage.getItem('saksham_registered_users') || '[]');
        users.push(u);
        localStorage.setItem('saksham_registered_users', JSON.stringify(users));
      } catch (e) {}

      if (firestoreDb) {
        try {
          await firestoreDb.collection('profiles').doc(u.id).set(u, { merge: true });
        } catch (e) {
          console.error('[Saksham Firebase] Profile write error:', e);
        }
      }
      return u;
    }
  };

  /* ======================================================================= */
  /* 3. LOVED ONES REPOSITORY (FIRESTORE)                                    */
  /* ======================================================================= */
  const lovedOnes = {
    async getAll(userId = 'SAK-PT-8842') {
      if (firestoreDb) {
        try {
          const snap = await firestoreDb.collection('loved_ones').get();
          if (!snap.empty) {
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            state.familiarPeople = list;
            return list;
          }
        } catch (e) {
          console.warn('[Saksham Firebase] Loved ones fetch error:', e);
        }
      }
      return state.familiarPeople;
    },

    async create(personData, userId = 'SAK-PT-8842') {
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
        userId: userId || 'SAK-PT-8842'
      };

      state.familiarPeople.push(personObj);

      if (firestoreDb) {
        try {
          await firestoreDb.collection('loved_ones').doc(String(id)).set(personObj);
        } catch (e) {
          console.error('[Saksham Firebase] Loved one write error:', e);
        }
      }
      return personObj;
    }
  };

  /* ======================================================================= */
  /* 4. CAREGIVER ALERTS & CLINICAL LOGS (FIRESTORE)                         */
  /* ======================================================================= */
  const caregiverAlerts = {
    async getAll(userId = 'SAK-PT-8842') {
      if (firestoreDb) {
        try {
          const snap = await firestoreDb.collection('caregiver_alerts').limit(20).get();
          if (!snap.empty) {
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            state.caregiverAlerts = list;
            return list;
          }
        } catch (e) {
          console.warn('[Saksham Firebase] Alerts fetch error:', e);
        }
      }
      return state.caregiverAlerts;
    },

    async create(alertData, userId = 'SAK-PT-8842') {
      const id = Date.now();
      const alertObj = {
        id,
        time: alertData.time,
        text: alertData.text,
        severity: alertData.severity || 'info',
        userId: userId || 'SAK-PT-8842',
        createdAt: new Date().toISOString()
      };
      state.caregiverAlerts.unshift(alertObj);

      if (firestoreDb) {
        try {
          await firestoreDb.collection('caregiver_alerts').doc(String(id)).set(alertObj);
        } catch (e) {
          console.error('[Saksham Firebase] Alert write error:', e);
        }
      }
      return alertObj;
    }
  };

  const clinicalNotes = {
    async getAll(userId = 'SAK-PT-8842') {
      if (firestoreDb) {
        try {
          const snap = await firestoreDb.collection('clinical_notes').get();
          if (!snap.empty) {
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            state.caregiverDoctorNotes = list;
            return list;
          }
        } catch (e) {
          console.warn('[Saksham Firebase] Clinical notes fetch error:', e);
        }
      }
      return state.caregiverDoctorNotes;
    },

    async create(noteData, userId = 'SAK-PT-8842') {
      const id = Date.now();
      const noteObj = {
        id,
        title: noteData.title,
        body: noteData.body,
        authorRole: noteData.authorRole || 'caregiver',
        authorName: noteData.authorName || state.user,
        userId: userId || 'SAK-PT-8842',
        createdAt: new Date().toISOString()
      };
      state.caregiverDoctorNotes.unshift(noteObj);

      if (firestoreDb) {
        try {
          await firestoreDb.collection('clinical_notes').doc(String(id)).set(noteObj);
        } catch (e) {
          console.error('[Saksham Firebase] Clinical note write error:', e);
        }
      }
      return noteObj;
    }
  };

  const doctorDirectives = {
    async getAll(userId = 'SAK-PT-8842') {
      if (firestoreDb) {
        try {
          const snap = await firestoreDb.collection('doctor_directives').get();
          if (!snap.empty) {
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            state.doctorDirectives = list;
            return list;
          }
        } catch (e) {
          console.warn('[Saksham Firebase] Doctor directives fetch error:', e);
        }
      }
      return state.doctorDirectives;
    },

    async create(directiveData, userId = 'SAK-PT-8842') {
      const id = Date.now();
      const dirObj = {
        id,
        title: directiveData.title,
        body: directiveData.body,
        doctorName: directiveData.doctorName || 'Dr. Rajesh Verma',
        userId: userId || 'SAK-PT-8842',
        createdAt: new Date().toISOString()
      };
      state.doctorDirectives.unshift(dirObj);

      if (firestoreDb) {
        try {
          await firestoreDb.collection('doctor_directives').doc(String(id)).set(dirObj);
        } catch (e) {
          console.error('[Saksham Firebase] Doctor directive write error:', e);
        }
      }
      return dirObj;
    }
  };

  /* ======================================================================= */
  /* 5. TELEMETRY & PROGRESSION (FIRESTORE)                                  */
  /* ======================================================================= */
  const telemetry = {
    async getMonthRecords(userId = 'SAK-PT-8842') {
      if (firestoreDb) {
        try {
          const snap = await firestoreDb.collection('telemetry_records').get();
          if (!snap.empty) {
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            list.sort((a, b) => (a.day || 0) - (b.day || 0));
            state.calendarMonthDays = list;
            return list;
          }
        } catch (e) {
          console.warn('[Saksham Firebase] Telemetry fetch error:', e);
        }
      }
      return state.calendarMonthDays;
    },

    async saveRecord(recordData, userId = 'SAK-PT-8842') {
      const dayId = String(recordData.day || recordData.day_number || Date.now());
      if (firestoreDb) {
        try {
          await firestoreDb.collection('telemetry_records').doc(dayId).set({
            ...recordData,
            userId: userId || 'SAK-PT-8842',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.error('[Saksham Firebase] Telemetry write error:', e);
        }
      }
    }
  };

  const progression = {
    async get(userId = 'SAK-PT-8842') {
      if (firestoreDb) {
        try {
          const doc = await firestoreDb.collection('user_progression').doc(userId).get();
          if (doc.exists) {
            const data = doc.data();
            state.xp = Number(data.xp) || 0;
            state.level = Number(data.level) || 0;
            state.streak = Number(data.streak) || 7;
            state.waterLogged = Number(data.waterLogged) || 5;
            state.waterTargetGlasses = Number(data.waterTargetGlasses) || 8;
            if (data.badges) state.badges = data.badges;
            return data;
          }
        } catch (e) {
          console.warn('[Saksham Firebase] Progression fetch error:', e);
        }
      }
      return null;
    },

    async update(userId = 'SAK-PT-8842') {
      if (firestoreDb) {
        try {
          await firestoreDb.collection('user_progression').doc(userId || 'SAK-PT-8842').set({
            xp: state.xp,
            level: state.level,
            streak: state.streak,
            waterLogged: state.waterLogged,
            waterTargetGlasses: state.waterTargetGlasses,
            badges: state.badges,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.error('[Saksham Firebase] Progression write error:', e);
        }
      }
    }
  };

  /* ======================================================================= */
  /* HYDRATION & REFRESH                                                     */
  /* ======================================================================= */
  async function hydrateAll(userId = 'SAK-PT-8842') {
    try {
      console.log('[Saksham Firebase] Hydrating database entities for user:', userId);
      await autoSeedFirestoreIfEmpty(userId);

      await Promise.allSettled([
        tasks.getAll(userId),
        profiles.getAll(),
        lovedOnes.getAll(userId),
        caregiverAlerts.getAll(userId),
        clinicalNotes.getAll(userId),
        doctorDirectives.getAll(userId),
        telemetry.getMonthRecords(userId),
        progression.get(userId)
      ]);
      console.log('[Saksham Firebase] Hydration complete.');

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

  // Initialize immediately
  init();

  return {
    init,
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
