/**
 * SAKSHAM NEURO-CARE — CAREGIVER SAFE ZONE INTERACTIVE MAP & CONFIGURATOR
 * 100% Spark Free Plan compliant — Persists geofences to Firestore (`geofences/{patientId}`),
 * listens to real-time patient GPS (`locationUpdates/latest_{patientId}`) & boundary alerts (`safetyEvents`),
 * supports Caregiver Current GPS or manual Home coordinates, presets (50m/100m/200m/500m/1km/1.5km) + custom radius.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Home,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Pause,
  Phone,
  Navigation,
  Sliders,
  AlertTriangle,
  Radio,
  ExternalLink,
  Crosshair,
  Save,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import {
  Coordinates,
  GeofenceConfig,
  PatientLocationUpdate,
  GeofenceEvaluationResult,
  SafetyEvent,
} from '../types/safety.types.js';
import { GPSService, DEFAULT_SAFE_ZONE_RADIUS_METERS } from '../../../services/gpsService.js';
import { subscribeToDataChanges, isExplicitLocalDemo } from '../../auth/services/identityService.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { useAuthSafe } from '../../../context/AuthContext.js';
import { getGpsSafetyUi, formatGpsSafetyMessage } from '../utils/gpsSafetyTranslation.js';

export type TrackingState =
  | 'INSIDE_SAFE_ZONE'
  | 'OUTSIDE_SAFE_ZONE'
  | 'PERMISSION_DENIED'
  | 'GPS_UNAVAILABLE'
  | 'POOR_ACCURACY'
  | 'TRACKING_PAUSED'
  | 'CONSENT_WITHDRAWN';

interface CaregiverSafeZoneMapProps {
  patientId: string;
  patientName: string;
  patientPhone?: string;
  initialCenter?: Coordinates;
  initialRadiusMeters?: number;
  initialAddressLabel?: string;
  onRadiusChange?: (radiusMeters: number) => void;
  onStatusChange?: (status: TrackingState, evaluation: GeofenceEvaluationResult) => void;
  onMetaChange?: (meta: {
    radiusMeters?: number;
    homeLocation?: Coordinates;
    patientLocation?: PatientLocationUpdate | null;
  }) => void;
  className?: string;
  patientLocationOverride?: PatientLocationUpdate | null;
  trackingStateOverride?: TrackingState;
}

export const CaregiverSafeZoneMap: React.FC<CaregiverSafeZoneMapProps> = ({
  patientId,
  patientName,
  patientPhone = '+91 98765 43210',
  initialCenter = { latitude: 12.9716, longitude: 77.5946 },
  initialRadiusMeters = DEFAULT_SAFE_ZONE_RADIUS_METERS,
  initialAddressLabel = 'Indiranagar 2nd Stage, Bengaluru',
  onRadiusChange,
  onStatusChange,
  onMetaChange,
  className = '',
  patientLocationOverride,
  trackingStateOverride,
}) => {
  const { t, language } = useLanguage();
  const safetyUi = getGpsSafetyUi(language);
  const auth = useAuthSafe();

  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const allowSandboxPreview = isTestEnv || isExplicitLocalDemo();

  const storedConfig = useMemo(() => GPSService.getStoredGeofenceConfig(patientId), [patientId]);

  const [homeLocation, setHomeLocation] = useState<Coordinates>(
    storedConfig
      ? { latitude: storedConfig.centerLatitude, longitude: storedConfig.centerLongitude }
      : initialCenter
  );
  const [addressLabel, setAddressLabel] = useState<string>(
    storedConfig?.addressLabel || initialAddressLabel
  );
  const [radiusMeters, setRadiusMeters] = useState<number>(
    storedConfig?.radiusMeters || initialRadiusMeters
  );
  const [isEnabled, setIsEnabled] = useState<boolean>(
    storedConfig ? storedConfig.isEnabled : true
  );

  // Editable draft form inputs
  const [latDraft, setLatDraft] = useState<string>(String(homeLocation.latitude));
  const [lngDraft, setLngDraft] = useState<string>(String(homeLocation.longitude));
  const [customRadiusInput, setCustomRadiusInput] = useState<string>(String(radiusMeters));
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [isSavingZone, setIsSavingZone] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [liveConsentedLocation, setLiveConsentedLocation] = useState<PatientLocationUpdate | null>(() =>
    GPSService.getStoredLatestLocation(patientId)
  );
  const [consentActive, setConsentActive] = useState<boolean>(() =>
    GPSService.isConsentEnabled(patientId)
  );
  const [safetyEvents, setSafetyEvents] = useState<SafetyEvent[]>(() =>
    GPSService.getStoredSafetyEvents(patientId)
  );

  useEffect(() => {
    setConsentActive(GPSService.isConsentEnabled(patientId));
    setLiveConsentedLocation(GPSService.getStoredLatestLocation(patientId));
    setSafetyEvents(GPSService.getStoredSafetyEvents(patientId));

    void GPSService.syncLatestConsentedLocation(patientId).then((cloudLoc) => {
      if (cloudLoc) {
        setLiveConsentedLocation(cloudLoc);
      }
    });

    const unsubGeofence = GPSService.subscribeToGeofenceConfig(patientId, (cfg) => {
      if (!cfg) return;
      setHomeLocation({ latitude: cfg.centerLatitude, longitude: cfg.centerLongitude });
      setLatDraft(String(cfg.centerLatitude));
      setLngDraft(String(cfg.centerLongitude));
      setAddressLabel(cfg.addressLabel || initialAddressLabel);
      setRadiusMeters(cfg.radiusMeters);
      setCustomRadiusInput(String(cfg.radiusMeters));
      setIsEnabled(cfg.isEnabled);
    });

    const unsubLiveLoc = GPSService.subscribeToLatestLocation(patientId, (loc) => {
      setLiveConsentedLocation(loc);
    });

    const unsubEvents = GPSService.subscribeToSafetyEvents(patientId, (evts) => {
      setSafetyEvents(evts);
    });

    const unsubLocal = subscribeToDataChanges(({ patientId: changedPid }) => {
      if (!changedPid || changedPid === patientId) {
        setConsentActive(GPSService.isConsentEnabled(patientId));
        setLiveConsentedLocation(GPSService.getStoredLatestLocation(patientId));
        setSafetyEvents(GPSService.getStoredSafetyEvents(patientId));
      }
    });

    return () => {
      unsubGeofence();
      unsubLiveLoc();
      unsubEvents();
      unsubLocal();
    };
  }, [patientId, initialAddressLabel]);

  const hasRealGpsFix = Boolean(patientLocationOverride || liveConsentedLocation);
  const hasAnyDisplayLocation = Boolean(hasRealGpsFix || allowSandboxPreview);

  const patientLocation: PatientLocationUpdate = patientLocationOverride ||
    liveConsentedLocation || {
      patientId,
      latitude: homeLocation.latitude + (allowSandboxPreview ? 0.0012 : 0),
      longitude: homeLocation.longitude + (allowSandboxPreview ? 0.0008 : 0),
      accuracyMeters: allowSandboxPreview ? 8 : 0,
      timestamp: new Date().toISOString(),
      isSharedWithCaregiver: consentActive,
    };

  const isEffectivelyShared = patientLocationOverride
    ? patientLocationOverride.isSharedWithCaregiver
    : consentActive && patientLocation.isSharedWithCaregiver;

  const geofenceConfig: GeofenceConfig = useMemo(() => ({
    patientId,
    centerLatitude: homeLocation.latitude,
    centerLongitude: homeLocation.longitude,
    radiusMeters,
    isEnabled,
    addressLabel,
    updatedAt: new Date().toISOString(),
    updatedBy: auth?.currentUser?.uid || 'caregiver',
  }), [patientId, homeLocation, radiusMeters, isEnabled, addressLabel, auth?.currentUser?.uid]);

  // Evaluate geofence status via GPSService
  const evaluation = useMemo(() => {
    if (!hasAnyDisplayLocation) {
      return {
        status: 'MONITORING_INACTIVE',
        distanceMeters: 0,
        isInside: true,
        accuracyAcceptable: true,
        isStale: false,
        rationale: safetyUi.noRealLocationYet,
      } as GeofenceEvaluationResult;
    }
    return GPSService.evaluateGeofence(patientLocation, geofenceConfig);
  }, [hasAnyDisplayLocation, patientLocation, geofenceConfig, safetyUi.noRealLocationYet]);

  // Resolve active tracking state among visible states
  const activeStatus: TrackingState = useMemo(() => {
    if (trackingStateOverride) return trackingStateOverride;
    if (!isEnabled) return 'TRACKING_PAUSED';
    if (!isEffectivelyShared) return 'CONSENT_WITHDRAWN';
    if (!hasAnyDisplayLocation) return 'TRACKING_PAUSED';
    if (patientLocation.accuracyMeters > 50) return 'POOR_ACCURACY';
    if (evaluation.status === 'OUTSIDE_SAFE_ZONE') return 'OUTSIDE_SAFE_ZONE';
    if (evaluation.status === 'PERMISSION_DENIED') return 'PERMISSION_DENIED';
    if (evaluation.status === 'LOCATION_UNAVAILABLE') return 'GPS_UNAVAILABLE';
    return 'INSIDE_SAFE_ZONE';
  }, [trackingStateOverride, isEnabled, isEffectivelyShared, hasAnyDisplayLocation, patientLocation, evaluation.status]);

  const onStatusChangeRef = useRef(onStatusChange);
  const onMetaChangeRef = useRef(onMetaChange);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
    onMetaChangeRef.current = onMetaChange;
  });

  const lastStatusKeyRef = useRef<string>('');
  useEffect(() => {
    const key = `${activeStatus}_${evaluation.status}_${evaluation.distanceMeters}_${radiusMeters}_${homeLocation.latitude}_${homeLocation.longitude}`;
    if (lastStatusKeyRef.current !== key) {
      lastStatusKeyRef.current = key;
      onStatusChangeRef.current?.(activeStatus, evaluation);
      onMetaChangeRef.current?.({
        radiusMeters,
        homeLocation,
        patientLocation: hasRealGpsFix ? patientLocation : null,
      });
    }
  }, [activeStatus, evaluation, radiusMeters, homeLocation, patientLocation, hasRealGpsFix]);

  const handleRadiusSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRad = parseInt(e.target.value, 10);
    setRadiusMeters(newRad);
    setCustomRadiusInput(String(newRad));
    if (onRadiusChange) onRadiusChange(newRad);
  };

  const handlePresetRadius = (meters: number) => {
    setRadiusMeters(meters);
    setCustomRadiusInput(String(meters));
    if (onRadiusChange) onRadiusChange(meters);
  };

  const handleCustomRadiusBlurOrChange = (val: string) => {
    setCustomRadiusInput(val);
    const parsed = Number(val);
    if (Number.isFinite(parsed) && parsed >= 25 && parsed <= 10000) {
      const rounded = Math.round(parsed);
      setRadiusMeters(rounded);
      if (onRadiusChange) onRadiusChange(rounded);
    }
  };

  const handleUseCaregiverCurrentGps = async () => {
    setIsLocatingGps(true);
    setConfigFeedback(null);
    const res = await GPSService.requestCaregiverCurrentPosition();
    setIsLocatingGps(false);
    if (res.ok && res.coordinates) {
      setHomeLocation({ latitude: res.coordinates.latitude, longitude: res.coordinates.longitude });
      setLatDraft(String(res.coordinates.latitude));
      setLngDraft(String(res.coordinates.longitude));
      setConfigFeedback({ type: 'ok', text: safetyUi.gpsCapturedMsg });
    } else {
      setConfigFeedback({
        type: 'err',
        text:
          res.errorCode === 'PERMISSION_DENIED'
            ? safetyUi.gpsPermissionDeniedErr
            : safetyUi.gpsUnavailableErr,
      });
    }
  };

  const handleSaveSafeZoneConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedLat = Number(latDraft);
    const parsedLng = Number(lngDraft);
    const parsedRadius = Number(customRadiusInput || radiusMeters);

    if (
      !Number.isFinite(parsedLat) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      !Number.isFinite(parsedLng) ||
      parsedLng < -180 ||
      parsedLng > 180 ||
      !Number.isFinite(parsedRadius) ||
      parsedRadius < 25 ||
      parsedRadius > 10000
    ) {
      setConfigFeedback({ type: 'err', text: safetyUi.invalidCoordinatesErr });
      return;
    }

    setIsSavingZone(true);
    setConfigFeedback(null);
    const nextHome = { latitude: parsedLat, longitude: parsedLng };
    setHomeLocation(nextHome);
    setRadiusMeters(Math.round(parsedRadius));

    const result = await GPSService.saveGeofenceConfig(
      {
        patientId,
        centerLatitude: parsedLat,
        centerLongitude: parsedLng,
        radiusMeters: Math.round(parsedRadius),
        isEnabled,
        addressLabel: addressLabel || 'Home Sanctuary',
        updatedAt: new Date().toISOString(),
        updatedBy: auth?.currentUser?.uid || 'caregiver',
      },
      {
        caregiverName: auth?.currentUser?.displayName || 'Caregiver',
        patientLanguage: language,
      }
    );

    setIsSavingZone(false);
    if (result.ok) {
      setConfigFeedback({ type: 'ok', text: safetyUi.savedSafeZoneMsg });
      if (onRadiusChange) onRadiusChange(Math.round(parsedRadius));
    } else {
      setConfigFeedback({ type: 'err', text: result.error || safetyUi.invalidCoordinatesErr });
    }
  };

  const handleToggleMonitoring = async () => {
    const nextEnabled = !isEnabled;
    setIsEnabled(nextEnabled);
    await GPSService.saveGeofenceConfig(
      {
        ...geofenceConfig,
        isEnabled: nextEnabled,
      },
      { notifyPatient: false }
    );
  };

  // Convert GPS displacement to SVG coordinate percentages
  const mapScaleMeters = Math.max(radiusMeters * 2.4, 1200);
  const latSpan = mapScaleMeters / 111000;
  const lngSpan =
    mapScaleMeters /
    (111000 * Math.max(0.15, Math.cos((homeLocation.latitude * Math.PI) / 180)));

  const getSvgCoordinates = (coord: Coordinates) => {
    const x = 50 + ((coord.longitude - homeLocation.longitude) / lngSpan) * 50;
    const y = 50 - ((coord.latitude - homeLocation.latitude) / latSpan) * 50;
    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    };
  };

  const homeSvg = { x: 50, y: 50 };
  const patientSvg = getSvgCoordinates({
    latitude: patientLocation.latitude,
    longitude: patientLocation.longitude,
  });

  const svgCircleRadiusPercent = (radiusMeters / mapScaleMeters) * 50;
  const directionsUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${patientLocation.latitude}%2C${patientLocation.longitude}%3B${homeLocation.latitude}%2C${homeLocation.longitude}`;

  return (
    <div
      data-testid="caregiver-safe-zone-map"
      className={`bg-white rounded-3xl p-5 md:p-6 border border-emerald-100 shadow-soft-purple space-y-4 ${className}`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2 flex-wrap">
              <span>{t('safe_zone.map_title')}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {t('safe_zone.spark_free')}
              </span>
              <span
                data-testid="safe-zone-source-badge"
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  hasRealGpsFix
                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {hasRealGpsFix ? t('safe_zone.source_gps') : t('safe_zone.source_preview')}
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              {t('safe_zone.subtitle', { name: patientName })}
            </p>
          </div>
        </div>

        {/* Status Badge & Monitoring Toggle */}
        <div className="flex items-center space-x-2 flex-wrap gap-1.5">
          <button
            type="button"
            onClick={handleToggleMonitoring}
            className="text-xs px-3.5 py-2 min-h-[44px] inline-flex items-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition cursor-pointer font-medium"
            title={safetyUi.monitoringToggleLabel}
          >
            {isEnabled ? t('safe_zone.pause_monitoring') : t('safe_zone.resume_monitoring')}
          </button>
          {activeStatus === 'PERMISSION_DENIED' ? (
            <div
              data-testid="geofence-status-permission-denied"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-300 text-rose-800 font-bold text-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>{t('safe_zone.perm_denied')}</span>
            </div>
          ) : activeStatus === 'GPS_UNAVAILABLE' ? (
            <div
              data-testid="geofence-status-gps-unavailable"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{t('safe_zone.gps_unavail')}</span>
            </div>
          ) : activeStatus === 'CONSENT_WITHDRAWN' ? (
            <div
              data-testid="geofence-status-consent-withdrawn"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs"
            >
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('safe_zone.consent_withdrawn')}</span>
            </div>
          ) : activeStatus === 'TRACKING_PAUSED' ? (
            <div
              data-testid="geofence-status-tracking-paused"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-gray-600 font-bold text-xs"
            >
              <Pause className="w-3.5 h-3.5 text-gray-500" />
              <span>{t('safe_zone.tracking_paused')}</span>
            </div>
          ) : activeStatus === 'POOR_ACCURACY' ? (
            <div
              data-testid="geofence-status-poor-accuracy"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{t('safe_zone.poor_accuracy', { meters: Math.round(patientLocation.accuracyMeters) })}</span>
            </div>
          ) : activeStatus === 'OUTSIDE_SAFE_ZONE' ? (
            <div
              data-testid="geofence-status-outside"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-300 text-rose-800 font-extrabold text-xs animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>{t('safe_zone.exited_zone')}</span>
            </div>
          ) : (
            <div
              data-testid="geofence-status-inside"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>{t('safe_zone.inside_zone')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Honest Notice on Production if Patient Device Hasn't Shared Real GPS Yet */}
      {!hasAnyDisplayLocation && (
        <div
          data-testid="safe-zone-no-real-location"
          className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 font-semibold flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{safetyUi.noRealLocationYet}</span>
        </div>
      )}

      {/* Caregiver Home Location & Geofence Boundary Configurator */}
      <form
        onSubmit={handleSaveSafeZoneConfig}
        data-testid="caregiver-geofence-config-form"
        className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 text-emerald-700" />
            <span>{safetyUi.configureHomeTitle}</span>
          </h4>
          <button
            type="button"
            data-testid="geofence-use-current-gps-btn"
            onClick={handleUseCaregiverCurrentGps}
            disabled={isLocatingGps}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{isLocatingGps ? safetyUi.locatingGps : safetyUi.useCurrentGpsBtn}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-2">
            <label htmlFor="geofence-address" className="block text-[11px] font-bold text-gray-600 mb-1">
              {safetyUi.homeLabelInput}
            </label>
            <input
              id="geofence-address"
              data-testid="geofence-address-input"
              type="text"
              value={addressLabel}
              onChange={(e) => setAddressLabel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="geofence-lat" className="block text-[11px] font-bold text-gray-600 mb-1">
              {safetyUi.latLabel}
            </label>
            <input
              id="geofence-lat"
              data-testid="geofence-lat-input"
              type="number"
              step="any"
              value={latDraft}
              onChange={(e) => setLatDraft(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-mono outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="geofence-lng" className="block text-[11px] font-bold text-gray-600 mb-1">
              {safetyUi.lngLabel}
            </label>
            <input
              id="geofence-lng"
              data-testid="geofence-lng-input"
              type="number"
              step="any"
              value={lngDraft}
              onChange={(e) => setLngDraft(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-mono outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {configFeedback && (
          <div
            data-testid="geofence-config-feedback"
            className={`px-3 py-2 rounded-xl text-xs font-bold border ${
              configFeedback.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {configFeedback.text}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <label htmlFor="custom-radius-input" className="font-bold whitespace-nowrap">
              {safetyUi.customRadiusLabel}:
            </label>
            <input
              id="custom-radius-input"
              data-testid="geofence-custom-radius-input"
              type="number"
              min="25"
              max="10000"
              value={customRadiusInput}
              onChange={(e) => handleCustomRadiusBlurOrChange(e.target.value)}
              className="w-24 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold"
            />
          </div>
          <button
            type="submit"
            data-testid="geofence-save-btn"
            disabled={isSavingZone}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-extrabold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSavingZone ? safetyUi.savingSafeZone : safetyUi.saveSafeZoneBtn}</span>
          </button>
        </div>
      </form>

      {/* Interactive Map Visual Stage (OpenStreetMap + SVG Geofence Radar) */}
      <div className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden border-2 border-emerald-100 bg-slate-900 shadow-inner">
        <div
          className="absolute inset-0 opacity-40 bg-[radial-gradient(#10b981_1.5px,transparent_1.5px)] [background-size:20px_20px]"
          aria-hidden="true"
        />

        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Safe zone radar map showing ${patientName} at ${Math.round(evaluation.distanceMeters)} meters from home`}
        >
          <circle
            cx={homeSvg.x}
            cy={homeSvg.y}
            r={svgCircleRadiusPercent}
            fill={evaluation.isInside ? 'rgba(16, 185, 129, 0.16)' : 'rgba(239, 68, 68, 0.16)'}
            stroke={evaluation.isInside ? '#10b981' : '#ef4444'}
            strokeWidth="0.8"
            strokeDasharray="2, 1"
          />

          {hasAnyDisplayLocation && (
            <>
              <line
                x1={homeSvg.x}
                y1={homeSvg.y}
                x2={patientSvg.x}
                y2={patientSvg.y}
                stroke={evaluation.isInside ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.6)'}
                strokeWidth="0.6"
                strokeDasharray="1.5, 1"
              />
              <circle
                cx={patientSvg.x}
                cy={patientSvg.y}
                r={Math.max(2, (patientLocation.accuracyMeters / mapScaleMeters) * 50)}
                fill="rgba(59, 130, 246, 0.2)"
                stroke="#3b82f6"
                strokeWidth="0.4"
              />
            </>
          )}
        </svg>

        {/* Home Marker */}
        <div
          style={{ left: `${homeSvg.x}%`, top: `${homeSvg.y}%` }}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
            <Home className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black text-white bg-slate-900/85 px-2 py-0.5 rounded-md mt-1 border border-white/20 whitespace-nowrap shadow-xs">
            {t('safe_zone.home_sanctuary')} ({addressLabel})
          </span>
        </div>

        {/* Patient Marker */}
        {hasAnyDisplayLocation && (
          <div
            style={{ left: `${patientSvg.x}%`, top: `${patientSvg.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg border-2 border-white font-black text-xs animate-bounce">
                🌸
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 animate-ping" />
            </div>
            <span className="text-[10px] font-black text-white bg-rose-900/90 px-2 py-0.5 rounded-md mt-1 border border-white/20 whitespace-nowrap shadow-xs">
              {patientName} ({Math.round(evaluation.distanceMeters)}m)
            </span>
          </div>
        )}

        {/* Map Legend Overlay */}
        <div className="absolute bottom-2 left-2 z-30 bg-slate-950/80 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-white/10 text-[11px] text-gray-300 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Home Geofence: {radiusMeters}m radius</span>
          </div>
          {hasAnyDisplayLocation && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>
                {safetyUi.liveDistanceLabel}: {Math.round(evaluation.distanceMeters)}m • ±{Math.round(patientLocation.accuracyMeters)}m
              </span>
            </div>
          )}
          {hasRealGpsFix && patientLocation.timestamp && (
            <div className="text-[10px] text-slate-400">
              {safetyUi.lastFixPrefix}: {new Date(patientLocation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {/* OpenStreetMap Attribution */}
        <div className="absolute bottom-1 right-2 z-30 text-[9px] text-gray-400 bg-slate-950/70 px-1.5 py-0.5 rounded">
          © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a> contributors
        </div>
      </div>

      {/* Geofence Radius Presets & Slider */}
      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-700" />
            <label htmlFor="radius-slider" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {t('safe_zone.radius_label')}{' '}
              <span className="text-emerald-800 font-extrabold text-sm">
                {t('safe_zone.metres_unit', { meters: radiusMeters })}
              </span>
            </label>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[50, 100, 200, 500, 1000, 1500].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handlePresetRadius(m)}
                className={`px-3 py-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-xs font-bold transition cursor-pointer ${
                  radiusMeters === m
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {m >= 1000 ? `${m / 1000}km` : `${m}m`}
              </button>
            ))}
          </div>
        </div>

        <input
          id="radius-slider"
          type="range"
          min="50"
          max="2000"
          step="50"
          value={Math.min(2000, Math.max(50, radiusMeters))}
          onChange={handleRadiusSliderChange}
          className="w-full accent-emerald-600 cursor-pointer h-2 bg-emerald-200 rounded-lg"
          aria-label="Adjust Safe Zone Radius in metres"
        />

        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span>{t('safe_zone.tight_hood')}</span>
          <span>{t('safe_zone.standard_walk')}</span>
          <span>{t('safe_zone.community_area')}</span>
        </div>
      </div>

      {/* Persisted Safe-Zone Exit & Return Alerts Log */}
      {safetyEvents.length > 0 && (
        <div
          data-testid="caregiver-safety-events-list"
          className="bg-rose-50/40 rounded-2xl p-3.5 border border-rose-100 space-y-2"
        >
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-900 uppercase tracking-wider">
            <Bell className="w-3.5 h-3.5 text-rose-600" />
            <span>{safetyUi.recentAlertsTitle}</span>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {safetyEvents.slice(0, 5).map((ev) => (
              <div
                key={ev.id}
                className="bg-white p-2.5 rounded-xl border border-rose-100 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold text-gray-900">
                    {ev.type === 'EXIT_SAFE_ZONE'
                      ? safetyUi.alertExitedTitle
                      : safetyUi.alertReturnedTitle}
                  </span>
                  <p className="text-[11px] text-gray-600">
                    {formatGpsSafetyMessage(
                      ev.type === 'EXIT_SAFE_ZONE' ? safetyUi.alertExitedMsg : safetyUi.alertReturnedMsg,
                      {
                        name: patientName,
                        distance: Math.round(ev.distanceFromHomeMeters),
                        radius: Math.round(ev.geofenceRadiusMeters),
                      }
                    )}{' '}
                    • {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {ev.acknowledged ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    {safetyUi.acknowledgedBadge}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      GPSService.acknowledgeSafetyEvent(
                        patientId,
                        ev.id,
                        auth?.currentUser?.uid || 'caregiver'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    {safetyUi.acknowledgeAlertBtn}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency & Quick Care Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
        <a
          href={`tel:${patientPhone.replace(/\s+/g, '')}`}
          className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          aria-label={`Call ${patientName}`}
        >
          <Phone className="w-4 h-4" />
          <span>{t('safe_zone.call_patient', { name: patientName, phone: patientPhone })}</span>
        </a>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:flex-1 py-3 px-4 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          aria-label="Get walking directions to patient on OpenStreetMap"
        >
          <Navigation className="w-4 h-4 text-emerald-600" />
          <span>{t('safe_zone.walking_directions')}</span>
          <ExternalLink className="w-3 h-3 text-gray-400" />
        </a>
      </div>
    </div>
  );
};
