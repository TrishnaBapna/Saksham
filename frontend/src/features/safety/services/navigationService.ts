/**
 * SAKSHAM NEURO-CARE — ASHA HOME GUIDE NAVIGATION SERVICE
 * 100% Spark Free Plan compliant — Deterministic bearing, distance, and gentle orientation guidance.
 * Provides honest degraded accuracy notifications and zero-panic patient reassurance.
 */

import { Coordinates } from '../types/safety.types.js';
import { GPSService, MAX_ACCEPTABLE_ACCURACY_METERS } from '../../../services/gpsService.js';

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
  direction: RelativeDirection;
  directionLabel: string;
  spokenGuidance: string;
  isAccuracyDegraded: boolean;
  accuracyMeters: number;
  homeAddressLabel: string;
}

export class NavigationService {
  /**
   * Computes calm, dementia-friendly navigation guidance from current position to home sanctuary.
   */
  public static computeHomeGuidance(
    currentLocation: Coordinates & { accuracyMeters?: number; heading?: number | null },
    homeLocation: Coordinates & { addressLabel?: string },
    language: string = 'en'
  ): HomeNavigationGuidance {
    const isHi = language === 'hi';
    const isMr = language === 'mr';
    const accuracy = currentLocation.accuracyMeters || 10;
    const isDegraded = accuracy > MAX_ACCEPTABLE_ACCURACY_METERS;

    const distance = GPSService.calculateHaversineDistance(currentLocation, homeLocation);
    const bearingToHome = GPSService.calculateBearing(currentLocation, homeLocation);

    // Arrived at home threshold: 30 meters
    if (distance <= 30) {
      const arrivedSpeech = isMr
        ? 'तुम्ही सुरक्षितपणे घरी पोहोचला आहात. मनाला शांती द्या आणि विश्रांती घ्या.'
        : isHi
        ? 'आप सुरक्षित रूप से घर पहुँच गए हैं। आराम करें और शांति महसूस करें।'
        : 'You have arrived safely at your home sanctuary. Welcome home, take a calm breath.';

      return {
        distanceMeters: distance,
        bearingDegrees: bearingToHome,
        direction: 'arrived',
        directionLabel: isMr ? 'घरी पोहोचलो' : isHi ? 'घर पहुँच गए' : 'Arrived Home',
        spokenGuidance: arrivedSpeech,
        isAccuracyDegraded: isDegraded,
        accuracyMeters: accuracy,
        homeAddressLabel: homeLocation.addressLabel || 'Home Sanctuary',
      };
    }

    // Determine relative direction based on compass heading or direct bearing
    // If heading is available, calculate relative angle; otherwise assume face-forward relative to bearing
    const userHeading = currentLocation.heading != null ? currentLocation.heading : 0;
    let relativeAngle = (bearingToHome - userHeading + 360) % 360;

    let direction: RelativeDirection = 'straight';
    let directionLabel = 'Walk Straight Ahead';

    if (relativeAngle >= 335 || relativeAngle <= 25) {
      direction = 'straight';
      directionLabel = isMr ? 'सरळ पुढे चाला' : isHi ? 'सीधे आगे चलें' : 'Walk Straight Ahead';
    } else if (relativeAngle > 25 && relativeAngle <= 70) {
      direction = 'slight_right';
      directionLabel = isMr ? 'हळूच उजवीकडे वळा' : isHi ? 'हल्का सा दाईं ओर मुड़ें' : 'Slight Turn Right';
    } else if (relativeAngle > 70 && relativeAngle <= 140) {
      direction = 'sharp_right';
      directionLabel = isMr ? 'उजवीकडे वळा' : isHi ? 'दाईं ओर मुड़ें' : 'Turn Right';
    } else if (relativeAngle > 140 && relativeAngle <= 220) {
      direction = 'turn_around';
      directionLabel = isMr ? 'मागे फिरा' : isHi ? 'पीछे की ओर मुड़ें' : 'Turn Around Calmly';
    } else if (relativeAngle > 220 && relativeAngle <= 290) {
      direction = 'sharp_left';
      directionLabel = isMr ? 'डावीकडे वळा' : isHi ? 'बाईं ओर मुड़ें' : 'Turn Left';
    } else {
      direction = 'slight_left';
      directionLabel = isMr ? 'हळूच डावीकडे वळा' : isHi ? 'हल्का सा बाईं ओर मुड़ें' : 'Slight Turn Left';
    }

    // Synthesize spoken guidance (< 15 words, calming tone)
    let spokenGuidance = '';
    if (isDegraded) {
      spokenGuidance = isMr
        ? `घराचे अंतर ${Math.round(distance)} मीटर आहे. हळूच पुढे चाला, आशा सोबत आहे.`
        : isHi
        ? `घर लगभग ${Math.round(distance)} मीटर दूर है। आराम से चलें, आशा साथ है।`
        : `Home is about ${Math.round(distance)} metres away. Walk calmly, Asha is right here with you.`;
    } else {
      spokenGuidance = isMr
        ? `${directionLabel}. घराचे अंतर ${Math.round(distance)} मीटर आहे.`
        : isHi
        ? `${directionLabel}। घर लगभग ${Math.round(distance)} मीटर दूर है।`
        : `${directionLabel}. You are ${Math.round(distance)} metres from home. Take your time.`;
    }

    return {
      distanceMeters: distance,
      bearingDegrees: bearingToHome,
      direction,
      directionLabel,
      spokenGuidance,
      isAccuracyDegraded: isDegraded,
      accuracyMeters: accuracy,
      homeAddressLabel: homeLocation.addressLabel || 'Home Sanctuary',
    };
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
