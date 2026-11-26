import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getAuthUi } from '../../portals/utils/portalTranslation.js';
import { getGovernanceUi } from '../../portals/utils/governanceTranslation.js';
import { toDoctorVerificationStatus } from '../services/roleDiagnosticService.js';
import { submitDoctorClarificationNote } from '../services/doctorCredentialService.js';
import { UserRole } from '../types/auth.types.js';
import {
  ShieldAlert,
  Clock,
  AlertTriangle,
  ArrowRight,
  XCircle,
  MessageSquarePlus,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface ProtectedRouteProps {
  allowedRole: UserRole;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRole, children }) => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, isLoading, signOut } = useAuth();
  const { t, language } = useLanguage();
  const ui = getAuthUi(language);
  const govUi = getGovernanceUi(language);
  const [clarificationNote, setClarificationNote] = useState('');
  const [isSubmittingClarification, setIsSubmittingClarification] = useState(false);
  const [clarificationMessage, setClarificationMessage] = useState<string | null>(null);
  const [clarificationError, setClarificationError] = useState<string | null>(null);

  const handleSignOutAndReturn = async (roleHint?: UserRole) => {
    try {
      await signOut();
    } catch {
      // Proceed to login navigation even if signOut fails
    }
    navigate(roleHint ? `/login?role=${roleHint}` : '/login');
  };

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

  // 2. Non-Approved Verification & Account Status Guards (blocks protected routes cleanly)
  const verificationStatus =
    currentUser.verificationStatus ||
    (currentUser.role === 'doctor' ? toDoctorVerificationStatus(currentUser.status) : undefined);

  if (currentUser.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div
          data-testid="protected-pending-gate"
          className="max-w-md w-full bg-white rounded-3xl p-6 md:p-8 border-2 border-amber-200 shadow-xl text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
            <Clock className="w-8 h-8" />
          </div>
          {verificationStatus && (
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
              {govUi.statusBadgePrefix} {govUi.statusPendingLabel}
            </span>
          )}
          <h2 className="text-xl font-bold text-gray-900">{t('protected.pending_title')}</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            {currentUser.role} {ui.protPendingBody}
          </p>
          {(currentUser.licenseNumber || currentUser.qualification || currentUser.hospital) && (
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-left text-xs space-y-1">
              <div className="font-bold text-gray-800 mb-1">{govUi.docSubmittedCredsTitle}</div>
              {currentUser.qualification && (
                <div><span className="text-gray-500">{govUi.fieldQualification}:</span> {currentUser.qualification}</div>
              )}
              {currentUser.licenseNumber && (
                <div><span className="text-gray-500">{govUi.fieldLicense}:</span> <span className="font-mono font-semibold">{currentUser.licenseNumber}</span></div>
              )}
              {currentUser.registrationAuthority && (
                <div><span className="text-gray-500">{govUi.fieldAuthority}:</span> {currentUser.registrationAuthority}</div>
              )}
              {currentUser.specialty && (
                <div><span className="text-gray-500">{govUi.fieldSpecialty}:</span> {currentUser.specialty}</div>
              )}
              {currentUser.hospital && (
                <div><span className="text-gray-500">{govUi.fieldInstitution}:</span> {currentUser.hospital}</div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => handleSignOutAndReturn(currentUser.role)}
            className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-2xl shadow-md transition"
          >
            {ui.protSignInDifferent}
          </button>
        </div>
      </div>
    );
  }

  if (currentUser.status === 'additional_info_required') {
    const handleClarificationSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setClarificationError(null);
      setClarificationMessage(null);
      setIsSubmittingClarification(true);
      try {
        await submitDoctorClarificationNote(currentUser.uid, clarificationNote);
        setClarificationMessage(govUi.docClarificationSent);
        setClarificationNote('');
      } catch (err: any) {
        setClarificationError(err?.message || govUi.docClarificationErr);
      } finally {
        setIsSubmittingClarification(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div
          data-testid="protected-info-required-gate"
          className="max-w-md w-full bg-white rounded-3xl p-6 md:p-8 border-2 border-indigo-200 shadow-xl space-y-4"
        >
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto shadow-sm">
              <MessageSquarePlus className="w-8 h-8" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
              {govUi.statusBadgePrefix} {govUi.statusInfoRequiredLabel}
            </span>
            <h2 className="text-xl font-bold text-gray-900">{govUi.docInfoReqTitle}</h2>
            <p className="text-xs text-gray-600 leading-relaxed">{govUi.docInfoReqBody}</p>
          </div>

          {currentUser.reviewNotes && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950">
              <div className="font-bold mb-1">{govUi.docReviewNoteLabel}:</div>
              <p>{currentUser.reviewNotes}</p>
            </div>
          )}

          <form onSubmit={handleClarificationSubmit} className="space-y-3">
            <label className="block text-xs font-bold text-gray-700">
              {govUi.docClarificationLabel}
            </label>
            <textarea
              value={clarificationNote}
              onChange={(e) => setClarificationNote(e.target.value)}
              rows={3}
              placeholder={govUi.docClarificationPlaceholder}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {clarificationError && (
              <p className="text-xs text-rose-700 font-medium">{clarificationError}</p>
            )}
            {clarificationMessage && (
              <p className="text-xs text-emerald-700 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{clarificationMessage}</span>
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmittingClarification}
              className="w-full py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {isSubmittingClarification && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{govUi.docSubmitClarificationBtn}</span>
            </button>
          </form>

          <button
            type="button"
            onClick={() => handleSignOutAndReturn(currentUser.role)}
            className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-2xl shadow-md transition"
          >
            {govUi.docSignOutReturn}
          </button>
        </div>
      </div>
    );
  }

  if (currentUser.status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div
          data-testid="protected-rejected-gate"
          className="max-w-md w-full bg-white rounded-3xl p-6 md:p-8 border-2 border-rose-300 shadow-xl text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-sm">
            <XCircle className="w-8 h-8" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
            {govUi.statusBadgePrefix} {govUi.statusRejectedLabel}
          </span>
          <h2 className="text-xl font-bold text-gray-900">{govUi.docRejectedTitle}</h2>
          <p className="text-xs text-gray-600 leading-relaxed">{govUi.docRejectedBody}</p>
          {currentUser.reviewNotes && (
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-left text-xs text-rose-950">
              <div className="font-bold mb-1">{govUi.docReviewNoteLabel}:</div>
              <p>{currentUser.reviewNotes}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => handleSignOutAndReturn(currentUser.role)}
            className="w-full py-3 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-2xl shadow-md transition"
          >
            {govUi.docSignOutReturn}
          </button>
        </div>
      </div>
    );
  }

  // 3. Suspended Account Guard
  if (currentUser.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div
          data-testid="protected-suspended-gate"
          className="max-w-md w-full bg-white rounded-3xl p-6 md:p-8 border-2 border-rose-200 shadow-xl text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
            {govUi.statusBadgePrefix} {govUi.statusSuspendedLabel}
          </span>
          <h2 className="text-xl font-bold text-gray-900">{t('protected.suspended_title')}</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            {ui.protSuspendedBody}
          </p>
          {currentUser.reviewNotes && (
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-left text-xs text-rose-950">
              <div className="font-bold mb-1">{govUi.docReviewNoteLabel}:</div>
              <p>{currentUser.reviewNotes}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => handleSignOutAndReturn(currentUser.role)}
            className="w-full py-3 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-2xl shadow-md transition"
          >
            {ui.protReturnLogin}
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
            {ui.protAuthAs} <strong>{currentUser.displayName}</strong> {ui.protVerifiedRole} <span className="font-bold text-purple-700 uppercase">"{currentUser.role}"</span>. {ui.protNoAuthFor} <strong>"{allowedRole}"</strong> {ui.protDashboardWord}
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
