/**
 * SAKSHAM NEURO-CARE — ASHA HOME GUIDE NAVIGATION SERVICE
 * 100% Spark Free Plan compliant — Deterministic bearing, distance, and gentle orientation guidance.
 * Provides honest degraded accuracy notifications and zero-panic patient reassurance.
 */

import { Coordinates } from '../types/safety.types.js';
import { GPSService, MAX_ACCEPTABLE_ACCURACY_METERS } from '../../../services/gpsService.js';
import { getGpsSafetyUi } from '../utils/gpsSafetyTranslation.js';
import { formatSyncMessage } from '../../routines/utils/caregiverRoutineSyncTranslation.js';

export type RelativeDirection =
  | 'straight'
  | 'slight_left'
  | 'sharp_left'
  | 'slight_right'
  | 'sharp_right'
  | 'turn_around'
  | 'arrived';

export interface HomeNavigationGuidance {
  distanceMeters: number;
  bearingDegrees: number;
  relativeArrowDegrees: number;
  hasLiveHeading: boolean;
  direction: RelativeDirection;
  directionLabel: string;
  spokenGuidance: string;
  isAccuracyDegraded: boolean;
  accuracyMeters: number;
  homeAddressLabel: string;
}

export interface ProgressiveVoiceState {
  lastSpokenAtMs: number;
  spokenMilestones: number[];
  minDistanceSeenMeters: number | null;
  hasSpokenExit: boolean;
  hasSpokenReturn: boolean;
  hasSpokenArrived: boolean;
}

const DIRECTION_LABELS: Record<string, Record<RelativeDirection, string>> = {
  en: {
    arrived: 'Arrived Home',
    straight: 'Walk Straight Ahead',
    slight_right: 'Slight Turn Right',
    sharp_right: 'Turn Right',
    turn_around: 'Turn Around Calmly',
    sharp_left: 'Turn Left',
    slight_left: 'Slight Turn Left',
  },
  hi: {
    arrived: 'घर पहुँच गए',
    straight: 'सीधे आगे चलें',
    slight_right: 'हल्का सा दाईं ओर मुड़ें',
    sharp_right: 'दाईं ओर मुड़ें',
    turn_around: 'पीछे की ओर मुड़ें',
    sharp_left: 'बाईं ओर मुड़ें',
    slight_left: 'हल्का सा बाईं ओर मुड़ें',
  },
  mr: {
    arrived: 'घरी पोहोचलो',
    straight: 'सरळ पुढे चाला',
    slight_right: 'हळूच उजवीकडे वळा',
    sharp_right: 'उजवीकडे वळा',
    turn_around: 'मागे फिरा',
    sharp_left: 'डावीकडे वळा',
    slight_left: 'हळूच डावीकडे वळा',
  },
  bn: {
    arrived: 'বাড়ি পৌঁছে গেছেন',
    straight: 'সোজা এগিয়ে চলুন',
    slight_right: 'হালকা ডানদিকে ঘুরুন',
    sharp_right: 'ডানদিকে ঘুরুন',
    turn_around: 'শান্তভাবে ঘুরে দাঁড়ান',
    sharp_left: 'বামদিকে ঘুরুন',
    slight_left: 'হালকা বামদিকে ঘুরুন',
  },
  ta: {
    arrived: 'வீட்டிற்கு வந்துவிட்டீர்கள்',
    straight: 'நேராக முன்னே செல்லுங்கள்',
    slight_right: 'சற்று வலப்பக்கம் திரும்புங்கள்',
    sharp_right: 'வலப்பக்கம் திரும்புங்கள்',
    turn_around: 'அமைதியாகத் திரும்புங்கள்',
    sharp_left: 'இடப்பக்கம் திரும்புங்கள்',
    slight_left: 'சற்று இடப்பக்கம் திரும்புங்கள்',
  },
  te: {
    arrived: 'ఇంటికి చేరుకున్నారు',
    straight: 'నేరుగా ముందుకు నడవండి',
    slight_right: 'కొంచెం కుడివైపుకు తిరగండి',
    sharp_right: 'కుడివైపుకు తిరగండి',
    turn_around: 'ప్రశాంతంగా వెనక్కి తిరగండి',
    sharp_left: 'ఎడమవైపుకు తిరగండి',
    slight_left: 'కొంచెం ఎడమవైపుకు తిరగండి',
  },
  kn: {
    arrived: 'ಮನೆ ತಲುಪಿದ್ದೀರಿ',
    straight: 'ನೇರವಾಗಿ ಮುಂದೆ ನಡೆಯಿರಿ',
    slight_right: 'ಸ್ವಲ್ಪ ಬಲಕ್ಕೆ ತಿರುಗಿ',
    sharp_right: 'ಬಲಕ್ಕೆ ತಿರುಗಿ',
    turn_around: 'ಶಾಂತವಾಗಿ ಹಿಂದಕ್ಕೆ ತಿರುಗಿ',
    sharp_left: 'ಎಡಕ್ಕೆ ತಿರುಗಿ',
    slight_left: 'ಸ್ವಲ್ಪ ಎಡಕ್ಕೆ ತಿರುಗಿ',
  },
};

