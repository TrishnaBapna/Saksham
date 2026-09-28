-- =======================================================================
-- SAKSHAM SEED DATA SCRIPT
-- Populates initial state for demo & production initialization
-- =======================================================================

-- 1. PROFILES
INSERT INTO profiles (id, name, role, caregiver_name, caregiver_phone, lang, pin, is_guest)
VALUES 
  ('SAK-PT-8842', 'Kalyani Sharma', 'patient', 'Aarav Sharma', '+91 98765 43210', 'en', '', false),
  ('USER-CG-01', 'Aarav Sharma', 'caregiver', 'Aarav Sharma', '+91 98765 43210', 'en', '', false),
  ('USER-DOC-01', 'Dr. Rajesh Verma, MD', 'doctor', 'Aarav Sharma', '+91 98765 43210', 'en', '', false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  caregiver_name = EXCLUDED.caregiver_name,
  caregiver_phone = EXCLUDED.caregiver_phone;

-- 2. USER PROGRESSION
INSERT INTO user_progression (id, user_id, xp, level, streak, water_logged, water_target_glasses, badges)
VALUES (
  1,
  'SAK-PT-8842',
  0,
  0,
  7,
  5,
  8,
  '[
    {"id": "early_bird", "title": "Early Bird", "icon": "🌅", "unlocked": true, "desc": "Completed morning routine before 9:00 AM", "date": "Earned Sept 24, 2026"},
    {"id": "mind_master", "title": "Mind Master", "icon": "🧠", "unlocked": true, "desc": "Achieved 100% in Mind Clinic games", "date": "Earned Sept 23, 2026"},
    {"id": "consistency_champ", "title": "Consistency Champ", "icon": "🔥", "unlocked": true, "desc": "5-day continuous routine adherence streak", "date": "Earned Sept 25, 2026"},
    {"id": "hydration_hero", "title": "Hydration Hero", "icon": "💧", "unlocked": false, "desc": "Drink 8 glasses of water in a day (5/8 logged)", "date": "3 glasses remaining"}
  ]'::jsonb
)
ON CONFLICT (user_id) DO UPDATE SET
  xp = EXCLUDED.xp,
  level = EXCLUDED.level,
  streak = EXCLUDED.streak,
  water_logged = EXCLUDED.water_logged,
  badges = EXCLUDED.badges;

