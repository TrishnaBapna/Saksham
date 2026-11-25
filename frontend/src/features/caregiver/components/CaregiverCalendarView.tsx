import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Edit2,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  CalendarEvent,
  CalendarCategory,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  CaregiverCalendarPermissions,
} from '../../calendar/types/calendar.types.js';
import { CalendarService } from '../../calendar/services/calendarService.js';
import { CaregiverAppointmentModal } from './CaregiverAppointmentModal.js';
import { useLanguage } from '../../../context/LanguageContext.js';

interface CaregiverCalendarViewProps {
  patientId: string;
  patientName: string;
  permissions: CaregiverCalendarPermissions;
  caregiverId: string;
}

type CalendarViewMode = 'day' | 'week' | 'agenda';

export const CaregiverCalendarView: React.FC<CaregiverCalendarViewProps> = ({
  patientId,
  patientName,
  permissions,
  caregiverId,
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<CalendarViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canRead = permissions.canReadCalendar;
  const canCreate = permissions.canCreateCalendarEvents;
  const canEdit = permissions.canEditCalendarEvents;
  const canDelete = permissions.canDeleteCalendarEvents;

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Format YYYY-MM-DD
  const selectedDateStr = useMemo(() => {
    return CalendarService.toDateString(selectedDate);
  }, [selectedDate]);

  // Fetch / Sync events
  const loadEvents = useCallback(async () => {
    if (!canRead) {
      if (isMountedRef.current) {
        setEvents([]);
        setIsLoading(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setIsSyncing(true);
    }
    try {
      const fetched = await CalendarService.syncEventsFromFirestore(patientId, {
        isCaregiver: true,
        caregiverPermissions: permissions,
      });
      if (isMountedRef.current) {
        // Defense-in-depth: caregiver view strictly filters out private events
        const safeFiltered = CalendarService.filterEventsForViewer(fetched, true);
        setEvents(safeFiltered);
      }
    } catch (err) {
      console.warn('[CaregiverCalendarView] Failed to load calendar events:', err);
      if (isMountedRef.current) {
        const cached = CalendarService.getEvents(patientId);
        setEvents(CalendarService.filterEventsForViewer(cached, true));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsSyncing(false);
      }
    }
  }, [patientId, canRead, permissions]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Date Navigation
  const handlePrev = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'day') {
      next.setDate(next.getDate() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    setSelectedDate(next);
  };

  const handleNext = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'day') {
      next.setDate(next.getDate() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Save (Create or Update)
  const handleSaveAppointment = async (
    input: CreateCalendarEventInput | UpdateCalendarEventInput,
    eventId?: string
  ) => {
    setActionError(null);
    try {
      if (eventId) {
        if (!canEdit) throw new Error('Permission denied: cannot edit calendar events.');
        await CalendarService.updateEvent(patientId, eventId, input, { isCaregiver: true });
      } else {
        if (!canCreate) throw new Error('Permission denied: cannot create calendar events.');
        await CalendarService.createEvent(
          patientId,
          input as CreateCalendarEventInput,
          caregiverId,
          { isCaregiver: true }
        );
      }
      await loadEvents();
    } catch (err: any) {
      setActionError(err.message || 'Operation failed');
      throw err;
    }
  };

  // Delete
  const handleDeleteAppointment = async (eventId: string) => {
    if (!canDelete) {
      setActionError('Permission denied: cannot delete calendar events.');
      return;
    }

    try {
      await CalendarService.deleteEvent(patientId, eventId, { isCaregiver: true });
      setDeletingEventId(null);
      await loadEvents();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete event');
    }
  };

  // Category Badges & Styles
  const getCategoryBadge = (category: CalendarCategory) => {
    switch (category) {
      case 'doctor':
        return {
          label: 'Doctor Visit',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-500',
        };
      case 'family':
        return {
          label: 'Family & Social',
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          dot: 'bg-purple-500',
        };
      case 'medication':
        return {
          label: 'Medication Review',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'personal':
        return {
          label: 'Personal Care',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
        };
      default:
        return {
          label: 'Appointment',
          bg: 'bg-gray-100 text-gray-800 border-gray-200',
          dot: 'bg-gray-500',
        };
    }
  };

  // Helper: Format Time string from ISO
  const formatTimeRange = (startAt: string, endAt?: string) => {
    const start = new Date(startAt);
    const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!endAt) return startStr;
    const end = new Date(endAt);
    const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${startStr} – ${endStr}`;
  };

  // Day View Events
  const dayEvents = useMemo(() => {
    return events.filter((e) => {
      const eDate = CalendarService.extractDateString(e.startAt);
      if (eDate === selectedDateStr) return true;
      if (e.recurrence && e.recurrence.frequency !== 'none') {
        return CalendarService.doesRecurOnDate(eDate, selectedDateStr, e.recurrence);
      }
      return false;
    });
  }, [events, selectedDateStr]);

  // Week View Calculations
  const weekDays = useMemo(() => {
    const curr = new Date(selectedDate);
    const firstDay = new Date(curr);
    firstDay.setDate(curr.getDate() - curr.getDay()); // Sunday

    const days: { date: Date; dateStr: string; isToday: boolean }[] = [];
    const todayStr = CalendarService.toDateString(new Date());

    for (let i = 0; i < 7; i++) {
      const d = new Date(firstDay);
      d.setDate(firstDay.getDate() + i);
      const str = CalendarService.toDateString(d);
      days.push({
        date: d,
        dateStr: str,
        isToday: str === todayStr,
      });
    }
    return days;
  }, [selectedDate]);

  // Agenda Filtered Events
  const agendaEvents = useMemo(() => {
    let filtered = [...events];
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((e) => e.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.locationLabel && e.locationLabel.toLowerCase().includes(q))
      );
    }
    return filtered.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [events, categoryFilter, searchQuery]);

  // If caregiver lacks read permission, display polite denial banner
  if (!canRead) {
    return (
      <section
        data-testid="caregiver-calendar-section"
        className="bg-white rounded-3xl p-6 border border-amber-200 shadow-soft-purple"
      >
        <div className="flex items-center space-x-3 text-amber-800">
          <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <h3 className="font-bold text-base">{t('caregiver.cal_restricted_title')}</h3>
            <p className="text-xs text-amber-700 mt-1">
              {t('caregiver.cal_restricted_desc', { name: patientName })}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="caregiver-calendar-section"
      className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft-purple space-y-5"
    >
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-saksham-darkText">
              {t('caregiver.cal_title')}
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('caregiver.cal_subtitle', { name: patientName })}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Sync status */}
          <div className="flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            {isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{t('caregiver.cal_syncing')}</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('caregiver.cal_cloud_live')}</span>
              </>
            )}
          </div>

          {/* New Appointment Button */}
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setEditingEvent(null);
                setIsModalOpen(true);
              }}
              data-testid="caregiver-new-appointment-btn"
              className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors focus:ring-2 focus:ring-emerald-500"
            >
              <Plus className="w-4 h-4" />
              <span>{t('caregiver.cal_new_appt')}</span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Navigation & View Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Date Navigator */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous period"
            className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next period"
            className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-sm font-bold text-gray-800 ml-1">
            {viewMode === 'day' &&
              selectedDate.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            {viewMode === 'week' &&
              `${weekDays[0].date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })} – ${weekDays[6].date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}`}
            {viewMode === 'agenda' && 'All Upcoming Appointments'}
          </span>
        </div>

        {/* View Mode Switcher */}
        <div
          role="tablist"
          aria-label="Calendar View Modes"
          className="inline-flex bg-gray-100 p-1 rounded-xl self-start sm:self-auto"
        >
          {(['day', 'week', 'agenda'] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              role="tab"
              aria-selected={viewMode === mode}
              onClick={() => setViewMode(mode)}
              data-testid={`calendar-view-tab-${mode}`}
              className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${
                viewMode === mode
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW: DAY */}
      {viewMode === 'day' && (
        <div data-testid="caregiver-calendar-day-view" className="space-y-3">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-gray-500">Loading appointments...</div>
          ) : dayEvents.length === 0 ? (
            <div className="py-10 text-center rounded-2xl bg-gray-50/70 border border-gray-200">
              <CalendarIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">
                No appointments scheduled for this day
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Use "+ New Appointment" to coordinate a doctor visit or therapy session.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dayEvents.map((evt) => {
                const badge = getCategoryBadge(evt.category);
                return (
                  <div
                    key={evt.id}
                    data-testid={`caregiver-event-card-${evt.id}`}
                    className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-emerald-300 transition-colors shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-2xs font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-2xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-100 flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Care Team Shared</span>
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-gray-900">{evt.title}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{formatTimeRange(evt.startAt, evt.endAt)}</span>
                        </span>
                        {evt.locationLabel && (
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span>{evt.locationLabel}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 shrink-0">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEvent(evt);
                            setIsModalOpen(true);
                          }}
                          aria-label={`Edit ${evt.title}`}
                          className="p-2 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 border border-gray-200 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeletingEventId(evt.id)}
                          aria-label={`Delete ${evt.title}`}
                          className="p-2 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50 border border-gray-200 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: WEEK */}
      {viewMode === 'week' && (
        <div
          data-testid="caregiver-calendar-week-view"
          className="grid grid-cols-1 sm:grid-cols-7 gap-2"
        >
          {weekDays.map((wd) => {
            const dayEventsForCol = events.filter((e) => {
              const eDate = CalendarService.extractDateString(e.startAt);
              if (eDate === wd.dateStr) return true;
              if (e.recurrence && e.recurrence.frequency !== 'none') {
                return CalendarService.doesRecurOnDate(eDate, wd.dateStr, e.recurrence);
              }
              return false;
            });

            return (
              <div
                key={wd.dateStr}
                onClick={() => {
                  setSelectedDate(wd.date);
                  setViewMode('day');
                }}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer min-h-[120px] flex flex-col justify-between ${
                  wd.isToday
                    ? 'border-emerald-400 bg-emerald-50/40 shadow-xs'
                    : 'border-gray-200 bg-gray-50/50 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-2xs font-bold uppercase text-gray-400">
                      {wd.date.toLocaleDateString(undefined, { weekday: 'narrow' })}
                    </span>
                    <span
                      className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                        wd.isToday
                          ? 'bg-emerald-600 text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {wd.date.getDate()}
                    </span>
                  </div>

                  {/* Micro Event Chips */}
                  <div className="space-y-1">
                    {dayEventsForCol.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className="text-2xs p-1 rounded-md bg-white border border-gray-200 truncate font-medium text-gray-800"
                        title={e.title}
                      >
                        {e.title}
                      </div>
                    ))}
                    {dayEventsForCol.length > 3 && (
                      <span className="text-3xs text-gray-400 font-semibold block text-center">
                        +{dayEventsForCol.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {dayEventsForCol.length === 0 && (
                  <span className="text-3xs text-gray-400 italic">No events</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: AGENDA */}
      {viewMode === 'agenda' && (
        <div data-testid="caregiver-calendar-agenda-view" className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search appointments by title or clinic..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="all">All Categories</option>
              <option value="doctor">Doctor Visits</option>
              <option value="family">Family & Social</option>
              <option value="medication">Medication Reviews</option>
              <option value="personal">Personal Care</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Agenda List */}
          {agendaEvents.length === 0 ? (
            <div className="py-10 text-center rounded-2xl bg-gray-50/70 border border-gray-200">
              <CalendarIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">No appointments found</p>
              <p className="text-xs text-gray-500 mt-1">
                Try clearing your search query or schedule a new appointment.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {agendaEvents.map((evt) => {
                const badge = getCategoryBadge(evt.category);
                const evtDate = new Date(evt.startAt);
                return (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-2xl bg-white border border-gray-200 hover:border-emerald-300 transition-colors shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex flex-col items-center justify-center shrink-0">
                        <span className="text-2xs font-bold uppercase">
                          {evtDate.toLocaleDateString(undefined, { month: 'short' })}
                        </span>
                        <span className="text-sm font-black leading-tight">
                          {evtDate.getDate()}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-2xs font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900">{evt.title}</h4>
                        <div className="flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>{formatTimeRange(evt.startAt, evt.endAt)}</span>
                          </span>
                          {evt.locationLabel && (
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span>{evt.locationLabel}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 self-end sm:self-center">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEvent(evt);
                            setIsModalOpen(true);
                          }}
                          aria-label={`Edit ${evt.title}`}
                          className="p-2 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 border border-gray-200 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeletingEventId(evt.id)}
                          aria-label={`Delete ${evt.title}`}
                          className="p-2 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50 border border-gray-200 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingEventId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 border border-red-100 shadow-2xl">
            <h3 className="font-bold text-base text-gray-900">Delete Appointment</h3>
            <p className="text-xs text-gray-600">
              Are you sure you want to delete this appointment from the care calendar?
              This action will remove it for both you and {patientName}.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEventId(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAppointment(deletingEventId)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      <CaregiverAppointmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveAppointment}
        initialEvent={editingEvent}
        patientName={patientName}
      />
    </section>
  );
};
