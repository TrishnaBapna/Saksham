/**
 * SAKSHAM — CAREGIVER ROUTINE EDITOR MODAL
 * Allows authorised caregivers (Admin-approved + canManageRoutines) to add or edit
 * patient daily routine tasks and immediately sync changes to shared Firestore data.
 */

import React, { useState, useEffect } from 'react';
import { RoutineItem, RoutineCategory } from '../../../types/index.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getRoutineSyncUi } from '../../routines/utils/caregiverRoutineSyncTranslation.js';
import { X, Star, Clock, Repeat, FileText, Sparkles } from 'lucide-react';

interface CaregiverRoutineEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (draft: {
    title: string;
    scheduledTime: string;
    category: RoutineCategory;
    description: string;
    notes: string;
    recurrence: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom';
    recurrenceDays: string[];
    isImportant: boolean;
    enableAssistedRecall: boolean;
  }) => Promise<void> | void;
  existingRoutine?: RoutineItem | null;
  isSaving?: boolean;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const QUICK_TIMES = ['07:30 AM', '08:00 AM', '09:30 AM', '12:30 PM', '03:00 PM', '06:00 PM', '08:30 PM'];

export const CaregiverRoutineEditorModal: React.FC<CaregiverRoutineEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingRoutine,
  isSaving = false,
}) => {
  const { language } = useLanguage();
  const ui = getRoutineSyncUi(language);

  const [title, setTitle] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00 AM');
  const [category, setCategory] = useState<RoutineCategory>('wellness');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [recurrence, setRecurrence] = useState<'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom'>('daily');
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [isImportant, setIsImportant] = useState(false);
  const [enableAssistedRecall, setEnableAssistedRecall] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (existingRoutine) {
      setTitle(existingRoutine.title || '');
      setScheduledTime(existingRoutine.scheduledTime || '09:00 AM');
      setCategory(existingRoutine.category || 'wellness');
      setDescription(existingRoutine.description || '');
      setNotes(existingRoutine.notes || '');
      setRecurrence(existingRoutine.recurrence || 'daily');
      setRecurrenceDays(existingRoutine.recurrenceDays || ['Mon', 'Wed', 'Fri']);
      setIsImportant(Boolean(existingRoutine.isImportant || existingRoutine.isEssential));
      setEnableAssistedRecall(existingRoutine.enableAssistedRecall !== false);
    } else {
      setTitle('');
      setScheduledTime('09:00 AM');
      setCategory('wellness');
      setDescription('');
      setNotes('');
      setRecurrence('daily');
      setRecurrenceDays(['Mon', 'Wed', 'Fri']);
      setIsImportant(false);
      setEnableAssistedRecall(true);
    }
    setError(null);
  }, [isOpen, existingRoutine]);

  if (!isOpen) return null;

  const toggleDay = (day: string) => {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a task name.');
      return;
    }
    if (!scheduledTime.trim()) {
      setError('Please enter a scheduled time.');
      return;
    }
    setError(null);
    await onSave({
      title: title.trim(),
      scheduledTime: scheduledTime.trim(),
      category,
      description: description.trim(),
      notes: notes.trim(),
      recurrence,
      recurrenceDays: recurrence === 'custom' ? recurrenceDays : [],
      isImportant,
      enableAssistedRecall,
    });
  };

  return (
    <div
      data-testid="caregiver-routine-editor-modal"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="caregiver-routine-editor-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-emerald-100 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 id="caregiver-routine-editor-title" className="text-lg font-extrabold text-gray-900">
            {existingRoutine ? ui.editTaskTitle : ui.addTaskTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            aria-label={ui.cancelBtn}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* Task Name */}
          <div>
            <label htmlFor="cg-routine-title" className="block text-xs font-bold text-gray-700 mb-1">
              {ui.taskTitleLabel}
            </label>
            <input
              id="cg-routine-title"
              data-testid="caregiver-routine-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={ui.taskTitlePlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm font-medium"
            />
          </div>

          {/* Time & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cg-routine-time" className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>{ui.timeLabel}</span>
              </label>
              <input
                id="cg-routine-time"
                data-testid="caregiver-routine-time-input"
                type="text"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                placeholder="09:00 AM"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none text-sm font-semibold"
              />
            </div>

            <div>
              <label htmlFor="cg-routine-category" className="block text-xs font-bold text-gray-700 mb-1">
                {ui.categoryLabel}
              </label>
              <select
                id="cg-routine-category"
                data-testid="caregiver-routine-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as RoutineCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none text-sm font-semibold bg-white"
              >
                <option value="wellness">Wellness</option>
                <option value="medication">Medication Support</option>
                <option value="hydration">Hydration</option>
                <option value="meal">Nutrition / Meal</option>
                <option value="exercise">Gentle Exercise</option>
                <option value="hygiene">Personal Care</option>
                <option value="activity">Memory & Social</option>
                <option value="appointment">Appointment</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          {/* Quick Time Presets */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TIMES.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setScheduledTime(preset)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  scheduledTime === preset
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="cg-routine-desc" className="block text-xs font-bold text-gray-700 mb-1">
              {ui.descriptionLabel}
            </label>
            <input
              id="cg-routine-desc"
              data-testid="caregiver-routine-desc-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={ui.descriptionPlaceholder}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none text-sm"
            />
          </div>

          {/* Caregiver Notes / Instructions */}
          <div>
            <label htmlFor="cg-routine-notes" className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>{ui.notesLabel}</span>
            </label>
            <textarea
              id="cg-routine-notes"
              data-testid="caregiver-routine-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={ui.notesPlaceholder}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none text-sm"
            />
          </div>

          {/* Recurring Schedule */}
          <div className="space-y-2 bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <label htmlFor="cg-routine-recurrence" className="block text-xs font-bold text-gray-700 flex items-center gap-1">
              <Repeat className="w-3.5 h-3.5 text-emerald-600" />
              <span>{ui.recurrenceLabel}</span>
            </label>
            <select
              id="cg-routine-recurrence"
              data-testid="caregiver-routine-recurrence-select"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-800"
            >
              <option value="daily">{ui.recurrenceDaily}</option>
              <option value="weekdays">{ui.recurrenceWeekdays}</option>
              <option value="weekends">{ui.recurrenceWeekends}</option>
              <option value="weekly">{ui.recurrenceWeekly}</option>
              <option value="custom">{ui.recurrenceCustom}</option>
            </select>

            {recurrence === 'custom' && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {WEEKDAYS.map((day) => {
                  const selected = recurrenceDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        selected
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Importance & Assisted Recall Toggles */}
          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/60 cursor-pointer">
              <span className="flex items-center gap-2 text-xs font-bold text-amber-950">
                <Star className="w-4 h-4 text-amber-600" />
                <span>{ui.markImportantLabel}</span>
              </span>
              <input
                type="checkbox"
                data-testid="caregiver-routine-important-checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                className="w-4 h-4 accent-amber-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-purple-200 bg-purple-50/50 cursor-pointer">
              <span className="flex items-center gap-2 text-xs font-bold text-purple-950">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>{ui.assistedRecallToggle}</span>
              </span>
              <input
                type="checkbox"
                checked={enableAssistedRecall}
                onChange={(e) => setEnableAssistedRecall(e.target.checked)}
                className="w-4 h-4 accent-purple-600"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
            >
              {ui.cancelBtn}
            </button>
            <button
              type="submit"
              data-testid="caregiver-routine-save-btn"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
            >
              {isSaving
                ? ui.syncSavingBadge
                : existingRoutine
                ? ui.saveChangesBtn
                : ui.createTaskBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
