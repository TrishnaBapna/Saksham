import React from 'react';
import { Link } from 'react-router-dom';
import { CommonLoginForm } from './CommonLoginForm.js';
import { Stethoscope, FileCheck2, AlertCircle } from 'lucide-react';
import '../styles/auth.css';

interface DoctorLoginProps {
  onSubmit: (email: string, pass: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  onBackToRoles: () => void;
}

export const DoctorLogin: React.FC<DoctorLoginProps> = ({
  onSubmit,
  onForgotPassword,
  isLoading,
  errorMessage,
  onBackToRoles,
}) => {
  return (
    <div className="theme-doctor min-h-[560px] max-w-md mx-auto bg-white/98 rounded-3xl p-6 md:p-8 border-2 border-blue-200 shadow-soft-purple relative overflow-hidden animate-in fade-in">
      {/* Decorative ambient aura */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-100/40 rounded-full blur-2xl pointer-events-none" />

      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-blue-100">
        <button
          onClick={onBackToRoles}
          className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center space-x-1"
        >
          <span>← Change Portal</span>
        </button>
        <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center space-x-1">
          <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
          <span>Clinical Console</span>
        </span>
      </div>

      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Stethoscope className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-saksham-darkText">Clinician Sign In</h2>
        <p className="text-xs text-gray-500 mt-1">
          Access neurological patient charts, routine adherence trends, and task assignment tools.
        </p>
      </div>

      {/* Clinical Verification Notice */}
      <div className="mb-5 p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs text-blue-900 flex items-start space-x-2.5">
        <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Professional Verification Required:</strong> New medical registrations remain in a <em>pending</em> state until medical license credentials and hospital affiliations are verified by an administrator.
        </span>
      </div>

      {/* Form */}
      <CommonLoginForm
        onSubmit={onSubmit}
        onForgotPassword={onForgotPassword}
        isLoading={isLoading}
        errorMessage={errorMessage}
        buttonText="Sign In to Clinical Console"
        buttonClass="bg-blue-700 hover:bg-blue-800 text-white font-bold"
        placeholderEmail="dr.raman.verma@saksham.care"
        emailLabel="Medical Email Address"
      />

      {/* Registration Application Link */}
      <div className="mt-6 pt-4 border-t border-blue-100 text-center space-y-2">
        <p className="text-xs text-gray-600">
          Not yet registered with Saksham?{' '}
          <Link
            to="/register/doctor"
            className="font-bold text-blue-700 hover:text-blue-900 underline"
          >
            Apply for Doctor Registration
          </Link>
        </p>

        <div className="flex items-center justify-center space-x-1.5 text-[11px] text-gray-400 pt-1">
          <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Requires valid MCI / State Medical Council Registration</span>
        </div>
      </div>
    </div>
  );
};
