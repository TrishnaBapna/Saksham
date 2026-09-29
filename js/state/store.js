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
  streak: 0,
  waterLogged: 0,
  waterTargetGlasses: 8,
  selectedDate: new Date().toISOString().split('T')[0],
  timeframeMode: 'daily',
  geminiApiKey: localStorage.getItem('saksham_gemini_api_key') || localStorage.getItem('harmony_gemini_api_key') || '',

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
  calendarMonthDays: [],

  tasks: [],

  badges: [],
  eveningGuardActive: false,
  activeRunnerTaskId: null,

  familiarPeople: [],
  caregiverAlerts: [],
  caregiverDoctorNotes: [],
  doctorDirectives: []
};

const DEFAULT_DOCTOR_DIRECTIVES = [];
const DEFAULT_CAREGIVER_NOTES = [];


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

const DEFAULT_TASKS = [
  { 
    id: 1, 
    time: "08:00 AM", 
    title: "Morning Herbal Tea & Gentle Hydration", 
    sound: "bell", 
    done: true, 
    tag: "Wellness", 
    status: 'all_done',
    latencyMinutes: 4,
    cueQuestion: "You woke up at 08:00 AM. What warm drink gently hydrates your body before any medication?",
    cueOptions: ["Prepare a warm herbal tea with water in the pot", "Immediately eat heavy scrambled eggs", "Start a fast 5 km walk"],
    correctOptionIndex: 0,
    cueHint: "Taking warm herbal tea hydrates your stomach for smooth morning Levodopa absorption.",
    attemptsLeft: 3,
    runnerSteps: [
      "Take out the tea pot and pour fresh clean water into it",
      "Place the pot on the stove and turn on the flame to heat",
      "Put your herbal tea bag into your favorite mug",
      "Pour the warm water into the mug and let it steep for 2 minutes"
    ]
  },
  { 
    id: 2, 
    time: "08:30 AM", 
    title: "Morning Levodopa (100mg) with Water", 
    sound: "bell", 
    done: true, 
    tag: "Medication", 
    status: 'all_done',
    latencyMinutes: 6,
    cueQuestion: "It is 08:30 AM before breakfast. What vital medicine needs to be taken now with a sip of water?",
    cueOptions: ["Afternoon Vitamin D supplement", "Morning Levodopa (100mg) dose", "Bedtime sleep tea"],
    correctOptionIndex: 1,
    cueHint: "Levodopa works best on an empty stomach 30-45 minutes before food.",
    attemptsLeft: 3,
    runnerSteps: [
      "Get a clean glass of room-temperature drinking water",
      "Open the green morning compartment of your pillbox",
      "Take out one 100mg Levodopa tablet",
      "Swallow tablet with water and wait 30-45 mins before breakfast"
    ]
  },
  { 
    id: 3, 
    title: "Buttoning Shirt & Morning Dressing", 
    time: "09:00 AM", 
    sound: "bell", 
    done: false, 
    tag: "Motor", 
    status: 'pending',
    latencyMinutes: 19, // Needed more time!
    cueQuestion: "It is 09:00 AM. What fine motor activity prepares you for a fresh day?",
    cueOptions: ["Buttoning your morning shirt slowly and steadily", "Running outdoors without shoes", "Leaving clothes untouched"],
    correctOptionIndex: 0,
    cueHint: "Taking 15-20 calm minutes for buttoning keeps finger coordination sharp.",
    attemptsLeft: 3,
    runnerSteps: [
      "Lay your morning shirt flat and align collar smoothly",
      "Gently pinch top button with your thumb and index finger",
      "Guide each button through slot calmly from top to bottom",
      "Check mirror and smooth sleeves down comfortably"
    ]
  },
  { 
    id: 4, 
    time: "09:30 AM", 
    title: "Antioxidant Breakfast (Berries & Oatmeal)", 
    sound: "sax", 
    done: false, 
    snoozed: true,
    snoozeCount: 1,
    tag: "Food", 
    status: 'pending',
    latencyMinutes: 8,
    cueQuestion: "It is 09:30 AM. What breakfast supports dopamine cells without blocking medication?",
    cueOptions: ["Heavy pork sausage and melted cheese", "Wild berries, oatmeal & chamomile tea", "Three cups of strong black espresso"],
    correctOptionIndex: 1,
    cueHint: "Berries provide neural antioxidants while keeping heavy protein for dinner.",
    attemptsLeft: 3,
    runnerSteps: [
      "Prepare a warm bowl of oatmeal or whole grain porridge",
      "Add a handful of raw walnuts for omega-3 brain nourishment",
      "Top with wild antioxidant blueberries or fresh fruit",
      "Enjoy calmly, keeping heavy meats and dairy for dinner"
    ]
  },
  { 
    id: 5, 
    time: "11:00 AM", 
    title: "15-Min Speech Loudness Drill (AHHH)", 
    sound: "sax", 
    done: false, 
    tag: "Speech", 
    status: 'pending',
    latencyMinutes: 15, // Needed more time!
    cueQuestion: "It's 11:00 AM mid-morning. What vocal exercise helps maintain clear speech volume?",
    cueOptions: ["Speaking in a very soft whisper", "Sustained vocalization ('AHHH') with full breath", "Complete silence for 3 hours"],
    correctOptionIndex: 1,
    cueHint: "Loud, clear vowel sounds strengthen vocal cords against Parkinsonian vocal fade.",
    attemptsLeft: 3,
    runnerSteps: [
      "Sit tall with your shoulders back and open chest",
      "Inhale a deep diaphragmatic breath through your nose",
      "Project your voice forward with a sustained 'AHHH' for 10 seconds",
      "Repeat 3 times aiming for green target meter above 70 dB"
    ]
  },
  { 
    id: 6, 
    time: "01:00 PM", 
    title: "Nutritious Lunch & Fiber Salad", 
    sound: "sax", 
    done: false, 
    tag: "Food", 
    status: 'pending',
    latencyMinutes: 7,
    cueQuestion: "It is 01:00 PM. What nutritious lunch keeps your energy and digestive motility smooth?",
    cueOptions: ["Fiber-rich vegetable bowl and lentil soup", "High sugar deep fried snack", "Skip lunch entirely"],
    correctOptionIndex: 0,
    cueHint: "Fiber and hydration prevent constipation and optimize dopamine medication motility.",
    attemptsLeft: 3,
    runnerSteps: [
      "Sit upright in a supportive chair",
      "Take small bites and chew thoroughly",
      "Sip water between spoonfuls"
    ]
  },
  { 
    id: 7, 
    time: "04:30 PM", 
    title: "Assisted Garden Walk & Motor Steps", 
    sound: "marimba", 
    done: false, 
    tag: "Physical", 
    status: 'pending',
    latencyMinutes: 5,
    cueQuestion: "It is 04:30 PM. What outdoor exercise promotes motor rhythm and balance?",
    cueOptions: ["Assisted 15-minute garden stroll with large strides", "Sitting completely motionless", "Heavy weightlifting"],
    correctOptionIndex: 0,
    cueHint: "Taking conscious big steps and swinging arms counteracts Parkinsonian festination.",
    attemptsLeft: 3,
    runnerSteps: [
      "Wear supportive comfortable walking shoes",
      "Stand tall and take wide rhythmic strides",
      "Consciously swing arms with heel-to-toe foot placement"
    ]
  },
  { 
    id: 8, 
    time: "06:00 PM", 
    title: "Mind Clinic Cognitive Game Practice", 
    sound: "marimba", 
    done: false, 
    tag: "Cognitive", 
    status: 'pending',
    latencyMinutes: 5,
    cueQuestion: "It is 06:00 PM. What cognitive exercise stimulates synaptic recall?",
    cueOptions: ["Brain clinic card matching or math sprint", "Watching screen in silence", "Sleeping immediately"],
    correctOptionIndex: 0,
    cueHint: "Daily 10-minute cognitive games strengthen working memory pathways.",
    attemptsLeft: 3,
    runnerSteps: [
      "Open Mind Clinic Games tab",
      "Complete 1 round of Face Recall or Math Sprint",
      "Earn Brain XP and check level progression"
    ]
  }
];

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
        return;
      }
    }
  } catch (err) {
    console.error('[Saksham Storage] Error loading tasks:', err);
  }
  state.tasks = [];
  persistTasks();
  console.log('[Saksham Storage] Initialized an empty task list.');
}

