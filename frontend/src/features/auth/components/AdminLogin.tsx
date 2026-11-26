import React from 'react';
import { CommonLoginForm } from './CommonLoginForm.js';
import { ShieldCheck, Lock, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getAuthUi } from '../../portals/utils/portalTranslation.js';
import '../styles/auth.css';

interface AdminLoginProps {
  onSubmit: (email: string, pass: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  onBackToRoles: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onSubmit,
  onForgotPassword,
  isLoading,
  errorMessage,
  onBackToRoles,
}) => {
  const { language } = useLanguage();
  const ui = getAuthUi(language);
  return (
    <div className="theme-admin min-h-[560px] max-w-md mx-auto bg-white rounded-3xl p-6 md:p-8 border-2 border-slate-300 shadow-2xl relative overflow-hidden animate-in fade-in">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
        <button
          onClick={onBackToRoles}
          className="text-xs font-bold text-slate-700 hover:text-black flex items-center space-x-1"
        >
          <span>{ui.changePortal}</span>
        </button>
        <span className="text-[11px] font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-300 flex items-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-800" />
          <span>{ui.adminPortalBadge}</span>
        </span>
      </div>

      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{ui.adminAccessTitle}</h2>
        <p className="text-xs text-gray-500 mt-1">
          {ui.adminAccessSub}
        </p>
      </div>

      {/* Restricted Registration Notice */}
      <div className="mb-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 flex items-start space-x-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <span>
          <strong>{ui.adminNoPublicRegTitle}</strong> {ui.adminNoPublicRegBody}
        </span>
      </div>

      {/* Form */}
      <CommonLoginForm
        onSubmit={onSubmit}
        onForgotPassword={onForgotPassword}
        isLoading={isLoading}
        errorMessage={errorMessage}
        buttonText={ui.adminSignInBtn}
        buttonClass="bg-slate-900 hover:bg-black text-white font-bold"
        placeholderEmail="admin.ops@saksham.care"
        emailLabel={ui.adminEmailLabel}
      />

      {/* Security Footer */}
      <div className="mt-8 pt-4 border-t border-gray-100 text-center">
        <p className="text-[11px] text-gray-400">
          {ui.adminAuditFooter}
        </p>
      </div>
    </div>
  );
};
