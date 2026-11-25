/**
 * SAKSHAM NEURO-CARE — PATIENT LOCATION CONSENT & PRIVACY MODAL
 * Plain-language, transparent location consent manager for Alzheimer's patients and families.
 * 100% Spark Free Plan compliant — 0 paid APIs, 0 cloud functions.
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../context/LanguageContext.js';
import { GPSService } from '../../../services/gpsService.js';
import {
  ShieldCheck,
  MapPin,
  Lock,
  BatteryCharging,
  ToggleLeft,
  ToggleRight,
  X,
  CheckCircle2,
} from 'lucide-react';

interface PatientLocationConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  onConsentChange?: (isConsented: boolean) => void;
}

export const PatientLocationConsentModal: React.FC<PatientLocationConsentModalProps> = ({
  isOpen,
  onClose,
  patientId = 'default-patient',
  onConsentChange,
}) => {
  const { t } = useLanguage();
  const storageKey = `saksham_patient_location_consent_${patientId}`;
  const [isConsented, setIsConsented] = useState<boolean>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved !== null ? saved === 'true' : true;
  });
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      setIsConsented(saved === 'true');
    }
  }, [storageKey]);

  if (!isOpen) return null;

  const handleToggle = () => {
    const nextVal = !isConsented;
    setIsConsented(nextVal);
    GPSService.setConsentEnabled(patientId, nextVal);
    if (onConsentChange) onConsentChange(nextVal);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-purple-200 space-y-5 my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="consent-modal-title" className="font-extrabold text-base text-gray-900">
                {t('consent_modal.title')}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {t('consent_modal.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Toggle Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/70 to-teal-50/70 border border-emerald-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider block">
              {t('consent_modal.geofencing')}
            </span>
            <p className="text-sm font-extrabold text-slate-800">
              {isConsented ? t('consent_modal.active') : t('consent_modal.paused')}
            </p>
            <p className="text-xs text-emerald-800/90">
              {isConsented
                ? t('consent_modal.active_desc')
                : t('consent_modal.paused_desc')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            className="text-emerald-700 cursor-pointer p-1"
            aria-label={isConsented ? t('consent_modal.toggle_pause') : t('consent_modal.toggle_resume')}
          >
            {isConsented ? (
              <ToggleRight className="w-10 h-10 text-emerald-600" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-gray-400" />
            )}
          </button>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-100/80 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{t('consent_modal.updated')}</span>
          </div>
        )}

        {/* Three Transparent Safety Pillars */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            {t('consent_modal.commitments')}
          </h4>

          {/* Pillar 1 */}
          <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 flex items-start space-x-3 text-xs">
            <MapPin className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-purple-950 block">{t('consent_modal.pillar1_title')}</span>
              <p className="text-gray-600 mt-0.5 leading-relaxed">
                {t('consent_modal.pillar1_desc')}
              </p>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 flex items-start space-x-3 text-xs">
            <Lock className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-purple-950 block">{t('consent_modal.pillar2_title')}</span>
              <p className="text-gray-600 mt-0.5 leading-relaxed">
                {t('consent_modal.pillar2_desc')}
              </p>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 flex items-start space-x-3 text-xs">
            <BatteryCharging className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-purple-950 block">{t('consent_modal.pillar3_title')}</span>
              <p className="text-gray-600 mt-0.5 leading-relaxed">
                {t('consent_modal.pillar3_desc')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-purple-100 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition cursor-pointer min-h-[44px]"
          >
            {t('consent_modal.done')}
          </button>
        </div>
      </div>
    </div>
  );
};
