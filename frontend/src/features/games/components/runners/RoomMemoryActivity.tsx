import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameDifficulty } from '../../../../types/index.js';
import {
  Camera,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Eye,
  AlertCircle,
  Volume2,
  VolumeX,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { SpeechService } from '../../../../services/speechService.js';

interface RoomMemoryActivityProps {
  difficulty?: GameDifficulty;
  onComplete: () => void;
}

export type HomeZoneId = 'bedroom' | 'living' | 'kitchen';

interface ProgressiveQuestion {
  id: string;
  objectName: string;
  question: string;
  options: string[];
  correctIndex: number;
  clue1: string; // Area clue
  clue2: string; // Function & daily anchor clue
  clue3: string; // Exact position clue
  revealedAnswer: string;
  connectedRoutine?: {
    title: string;
    description: string;
    estimatedMinutes: number;
  };
}

interface HomeZoneData {
  id: HomeZoneId;
  tabLabel: string;
  roomName: string;
  isCurated: boolean;
  capturedDate: string;
  photoUrl: string;
  description: string;
  verifiedItemCount: number;
  questions: ProgressiveQuestion[];
}

export const HOME_ZONES: Record<HomeZoneId, HomeZoneData> = {
  bedroom: {
    id: 'bedroom',
    tabLabel: 'Master Bedroom',
    roomName: 'Master Bedroom',
    isCurated: true,
    capturedDate: 'Nov 4, 2026 at 10:15 AM',
    photoUrl: 'https://images.unsplash.com/photo-1540518614846-7ede433c4550?auto=format&fit=crop&w=800&q=80',
    description: 'A serene resting sanctuary with bedside reading table, morning wardrobe, and hydration carafe.',
    verifiedItemCount: 5,
    questions: [
      {
        id: 'bed-q-1',
        objectName: 'Reading Glasses (Black Rimmed)',
        question: 'Where are the reading glasses resting in this reference photograph?',
        options: [
          'Resting on the wooden bedside table next to the reading lamp',
          'Inside the closed wardrobe drawer',
          'On the floor under the bed'
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Look near the head of the bed on the bedside furniture.',
        clue2: 'Daily Anchor: You use these glasses every morning for reading your paper and checking prescriptions.',
        clue3: 'Exact Position: Resting on the polished wooden bedside table, right next to the brass reading lamp.',
        revealedAnswer: 'Resting on the wooden bedside table next to the reading lamp.',
        connectedRoutine: {
          title: 'Morning Reading & Cognitive Focus',
          description: 'Spend 15 gentle minutes with your reading glasses and morning newspaper.',
          estimatedMinutes: 15
        }
      },
      {
        id: 'bed-q-2',
        objectName: 'Blue Water Flask',
        question: 'What color is the water flask visible on the chest of drawers?',
        options: [
          'Blue water flask',
          'Bright orange thermos',
          'Silver metallic bottle'
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Look toward the wooden chest of drawers by the bedroom window.',
        clue2: 'Daily Anchor: Kept filled every evening so refreshing water is always within reach.',
        clue3: 'Exact Position: Standing upright on the left corner of the chest of drawers.',
        revealedAnswer: 'A deep blue insulated water flask resting on the wooden chest.',
        connectedRoutine: {
          title: 'Morning Hydration & Gentle Arm Stretches',
          description: 'Enjoy a glass of fresh water and 3 gentle morning arm reaches.',
          estimatedMinutes: 10
        }
      },
      {
        id: 'bed-q-3',
        objectName: 'Home Keys (Brass Ring)',
        question: 'Where are the home keys kept in this reference photograph?',
        options: [
          'Hanging on the small wall hook beside the bedroom door',
          'Hidden under the bed pillows',
          'Inside the bathroom cabinet'
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Scan the wall area right by the entrance door frame.',
        clue2: 'Daily Anchor: Kept at eye level each time you return home so they are never misplaced.',
        clue3: 'Exact Position: Hanging securely on the polished wooden hook beside the bedroom door.',
        revealedAnswer: 'Hanging on the small wall hook beside the bedroom door.',
        connectedRoutine: {
          title: 'Evening Safety & Door Check',
          description: 'Gentle verification of door keys and evening home peace.',
          estimatedMinutes: 5
        }
      },
      {
        id: 'bed-q-4',
        objectName: 'Morning Wardrobe',
        question: 'Where is your daily dressing wardrobe positioned in the bedroom?',
        options: [
          'Along the main wall across from the bed',
          'Directly inside the bathroom',
          'Outside in the balcony'
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Look at the large wooden furniture across from the sleeping area.',
        clue2: 'Daily Anchor: Houses comfortable loose cotton shirts with adaptive large buttons.',
        clue3: 'Exact Position: Standing along the spacious wall opposite the foot of the bed.',
        revealedAnswer: 'Along the main bedroom wall directly opposite the bed.',
        connectedRoutine: {
          title: 'Buttoning Shirt & Morning Dressing',
          description: 'Take 15-20 calm minutes for buttoning clothes and comfortable morning dressing.',
          estimatedMinutes: 15
        }
      },
      {
        id: 'bed-q-5',
        objectName: 'Bedside Reading Lamp',
        question: 'Where is the warm reading lamp located for evening relaxation?',
        options: [
          'On the bedside nightstand next to the bed',
          'Hanging from the center ceiling fan',
          'Behind the heavy window curtains'
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Right at arm’s reach from the pillow.',
        clue2: 'Daily Anchor: Provides soothing amber light before sleep to ease eye strain.',
        clue3: 'Exact Position: Positioned on the bedside table beside the water carafe and glasses.',
        revealedAnswer: 'On the bedside nightstand next to the bed.',
        connectedRoutine: {
          title: 'Evening Wind-Down & Calming Breath',
          description: 'Dim lights and enjoy 10 minutes of peaceful evening breathing.',
          estimatedMinutes: 10
        }
      }
    ]
  },
  living: {
    id: 'living',
    tabLabel: 'Living Room',
    roomName: 'Family Living Sanctuary',
    isCurated: true,
    capturedDate: 'Nov 4, 2026 at 11:30 AM',
    photoUrl: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=80',
    description: 'A welcoming family space featuring comfortable armchairs, central tea table, and routine clock.',
    verifiedItemCount: 5,
    questions: [
      {
        id: 'liv-q-1',
        objectName: 'Wooden Mantle Clock',
        question: 'Where is the wooden mantle clock located in the living room?',
        options: [
          'Centered on the fireplace mantle above the seating area',
          'Underneath the living room rug',
          'Inside the kitchen pantry cupboard'
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Look up toward the central focal wall above the seating area.',
        clue2: 'Daily Anchor: Provides a clear, chime-free visual reference for time and routine check-ins.',
        clue3: 'Exact Position: Resting directly in the center of the wooden mantle piece.',
        revealedAnswer: 'Centered on the fireplace mantle above the seating area.',
        connectedRoutine: {
          title: 'Midday Schedule & Time Check',
          description: 'Check the clock and review today’s peaceful care milestones.',
          estimatedMinutes: 5
        }
      },
      {
        id: 'liv-q-2',
        objectName: 'Comfortable Reading Armchair',
        question: 'Where is the comfortable armchair placed for reading and resting?',
        options: [
          'Beside the sunlit window with a soft green cushion',
          'Directly in front of the television screen',
          'Stacked against the entryway door'
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Look near the large window where gentle natural daylight streams in.',
        clue2: 'Daily Anchor: Equipped with firm armrests to support standing up smoothly.',
        clue3: 'Exact Position: Angled comfortably beside the window next to the small magazine basket.',
        revealedAnswer: 'Beside the sunlit window with a soft green cushion.',
        connectedRoutine: {
          title: 'Seated Posture & Gentle Stretches',
          description: 'Relax in your armchair and practice 5 soothing shoulder rolls.',
          estimatedMinutes: 10
        }
      },
      {
        id: 'liv-q-3',
        objectName: 'Wooden Tea Table',
        question: 'What rests on the wooden tea table in the centre of the room?',
        options: [
          'A ceramic coaster set and peaceful brass bowl',
          'A pile of unwashed kitchen pots',
          'A toolbox and electrical cords'
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Look directly at the low coffee table surrounded by the sofa.',
        clue2: 'Daily Anchor: Where afternoon tea and light snacks are enjoyed with family.',
        clue3: 'Exact Position: Centered on the polished teakwood coffee table in the middle of the seating area.',
        revealedAnswer: 'A ceramic coaster set and peaceful brass bowl.',
        connectedRoutine: {
          title: 'Afternoon Herbal Tea & Biscuits',
          description: 'Enjoy a warm cup of herbal tea and mindful pause.',
          estimatedMinutes: 15
        }
      },
      {
        id: 'liv-q-4',
        objectName: 'Living Room Bookshelf',
        question: 'Where is the wooden bookshelf positioned in this living space?',
        options: [
          'Against the quiet side wall filled with books and photo albums',
          'Blocking the front doorway',
          'Hanging over the kitchen sink'
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Along the quiet wall adjacent to the reading chair.',
        clue2: 'Daily Anchor: Holds cherished family memory photo albums and prayer books.',
        clue3: 'Exact Position: Standing upright against the left side wall, organized with neat book spines.',
        revealedAnswer: 'Against the quiet side wall filled with books and photo albums.',
        connectedRoutine: {
          title: 'Photo Album Walk & Family Memories',
          description: 'Flip through a family album and share a favorite memory with Asha.',
          estimatedMinutes: 15
        }
      },
      {
        id: 'liv-q-5',
        objectName: 'Silver Family Photo Frame',
        question: 'Where is the silver family photograph displayed in the living room?',
        options: [
          'On the side console table next to the vase of fresh flowers',
          'Hidden away inside a luggage trunk',
          'Underneath the television stand'
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Look at the small wooden side table by the hallway passage.',
        clue2: 'Daily Anchor: Shows a joyful family gathering in Delhi with your loved ones smiling.',
        clue3: 'Exact Position: Standing on the console table beside a gentle ceramic flower vase.',
        revealedAnswer: 'On the side console table next to the vase of fresh flowers.',
        connectedRoutine: {
          title: 'Loved Ones Memory Check-In',
          description: 'View photos of your children and grandchildren in the Loved Ones gallery.',
          estimatedMinutes: 10
        }
      }
    ]
  },
  kitchen: {
    id: 'kitchen',
    tabLabel: 'Kitchen',
    roomName: 'Warm Morning Kitchen',
    isCurated: true,
    capturedDate: 'Nov 4, 2026 at 08:45 AM',
    photoUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    description: 'Bright culinary workspace with tea kettle, magnetic routine board, and fresh fruit bowl.',
    verifiedItemCount: 5,
    questions: [
      {
        id: 'kit-q-1',
        objectName: 'Stainless Steel Tea Kettle',
        question: 'Where is the stainless steel tea kettle kept on the kitchen counter?',
        options: [
          'Resting on the kitchen counter beside the ceramic tea cups',
          'Stowed high up on the attic ladder',
          'Inside the outdoor garden shed'
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Look along the main kitchen countertop to the right of the stove.',
        clue2: 'Daily Anchor: Prepares your 8:00 AM warm ginger and herbal tea every single morning.',
        clue3: 'Exact Position: Resting neatly beside the electric hotplate with two porcelain cups ready.',
        revealedAnswer: 'Resting on the kitchen counter beside the ceramic tea cups.',
        connectedRoutine: {
          title: 'Morning Herbal Tea & Gentle Hydration',
          description: 'Sip warm herbal tea and take a peaceful moment before starting the day.',
          estimatedMinutes: 15
        }
      },
      {
        id: 'kit-q-2',
        objectName: 'Magnetic Routine Chart',
        question: 'Where is the family daily routine magnetic chart displayed?',
        options: [
          'On the front of the refrigerator at eye level',
          'Tucked inside the dishwasher',
          'Under the kitchen trash bin'
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Look at the large white refrigerator surface.',
        clue2: 'Daily Anchor: Color-coded milestones so you and your caregiver are always in sync.',
        clue3: 'Exact Position: Held firmly with colorful magnets at eye level on the top door of the fridge.',
        revealedAnswer: 'On the front of the refrigerator at eye level.',
        connectedRoutine: {
          title: 'Daily Routine Schedule Verification',
          description: 'Review your upcoming morning and afternoon milestones on your schedule.',
          estimatedMinutes: 5
        }
      },
      {
        id: 'kit-q-3',
        objectName: 'Traditional Spice Box (Masala Dabba)',
        question: 'Where is the circular stainless steel spice dabba placed?',
        options: [
          'On the countertop spice shelf beside the cooking area',
          'Inside the clothes laundry basket',
          'On the floor under the sink'
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Look close to the cooking area on the lower spice tier.',
        clue2: 'Daily Anchor: Contains aromatic turmeric, cumin, and cardamom for nourishing meals.',
        clue3: 'Exact Position: Sitting on the clean wooden spice shelf within easy reach of the stove.',
        revealedAnswer: 'On the countertop spice shelf beside the cooking area.',
        connectedRoutine: {
          title: 'Mindful Midday Meal Prep',
          description: 'Smell comforting aromas and enjoy gentle culinary memory recall.',
          estimatedMinutes: 20
        }
      },
      {
        id: 'kit-q-4',
        objectName: 'Fresh Fruit Basket',
        question: 'Where is the fresh fruit basket resting in this kitchen scene?',
        options: [
          'In the center of the wooden kitchen island counter',
          'Hidden behind the refrigerator motor',
          'Locked inside the broom closet'
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Look at the open kitchen island table in the middle of the room.',
        clue2: 'Daily Anchor: Filled with fresh bananas, oranges, and papayas for morning nourishment.',
        clue3: 'Exact Position: Centered on the island counter in a woven wicker bowl.',
        revealedAnswer: 'In the center of the wooden kitchen island counter.',
        connectedRoutine: {
          title: 'Nutritious Breakfast & Fiber Snack',
          description: 'Enjoy a healthy fruit bowl and morning nutritional boost.',
          estimatedMinutes: 15
        }
      },
      {
        id: 'kit-q-5',
        objectName: 'Dining Table Water Carafe',
        question: 'Where is the glass water carafe set for meal times?',
        options: [
          'On the wooden dining table with a clean cloth coaster',
          'Underneath the kitchen sink pipe',
          'On top of the microwave oven'
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Scan the adjoining dining table where meals are served.',
        clue2: 'Daily Anchor: Reminds you to take small mindful sips with every meal.',
        clue3: 'Exact Position: In the middle of the dining table resting on a floral fabric coaster.',
        revealedAnswer: 'On the wooden dining table with a clean cloth coaster.',
        connectedRoutine: {
          title: 'Nutritious Lunch & Mindful Hydration',
          description: 'Enjoy lunch with steady sips of fresh water at the table.',
          estimatedMinutes: 20
        }
      }
    ]
  }
};

export const HomeObservationExplorer: React.FC<RoomMemoryActivityProps> = ({
  difficulty: _difficulty,
  onComplete
}) => {
  const navigate = useNavigate();

  // Zone and Question State
  const [activeZone, setActiveZone] = useState<HomeZoneId>('bedroom');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeClueTier, setActiveClueTier] = useState<number>(0); // 0 = none, 1 = area, 2 = anchor, 3 = exact
  const [isAshaSpeaking, setIsAshaSpeaking] = useState(false);

  const currentZone = HOME_ZONES[activeZone];
  const currentQ = currentZone.questions[questionIndex] || currentZone.questions[0];

  // Switch home zone safely
  const handleSwitchZone = (zoneId: HomeZoneId) => {
    SpeechService.cancelSpeech();
    setIsAshaSpeaking(false);
    setActiveZone(zoneId);
    setQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setFeedback(null);
    setActiveClueTier(0);
  };

  // Option selection
  const handleSelectOption = (index: number) => {
    setSelectedOption(index);
    if (index === currentQ.correctIndex) {
      setIsAnswered(true);
      setFeedback('Spot on! You remembered exactly where it is in the reference photo! 🌸');

      setTimeout(() => {
        if (questionIndex < currentZone.questions.length - 1) {
          setQuestionIndex((prev) => prev + 1);
          setSelectedOption(null);
          setIsAnswered(false);
          setFeedback(null);
          setActiveClueTier(0);
        } else {
          onComplete();
        }
      }, 1500);
    } else {
      // Reassuring gentle feedback with automatic tier 1 clue reveal
      if (activeClueTier === 0) setActiveClueTier(1);
      setFeedback(`Gentle Clue: ${currentQ.clue1}`);
    }
  };

  // Reassuring Reveal without shame
  const handleRevealAnswer = () => {
    setIsAnswered(true);
    setSelectedOption(currentQ.correctIndex);
    setActiveClueTier(3);
    setFeedback(`Here is where it rests: ${currentQ.revealedAnswer} 🌿 Take all the time you need to observe.`);
  };

  // Speak question and clues via Asha voice
  const handleSpeakQuestion = () => {
    if (isAshaSpeaking) {
      SpeechService.cancelSpeech();
      setIsAshaSpeaking(false);
      return;
    }

    let textToSpeak = currentQ.question;
    if (activeClueTier >= 1) textToSpeak += ` ${currentQ.clue1}`;
    if (activeClueTier >= 2) textToSpeak += ` ${currentQ.clue2}`;
    if (activeClueTier >= 3) textToSpeak += ` ${currentQ.clue3}`;

    setIsAshaSpeaking(true);
    SpeechService.speak(
      textToSpeak,
      undefined,
      () => setIsAshaSpeaking(false)
    );
  };

  // Connect to Daily Routine without auto-completion
  const handleOpenRoutine = () => {
    SpeechService.cancelSpeech();
    // Navigate safely to Patient Home Sanctuary workspace
    navigate('/patient/home');
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-purple-200 shadow-soft-purple space-y-5 animate-fadeIn">
      {/* Top Header & Navigation Breadcrumb */}
      <div className="border-b border-purple-100 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-saksham-darkText">
              Home Observation & Memory Explorer
            </h2>
            <p className="text-[11px] text-gray-500">
              Familiar spatial orientation across your peaceful living spaces
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200">
            {currentZone.tabLabel}
          </span>
          <span className="text-gray-500 font-medium">
            Item {questionIndex + 1} of {currentZone.questions.length}
          </span>
        </div>
      </div>

      {/* Zone Switcher Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-lavender-50 border border-purple-200 overflow-x-auto">
        {(['bedroom', 'living', 'kitchen'] as HomeZoneId[]).map((zoneId) => {
          const zone = HOME_ZONES[zoneId];
          const isActive = activeZone === zoneId;
          return (
            <button
              key={zoneId}
              type="button"
              onClick={() => handleSwitchZone(zoneId)}
              className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                isActive
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-900 hover:bg-lavender-100'
              }`}
              aria-label={`Explore ${zone.tabLabel}`}
            >
              <span>{zoneId === 'bedroom' ? '🛏️' : zoneId === 'living' ? '🛋️' : '🍵'}</span>
              <span>{zone.tabLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Mandatory Clinical & Privacy Safeguard Banner */}
      <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-xs text-amber-950 flex items-start space-x-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Observation Safeguard Note:</span> This is an archived reference photograph taken on {currentZone.capturedDate}. It does not represent real-time room status, and questions pertain only to what is visible in this reference image.
        </div>
      </div>

      {/* Reference Photograph Scene */}
      <div className="rounded-3xl overflow-hidden border border-purple-200 shadow-sm relative">
        <div className="relative h-48 sm:h-64 w-full bg-gray-100">
          <img
            src={currentZone.photoUrl}
            alt={`Reference ${currentZone.roomName} Photograph`}
            className="w-full h-full object-cover"
          />

          {/* Top Pill: Zone & Reference Type */}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold text-saksham-darkText shadow-sm flex items-center space-x-1.5">
            <Eye className="w-3.5 h-3.5 text-purple-600" />
            <span>Reference Photo • {currentZone.roomName}</span>
          </div>

          {/* Verified Items Pill */}
          <div className="absolute top-3 right-3 bg-purple-900/80 backdrop-blur-xs px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-sm flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-yellow-300" />
            <span>{currentZone.verifiedItemCount} Verified Reference Items</span>
          </div>

          {/* Bottom Bar: Archive Timestamp */}
          <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-xs px-3 py-1.5 rounded-xl text-[11px] text-white flex items-center justify-between">
            <span>Archived: {currentZone.capturedDate}</span>
            <span className="text-emerald-300 font-bold flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Curated Reference Scene</span>
            </span>
          </div>
        </div>
      </div>

      {/* Question & Progressive Clue Card */}
      <div className="bg-lavender-50/70 p-4 sm:p-5 rounded-3xl border border-purple-200 space-y-4">
        {/* Question Header & Read Aloud */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
              Target Object: {currentQ.objectName}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-saksham-darkText mt-1.5">
              {currentQ.question}
            </h3>
          </div>

          <button
            type="button"
            onClick={handleSpeakQuestion}
            className={`p-2.5 rounded-2xl border transition flex-shrink-0 ${
              isAshaSpeaking
                ? 'bg-purple-600 text-white animate-pulse border-purple-700'
                : 'bg-white text-purple-700 hover:bg-purple-100 border-purple-200 shadow-2xs'
            }`}
            title="Listen to question and clues with Asha"
            aria-label={isAshaSpeaking ? 'Stop Asha voice' : 'Listen with Asha'}
          >
            {isAshaSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* 3-Tier Progressive Clues Strip */}
        <div className="space-y-2 pt-1 border-t border-purple-100">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="font-bold text-purple-900 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Progressive Memory Clues:</span>
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setActiveClueTier(1)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                  activeClueTier >= 1
                    ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                    : 'bg-white text-purple-800 border-purple-200 hover:bg-lavender-100'
                }`}
              >
                Clue 1: Room Area
              </button>
              <button
                type="button"
                onClick={() => setActiveClueTier(2)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                  activeClueTier >= 2
                    ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                    : 'bg-white text-purple-800 border-purple-200 hover:bg-lavender-100'
                }`}
              >
                Clue 2: Daily Anchor
              </button>
              <button
                type="button"
                onClick={() => setActiveClueTier(3)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                  activeClueTier >= 3
                    ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                    : 'bg-white text-purple-800 border-purple-200 hover:bg-lavender-100'
                }`}
              >
                Clue 3: Exact Spot
              </button>
            </div>
          </div>

          {/* Active Clues Display */}
          {activeClueTier > 0 && (
            <div className="bg-white rounded-2xl p-3 border border-purple-200 text-xs space-y-1.5 animate-fadeIn">
              {activeClueTier >= 1 && (
                <div className="text-purple-900 flex items-start space-x-1.5">
                  <span className="font-bold text-purple-700 flex-shrink-0">1. Area:</span>
                  <span>{currentQ.clue1}</span>
                </div>
              )}
              {activeClueTier >= 2 && (
                <div className="text-purple-900 flex items-start space-x-1.5 pt-1 border-t border-purple-50">
                  <span className="font-bold text-purple-700 flex-shrink-0">2. Daily Anchor:</span>
                  <span>{currentQ.clue2}</span>
                </div>
              )}
              {activeClueTier >= 3 && (
                <div className="text-purple-900 flex items-start space-x-1.5 pt-1 border-t border-purple-50">
                  <span className="font-bold text-purple-700 flex-shrink-0">3. Exact Spot:</span>
                  <span>{currentQ.clue3}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feedback Alert if Answered or Hint Provided */}
        {feedback && (
          <div
            className={`p-3 rounded-2xl border text-xs leading-relaxed flex items-start space-x-2 animate-fadeIn ${
              isAnswered
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
                : 'bg-white border-purple-200 text-purple-900'
            }`}
          >
            {isAnswered ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <HelpCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            )}
            <span>{feedback}</span>
          </div>
        )}

        {/* Multiple Choice Options */}
        <div className="space-y-2">
          {currentQ.options.map((option, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectOption(idx)}
              disabled={isAnswered}
              className={`w-full p-3.5 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition-all transform active:scale-98 flex items-center justify-between ${
                selectedOption === idx
                  ? idx === currentQ.correctIndex
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-950 ring-2 ring-emerald-200'
                    : 'bg-purple-100 border-purple-300 text-purple-950'
                  : 'bg-white border-purple-100 text-gray-800 hover:border-purple-300 hover:bg-white'
              }`}
            >
              <span>{option}</span>
              {selectedOption === idx && idx === currentQ.correctIndex && (
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>

        {/* Reassuring Answer Reveal Option */}
        {!isAnswered && (
          <div className="pt-2 flex items-center justify-between text-xs text-gray-500">
            <button
              type="button"
              onClick={handleRevealAnswer}
              className="text-purple-700 font-semibold hover:text-purple-900 underline flex items-center space-x-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Show answer reassuringly (Take your time)</span>
            </button>
            <span className="text-[11px] text-gray-400">Zero pressure or penalty</span>
          </div>
        )}

        {/* Contextual Daily Routine Bridge */}
        {currentQ.connectedRoutine && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3.5 rounded-2xl border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs mt-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wide">
                🔗 Connected Daily Routine
              </span>
              <div className="font-bold text-saksham-darkText">
                {currentQ.connectedRoutine.title}
              </div>
              <p className="text-[11px] text-gray-600">
                {currentQ.connectedRoutine.description}
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenRoutine}
              className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-2xs transition flex-shrink-0"
              title="Open guided activity in your Daily Routine workspace (never auto-completes)"
            >
              <span>Open Guided Activity ({currentQ.connectedRoutine.estimatedMinutes}m)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Export RoomMemoryActivity as an alias for full backward compatibility
export const RoomMemoryActivity = HomeObservationExplorer;
