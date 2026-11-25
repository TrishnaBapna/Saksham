import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { UserRole } from '../types/auth.types.js';
import { ShieldAlert, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRole: UserRole;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRole, children }) => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lavender-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-purple-800">{t('protected.verifying')}</p>
        </div>
      </div>
    );
  }

  // 1. Not Authenticated -> Redirect to Login with role context
  if (!isAuthenticated || !currentUser) {
    return <Navigate to={`/login?role=${allowedRole}`} replace />;
  }

  // 2. Pending Account Status Guard (e.g. Doctor awaiting admin review)
  if (currentUser.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 md:p-8 border-2 border-amber-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{t('protected.pending_title')}</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Your {currentUser.role} account is currently undergoing professional verification. Medical records and patient charts remain inaccessible until credential verification is completed by an administrator.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-2xl shadow-md transition"
          >
            Sign In with a Different Account
          </button>
        </div>
      </div>
    );
  }

  // 3. Suspended Account Guard
  if (currentUser.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 md:p-8 border-2 border-rose-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{t('protected.suspended_title')}</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            This account has been temporarily suspended by system administrators. Please contact administrative support to appeal this status.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-2xl shadow-md transition"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // 4. Strict Role Mismatch Guard (e.g. Patient trying to open /caregiver directly in URL)
  if (currentUser.role !== allowedRole) {
    const roleRoutes: Record<UserRole, string> = {
      patient: '/patient',
      caregiver: '/caregiver',
      doctor: '/doctor',
      admin: '/admin',
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 md:p-8 border-2 border-rose-200 shadow-xl text-center space-y-4 animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="inline-block px-3 py-1 bg-rose-100 text-rose-900 rounded-full text-xs font-bold border border-rose-200">
            {t('protected.denied_badge')}
          </div>

          <h2 className="text-xl font-black text-gray-900">{t('protected.denied_title')}</h2>

          <p className="text-xs text-gray-600 leading-relaxed">
            You are authenticated as <strong>{currentUser.displayName}</strong> with the verified role of <span className="font-bold text-purple-700 uppercase">"{currentUser.role}"</span>. You do not possess authorization to access the <strong>"{allowedRole}"</strong> dashboard.
          </p>

          <div className="pt-2 space-y-2">
            <button
              onClick={() => navigate(roleRoutes[currentUser.role])}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center space-x-2"
            >
              <span>{t('protected.go_permitted', { role: currentUser.role })}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-700 font-semibold"
            >
              {t('protected.switch_account')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Authorized -> Render Protected View
  return <>{children}</>;
};
