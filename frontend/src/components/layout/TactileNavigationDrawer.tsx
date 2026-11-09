/**
 * SAKSHAM — MILESTONE 7.2: TACTILE FALLBACK NAVIGATION DRAWER
 * Guarantees accessible, touch-based four-destination patient navigation without trapping users.
 */

import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext.js';
import { useAccessibility } from '../../context/AccessibilityContext.js';
import { Home, Users, Gamepad2, User, X, Compass, ChevronRight } from 'lucide-react';
import { CharacterVisualizer } from '../../features/ai-companion/CharacterVisualizer.js';

export interface TactileNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export const TactileNavigationDrawer: React.FC<TactileNavigationDrawerProps> = ({
  isOpen,
  onClose,
  triggerRef,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { highContrast } = useAccessibility();

  const drawerRef = useRef<HTMLDivElement | null>(null);
  const firstItemRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Exactly four approved permanent patient navigation destinations
  const navDestinations = [
    {
      id: 'nav-home',
      path: '/patient',
      exact: true,
      label: t('nav.home'),
      desc: t('sanctuary.nav_home_desc'),
      icon: Home,
      color: 'text-purple-700 bg-purple-100',
    },
    {
      id: 'nav-family',
      path: '/patient/loved-ones',
      exact: false,
      label: t('nav.family'),
      desc: t('sanctuary.nav_family_desc'),
      icon: Users,
      color: 'text-rose-700 bg-rose-100',
    },
    {
      id: 'nav-games',
      path: '/patient/mind-games',
      exact: false,
      label: t('nav.games'),
      desc: t('sanctuary.nav_games_desc'),
      icon: Gamepad2,
      color: 'text-amber-700 bg-amber-100',
    },
    {
      id: 'nav-profile',
      path: '/patient/profile',
      exact: false,
      label: t('nav.profile'),
      desc: t('sanctuary.nav_profile_desc'),
      icon: User,
      color: 'text-indigo-700 bg-indigo-100',
    },
  ];

  const isActive = (itemPath: string, exact?: boolean) => {
    if (exact) return location.pathname === itemPath;
    return location.pathname.startsWith(itemPath);
  };

  // Focus management & Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    // Focus first navigation item when opened
    const timer = setTimeout(() => {
      firstItemRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        triggerRef?.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  // Restore focus to trigger button when closed
  const handleClose = () => {
    onClose();
    setTimeout(() => {
      triggerRef?.current?.focus();
    }, 50);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t('sanctuary.nav_title')}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <div
        ref={drawerRef}
        className={`fixed top-0 bottom-0 w-full max-w-sm flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          isRTL ? 'right-0' : 'left-0'
        } ${
          highContrast
            ? 'bg-neutral-950 text-white border-r-4 border-amber-400'
            : 'bg-white text-slate-900 border-r border-purple-100'
        }`}
      >
        {/* Drawer Header */}
        <div
          className={`p-5 flex items-center justify-between border-b ${
            highContrast
              ? 'border-neutral-800 bg-neutral-900'
              : 'border-purple-100 bg-gradient-to-r from-purple-700 via-purple-600 to-lavender-600 text-white'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold leading-tight">
                {t('sanctuary.nav_title')}
              </h2>
              <p className="text-[11px] opacity-85">
                Saksham Neuro-Care
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            className="p-2.5 rounded-full hover:bg-white/20 active:scale-95 transition cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t('sanctuary.nav_close')}
            title={t('sanctuary.nav_close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Destination List (Exactly 4 destinations) */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          role="menu"
          aria-label={t('sanctuary.nav_title')}
        >
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
            Patient Sanctuaries
          </p>

          {navDestinations.map((dest, idx) => {
            const Icon = dest.icon;
            const active = isActive(dest.path, dest.exact);

            return (
              <button
                key={dest.id}
                ref={idx === 0 ? firstItemRef : undefined}
                type="button"
                onClick={() => handleNavigate(dest.path)}
                className={`w-full text-left p-4 rounded-2xl transition-all duration-200 flex items-center justify-between group min-h-[64px] cursor-pointer ${
                  active
                    ? highContrast
                      ? 'bg-amber-400 text-black border-2 border-black font-extrabold shadow-sm'
                      : 'bg-purple-100/90 text-purple-950 border-2 border-purple-400 font-extrabold shadow-sm'
                    : highContrast
                    ? 'bg-neutral-900 text-white hover:bg-neutral-800 border border-neutral-700 font-bold'
                    : 'bg-slate-50 hover:bg-purple-50/80 text-slate-800 border border-slate-200 hover:border-purple-200 font-bold'
                }`}
                role="menuitem"
                aria-current={active ? 'page' : undefined}
                aria-label={`${dest.label} - ${dest.desc}`}
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${
                      active
                        ? highContrast
                          ? 'bg-black text-amber-400'
                          : 'bg-purple-600 text-white shadow-xs'
                        : dest.color
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold leading-tight">
                      {dest.label}
                    </h3>
                    <p
                      className={`text-xs mt-0.5 leading-snug line-clamp-1 ${
                        active
                          ? highContrast
                            ? 'text-neutral-900 font-medium'
                            : 'text-purple-800 font-medium'
                          : 'text-slate-500 font-normal'
                      }`}
                    >
                      {dest.desc}
                    </p>
                  </div>
                </div>

                <ChevronRight
                  className={`w-5 h-5 transition-transform group-hover:translate-x-1 shrink-0 ${
                    active ? (highContrast ? 'text-black' : 'text-purple-700') : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>

        {/* Reassuring Footer with Compact Asha Companion */}
        <div
          className={`p-4 border-t flex items-center space-x-3 ${
            highContrast
              ? 'bg-neutral-900 border-neutral-800'
              : 'bg-lavender-50/70 border-purple-100'
          }`}
        >
          <CharacterVisualizer
            characterId="asha"
            mode="compact"
            size={48}
            expression="comforting"
          />
          <div className="flex-1">
            <p className="text-xs font-bold text-purple-950">
              Asha is always here
            </p>
            <p className="text-[11px] text-purple-800/80">
              Tap any button or ask whenever you like
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
