import React, { useState, useEffect } from 'react';
import { X, AlertCircle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getPortalUi } from '../../portals/utils/portalTranslation.js';
import {
  CalendarEvent,
  CalendarCategory,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '../../calendar/types/calendar.types.js';

interface CaregiverAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    input: CreateCalendarEventInput | UpdateCalendarEventInput,
    eventId?: string
  ) => Promise<void>;
  initialEvent?: CalendarEvent | null;
  patientName: string;
}

export const CaregiverAppointmentModal: React.FC<CaregiverAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEvent,
  patientName,
}) => {
  const { language, t } = useLanguage();
  const ui = getPortalUi(language);
  const isEditing = !!initialEvent;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CalendarCategory>('doctor');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [locationLabel, setLocationLabel] = useState('');
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number>(15);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title);
      setCategory(initialEvent.category);
      const start = new Date(initialEvent.startAt);
      setDate(start.toISOString().split('T')[0]);
      setStartTime(start.toTimeString().substring(0, 5));
      if (initialEvent.endAt) {
        setEndTime(new Date(initialEvent.endAt).toTimeString().substring(0, 5));
      } else {
        setEndTime('');
      }
      setLocationLabel(initialEvent.locationLabel || '');
      setReminderMinutesBefore(
        initialEvent.reminderMinutesBefore !== undefined
          ? initialEvent.reminderMinutesBefore
          : 15
      );
    } else {
      setTitle('');
      setCategory('doctor');
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime('10:00');
      setEndTime('11:00');
      setLocationLabel('');
      setReminderMinutesBefore(15);
    }
    setError(null);
  }, [initialEvent, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please provide an appointment title.');
      return;
    }

    if (!date || !startTime) {
      setError('Please specify both a date and a start time.');
      return;
    }

    const startDateTime = new Date(`${date}T${startTime}:00`);
    if (isNaN(startDateTime.getTime())) {
      setError('Invalid date or start time format.');
      return;
    }

    let endDateTime: Date | undefined = undefined;
    if (endTime) {
      endDateTime = new Date(`${date}T${endTime}:00`);
      if (isNaN(endDateTime.getTime())) {
        setError('Invalid end time format.');
        return;
      }
      if (endDateTime.getTime() < startDateTime.getTime()) {
        setError('End time cannot precede start time.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isEditing && initialEvent) {
        const updateInput: UpdateCalendarEventInput = {
          title: trimmedTitle,
          category,
          startAt: startDateTime.toISOString(),
          endAt: endDateTime ? endDateTime.toISOString() : undefined,
          locationLabel: locationLabel.trim() || undefined,
          reminderMinutesBefore,
          isPrivate: false, // Caregiver can never set isPrivate to true
        };
        await onSave(updateInput, initialEvent.id);
      } else {
        const createInput: CreateCalendarEventInput = {
          title: trimmedTitle,
          category,
          startAt: startDateTime.toISOString(),
          endAt: endDateTime ? endDateTime.toISOString() : undefined,
          locationLabel: locationLabel.trim() || undefined,
          reminderMinutesBefore,
          isPrivate: false, // Caregiver appointments are always non-private
        };
        await onSave(createInput);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="caregiver-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-emerald-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-700 p-6 text-white flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-emerald-200 font-bold block">
              {ui.apptModalSection}
            </span>
            <h2 id="caregiver-modal-title" className="text-xl font-bold">
              {isEditing ? ui.apptModalEditTitle : ui.apptModalNewTitle}
            </h2>
            <p className="text-xs text-emerald-100 mt-0.5">
              {ui.apptModalForPrefix} {patientName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={ui.apptModalCloseAria}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors focus:ring-2 focus:ring-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-2 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Privacy Reassurance Note */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start space-x-2.5 text-xs text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">{ui.apptModalPrivacyTitle}</span> Caregiver
              appointments are automatically shared with {patientName} and the care
              team. Private patient notes remain strictly confidential and hidden.
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label
              htmlFor="appt-title"
              className="block text-xs font-bold text-gray-700 mb-1"
            >
              {ui.apptModalTitleLabel}
            </label>
            <input
              id="appt-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={ui.apptModalTitlePlaceholder}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-900"
            />
          </div>

          {/* Category Selector */}
          <div>
            <label
              htmlFor="appt-category"
              className="block text-xs font-bold text-gray-700 mb-1"
            >
              {ui.apptModalCategory}
            </label>
            <select
              id="appt-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as CalendarCategory)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-900 bg-white"
            >
              <option value="doctor">🩺 {t('calendar.category_doctor')}</option>
              <option value="family">👨‍👩‍👧 {t('calendar.category_family')}</option>
              <option value="medication">💊 {t('calendar.category_medication')}</option>
              <option value="personal">🌿 {t('calendar.category_personal')}</option>
              <option value="other">📋 {t('calendar.category_other')}</option>
            </select>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="appt-date"
                className="block text-xs font-bold text-gray-700 mb-1"
              >
                {ui.apptModalDate}
              </label>
              <div className="relative">
                <input
                  id="appt-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-900"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="appt-start"
                className="block text-xs font-bold text-gray-700 mb-1"
              >
                {ui.apptModalStart}
              </label>
              <div className="relative">
                <input
                  id="appt-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-900"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="appt-end"
                className="block text-xs font-bold text-gray-700 mb-1"
              >
                {ui.apptModalEndOpt}
              </label>
              <div className="relative">
                <input
                  id="appt-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Location Label */}
          <div>
            <label
              htmlFor="appt-location"
              className="block text-xs font-bold text-gray-700 mb-1"
            >
              {ui.apptModalLocation}
            </label>
            <div className="relative">
              <input
                id="appt-location"
                type="text"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                placeholder={ui.apptModalLocPlaceholder}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-900"
              />
            </div>
          </div>

          {/* Reminder Select */}
          <div>
            <label
              htmlFor="appt-reminder"
              className="block text-xs font-bold text-gray-700 mb-1"
            >
              {ui.apptModalReminder}
            </label>
            <select
              id="appt-reminder"
              value={reminderMinutesBefore}
              onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-900 bg-white"
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
              <option value={0}>0 min</option>
              <option value={-1}>Off</option>
            </select>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {ui.apptModalCancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? ui.apptModalSaving
                : isEditing
                ? ui.apptModalSaveChanges
                : ui.apptModalScheduleBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
