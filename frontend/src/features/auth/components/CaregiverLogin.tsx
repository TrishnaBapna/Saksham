import React from 'react';
import { Link } from 'react-router-dom';
import { CommonLoginForm } from './CommonLoginForm.js';
import { HeartHandshake, ShieldCheck, KeyRound } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getAuthUi } from '../../portals/utils/portalTranslation.js';
import '../styles/auth.css';

interface CaregiverLoginProps {
  onSubmit: (email: string, pass: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  onBackToRoles: () => void;
}

export const CaregiverLogin: React.FC<CaregiverLoginProps> = ({
  onSubmit,
  onForgotPassword,
  isLoading,
  errorMessage,
  onBackToRoles,
}) => {
  const { language } = useLanguage();
  const ui = getAuthUi(language);
  return (
    <div className="theme-caregiver min-h-[560px] max-w-md mx-auto bg-white/95 rounded-3xl p-6 md:p-8 border-2 border-teal-200 shadow-soft-purple relative overflow-hidden animate-in fade-in">
      {/* Decorative ambient aura */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-teal-100/50 rounded-full blur-2xl pointer-events-none" />

      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-teal-100">
        <button
          onClick={onBackToRoles}
          className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center space-x-1"
        >
          <span>{ui.changePortal}</span>
        </button>
        <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 flex items-center space-x-1">
          <HeartHandshake className="w-3.5 h-3.5 text-teal-600" />
          <span>{ui.caregiverPortalBadge}</span>
        </span>
      </div>

      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
          <HeartHandshake className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-saksham-darkText">{ui.caregiverAccessTitle}</h2>
        <p className="text-xs text-gray-500 mt-1">
          {ui.caregiverAccessSub}
        </p>
      </div>

      {/* Connection Notice */}
      <div className="mb-5 p-3.5 bg-teal-50/80 rounded-2xl border border-teal-200 text-xs text-teal-900 flex items-start space-x-2.5">
        <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
        <span>
          <strong>{ui.caregiverPrivacyTitle}</strong> {ui.caregiverPrivacyBody}
        </span>
      </div>

      {/* Form */}
      <CommonLoginForm
        onSubmit={onSubmit}
        onForgotPassword={onForgotPassword}
        isLoading={isLoading}
        errorMessage={errorMessage}
        buttonText={ui.caregiverSignInBtn}
        buttonClass="bg-teal-600 hover:bg-teal-700 text-white font-bold"
        placeholderEmail="ananya.sharma@saksham.care"
        emailLabel={ui.caregiverEmailLabel}
      />

      {/* Invitation Code & Registration Links */}
      <div className="mt-6 pt-4 border-t border-teal-100 text-center space-y-3">
        <div className="flex items-center justify-center space-x-1.5 text-xs text-gray-600">
          <span>{ui.caregiverNewPrompt}</span>
          <Link
            to="/register/caregiver"
            className="font-bold text-teal-700 hover:text-teal-900 underline"
          >
            {ui.caregiverRegisterLink}
          </Link>
        </div>

        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-500 flex items-center justify-center space-x-1.5">
          <KeyRound className="w-3.5 h-3.5 text-teal-600" />
          <span>{ui.caregiverInviteHint}</span>
        </div>
      </div>
    </div>
  );
};