export class NavigationService {
  /**
   * Computes calm, dementia-friendly navigation guidance from current position to home sanctuary.
   */
  public static computeHomeGuidance(
    currentLocation: Coordinates & { accuracyMeters?: number; heading?: number | null },
    homeLocation: Coordinates & { addressLabel?: string },
    language: string = 'en'
  ): HomeNavigationGuidance {
    const lang = DIRECTION_LABELS[language] ? language : 'en';
    const labels = DIRECTION_LABELS[lang];
    const accuracy = currentLocation.accuracyMeters || 10;
    const isDegraded = accuracy > MAX_ACCEPTABLE_ACCURACY_METERS;

    const distance = GPSService.calculateHaversineDistance(currentLocation, homeLocation);
    const bearingToHome = GPSService.calculateBearing(currentLocation, homeLocation);

    // Arrived at home threshold: 30 meters
    if (distance <= 30) {
      const arrivedMap: Record<string, string> = {
        hi: 'आप सुरक्षित रूप से घर पहुँच गए हैं। आराम करें और शांति महसूस करें।',
        mr: 'तुम्ही सुरक्षितपणे घरी पोहोचला आहात. मनाला शांती द्या आणि विश्रांती घ्या.',
        bn: 'আপনি নিরাপদে আপনার বাড়িতে পৌঁছে গেছেন। এখন শান্ত হয়ে বিশ্রাম নিন।',
        ta: 'நீங்கள் பாதுகாப்பாக வீட்டிற்கு வந்துவிட்டீர்கள். அமைதியாக மூச்சு விட்டு ஓய்வெடுங்கள்.',
        te: 'మీరు సురక్షితంగా మీ ఇంటికి చేరుకున్నారు. ప్రశాంతంగా విశ్రాంతి తీసుకోండి.',
        kn: 'ನೀವು ಸುರಕ್ಷಿತವಾಗಿ ನಿಮ್ಮ ಮನೆ ತಲುಪಿದ್ದೀರಿ. ಶಾಂತವಾಗಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ.',
        en: 'You have arrived safely at your home sanctuary. Welcome home, take a calm breath.',
      };

      return {
        distanceMeters: distance,
        bearingDegrees: bearingToHome,
        relativeArrowDegrees: bearingToHome,
        hasLiveHeading: currentLocation.heading != null && Number.isFinite(currentLocation.heading),
        direction: 'arrived',
        directionLabel: labels.arrived,
        spokenGuidance: arrivedMap[lang] || arrivedMap.en,
        isAccuracyDegraded: isDegraded,
        accuracyMeters: accuracy,
        homeAddressLabel: homeLocation.addressLabel || 'Home Sanctuary',
      };
    }

    // Determine relative direction based on compass heading or direct bearing
    const hasLiveHeading = currentLocation.heading != null && Number.isFinite(currentLocation.heading);
    const userHeading = hasLiveHeading ? (currentLocation.heading as number) : 0;
    const relativeAngle = (bearingToHome - userHeading + 360) % 360;

    let direction: RelativeDirection = 'straight';
    if (relativeAngle >= 335 || relativeAngle <= 25) {
      direction = 'straight';
    } else if (relativeAngle > 25 && relativeAngle <= 70) {
      direction = 'slight_right';
    } else if (relativeAngle > 70 && relativeAngle <= 140) {
      direction = 'sharp_right';
    } else if (relativeAngle > 140 && relativeAngle <= 220) {
      direction = 'turn_around';
    } else if (relativeAngle > 220 && relativeAngle <= 290) {
      direction = 'sharp_left';
    } else {
      direction = 'slight_left';
    }

    const directionLabel = labels[direction];
    const distRounded = Math.round(distance);

    let spokenGuidance = '';
    if (isDegraded) {
      const degradedMap: Record<string, string> = {
        hi: `घर लगभग ${distRounded} मीटर दूर है। आराम से चलें, आशा साथ है।`,
        mr: `घराचे अंतर ${distRounded} मीटर आहे. हळूच पुढे चाला, आशा सोबत आहे.`,
        bn: `বাড়ি প্রায় ${distRounded} মিটার দূরে। শান্তভাবে হাঁটুন, আশা আপনার সাথে আছে।`,
        ta: `வீடு சுமார் ${distRounded} மீட்டர் தொலைவில் உள்ளது. அமைதியாக நடங்கள், ஆஷா உங்களுடன் இருக்கிறார்.`,
        te: `ఇల్లు సుమారు ${distRounded} మీటర్ల దూరంలో ఉంది. ప్రశాంతంగా నడవండి, ఆశా మీతోనే ఉన్నారు.`,
        kn: `ಮನೆ ಸುಮಾರು ${distRounded} ಮೀಟರ್ ದೂರದಲ್ಲಿದೆ. ಶಾಂತವಾಗಿ ನಡೆಯಿರಿ, ಆಶಾ ನಿಮ್ಮೊಂದಿಗಿದ್ದಾರೆ.`,
        en: `Home is about ${distRounded} metres away. Walk calmly, Asha is right here with you.`,
      };
      spokenGuidance = degradedMap[lang] || degradedMap.en;
    } else {
      const normalMap: Record<string, string> = {
        hi: `${directionLabel}। घर लगभग ${distRounded} मीटर दूर है।`,
        mr: `${directionLabel}. घराचे अंतर ${distRounded} मीटर आहे.`,
        bn: `${directionLabel}। আপনি বাড়ি থেকে ${distRounded} মিটার দূরে আছেন।`,
        ta: `${directionLabel}. வீட்டிற்கு இன்னும் ${distRounded} மீட்டர் உள்ளது.`,
        te: `${directionLabel}. మీరు ఇంటి నుండి ${distRounded} మీటర్ల దూరంలో ఉన్నారు.`,
        kn: `${directionLabel}. ನೀವು ಮನೆಯಿಂದ ${distRounded} ಮೀಟರ್ ದೂರದಲ್ಲಿದ್ದೀರಿ.`,
        en: `${directionLabel}. You are ${distRounded} metres from home. Take your time.`,
      };
      spokenGuidance = normalMap[lang] || normalMap.en;
    }

    return {
      distanceMeters: distance,
      bearingDegrees: bearingToHome,
      relativeArrowDegrees: (bearingToHome - userHeading + 360) % 360,
      hasLiveHeading,
      direction,
      directionLabel,
      spokenGuidance,
      isAccuracyDegraded: isDegraded,
      accuracyMeters: accuracy,
      homeAddressLabel: homeLocation.addressLabel || 'Home Sanctuary',
    };
  }

