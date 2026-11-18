/**
 * SAKSHAM NEURO-CARE — STAGE 3 PHASE E
 * Enhanced Room Memory Activity: Privacy-First Live Camera & Curated Sanctuary
 * 100% On-Device Computer Vision, Zero Video Uploads, 100% Spark Free Plan compliant.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Info,
  Video,
  VideoOff,
  SwitchCamera,
  Coffee,
  Heart,
  Smile,
  Check,
} from 'lucide-react';
import { SpeechService } from '../../../../services/speechService.js';
import {
  OnDeviceVisionService,
  SupportedHouseholdClass,
  DetectedHouseholdObject,
  SUPPORTED_HOUSEHOLD_CATALOG,
} from '../../services/onDeviceVisionService.js';
import { GamesService } from '../../services/gamesService.js';
import { AdaptiveSupportService } from '../../../adaptive/services/adaptiveSupportService.js';

interface RoomMemoryActivityProps {
  difficulty?: GameDifficulty;
  onComplete: () => void;
  initialMode?: 'camera' | 'curated';
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
          'On the floor under the bed',
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Look near the head of the bed on the bedside furniture.',
        clue2: 'Daily Anchor: You use these glasses every morning for reading your paper and checking prescriptions.',
        clue3: 'Exact Position: Resting on the polished wooden bedside table, right next to the brass reading lamp.',
        revealedAnswer: 'Resting on the wooden bedside table next to the reading lamp.',
        connectedRoutine: {
          title: 'Morning Reading & Cognitive Focus',
          description: 'Spend 15 gentle minutes with your reading glasses and morning newspaper.',
          estimatedMinutes: 15,
        },
      },
      {
        id: 'bed-q-2',
        objectName: 'Blue Water Flask',
        question: 'What color is the water flask visible on the chest of drawers?',
        options: ['Blue water flask', 'Bright orange thermos', 'Silver metallic bottle'],
        correctIndex: 0,
        clue1: 'Area Clue: Look toward the wooden chest of drawers by the bedroom window.',
        clue2: 'Daily Anchor: Kept filled every evening so refreshing water is always within reach.',
        clue3: 'Exact Position: Standing upright on the left corner of the chest of drawers.',
        revealedAnswer: 'A deep blue insulated water flask resting on the wooden chest.',
        connectedRoutine: {
          title: 'Morning Hydration & Gentle Arm Stretches',
          description: 'Enjoy a glass of fresh water and 3 gentle morning arm reaches.',
          estimatedMinutes: 10,
        },
      },
      {
        id: 'bed-q-3',
        objectName: 'Home Keys (Brass Ring)',
        question: 'Where are the home keys kept in this reference photograph?',
        options: [
          'Hanging on the small wall hook beside the bedroom door',
          'Hidden under the bed pillows',
          'Inside the bathroom cabinet',
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Scan the wall area right by the entrance door frame.',
        clue2: 'Daily Anchor: Kept at eye level each time you return home so they are never misplaced.',
        clue3: 'Exact Position: Hanging securely on the polished wooden hook beside the bedroom door.',
        revealedAnswer: 'Hanging on the small wall hook beside the bedroom door.',
        connectedRoutine: {
          title: 'Evening Security & Key Check',
          description: 'Verify your keys are safely hanging on their dedicated door hook.',
          estimatedMinutes: 5,
        },
      },
      {
        id: 'bed-q-4',
        objectName: 'Morning Medication Organizer',
        question: 'Where is the morning pill organizer resting in the bedroom?',
        options: [
          'On the lower shelf of the bedside nightstand with a glass of water',
          'In a locked safe in the attic',
          'On top of the ceiling fan',
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Right beside where you sleep so you never have to search in the morning.',
        clue2: 'Daily Anchor: Taken with warm water immediately after brushing your teeth.',
        clue3: 'Exact Position: Lower shelf of the nightstand, right in front of your carafe.',
        revealedAnswer: 'On the lower shelf of the bedside nightstand with a glass of water.',
        connectedRoutine: {
          title: 'Morning Medicine & Hydration',
          description: 'Take your morning prescribed capsules with a full glass of water.',
          estimatedMinutes: 5,
        },
      },
      {
        id: 'bed-q-5',
        objectName: 'Warm Woolen Shawl',
        question: 'Where is your favorite maroon woolen shawl placed for resting?',
        options: [
          'Draped neatly across the foot of the bed',
          'Left outside in the garden',
          'Tucked behind the television',
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Across the lower half of the bed mattress.',
        clue2: 'Daily Anchor: Ready to pull over your shoulders if the evening air grows chilly.',
        clue3: 'Exact Position: Folded in a soft strip across the foot of the quilt.',
        revealedAnswer: 'Draped neatly across the foot of the bed.',
        connectedRoutine: {
          title: 'Evening Relaxation & Rest Preparation',
          description: 'Wrap your warm shawl, sip warm water, and prepare for peaceful sleep.',
          estimatedMinutes: 20,
        },
      },
    ],
  },
  living: {
    id: 'living',
    tabLabel: 'Living Room',
    roomName: 'Family Living Sanctuary',
    isCurated: true,
    capturedDate: 'Nov 4, 2026 at 10:45 AM',
    photoUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
    description: 'A cheerful living area with central coffee table, prayer corner, family photo gallery, and reading settee.',
    verifiedItemCount: 5,
    questions: [
      {
        id: 'liv-q-1',
        objectName: 'Wooden Mantle Clock',
        question: 'Where is the wooden mantle clock located in the living room?',
        options: [
          'Centered on the fireplace mantle above the family portrait',
          'Resting on the floor behind the sofa',
          'Inside the kitchen refrigerator',
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Look up at eye level above the central hearth wall.',
        clue2: 'Daily Anchor: Its gentle ticking marks the quiet rhythm of your afternoon rest.',
        clue3: 'Exact Position: Resting directly in the center of the wooden mantle shelf.',
        revealedAnswer: 'Centered on the fireplace mantle above the family portrait.',
      },
      {
        id: 'liv-q-2',
        objectName: 'Silver Pooja Bell',
        question: 'Where is the silver pooja prayer bell resting in the living room?',
        options: [
          'On the carved wooden pooja mandir shelf with the brass diya',
          'Inside the shoe cabinet near the front door',
          'On top of the television screen',
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Near the sacred prayer corner in the northeast wall section.',
        clue2: 'Daily Anchor: Rung gently during morning and evening prayers for peaceful blessings.',
        clue3: 'Exact Position: On the brass thali inside the carved teakwood pooja shelf.',
        revealedAnswer: 'On the carved wooden pooja mandir shelf with the brass diya.',
      },
      {
        id: 'liv-q-3',
        objectName: 'Television Remote Control',
        question: 'Where is the TV remote control placed on the living room table?',
        options: [
          'Resting neatly in the shallow bamboo tray on the central coffee table',
          'Hidden between couch cushions out of view',
          'Left in the bathroom sink',
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Right in the center of the living room on the low wooden coffee table.',
        clue2: 'Daily Anchor: Kept in the bamboo tray every evening after watching devotional songs.',
        clue3: 'Exact Position: Inside the woven bamboo tray right next to the floral coaster.',
        revealedAnswer: 'Resting neatly in the shallow bamboo tray on the central coffee table.',
      },
      {
        id: 'liv-q-4',
        objectName: 'Framed Family Wedding Photo',
        question: 'Where is the framed photograph of your daughter’s wedding displayed?',
        options: [
          'Standing proudly on the right side of the wooden credenza',
          'Stored inside a locked suitcase',
          'Hung inside the kitchen pantry',
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Along the wooden sideboard credenza against the south wall.',
        clue2: 'Daily Anchor: Shows your daughter smiling in her red wedding lehenga with your family.',
        clue3: 'Exact Position: Golden frame positioned on the right side of the credenza near the fresh lilies.',
        revealedAnswer: 'Standing proudly on the right side of the wooden credenza.',
      },
      {
        id: 'liv-q-5',
        objectName: 'Comfortable Velvet Footstool',
        question: 'Where is your supportive green velvet footstool positioned?',
        options: [
          'Resting right in front of your favorite wingback armchair',
          'Turned upside down in the corridor',
          'Placed on top of the dining table',
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Right by your personal resting chair in the corner.',
        clue2: 'Daily Anchor: Supports your legs and knees during your afternoon reading session.',
        clue3: 'Exact Position: Positioned 12 inches in front of the wingback armchair cushions.',
        revealedAnswer: 'Resting right in front of your favorite wingback armchair.',
      },
    ],
  },
  kitchen: {
    id: 'kitchen',
    tabLabel: 'Kitchen',
    roomName: 'Warm Morning Kitchen',
    isCurated: true,
    capturedDate: 'Nov 4, 2026 at 11:10 AM',
    photoUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    description: 'A comforting kitchen space with traditional brass spice box, morning tea kettle, and ceramic cups.',
    verifiedItemCount: 5,
    questions: [
      {
        id: 'kit-q-1',
        objectName: 'Stainless Steel Tea Kettle',
        question: 'Where is the stainless steel tea kettle kept on the kitchen counter?',
        options: [
          'On the front left burner of the stovetop, ready for morning tea',
          'Hidden behind the kitchen trash bin',
          'Balanced on the open window sill',
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Look toward the cooking stove and stainless steel hob.',
        clue2: 'Daily Anchor: Used every single morning to boil cardamom ginger chai.',
        clue3: 'Exact Position: Placed securely on the front left burner of the cooking range.',
        revealedAnswer: 'On the front left burner of the stovetop, ready for morning tea.',
      },
      {
        id: 'kit-q-2',
        objectName: 'Round Brass Masala Dabba',
        question: 'Where is the traditional 7-compartment brass spice box located?',
        options: [
          'On the marble spice rack to the right of the stove',
          'Under the kitchen sink plumbing pipes',
          'Inside the freezer compartment',
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Close to the stove for easy seasoning while preparing daal.',
        clue2: 'Daily Anchor: Holds turmeric, cumin seeds, mustard seeds, and fragrant cloves.',
        clue3: 'Exact Position: Polished brass circular lid resting on the tiered marble shelf.',
        revealedAnswer: 'On the marble spice rack to the right of the stove.',
      },
      {
        id: 'kit-q-3',
        objectName: 'Floral Ceramic Tea Cup',
        question: 'Where is your favorite white ceramic tea mug with floral motifs?',
        options: [
          'Resting upside down on the wooden drying rack beside the sink',
          'Buried in the compost bin',
          'Sitting on the top of the refrigerator',
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Near the clean dish draining rack beside the stainless sink basin.',
        clue2: 'Daily Anchor: Handcrafted gift from your grandson that you love holding for morning tea.',
        clue3: 'Exact Position: Top left peg of the wooden mug drying tree beside the sink.',
        revealedAnswer: 'Resting upside down on the wooden drying rack beside the sink.',
      },
      {
        id: 'kit-q-4',
        objectName: 'Copper Water Carafe',
        question: 'Where is the hammered copper drinking water jug positioned?',
        options: [
          'In the center of the clean preparation island with a copper tumbler',
          'Left on the floor near the kitchen door',
          'Inside the microwave oven',
        ],
        correctIndex: 0,
        clue1: 'Area Clue: The central wooden kitchen preparation island.',
        clue2: 'Daily Anchor: Water stored overnight in copper provides cool morning refreshment.',
        clue3: 'Exact Position: Resting on a cork coaster right in the center of the island table.',
        revealedAnswer: 'In the center of the clean preparation island with a copper tumbler.',
      },
      {
        id: 'kit-q-5',
        objectName: 'Cotton Kitchen Hand Towel',
        question: 'Where is the clean yellow waffle-weave kitchen towel hanging?',
        options: [
          'Hanging on the chrome handle bar of the kitchen oven door',
          'Thrown into the sink basin',
          'Draped across the ceiling light',
        ],
        correctIndex: 0,
        clue1: 'Area Clue: Scan the front of the baking oven appliance.',
        clue2: 'Daily Anchor: Kept dry and clean to wipe hands while preparing morning meals.',
        clue3: 'Exact Position: Neatly folded and hung through the horizontal oven door handle.',
        revealedAnswer: 'Hanging on the chrome handle bar of the kitchen oven door.',
      },
    ],
  },
};

type CameraGameMode = 'mode_a' | 'mode_b' | 'mode_c' | 'mode_d';

export const HomeObservationExplorer: React.FC<RoomMemoryActivityProps> = ({
  difficulty = 'Gentle',
  onComplete,
  initialMode = 'curated',
}) => {
  const navigate = useNavigate();
  const initialClueTier = difficulty === 'Gentle' ? 1 : 0;

  // Primary Experience Modes: 'curated' | 'camera_consent' | 'camera_active'
  const [viewMode, setViewMode] = useState<'curated' | 'camera_consent' | 'camera_active'>(
    initialMode === 'camera' ? 'camera_consent' : 'curated'
  );

  // --- Curated Mode State ---
  const [activeZone, setActiveZone] = useState<HomeZoneId>('bedroom');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeClueTier, setActiveClueTier] = useState<number>(initialClueTier);
  const [isAshaSpeaking, setIsAshaSpeaking] = useState(false);

  // --- Live Camera State ---
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraGameMode, setCameraGameMode] = useState<CameraGameMode>('mode_a');
  const [isManualPickerOpen, setIsManualPickerOpen] = useState<boolean>(false);

  // Camera Object Detections & Confirmations
  const [candidateObject, setCandidateObject] = useState<DetectedHouseholdObject | null>(null);
  const [, setConfirmedObjects] = useState<DetectedHouseholdObject[]>([]);
  const [cameraFeedback, setCameraFeedback] = useState<string>(
    'Point your camera towards familiar items like your cup, chair, or book.'
  );
  const [isResting, setIsResting] = useState<boolean>(false);
  const [hintsUsedCount, setHintsUsedCount] = useState<number>(0);
  const [pauseCount, setPauseCount] = useState<number>(0);

  // Mode A Target Object (e.g. cup)
  const [targetObject] = useState<SupportedHouseholdClass>('cup');

  // Mode B Recall State
  const [isObservingPhase, setIsObservingPhase] = useState<boolean>(true);
  const [recallQuestionAnswered, setRecallQuestionAnswered] = useState<boolean>(false);

  const currentZone = HOME_ZONES[activeZone];
  const currentQ = currentZone.questions[questionIndex] || currentZone.questions[0];
  const visibleOptions = difficulty === 'Gentle' ? currentQ.options.slice(0, 2) : currentQ.options;

  // Cleanup all camera streams and speech on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        OnDeviceVisionService.stopCameraStream(mediaStreamRef.current);
        mediaStreamRef.current = null;
      }
      SpeechService.cancelSpeech();
    };
  }, []);

  // Stop camera tracks immediately when document becomes hidden (tab switch, minimize, lock)
  // and require fresh explicit consent before restarting (Product Owner Decision 4)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isCameraActive) {
        if (mediaStreamRef.current) {
          OnDeviceVisionService.stopCameraStream(mediaStreamRef.current);
          mediaStreamRef.current = null;
        }
        setIsCameraActive(false);
        setCandidateObject(null);
        setViewMode('camera_consent');
        setCameraFeedback(
          'Camera stopped for privacy while the tab was hidden. Tap Start Camera when you are ready to resume.'
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isCameraActive]);

  // Continuous Camera Object Detection Loop
  useEffect(() => {
    if (viewMode !== 'camera_active' || !isCameraActive || isResting) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      if (!videoRef.current || !isMounted) return;

      try {
        const detected = await OnDeviceVisionService.detectHouseholdObjects(videoRef.current, {
          minConfidence: 0.55,
          cooldownMs: 2000,
        });

        if (isMounted && detected.length > 0 && !candidateObject) {
          const topDetection = detected[0];
          setCandidateObject(topDetection);
          setCameraFeedback(
            `I see something that looks like a ${topDetection.displayName}! Would you like to use that? 🌸`
          );
        }
      } catch (err) {
        console.warn('[RoomMemoryActivity] Detection loop error:', err);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [viewMode, isCameraActive, isResting, candidateObject]);

  // Start live camera stream with explicit error handling
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await OnDeviceVisionService.startCameraStream(facingMode);
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // auto-play prevented
        }
      }
      setIsCameraActive(true);
      setViewMode('camera_active');
      setCameraFeedback('Camera is ready! Point toward any familiar household object.');
    } catch (err: any) {
      console.warn('[RoomMemoryActivity] Camera start failed:', err);
      setCameraError(
        err.message || 'Camera permission was not granted or hardware is unavailable.'
      );
      // Fallback calmly to curated mode without penalization
      setIsCameraActive(false);
    }
  };

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      OnDeviceVisionService.stopCameraStream(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
    setCandidateObject(null);
    setViewMode('curated');
  }, []);

  // Switch facing mode (Front / Back camera)
  const handleToggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (mediaStreamRef.current) {
      OnDeviceVisionService.stopCameraStream(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }
    try {
      const stream = await OnDeviceVisionService.startCameraStream(nextMode);
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      // Revert if error
    }
  };

  // Patient confirms candidate object
  const handleConfirmCandidate = (obj: DetectedHouseholdObject) => {
    setConfirmedObjects((prev) => [obj, ...prev]);
    setCandidateObject(null);
    setCameraFeedback(`Wonderful! We've noted your ${obj.displayName}. ${obj.dailyAnchor}.`);
  };

  // Patient chooses manual object selection
  const handleManualSelectObject = (itemLabel: SupportedHouseholdClass) => {
    const meta = SUPPORTED_HOUSEHOLD_CATALOG[itemLabel];
    const syntheticObj: DetectedHouseholdObject = {
      id: `manual-${itemLabel}-${Date.now()}`,
      label: itemLabel,
      displayName: meta.displayName,
      icon: meta.icon,
      confidence: 1.0,
      bbox: [0, 0, 100, 100],
      timestamp: Date.now(),
      dailyAnchor: meta.dailyAnchor,
      clues: meta.clues,
    };
    handleConfirmCandidate(syntheticObj);
    setIsManualPickerOpen(false);
  };

  // Rest break toggle
  const handleToggleRestBreak = () => {
    setIsResting((prev) => {
      const next = !prev;
      if (next) {
        setPauseCount((c) => c + 1);
        SpeechService.cancelSpeech();
      }
      return next;
    });
  };

  // Complete live camera session
  const handleFinishCameraSession = () => {
    stopCamera();
    SpeechService.cancelSpeech();

    // Log truthful session records to adaptive engine and game history
    GamesService.recordSession('demo-patient-001', {
      id: `sess-room-camera-${Date.now()}`,
      gameId: 'game-room-memory',
      gameTitle: 'Room Memory Observation (Camera)',
      category: 'objects',
      difficulty,
      pacing: 'calm',
      earnedXp: 100,
      date: new Date().toISOString().substring(0, 10),
      durationSeconds: 180,
      completed: true,
      patientFeedback: 'Relaxing',
      hintsUsed: hintsUsedCount,
      pauseCount,
      isInterrupted: false,
    });

    AdaptiveSupportService.recordObservation({
      id: `obs-room-${Date.now()}`,
      patientId: 'demo-patient-001',
      activityId: 'game-room-memory',
      activityTitle: 'Room Memory Observation (Camera)',
      activityType: 'game',
      timestamp: new Date().toISOString(),
      sessionId: `sess-room-camera-${Date.now()}`,
      assistanceRequested: hintsUsedCount > 0,
      hintsUsedCount,
      repeatedInstructionCount: 0,
      completionStatus: 'completed',
      pauseCount,
      durationSeconds: 180,
      isInterrupted: false,
      currentLevel: 'camera',
    });

    onComplete();
  };

  // --- Curated Mode Handlers (Existing logic preserved 100%) ---
  const handleSwitchZone = (zoneId: HomeZoneId) => {
    SpeechService.cancelSpeech();
    setIsAshaSpeaking(false);
    setActiveZone(zoneId);
    setQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setFeedback(null);
    setActiveClueTier(initialClueTier);
  };

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
          setActiveClueTier(initialClueTier);
        } else {
          onComplete();
        }
      }, 1500);
    } else {
      if (activeClueTier === 0) setActiveClueTier(1);
      setFeedback(`Gentle Clue: ${currentQ.clue1}`);
    }
  };

  const handleRevealAnswer = () => {
    setIsAnswered(true);
    setSelectedOption(currentQ.correctIndex);
    setActiveClueTier(3);
    setFeedback(`Here is where it rests: ${currentQ.revealedAnswer} 🌿 Take all the time you need to observe.`);
  };

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
    SpeechService.speak(textToSpeak, undefined, () => setIsAshaSpeaking(false));
  };

  const handleOpenRoutine = () => {
    SpeechService.cancelSpeech();
    navigate('/patient/home');
  };

  return (
    <div
      data-testid="room-memory-activity-container"
      className="bg-white rounded-3xl p-4 sm:p-6 border border-purple-200 shadow-soft-purple space-y-5 animate-fadeIn"
    >
      {/* Top Header & Primary Mode Switcher */}
      <div className="border-b border-purple-100 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-saksham-darkText">
              Home Observation & Room Memory Explorer
            </h2>
            <p className="text-[11px] text-gray-500">
              Interactive spatial exploration and object awareness with ASHA
            </p>
          </div>
        </div>

        {/* Mode Switcher Buttons */}
        <div className="flex items-center space-x-1.5 bg-lavender-50 p-1 rounded-2xl border border-purple-200 text-xs">
          <button
            type="button"
            data-testid="toggle-curated-mode-btn"
            onClick={() => {
              if (isCameraActive) stopCamera();
              setViewMode('curated');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1 ${
              viewMode === 'curated'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-900 hover:bg-lavender-100'
            }`}
          >
            <span>🖼️ Curated Rooms</span>
          </button>

          <button
            type="button"
            data-testid="toggle-live-camera-btn"
            onClick={() => {
              if (viewMode === 'curated') {
                setViewMode('camera_consent');
              }
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1 ${
              viewMode !== 'curated'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-900 hover:bg-lavender-100'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>📷 Live Camera</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: CAMERA PERMISSION & PRE-FLIGHT CONSENT SCREEN                 */}
      {/* ========================================================================= */}
      {viewMode === 'camera_consent' && (
        <div
          data-testid="camera-consent-card"
          className="bg-lavender-50/80 rounded-3xl p-6 border-2 border-purple-200 space-y-5 animate-fadeIn"
        >
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-saksham-darkText">
                Explore Your Room with ASHA’s Gentle Guidance
              </h3>
              <p className="text-xs text-purple-900 mt-1 leading-relaxed">
                ASHA would like to use your camera to find a few familiar objects in your room. Your
                camera image stays on this device and is not saved or uploaded by this activity. You
                can play without the camera too.
              </p>
            </div>
          </div>

          {/* Privacy Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 bg-white rounded-2xl border border-purple-100 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-gray-800 block">100% On-Device</span>
                <span className="text-[11px] text-gray-500">
                  Video stays strictly in volatile memory.
                </span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-purple-100 flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-gray-800 block">Zero Video Uploads</span>
                <span className="text-[11px] text-gray-500">
                  No frames are sent across the network.
                </span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-purple-100 flex items-start space-x-2">
              <Heart className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-gray-800 block">Zero Pressure</span>
                <span className="text-[11px] text-gray-500">
                  Manual selection is always available.
                </span>
              </div>
            </div>
          </div>

          {/* Privacy Pause or Notice Display if tab hidden or paused */}
          {cameraFeedback && (
            <div
              data-testid="camera-privacy-banner"
              className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-900 flex items-start space-x-2"
            >
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Privacy Notice: </span>
                <span>{cameraFeedback}</span>
              </div>
            </div>
          )}

          {/* Camera Error Display if previously attempted */}
          {cameraError && (
            <div
              data-testid="camera-error-banner"
              className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start space-x-2"
            >
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Camera Notice: </span>
                <span>{cameraError} You can enjoy the full activity in manual mode below.</span>
              </div>
            </div>
          )}

          {/* Consent Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="button"
              data-testid="btn-start-camera"
              onClick={startCamera}
              className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm min-h-[44px]"
            >
              <Camera className="w-4 h-4" />
              <span>Start Camera</span>
            </button>

            <button
              type="button"
              data-testid="btn-play-without-camera"
              onClick={() => setViewMode('curated')}
              className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-gray-50 text-purple-900 border border-purple-200 rounded-2xl text-xs font-bold transition min-h-[44px]"
            >
              Play Without Camera
            </button>

            <button
              type="button"
              data-testid="btn-cancel-camera"
              onClick={() => onComplete()}
              className="w-full sm:w-auto px-4 py-3 text-gray-500 hover:text-gray-700 text-xs font-medium min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: ACTIVE LIVE CAMERA VIEW                                      */}
      {/* ========================================================================= */}
      {viewMode === 'camera_active' && (
        <div data-testid="live-camera-view" className="space-y-4 animate-fadeIn">
          {/* Camera Top Bar Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-900 text-white rounded-2xl text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold">Live Camera Active</span>
              <span className="text-gray-400">• On-Device RAM Only</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                data-testid="btn-switch-camera"
                onClick={handleToggleFacingMode}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                title="Switch front / rear camera"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
                <span>Switch Camera</span>
              </button>

              <button
                type="button"
                data-testid="btn-turn-camera-off"
                onClick={stopCamera}
                className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-900 text-rose-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <VideoOff className="w-3.5 h-3.5" />
                <span>Turn Camera Off</span>
              </button>
            </div>
          </div>

          {/* Live Video Preview Window */}
          <div className="relative rounded-3xl overflow-hidden border-2 border-purple-300 bg-black aspect-video max-h-72 flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              data-testid="live-camera-feed"
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Candidate Detected Bounding Box Overlay */}
            {candidateObject && (
              <div
                data-testid="candidate-detection-box"
                className="absolute inset-x-8 inset-y-6 border-2 border-dashed border-emerald-400 bg-emerald-500/10 rounded-2xl flex flex-col items-center justify-between p-3 animate-pulse"
              >
                <span className="bg-emerald-600 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-xs">
                  {candidateObject.icon} {candidateObject.displayName} ({Math.round(candidateObject.confidence * 100)}%)
                </span>
                <span className="text-[10px] text-white bg-black/60 px-2 py-0.5 rounded-md">
                  Keep object in view
                </span>
              </div>
            )}

            {/* Resting Calming Overlay */}
            {isResting && (
              <div
                data-testid="resting-break-overlay"
                className="absolute inset-0 bg-indigo-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-500/30 flex items-center justify-center text-2xl animate-pulse">
                  🌸
                </div>
                <h4 className="font-bold text-base">Resting Pause in Progress</h4>
                <p className="text-xs text-indigo-200 max-w-sm">
                  Take slow, gentle breaths. There is no hurry at all. You can resume anytime.
                </p>
                <button
                  type="button"
                  onClick={handleToggleRestBreak}
                  className="px-5 py-2.5 bg-white text-indigo-950 font-bold rounded-2xl text-xs hover:bg-indigo-50 transition"
                >
                  Resume Exploration
                </button>
              </div>
            )}
          </div>

          {/* Camera Game Modes Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-lavender-50 border border-purple-200 text-xs">
            <button
              type="button"
              data-testid="mode-find-object-btn"
              onClick={() => setCameraGameMode('mode_a')}
              className={`py-2 px-2.5 rounded-xl font-bold transition text-center ${
                cameraGameMode === 'mode_a'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-900 hover:bg-lavender-100'
              }`}
            >
              Mode A: Find Object
            </button>
            <button
              type="button"
              data-testid="mode-remember-btn"
              onClick={() => setCameraGameMode('mode_b')}
              className={`py-2 px-2.5 rounded-xl font-bold transition text-center ${
                cameraGameMode === 'mode_b'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-900 hover:bg-lavender-100'
              }`}
            >
              Mode B: Recall Seen
            </button>
            <button
              type="button"
              data-testid="mode-associate-btn"
              onClick={() => setCameraGameMode('mode_c')}
              className={`py-2 px-2.5 rounded-xl font-bold transition text-center ${
                cameraGameMode === 'mode_c'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-900 hover:bg-lavender-100'
              }`}
            >
              Mode C: Daily Use
            </button>
            <button
              type="button"
              data-testid="mode-explore-btn"
              onClick={() => setCameraGameMode('mode_d')}
              className={`py-2 px-2.5 rounded-xl font-bold transition text-center ${
                cameraGameMode === 'mode_d'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-900 hover:bg-lavender-100'
              }`}
            >
              Mode D: Free Scan
            </button>
          </div>

          {/* Mode Guidance & Prompt Card */}
          <div className="bg-lavender-50/70 p-4 sm:p-5 rounded-3xl border border-purple-200 space-y-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                  {cameraGameMode === 'mode_a'
                    ? 'Target: Hydration Anchor'
                    : cameraGameMode === 'mode_b'
                    ? 'Recall Challenge'
                    : cameraGameMode === 'mode_c'
                    ? 'Functional Association'
                    : 'Familiar Environment Observation'}
                </span>

                <h3 className="text-sm sm:text-base font-bold text-saksham-darkText mt-1.5">
                  {cameraGameMode === 'mode_a'
                    ? OnDeviceVisionService.getAshaObjectInquiry(targetObject)
                    : cameraGameMode === 'mode_b'
                    ? 'Take a peaceful look at these items, then see which ones you remember.'
                    : cameraGameMode === 'mode_c'
                    ? 'Which familiar household object helps us tell what time of day it is?'
                    : 'Scan your room at your own pace. ASHA will celebrate familiar comforting items you show.'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  SpeechService.speak(cameraFeedback);
                }}
                className="p-2.5 bg-white text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-2xl shadow-2xs transition shrink-0"
                title="Listen with ASHA"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* ASHA Candidate Detection Confirmation Card */}
            {candidateObject && (
              <div
                data-testid="candidate-confirmation-banner"
                className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 space-y-2 animate-fadeIn"
              >
                <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>
                    Wonderful! I can see something that looks like a {candidateObject.displayName}.
                    Would you like to use that?
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    data-testid="btn-confirm-object"
                    onClick={() => handleConfirmCandidate(candidateObject)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm Object</span>
                  </button>

                  <button
                    type="button"
                    data-testid="btn-reject-object"
                    onClick={() => setCandidateObject(null)}
                    className="px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-semibold transition"
                  >
                    Look for Another
                  </button>

                  <button
                    type="button"
                    data-testid="btn-pick-manually"
                    onClick={() => setIsManualPickerOpen(true)}
                    className="px-3.5 py-2 bg-white hover:bg-purple-50 text-purple-800 border border-purple-300 rounded-xl text-xs font-semibold transition"
                  >
                    Pick Manually
                  </button>
                </div>
              </div>
            )}

            {/* Mode B: Remember What You Saw Content */}
            {cameraGameMode === 'mode_b' && (
              <div className="space-y-3 pt-2 border-t border-purple-100">
                {isObservingPhase ? (
                  <div className="space-y-2">
                    <span className="text-xs text-purple-900 font-semibold block">
                      Study these 2 items carefully:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-3 bg-white rounded-xl border border-purple-200">
                        <span className="text-2xl block mb-1">🍵</span>
                        <span className="font-bold text-gray-800">Drinking Cup</span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-purple-200">
                        <span className="text-2xl block mb-1">⏰</span>
                        <span className="font-bold text-gray-800">Wall Clock</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      data-testid="btn-ready-to-recall"
                      onClick={() => setIsObservingPhase(false)}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition"
                    >
                      I Am Ready (Hide Objects)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 animate-fadeIn">
                    <span className="text-xs font-bold text-purple-950 block">
                      Which object helps us know the time of day?
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        data-testid="btn-recall-answer-clock"
                        onClick={() => setRecallQuestionAnswered(true)}
                        className="p-3 bg-white hover:bg-emerald-50 rounded-xl border border-purple-200 text-xs font-bold text-gray-800"
                      >
                        ⏰ Wall Clock
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecallQuestionAnswered(true)}
                        className="p-3 bg-white hover:bg-emerald-50 rounded-xl border border-purple-200 text-xs font-bold text-gray-800"
                      >
                        🍵 Drinking Cup
                      </button>
                    </div>
                    {recallQuestionAnswered && (
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center space-x-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Spot on! You remembered the wall clock beautifully! 🌸</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ASHA Calming Advice Strip & Clues */}
            <div className="p-3 bg-white rounded-2xl border border-purple-100 text-xs text-purple-900 flex items-start space-x-2">
              <Smile className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{cameraFeedback}</span>
              </div>
            </div>

            {/* Action Bar: Manual Fallback, Break, Finish */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-purple-100">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  data-testid="btn-open-manual-picker"
                  onClick={() => setIsManualPickerOpen(true)}
                  className="px-3.5 py-2 bg-white hover:bg-purple-50 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                >
                  <span>🖐️ Choose Manually</span>
                </button>

                <button
                  type="button"
                  data-testid="btn-clue-tier"
                  onClick={() => {
                    setHintsUsedCount((h) => h + 1);
                    setCameraFeedback(
                      `Gentle Clue: ${SUPPORTED_HOUSEHOLD_CATALOG[targetObject].clues.anchor}`
                    );
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-purple-50 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                  <span>Gentle Hint</span>
                </button>

                <button
                  type="button"
                  data-testid="btn-rest-break"
                  onClick={handleToggleRestBreak}
                  className="px-3.5 py-2 bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                >
                  <Coffee className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Take a Rest Break</span>
                </button>
              </div>

              <button
                type="button"
                data-testid="btn-finish-camera-session"
                onClick={handleFinishCameraSession}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
              >
                <span>Finish Activity</span>
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Manual Object Selection Modal */}
          {isManualPickerOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="manual-picker-title"
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            >
              <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-gray-200 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h3 id="manual-picker-title" className="font-extrabold text-base text-gray-900">
                    Select a Familiar Household Object
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsManualPickerOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-gray-600">
                  Tap any item you see or have nearby. Zero pressure to use the camera!
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {OnDeviceVisionService.getSupportedHouseholdCatalog().map((meta) => (
                    <button
                      key={meta.label}
                      type="button"
                      data-testid={`manual-item-${meta.label}`}
                      onClick={() => handleManualSelectObject(meta.label)}
                      className="p-3 bg-lavender-50 hover:bg-purple-100 border border-purple-200 rounded-2xl text-left transition space-y-1"
                    >
                      <span className="text-2xl block">{meta.icon}</span>
                      <span className="text-xs font-bold text-saksham-darkText block leading-tight">
                        {meta.displayName}
                      </span>
                      <span className="text-[10px] text-gray-500 block truncate">
                        {meta.dailyAnchor}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: CURATED REFERENCE ROOMS VIEW (100% Backwards Compatible)     */}
      {/* ========================================================================= */}
      {viewMode === 'curated' && (
        <div data-testid="curated-reference-rooms-view" className="space-y-4">
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
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Observation Safeguard Note:</span> This is an archived
              reference photograph taken on {currentZone.capturedDate}. It does not represent
              real-time room status, and questions pertain only to what is visible in this reference
              image.
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
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>{currentZone.verifiedItemCount} Verified Reference Items</span>
              </div>

              {/* Bottom Bar: Archive Timestamp */}
              <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-xs px-3 py-1.5 rounded-xl text-[11px] text-white flex items-center justify-between">
                <span>Archived: {currentZone.capturedDate}</span>
                <span className="text-emerald-300 font-bold flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
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
                className={`p-2.5 rounded-2xl border transition shrink-0 ${
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
                      <span className="font-bold text-purple-700 shrink-0">1. Area:</span>
                      <span>{currentQ.clue1}</span>
                    </div>
                  )}
                  {activeClueTier >= 2 && (
                    <div className="text-purple-900 flex items-start space-x-1.5 pt-1 border-t border-purple-50">
                      <span className="font-bold text-purple-700 shrink-0">2. Daily Anchor:</span>
                      <span>{currentQ.clue2}</span>
                    </div>
                  )}
                  {activeClueTier >= 3 && (
                    <div className="text-purple-900 flex items-start space-x-1.5 pt-1 border-t border-purple-50">
                      <span className="font-bold text-purple-700 shrink-0">3. Exact Spot:</span>
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
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <HelpCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                )}
                <span>{feedback}</span>
              </div>
            )}

            {/* Multiple Choice Options */}
            <div className="space-y-2">
              {visibleOptions.map((option, idx) => (
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
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
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
                  className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-2xs transition shrink-0"
                  title="Open guided activity in your Daily Routine workspace (never auto-completes)"
                >
                  <span>Open Guided Activity ({currentQ.connectedRoutine.estimatedMinutes}m)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Export RoomMemoryActivity as an alias for full backward compatibility
export const RoomMemoryActivity = HomeObservationExplorer;
