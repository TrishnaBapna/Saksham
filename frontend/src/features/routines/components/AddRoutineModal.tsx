import React, { useState } from 'react';
import { RoutineItem, RoutineCategory } from '../../../types/index.js';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface AddRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRoutine: (routine: RoutineItem) => void;
  patientId: string;
}

export const AddRoutineModal: React.FC<AddRoutineModalProps> = ({
  isOpen,
  onClose,
  onAddRoutine,
  patientId,
}) => {
  const [title, setTitle] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00 AM');
  const [category, setCategory] = useState<RoutineCategory>('wellness');
  const [description, setDescription] = useState('');
  const [timerMinutes, setTimerMinutes] = useState<number>(5);
  const [steps, setSteps] = useState<string[]>(['']);
  const [enableAssistedRecall, setEnableAssistedRecall] = useState(true);
  const [hint1, setHint1] = useState('');
  const [hint2, setHint2] = useState('');
  const [hint3, setHint3] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddStep = () => {
    setSteps((prev) => [...prev, '']);
  };

  const handleUpdateStep = (index: number, val: string) => {
    setSteps((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemoveStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an activity name.');
      return;
    }

    const filteredSteps = steps.map((s) => s.trim()).filter(Boolean);

    const newRoutine: RoutineItem = {
      id: `custom_${Date.now()}`,
      patientId,
      title: title.trim(),
      description: description.trim() || undefined,
      scheduledTime,
      category,
      streakCount: 0,
      isCompleted: false,
      enableAssistedRecall,
      timerMinutes: timerMinutes > 0 ? timerMinutes : undefined,
      steps: filteredSteps.length > 0 ? filteredSteps : undefined,
      recallQuestion: `What care activity is scheduled for ${scheduledTime}?`,
      recallOptions: [
        title.trim(),
        'Quiet rest in armchair',
        'Check garden flowers'
      ],
      correctOptionIndex: 0,
      recallCues: enableAssistedRecall
        ? {
            hint1: hint1.trim() || 'A comforting habit you do to stay healthy.',
            hint2: hint2.trim() || 'Look at your scheduled care items on the counter.',
            hint3: hint3.trim() || title.trim(),
          }
        : undefined,
    };

    onAddRoutine(newRoutine);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-saksham-darkText/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-routine-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-purple-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-100 mb-4">
          <div>
            <h2 id="add-routine-modal-title" className="text-lg font-bold text-saksham-darkText flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span>Add New Care Activity</span>
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Create a personalized daily schedule item
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 mb-4 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Clinical Medication Safe Warning */}
        {category === 'medication' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3.5 mb-4 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 text-amber-700 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Clinical Regimen Requirement:</strong> Medication schedules must be entered or confirmed using the clinician-provided regimen. Never invent medication names, doses, or timing without clinical authorization.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Activity Name *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Afternoon Hydration & Vitamin D"
              className="w-full p-3 rounded-2xl border border-purple-200 text-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none"
              required
            />
          </div>

          {/* Time & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Scheduled Time
              </label>
              <input
                type="text"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                placeholder="09:00 AM"
                className="w-full p-3 rounded-2xl border border-purple-200 text-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RoutineCategory)}
                className="w-full p-3 rounded-2xl border border-purple-200 text-sm bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none font-medium"
              >
                <option value="medication">💊 Medication</option>
                <option value="food">🥗 Food & Nutrition</option>
                <option value="hydration">💧 Hydration</option>
                <option value="exercise">🚶 Physical Activity</option>
                <option value="speech">🗣️ Speech Exercises</option>
                <option value="wellness">🌿 Wellness</option>
                <option value="cognitive">🧩 Cognitive Activities</option>
                <option value="personalCare">🛁 Personal Care</option>
                <option value="custom">✨ Custom</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Gentle notes to support the activity..."
              rows={2}
              className="w-full p-3 rounded-2xl border border-purple-200 text-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none resize-none"
            />
          </div>

          {/* Optional Timer Minutes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Suggested Timer (Minutes)</span>
              <span className="text-gray-400 font-normal">Optional</span>
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(parseInt(e.target.value, 10) || 5)}
              className="w-full p-3 rounded-2xl border border-purple-200 text-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none font-medium"
            />
          </div>

          {/* Step-by-Step Instructions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Step-by-Step Instructions
              </label>
              <button
                type="button"
                onClick={handleAddStep}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Step</span>
              </button>
            </div>

            <div className="space-y-2">
              {steps.map((st, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-purple-600 w-5 text-right">{i + 1}.</span>
                  <input
                    type="text"
                    value={st}
                    onChange={(e) => handleUpdateStep(i, e.target.value)}
                    placeholder={`Step ${i + 1} instruction...`}
                    className="flex-1 p-2.5 rounded-xl border border-purple-200 text-xs focus:border-purple-600 focus:ring-1 focus:ring-purple-200 outline-none"
                  />
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(i)}
                      className="p-1.5 text-gray-400 hover:text-rose-600"
                      aria-label="Remove step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Assisted Recall Hints Toggle & Inputs */}
          <div className="pt-2 border-t border-purple-100">
            <label className="flex items-center space-x-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={enableAssistedRecall}
                onChange={(e) => setEnableAssistedRecall(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
              />
              <span className="text-xs font-bold text-purple-900">
                Enable 3-Chance Assisted Recall for this activity
              </span>
            </label>

            {enableAssistedRecall && (
              <div className="space-y-2.5 pl-6 border-l-2 border-purple-200">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-0.5">
                    Hint 1: Subtle Verbal Cue
                  </label>
                  <input
                    type="text"
                    value={hint1}
                    onChange={(e) => setHint1(e.target.value)}
                    placeholder="e.g. A warm beverage in the kitchen..."
                    className="w-full p-2 rounded-xl border border-purple-200 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-0.5">
                    Hint 2: Visual Location Clue
                  </label>
                  <input
                    type="text"
                    value={hint2}
                    onChange={(e) => setHint2(e.target.value)}
                    placeholder="e.g. Look beside the kettle on the counter..."
                    className="w-full p-2 rounded-xl border border-purple-200 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-0.5">
                    Hint 3: Direct Supportive Prompt
                  </label>
                  <input
                    type="text"
                    value={hint3}
                    onChange={(e) => setHint3(e.target.value)}
                    placeholder="e.g. Take the morning blood pressure tablet..."
                    className="w-full p-2 rounded-xl border border-purple-200 text-xs outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Submit & Cancel */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-purple-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Care Activity</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