  public static createInitialVoiceState(): ProgressiveVoiceState {
    return {
      lastSpokenAtMs: 0,
      spokenMilestones: [],
      minDistanceSeenMeters: null,
      hasSpokenExit: false,
      hasSpokenReturn: false,
      hasSpokenArrived: false,
    };
  }

  /**
   * Anti-spam progressive voice guidance evaluator:
   * Emits calm voice prompts when arriving, crossing safe-zone exit/return,
   * passing distance milestones (500m, 300m, 200m, 100m), or moving away >= 35m.
   */
  public static evaluateProgressiveVoiceCue(params: {
    state: ProgressiveVoiceState;
    guidance: HomeNavigationGuidance;
    isInsideZone: boolean;
    justExitedZone?: boolean;
    justReturnedInside?: boolean;
    language?: string;
    nowMs?: number;
    cooldownMs?: number;
  }): { shouldSpeak: boolean; cueText: string | null; reason?: string; nextState: ProgressiveVoiceState } {
    const now = params.nowMs ?? Date.now();
    const cooldown = params.cooldownMs ?? 15_000;
    const ui = getGpsSafetyUi(params.language || 'en');
    const dist = Math.round(params.guidance.distanceMeters);
    const nextState: ProgressiveVoiceState = {
      ...params.state,
      spokenMilestones: [...params.state.spokenMilestones],
      minDistanceSeenMeters:
        params.state.minDistanceSeenMeters === null
          ? dist
          : Math.min(params.state.minDistanceSeenMeters, dist),
    };

    if (params.guidance.direction === 'arrived') {
      if (!nextState.hasSpokenArrived) {
        nextState.hasSpokenArrived = true;
        nextState.lastSpokenAtMs = now;
        return { shouldSpeak: true, cueText: ui.spokenArrivedCue, reason: 'arrived', nextState };
      }
      return { shouldSpeak: false, cueText: null, nextState };
    }

    if (params.justExitedZone && !nextState.hasSpokenExit) {
      nextState.hasSpokenExit = true;
      nextState.hasSpokenReturn = false;
      nextState.lastSpokenAtMs = now;
      return {
        shouldSpeak: true,
        reason: 'exit_zone',
        cueText: formatSyncMessage(ui.spokenOutsideCue, {
          meters: dist,
          direction: params.guidance.directionLabel,
        }),
        nextState,
      };
    }

    if (params.justReturnedInside && !nextState.hasSpokenReturn) {
      nextState.hasSpokenReturn = true;
      nextState.hasSpokenExit = false;
      nextState.lastSpokenAtMs = now;
      return {
        shouldSpeak: true,
        reason: 'return_zone',
        cueText: formatSyncMessage(ui.spokenReturnCue, { meters: dist }),
        nextState,
      };
    }

    const inCooldown = now - params.state.lastSpokenAtMs < cooldown;
    if (inCooldown) {
      return { shouldSpeak: false, cueText: null, nextState };
    }

    if (
      params.state.minDistanceSeenMeters !== null &&
      dist - params.state.minDistanceSeenMeters >= 35
    ) {
      nextState.minDistanceSeenMeters = dist;
      nextState.lastSpokenAtMs = now;
      return {
        shouldSpeak: true,
        reason: 'moving_away',
        cueText: formatSyncMessage(ui.spokenMovingAwayCue, {
          meters: dist,
          direction: params.guidance.directionLabel,
        }),
        nextState,
      };
    }

    const thresholds = [100, 200, 300, 500];
    for (const threshold of thresholds) {
      if (dist <= threshold && !nextState.spokenMilestones.includes(threshold)) {
        nextState.spokenMilestones.push(threshold);
        nextState.lastSpokenAtMs = now;
        return {
          shouldSpeak: true,
          reason: `milestone_${threshold}`,
          cueText: formatSyncMessage(ui.spokenDistanceMilestoneCue, {
            meters: dist,
            direction: params.guidance.directionLabel,
          }),
          nextState,
        };
      }
    }

    return { shouldSpeak: false, cueText: null, nextState };
  }

  /**
   * Generates pedestrian OpenStreetMap / OSRM navigation link.
   */
  public static getOsmWalkingDirectionsUrl(
    from: Coordinates,
    to: Coordinates
  ): string {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${from.latitude}%2C${from.longitude}%3B${to.latitude}%2C${to.longitude}`;
  }

  /**
   * Generates native geo: URI for Android / iOS system maps handoff.
   */
  public static getNativeGeoUri(
    destination: Coordinates,
    label = 'Home Sanctuary'
  ): string {
    return `geo:${destination.latitude},${destination.longitude}?q=${destination.latitude},${destination.longitude}(${encodeURIComponent(label)})`;
  }
}
