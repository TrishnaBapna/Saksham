import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { useAccessibility } from '../../context/AccessibilityContext.js';
import { getEffectivePatientId } from '../../features/auth/services/identityService.js';
import { NotesService, PatientNote } from '../../features/notes/index.js';
import { CalendarService, CalendarEvent } from '../../features/calendar/index.js';
import {
  Layers,
  FileText,
  Calendar,
  X,
  Sparkles,
  ChevronRight,
  Clock,
  Pin,
  CalendarCheck,
} from 'lucide-react';

export const FloatingUtilityHub: React.FC = () => {
  const { currentUser } = useAuth();
  const { t, isRTL, formatDate } = useLanguage();
  const { highContrast } = useAccessibility();

  const [isOpen, setIsOpen] = useState(false);
  const [activeUtility, setActiveUtility] = useState<'notes' | 'calendar' | null>(null);

  const patientId = getEffectivePatientId(currentUser);

  // Read lightweight counts from verified Milestone 6.1 services
  const [notesCount, setNotesCount] = useState<number>(0);
  const [eventsCount, setEventsCount] = useState<number>(0);
  const [recentNotes, setRecentNotes] = useState<PatientNote[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);
  const modalCloseBtnRef = useRef<HTMLButtonElement | null>(null);

  const refreshData = useCallback(() => {
    try {
      const notes = NotesService.getNotes(patientId);
      setNotesCount(notes.length);
      setRecentNotes(notes.slice(0, 3));

      const events = CalendarService.getUpcomingEvents(patientId, 7);
      setEventsCount(events.length);
      setUpcomingEvents(events.slice(0, 3));
    } catch {
      // Fallback gracefully
    }
  }, [patientId]);

  useEffect(() => {
    refreshData();
  }, [refreshData, isOpen, activeUtility]);

  // Focus management when menu opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        firstMenuItemRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Focus management when modal opens
  useEffect(() => {
    if (activeUtility) {
      setTimeout(() => {
        modalCloseBtnRef.current?.focus();
      }, 50);
    }
  }, [activeUtility]);

  // Handle outside clicks to dismiss menu
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeUtility) {
          setActiveUtility(null);
          triggerRef.current?.focus();
        } else if (isOpen) {
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeUtility]);

  // Asha Voice / Programmatic Bridge Listeners
  useEffect(() => {
    const handleOpenUtility = () => {
      setActiveUtility(null);
      setIsOpen(true);
    };

    const handleOpenNotes = () => {
      setIsOpen(false);
      setActiveUtility('notes');
    };

    const handleOpenCalendar = () => {
      setIsOpen(false);
      setActiveUtility('calendar');
    };

    const handleCloseUtility = () => {
      setIsOpen(false);
      setActiveUtility(null);
    };

    window.addEventListener('saksham:open-utility', handleOpenUtility);
    window.addEventListener('saksham:open-notes', handleOpenNotes);
    window.addEventListener('saksham:open-calendar', handleOpenCalendar);
    window.addEventListener('saksham:close-utility', handleCloseUtility);

    return () => {
      window.removeEventListener('saksham:open-utility', handleOpenUtility);
      window.removeEventListener('saksham:open-notes', handleOpenNotes);
      window.removeEventListener('saksham:open-calendar', handleOpenCalendar);
      window.removeEventListener('saksham:close-utility', handleCloseUtility);
    };
  }, []);

  const handleOpenNotes = () => {
    setIsOpen(false);
    setActiveUtility('notes');
  };

  const handleOpenCalendar = () => {
    setIsOpen(false);
    setActiveUtility('calendar');
  };

  const handleCloseModal = () => {
    setActiveUtility(null);
    triggerRef.current?.focus();
  };

  return (
    <>
      {/* --- Floating Trigger Button --- */}
      <div
        className={`fixed z-40 ${
          isRTL
            ? 'left-4 sm:left-6 md:left-8'
            : 'right-4 sm:right-6 md:right-8'
        } bottom-20 sm:bottom-24 md:bottom-24 select-none`}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={isOpen ? t('utility.close') : t('utility.title')}
          className={`flex items-center justify-center w-14 h-14 rounded-full transition-all duration-200 cursor-pointer shadow-lg active:scale-95 focus:outline-none focus:ring-4 ${
            highContrast
              ? 'bg-purple-950 text-yellow-300 border-2 border-yellow-300 focus:ring-yellow-400'
              : 'bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 text-white shadow-purple-400/40 hover:shadow-xl hover:scale-105 focus:ring-purple-300'
          }`}
          data-testid="floating-utility-button"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform rotate-0 scale-100" />
          ) : (
            <Layers className="w-6 h-6 transition-transform hover:rotate-12" />
          )}
        </button>
      </div>

      {/* --- Utility Quick Menu Popover --- */}
      {isOpen && (
        <div
          ref={menuRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('utility.title')}
          className={`fixed z-50 w-80 max-w-[calc(100vw-2rem)] rounded-3xl p-4 transition-all duration-200 animate-in fade-in zoom-in-95 ${
            isRTL
              ? 'left-4 sm:left-6 md:left-8'
              : 'right-4 sm:right-6 md:right-8'
          } bottom-36 sm:bottom-40 md:bottom-40 ${
            highContrast
              ? 'bg-black text-white border-2 border-yellow-300 shadow-2xl'
              : 'bg-white/95 backdrop-blur-md text-gray-900 border border-purple-100 shadow-2xl shadow-purple-900/10'
          }`}
          data-testid="floating-utility-menu"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-purple-50">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-purple-100 text-purple-700">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-purple-950">
                {t('utility.title')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={t('utility.close')}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Utility Options List */}
          <div className="space-y-2">
            {/* 1. Notes Item */}
            <button
              ref={firstMenuItemRef}
              type="button"
              onClick={handleOpenNotes}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all duration-150 min-h-[56px] cursor-pointer group focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                highContrast
                  ? 'bg-gray-900 hover:bg-gray-800 text-white border border-gray-700'
                  : 'bg-purple-50/60 hover:bg-purple-100/70 text-gray-800'
              }`}
              data-testid="utility-item-notes"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    highContrast
                      ? 'bg-yellow-400 text-black'
                      : 'bg-purple-200/70 text-purple-800 group-hover:scale-105 transition-transform'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-purple-950 flex items-center gap-2">
                    {t('notes.title')}
                    {notesCount > 0 && (
                      <span className="text-[11px] font-medium bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
                        {notesCount}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 line-clamp-1 max-w-[170px]">
                    {t('utility.desc_notes')}
                  </div>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-gray-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all ${
                  isRTL ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* 2. Calendar Item */}
            <button
              type="button"
              onClick={handleOpenCalendar}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all duration-150 min-h-[56px] cursor-pointer group focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                highContrast
                  ? 'bg-gray-900 hover:bg-gray-800 text-white border border-gray-700'
                  : 'bg-indigo-50/60 hover:bg-indigo-100/70 text-gray-800'
              }`}
              data-testid="utility-item-calendar"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    highContrast
                      ? 'bg-yellow-400 text-black'
                      : 'bg-indigo-200/70 text-indigo-800 group-hover:scale-105 transition-transform'
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-purple-950 flex items-center gap-2">
                    {t('calendar.title')}
                    {eventsCount > 0 && (
                      <span className="text-[11px] font-medium bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">
                        {eventsCount}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 line-clamp-1 max-w-[170px]">
                    {t('utility.desc_calendar')}
                  </div>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-gray-400 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all ${
                  isRTL ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* --- Stage 6.3 Entry Shell Modals --- */}
      {activeUtility && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            activeUtility === 'notes' ? t('notes.title') : t('calendar.title')
          }
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/30 backdrop-blur-sm animate-in fade-in"
          data-testid={`utility-shell-${activeUtility}`}
        >
          <div
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl transition-all ${
              highContrast
                ? 'bg-black text-white border-2 border-yellow-300'
                : 'bg-white text-gray-900 border border-purple-100'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-purple-100 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-2xl ${
                    activeUtility === 'notes'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {activeUtility === 'notes' ? (
                    <FileText className="w-6 h-6" />
                  ) : (
                    <Calendar className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-purple-950">
                    {activeUtility === 'notes'
                      ? t('notes.title')
                      : t('calendar.title')}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {activeUtility === 'notes'
                      ? t('notes.subtitle')
                      : t('calendar.subtitle')}
                  </p>
                </div>
              </div>
              <button
                ref={modalCloseBtnRef}
                type="button"
                onClick={handleCloseModal}
                aria-label={t('common.close')}
                className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
                data-testid="utility-modal-close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stage 6.3 Reassurance Banner */}
            <div className="p-3.5 mb-4 rounded-2xl bg-lavender-50 border border-purple-200/60 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-purple-950">
                  {t('utility.coming_soon')}
                </div>
                <div className="text-[11px] text-purple-800 leading-relaxed mt-0.5">
                  {t('utility.stage63_notice')}
                </div>
              </div>
            </div>

            {/* Active Data Layer Proof (Milestone 6.1 verified integration) */}
            <div className="mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-900 mb-2 flex items-center justify-between">
                <span>
                  {activeUtility === 'notes'
                    ? t('utility.badge_notes', { count: notesCount })
                    : t('utility.badge_events', { count: eventsCount })}
                </span>
                <span className="text-[11px] font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                  {activeUtility === 'notes'
                    ? `${notesCount} saved`
                    : `${eventsCount} scheduled`}
                </span>
              </div>

              {activeUtility === 'notes' ? (
                recentNotes.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {recentNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {note.isPinned && (
                            <Pin className="w-3.5 h-3.5 text-purple-700" />
                          )}
                          <span className="font-semibold text-purple-950 truncate max-w-[200px]">
                            {note.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500 uppercase">
                          {note.category}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 p-4 text-center bg-gray-50 rounded-2xl border border-gray-100">
                    {t('notes.empty')}
                  </div>
                )
              ) : upcomingEvents.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {upcomingEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="w-3.5 h-3.5 text-indigo-700" />
                        <span className="font-semibold text-purple-950 truncate max-w-[180px]">
                          {evt.title}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(new Date(evt.startAt))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-500 p-4 text-center bg-gray-50 rounded-2xl border border-gray-100">
                  {t('calendar.empty')}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-purple-50 flex justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white transition-colors cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
