/* ======================================================================= */
/* SAKSHAM APPLICATION STATE & PERSISTENCE STORE                           */
/* ======================================================================= */

    let currentLang = localStorage.getItem('saksham_lang') || 'en';
    let currentVoiceLang = currentLang;

let cachedVoices = [];

    let state = {
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
      calendarMonthDays: [
        { day: 1, status: 'all_done', completed: 5, total: 5, latency: 4, notes: "All on time" },
        { day: 2, status: 'all_done', completed: 5, total: 5, latency: 6, notes: "Speech 72 dB" },
        { day: 3, status: 'delayed', completed: 5, total: 5, latency: 19, notes: "Buttoning shirt took 19m" },
        { day: 4, status: 'all_done', completed: 5, total: 5, latency: 5, notes: "Morning walk 1.5 km" },
        { day: 5, status: 'missed', completed: 4, total: 5, latency: 12, notes: "Missed afternoon finger tap" },
        { day: 6, status: 'all_done', completed: 5, total: 5, latency: 4, notes: "Great mood" },
        { day: 7, status: 'all_done', completed: 5, total: 5, latency: 5, notes: "Mind Clinic 50 XP" },
        { day: 8, status: 'all_done', completed: 5, total: 5, latency: 6, notes: "Water goal reached" },
        { day: 9, status: 'delayed', completed: 5, total: 5, latency: 18, notes: "Dressing required extra time" },
        { day: 10, status: 'all_done', completed: 5, total: 5, latency: 5, notes: "All on time" },
        { day: 11, status: 'all_done', completed: 5, total: 5, latency: 4, notes: "Steady tremor score" },
        { day: 12, status: 'missed', completed: 3, total: 5, latency: 25, notes: "Missed speech drill & walk" },
        { day: 13, status: 'all_done', completed: 5, total: 5, latency: 5, notes: "Metronome cadence 60" },
        { day: 14, status: 'all_done', completed: 5, total: 5, latency: 4, notes: "Good energy" },
        { day: 15, status: 'all_done', completed: 5, total: 5, latency: 5, notes: "Caregiver visit" },
        { day: 16, status: 'delayed', completed: 5, total: 5, latency: 22, notes: "Midday Levodopa delayed" },
        { day: 17, status: 'all_done', completed: 5, total: 5, latency: 5, notes: "All on time" },
        { day: 18, status: 'all_done', completed: 5, total: 5, latency: 6, notes: "Wild berries breakfast" },
        { day: 19, status: 'all_done', completed: 5, total: 5, latency: 4, notes: "Puzzle games 100 XP" },
        { day: 20, status: 'missed', completed: 4, total: 5, latency: 15, notes: "Skipped hydration glass" },
        { day: 21, status: 'all_done', completed: 5, total: 5, latency: 5, notes: "Doctor consultation" },
        { day: 22, status: 'delayed', completed: 5, total: 5, latency: 19, notes: "Buttoning shirt took 19m" },
        { day: 23, status: 'all_done', completed: 5, total: 5, latency: 5, notes: "All on time" },
        { day: 24, status: 'all_done', completed: 5, total: 5, latency: 4, notes: "Metronome walk 1.4 km" },
        { day: 25, status: 'all_done', completed: 5, total: 5, latency: 5, notes: "Today active!" },
        { day: 26, status: 'pending', completed: 0, total: 5, latency: 0, notes: "Upcoming" },
        { day: 27, status: 'pending', completed: 0, total: 5, latency: 0, notes: "Upcoming" },
        { day: 28, status: 'pending', completed: 0, total: 5, latency: 0, notes: "Upcoming" },
        { day: 29, status: 'pending', completed: 0, total: 5, latency: 0, notes: "Upcoming" },
        { day: 30, status: 'pending', completed: 0, total: 5, latency: 0, notes: "Upcoming" }
      ],

      tasks: [
        { 
          id: 1, 
          time: "08:00 AM", 
          title: "Morning Herbal Tea & Gentle Hydration", 
          sound: "bell", 
          done: false, 
          tag: "Wellness", 
          status: 'pending',
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
          ],
          diagnosticQuestion: "What are you doing right now with your tea?",
          diagnosticCheckpoints: [
            {
              icon: "🫖",
              currentDoing: "I took out the pot and poured water in it",
              nextStepSummary: "Put pot on stove and turn on flame",
              nextStep: "Place the pot on the stove and turn on the flame.",
              spokenCue: "Great start! Now place the pot onto the gas stove and turn on the flame.",
              stepIndex: 1,
              tip: "Set heat to medium and make sure the pot handle is turned safely inwards."
            },
            {
              icon: "🔥",
              currentDoing: "The water is heating or boiling on the stove",
              nextStepSummary: "Put the tea bag into your mug",
              nextStep: "Put the herbal tea bag into your mug, ready for water.",
              spokenCue: "The water is heating up nicely. Now put your herbal tea bag into your mug.",
              stepIndex: 2,
              tip: "Keep the mug right on the counter next to the stove so you do not have to carry hot water far."
            },
            {
              icon: "📦",
              currentDoing: "I have the tea bag in my mug",
              nextStepSummary: "Pour the hot water and let it steep",
              nextStep: "Carefully pour the hot water into the mug and let it steep for 2 minutes.",
              spokenCue: "Carefully pour the hot water into your mug. Let it steep calmly for 2 minutes.",
              stepIndex: 3,
              tip: "Hold the pot handle with both hands for stability."
            },
            {
              icon: "❓",
              currentDoing: "I just started or forgot where to begin",
              nextStepSummary: "Take out the pot and add water",
              nextStep: "Take out the tea pot and pour 1 glass of fresh water into it.",
              spokenCue: "No worries at all! Start by taking out your tea pot and filling it with fresh water.",
              stepIndex: 0,
              tip: "Use the tap or filtered water jug."
            }
          ]
        },
        { 
          id: 2, 
          time: "08:30 AM", 
          title: "Morning Levodopa (100mg) Medication (Before Food)", 
          sound: "bell", 
          done: false, 
          tag: "Medication", 
          status: 'pending',
          latencyMinutes: 12,
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
          ],
          diagnosticQuestion: "What are you doing right now with your medication?",
          diagnosticCheckpoints: [
            {
              icon: "💧",
              currentDoing: "I have my glass of water ready, but where is my medicine?",
              nextStepSummary: "Open the green pillbox compartment",
              nextStep: "Open the green morning compartment of your pillbox on the counter.",
              spokenCue: "You have your water ready. Now open the green morning compartment of your pillbox.",
              stepIndex: 1,
              tip: "The green compartment is labeled '08:30 AM Morning'."
            },
            {
              icon: "💊",
              currentDoing: "I opened the pillbox and have the tablet in my hand",
              nextStepSummary: "Take tablet with water",
              nextStep: "Place the tablet on your tongue and take a full swallow of water.",
              spokenCue: "Place the tablet on your tongue and drink a full swallow of water.",
              stepIndex: 3,
              tip: "Tilt your chin slightly forward as you swallow."
            },
            {
              icon: "🍽️",
              currentDoing: "I am about to eat breakfast right now",
              nextStepSummary: "Pause food! Take Levodopa 30-45 mins before",
              nextStep: "Pause breakfast! Take your Levodopa now with water, then wait 30-45 mins before eating.",
              spokenCue: "Remember to take your Levodopa first. Waiting 30 minutes before eating allows full absorption.",
              stepIndex: 0,
              tip: "Dietary protein can block Levodopa absorption if taken at the same time."
            },
            {
              icon: "❓",
              currentDoing: "I cannot find my green pill organizer",
              nextStepSummary: "Check bedside table or kitchen counter",
              nextStep: "Look on the kitchen counter next to the water kettle, or on your bedside table.",
              spokenCue: "Check the kitchen counter next to the kettle, or Aarav's care shelf.",
              stepIndex: 1,
              tip: "If still missing, tap 'Call Aarav' below."
            }
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
          ],
          diagnosticQuestion: "What are you doing right now with dressing?",
          diagnosticCheckpoints: [
            {
              icon: "👔",
              currentDoing: "I put the shirt on, but buttons are uneven or mixed up",
              nextStepSummary: "Unbutton and match the top collar button first",
              nextStep: "Unbutton gently, match the top two collar tips, and slide the very top button first.",
              spokenCue: "No worries! Unbutton gently, line up the collar at the top, and start with the very first button.",
              stepIndex: 1,
              tip: "Starting from the top keeps all lower buttons properly aligned."
            },
            {
              icon: "🤏",
              currentDoing: "My fingers feel stiff or shaking trying to pinch buttons",
              nextStepSummary: "Rest hands for 15s and shake gently",
              nextStep: "Rest your hands flat on your knees for 15 seconds, shake gently, then use both hands together.",
              spokenCue: "Rest your hands for a moment. Take a deep breath, gently wiggle your fingers, and try with both hands.",
              stepIndex: 2,
              tip: "Using your opposite thumb behind the hole provides a steady backstop."
            },
            {
              icon: "❓",
              currentDoing: "I don't know which button goes where",
              nextStepSummary: "Slide the top button near your neck first",
              nextStep: "Find the button nearest your neck and push it through the highest hole.",
              spokenCue: "Find the top button right near your neck and slide it into the highest hole.",
              stepIndex: 1,
              tip: "Work down one button at a time."
            }
          ]
        },
        { 
          id: 4, 
          time: "09:15 AM", 
          title: "Nutritious Breakfast with Antioxidant Berries", 
          sound: "sax", 
          done: false, 
          tag: "Food", 
          status: 'pending',
          latencyMinutes: 8,
          cueQuestion: "It is 09:15 AM. What breakfast supports dopamine cells without blocking medication?",
          cueOptions: ["Heavy pork sausage and melted cheese", "Wild berries, oatmeal & chamomile tea", "Three cups of strong black espresso"],
          correctOptionIndex: 1,
          cueHint: "Berries provide neural antioxidants while keeping heavy protein for dinner.",
          attemptsLeft: 3,
          runnerSteps: [
            "Prepare a warm bowl of oatmeal or whole grain porridge",
            "Add a handful of raw walnuts for omega-3 brain nourishment",
            "Top with wild antioxidant blueberries or fresh fruit",
            "Enjoy calmly, keeping heavy meats and dairy for dinner"
          ],
          diagnosticQuestion: "What are you doing right now with breakfast?",
          diagnosticCheckpoints: [
            {
              icon: "🥣",
              currentDoing: "I have my warm oatmeal bowl ready",
              nextStepSummary: "Add blueberries and walnuts",
              nextStep: "Sprinkle a handful of fresh berries and walnuts on top for dopamine protection.",
              spokenCue: "Your warm oatmeal is ready. Now add a handful of fresh blueberries and walnuts on top.",
              stepIndex: 1,
              tip: "Walnuts provide healthy omega-3 fatty acids for brain cell membrane fluidity."
            },
            {
              icon: "🥛",
              currentDoing: "I was thinking of drinking a large glass of milk or eating eggs",
              nextStepSummary: "Keep protein light until evening",
              nextStep: "Keep heavy protein for dinner so your morning Levodopa has full motor efficacy.",
              spokenCue: "Save heavy protein for dinner so your morning Levodopa stays smooth and active.",
              stepIndex: 3,
              tip: "Herbal tea, warm water, or almond milk are excellent morning choices."
            }
          ]
        },
        { 
          id: 5, 
          time: "10:30 AM", 
          title: "15-Min Speech Loudness Drill (AHHH)", 
          sound: "sax", 
          done: false, 
          tag: "Speech", 
          status: 'pending',
          latencyMinutes: 15,
          cueQuestion: "It's 10:30 AM mid-morning. What vocal exercise helps maintain clear speech volume?",
          cueOptions: ["Speaking in a very soft whisper", "Sustained vocalization ('AHHH') with full breath", "Complete silence for 3 hours"],
          correctOptionIndex: 1,
          cueHint: "Loud, clear vowel sounds strengthen vocal cords against Parkinsonian vocal fade.",
          attemptsLeft: 3,
          runnerSteps: [
            "Sit tall with your shoulders back and open chest",
            "Inhale a deep diaphragmatic breath through your nose",
            "Project your voice forward with a sustained 'AHHH' for 10 seconds",
            "Repeat 3 times aiming for green target meter above 70 dB"
          ],
          diagnosticQuestion: "What are you doing right now for your voice exercise?",
          diagnosticCheckpoints: [
            {
              icon: "🪑",
              currentDoing: "I am sitting upright, but don't know how loud to project",
              nextStepSummary: "Inhale deep breath through nose",
              nextStep: "Inhale a slow, deep breath through your nose expanding your belly.",
              spokenCue: "Sit tall with chest open. Take a deep breath filling your lungs.",
              stepIndex: 1,
              tip: "Posture is key — keep your chin level with the horizon."
            },
            {
              icon: "🗣️",
              currentDoing: "I took a deep breath, what sound do I make?",
              nextStepSummary: "Produce loud sustained 'AHHH' sound",
              nextStep: "Produce a loud, steady 'AHHH' across the room for 8-10 seconds.",
              spokenCue: "Now project a loud, clear AHHH sound across the room for 8 seconds.",
              stepIndex: 2,
              tip: "Imagine calling out to a friend across the garden."
            }
          ]
        },
        { 
          id: 6, 
          time: "01:00 PM", 
          title: "Afternoon Levodopa (100mg) Dose", 
          sound: "bell", 
          done: false, 
          tag: "Medication", 
          status: 'pending',
          latencyMinutes: 5,
          cueQuestion: "It's 01:00 PM midday. What routine keeps motor tremor steady throughout the afternoon?",
          cueOptions: ["Afternoon Levodopa (100mg) dose", "Taking a 4-hour uninterrupted sleep", "Skipping dose until evening"],
          correctOptionIndex: 0,
          cueHint: "Timed midday doses prevent off-periods and rigidity.",
          attemptsLeft: 3,
          runnerSteps: [
            "Pause afternoon activities and sit comfortably",
            "Open 1:00 PM yellow scheduled midday Levodopa dose",
            "Swallow with room-temperature water",
            "Rest seated for 5 minutes to let dopamine absorption stabilize"
          ],
          diagnosticQuestion: "What are you doing right now for your 1 PM dose?",
          diagnosticCheckpoints: [
            {
              icon: "🟡",
              currentDoing: "I am seated looking for my 1 PM dose",
              nextStepSummary: "Open yellow middle pill compartment",
              nextStep: "Open the yellow middle compartment labeled 1:00 PM in your pillbox.",
              spokenCue: "Open the yellow middle compartment labeled 1:00 PM in your pillbox.",
              stepIndex: 1,
              tip: "The yellow compartment holds your afternoon dose."
            },
            {
              icon: "💊",
              currentDoing: "I took the tablet with water",
              nextStepSummary: "Rest seated for 5 minutes and tick Done",
              nextStep: "Drink another sip of water, rest seated for 5 minutes, and tick Done.",
              spokenCue: "Take another sip of water, rest comfortably for 5 minutes, and tap Complete Task.",
              stepIndex: 3,
              tip: "Resting lets the medication dissolve without motor strain."
            }
          ]
        }
      ],

      badges: [
        { id: 'early_bird', title: 'Early Bird', icon: '🌅', unlocked: true, desc: 'Completed morning routine before 9:00 AM', date: 'Earned Sept 24, 2026' },
        { id: 'mind_master', title: 'Mind Master', icon: '🧠', unlocked: true, desc: 'Achieved 100% in Mind Clinic games', date: 'Earned Sept 23, 2026' },
        { id: 'consistency_champ', title: 'Consistency Champ', icon: '🔥', unlocked: true, desc: '5-day continuous routine adherence streak', date: 'Earned Sept 25, 2026' },
        { id: 'hydration_hero', title: 'Hydration Hero', icon: '💧', unlocked: false, desc: 'Drink 8 glasses of water in a day (5/8 logged)', date: '3 glasses remaining' }
      ],
      eveningGuardActive: false,
      activeRunnerTaskId: null,

      familiarPeople: [
        { 
          name: "Aarav Sharma", 
          role: "Primary Caregiver (Son)", 
          phone: "+91 98765 43210", 
          whatsapp: "919876543210", 
          email: "aarav.sharma@sakshamcare.in", 
          clue: "Your caring son Aarav who visits every evening and brings fresh fruits and groceries.", 
          img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80", 
          options: ["Aarav Sharma (Son)", "Dr. Rajesh Verma", "Neighbor Ramesh", "Pharmacist Suresh"] 
        },
        { 
          name: "Ananya Sharma", 
          role: "Granddaughter", 
          phone: "+91 98765 43211", 
          whatsapp: "919876543211", 
          email: "ananya.sharma@sakshamcare.in", 
          clue: "Your granddaughter Ananya who loves drawing colorful rangoli and painting flowers with you.", 
          img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80", 
          options: ["Ananya Sharma (Granddaughter)", "Nurse Priya", "Aunt Meena", "Pooja"] 
        },
        { 
          name: "Dr. Rajesh Verma", 
          role: "Neurologist", 
          phone: "+91 98123 45678", 
          whatsapp: "919812345678", 
          email: "dr.rajesh.verma@neurologyclinic.in", 
          clue: "Dr. Rajesh Verma who checks your motor rhythm and Levodopa timing.", 
          img: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80", 
          options: ["Dr. Rajesh Verma (Neurologist)", "Aarav Sharma", "Physiotherapist Amit", "Rohan"] 
        }
      ],
      caregiverAlerts: [
        { time: "09:19 AM", text: "Task 'Buttoning Shirt & Dressing' took 19 mins (Needed extra motor assistance)." },
        { time: "11:42 AM", text: "Midday Levodopa preparation snoozed for 5 minutes." }
      ],
      caregiverDoctorNotes: [
        { title: "Pre-Dose Tremor Observation", body: "Slight motor tremor in right thumb prior to 2 PM Levodopa dose. Dressing took 19 minutes." }
      ],
      doctorDirectives: [
        { title: "Levodopa Timing Guidance", body: "Keep protein meals separated by 45 minutes from dose for maximal intestinal uptake." }
      ]
    };

    const DAILY_HOBBIES = [
      { title: "Pick One Flower from the Garden Bowl", desc: "Take a mixed bowl with colorful flowers or soft petals. Gently pick up one flower with your fingers, place it into a fresh cup of water, and enjoy its soothing scent." },
      { title: "Color Sorting with Soft Balls", desc: "Take 3 colorful soft balls from a bowl. Place all yellow ones on the left, and blue ones on the right with steady finger grasps." },
      { title: "Gentle Dice Roll & Counting Game", desc: "Roll a dice on the table. Count the dots out loud, then tap your finger on the desk that exact number of times." }
    ];
    let currentHobbyIdx = 0;
    let currentCueIndex = 0;
    let activeAlarmTaskId = null;
    let webcamStream = null;
    let baseFontSize = 16;


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


