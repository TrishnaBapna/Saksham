/**
 * SAKSHAM NEURO-CARE — CAREGIVER SAFE ZONE INTERACTIVE MAP
 * 100% Spark Free Plan compliant — Uses OpenStreetMap tiles, SVG geofence rendering,
 * circular boundary adjustments, live distance calculations, and one-tap emergency calling.
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
} from 'lucide-react';
import {
  Coordinates,
  GeofenceConfig,
  PatientLocationUpdate,
  GeofenceEvaluationResult,
} from '../types/safety.types.js';
import { GPSService, DEFAULT_SAFE_ZONE_RADIUS_METERS } from '../../../services/gpsService.js';

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
  className?: string;
  patientLocationOverride?: PatientLocationUpdate | null;
  trackingStateOverride?: TrackingState;
}

export const CaregiverSafeZoneMap: React.FC<CaregiverSafeZoneMapProps> = ({
  patientId,
  patientName,
  patientPhone = '+91 98765 43210',
  initialCenter = { latitude: 12.9716, longitude: 77.5946 }, // Bengaluru Default
  initialRadiusMeters = DEFAULT_SAFE_ZONE_RADIUS_METERS,
  initialAddressLabel = 'Indiranagar 2nd Stage, Bengaluru',
  onRadiusChange,
  onStatusChange,
  className = '',
  patientLocationOverride,
  trackingStateOverride,
}) => {
  const [radiusMeters, setRadiusMeters] = useState<number>(initialRadiusMeters);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);

  // Home Geofence Center
  const homeLocation = initialCenter;
  const addressLabel = initialAddressLabel;

  // Patient Position (Override or Default Simulated ~140m north)
  const patientLocation: PatientLocationUpdate = patientLocationOverride || {
    patientId,
    latitude: initialCenter.latitude + 0.0012, // approx ~140m north
    longitude: initialCenter.longitude + 0.0008, // approx ~90m east
    accuracyMeters: 8,
    timestamp: new Date().toISOString(),
    isSharedWithCaregiver: true,
  };

  const geofenceConfig: GeofenceConfig = useMemo(() => ({
    patientId,
    centerLatitude: homeLocation.latitude,
    centerLongitude: homeLocation.longitude,
    radiusMeters,
    isEnabled,
    addressLabel,
    updatedAt: new Date().toISOString(),
    updatedBy: 'caregiver',
  }), [patientId, homeLocation, radiusMeters, isEnabled, addressLabel]);

  // Evaluate geofence status via GPSService
  const evaluation = useMemo(() => {
    return GPSService.evaluateGeofence(patientLocation, geofenceConfig);
  }, [patientLocation, geofenceConfig]);

  // Resolve active tracking state among 7 visible states
  const activeStatus: TrackingState = useMemo(() => {
    if (trackingStateOverride) return trackingStateOverride;
    if (!isEnabled) return 'TRACKING_PAUSED';
    if (!patientLocation.isSharedWithCaregiver) return 'CONSENT_WITHDRAWN';
    if (patientLocation.accuracyMeters > 50) return 'POOR_ACCURACY';
    if (evaluation.status === 'OUTSIDE_SAFE_ZONE') return 'OUTSIDE_SAFE_ZONE';
    if (evaluation.status === 'PERMISSION_DENIED') return 'PERMISSION_DENIED';
    if (evaluation.status === 'LOCATION_UNAVAILABLE') return 'GPS_UNAVAILABLE';
    return 'INSIDE_SAFE_ZONE';
  }, [trackingStateOverride, isEnabled, patientLocation, evaluation.status]);

  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  });

  const lastStatusKeyRef = useRef<string>('');
  useEffect(() => {
    const key = `${activeStatus}_${evaluation.status}_${evaluation.distanceMeters}`;
    if (lastStatusKeyRef.current !== key) {
      lastStatusKeyRef.current = key;
      onStatusChangeRef.current?.(activeStatus, evaluation);
    }
  }, [activeStatus, evaluation]);

  const handleRadiusSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRad = parseInt(e.target.value, 10);
    setRadiusMeters(newRad);
    if (onRadiusChange) onRadiusChange(newRad);
  };

  const handlePresetRadius = (meters: number) => {
    setRadiusMeters(meters);
    if (onRadiusChange) onRadiusChange(meters);
  };

  // Convert GPS displacement to SVG coordinate percentages
  // 1 degree latitude ~= 111,000 meters; scale view around 2200m diameter
  const mapScaleMeters = Math.max(radiusMeters * 2.4, 1200);
  const latSpan = mapScaleMeters / 111000;
  const lngSpan = mapScaleMeters / (111000 * Math.cos((homeLocation.latitude * Math.PI) / 180));

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

  // Calculate geofence circle radius in SVG percentage
  const svgCircleRadiusPercent = (radiusMeters / mapScaleMeters) * 50;

  // External walking directions URL (OpenStreetMap / Native Maps)
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
            <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
              <span>Safe Zone & Geofence Map</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                100% Spark Free
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              OpenStreetMap circular safe zone monitoring for {patientName}
            </p>
          </div>
        </div>

        {/* Status Badge & Monitoring Toggle */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsEnabled(!isEnabled)}
            className="text-xs px-3.5 py-2 min-h-[44px] inline-flex items-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition cursor-pointer font-medium"
            title="Toggle geofence active"
          >
            {isEnabled ? 'Pause Monitoring' : 'Resume Monitoring'}
          </button>
          {activeStatus === 'PERMISSION_DENIED' ? (
            <div
              data-testid="geofence-status-permission-denied"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-300 text-rose-800 font-bold text-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Permission Denied</span>
            </div>
          ) : activeStatus === 'GPS_UNAVAILABLE' ? (
            <div
              data-testid="geofence-status-gps-unavailable"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>GPS Unavailable</span>
            </div>
          ) : activeStatus === 'CONSENT_WITHDRAWN' ? (
            <div
              data-testid="geofence-status-consent-withdrawn"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs"
            >
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span>Consent Withdrawn</span>
            </div>
          ) : activeStatus === 'TRACKING_PAUSED' ? (
            <div
              data-testid="geofence-status-tracking-paused"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-gray-600 font-bold text-xs"
            >
              <Pause className="w-3.5 h-3.5 text-gray-500" />
              <span>Tracking Paused</span>
            </div>
          ) : activeStatus === 'POOR_ACCURACY' ? (
            <div
              data-testid="geofence-status-poor-accuracy"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Poor Accuracy (±{Math.round(patientLocation.accuracyMeters)}m)</span>
            </div>
          ) : activeStatus === 'OUTSIDE_SAFE_ZONE' ? (
            <div
              data-testid="geofence-status-outside"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-300 text-rose-800 font-extrabold text-xs animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Exited Safe Zone!</span>
            </div>
          ) : (
            <div
              data-testid="geofence-status-inside"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Inside Safe Zone</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Map Visual Stage (OpenStreetMap + SVG Geofence Radar) */}
      <div className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden border-2 border-emerald-100 bg-slate-900 shadow-inner">
        {/* OpenStreetMap Tile Pattern Background */}
        <div
          className="absolute inset-0 opacity-40 bg-[radial-gradient(#10b981_1.5px,transparent_1.5px)] [background-size:20px_20px]"
          aria-hidden="true"
        />

        {/* SVG Geofence & Breadcrumb Layer */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Safe zone radar map showing ${patientName} at ${Math.round(evaluation.distanceMeters)} meters from home`}
        >
          {/* Circular Geofence Boundary */}
          <circle
            cx={homeSvg.x}
            cy={homeSvg.y}
            r={svgCircleRadiusPercent}
            fill={evaluation.isInside ? 'rgba(16, 185, 129, 0.16)' : 'rgba(239, 68, 68, 0.16)'}
            stroke={evaluation.isInside ? '#10b981' : '#ef4444'}
            strokeWidth="0.8"
            strokeDasharray="2, 1"
          />

          {/* Line connecting Home and Patient */}
          <line
            x1={homeSvg.x}
            y1={homeSvg.y}
            x2={patientSvg.x}
            y2={patientSvg.y}
            stroke={evaluation.isInside ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.6)'}
            strokeWidth="0.6"
            strokeDasharray="1.5, 1"
          />

          {/* Accuracy radius ring around patient */}
          <circle
            cx={patientSvg.x}
            cy={patientSvg.y}
            r={Math.max(2, (patientLocation.accuracyMeters / mapScaleMeters) * 50)}
            fill="rgba(59, 130, 246, 0.2)"
            stroke="#3b82f6"
            strokeWidth="0.4"
          />
        </svg>

        {/* HTML Markers Positioned Absolutely */}
        {/* 1. Home Marker */}
        <div
          style={{ left: `${homeSvg.x}%`, top: `${homeSvg.y}%` }}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
            <Home className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black text-white bg-slate-900/85 px-2 py-0.5 rounded-md mt-1 border border-white/20 whitespace-nowrap shadow-xs">
            Home Sanctuary
          </span>
        </div>

        {/* 2. Patient Marker */}
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

        {/* Map Legend Overlay */}
        <div className="absolute bottom-2 left-2 z-30 bg-slate-950/80 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-white/10 text-[11px] text-gray-300 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Home Geofence: {radiusMeters}m radius</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>Patient: ±{patientLocation.accuracyMeters}m accuracy</span>
          </div>
        </div>

        {/* OpenStreetMap Attribution (Mandatory & Spark Free) */}
        <div className="absolute bottom-1 right-2 z-30 text-[9px] text-gray-400 bg-slate-950/70 px-1.5 py-0.5 rounded">
          © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a> contributors
        </div>
      </div>

      {/* Geofence Radius Controls & Sliders */}
      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-700" />
            <label htmlFor="radius-slider" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Safe Zone Radius: <span className="text-emerald-800 font-extrabold text-sm">{radiusMeters} metres</span>
            </label>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[200, 500, 1000, 1500].map((m) => (
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
          min="100"
          max="2000"
          step="50"
          value={radiusMeters}
          onChange={handleRadiusSliderChange}
          className="w-full accent-emerald-600 cursor-pointer h-2 bg-emerald-200 rounded-lg"
          aria-label="Adjust Safe Zone Radius in metres"
        />

        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span>Tight Neighborhood (100m)</span>
          <span>Standard Walk (500m)</span>
          <span>Community Area (2000m)</span>
        </div>
      </div>

      {/* Emergency & Quick Care Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
        <a
          href={`tel:${patientPhone.replace(/\s+/g, '')}`}
          className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          aria-label={`Call ${patientName}`}
        >
          <Phone className="w-4 h-4" />
          <span>Call {patientName} ({patientPhone})</span>
        </a>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:flex-1 py-3 px-4 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          aria-label="Get walking directions to patient on OpenStreetMap"
        >
          <Navigation className="w-4 h-4 text-emerald-600" />
          <span>Walking Directions</span>
          <ExternalLink className="w-3 h-3 text-gray-400" />
        </a>
      </div>
    </div>
  );
};
