import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Smile,
  Activity,
  UserCheck,
  MessageCircle,
} from 'lucide-react';
import type { AshaExpression } from '../types/character.types.js';
import { resolveCanvasRigState } from '../config/characterExpressions.js';
import { SpeechService } from '../../../services/speechService.js';

export interface AshaSanctuaryStatusLabels {
  badgeName?: string;
  speaking?: string;
  idle?: string;
  tapTitle?: string;
  ariaLabel?: string;
}

export interface AshaInteractiveCompanion2DProps {
  className?: string;
  initialExpression?: number;
  initialGesture?: string;
  showControls?: boolean;
  mode?: 'standalone' | 'sanctuary' | 'compact';
  externalExpression?: AshaExpression | string | number;
  externalGesture?: string;
  speechText?: string;
  isSpeaking?: boolean;
  language?: string;
  speakAudio?: boolean;
  sanctuaryStatusLabels?: AshaSanctuaryStatusLabels;
  onTap?: () => void;
  reducedMotion?: boolean;
  highContrast?: boolean;
}

const EXPRESSIONS = [
  { id: 0, file: '01_neutral.png', label: '01. Neutral (Master Identity)' },
  { id: 1, file: '02_happy.png', label: '02. Happy (Warm Smile)' },
  { id: 2, file: '03_thinking.png', label: '03. Thinking (Cognitive Prompt)' },
  { id: 3, file: '04_surprised.png', label: '04. Surprised (Wide Eyed)' },
  { id: 4, file: '05_reassuring.png', label: '05. Reassuring (Gentle Support)' },
  { id: 5, file: '06_encouraging.png', label: '06. Encouraging (Thumbs Up Ready)' },
  { id: 6, file: '07_confused.png', label: '07. Confused (Gentle Head Tilt)' },
  { id: 7, file: '08_comforting.png', label: '08. Comforting (Empathy Care)' },
  { id: 8, file: '09_celebrating.png', label: '09. Celebrating (Achievement Cheer)' },
  { id: 9, file: '10_explaining.png', label: '10. Explaining (Medication Guidance)' },
  { id: 10, file: '11_listening.png', label: '11. Listening (Attentive Companion)' },
  { id: 11, file: '12_concerned.png', label: '12. Concerned (Symptom Logging)' },
  { id: 12, file: '13_clarifying.png', label: '13. Clarifying (Follow-Up Question)' },
  { id: 13, file: '14_guiding.png', label: '14. Guiding (Step-by-Step Care)' },
  { id: 14, file: '15_reminder.png', label: '15. Reminder (Clinical Scheduled Alert)' },
];

const VISEMES: Record<string, string> = {
  neutral: 'viseme_neutral.png',
  aa: 'viseme_aa.png',
  ee: 'viseme_ee.png',
  ih: 'viseme_ih.png',
  oh: 'viseme_oh.png',
  oo: 'viseme_oo.png',
};

const PHRASE_PRESETS = [
  {
    label: 'Warm Greeting',
    text: 'Namaste! I am Asha, your personal neuro-care companion in Saksham. I am right here with you today.',
    expression: 1, // Happy
    gesture: 'wave',
  },
  {
    label: 'Medication Routine',
    text: 'It is time for your afternoon routine. Let us take your tablets together with a tall glass of fresh water.',
    expression: 9, // Explaining
    gesture: 'explain',
  },
  {
    label: 'Gentle Reassurance',
    text: 'Take a slow, deep breath in with me. Hold gently, and exhale. You are in a safe, peaceful space.',
    expression: 7, // Comforting
    gesture: 'comfort',
  },
  {
    label: 'Mind Game Cheer',
    text: 'Shabash! You solved all three pattern challenges today! Your focus and memory are shining brightly.',
    expression: 8, // Celebrating
    gesture: 'cheer',
  },
];