function loadPersistedCareNotes() {
  try {
    const rawDirectives = localStorage.getItem('saksham_doctor_directives');
    if (rawDirectives) {
      const parsed = JSON.parse(rawDirectives);
      if (Array.isArray(parsed) && parsed.length > 0) {
        state.doctorDirectives = parsed;
      } else {
        state.doctorDirectives = [];
      }
    } else {
      state.doctorDirectives = [];
      localStorage.setItem('saksham_doctor_directives', JSON.stringify(state.doctorDirectives));
    }

    const rawNotes = localStorage.getItem('saksham_caregiver_notes');
    if (rawNotes) {
      const parsedNotes = JSON.parse(rawNotes);
      if (Array.isArray(parsedNotes) && parsedNotes.length > 0) {
        state.caregiverDoctorNotes = parsedNotes;
      } else {
        state.caregiverDoctorNotes = [];
      }
    } else {
      state.caregiverDoctorNotes = [];
      localStorage.setItem('saksham_caregiver_notes', JSON.stringify(state.caregiverDoctorNotes));
    }
  } catch (err) {
    console.error('[Saksham Storage] Error loading care notes:', err);
    state.doctorDirectives = [];
    state.caregiverDoctorNotes = [];
  }
}

function persistCareNotes() {
  try {
    localStorage.setItem('saksham_doctor_directives', JSON.stringify(state.doctorDirectives || []));
    localStorage.setItem('saksham_caregiver_notes', JSON.stringify(state.caregiverDoctorNotes || []));
  } catch (err) {
    console.warn('[Saksham Storage] Error saving care notes:', err);
  }
}

window.loadPersistedCareNotes = loadPersistedCareNotes;
window.persistCareNotes = persistCareNotes;
window.DEFAULT_DOCTOR_DIRECTIVES = DEFAULT_DOCTOR_DIRECTIVES;
window.DEFAULT_CAREGIVER_NOTES = DEFAULT_CAREGIVER_NOTES;

async function syncStateWithDatabase() {
  if (window.dbService && typeof window.dbService.hydrateAll === 'function') {
    await window.dbService.hydrateAll(state.uid || 'SAK-PT-8842');
  }
}


