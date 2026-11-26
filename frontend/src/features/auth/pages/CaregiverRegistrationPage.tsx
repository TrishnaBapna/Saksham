import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RegistrationForm } from '../components/RegistrationForm.js';
import { RegistrationService } from '../services/registrationService.js';
import { CaregiverRegistrationData } from '../types/auth.types.js';
import { ArrowLeft, HeartHandshake, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getAuthUi } from '../../portals/utils/portalTranslation.js';
import { LanguageSwitcherPill } from '../../../components/layout/LanguageSwitcherPill.js';
import '../styles/auth.css';

export const CaregiverRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ui = getAuthUi(language);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async (data: CaregiverRegistrationData) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await RegistrationService.registerCaregiver(data);
      navigate('/caregiver');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-sky-50/40 flex items-center justify-center p-4 py-8">
      <div className="max-w-lg w-full bg-white rounded-3xl p-6 md:p-8 border-2 border-teal-200 shadow-soft-purple">
        {/* Navigation */}
        <div className="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-teal-100">
          <Link
            to="/login?role=caregiver"
            className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{ui.regBackToSignIn}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcherPill />
            <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 flex items-center space-x-1">
              <HeartHandshake className="w-3.5 h-3.5 text-teal-600" />
              <span>{ui.regCaregiverBadge}</span>
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-2 shadow-xs">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-saksham-darkText">{ui.regCaregiverTitle}</h1>
          <p className="text-xs text-gray-500 mt-1">
            {ui.regCaregiverSub}
          </p>
        </div>

        {/* Privacy notice */}
        <div className="mb-4 p-3 bg-teal-50 rounded-2xl border border-teal-200 text-xs text-teal-900 flex items-start space-x-2">
          <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
          <span>
            {ui.regCaregiverPrivacyNote}
          </span>
        </div>

        {/* Form */}
        <RegistrationForm
          role="caregiver"
          onSubmit={handleRegister}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />

        <div className="mt-5 text-center text-xs text-gray-500">
          {ui.regAlreadyAcct}{' '}
          <Link to="/login?role=caregiver" className="font-bold text-teal-700 hover:underline">
            {ui.regSignInHere}
          </Link>
        </div>
      </div>
    </div>
  );
};