export const AshaInteractiveCompanion2D: React.FC<AshaInteractiveCompanion2DProps> = ({
  className = '',
  initialExpression = 0,
  initialGesture = 'neutral',
  showControls = true,
  mode = 'standalone',
  externalExpression,
  externalGesture,
  speechText,
  isSpeaking: propIsSpeaking,
  language = 'en',
  speakAudio = true,
  sanctuaryStatusLabels,
  onTap,
  reducedMotion = false,
  highContrast = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Companion State
  const [currentGesture, setCurrentGesture] = useState<string>(initialGesture);
  const [currentExpression, setCurrentExpression] = useState<number>(initialExpression);
  const [currentViseme, setCurrentViseme] = useState<string>('neutral');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isWalking, setIsWalking] = useState<boolean>(false);
  const [headTurn, setHeadTurn] = useState<number>(0);
  const [breathingSpeed, setBreathingSpeed] = useState<number>(1.0);
  const [bodySway, setBodySway] = useState<number>(0);
  const [fps, setFps] = useState<number>(60);
  const [selectedPhraseIndex, setSelectedPhraseIndex] = useState<number>(0);

  // Asset References
  const poseImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const expressionImagesRef = useRef<HTMLImageElement[]>([]);
  const visemeImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const assetsLoadedRef = useRef<boolean>(false);

  // Dynamic animation trackers
  const animTimeRef = useRef<number>(0);
  const blinkTimerRef = useRef<number>(0);
  const isBlinkingRef = useRef<boolean>(false);
  const nextBlinkTimeRef = useRef<number>(200);
  const gazeRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const speechIntervalRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const boundaryReceivedRef = useRef<boolean>(false);
  const fpsHistoryRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(performance.now());

  // Keep state accessible to animation loop via refs
  const stateRef = useRef({
    currentGesture,
    currentExpression,
    currentViseme,
    headTurn,
    breathingSpeed,
    bodySway,
    isWalking,
    isSpeaking,
  });

  useEffect(() => {
    stateRef.current = {
      currentGesture,
      currentExpression,
      currentViseme,
      headTurn,
      breathingSpeed,
      bodySway,
      isWalking,
      isSpeaking,
    };
  }, [
    currentGesture,
    currentExpression,
    currentViseme,
    headTurn,
    breathingSpeed,
    bodySway,
    isWalking,
    isSpeaking,
  ]);

  // Preload Assets (with explicit cache buster for instant CDN propagation)
  useEffect(() => {
    const ASSET_VER = 'v_stabilized_20261116';
    const poses = ['neutral', 'wave', 'comfort', 'explain', 'cheer', 'walk'];
    poses.forEach((p) => {
      const img = new Image();
      img.src = `/asha-companion/poses/pose_${p}.png?v=${ASSET_VER}`;
      poseImagesRef.current[p] = img;
    });

    expressionImagesRef.current = EXPRESSIONS.map((expr) => {
      const img = new Image();
      img.src = `/asha-companion/expressions/${expr.file}?v=${ASSET_VER}`;
      return img;
    });

    Object.entries(VISEMES).forEach(([key, file]) => {
      const img = new Image();
      img.src = `/asha-companion/visemes/${file}?v=${ASSET_VER}`;
      visemeImagesRef.current[key] = img;
    });

    assetsLoadedRef.current = true;
  }, []);

  // Main Canvas Render Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      // Graceful fallback in environments without HTML5 Canvas (e.g. JSDOM testing)
      return;
    }
    if (!ctx) return;

    const render = (now: number) => {
      animTimeRef.current++;
      const time = animTimeRef.current;

      // FPS tracking
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      if (delta > 0) {
        const curFps = 1000 / delta;
        fpsHistoryRef.current.push(curFps);
        if (fpsHistoryRef.current.length > 45) fpsHistoryRef.current.shift();
        if (time % 30 === 0 && fpsHistoryRef.current.length > 0) {
          const avg = Math.round(
            fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length
          );
          setFps(avg);
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const {
        currentGesture: curGest,
        currentExpression: curExpr,
        currentViseme: curVis,
        headTurn: hTurn,
        breathingSpeed: bSpeed,
        bodySway: bSway,
        isWalking: walkActive,
      } = stateRef.current;

      // Respect OS-level and browser reduced motion preferences
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Natural Breathing calculation (sinusoidal thoracic displacement)
      const breathOffsetY = prefersReducedMotion ? 0 : Math.sin(time * 0.04 * bSpeed) * 3;
      const breathSwayX = prefersReducedMotion ? 0 : Math.cos(time * 0.02 * bSpeed) * (2 + Math.abs(bSway) * 6);

      // Walk cycle bob
      let walkBobY = 0;
      let walkSwayX = 0;
      if (walkActive && !prefersReducedMotion) {
        walkBobY = Math.abs(Math.sin(time * 0.12)) * 7;
        walkSwayX = Math.sin(time * 0.06) * 5;
      }

      // Blink Management (~160ms = 10 frames at 60fps)
      if (time > nextBlinkTimeRef.current) {
        isBlinkingRef.current = true;
        blinkTimerRef.current = 0;
        nextBlinkTimeRef.current = time + 200 + Math.random() * 140;
      }

      if (isBlinkingRef.current) {
        blinkTimerRef.current++;
        if (blinkTimerRef.current > 10) {
          isBlinkingRef.current = false;
        }
      }

      // 1. Draw Active Base Character Pose
      const activePoseImg =
        poseImagesRef.current[curGest] || poseImagesRef.current.neutral;

      if (activePoseImg && activePoseImg.complete && activePoseImg.naturalWidth > 0) {
        ctx.save();

        // Kinematic Transforms (Global center + subtle breathing/sway/head turn)
        const totalX = canvas.width / 2 + breathSwayX + walkSwayX + hTurn * 10;
        const totalY = canvas.height / 2 + breathOffsetY - walkBobY;
        ctx.translate(totalX, totalY);

        // Draw EXACTLY ONE full-body Asha character (800x1600 on canvas)
        ctx.drawImage(
          activePoseImg,
          -canvas.width / 2,
          -canvas.height / 2,
          canvas.width,
          canvas.height
        );

        // 2. Facial Expression Layer (Overlay for selected expression if not neutral)
        // Scaled to fit Asha's head at 0.5x coordinate space: 512x512 at (-269.05, -778.9)
        // Mathematically aligned to base pose eye/pupil landmarks
        if (curExpr > 0) {
          const exprImg = expressionImagesRef.current[curExpr];
          if (exprImg && exprImg.complete) {
            ctx.drawImage(exprImg, -269.05, -778.9, 512, 512);
          }
        }

        // 3. Speech Viseme Mouth Shape Overlay (Lip animation aligned to mouth center)
        if (curVis !== 'neutral') {
          const vImg = visemeImagesRef.current[curVis];
          if (vImg && vImg.complete && vImg.naturalWidth > 0) {
            const mouthW = 60;
            const mouthH = (vImg.naturalHeight / vImg.naturalWidth) * mouthW;
            const mouthX = 13.8 - mouthW / 2;
            const mouthY = -453.9 - mouthH / 2;
            ctx.drawImage(vImg, mouthX, mouthY, mouthW, mouthH);
          }
        }

        // 4. Natural Blinking Eyelid Overlay
        if (isBlinkingRef.current) {
          ctx.save();
          const gz = gazeRef.current;
          const leftEyeX = -26.5 + gz.x * 0.25;
          const rightEyeX = 31.0 + gz.x * 0.25;
          const eyeY = -510.0 + gz.y * 0.25;

          // Eyelid skin fill
          ctx.fillStyle = '#FED7BF';
          ctx.beginPath();
          ctx.ellipse(leftEyeX, eyeY, 15, 8, 0, 0, Math.PI * 2);
          ctx.ellipse(rightEyeX, eyeY, 15, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Lash curve stroke
          ctx.strokeStyle = '#321922';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(leftEyeX, eyeY - 2, 14, 0.08 * Math.PI, 0.92 * Math.PI);
          ctx.arc(rightEyeX, eyeY - 2, 14, 0.08 * Math.PI, 0.92 * Math.PI);
          ctx.stroke();

          ctx.restore();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Web Speech Synthesis & Speech-Boundary Viseme Animation
  // Note: Uses SpeechSynthesisUtterance.onboundary word events where supported by browser engine;
  // falls back to approximate viseme cadence cycling if boundary events are unavailable.
  // Resets cleanly to 'neutral' viseme on speech end, error, cancellation, or unmount.
  const speakText = useCallback(
    (text: string, exprIndex?: number, gestureName?: string) => {
      if (typeof window === 'undefined') return;

      // Stop ongoing speech & cancel any active timers
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
        speechIntervalRef.current = null;
      }
      boundaryReceivedRef.current = false;

      setIsSpeaking(true);
      if (typeof exprIndex === 'number') setCurrentExpression(exprIndex);
      if (gestureName) setCurrentGesture(gestureName);
      setCurrentViseme('neutral');

      const stopSpeech = () => {
        setIsSpeaking(false);
        setCurrentViseme('neutral');
        if (speechIntervalRef.current) {
          clearInterval(speechIntervalRef.current);
          speechIntervalRef.current = null;
        }
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        boundaryReceivedRef.current = false;
      };

      // Gentle conversational viseme sequence for fallback cadence
      const conversationalVisemes = ['aa', 'ee', 'ih', 'oh', 'oo', 'neutral'];
      let visemeIdx = 0;

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95; // Gentle, clear pacing for neuro-care
        utterance.pitch = 1.05; // Friendly, warm vocal pitch

        const bcp47 = SpeechService.getBCP47(language);
        utterance.lang = bcp47;

        const matchingVoice = SpeechService.findBestVoice(language);
        if (matchingVoice) utterance.voice = matchingVoice;

        // Speech boundary event listener for approximate word-level mouth modulation
        utterance.onboundary = (event: SpeechSynthesisEvent) => {
          if (event.name === 'word' && typeof event.charIndex === 'number') {
            boundaryReceivedRef.current = true;
            // Clear fallback interval if boundaries are active
            if (speechIntervalRef.current) {
              clearInterval(speechIntervalRef.current);
              speechIntervalRef.current = null;
            }
            if (fallbackTimerRef.current) {
              clearTimeout(fallbackTimerRef.current);
              fallbackTimerRef.current = null;
            }
            const word = text.slice(event.charIndex, event.charIndex + (event.charLength || 6)).toLowerCase();
            if (/a/.test(word)) setCurrentViseme('aa');
            else if (/e|y/.test(word)) setCurrentViseme('ee');
            else if (/i/.test(word)) setCurrentViseme('ih');
            else if (/o/.test(word)) setCurrentViseme('oh');
            else if (/u|w/.test(word)) setCurrentViseme('oo');
            else setCurrentViseme('neutral');
          }
        };

        // Fallback: start cadence timer only if no boundary event received after 250ms
        fallbackTimerRef.current = setTimeout(() => {
          if (!boundaryReceivedRef.current && typeof window !== 'undefined') {
            speechIntervalRef.current = setInterval(() => {
              visemeIdx = (visemeIdx + 1) % conversationalVisemes.length;
              setCurrentViseme(conversationalVisemes[visemeIdx]);
            }, 140) as unknown as number;
          }
        }, 250) as unknown as number;

        utterance.onend = () => {
          stopSpeech();
        };
        utterance.onerror = () => {
          stopSpeech();
        };

        window.speechSynthesis.speak(utterance);
      } else {
        // Fallback timer if SpeechSynthesis unavailable
        speechIntervalRef.current = setInterval(() => {
          visemeIdx = (visemeIdx + 1) % conversationalVisemes.length;
          setCurrentViseme(conversationalVisemes[visemeIdx]);
        }, 140) as unknown as number;
        const duration = Math.max(2500, text.split(' ').length * 320);
        fallbackTimerRef.current = setTimeout(stopSpeech, duration) as unknown as number;
      }
    },
    [language]
  );

  const stopSpeaking = () => {
    if (speakAudio && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (speechIntervalRef.current) {
      clearInterval(speechIntervalRef.current);
      speechIntervalRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setIsSpeaking(false);
    setCurrentViseme('neutral');
    boundaryReceivedRef.current = false;
  };

  // Cleanup speech synthesis on component unmount (only if this component owns audio output)
  useEffect(() => {
    return () => {
      if (speakAudio && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
        speechIntervalRef.current = null;
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [speakAudio]);

  // Synchronize with external expression & gesture props
  useEffect(() => {
    if (externalExpression !== undefined && externalExpression !== null) {
      const { expressionIndex, defaultGesture } = resolveCanvasRigState(externalExpression);
      setCurrentExpression(expressionIndex);
      if (externalGesture) {
        setCurrentGesture(externalGesture);
      } else if (defaultGesture) {
        setCurrentGesture(defaultGesture);
      }
    } else if (externalGesture) {
      setCurrentGesture(externalGesture);
    }
  }, [externalExpression, externalGesture]);

  // Synchronize speech animation with external isSpeaking when parent owns TTS audio
  useEffect(() => {
    if (propIsSpeaking === undefined) return;
    setIsSpeaking(propIsSpeaking);
    if (!propIsSpeaking) {
      if (!speakAudio && speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
        speechIntervalRef.current = null;
      }
      setCurrentViseme('neutral');
      return;
    }
    if (!speakAudio && typeof window !== 'undefined') {
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
      }
      const visemes = ['aa', 'ee', 'ih', 'oh', 'oo', 'neutral'];
      let idx = 0;
      speechIntervalRef.current = setInterval(() => {
        idx = (idx + 1) % visemes.length;
        setCurrentViseme(visemes[idx]);
      }, 145) as unknown as number;
      return () => {
        if (speechIntervalRef.current) {
          clearInterval(speechIntervalRef.current);
          speechIntervalRef.current = null;
        }
      };
    }
  }, [propIsSpeaking, speakAudio]);

  useEffect(() => {
    if (speakAudio && speechText) {
      speakText(speechText);
    }
  }, [speakAudio, speechText, speakText]);

  const handleCanvasClick = () => {
    isBlinkingRef.current = true;
    blinkTimerRef.current = 0;
    setCurrentGesture('wave');
    setCurrentExpression(1); // Happy
    if (onTap) {
      onTap();
    }
    setTimeout(() => {
      setCurrentGesture('neutral');
    }, 2500);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    gazeRef.current = { x: nx * 10, y: ny * 6 };
  };

  const resetToNeutral = () => {
    stopSpeaking();
    setCurrentGesture('neutral');
    setCurrentExpression(0);
    setCurrentViseme('neutral');
    setIsWalking(false);
    setHeadTurn(0);
    setBodySway(0);
    setBreathingSpeed(1.0);
  };

  if (mode === 'sanctuary') {
    const activeBadgeName = sanctuaryStatusLabels?.badgeName || 'Asha 2D';
    const activeStatusText = isSpeaking
      ? sanctuaryStatusLabels?.speaking || 'SPEECH_ACTIVE'
      : sanctuaryStatusLabels?.idle || curExprBadge(currentExpression, currentGesture, false);
    return (
      <div
        className={`relative flex flex-col items-center justify-center select-none ${className}`}
        data-testid="asha-sanctuary-companion-container"
      >
        <div
          onMouseMove={handleMouseMove}
          onClick={handleCanvasClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleCanvasClick()}
          className={`relative w-full max-w-[280px] sm:max-w-[320px] aspect-[1/2] max-h-[520px] rounded-3xl overflow-hidden cursor-pointer group flex items-center justify-center p-2 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] ${
            highContrast
              ? 'border-4 border-amber-400 bg-neutral-950 shadow-none'
              : 'bg-gradient-to-b from-[#FAF8FF] via-[#EDE9FE]/70 to-[#DDD6FE]/90 border border-purple-200/80 shadow-soft-purple'
          }`}
          title={sanctuaryStatusLabels?.tapTitle || 'Click Asha to say hello • Gaze follows cursor'}
          aria-label={sanctuaryStatusLabels?.ariaLabel || 'Asha 2D Interactive Companion'}
        >
          {/* Subtle Ambient Glow Aura */}
          {!highContrast && (
            <div
              className={`absolute inset-0 bg-radial-gradient from-purple-300/25 via-transparent to-transparent pointer-events-none ${
                reducedMotion ? '' : 'animate-pulse'
              }`}
            />
          )}

          {/* High-Resolution Companion Canvas (800x1600 internal raster buffer) */}
          <canvas
            ref={canvasRef}
            width={800}
            height={1600}
            data-testid="asha-interactive-canvas"
            className="w-full h-full object-contain filter drop-shadow-md select-none pointer-events-none transition-transform duration-300"
          />

          {/* Sanctuary Floating Status Badge */}
          <div className="absolute top-3 left-3 flex items-center pointer-events-none">
            <div
              className={`backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold shadow-2xs flex items-center gap-1.5 ${
                highContrast
                  ? 'bg-amber-400 text-black border border-black'
                  : 'bg-white/90 border border-purple-200 text-purple-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{activeBadgeName}</span>
            </div>
          </div>

          {/* Expression Indicator Badge */}
          <div className="absolute bottom-3 text-center pointer-events-none px-2">
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-sm opacity-90 shadow-2xs ${
                highContrast ? 'bg-amber-400 text-black' : 'bg-black/60 text-white'
              }`}
            >
              {activeStatusText}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col md:flex-row gap-6 items-center justify-center ${className}`}
    >
      {/* Interactive Companion Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[420px]">
        <div
          onMouseMove={handleMouseMove}
          onClick={handleCanvasClick}
          className="relative w-full aspect-[1/2] max-h-[640px] md:max-h-[700px] rounded-3xl bg-gradient-to-b from-[#FAF8FF] via-[#EDE9FE]/70 to-[#DDD6FE]/90 border border-purple-200/80 shadow-soft-purple overflow-hidden cursor-pointer group flex items-center justify-center p-2"
          title="Click Asha for greeting wave reaction • Move cursor to guide gaze"
        >
          {/* Subtle Ambient Glow Aura */}
          <div className="absolute inset-0 bg-radial-gradient from-purple-300/20 via-transparent to-transparent pointer-events-none" />

          {/* High-Resolution Companion Canvas (800x1600 internal raster buffer) */}
          <canvas
            ref={canvasRef}
            width={800}
            height={1600}
            className="w-full h-full object-contain filter drop-shadow-md select-none pointer-events-none transition-transform duration-300"
          />

          {/* Interactive Top Status Floating Badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-purple-200 text-xs font-bold text-purple-900 shadow-2xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Asha 2D Live</span>
            </div>

            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-purple-200 text-xs font-bold text-gray-700 shadow-2xs flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-600" />
              <span>{fps} FPS</span>
            </div>
          </div>

          {/* Bottom Interaction Guide Hint */}
          <div className="absolute bottom-3 left-4 right-4 text-center pointer-events-none">
            <span className="bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold px-3 py-1 rounded-full opacity-90 shadow-2xs">
              ✨ Click Asha to wave • Gaze follows cursor
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Verification Suite */}
      {showControls && (
        <div className="w-full lg:w-96 flex flex-col gap-4 bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-purple-100 shadow-soft-purple">
          {/* Header */}
          <div className="border-b border-gray-100 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Companion Studio</span>
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                {curExprBadge(currentExpression, currentGesture, isSpeaking)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Select expressions, gestures, and test real-time speech lip-sync.
            </p>
          </div>

          {/* 1. Speech Synthesis Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Audio Speech & Lip-Sync</span>
              </label>
              {isSpeaking && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="text-[11px] text-rose-600 font-bold hover:underline flex items-center gap-0.5"
                >
                  <VolumeX className="w-3 h-3" /> Stop
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {PHRASE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedPhraseIndex(idx);
                    speakText(preset.text, preset.expression, preset.gesture);
                  }}
                  className={`text-left p-2 rounded-xl border text-xs transition-all ${
                    isSpeaking && selectedPhraseIndex === idx
                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs font-bold'
                      : 'bg-purple-50/60 hover:bg-purple-100/70 border-purple-100 text-gray-800 font-medium'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{preset.label}</span>
                    <Play className="w-2.5 h-2.5 opacity-80" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Facial Expressions (15 Approved) */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-purple-600" />
              <span>Facial Expression (15 Approved)</span>
            </label>
            <select
              value={currentExpression}
              onChange={(e) => setCurrentExpression(parseInt(e.target.value))}
              className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 outline-none transition"
            >
              {EXPRESSIONS.map((expr) => (
                <option key={expr.id} value={expr.id}>
                  {expr.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Companion Gestures */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Gestures & Locomotion</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'wave', label: '👋 Wave' },
                { id: 'comfort', label: '💖 Comfort' },
                { id: 'explain', label: '👉 Explain' },
                { id: 'cheer', label: '🎉 Cheer' },
                { id: 'walk', label: '🚶 Walk' },
                { id: 'neutral', label: '⏹️ Neutral' },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    if (g.id === 'walk') setIsWalking(!isWalking);
                    setCurrentGesture(g.id);
                  }}
                  className={`py-2 px-1.5 rounded-xl border text-xs font-bold text-center transition ${
                    currentGesture === g.id
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-800'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Speech Visemes Manual Check */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-purple-600" />
                <span>Mouth Visemes (Lip-Sync Shapes)</span>
              </label>
              <span className="text-[10px] font-bold text-purple-700 uppercase">
                {currentViseme}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {['neutral', 'aa', 'ee', 'ih', 'oh', 'oo'].map((vKey) => (
                <button
                  key={vKey}
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    setCurrentViseme(vKey);
                  }}
                  className={`py-1.5 text-[11px] font-extrabold rounded-lg border uppercase transition ${
                    currentViseme === vKey
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'
                  }`}
                >
                  {vKey}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Natural Kinematics Sliders */}
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Head Turn (Yaw)</span>
              <span className="font-bold text-gray-900">{headTurn.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.05"
              value={headTurn}
              onChange={(e) => setHeadTurn(parseFloat(e.target.value))}
              className="w-full accent-purple-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Thoracic Breathing Rate</span>
              <span className="font-bold text-gray-900">{breathingSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={breathingSpeed}
              onChange={(e) => setBreathingSpeed(parseFloat(e.target.value))}
              className="w-full accent-purple-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={resetToNeutral}
            className="mt-1 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Clean Neutral Companion</span>
          </button>
        </div>
      )}
    </div>
  );
};

function curExprBadge(exprIndex: number, gesture: string, speaking: boolean): string {
  if (speaking) return 'SPEECH_ACTIVE';
  if (gesture !== 'neutral') return `GESTURE_${gesture.toUpperCase()}`;
  if (exprIndex === 0) return 'IDLE_BREATHING';
  return `EXPR_${EXPRESSIONS[exprIndex]?.file.split('.')[0].toUpperCase()}`;
}
