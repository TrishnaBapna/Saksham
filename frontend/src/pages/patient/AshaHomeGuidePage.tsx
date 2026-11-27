/**
 * SAKSHAM NEURO-CARE — ASHA HOME GUIDE PATIENT NAVIGATION PAGE
 * Minimalist, high-legibility real-world walking navigation guide for Alzheimer's patients.
 * Uses real navigator.geolocation.watchPosition, caregiver-configured Firestore geofences,
 * optional DeviceOrientationEvent compass heading, anti-spam progressive voice guidance,
 * persistent safe-zone exit/return caregiver alerts, and prominent Stop Navigation controls.
 * 100% Spark Free Plan compliant — 0 paid APIs, 0 cloud functions.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Navigation,
  Phone,
  Volume2,
  VolumeX,
  ExternalLink,
  AlertTriangle,
  Home,
  MapPin,
  Compass,
  Square,
  Play,
} from 'lucide-react';
import { NavigationService, HomeNavigationGuidance, ProgressiveVoiceState } from '../../features/safety/services/navigationService.js';
import { Coordinates, GeofenceConfig, SafeZoneStatus } from '../../features/safety/types/safety.types.js';
import { GPSService, DEFAULT_SAFE_ZONE_RADIUS_METERS } from '../../services/gpsService.js';
import { SpeechService } from '../../services/speechService.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { useAccessibility } from '../../context/AccessibilityContext.js';
import { useAuthSafe } from '../../context/AuthContext.js';
import { getEffectivePatientId, isExplicitLocalDemo } from '../../features/auth/services/identityService.js';
import { CharacterVisualizer } from '../../features/ai-companion/CharacterVisualizer.js';
import { getGpsSafetyUi, formatGpsSafetyMessage } from '../../features/safety/utils/gpsSafetyTranslation.js';

interface AshaHomeGuidePageProps {
  initialPatientLocation?: Coordinates & { accuracyMeters?: number; heading?: number | null };
  initialHomeLocation?: Coordinates & { addressLabel?: string };
  caregiverPhone?: string;
  caregiverName?: string;
}

export const AshaHomeGuidePage: React.FC<AshaHomeGuidePageProps> = ({
  initialPatientLocation,
  initialHomeLocation = {
    latitude: 12.9716,
    longitude: 77.5946,
    addressLabel: 'Indiranagar 2nd Stage, Bengaluru',
  },
  caregiverPhone = '+91 98765 43210',
  caregiverName = 'Priya',
}) => {
  const navigate = useNavigate();
  const auth = useAuthSafe();
  const patientId = getEffectivePatientId(auth?.currentUser ?? null);
  const { language, t } = useLanguage();
  const { highContrast } = useAccessibility();
  const safetyUi = getGpsSafetyUi(language);

  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const allowSandboxFallback = isTestEnv || isExplicitLocalDemo();
  const hasExplicitLocationProp = Boolean(initialPatientLocation);

  const storedLocation = initialPatientLocation ? null : GPSService.getStoredLatestLocation(patientId);
  const storedGeofence = GPSService.getStoredGeofenceConfig(patientId);

  const [patientLocation, setPatientLocation] = useState<
    (Coordinates & { accuracyMeters?: number; heading?: number | null }) | null
  >(
    initialPatientLocation ||
      storedLocation ||
      (allowSandboxFallback
        ? {
            latitude: 12.9735,
            longitude: 77.5960,
            accuracyMeters: 8,
            heading: 0,
          }
        : null)
  );

  const [homeConfig, setHomeConfig] = useState<GeofenceConfig>({
    patientId,
    centerLatitude: storedGeofence?.centerLatitude ?? initialHomeLocation.latitude,
    centerLongitude: storedGeofence?.centerLongitude ?? initialHomeLocation.longitude,
    radiusMeters: storedGeofence?.radiusMeters ?? DEFAULT_SAFE_ZONE_RADIUS_METERS,
    isEnabled: storedGeofence ? storedGeofence.isEnabled : true,
    addressLabel: storedGeofence?.addressLabel || initialHomeLocation.addressLabel || 'Home Sanctuary',
    updatedAt: storedGeofence?.updatedAt || new Date().toISOString(),
    updatedBy: storedGeofence?.updatedBy || 'caregiver',
  });

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isNavigationActive, setIsNavigationActive] = useState<boolean>(true);
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState<boolean>(true);
  const [gpsStatus, setGpsStatus] = useState<'LIVE' | SafeZoneStatus | 'DEFAULT'>(
    initialPatientLocation ? 'LIVE' : 'DEFAULT'
  );

  // Optional Device Compass state
  const [compassEnabled, setCompassEnabled] = useState<boolean>(false);
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [compassUnavailable, setCompassUnavailable] = useState<boolean>(false);

  const voiceStateRef = useRef<ProgressiveVoiceState>(NavigationService.createInitialVoiceState());
  const wasOutsideRef = useRef<boolean>(false);
  const stopWatchRef = useRef<(() => void) | null>(null);

  const homeLocation = useMemo(
    () => ({
      latitude: homeConfig.centerLatitude,
      longitude: homeConfig.centerLongitude,
      addressLabel: homeConfig.addressLabel || initialHomeLocation.addressLabel || 'Home Sanctuary',
    }),
    [homeConfig, initialHomeLocation.addressLabel]
  );

  // Subscribe to caregiver-configured Firestore Geofence (unless explicit prop overrides home)
  useEffect(() => {
    const unsub = GPSService.subscribeToGeofenceConfig(patientId, (cfg) => {
      if (cfg) {
        setHomeConfig(cfg);
      }
    });
    return () => unsub();
  }, [patientId]);

  const handleLocationUpdate = useCallback(
    (
      loc: Coordinates & { accuracyMeters?: number; heading?: number | null },
      persistAndEvaluate: boolean
    ) => {
      setPatientLocation(loc);
      setGpsStatus('LIVE');

      if (!persistAndEvaluate) return;

      const updatePayload = {
        patientId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracyMeters: loc.accuracyMeters || 12,
        timestamp: new Date().toISOString(),
        isSharedWithCaregiver: GPSService.isConsentEnabled(patientId),
        heading: loc.heading ?? null,
      };
      void GPSService.saveLocationUpdate(updatePayload);

      void GPSService.evaluateAndDispatchSafetyTransition({
        patientId,
        patientName: auth?.currentUser?.displayName || 'Patient',
        caregiverId: homeConfig.updatedBy || 'caregiver',
        location: updatePayload,
        config: homeConfig,
        language,
      }).then((evalResult) => {
        const justExitedZone = evalResult.eventToDispatch === 'EXIT_SAFE_ZONE';
        const justReturnedInside = evalResult.eventToDispatch === 'ENTER_SAFE_ZONE';
        wasOutsideRef.current = !evalResult.isInside;

        if (!voiceGuidanceEnabled) return;

        const nextGuidance = NavigationService.computeHomeGuidance(
          {
            ...loc,
            heading: compassHeading ?? loc.heading ?? null,
          },
          homeLocation,
          language
        );
        const cue = NavigationService.evaluateProgressiveVoiceCue({
          state: voiceStateRef.current,
          guidance: nextGuidance,
          isInsideZone: evalResult.isInside,
          justExitedZone,
          justReturnedInside,
          language,
        });
        voiceStateRef.current = cue.nextState;
        if (cue.shouldSpeak && cue.cueText) {
          setIsSpeaking(true);
          SpeechService.speak(
            cue.cueText,
            () => setIsSpeaking(true),
            () => setIsSpeaking(false),
            SpeechService.getBCP47(language)
          );
        }
      });
    },
    [patientId, auth?.currentUser?.displayName, homeConfig, language, voiceGuidanceEnabled, compassHeading, homeLocation]
  );

  const requestLivePosition = useCallback(() => {
    const consentActive = GPSService.isConsentEnabled(patientId);
    if (!consentActive) {
      setGpsStatus('MONITORING_INACTIVE');
      return;
    }
    GPSService.requestCurrentPosition(
      patientId,
      true,
      (update) => {
        handleLocationUpdate(
          {
            latitude: update.latitude,
            longitude: update.longitude,
            accuracyMeters: update.accuracyMeters,
            heading: update.heading,
          },
          true
        );
      },
      (errStatus) => {
        setGpsStatus(errStatus);
      }
    );
  }, [patientId, handleLocationUpdate]);

  useEffect(() => {
    if (hasExplicitLocationProp || isTestEnv || !isNavigationActive) {
      if (stopWatchRef.current) {
        stopWatchRef.current();
        stopWatchRef.current = null;
      }
      return;
    }

    const consentActive = GPSService.isConsentEnabled(patientId);
    if (!consentActive) {
      setGpsStatus('MONITORING_INACTIVE');
      return;
    }

    const stopWatch = GPSService.startWatchingPosition(
      (update) => {
        handleLocationUpdate(
          {
            latitude: update.latitude,
            longitude: update.longitude,
            accuracyMeters: update.accuracyMeters,
            heading: update.heading,
          },
          true
        );
      },
      (errStatus) => {
        setGpsStatus(errStatus);
      },
      patientId,
      true
    );
    stopWatchRef.current = stopWatch;

    return () => {
      stopWatch();
      stopWatchRef.current = null;
    };
  }, [hasExplicitLocationProp, isTestEnv, isNavigationActive, patientId, handleLocationUpdate]);

  // Device Compass listener when opted in
  useEffect(() => {
    if (!compassEnabled || typeof window === 'undefined') return;
    if (!('DeviceOrientationEvent' in window)) {
      setCompassUnavailable(true);
      return;
    }

    let gotReading = false;
    const handleOrientation = (event: any) => {
      const webkitHeading = typeof event?.webkitCompassHeading === 'number' ? event.webkitCompassHeading : null;
      const alphaHeading =
        typeof event?.alpha === 'number' && event.alpha !== null
          ? (360 - event.alpha) % 360
          : null;
      const resolved = webkitHeading ?? alphaHeading;
      if (resolved !== null && Number.isFinite(resolved)) {
        gotReading = true;
        setCompassUnavailable(false);
        setCompassHeading(Math.round(resolved));
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    const timeoutId = setTimeout(() => {
      if (!gotReading) setCompassUnavailable(true);
    }, 1500);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [compassEnabled]);

  const handleEnableCompass = async () => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setCompassUnavailable(true);
      return;
    }
    const DevOrient = window.DeviceOrientationEvent as any;
    if (typeof DevOrient?.requestPermission === 'function') {
      try {
        const perm = await DevOrient.requestPermission();
        if (perm === 'granted') {
          setCompassEnabled(true);
        } else {
          setCompassUnavailable(true);
        }
      } catch {
        setCompassUnavailable(true);
      }
    } else {
      setCompassEnabled((prev) => !prev);
    }
  };

  const handleStopNavigation = () => {
    setIsNavigationActive(false);
    SpeechService.cancelSpeech();
    setIsSpeaking(false);
    if (stopWatchRef.current) {
      stopWatchRef.current();
      stopWatchRef.current = null;
    }
  };

  const handleResumeNavigation = () => {
    voiceStateRef.current = NavigationService.createInitialVoiceState();
    setIsNavigationActive(true);
    if (!hasExplicitLocationProp && !isTestEnv) {
      requestLivePosition();
    }
  };

  const effectiveCoordsForCalc = patientLocation || homeLocation;
  const effectiveLocationWithCompass = useMemo(
    () => ({
      ...effectiveCoordsForCalc,
      heading: compassHeading ?? patientLocation?.heading ?? null,
    }),
    [effectiveCoordsForCalc, compassHeading, patientLocation?.heading]
  );

  // Compute navigation guidance
  const guidance: HomeNavigationGuidance = NavigationService.computeHomeGuidance(
    effectiveLocationWithCompass,
    homeLocation,
    language
  );

  const handleSpeakGuidance = () => {
    if (!patientLocation && !hasExplicitLocationProp && !allowSandboxFallback) return;
    setIsSpeaking(true);
    SpeechService.speak(
      guidance.spokenGuidance,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      SpeechService.getBCP47(language)
    );
  };

  useEffect(() => {
    if (patientLocation) {
      handleSpeakGuidance();
    }
    return () => {
      SpeechService.cancelSpeech();
    };
  }, []);

  const osmUrl = NavigationService.getOsmWalkingDirectionsUrl(effectiveCoordsForCalc, homeLocation);
  const arrowDegrees = guidance.hasLiveHeading ? guidance.relativeArrowDegrees : guidance.bearingDegrees;
  const arrowStyle = {
    transform: `rotate(${arrowDegrees}deg)`,
    transition: 'transform 0.5s ease-out',
  };

  // Compact SVG mini-map projection around Home & Patient
  const miniScaleMeters = Math.max(
    homeConfig.radiusMeters * 2.2,
    (patientLocation ? guidance.distanceMeters : 300) * 2.4,
    600
  );
  const miniLatSpan = miniScaleMeters / 111000;
  const miniLngSpan =
    miniScaleMeters /
    (111000 * Math.max(0.15, Math.cos((homeLocation.latitude * Math.PI) / 180)));
  const miniPatientSvg = {
    x: Math.max(10, Math.min(90, 50 + ((effectiveCoordsForCalc.longitude - homeLocation.longitude) / miniLngSpan) * 50)),
    y: Math.max(10, Math.min(90, 50 - ((effectiveCoordsForCalc.latitude - homeLocation.latitude) / miniLatSpan) * 50)),
  };
  const miniZoneRadius = Math.min(44, (homeConfig.radiusMeters / miniScaleMeters) * 50);

  return (
    <div
      data-testid="asha-home-guide-page"
      className={`min-h-screen pb-28 pt-4 px-4 max-w-lg mx-auto space-y-4 ${
        highContrast ? 'bg-neutral-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => navigate('/patient')}
            className="p-2.5 rounded-2xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-xs min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label={t('home_guide.back_aria')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-saksham-darkText">{t('home_guide.title')}</h1>
            <p className="text-xs text-rose-800 font-bold">{t('home_guide.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (voiceGuidanceEnabled) SpeechService.cancelSpeech();
              setVoiceGuidanceEnabled((prev) => !prev);
            }}
            className={`px-2.5 py-2 rounded-2xl border text-[11px] font-bold min-h-[44px] cursor-pointer ${
              voiceGuidanceEnabled
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-gray-100 border-gray-200 text-gray-600'
            }`}
          >
            {voiceGuidanceEnabled ? '🔊' : '🔇'}
          </button>

          <button
            type="button"
            onClick={handleSpeakGuidance}
            className={`p-2.5 rounded-2xl transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer ${
              isSpeaking
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200 shadow-2xs'
            }`}
            aria-label={isSpeaking ? t('home_guide.speaking_aria') : t('home_guide.hear_aria')}
          >
            {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Prominent Stop / Resume Navigation Control */}
      {isNavigationActive ? (
        <button
          type="button"
          data-testid="home-guide-stop-nav-btn"
          onClick={handleStopNavigation}
          className="w-full py-2.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer min-h-[44px]"
        >
          <Square className="w-3.5 h-3.5 fill-white" />
          <span>{safetyUi.stopNavigationBtn}</span>
        </button>
      ) : (
        <div
          data-testid="home-guide-stopped-banner"
          className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-2.5"
        >
          <p className="text-xs font-bold leading-relaxed">{safetyUi.navigationStoppedNotice}</p>
          <button
            type="button"
            data-testid="home-guide-resume-nav-btn"
            onClick={handleResumeNavigation}
            className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{safetyUi.resumeNavigationBtn}</span>
          </button>
        </div>
      )}

      {/* Live Browser GPS Status Pill */}
      {!hasExplicitLocationProp && (
        <div
          data-testid="home-guide-gps-status"
          className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
            gpsStatus === 'LIVE'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : gpsStatus === 'PERMISSION_DENIED' || gpsStatus === 'MONITORING_INACTIVE'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-white border-purple-200 text-purple-900'
          }`}
        >
          <span className="flex items-center gap-1.5 font-semibold">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>
              {gpsStatus === 'LIVE' && patientLocation
                ? t('home_guide.gps_live_active', { meters: Math.round(patientLocation.accuracyMeters || 10) })
                : gpsStatus === 'PERMISSION_DENIED'
                ? t('home_guide.gps_permission_denied')
                : gpsStatus === 'MONITORING_INACTIVE'
                ? t('home_guide.gps_consent_paused')
                : t('home_guide.gps_unavailable')}
            </span>
          </span>
          {gpsStatus !== 'MONITORING_INACTIVE' && (
            <button
              type="button"
              onClick={requestLivePosition}
              className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold shrink-0 cursor-pointer"
            >
              {t('home_guide.gps_request_btn')}
            </button>
          )}
        </div>
      )}

      {/* Main Direction Compass Card */}
      <div
        className={`p-6 rounded-3xl border-2 text-center space-y-4 shadow-soft-purple ${
          highContrast
            ? 'bg-neutral-900 border-amber-400'
            : 'bg-gradient-to-b from-white via-purple-50/40 to-white border-purple-200'
        }`}
      >
        <div className="relative w-36 h-36 mx-auto rounded-full bg-purple-100 flex items-center justify-center border-4 border-purple-300 shadow-inner">
          <Navigation
            className="w-20 h-20 text-purple-700 drop-shadow-md"
            style={arrowStyle}
            aria-hidden="true"
          />
          <span className="absolute top-1.5 text-[9px] font-black text-purple-700 uppercase">
            {guidance.hasLiveHeading ? '↑' : 'N'}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-black uppercase tracking-wider text-purple-700 bg-purple-100/80 px-3 py-1 rounded-full border border-purple-200">
            {guidance.directionLabel}
          </span>
          <div className="text-3xl font-black text-slate-900 pt-1">
            {patientLocation ? `${Math.round(guidance.distanceMeters)} ${t('home_guide.metres')}` : `-- ${t('home_guide.metres')}`}
          </div>
          <p className="text-xs text-slate-600 font-semibold">{t('home_guide.to_sanctuary')}</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-1 rounded-full border border-purple-100 shadow-2xs">
            <Home className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium">{guidance.homeAddressLabel}</span>
          </div>

          <button
            type="button"
            data-testid="home-guide-compass-btn"
            onClick={handleEnableCompass}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border inline-flex items-center gap-1.5 cursor-pointer ${
              compassEnabled && compassHeading !== null
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-white text-purple-800 border-purple-200 hover:bg-purple-50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>
              {compassEnabled && compassHeading !== null
                ? `${safetyUi.compassActiveBadge} (${compassHeading}°)`
                : safetyUi.enableCompassBtn}
            </span>
          </button>

          <p className="text-[11px] text-slate-500">
            {compassUnavailable
              ? formatGpsSafetyMessage(safetyUi.compassUnavailableNotice, { deg: Math.round(guidance.bearingDegrees) })
              : formatGpsSafetyMessage(safetyUi.bearingNorthNote, { deg: Math.round(guidance.bearingDegrees) })}
          </p>
        </div>
      </div>

      {/* Live Orientation Mini Map Card */}
      <div
        data-testid="home-guide-live-map"
        className="bg-white rounded-3xl p-4 border border-purple-200 shadow-2xs space-y-2"
      >
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <span>{safetyUi.liveMapTitle}</span>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {homeConfig.radiusMeters}m Zone
          </span>
        </div>
        <div className="relative h-40 w-full rounded-2xl bg-slate-900 overflow-hidden border border-slate-700">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <circle
              cx={50}
              cy={50}
              r={miniZoneRadius}
              fill="rgba(16, 185, 129, 0.18)"
              stroke="#10b981"
              strokeWidth="0.9"
              strokeDasharray="2,1"
            />
            {patientLocation && (
              <line
                x1={miniPatientSvg.x}
                y1={miniPatientSvg.y}
                x2={50}
                y2={50}
                stroke="#a855f7"
                strokeWidth="0.9"
                strokeDasharray="1.5,1"
              />
            )}
          </svg>
          <div
            style={{ left: '50%', top: '50%' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow"
            title={homeLocation.addressLabel}
          >
            <Home className="w-3 h-3" />
          </div>
          {patientLocation && (
            <div
              style={{ left: `${miniPatientSvg.x}%`, top: `${miniPatientSvg.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-white text-[9px] font-black shadow"
              title="You"
            >
              ●
            </div>
          )}
        </div>
      </div>

      {/* Asha Companion Reassurance Card */}
      <div className="bg-gradient-to-r from-rose-50 via-purple-50 to-pink-50 p-4 rounded-3xl border border-purple-200 shadow-soft-purple space-y-2">
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <CharacterVisualizer characterId="asha" mode="compact" size={44} expression="guiding" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-purple-950">{t('home_guide.asha_companion')}</span>
              <span className="text-[10px] font-bold text-rose-700 bg-white/90 px-2 py-0.5 rounded-full border border-rose-200">
                {t('home_guide.safe_step_by_step')}
              </span>
            </div>
            <p className="text-xs text-purple-900 font-medium mt-1 leading-relaxed">
              "{guidance.spokenGuidance}"
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end pt-1">
          <button
            type="button"
            onClick={handleSpeakGuidance}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-white text-purple-800 border border-purple-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs hover:bg-purple-50"
          >
            <Volume2 className="w-3.5 h-3.5 text-purple-600" />
            <span>{t('home_guide.repeat_voice')}</span>
          </button>
        </div>
      </div>

      {/* Honest Degraded Accuracy Notice */}
      {guidance.isAccuracyDegraded && (
        <div
          data-testid="degraded-accuracy-warning"
          className="p-3.5 bg-amber-50 rounded-2xl border border-amber-300 text-xs text-amber-950 flex items-start space-x-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-bold">
              {t('home_guide.accuracy_degraded_title', { meters: Math.round(guidance.accuracyMeters) })}
            </span>{' '}
            {t('home_guide.accuracy_degraded_desc')}
          </p>
        </div>
      )}

      {/* Honest Navigation & Foreground Browser GPS Limitations Notice */}
      <div
        data-testid="home-guide-safety-disclaimer"
        className="p-3 rounded-2xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 space-y-1 leading-relaxed"
      >
        <p>{safetyUi.safetyLimitationNotice}</p>
        <p>{safetyUi.backgroundGpsNotice}</p>
      </div>

      {/* Quick Assistance Actions */}
      <div className="space-y-2 pt-1">
        <a
          href={`tel:${caregiverPhone.replace(/\s+/g, '')}`}
          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
          aria-label={t('home_guide.call_caregiver_aria', { name: caregiverName })}
        >
          <Phone className="w-4 h-4" />
          <span>{t('home_guide.call_caregiver', { name: caregiverName, phone: caregiverPhone })}</span>
        </a>

        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 px-4 bg-white hover:bg-purple-50 text-purple-900 font-bold text-xs rounded-2xl border border-purple-200 shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          aria-label={t('home_guide.open_map_aria')}
        >
          <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
          <span>{t('home_guide.open_map')}</span>
        </a>

        <div className="text-center pt-2">
          <a
            href="tel:112"
            className="text-xs text-rose-700 font-bold hover:underline inline-flex items-center justify-center min-h-[44px] px-3"
            aria-label={t('home_guide.emergency_aria')}
          >
            {t('home_guide.emergency_help')}
          </a>
        </div>
      </div>
    </div>
  );
};
