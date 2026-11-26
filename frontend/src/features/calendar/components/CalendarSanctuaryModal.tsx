import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../../../context/LanguageContext.js';
import { useAccessibility } from '../../../context/AccessibilityContext.js';
import { useAuthSafe } from '../../../context/AuthContext.js';
import { getEffectivePatientId } from '../../auth/services/identityService.js';
import { CalendarService } from '../services/calendarService.js';
import {
  CalendarEvent,
  CalendarCategory,
  CalendarRecurrenceRule,
} from '../types/calendar.types.js';
import { RoutineService } from '../../routines/services/routineService.js';
import { RoutineItem } from '../../../types/index.js';
import { getCalendarUi } from '../../notes/utils/notesCalendarTranslation.js';
import { getTranslatedRoutineTitle, getTranslatedScheduleTime } from '../../routines/utils/routineTranslation.js';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Repeat,
  Lock,
  Edit3,
  Trash2,
  X,
  AlertCircle,
  Link,
  CalendarCheck,
  Sparkles,
} from 'lucide-react';

interface CalendarSanctuaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CalendarViewMode = 'day' | 'week' | 'month';

export const CalendarSanctuaryModal: React.FC<CalendarSanctuaryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t, language, formatDate } = useLanguage();
  const calUi = getCalendarUi(language);
  const { highContrast } = useAccessibility();
  const auth = useAuthSafe();
  const patientId = getEffectivePatientId(auth?.currentUser);

  // View state
  const [viewMode, setViewMode] = useState<CalendarViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);

  // Editor modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<CalendarCategory>('personal');
  const [formDate, setFormDate] = useState(CalendarService.toDateString(new Date()));
  const [formIsAllDay, setFormIsAllDay] = useState(false);
  const [formStartTime, setFormStartTime] = useState('10:00');
  const [formEndTime, setFormEndTime] = useState('11:00');
  const [formRecurrenceFreq, setFormRecurrenceFreq] = useState<'none' | 'daily' | 'weekly'>('none');
  const [formIsPrivate, setFormIsPrivate] = useState(false);
  const [formLinkedRoutineId, setFormLinkedRoutineId] = useState('');
  const [formLocationLabel, setFormLocationLabel] = useState('');
  const [formReminderMinutes, setFormReminderMinutes] = useState<number>(15);
  const [formError, setFormError] = useState<string | null>(null);

  // Deletion confirmation state
  const [deletingEvent, setDeletingEvent] = useState<CalendarEvent | null>(null);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const selectedDateStr = useMemo(() => CalendarService.toDateString(selectedDate), [selectedDate]);

  const loadData = () => {
    try {
      const events = CalendarService.getEvents(patientId);
      setAllEvents(events);
      const patientRoutines = RoutineService.getRoutines(patientId);
      setRoutines(patientRoutines);
    } catch (err) {
      console.warn('[CalendarSanctuaryModal] Error loading data:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    } else {
      setIsEditing(false);
      setEditingEvent(null);
      setDeletingEvent(null);
    }
  }, [isOpen, patientId]);

  // Day View Events (Evaluates single + virtual recurring instances)
  const dayEvents = useMemo(() => {
    return CalendarService.getEventsForDate(patientId, selectedDateStr);
  }, [patientId, selectedDateStr, allEvents]);

  // Upcoming 7-day events for schedule continuity
  const upcomingEvents = useMemo(() => {
    return CalendarService.getUpcomingEvents(patientId, 7);
  }, [patientId, allEvents]);

  // Upcoming events strictly from future dates (excluding events already in active day)
  const otherUpcomingEvents = useMemo(() => {
    const dayIds = new Set(dayEvents.map((e) => e.id));
    return upcomingEvents.filter((e) => !dayIds.has(e.id));
  }, [dayEvents, upcomingEvents]);

  // Week View Calculations: get 7 days surrounding or starting with selected week
  const weekDays = useMemo(() => {
    const d = new Date(selectedDate);
    const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon ...
    // Start week on Monday
    const diff = d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const startOfWeek = new Date(d.setDate(diff));

    const days: { date: Date; dateStr: string; events: CalendarEvent[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(startOfWeek);
      current.setDate(startOfWeek.getDate() + i);
      const dStr = CalendarService.toDateString(current);
      days.push({
        date: current,
        dateStr: dStr,
        events: CalendarService.getEventsForDate(patientId, dStr),
      });
    }
    return days;
  }, [selectedDate, patientId, allEvents]);

  // Month View Calculations
  const monthDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday as 0
    const totalDays = lastDay.getDate();

    const days: { dayNumber: number; dateStr: string; count: number; isCurrentMonth: boolean }[] = [];

    // Prefix empty slots
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ dayNumber: 0, dateStr: '', count: 0, isCurrentMonth: false });
    }

    // Days in current month
    for (let day = 1; day <= totalDays; day++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dStr = `${year}-${monthStr}-${dayStr}`;
      const evts = CalendarService.getEventsForDate(patientId, dStr);
      days.push({
        dayNumber: day,
        dateStr: dStr,
        count: evts.length,
        isCurrentMonth: true,
      });
    }

    return days;
  }, [selectedDate, patientId, allEvents]);

  // Navigation handlers
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

  // Open Create Event Form
  const handleOpenCreate = () => {
    setEditingEvent(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('personal');
    setFormDate(selectedDateStr);
    setFormIsAllDay(false);
    setFormStartTime('10:00');
    setFormEndTime('11:00');
    setFormRecurrenceFreq('none');
    setFormIsPrivate(false);
    setFormLinkedRoutineId('');
    setFormLocationLabel('');
    setFormReminderMinutes(15);
    setFormError(null);
    setIsEditing(true);
  };

  // Open Edit Event Form
  const handleOpenEdit = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setFormTitle(evt.title);
    setFormDescription(evt.description || '');
    setFormCategory(evt.category);
    setFormDate(CalendarService.extractDateString(evt.startAt));
    setFormIsAllDay(evt.isAllDay);

    const sTime = evt.startAt.includes('T') ? evt.startAt.split('T')[1].substring(0, 5) : '10:00';
    setFormStartTime(sTime);

    const eTime = evt.endAt && evt.endAt.includes('T') ? evt.endAt.split('T')[1].substring(0, 5) : '11:00';
    setFormEndTime(eTime);

    setFormRecurrenceFreq(evt.recurrence?.frequency || 'none');
    setFormIsPrivate(Boolean(evt.isPrivate));
    setFormLinkedRoutineId(evt.linkedRoutineId || '');
    setFormLocationLabel(evt.locationLabel || '');
    setFormReminderMinutes(evt.reminderMinutesBefore ?? 15);
    setFormError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingEvent(null);
    setFormError(null);
  };

  // Save Event (Create or Update)
  const handleSaveEvent = async () => {
    setFormError(null);
    const cleanTitle = formTitle.trim();
    if (!cleanTitle) {
      setFormError(calUi.emptyTitleError);
      return;
    }

    try {
      const startAtIso = formIsAllDay
        ? `${formDate}T00:00:00.000Z`
        : `${formDate}T${formStartTime}:00.000Z`;

      const endAtIso = formIsAllDay
        ? `${formDate}T23:59:59.000Z`
        : `${formDate}T${formEndTime}:00.000Z`;

      let recurrenceRule: CalendarRecurrenceRule | undefined = undefined;
      if (formRecurrenceFreq !== 'none') {
        recurrenceRule = {
          frequency: formRecurrenceFreq,
          interval: 1,
        };
      }

      if (editingEvent) {
        await CalendarService.updateEvent(patientId, editingEvent.id, {
          title: cleanTitle,
          description: formDescription.trim() || undefined,
          category: formCategory,
          startAt: startAtIso,
          endAt: endAtIso,
          isAllDay: formIsAllDay,
          recurrence: recurrenceRule,
          isPrivate: formIsPrivate,
          linkedRoutineId: formLinkedRoutineId || undefined,
          locationLabel: formLocationLabel.trim() || undefined,
          reminderMinutesBefore: formReminderMinutes,
        });
      } else {
        await CalendarService.createEvent(patientId, {
          title: cleanTitle,
          description: formDescription.trim() || undefined,
          category: formCategory,
          startAt: startAtIso,
          endAt: endAtIso,
          isAllDay: formIsAllDay,
          recurrence: recurrenceRule,
          isPrivate: formIsPrivate,
          linkedRoutineId: formLinkedRoutineId || undefined,
          locationLabel: formLocationLabel.trim() || undefined,
          reminderMinutesBefore: formReminderMinutes,
        });
      }

      loadData();
      setIsEditing(false);
      setEditingEvent(null);
    } catch (err: any) {
      setFormError(err.message || calUi.saveFailedError);
    }
  };

  // Delete Event Confirm
  const handleConfirmDelete = async () => {
    if (!deletingEvent) return;
    try {
      await CalendarService.deleteEvent(patientId, deletingEvent.id);
      setDeletingEvent(null);
      loadData();
    } catch (err) {
      console.warn('[CalendarSanctuaryModal] Delete error:', err);
    }
  };

  // Formatted header period text
  const periodLabel = useMemo(() => {
    if (viewMode === 'day') {
      return formatDate(selectedDate);
    } else if (viewMode === 'week') {
      const first = weekDays[0]?.date || selectedDate;
      const last = weekDays[6]?.date || selectedDate;
      return `${first.getDate()} ${first.toLocaleString(language, { month: 'short' })} – ${last.getDate()} ${last.toLocaleString(language, { month: 'short', year: 'numeric' })}`;
    } else {
      return selectedDate.toLocaleString(language, { month: 'long', year: 'numeric' });
    }
  }, [viewMode, selectedDate, weekDays, language, formatDate]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('calendar.title')}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-purple-950/40 backdrop-blur-sm animate-in fade-in"
      data-testid="utility-shell-calendar"
    >
      <div
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl transition-all overflow-hidden ${
          highContrast
            ? 'bg-black text-white border-2 border-yellow-300'
            : 'bg-white text-gray-900 border border-purple-100'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-indigo-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-800">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-purple-950 flex items-center gap-2">
                {t('calendar.title')}
                <span className="text-xs font-normal text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                  {allEvents.length}
                </span>
              </h2>
              <p className="text-xs text-gray-500">{t('calendar.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-transform active:scale-95 ${
                  highContrast
                    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                    : 'bg-indigo-700 hover:bg-indigo-800 text-white'
                }`}
                data-testid="calendar-new-btn"
              >
                <Plus className="w-4 h-4" />
                <span>{t('calendar.new_event')}</span>
              </button>
            )}
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
              data-testid="utility-modal-close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Milestone 6.3 Reassurance Notice */}
          <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/60 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
            <div className="text-[11px] text-indigo-900 leading-relaxed">
              {t('utility.stage63_notice')}
            </div>
          </div>
          {/* Event Editor View */}
          {isEditing ? (
            <div className="space-y-4 animate-in fade-in" data-testid="calendar-editor">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-50">
                <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-700" />
                  {editingEvent ? t('calendar.edit_event') : t('calendar.new_event')}
                </h3>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-purple-950 mb-1">
                  {calUi.titleLabel} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t('calendar.title_placeholder')}
                  maxLength={120}
                  className={`w-full p-3 rounded-xl text-sm border focus:outline-none focus:ring-2 ${
                    highContrast
                      ? 'bg-black text-white border-yellow-300 focus:ring-yellow-400'
                      : 'bg-indigo-50/40 border-indigo-200 text-gray-900 focus:ring-indigo-400'
                  }`}
                  data-testid="calendar-title-input"
                />
              </div>

              {/* Category Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['personal', 'doctor', 'family', 'medication', 'other'] as CalendarCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormCategory(cat)}
                    className={`p-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      formCategory === cat
                        ? highContrast
                          ? 'bg-yellow-400 text-black border-yellow-300'
                          : 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-indigo-50'
                    }`}
                  >
                    {t(`calendar.category_${cat}` as any)}
                  </button>
                ))}
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    {t('calendar.date_label')}
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs border border-indigo-200 bg-indigo-50/30 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    data-testid="calendar-date-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    {t('calendar.time_label')}
                  </label>
                  <input
                    type="time"
                    disabled={formIsAllDay}
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs border border-indigo-200 bg-indigo-50/30 text-gray-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    {t('calendar.end_time_label')}
                  </label>
                  <input
                    type="time"
                    disabled={formIsAllDay}
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs border border-indigo-200 bg-indigo-50/30 text-gray-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>

              {/* All Day Checkbox */}
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsAllDay}
                  onChange={(e) => setFormIsAllDay(e.target.checked)}
                  className="w-4 h-4 text-indigo-700 rounded focus:ring-indigo-400"
                />
                <span>{calUi.allDayEvent}</span>
              </label>

              {/* Recurrence Rule Selector */}
              <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                <label className="block text-xs font-semibold text-purple-950 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-indigo-700" />
                  <span>{t('calendar.recurrence_label')}</span>
                </label>
                <div className="flex items-center gap-2">
                  {(['none', 'daily', 'weekly'] as const).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setFormRecurrenceFreq(freq)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                        formRecurrenceFreq === freq
                          ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-indigo-50'
                      }`}
                      data-testid={`calendar-recur-${freq}`}
                    >
                      {freq === 'none' && t('calendar.recurrence_none')}
                      {freq === 'daily' && t('calendar.recurrence_daily')}
                      {freq === 'weekly' && t('calendar.recurrence_weekly')}
                    </button>
                  ))}
                </div>

                {/* Series-Level Recurrence Notice */}
                {formRecurrenceFreq !== 'none' && (
                  <div className="mt-2 text-[11px] text-indigo-900 bg-white/80 p-2.5 rounded-xl border border-indigo-200 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-700 shrink-0 mt-0.5" />
                    <span>{t('calendar.recurrence_notice')}</span>
                  </div>
                )}
              </div>

              {/* Private Event Toggle (Hidden from Caregiver) */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-purple-50/50 border border-purple-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsPrivate}
                  onChange={(e) => setFormIsPrivate(e.target.checked)}
                  className="w-4 h-4 text-purple-700 rounded focus:ring-purple-400 cursor-pointer"
                  data-testid="calendar-private-checkbox"
                />
                <span className="text-xs font-medium text-purple-950 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-700" />
                  {t('calendar.private_toggle')}
                </span>
              </label>

              {/* Routine Link Dropdown */}
              {routines.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1 flex items-center gap-1.5">
                    <Link className="w-3.5 h-3.5 text-indigo-700" />
                    <span>{t('calendar.routine_link')}</span>
                  </label>
                  <select
                    value={formLinkedRoutineId}
                    onChange={(e) => setFormLinkedRoutineId(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs border border-indigo-200 bg-indigo-50/30 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">{t('calendar.no_routine_link')}</option>
                    {routines.map((r) => (
                      <option key={r.id} value={r.id}>
                        {getTranslatedScheduleTime(r.scheduledTime, language)} — {getTranslatedRoutineTitle(r, t, language)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Location Label (Plain text only) */}
              <div>
                <label className="block text-xs font-semibold text-purple-950 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-700" />
                  <span>{t('calendar.location_label')}</span>
                </label>
                <input
                  type="text"
                  value={formLocationLabel}
                  onChange={(e) => setFormLocationLabel(e.target.value)}
                  placeholder={calUi.locationPlaceholder}
                  maxLength={120}
                  className="w-full p-2.5 rounded-xl text-xs border border-indigo-200 bg-indigo-50/30 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Description Textarea */}
              <div>
                <label className="block text-xs font-semibold text-purple-950 mb-1">
                  {calUi.descLabel}
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={t('calendar.desc_placeholder')}
                  rows={3}
                  maxLength={1000}
                  className={`w-full p-3 rounded-xl text-sm border focus:outline-none focus:ring-2 resize-none ${
                    highContrast
                      ? 'bg-black text-white border-yellow-300 focus:ring-yellow-400'
                      : 'bg-indigo-50/40 border-indigo-200 text-gray-900 focus:ring-indigo-400'
                  }`}
                  data-testid="calendar-desc-input"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-indigo-100">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveEvent}
                  className={`py-2.5 px-5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                    highContrast
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                      : 'bg-indigo-700 hover:bg-indigo-800 text-white'
                  }`}
                  data-testid="calendar-save-btn"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Navigation Header & View Switcher */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                {/* Period & Controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label={t('calendar.prev')}
                    className="p-1.5 rounded-lg bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-xs cursor-pointer"
                    data-testid="calendar-prev-btn"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToday}
                    className="py-1 px-2.5 rounded-lg text-xs font-bold bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-xs cursor-pointer"
                    data-testid="calendar-today-btn"
                  >
                    {t('calendar.today_btn')}
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label={t('calendar.next')}
                    className="p-1.5 rounded-lg bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-xs cursor-pointer"
                    data-testid="calendar-next-btn"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <span className="text-xs sm:text-sm font-bold text-purple-950 ml-1">
                    {periodLabel}
                  </span>
                </div>

                {/* View Switcher Tabs */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-indigo-100 text-xs">
                  {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className={`py-1 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                        viewMode === mode
                          ? 'bg-indigo-700 text-white shadow-xs'
                          : 'text-gray-600 hover:text-indigo-900 hover:bg-indigo-50'
                      }`}
                      data-testid={`calendar-view-tab-${mode}`}
                    >
                      {mode === 'day' && t('calendar.view_day')}
                      {mode === 'week' && t('calendar.view_week')}
                      {mode === 'month' && t('calendar.view_month')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day View */}
              {viewMode === 'day' && (
                <div className="space-y-3" data-testid="calendar-day-view">
                  {dayEvents.length === 0 ? (
                    <div className="p-8 text-center bg-indigo-50/30 rounded-3xl border border-indigo-100">
                      <CalendarCheck className="w-10 h-10 text-indigo-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-purple-950">
                        {t('calendar.no_events_today')}
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="mt-3 py-2 px-4 rounded-xl text-xs font-semibold bg-indigo-700 text-white hover:bg-indigo-800 cursor-pointer shadow-sm"
                      >
                        {t('calendar.new_event')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {dayEvents.map((evt) => (
                        <EventCard
                          key={evt.id}
                          event={evt}
                          t={t}
                          calUi={calUi}
                          highContrast={highContrast}
                          onEdit={() => handleOpenEdit(evt)}
                          onDelete={() => setDeletingEvent(evt)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Upcoming Schedule Continuity (Next 7 Days) */}
                  {otherUpcomingEvents.length > 0 && (
                    <div className="pt-3 border-t border-indigo-100">
                      <div className="text-xs font-bold uppercase tracking-wider text-purple-900 mb-2 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-700" />
                        <span>{t('calendar.upcoming')}</span>
                      </div>
                      <div className="space-y-2">
                        {otherUpcomingEvents.map((evt) => (
                          <EventCard
                            key={`upcoming-${evt.id}`}
                            event={evt}
                            t={t}
                            calUi={calUi}
                            highContrast={highContrast}
                            onEdit={() => handleOpenEdit(evt)}
                            onDelete={() => setDeletingEvent(evt)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Week View */}
              {viewMode === 'week' && (
                <div className="space-y-3" data-testid="calendar-week-view">
                  <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                    {weekDays.map((dayItem) => {
                      const isSelected = dayItem.dateStr === selectedDateStr;
                      const isToday = dayItem.dateStr === CalendarService.toDateString(new Date());

                      return (
                        <div
                          key={dayItem.dateStr}
                          onClick={() => setSelectedDate(dayItem.date)}
                          className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-100/80 border-indigo-400 ring-2 ring-indigo-300'
                              : isToday
                              ? 'bg-purple-50/80 border-purple-200'
                              : 'bg-white border-indigo-50 hover:bg-indigo-50/40'
                          }`}
                        >
                          <div className="text-[11px] font-bold text-gray-500 uppercase">
                            {dayItem.date.toLocaleString(language, { weekday: 'short' })}
                          </div>
                          <div className="text-sm font-bold text-purple-950 mb-1">
                            {dayItem.date.getDate()}
                          </div>

                          {/* Event chips */}
                          <div className="space-y-1">
                            {dayItem.events.slice(0, 3).map((e) => (
                              <div
                                key={e.id}
                                className="text-[10px] p-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-100 truncate font-medium"
                              >
                                {e.title}
                              </div>
                            ))}
                            {dayItem.events.length > 3 && (
                              <div className="text-[9px] text-gray-400">
                                +{dayItem.events.length - 3} {calUi.morePrefix}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Day Agenda within Week View */}
                  <div className="mt-4 pt-3 border-t border-indigo-100">
                    <div className="text-xs font-bold text-purple-950 mb-2">
                      {calUi.agendaPrefix} {formatDate(selectedDate)} ({dayEvents.length} {calUi.eventsWord})
                    </div>
                    {dayEvents.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">{calUi.noEventsDay}</p>
                    ) : (
                      <div className="space-y-2">
                        {dayEvents.map((evt) => (
                          <EventCard
                            key={evt.id}
                            event={evt}
                            t={t}
                            language={language}
                            calUi={calUi}
                            highContrast={highContrast}
                            onEdit={() => handleOpenEdit(evt)}
                            onDelete={() => setDeletingEvent(evt)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Month View */}
              {viewMode === 'month' && (
                <div className="space-y-3" data-testid="calendar-month-view">
                  {/* Day of Week Headers */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 uppercase">
                    {calUi.weekdaysShort.map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>

                  {/* Month Days Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {monthDays.map((item, idx) => {
                      if (!item.isCurrentMonth) {
                        return (
                          <div key={`empty-${idx}`} className="h-12 rounded-xl bg-gray-50/50" />
                        );
                      }

                      const isSelected = item.dateStr === selectedDateStr;
                      const isToday = item.dateStr === CalendarService.toDateString(new Date());

                      return (
                        <div
                          key={item.dateStr}
                          onClick={() => setSelectedDate(new Date(item.dateStr + 'T00:00:00Z'))}
                          className={`h-12 p-1 rounded-xl border flex flex-col justify-between items-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-300'
                              : isToday
                              ? 'bg-purple-50 border-purple-200'
                              : 'bg-white border-indigo-50 hover:bg-indigo-50/40'
                          }`}
                        >
                          <span className="text-xs font-bold text-purple-950">
                            {item.dayNumber}
                          </span>
                          {item.count > 0 && (
                            <span className="text-[9px] font-bold bg-indigo-200 text-indigo-900 px-1.5 py-0.2 rounded-full">
                              {item.count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Day Agenda within Month View */}
                  <div className="mt-4 pt-3 border-t border-indigo-100">
                    <div className="text-xs font-bold text-purple-950 mb-2">
                      {calUi.eventsForPrefix} {formatDate(selectedDate)} ({dayEvents.length})
                    </div>
                    {dayEvents.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">{calUi.noEventsDay}</p>
                    ) : (
                      <div className="space-y-2">
                        {dayEvents.map((evt) => (
                          <EventCard
                            key={evt.id}
                            event={evt}
                            t={t}
                            language={language}
                            calUi={calUi}
                            highContrast={highContrast}
                            onEdit={() => handleOpenEdit(evt)}
                            onDelete={() => setDeletingEvent(evt)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deletingEvent && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-purple-950/50 backdrop-blur-xs animate-in fade-in">
            <div
              className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl ${
                highContrast
                  ? 'bg-black text-white border-2 border-yellow-300'
                  : 'bg-white text-gray-900 border border-purple-100'
              }`}
            >
              <h4 className="text-sm font-bold text-purple-950 mb-2">
                {t('calendar.delete_event')}
              </h4>
              <p className="text-xs text-gray-600 mb-2">
                {t('calendar.delete_confirm')}
              </p>
              {deletingEvent.recurrence && deletingEvent.recurrence.frequency !== 'none' && (
                <div className="text-[11px] text-amber-700 bg-amber-50 rounded-xl p-2.5 mb-4 border border-amber-200 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{t('calendar.recurrence_notice')}</span>
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingEvent(null)}
                  className="py-2 px-3.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="py-2 px-4 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-sm"
                  data-testid="calendar-confirm-delete-btn"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface EventCardProps {
  event: CalendarEvent;
  t: (k: any) => string;
  language?: string;
  calUi: ReturnType<typeof getCalendarUi>;
  highContrast: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  t,
  calUi,
  highContrast,
  onEdit,
  onDelete,
}) => {
  const isRecurring = Boolean(event.recurrence && event.recurrence.frequency !== 'none');
  const timeDisplay = event.isAllDay
    ? calUi.allDayBadge
    : event.startAt.includes('T')
    ? event.startAt.split('T')[1].substring(0, 5)
    : '10:00';

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
        highContrast
          ? 'bg-gray-900 border-gray-700'
          : 'bg-white border-indigo-100 hover:border-indigo-200 shadow-xs'
      }`}
      data-testid={`calendar-card-${event.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
            {t(`calendar.category_${event.category}` as any)}
          </span>

          <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-950">
            <Clock className="w-3.5 h-3.5 text-indigo-700" />
            <span>{timeDisplay}</span>
          </span>

          {isRecurring && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              <Repeat className="w-3 h-3" />
              <span>
                {event.recurrence?.frequency === 'daily'
                  ? calUi.recDaily
                  : event.recurrence?.frequency === 'weekly'
                  ? calUi.recWeekly
                  : event.recurrence?.frequency}
              </span>
            </span>
          )}

          {event.isPrivate && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              <Lock className="w-3 h-3 text-purple-700" />
              <span>{calUi.privateBadge}</span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label={t('calendar.edit_event')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            data-testid={`calendar-edit-btn-${event.id}`}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('calendar.delete_event')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            data-testid={`calendar-delete-btn-${event.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Event Title */}
      <h3 className="text-sm font-bold text-purple-950 mb-1 leading-snug">
        {event.title}
      </h3>

      {/* Description */}
      {event.description && (
        <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed mb-2">
          {event.description}
        </p>
      )}

      {/* Location or Routine link */}
      <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
        {event.locationLabel && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-indigo-600" />
            <span>{event.locationLabel}</span>
          </span>
        )}
        {event.linkedRoutineId && (
          <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
            <Link className="w-3 h-3" />
            <span>{calUi.routineLinkedBadge}</span>
          </span>
        )}
      </div>
    </div>
  );
};
