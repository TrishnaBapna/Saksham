/* ======================================================================= */
/* SAKSHAM DATABASE ACCESS LAYER & REPOSITORY SERVICE                      */
/* PostgreSQL / Supabase Client with Resilient Offline-Sync Engine         */
/* ======================================================================= */

window.dbService = (function() {
  let supabaseClient = null;
  let connectionState = 'initializing'; // 'connected' | 'local_fallback' | 'error'
  let lastError = null;

  // Event dispatch helper for UI reactive indicators
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
      isCloud: Boolean(supabaseClient),
      lastError
    };
  }

  // Visual status pill update
  function updateDbIndicatorUI(status, detail) {
    const pill = document.getElementById('cloud-db-indicator');
    if (!pill) return;

    if (status === 'connected') {
      pill.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-900/60 text-teal-300 border border-teal-500/30 shadow-xs cursor-pointer";
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span><span>Cloud DB Active</span>`;
      pill.title = "Connected to Supabase PostgreSQL Database";
    } else if (status === 'local_fallback') {
      pill.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-900/60 text-amber-200 border border-amber-500/30 shadow-xs cursor-pointer";
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span><span>Local DB Mode</span>`;
      pill.title = "Operating with Local Storage & In-Memory Sync. Click to connect Supabase.";
    } else {
      pill.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-900/60 text-rose-200 border border-rose-500/30 shadow-xs cursor-pointer";
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span><span>DB Offline</span>`;
      pill.title = detail || "Database connection error. Operating offline.";
    }
  }

  // Initialize the database client
  function init() {
    try {
      const url = window.SakshamDbConfig ? window.SakshamDbConfig.getUrl() : '';
      const key = window.SakshamDbConfig ? window.SakshamDbConfig.getAnonKey() : '';

      if (window.supabase && url && key && url.startsWith('http')) {
        supabaseClient = window.supabase.createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
        console.log('[Saksham DB] Supabase client initialized with endpoint:', url);
        testConnection();
      } else {
        supabaseClient = null;
        console.log('[Saksham DB] Running in Local Storage DB engine (Supabase credentials not set or SDK offline).');
        broadcastStatus('local_fallback', 'Using Local Storage');
      }
    } catch (err) {
      console.error('[Saksham DB] Client initialization failed:', err);
      supabaseClient = null;
      lastError = err.message;
      broadcastStatus('error', err.message);
    }
  }

  // Health check query
  async function testConnection() {
    if (!supabaseClient) {
      broadcastStatus('local_fallback', 'Supabase credentials not configured');
      return false;
    }
    try {
      const { data, error } = await supabaseClient.from('profiles').select('id').limit(1);
      if (error) {
        console.warn('[Saksham DB] Supabase health query failed:', error.message);
        broadcastStatus('error', error.message);
        return false;
      }
      console.log('[Saksham DB] Cloud Database connection verified successfully.');
      broadcastStatus('connected');
      return true;
    } catch (e) {
      console.warn('[Saksham DB] Network check failed:', e.message);
      broadcastStatus('local_fallback', 'Offline');
      return false;
    }
  }

  /* ======================================================================= */
  /* ENTITY MAPPING UTILITIES (Frontend camelCase <-> Database snake_case)     */
  /* ======================================================================= */

  function taskToDb(task, userId = 'SAK-PT-8842') {
    return {
      id: Number(task.id) || Date.now(),
      user_id: userId,
      title: String(task.title || '').trim(),
      time: String(task.time || '08:00 AM'),
      raw_time: String(task.rawTime || ''),
      sound: String(task.sound || 'bell'),
      done: Boolean(task.done),
      tag: String(task.tag || 'Wellness'),
      status: String(task.status || 'pending'),
      latency_minutes: Number(task.latencyMinutes) || 5,
      cue_question: String(task.cueQuestion || ''),
      cue_options: Array.isArray(task.cueOptions) ? task.cueOptions : [],
      correct_option_index: Number(task.correctOptionIndex) || 0,
      cue_hint: String(task.cueHint || ''),
      attempts_left: Number(task.attemptsLeft) || 3,
      runner_steps: Array.isArray(task.runnerSteps) ? task.runnerSteps : [],
      diagnostic_question: String(task.diagnosticQuestion || ''),
      diagnostic_checkpoints: Array.isArray(task.diagnosticCheckpoints) ? task.diagnosticCheckpoints : [],
      updated_at: new Date().toISOString()
    };
  }

  function taskFromDb(row) {
    let cueOpts = row.cue_options;
    if (typeof cueOpts === 'string') {
      try { cueOpts = JSON.parse(cueOpts); } catch(e) { cueOpts = []; }
    }
    let steps = row.runner_steps;
    if (typeof steps === 'string') {
      try { steps = JSON.parse(steps); } catch(e) { steps = []; }
    }
    let checkpoints = row.diagnostic_checkpoints;
    if (typeof checkpoints === 'string') {
      try { checkpoints = JSON.parse(checkpoints); } catch(e) { checkpoints = []; }
    }

    return {
      id: Number(row.id),
      title: row.title,
      time: row.time,
      rawTime: row.raw_time || '',
      sound: row.sound || 'bell',
      done: Boolean(row.done),
      tag: row.tag || 'Wellness',
      status: row.status || 'pending',
      latencyMinutes: Number(row.latency_minutes) || 5,
      cueQuestion: row.cue_question || '',
      cueOptions: Array.isArray(cueOpts) ? cueOpts : [],
      correctOptionIndex: Number(row.correct_option_index) || 0,
      cueHint: row.cue_hint || '',
      attemptsLeft: Number(row.attempts_left) || 3,
      runnerSteps: Array.isArray(steps) ? steps : [],
      diagnosticQuestion: row.diagnostic_question || '',
      diagnosticCheckpoints: Array.isArray(checkpoints) ? checkpoints : []
    };
  }

  /* ======================================================================= */
  /* 1. TASKS REPOSITORY                                                     */
  /* ======================================================================= */
  const tasks = {
    async getAll(userId = 'SAK-PT-8842') {
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('tasks')
            .select('*')
            .order('id', { ascending: true });

          if (!error && data && data.length > 0) {
            const mapped = data.map(taskFromDb);
            // Sort chronologically using parseTimeToMinutes if present
            if (typeof parseTimeToMinutes === 'function') {
              mapped.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
            }
            state.tasks = mapped;
            persistTasks();
            return mapped;
          }
        } catch (e) {
          console.warn('[Saksham DB] Failed to fetch tasks from cloud, using local cache:', e);
        }
      }
      // Fallback to local storage
      loadPersistedTasks();
      return state.tasks;
    },

    async create(taskData, userId = 'SAK-PT-8842') {
      const dbRow = taskToDb(taskData, userId);
      // Optimistic local update
      const existingIdx = state.tasks.findIndex(t => t.id === dbRow.id);
      const mapped = taskFromDb(dbRow);
      if (existingIdx >= 0) {
        state.tasks[existingIdx] = mapped;
      } else {
        state.tasks.push(mapped);
      }
      if (typeof parseTimeToMinutes === 'function') {
        state.tasks.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
      }
      persistTasks();

      // Cloud persistence
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('tasks')
            .upsert(dbRow, { onConflict: 'id' })
            .select();
          if (error) {
            console.error('[Saksham DB] Task cloud insert failed:', error.message);
          } else {
            console.log('[Saksham DB] Task synchronized with cloud:', dbRow.id);
          }
        } catch (e) {
          console.error('[Saksham DB] Task cloud insert exception:', e);
        }
      }
      return mapped;
    },

    async update(taskId, updates) {
      const idNum = Number(taskId);
      const taskIndex = state.tasks.findIndex(t => t.id === idNum);
      if (taskIndex >= 0) {
        Object.assign(state.tasks[taskIndex], updates);
        persistTasks();
      }

      if (supabaseClient) {
        try {
          const dbUpdates = {};
          if ('done' in updates) dbUpdates.done = Boolean(updates.done);
          if ('status' in updates) dbUpdates.status = updates.status;
          if ('latencyMinutes' in updates) dbUpdates.latency_minutes = Number(updates.latencyMinutes);
          if ('attemptsLeft' in updates) dbUpdates.attempts_left = Number(updates.attemptsLeft);
          if ('title' in updates) dbUpdates.title = updates.title;
          if ('time' in updates) dbUpdates.time = updates.time;
          dbUpdates.updated_at = new Date().toISOString();

          const { error } = await supabaseClient
            .from('tasks')
            .update(dbUpdates)
            .eq('id', idNum);
          if (error) console.error('[Saksham DB] Task update error:', error.message);
        } catch (e) {
          console.error('[Saksham DB] Task update exception:', e);
        }
      }
      return state.tasks[taskIndex];
    },

    async delete(taskId) {
      const idNum = Number(taskId);
      state.tasks = state.tasks.filter(t => t.id !== idNum);
      persistTasks();

      if (supabaseClient) {
        try {
          await supabaseClient.from('tasks').delete().eq('id', idNum);
        } catch (e) {
          console.error('[Saksham DB] Task delete exception:', e);
        }
      }
      return true;
    }
  };

  /* ======================================================================= */
  /* 2. PROFILES / USERS REPOSITORY                                          */
  /* ======================================================================= */
  const profiles = {
    async getAll() {
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            const mappedUsers = data.map(p => ({
              id: p.id,
              name: p.name,
              role: p.role,
              caregiverName: p.caregiver_name,
              caregiverPhone: p.caregiver_phone,
              lang: p.lang || 'en',
              pin: p.pin || '',
              isGuest: Boolean(p.is_guest)
            }));
            localStorage.setItem('saksham_registered_users', JSON.stringify(mappedUsers));
            return mappedUsers;
          }
        } catch (e) {
          console.warn('[Saksham DB] Profiles fetch error, fallback to local storage:', e);
        }
      }
      try {
        return JSON.parse(localStorage.getItem('saksham_registered_users') || '[]');
      } catch (e) {
        return [];
      }
    },

    async create(userData) {
      const dbRow = {
        id: userData.id || ('USER-' + Date.now()),
        name: userData.name,
        role: userData.role || 'patient',
        caregiver_name: userData.caregiverName || 'Aarav Sharma',
        caregiver_phone: userData.caregiverPhone || '+91 98765 43210',
        lang: userData.lang || 'en',
        pin: userData.pin || '',
        is_guest: Boolean(userData.isGuest),
        updated_at: new Date().toISOString()
      };

      // Local storage update
      try {
        const users = JSON.parse(localStorage.getItem('saksham_registered_users') || '[]');
        users.push(userData);
        localStorage.setItem('saksham_registered_users', JSON.stringify(users));
      } catch (e) {}

      if (supabaseClient) {
        try {
          const { error } = await supabaseClient
            .from('profiles')
            .upsert(dbRow, { onConflict: 'id' });
          if (error) console.error('[Saksham DB] Profile insert error:', error.message);
        } catch (e) {
          console.error('[Saksham DB] Profile insert exception:', e);
        }
      }
      return userData;
    }
  };

  /* ======================================================================= */
  /* 3. LOVED ONES REPOSITORY                                                */
  /* ======================================================================= */
  const lovedOnes = {
    async getAll(userId = 'SAK-PT-8842') {
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('loved_ones')
            .select('*')
            .order('id', { ascending: true });

          if (!error && data && data.length > 0) {
            state.familiarPeople = data.map(d => ({
              id: d.id,
              name: d.name,
              role: d.role,
              phone: d.phone,
              whatsapp: d.whatsapp,
              email: d.email,
              clue: d.clue,
              img: d.img,
              options: Array.isArray(d.options) ? d.options : (typeof d.options === 'string' ? JSON.parse(d.options) : [d.name, 'Doctor', 'Neighbor', 'Pharmacist'])
            }));
            return state.familiarPeople;
          }
        } catch (e) {
          console.warn('[Saksham DB] Loved ones fetch error, using local state:', e);
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
        options: personData.options || [personData.name, "Doctor", "Neighbor", "Nurse"]
      };

      state.familiarPeople.push(personObj);

      if (supabaseClient) {
        try {
          const dbRow = {
            id,
            user_id: userId,
            name: personObj.name,
            role: personObj.role,
            phone: personObj.phone,
            whatsapp: personObj.whatsapp,
            email: personObj.email,
            clue: personObj.clue,
            img: personObj.img,
            options: personObj.options
          };
          await supabaseClient.from('loved_ones').insert(dbRow);
        } catch (e) {
          console.error('[Saksham DB] Loved one insert exception:', e);
        }
      }
      return personObj;
    }
  };

  /* ======================================================================= */
  /* 4. CAREGIVER ALERTS & CLINICAL LOGS REPOSITORIES                         */
  /* ======================================================================= */
  const caregiverAlerts = {
    async getAll(userId = 'SAK-PT-8842') {
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('caregiver_alerts')
            .select('*')
            .order('id', { ascending: false })
            .limit(20);

          if (!error && data && data.length > 0) {
            state.caregiverAlerts = data.map(d => ({
              id: d.id,
              time: d.time,
              text: d.text
            }));
            return state.caregiverAlerts;
          }
        } catch (e) {
          console.warn('[Saksham DB] Alerts fetch error:', e);
        }
      }
      return state.caregiverAlerts;
    },

    async create(alertData, userId = 'SAK-PT-8842') {
      const id = Date.now();
      const alertObj = {
        id,
        time: alertData.time,
        text: alertData.text
      };
      state.caregiverAlerts.unshift(alertObj);

      if (supabaseClient) {
        try {
          await supabaseClient.from('caregiver_alerts').insert({
            id,
            user_id: userId,
            time: alertObj.time,
            text: alertObj.text,
            severity: alertData.severity || 'info'
          });
        } catch (e) {
          console.error('[Saksham DB] Alert insert exception:', e);
        }
      }
      return alertObj;
    }
  };

  const clinicalNotes = {
    async getAll(userId = 'SAK-PT-8842') {
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('clinical_notes')
            .select('*')
            .order('id', { ascending: false });

          if (!error && data && data.length > 0) {
            state.caregiverDoctorNotes = data.map(d => ({
              id: d.id,
              title: d.title,
              body: d.body
            }));
            return state.caregiverDoctorNotes;
          }
        } catch (e) {
          console.warn('[Saksham DB] Clinical notes fetch error:', e);
        }
      }
      return state.caregiverDoctorNotes;
    },

    async create(noteData, userId = 'SAK-PT-8842') {
      const id = Date.now();
      const noteObj = {
        id,
        title: noteData.title,
        body: noteData.body
      };
      state.caregiverDoctorNotes.unshift(noteObj);

      if (supabaseClient) {
        try {
          await supabaseClient.from('clinical_notes').insert({
            id,
            user_id: userId,
            author_role: noteData.authorRole || 'caregiver',
            author_name: noteData.authorName || state.user,
            title: noteObj.title,
            body: noteObj.body
          });
        } catch (e) {
          console.error('[Saksham DB] Clinical note insert exception:', e);
        }
      }
      return noteObj;
    }
  };

  const doctorDirectives = {
    async getAll(userId = 'SAK-PT-8842') {
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('doctor_directives')
            .select('*')
            .order('id', { ascending: false });

          if (!error && data && data.length > 0) {
            state.doctorDirectives = data.map(d => ({
              id: d.id,
              title: d.title,
              body: d.body
            }));
            return state.doctorDirectives;
          }
        } catch (e) {
          console.warn('[Saksham DB] Doctor directives fetch error:', e);
        }
      }
      return state.doctorDirectives;
    },

    async create(directiveData, userId = 'SAK-PT-8842') {
      const id = Date.now();
      const dirObj = {
        id,
        title: directiveData.title,
        body: directiveData.body
      };
      state.doctorDirectives.unshift(dirObj);

      if (supabaseClient) {
        try {
          await supabaseClient.from('doctor_directives').insert({
            id,
            user_id: userId,
            doctor_name: directiveData.doctorName || 'Dr. Rajesh Verma',
            title: dirObj.title,
            body: dirObj.body
          });
        } catch (e) {
          console.error('[Saksham DB] Doctor directive insert exception:', e);
        }
      }
      return dirObj;
    }
  };

  /* ======================================================================= */
  /* 5. TELEMETRY & PROGRESSION REPOSITORIES                                  */
  /* ======================================================================= */
  const telemetry = {
    async getMonthRecords(userId = 'SAK-PT-8842') {
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('telemetry_records')
            .select('*')
            .order('day_number', { ascending: true });

          if (!error && data && data.length > 0) {
            state.calendarMonthDays = data.map(d => ({
              day: Number(d.day_number),
              status: d.status,
              completed: Number(d.tasks_completed),
              total: Number(d.tasks_total),
              latency: Number(d.latency_minutes),
              notes: d.notes || ''
            }));
            return state.calendarMonthDays;
          }
        } catch (e) {
          console.warn('[Saksham DB] Telemetry records fetch error:', e);
        }
      }
      return state.calendarMonthDays;
    },

    async saveRecord(recordData, userId = 'SAK-PT-8842') {
      const id = recordData.id || Date.now();
      if (supabaseClient) {
        try {
          await supabaseClient.from('telemetry_records').upsert({
            id,
            user_id: userId,
            record_date: recordData.recordDate || new Date().toISOString().split('T')[0],
            day_number: recordData.day,
            status: recordData.status,
            tasks_completed: recordData.completed,
            tasks_total: recordData.total,
            latency_minutes: recordData.latency,
            speech_db: recordData.speechDb || 70.0,
            tremor_amplitude_cm: recordData.tremorAmplitudeCm || 1.0,
            notes: recordData.notes
          });
        } catch (e) {
          console.error('[Saksham DB] Telemetry record upsert exception:', e);
        }
      }
    }
  };

  const progression = {
    async get(userId = 'SAK-PT-8842') {
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('user_progression')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (!error && data) {
            state.xp = Number(data.xp) || 0;
            state.level = Number(data.level) || 0;
            state.streak = Number(data.streak) || 7;
            state.waterLogged = Number(data.water_logged) || 5;
            state.waterTargetGlasses = Number(data.water_target_glasses) || 8;
            if (data.badges) {
              state.badges = Array.isArray(data.badges) ? data.badges : JSON.parse(data.badges);
            }
            return data;
          }
        } catch (e) {
          console.warn('[Saksham DB] Progression fetch error:', e);
        }
      }
      return null;
    },

    async update(userId = 'SAK-PT-8842') {
      if (supabaseClient) {
        try {
          await supabaseClient.from('user_progression').upsert({
            id: 1,
            user_id: userId,
            xp: state.xp,
            level: state.level,
            streak: state.streak,
            water_logged: state.waterLogged,
            water_target_glasses: state.waterTargetGlasses,
            badges: state.badges,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        } catch (e) {
          console.error('[Saksham DB] Progression update exception:', e);
        }
      }
    }
  };

  /* ======================================================================= */
  /* COMPREHENSIVE INITIAL HYDRATION                                         */
  /* ======================================================================= */
  async function hydrateAll(userId = 'SAK-PT-8842') {
    try {
      console.log('[Saksham DB] Starting database hydration for user:', userId);
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
      console.log('[Saksham DB] Database hydration complete.');
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
      console.error('[Saksham DB] Hydration error:', err);
    }
  }

  // Initialize immediately on script parse
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
