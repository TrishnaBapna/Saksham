import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage, SupportedLanguage, LANGUAGE_OPTIONS } from '../../context/LanguageContext.js';
import { useAccessibility } from '../../context/AccessibilityContext.js';
import { Sparkles, Shield, User, Globe, Eye, LogOut } from 'lucide-react';
import { RoleSwitcherModal } from './RoleSwitcherModal.js';
import { LanguageSelectionModal } from './LanguageSelectionModal.js';
import { NotificationBell } from '../../features/notifications/components/NotificationBell.js';

export const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();
  const { language, setLanguage, isLanguageModalOpen, setIsLanguageModalOpen } = useLanguage();
  const { fontSize, setFontSize, highContrast, setHighContrast } = useAccessibility();
  const [showRoleModal, setShowRoleModal] = useState(false);

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'patient':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'caregiver':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'doctor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'admin':
        return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  const cycleFontSize = () => {
    if (fontSize === 'normal') setFontSize('large');
    else if (fontSize === 'large') setFontSize('extra-large');
    else setFontSize('normal');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-purple-100 px-4 md:px-8 py-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div
            onClick={() => navigate(role === 'patient' ? '/patient' : `/${role}`)}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-lavender-500 flex items-center justify-center text-white shadow-soft-purple group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-xl md:text-2xl text-saksham-darkText tracking-tight">
                  Saksham
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                  सक्षम
                </span>
              </div>
              <p className="text-[11px] text-gray-500 hidden sm:block font-medium">
                AI Neuro-Care Companion Ecosystem
              </p>
            </div>
          </div>

          {/* Quick Controls: Role Selector, Accessibility, Language */}
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Language Selector */}
            <div className="flex items-center bg-white border border-gray-200 hover:border-purple-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-gray-700 transition shadow-2xs">
              <button
                type="button"
                onClick={() => setIsLanguageModalOpen(true)}
                className="flex items-center text-purple-600 mr-1 hover:text-purple-800 cursor-pointer"
                title="Open 22 Languages Selection Modal"
                aria-label="Open Pan-India Language Selector"
              >
                <Globe className="w-3.5 h-3.5" />
              </button>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
                aria-label="Change Language"
                title="Change Language"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.nativeName} ({opt.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size Scaling */}
            <button
              onClick={cycleFontSize}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-gray-200 hover:border-purple-300 text-xs font-semibold text-gray-700 hover:text-purple-700 transition bg-white"
              title={`Current font: ${fontSize}. Tap to scale`}
              aria-label="Toggle font scale"
            >
              <span className="font-bold">A</span>
              <span className="text-[10px] text-gray-500 uppercase">{fontSize === 'extra-large' ? 'XL' : fontSize === 'large' ? 'L' : 'M'}</span>
            </button>

            {/* High Contrast Toggle */}
            <button
              onClick={() => setHighContrast(!highContrast)}
              className={`p-1.5 rounded-xl border transition ${
                highContrast ? 'bg-saksham-darkText text-white border-black' : 'bg-white text-gray-600 border-gray-200'
              }`}
              title={highContrast ? 'High Contrast: ON' : 'High Contrast: OFF'}
              aria-label="Toggle High Contrast"
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Asha 2D Live Demo Quick Link */}
            <button
              onClick={() => navigate('/asha-demo')}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-bold text-purple-700 transition shadow-2xs"
              title="Open Asha 2D Live Companion Demo"
              aria-label="Open Asha 2D Live Companion Demo"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">Asha Demo</span>
            </button>

            {/* Role Switcher Pill */}
            <button
              onClick={() => setShowRoleModal(true)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold capitalize transition shadow-xs ${getRoleBadgeColor()}`}
              title="Switch role view for review"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Role: {role}</span>
            </button>

            {/* In-App Notification Bell */}
            <NotificationBell />

            {/* Profile Avatar */}
            <button
              onClick={() => navigate(role === 'patient' ? '/patient/profile' : `/${role}`)}
              className="w-9 h-9 rounded-full overflow-hidden border-2 border-purple-200 hover:border-purple-400 transition"
              title={currentUser?.displayName || 'User Profile'}
            >
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt={currentUser.displayName || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-purple-100 flex items-center justify-center text-purple-700">
                  <User className="w-4 h-4" />
                </div>
              )}
            </button>

            {/* Sign Out / Switch User */}
            <button
              onClick={() => {
                navigate('/login');
              }}
              className="p-1.5 rounded-xl border border-gray-200 hover:border-purple-300 text-gray-600 hover:text-purple-700 bg-white transition"
              title="Sign Out / Change Account"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Role Switcher Modal */}
      <RoleSwitcherModal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} />

      {/* Pan-India 22 Languages Selection Modal */}
      <LanguageSelectionModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
      />
    </>
  );
};
