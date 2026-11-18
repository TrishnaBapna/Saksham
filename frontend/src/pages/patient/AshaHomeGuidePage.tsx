/**
 * SAKSHAM NEURO-CARE — ASHA HOME GUIDE PATIENT NAVIGATION PAGE
 * Minimalist, high-legibility walking navigation guide for Alzheimer's patients.
 * 100% Spark Free Plan compliant — 0 paid APIs, 0 cloud functions.
 */

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { NavigationService, HomeNavigationGuidance } from '../../features/safety/services/navigationService.js';
import { Coordinates } from '../../features/safety/types/safety.types.js';
import { SpeechService } from '../../services/speechService.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { useAccessibility } from '../../context/AccessibilityContext.js';
import { CharacterVisualizer } from '../../features/ai-companion/CharacterVisualizer.js';

interface AshaHomeGuidePageProps {
  initialPatientLocation?: Coordinates & { accuracyMeters?: number; heading?: number | null };
  initialHomeLocation?: Coordinates & { addressLabel?: string };
  caregiverPhone?: string;
  caregiverName?: string;
}

export const AshaHomeGuidePage: React.FC<AshaHomeGuidePageProps> = ({
  initialPatientLocation = {
    latitude: 12.9735,
    longitude: 77.5960,
    accuracyMeters: 8,
    heading: 0,
  },
  initialHomeLocation = {
    latitude: 12.9716,
    longitude: 77.5946,
    addressLabel: 'Indiranagar 2nd Stage, Bengaluru',
  },
  caregiverPhone = '+91 98765 43210',
  caregiverName = 'Priya',
}) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { highContrast } = useAccessibility();

  const [patientLocation] = useState(initialPatientLocation);
  const [homeLocation] = useState(initialHomeLocation);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Compute navigation guidance
  const guidance: HomeNavigationGuidance = NavigationService.computeHomeGuidance(
    patientLocation,
    homeLocation,
    language
  );

  const handleSpeakGuidance = () => {
    setIsSpeaking(true);
    SpeechService.speak(
      guidance.spokenGuidance,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN'
    );
  };

  useEffect(() => {
    // Speak guidance on mount
    handleSpeakGuidance();
    return () => {
      SpeechService.cancelSpeech();
    };
  }, []);

  const osmUrl = NavigationService.getOsmWalkingDirectionsUrl(patientLocation, homeLocation);

  // Determine Arrow Rotation from bearing degrees
  const arrowStyle = {
    transform: `rotate(${guidance.bearingDegrees}deg)`,
    transition: 'transform 0.5s ease-out',
  };

  return (
    <div
      data-testid="asha-home-guide-page"
      className={`min-h-screen pb-28 pt-4 px-4 max-w-lg mx-auto space-y-4 ${
        highContrast ? 'bg-neutral-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => navigate('/patient')}
            className="p-2.5 rounded-2xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-xs min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Back to Sanctuary"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-saksham-darkText">Asha Home Guide</h1>
            <p className="text-xs text-rose-800 font-bold">Gentle Walking Direction to Home</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSpeakGuidance}
          className={`p-2.5 rounded-2xl transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer ${
            isSpeaking
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200 shadow-2xs'
          }`}
          aria-label={isSpeaking ? 'Asha is speaking' : 'Hear Asha voice guidance'}
        >
          {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Direction Compass Card */}
      <div
        className={`p-6 rounded-3xl border-2 text-center space-y-4 shadow-soft-purple ${
          highContrast
            ? 'bg-neutral-900 border-amber-400'
            : 'bg-gradient-to-b from-white via-purple-50/40 to-white border-purple-200'
        }`}
      >
        {/* Large Directional Indicator */}
        <div className="relative w-36 h-36 mx-auto rounded-full bg-purple-100 flex items-center justify-center border-4 border-purple-300 shadow-inner">
          <Navigation
            className="w-20 h-20 text-purple-700 drop-shadow-md"
            style={arrowStyle}
            aria-hidden="true"
          />
        </div>

        {/* Turn Direction Text */}
        <div className="space-y-1">
          <span className="text-xs font-black uppercase tracking-wider text-purple-700 bg-purple-100/80 px-3 py-1 rounded-full border border-purple-200">
            {guidance.directionLabel}
          </span>
          <div className="text-3xl font-black text-slate-900 pt-1">
            {Math.round(guidance.distanceMeters)} metres
          </div>
          <p className="text-xs text-slate-600 font-semibold">to your Home Sanctuary</p>
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-1 rounded-full border border-purple-100 shadow-2xs">
          <Home className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium">{guidance.homeAddressLabel}</span>
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
              <span className="text-xs font-bold text-purple-950">Asha Companion</span>
              <span className="text-[10px] font-bold text-rose-700 bg-white/90 px-2 py-0.5 rounded-full border border-rose-200">
                Safe Step by Step
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
            <span>Repeat Asha Voice</span>
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
            <span className="font-bold">GPS Accuracy Approximate (±{guidance.accuracyMeters}m):</span> GPS signal is slightly weaker here. Look for familiar landmarks like the banyan tree or main road, or tap Call Caregiver below.
          </p>
        </div>
      )}

      {/* Quick Assistance Actions */}
      <div className="space-y-2 pt-1">
        {/* Call Primary Caregiver */}
        <a
          href={`tel:${caregiverPhone.replace(/\s+/g, '')}`}
          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
          aria-label={`Call Caregiver ${caregiverName}`}
        >
          <Phone className="w-4 h-4" />
          <span>Call {caregiverName} ({caregiverPhone})</span>
        </a>

        {/* External Walking Map Handoff */}
        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 px-4 bg-white hover:bg-purple-50 text-purple-900 font-bold text-xs rounded-2xl border border-purple-200 shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          aria-label="Open walking route on map"
        >
          <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
          <span>Open Full Walking Map (OpenStreetMap)</span>
        </a>

        {/* 112 Emergency Escalation */}
        <div className="text-center pt-2">
          <a
            href="tel:112"
            className="text-xs text-rose-700 font-bold hover:underline inline-flex items-center justify-center min-h-[44px] px-3"
            aria-label="Call emergency services 112"
          >
            Need urgent help? Call Emergency Services (112)
          </a>
        </div>
      </div>
    </div>
  );
};
