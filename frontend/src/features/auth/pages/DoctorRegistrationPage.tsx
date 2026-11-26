import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { RegistrationForm } from '../components/RegistrationForm.js';
import { RegistrationService } from '../services/registrationService.js';
import { DoctorRegistrationData } from '../types/auth.types.js';
import {
  uploadDoctorVerificationDocument,
  persistExtendedDoctorCredentials,
} from '../services/doctorCredentialService.js';
import { ArrowLeft, Stethoscope, Clock, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getAuthUi } from '../../portals/utils/portalTranslation.js';
import { getGovernanceUi } from '../../portals/utils/governanceTranslation.js';
import { LanguageSwitcherPill } from '../../../components/layout/LanguageSwitcherPill.js';
import '../styles/auth.css';

export const DoctorRegistrationPage: React.FC = () => {
  const { language } = useLanguage();
  const ui = getAuthUi(language);
  const govUi = getGovernanceUi(language);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<DoctorRegistrationData | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const handleRegister = async (data: DoctorRegistrationData) => {
    setIsLoading(true);
    setErrorMessage(null);
    setUploadNotice(null);
    try {
      const createdUser = await RegistrationService.registerDoctor(data);
      const uploadResult = await uploadDoctorVerificationDocument(
        createdUser.uid,
        data.verificationDocumentFile
      );
      await persistExtendedDoctorCredentials(createdUser.uid, data, uploadResult);
      if (uploadResult.notice) {
        setUploadNotice(uploadResult.notice);
      }
      setSubmittedData(data);
      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Application submission failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // If submitted, show Dedicated Pending Verification Screen
  if (isSubmitted && submittedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50/40 flex items-center justify-center p-4 py-8">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 md:p-8 border-2 border-blue-200 shadow-xl text-center space-y-4 animate-in fade-in">
          <div className="flex justify-end mb-2">
            <LanguageSwitcherPill />
          </div>
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
            <Clock className="w-8 h-8" />
          </div>

          <div className="inline-block px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold border border-amber-200">
            {ui.regDocPendingBadge}
          </div>

          <h1 className="text-2xl font-black text-saksham-darkText">
            {ui.regDocReceivedTitle} {submittedData.fullName}
          </h1>

          <p className="text-xs text-gray-600 leading-relaxed">
            {ui.regDocReceivedSub}
          </p>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-left text-xs space-y-1.5">
            {submittedData.qualification && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">{govUi.regQualificationLabel}:</span>
                <span className="font-bold text-gray-800 text-right">{submittedData.qualification}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">{ui.regDocLicense}</span>
              <span className="font-mono font-bold text-gray-800 text-right">{submittedData.licenseNumber}</span>
            </div>
            {submittedData.registrationAuthority && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">{govUi.regAuthorityLabel}:</span>
                <span className="font-bold text-gray-800 text-right">{submittedData.registrationAuthority}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">{ui.regDocSpecialty}</span>
              <span className="font-bold text-gray-800 text-right">{submittedData.specialty}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">{ui.regDocHospital}</span>
              <span className="font-bold text-gray-800 text-right">{submittedData.hospitalAffiliation || ui.regDocNotSpecified}</span>
            </div>
            {submittedData.phoneNumber && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">{govUi.regDoctorPhoneLabel}:</span>
                <span className="font-mono font-bold text-gray-800 text-right">{submittedData.phoneNumber}</span>
              </div>
            )}
            {submittedData.verificationDocumentName && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">{govUi.regCredentialDocLabel}:</span>
                <span className="font-medium text-blue-800 text-right truncate max-w-[180px]">{submittedData.verificationDocumentName}</span>
              </div>
            )}
          </div>

          {uploadNotice && (
            <div className="p-2.5 bg-amber-50 rounded-xl text-[11px] text-amber-900 border border-amber-200 text-left">
              {uploadNotice}
            </div>
          )}

          <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-900 border border-blue-100 flex items-start space-x-2 text-left">
            <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>
              {ui.regDocApprovalNote}
            </span>
          </div>

          <div className="pt-2">
            <Link
              to="/login?role=doctor"
              className="inline-block w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-2xl text-xs shadow-md transition"
            >
              {ui.regDocReturnSignIn}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50/40 flex items-center justify-center p-4 py-8">
      <div className="max-w-lg w-full bg-white rounded-3xl p-6 md:p-8 border-2 border-blue-200 shadow-soft-purple">
        {/* Navigation */}
        <div className="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-blue-100">
          <Link
            to="/login?role=doctor"
            className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{ui.regBackToDoctorSignIn}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcherPill />
            <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center space-x-1">
              <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
              <span>{ui.regPhysicianAppBadge}</span>
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-2 shadow-xs">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-saksham-darkText">{ui.regDoctorTitle}</h1>
          <p className="text-xs text-gray-500 mt-1">
            {ui.regDoctorSub}
          </p>
        </div>

        {/* Form */}
        <RegistrationForm
          role="doctor"
          onSubmit={handleRegister}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />

        <div className="mt-5 text-center text-xs text-gray-500">
          {ui.regAlreadyApproved}{' '}
          <Link to="/login?role=doctor" className="font-bold text-blue-700 hover:underline">
            {ui.regSignInHere}
          </Link>
        </div>
      </div>
    </div>
  );
};