-- 3. ROUTINE TASKS
INSERT INTO tasks (
  id, user_id, title, time, raw_time, sound, done, tag, status, latency_minutes,
  cue_question, cue_options, correct_option_index, cue_hint, attempts_left,
  runner_steps, diagnostic_question, diagnostic_checkpoints
)
VALUES
(
  1,
  'SAK-PT-8842',
  'Morning Herbal Tea & Gentle Hydration',
  '08:00 AM',
  '08:00',
  'bell',
  false,
  'Wellness',
  'pending',
  4,
  'You woke up at 08:00 AM. What warm drink gently hydrates your body before any medication?',
  '["Prepare a warm herbal tea with water in the pot", "Immediately eat heavy scrambled eggs", "Start a fast 5 km walk"]'::jsonb,
  0,
  'Taking warm herbal tea hydrates your stomach for smooth morning Levodopa absorption.',
  3,
  '["Take out the tea pot and pour fresh clean water into it", "Place the pot on the stove and turn on the flame to heat", "Put your herbal tea bag into your favorite mug", "Pour the warm water into the mug and let it steep for 2 minutes"]'::jsonb,
  'What are you doing right now with your tea?',
  '[
    {"icon": "🫖", "currentDoing": "I took out the pot and poured water in it", "nextStepSummary": "Put pot on stove and turn on flame", "nextStep": "Place the pot on the stove and turn on the flame.", "spokenCue": "Great start! Now place the pot onto the gas stove and turn on the flame.", "stepIndex": 1, "tip": "Set heat to medium and make sure the pot handle is turned safely inwards."},
    {"icon": "🔥", "currentDoing": "The water is heating or boiling on the stove", "nextStepSummary": "Put the tea bag into your mug", "nextStep": "Put the herbal tea bag into your mug, ready for water.", "spokenCue": "The water is heating up nicely. Now put your herbal tea bag into your mug.", "stepIndex": 2, "tip": "Keep the mug right on the counter next to the stove so you do not have to carry hot water far."},
    {"icon": "📦", "currentDoing": "I have the tea bag in my mug", "nextStepSummary": "Pour the hot water and let it steep", "nextStep": "Carefully pour the hot water into the mug and let it steep for 2 minutes.", "spokenCue": "Carefully pour the hot water into your mug. Let it steep calmly for 2 minutes.", "stepIndex": 3, "tip": "Hold the pot handle with both hands for stability."},
    {"icon": "❓", "currentDoing": "I just started or forgot where to begin", "nextStepSummary": "Take out the pot and add water", "nextStep": "Take out the tea pot and pour 1 glass of fresh water into it.", "spokenCue": "No worries at all! Start by taking out your tea pot and filling it with fresh water.", "stepIndex": 0, "tip": "Use the tap or filtered water jug."}
  ]'::jsonb
),
(
  2,
  'SAK-PT-8842',
  'Morning Levodopa (100mg) Medication (Before Food)',
  '08:30 AM',
  '08:30',
  'bell',
  false,
  'Medication',
  'pending',
  12,
  'It is 08:30 AM before breakfast. What vital medicine needs to be taken now with a sip of water?',
  '["Afternoon Vitamin D supplement", "Morning Levodopa (100mg) dose", "Bedtime sleep tea"]'::jsonb,
  1,
  'Levodopa works best on an empty stomach 30-45 minutes before food.',
  3,
  '["Get a clean glass of room-temperature drinking water", "Open the green morning compartment of your pillbox", "Take out one 100mg Levodopa tablet", "Swallow tablet with water and wait 30-45 mins before breakfast"]'::jsonb,
  'What are you doing right now with your medication?',
  '[
    {"icon": "💧", "currentDoing": "I have my glass of water ready, but where is my medicine?", "nextStepSummary": "Open the green pillbox compartment", "nextStep": "Open the green morning compartment of your pillbox on the counter.", "spokenCue": "You have your water ready. Now open the green morning compartment of your pillbox.", "stepIndex": 1, "tip": "The green compartment is labeled 08:30 AM Morning."},
    {"icon": "💊", "currentDoing": "I opened the pillbox and have the tablet in my hand", "nextStepSummary": "Take tablet with water", "nextStep": "Place the tablet on your tongue and take a full swallow of water.", "spokenCue": "Place the tablet on your tongue and drink a full swallow of water.", "stepIndex": 3, "tip": "Tilt your chin slightly forward as you swallow."},
    {"icon": "🍽️", "currentDoing": "I am about to eat breakfast right now", "nextStepSummary": "Pause food! Take Levodopa 30-45 mins before", "nextStep": "Pause breakfast! Take your Levodopa now with water, then wait 30-45 mins before eating.", "spokenCue": "Remember to take your Levodopa first. Waiting 30 minutes before eating allows full absorption.", "stepIndex": 0, "tip": "Dietary protein can block Levodopa absorption if taken at the same time."},
    {"icon": "❓", "currentDoing": "I cannot find my green pill organizer", "nextStepSummary": "Check bedside table or kitchen counter", "nextStep": "Look on the kitchen counter next to the water kettle, or on your bedside table.", "spokenCue": "Check the kitchen counter next to the kettle, or Aarav care shelf.", "stepIndex": 1, "tip": "If still missing, tap Call Aarav below."}
  ]'::jsonb
),
(
  3,
  'SAK-PT-8842',
  'Buttoning Shirt & Morning Dressing',
  '09:00 AM',
  '09:00',
  'bell',
  false,
  'Motor',
  'pending',
  19,
  'It is 09:00 AM. What fine motor activity prepares you for a fresh day?',
  '["Buttoning your morning shirt slowly and steadily", "Running outdoors without shoes", "Leaving clothes untouched"]'::jsonb,
  0,
  'Taking 15-20 calm minutes for buttoning keeps finger coordination sharp.',
  3,
  '["Lay your morning shirt flat and align collar smoothly", "Gently pinch top button with your thumb and index finger", "Guide each button through slot calmly from top to bottom", "Check mirror and smooth sleeves down comfortably"]'::jsonb,
  'What are you doing right now with dressing?',
  '[
    {"icon": "👔", "currentDoing": "I put the shirt on, but buttons are uneven or mixed up", "nextStepSummary": "Unbutton and match the top collar button first", "nextStep": "Unbutton gently, match the top two collar tips, and slide the very top button first.", "spokenCue": "No worries! Unbutton gently, line up the collar at the top, and start with the very first button.", "stepIndex": 1, "tip": "Starting from the top keeps all lower buttons properly aligned."},
    {"icon": "🤏", "currentDoing": "My fingers feel stiff or shaking trying to pinch buttons", "nextStepSummary": "Rest hands for 15s and shake gently", "nextStep": "Rest your hands flat on your knees for 15 seconds, shake gently, then use both hands together.", "spokenCue": "Rest your hands for a moment. Take a deep breath, gently wiggle your fingers, and try with both hands.", "stepIndex": 2, "tip": "Using your opposite thumb behind the hole provides a steady backstop."},
    {"icon": "❓", "currentDoing": "I don't know which button goes where", "nextStepSummary": "Slide the top button near your neck first", "nextStep": "Find the button nearest your neck and push it through the highest hole.", "spokenCue": "Find the top button right near your neck and slide it into the highest hole.", "stepIndex": 1, "tip": "Work down one button at a time."}
  ]'::jsonb
),
(
  4,
  'SAK-PT-8842',
  'Nutritious Breakfast with Antioxidant Berries',
  '09:15 AM',
  '09:15',
  'sax',
  false,
  'Food',
  'pending',
  8,
  'It is 09:15 AM. What breakfast supports dopamine cells without blocking medication?',
  '["Heavy pork sausage and melted cheese", "Wild berries, oatmeal & chamomile tea", "Three cups of strong black espresso"]'::jsonb,
  1,
  'Berries provide neural antioxidants while keeping heavy protein for dinner.',
  3,
  '["Prepare a warm bowl of oatmeal or whole grain porridge", "Add a handful of raw walnuts for omega-3 brain nourishment", "Top with wild antioxidant blueberries or fresh fruit", "Enjoy calmly, keeping heavy meats and dairy for dinner"]'::jsonb,
  'What are you doing right now with breakfast?',
  '[
    {"icon": "🥣", "currentDoing": "I have my warm oatmeal bowl ready", "nextStepSummary": "Add blueberries and walnuts", "nextStep": "Sprinkle a handful of fresh berries and walnuts on top for dopamine protection.", "spokenCue": "Your warm oatmeal is ready. Now add a handful of fresh blueberries and walnuts on top.", "stepIndex": 1, "tip": "Walnuts provide healthy omega-3 fatty acids for brain cell membrane fluidity."},
    {"icon": "🥛", "currentDoing": "I was thinking of drinking a large glass of milk or eating eggs", "nextStepSummary": "Keep protein light until evening", "nextStep": "Keep heavy protein for dinner so your morning Levodopa has full motor efficacy.", "spokenCue": "Save heavy protein for dinner so your morning Levodopa stays smooth and active.", "stepIndex": 3, "tip": "Herbal tea, warm water, or almond milk are excellent morning choices."}
  ]'::jsonb
),
(
  5,
  'SAK-PT-8842',
  '15-Min Speech Loudness Drill (AHHH)',
  '10:30 AM',
  '10:30',
  'sax',
  false,
  'Speech',
  'pending',
  15,
  'It''s 10:30 AM mid-morning. What vocal exercise helps maintain clear speech volume?',
  '["Speaking in a very soft whisper", "Sustained vocalization (''AHHH'') with full breath", "Complete silence for 3 hours"]'::jsonb,
  1,
  'Loud, clear vowel sounds strengthen vocal cords against Parkinsonian vocal fade.',
  3,
  '["Sit tall with your shoulders back and open chest", "Inhale a deep diaphragmatic breath through your nose", "Project your voice forward with a sustained ''AHHH'' for 10 seconds", "Repeat 3 times aiming for green target meter above 70 dB"]'::jsonb,
  'What are you doing right now for your voice exercise?',
  '[
    {"icon": "🪑", "currentDoing": "I am sitting upright, but don''t know how loud to project", "nextStepSummary": "Inhale deep breath through nose", "nextStep": "Inhale a slow, deep breath through your nose expanding your belly.", "spokenCue": "Sit tall with chest open. Take a deep breath filling your lungs.", "stepIndex": 1, "tip": "Posture is key — keep your chin level with the horizon."},
    {"icon": "🗣️", "currentDoing": "I took a deep breath, what sound do I make?", "nextStepSummary": "Produce loud sustained ''AHHH'' sound", "nextStep": "Produce a loud, steady ''AHHH'' across the room for 8-10 seconds.", "spokenCue": "Now project a loud, clear AHHH sound across the room for 8 seconds.", "stepIndex": 2, "tip": "Imagine calling out to a friend across the garden."}
  ]'::jsonb
),
(
  6,
  'SAK-PT-8842',
  'Afternoon Levodopa (100mg) Dose',
  '01:00 PM',
  '13:00',
  'bell',
  false,
  'Medication',
  'pending',
  5,
  'It''s 01:00 PM midday. What routine keeps motor tremor steady throughout the afternoon?',
  '["Afternoon Levodopa (100mg) dose", "Taking a 4-hour uninterrupted sleep", "Skipping dose until evening"]'::jsonb,
  0,
  'Timed midday doses prevent off-periods and rigidity.',
  3,
  '["Pause afternoon activities and sit comfortably", "Open 1:00 PM yellow scheduled midday Levodopa dose", "Swallow with room-temperature water", "Rest seated for 5 minutes to let dopamine absorption stabilize"]'::jsonb,
  'What are you doing right now for your 1 PM dose?',
  '[
    {"icon": "🟡", "currentDoing": "I am seated looking for my 1 PM dose", "nextStepSummary": "Open yellow middle pill compartment", "nextStep": "Open the yellow middle compartment labeled 1:00 PM in your pillbox.", "spokenCue": "Open the yellow middle compartment labeled 1:00 PM in your pillbox.", "stepIndex": 1, "tip": "The yellow compartment holds your afternoon dose."},
    {"icon": "💊", "currentDoing": "I took the tablet with water", "nextStepSummary": "Rest seated for 5 minutes and tick Done", "nextStep": "Drink another sip of water, rest seated for 5 minutes, and tick Done.", "spokenCue": "Take another sip of water, rest comfortably for 5 minutes, and tap Complete Task.", "stepIndex": 3, "tip": "Resting lets the medication dissolve without motor strain."}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  time = EXCLUDED.time,
  done = EXCLUDED.done,
  status = EXCLUDED.status;

-- 4. LOVED ONES
INSERT INTO loved_ones (id, user_id, name, role, phone, whatsapp, email, clue, img, options)
VALUES
(
  1,
  'SAK-PT-8842',
  'Aarav Sharma',
  'Primary Caregiver (Son)',
  '+91 98765 43210',
  '919876543210',
  'aarav.sharma@sakshamcare.in',
  'Your caring son Aarav who visits every evening and brings fresh fruits and groceries.',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
  '["Aarav Sharma (Son)", "Dr. Rajesh Verma", "Neighbor Ramesh", "Pharmacist Suresh"]'::jsonb
),
(
  2,
  'SAK-PT-8842',
  'Ananya Sharma',
  'Granddaughter',
  '+91 98765 43211',
  '919876543211',
  'ananya.sharma@sakshamcare.in',
  'Your granddaughter Ananya who loves drawing colorful rangoli and painting flowers with you.',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  '["Ananya Sharma (Granddaughter)", "Nurse Priya", "Aunt Meena", "Pooja"]'::jsonb
),
(
  3,
  'SAK-PT-8842',
  'Dr. Rajesh Verma',
  'Neurologist',
  '+91 98123 45678',
  '919812345678',
  'dr.rajesh.verma@neurologyclinic.in',
  'Dr. Rajesh Verma who checks your motor rhythm and Levodopa timing.',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80',
  '["Dr. Rajesh Verma (Neurologist)", "Aarav Sharma", "Physiotherapist Amit", "Rohan"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone;

-- 5. CAREGIVER ALERTS
INSERT INTO caregiver_alerts (id, user_id, time, text, severity, acknowledged)
VALUES
(1, 'SAK-PT-8842', '09:19 AM', 'Task ''Buttoning Shirt & Dressing'' took 19 mins (Needed extra motor assistance).', 'warning', false),
(2, 'SAK-PT-8842', '11:42 AM', 'Midday Levodopa preparation snoozed for 5 minutes.', 'info', false)
ON CONFLICT (id) DO NOTHING;

-- 6. CLINICAL NOTES
INSERT INTO clinical_notes (id, user_id, author_role, author_name, title, body)
VALUES
(1, 'SAK-PT-8842', 'caregiver', 'Aarav Sharma', 'Pre-Dose Tremor Observation', 'Slight motor tremor in right thumb prior to 2 PM Levodopa dose. Dressing took 19 minutes.')
ON CONFLICT (id) DO NOTHING;

-- 7. DOCTOR DIRECTIVES
INSERT INTO doctor_directives (id, user_id, doctor_name, title, body)
VALUES
(1, 'SAK-PT-8842', 'Dr. Rajesh Verma', 'Levodopa Timing Guidance', 'Keep protein meals separated by 45 minutes from dose for maximal intestinal uptake.')
ON CONFLICT (id) DO NOTHING;

-- 8. SEPTEMBER TELEMETRY RECORDS (30 Days)
INSERT INTO telemetry_records (id, user_id, record_date, day_number, status, tasks_completed, tasks_total, latency_minutes, speech_db, tremor_amplitude_cm, notes)
VALUES
(1, 'SAK-PT-8842', '2026-09-01', 1, 'all_done', 5, 5, 4, 72.0, 0.9, 'All on time'),
(2, 'SAK-PT-8842', '2026-09-02', 2, 'all_done', 5, 5, 6, 72.0, 0.8, 'Speech 72 dB'),
(3, 'SAK-PT-8842', '2026-09-03', 3, 'delayed', 5, 5, 19, 68.0, 1.4, 'Buttoning shirt took 19m'),
(4, 'SAK-PT-8842', '2026-09-04', 4, 'all_done', 5, 5, 5, 71.0, 0.9, 'Morning walk 1.5 km'),
(5, 'SAK-PT-8842', '2026-09-05', 5, 'missed', 4, 5, 12, 65.0, 1.2, 'Missed afternoon finger tap'),
(6, 'SAK-PT-8842', '2026-09-06', 6, 'all_done', 5, 5, 4, 73.0, 0.8, 'Great mood'),
(7, 'SAK-PT-8842', '2026-09-07', 7, 'all_done', 5, 5, 5, 70.0, 0.9, 'Mind Clinic 50 XP'),
(8, 'SAK-PT-8842', '2026-09-08', 8, 'all_done', 5, 5, 6, 74.0, 0.7, 'Water goal reached'),
(9, 'SAK-PT-8842', '2026-09-09', 9, 'delayed', 5, 5, 18, 69.0, 1.3, 'Dressing required extra time'),
(10, 'SAK-PT-8842', '2026-09-10', 10, 'all_done', 5, 5, 5, 72.0, 0.9, 'All on time'),
(11, 'SAK-PT-8842', '2026-09-11', 11, 'all_done', 5, 5, 4, 71.0, 0.8, 'Steady tremor score'),
(12, 'SAK-PT-8842', '2026-09-12', 12, 'missed', 3, 5, 25, 64.0, 1.5, 'Missed speech drill & walk'),
(13, 'SAK-PT-8842', '2026-09-13', 13, 'all_done', 5, 5, 5, 73.0, 0.8, 'Metronome cadence 60'),
(14, 'SAK-PT-8842', '2026-09-14', 14, 'all_done', 5, 5, 4, 72.0, 0.8, 'Good energy'),
(15, 'SAK-PT-8842', '2026-09-15', 15, 'all_done', 5, 5, 5, 71.0, 0.9, 'Caregiver visit'),
(16, 'SAK-PT-8842', '2026-09-16', 16, 'delayed', 5, 5, 22, 67.0, 1.4, 'Midday Levodopa delayed'),
(17, 'SAK-PT-8842', '2026-09-17', 17, 'all_done', 5, 5, 5, 73.0, 0.8, 'All on time'),
(18, 'SAK-PT-8842', '2026-09-18', 18, 'all_done', 5, 5, 6, 72.0, 0.8, 'Wild berries breakfast'),
(19, 'SAK-PT-8842', '2026-09-19', 19, 'all_done', 5, 5, 4, 75.0, 0.7, 'Puzzle games 100 XP'),
(20, 'SAK-PT-8842', '2026-09-20', 20, 'missed', 4, 5, 15, 66.0, 1.2, 'Skipped hydration glass'),
(21, 'SAK-PT-8842', '2026-09-21', 21, 'all_done', 5, 5, 5, 72.0, 0.9, 'Doctor consultation'),
(22, 'SAK-PT-8842', '2026-09-22', 22, 'delayed', 5, 5, 19, 68.0, 1.3, 'Buttoning shirt took 19m'),
(23, 'SAK-PT-8842', '2026-09-23', 23, 'all_done', 5, 5, 5, 74.0, 0.8, 'All on time'),
(24, 'SAK-PT-8842', '2026-09-24', 24, 'all_done', 5, 5, 4, 75.0, 0.7, 'Metronome walk 1.4 km'),
(25, 'SAK-PT-8842', '2026-09-25', 25, 'all_done', 5, 5, 5, 74.0, 0.8, 'Today active!'),
(26, 'SAK-PT-8842', '2026-09-26', 26, 'pending', 0, 5, 0, 70.0, 1.0, 'Upcoming'),
(27, 'SAK-PT-8842', '2026-09-27', 27, 'pending', 0, 5, 0, 70.0, 1.0, 'Upcoming'),
(28, 'SAK-PT-8842', '2026-09-28', 28, 'pending', 0, 5, 0, 70.0, 1.0, 'Upcoming'),
(29, 'SAK-PT-8842', '2026-09-29', 29, 'pending', 0, 5, 0, 70.0, 1.0, 'Upcoming'),
(30, 'SAK-PT-8842', '2026-09-30', 30, 'pending', 0, 5, 0, 70.0, 1.0, 'Upcoming')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  tasks_completed = EXCLUDED.tasks_completed,
  latency_minutes = EXCLUDED.latency_minutes,
  notes = EXCLUDED.notes;
