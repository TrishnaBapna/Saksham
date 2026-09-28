/* ======================================================================= */
/* SAKSHAM APPLICATION STATE & PERSISTENCE STORE                           */
/* ======================================================================= */

var currentLang = window.currentLang = localStorage.getItem('saksham_lang') || 'en';
var currentVoiceLang = window.currentVoiceLang = window.currentLang;

window.cachedVoices = [];

var state = window.state = {
  user: 'Kalyani Sharma',
  role: 'patient',
  uid: 'SAK-PT-8842',
  wakeTime: '08:00',
  xp: 0, // Starts at Level 0 (0 XP baseline!)
  level: 0,
  streak: 7,
  waterLogged: 5,
  waterTargetGlasses: 8,
  selectedDate: new Date().toISOString().split('T')[0],
  timeframeMode: 'daily',
  geminiApiKey: localStorage.getItem('saksham_gemini_api_key') || localStorage.getItem('harmony_gemini_api_key') || 'AQ.Ab8RN6Ieeayf9Knp5fkPizRnmFxjpj23C8TPP7Kd7mojI6Ke0g',

  // Active Task Countdown Timer & Assisted Check-In State
  taskTimer: {
    activeTaskId: null,
    totalSeconds: 15 * 60, // Default 15 minutes
    remainingSeconds: 15 * 60,
    intervalId: null,
    status: 'idle', // 'idle' | 'running' | 'paused' | 'expired'
    startTime: null,
    elapsedSeconds: 0
  },

  // Monthly calendar simulated history (Sept 2026)
  calendarMonthDays: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, status: 'pending', completed: 0, total: 5, latency: 0, notes: "Upcoming" })),

  tasks: [],

  badges: [],
  eveningGuardActive: false,
  activeRunnerTaskId: null,

  familiarPeople: [],
  caregiverAlerts: [],
  caregiverDoctorNotes: [],
  doctorDirectives: []
};


var currentHobbyIdx = window.currentHobbyIdx = 0;
var currentCueIndex = window.currentCueIndex = 0;
var activeAlarmTaskId = window.activeAlarmTaskId = null;
var webcamStream = window.webcamStream = null;
var baseFontSize = window.baseFontSize = 16;


function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const s = String(timeStr).trim();
  // Match 12-hour format: "08:30 AM", "8:30 AM", "2:15 PM"
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let hours = parseInt(m12[1], 10);
    const minutes = parseInt(m12[2], 10);
    const meridian = m12[3].toUpperCase();
    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  // Match 24-hour format: "14:30", "08:00"
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hours = parseInt(m24[1], 10);
    const minutes = parseInt(m24[2], 10);
    return hours * 60 + minutes;
  }
  return 0;
}

function formatMinutesTo12Hour(totalMins) {
  const norm = ((totalMins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  const meridian = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${meridian}`;
}

function persistTasks() {
  try {
    localStorage.setItem('saksham_tasks', JSON.stringify(state.tasks));
  } catch (err) {
    console.error('[Saksham Storage] Error saving tasks:', err);
  }
}

function loadPersistedTasks() {
  try {
    const raw = localStorage.getItem('saksham_tasks');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Strip any stale legacy lock flags so reminders can alarm properly
        parsed.forEach(t => {
          delete t.alertedToday;
          delete t.alertedForThisMinute;
        });
        state.tasks = parsed;
        console.log('[Saksham Storage] Loaded', parsed.length, 'tasks from localStorage.');
      }
    }
  } catch (err) {
    console.error('[Saksham Storage] Error loading tasks:', err);
  }
}

async function syncStateWithDatabase() {
  if (window.dbService && typeof window.dbService.hydrateAll === 'function') {
    await window.dbService.hydrateAll(state.uid || 'SAK-PT-8842');
  }
}


