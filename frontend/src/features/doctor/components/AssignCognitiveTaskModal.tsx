import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Sparkles, Brain, Clock } from 'lucide-react';
import { GamesService } from '../../games/services/gamesService.js';
import {
  DoctorAnalyticsService,
  DoctorAssignedActivity,
} from '../services/doctorAnalyticsService.js';
import { GameItem } from '../../../types/index.js';

interface AssignCognitiveTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  onAssigned?: (activity: DoctorAssignedActivity) => void;
}

export const AssignCognitiveTaskModal: React.FC<AssignCognitiveTaskModalProps> = ({
  isOpen,
  onClose,
  doctorId,
  doctorName,
  patientId,
  patientName,
  onAssigned,
}) => {
  const [games, setGames] = useState<GameItem[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [frequency, setFrequency] = useState<'daily' | 'alternate_days' | 'weekly'>('daily');
  const [clinicalGoal, setClinicalGoal] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successConfirmation, setSuccessConfirmation] = useState<string | null>(null);

  // Load available games catalogue
  useEffect(() => {
    if (isOpen) {
      const allGames = GamesService.getAllGames();
      setGames(allGames);
      if (allGames.length > 0 && !selectedGameId) {
        setSelectedGameId(allGames[0].id);
      }
      setErrorMessage(null);
      setSuccessConfirmation(null);
    }
  }, [isOpen]);

  // Handle Escape key to close dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const selectedGame = games.find((g) => g.id === selectedGameId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessConfirmation(null);

    // Validation
    if (!selectedGameId) {
      setErrorMessage('Please select a supported cognitive activity.');
      return;
    }

    if (!instructions.trim()) {
      setErrorMessage('Clinical instructions for the patient and caregiver are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await DoctorAnalyticsService.assignCognitiveActivity(
        doctorId,
        doctorName,
        patientId,
        {
          gameId: selectedGameId,
          gameTitle: selectedGame?.title || 'Cognitive Activity',
          frequency,
          clinicalGoal: clinicalGoal.trim() || undefined,
          instructions: instructions.trim(),
        }
      );

      setSuccessConfirmation(`Successfully assigned "${created.gameTitle}" to ${patientName}.`);
      if (onAssigned) {
        onAssigned(created);
      }

      // Close modal after brief confirmation
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to assign cognitive activity. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-task-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-blue-600 text-xs font-bold uppercase tracking-wider">
              <Brain className="w-4 h-4" />
              <span>Prescription & Rehabilitation</span>
            </div>
            <h2 id="assign-task-modal-title" className="text-xl font-bold text-gray-900">
              Assign Cognitive Activity
            </h2>
            <p className="text-xs text-gray-500">
              Prescribing scheduled activity for <strong className="text-gray-800">{patientName}</strong> (ID: {patientId})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-2.5 text-xs text-red-800"
          >
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successConfirmation && (
          <div
            role="status"
            className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-2.5 text-xs text-emerald-800"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-medium">{successConfirmation}</span>
          </div>
        )}

        {/* Assignment Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Activity Selector */}
          <div>
            <label htmlFor="activity-selector" className="block text-xs font-bold text-gray-700 mb-1.5">
              Select Supported Cognitive Activity <span className="text-red-500">*</span>
            </label>
            <select
              id="activity-selector"
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              disabled={isSubmitting}
              className="w-full text-xs p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-gray-800"
            >
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.title} ({game.categoryLabel} • ~{game.estimatedMinutes}m)
                </option>
              ))}
            </select>
            {selectedGame && (
              <div className="mt-2 p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-2xs text-blue-900 space-y-1">
                <div className="flex items-center space-x-2 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{selectedGame.description}</span>
                </div>
                {selectedGame.benefits && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selectedGame.benefits.map((b, idx) => (
                      <span key={idx} className="bg-white/80 px-2 py-0.5 rounded-md border border-blue-200 text-blue-700">
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recommended Frequency */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Recommended Frequency <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFrequency('daily')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  frequency === 'daily'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setFrequency('alternate_days')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  frequency === 'alternate_days'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Alt. Days (3x/wk)
              </button>
              <button
                type="button"
                onClick={() => setFrequency('weekly')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  frequency === 'weekly'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Weekly
              </button>
            </div>
          </div>

          {/* Clinical Goal */}
          <div>
            <label htmlFor="clinical-goal" className="block text-xs font-bold text-gray-700 mb-1.5">
              Clinical Goal (Optional)
            </label>
            <input
              id="clinical-goal"
              type="text"
              placeholder="e.g. Visual-spatial working memory retention & anxiety reduction"
              value={clinicalGoal}
              onChange={(e) => setClinicalGoal(e.target.value)}
              disabled={isSubmitting}
              className="w-full text-xs p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-gray-800"
            />
          </div>

          {/* Clinical Instructions / Patient Notes */}
          <div>
            <label htmlFor="clinical-instructions" className="block text-xs font-bold text-gray-700 mb-1.5">
              Clinical Instructions & Patient Guidance <span className="text-red-500">*</span>
            </label>
            <textarea
              id="clinical-instructions"
              rows={3}
              placeholder="Instructions for patient and caregiver (e.g., practice in a quiet room each morning after tea; do not rush)."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={isSubmitting}
              className="w-full text-xs p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-gray-800"
            />
          </div>

          {/* Clinical Non-Diagnostic Compliance Notice */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-start space-x-2 text-2xs text-amber-900">
            <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
            <span>
              Assigned tasks are synced to the patient's Mind Games and daily timeline. No diagnostic score is inferred from exercise completion rates.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Assigning Activity...</span>
                </>
              ) : (
                <span>Confirm Assignment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
