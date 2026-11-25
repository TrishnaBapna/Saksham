import React, { useState, useId } from 'react';
import {
  X,
  AlertTriangle,
  ShieldCheck,
  Volume2,
  PhoneCall,
  CheckCircle,
  Brain,
  MessageSquare,
  Clock,
  Home,
  Moon,
  Smile,
  HelpCircle,
} from 'lucide-react';
import {
  CognitiveConcern,
  CognitiveConcernCategory,
  CognitiveConcernPerspective,
  CognitiveConcernStatus,
  PATIENT_CONCERN_PROMPTS,
} from '../types/concern.types';
import { CognitiveConcernService } from '../services/cognitiveConcernService';
import { SpeechService } from '../../../services/speechService';
import { useLanguage } from '../../../context/LanguageContext.js';

interface CognitiveConcernModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName?: string;
  perspective?: CognitiveConcernPerspective;
  currentUserId: string;
  currentUserName?: string;
  editingConcern?: CognitiveConcern | null;
  onConcernSaved?: (concern: CognitiveConcern) => void;
}

const CATEGORY_OPTIONS: Array<{
  id: CognitiveConcernCategory;
  label: string;
  patientLabel: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'memory',
    label: 'Memory & Recall',
    patientLabel: 'Remembering names, dates, or items',
    description: 'Recalling names of familiar people, recent conversations, or where items are kept.',
    icon: <Brain className="w-5 h-5 text-purple-600" />,
  },
  {
    id: 'communication',
    label: 'Communication & Speech',
    patientLabel: 'Finding the right words when talking',
    description: 'Word-finding pauses, repeating phrases, or following fast conversations.',
    icon: <MessageSquare className="w-5 h-5 text-blue-600" />,
  },
  {
    id: 'attention_planning',
    label: 'Attention & Multi-Step Tasks',
    patientLabel: 'Following steps or staying focused',
    description: 'Following recipes, managing medications, organizing steps, or concentrating.',
    icon: <Clock className="w-5 h-5 text-indigo-600" />,
  },
  {
    id: 'daily_activities',
    label: 'Daily Activities & Navigation',
    patientLabel: 'Dressing, meals, or finding rooms',
    description: 'Locating rooms at home, dressing steps, grooming, or finishing meals.',
    icon: <Home className="w-5 h-5 text-emerald-600" />,
  },
  {
    id: 'sleep_routine',
    label: 'Sleep & Daily Routine',
    patientLabel: 'Sleep schedule or evening restlessness',
    description: 'Waking up confused at night, sundowning / dusk restlessness, or changed sleep times.',
    icon: <Moon className="w-5 h-5 text-amber-600" />,
  },
  {
    id: 'behavior_mood',
    label: 'Mood & Emotional Comfort',
    patientLabel: 'Feeling restless, anxious, or down',
    description: 'Sudden restlessness, withdrawal, anxiety in crowds, or feeling overwhelmed.',
    icon: <Smile className="w-5 h-5 text-rose-600" />,
  },
  {
    id: 'functional_other',
    label: 'Other Everyday Observations',
    patientLabel: 'Other changes noticed in daily life',
    description: 'Any other cognitive or physical changes observed during everyday routines.',
    icon: <HelpCircle className="w-5 h-5 text-gray-600" />,
  },
];

export const CognitiveConcernModal: React.FC<CognitiveConcernModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName = 'Patient',
  perspective: initialPerspective = 'caregiver',
  currentUserId,
  currentUserName,
  editingConcern = null,
  onConcernSaved,
}) => {
  const CATEGORY_KEY_SUFFIX: Record<CognitiveConcernCategory, string> = {
    memory: 'memory',
    communication: 'comm',
    attention_planning: 'attn',
    daily_activities: 'daily',
    sleep_routine: 'sleep',
    behavior_mood: 'mood',
    functional_other: 'other',
  };

  const { t, language } = useLanguage();
  const modalTitleId = useId();
  const [perspective, setPerspective] = useState<CognitiveConcernPerspective>(initialPerspective);
  const [category, setCategory] = useState<CognitiveConcernCategory>('memory');
  const [description, setDescription] = useState('');
  const [contextNotes, setContextNotes] = useState('');
  const [status, setStatus] = useState<CognitiveConcernStatus>('ongoing');
  const [sharedWithDoctor, setSharedWithDoctor] = useState<boolean>(false);
  const [discussAtAppointment, setDiscussAtAppointment] = useState<boolean>(false);
  const [acuteAcknowledged, setAcuteAcknowledged] = useState<boolean>(false);
  const [showEmergencyInfo, setShowEmergencyInfo] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when modal opens or editingConcern changes
  React.useEffect(() => {
    if (editingConcern) {
      setDescription(editingConcern.description || '');
      setCategory(editingConcern.category || 'memory');
      setContextNotes(editingConcern.contextNotes || '');
      setPerspective(editingConcern.perspective || initialPerspective);
      setSharedWithDoctor(editingConcern.sharedWithDoctor || false);
      setDiscussAtAppointment(editingConcern.discussAtAppointment || false);
      setStatus(editingConcern.status || 'ongoing');
    } else {
      setDescription('');
      setCategory('memory');
      setContextNotes('');
      setPerspective(initialPerspective);
      setSharedWithDoctor(false);
      setDiscussAtAppointment(false);
      setStatus('ongoing');
    }
    setErrorMessage(null);
  }, [editingConcern, isOpen, initialPerspective]);

  if (!isOpen) return null;

  // Live acute / delirium check
  const combinedText = `${description} ${contextNotes}`;
  const acuteCheck = CognitiveConcernService.detectAcuteIndicators(combinedText);

  const handleSpeakCategory = (text: string) => {
    try {
      SpeechService.speak(text, undefined, undefined, SpeechService.getBCP47(language));
    } catch {
      // Audio speech fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage(t('journal.err_empty'));
      return;
    }

    if (acuteCheck.hasAcuteWarning && !acuteAcknowledged) {
      setErrorMessage(
        'Please review the emergency medical guidance above and check the acknowledgement box before saving.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let saved: CognitiveConcern;
      if (editingConcern) {
        const updated = await CognitiveConcernService.updateConcern(
          patientId,
          editingConcern.id,
          {
            description: description.trim(),
            category,
            contextNotes: contextNotes.trim() || undefined,
            status,
            sharedWithDoctor,
            discussAtAppointment,
          },
          perspective
        );
        if (!updated) throw new Error('Failed to update observation.');
        saved = updated;
      } else {
        saved = await CognitiveConcernService.recordConcern(patientId, {
          recordedBy: currentUserId,
          recordedByName: currentUserName || (perspective === 'patient' ? patientName : 'Family / Caregiver'),
          perspective,
          category,
          description: description.trim(),
          contextNotes: contextNotes.trim() || undefined,
          status,
          sharedWithDoctor,
          discussAtAppointment,
          acuteDisclaimerAcknowledged: acuteAcknowledged,
        });
      }

      setSaveSuccess(true);
      if (onConcernSaved) onConcernSaved(saved);

      setTimeout(() => {
        setIsSubmitting(false);
        setSaveSuccess(false);
        onClose();
      }, 800);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Unable to save observation. Please try again.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-purple-100 my-8 space-y-6 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              📝
            </div>
            <div>
              <h2 id={modalTitleId} className="text-xl font-bold text-gray-900">
                {perspective === 'patient' ? t('journal.modal_title_patient') : t('journal.modal_title_caregiver')}
              </h2>
              <p className="text-xs text-gray-500">
                {perspective === 'patient'
                  ? t('journal.modal_sub_patient')
                  : t('journal.modal_sub_caregiver', { name: patientName })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              data-testid="emergency-helplines-header-btn"
              onClick={() => setShowEmergencyInfo(!showEmergencyInfo)}
              className="px-3 py-2 min-h-[48px] rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center space-x-1.5 transition"
              title={t('journal.emergency_btn')}
            >
              <PhoneCall className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="hidden sm:inline">{t('journal.emergency_btn')}</span>
              <span className="sm:hidden">112 / 14416</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-3 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition min-w-[48px] min-h-[48px] flex items-center justify-center"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Immediate Emergency Guidance Header Drawer */}
        {showEmergencyInfo && (
          <div
            data-testid="emergency-info-drawer"
            className="p-4 bg-amber-50/90 rounded-2xl border-2 border-amber-300 space-y-3 animate-fadeIn text-xs text-amber-950"
          >
            <div className="flex items-center justify-between font-bold text-amber-900">
              <span className="flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Immediate Emergency Medical & Helpline Information</span>
              </span>
              <button
                type="button"
                onClick={() => setShowEmergencyInfo(false)}
                className="text-amber-800 hover:text-amber-950 font-bold text-xs"
              >
                Hide ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 bg-white rounded-xl border border-amber-200">
                <span className="font-bold text-rose-700 block text-xs">Emergency Ambulance: 112</span>
                <span className="text-[11px] text-gray-600">
                  Call 112 immediately for sudden weakness, facial drooping, speech loss, chest pain, or unresponsiveness.
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-amber-200">
                <span className="font-bold text-blue-700 block text-xs">Tele-MANAS Helpline: 14416</span>
                <span className="text-[11px] text-gray-600">
                  24/7 psychological distress counselling. (Note: Mental health support line, not an emergency ambulance).
                </span>
              </div>
            </div>
            <div className="text-[11px] text-amber-900 bg-amber-100/60 p-2 rounded-lg">
              ⚠️ <strong>Safety Disclaimer:</strong> This automated prompt is a rapid safety check and NOT a clinical diagnostic or screening instrument. Absence of warning keywords does NOT rule out delirium, stroke, or emergency conditions. For any acute physical or cognitive decline, arrange immediate clinical evaluation or dial 112.
            </div>
          </div>
        )}

        {/* Perspective Switcher */}
        <div className="flex bg-lavender-50 p-1.5 rounded-2xl text-xs font-semibold gap-1.5">
          <button
            type="button"
            data-testid="perspective-patient-btn"
            onClick={() => setPerspective('patient')}
            className={`flex-1 py-3 px-2 min-h-[48px] rounded-xl transition text-center flex items-center justify-center ${
              perspective === 'patient'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-900 hover:bg-purple-100/50'
            }`}
          >
            {t('journal.perspective_patient')}
          </button>
          <button
            type="button"
            data-testid="perspective-caregiver-btn"
            onClick={() => setPerspective('caregiver')}
            className={`flex-1 py-3 px-2 min-h-[48px] rounded-xl transition text-center flex items-center justify-center ${
              perspective === 'caregiver'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-900 hover:bg-purple-100/50'
            }`}
          >
            {t('journal.perspective_caregiver')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              {t('journal.select_area')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = category === cat.id;
                const suffix = CATEGORY_KEY_SUFFIX[cat.id];
                const catTitle =
                  perspective === 'patient'
                    ? t(`journal.cat_${suffix}_patient`)
                    : t(`journal.cat_${cat.id}`);
                const catDesc = t(`journal.cat_${suffix}_desc`);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    data-testid={`category-btn-${cat.id}`}
                    onClick={() => setCategory(cat.id)}
                    className={`p-3 rounded-2xl border text-left flex items-start space-x-3 transition min-h-[52px] ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-500/20 shadow-xs'
                        : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-white shrink-0 border border-purple-100">
                      {cat.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 block">
                          {catTitle}
                        </span>
                        {perspective === 'patient' && (
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleSpeakCategory(catTitle);
                            }}
                            className="text-purple-600 hover:text-purple-800 p-1"
                            title={t('routines.listen')}
                            aria-label={`${t('routines.listen')}: ${catTitle}`}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
                        {catDesc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Phrase Chips for Patient Mode (Part C) */}
          {perspective === 'patient' && (
            <div className="space-y-1.5 bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100">
              <label className="block text-2xs font-extrabold text-purple-900 uppercase tracking-wider">
                {t('journal.quick_chips_label')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PATIENT_CONCERN_PROMPTS.map((prompt, i) => {
                  const localizedPrompt = t(`journal.prompt_${i}`) || prompt;
                  return (
                    <button
                      key={i}
                      type="button"
                      data-testid={`quick-prompt-btn-${i}`}
                      onClick={() => setDescription((prev) => (prev ? `${prev} ${localizedPrompt}` : localizedPrompt))}
                      className="text-2xs bg-white text-purple-900 border border-purple-200 rounded-xl px-2.5 py-1.5 font-semibold hover:bg-purple-100 transition cursor-pointer shadow-2xs"
                    >
                      + {localizedPrompt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              {perspective === 'patient' ? t('journal.what_happened') : t('journal.observation_details')} *
            </label>
            <textarea
              data-testid="concern-description-input"
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                perspective === 'patient'
                  ? t('journal.desc_placeholder_patient')
                  : t('journal.desc_placeholder_caregiver')
              }
              className="w-full text-xs rounded-2xl border border-gray-300 p-3.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
          </div>

          {/* Context Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              {t('journal.context_optional')}
            </label>
            <input
              type="text"
              data-testid="concern-context-input"
              value={contextNotes}
              onChange={(e) => setContextNotes(e.target.value)}
              placeholder={t('journal.context_placeholder')}
              className="w-full text-xs rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
          </div>

          {/* Status Selector (Caregiver mode) */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-200 text-xs">
            <span className="font-semibold text-gray-700">{t('journal.frequency_pattern')}</span>
            <div className="flex space-x-2">
              {(['ongoing', 'occasional', 'resolved'] as CognitiveConcernStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  data-testid={`status-btn-${st}`}
                  onClick={() => setStatus(st)}
                  className={`px-3.5 py-2.5 min-h-[48px] rounded-xl text-xs font-bold capitalize transition flex items-center justify-center ${
                    status === st
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {t(`journal.status_${st}`)}
                </button>
              ))}
            </div>
          </div>

          {/* PRODUCT OWNER DECISION 1: URGENT DELIRIUM & EMERGENCY GUIDANCE BANNER */}
          {acuteCheck.hasAcuteWarning && (
            <div
              data-testid="urgent-delirium-banner"
              className="bg-amber-50 rounded-3xl p-5 border-2 border-amber-300 space-y-3 animate-fadeIn"
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-amber-950">
                    🚨 Urgent Medical Guidance: Sudden Changes Require Prompt Medical Evaluation
                  </h4>
                  <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                    You noted words indicating a rapid or sudden shift (e.g.,{' '}
                    <span className="font-semibold underline">
                      {acuteCheck.matchedKeywords.slice(0, 3).join(', ')}
                    </span>
                    ). Sudden confusion or neurological changes appearing over hours or days are{' '}
                    <strong>not typical gradual dementia progression</strong>. They may indicate an
                    acute medical condition such as delirium, an infection (such as a UTI or
                    respiratory infection), medication interaction, or a vascular event (stroke).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-3 bg-white rounded-2xl border border-amber-200 flex items-start space-x-2">
                  <PhoneCall className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-rose-700 block">
                      Emergency Ambulance: 112
                    </span>
                    <span className="text-[11px] text-gray-600">
                      Call 112 immediately if there is facial drooping, arm weakness, inability to speak,
                      chest pain, or loss of consciousness.
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-amber-200 flex items-start space-x-2">
                  <PhoneCall className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-blue-700 block">
                      Tele-MANAS Helpline: 14416
                    </span>
                    <span className="text-[11px] text-gray-600">
                      24/7 mental health and psychological counselling support. Note: Tele-MANAS is a mental
                      health helpline, not an emergency medical ambulance.
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-amber-800 bg-amber-100/60 p-2.5 rounded-xl">
                ⚠️ <strong>Safety Disclaimer:</strong> This automated keyword prompt is a rapid safety check and NOT a clinical diagnostic or screening instrument. Absence of warning keywords does NOT rule out delirium, stroke, or emergency conditions. For any acute physical or cognitive decline, arrange immediate clinical evaluation or dial 112.
              </div>

              <label className="flex items-start space-x-2.5 pt-1 min-h-[48px] cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="acknowledge-acute-checkbox"
                  checked={acuteAcknowledged}
                  onChange={(e) => setAcuteAcknowledged(e.target.checked)}
                  className="mt-1 w-5 h-5 text-purple-600 rounded-sm border-gray-300 focus:ring-purple-500"
                />
                <span className="text-xs font-semibold text-amber-950">
                  I understand this urgent guidance and will seek prompt medical care if sudden changes or acute symptoms persist.
                </span>
              </label>
            </div>
          )}

          {/* PRODUCT OWNER DECISION 3: PER-OBSERVATION SHARING CONTROL (OFF BY DEFAULT) */}
          <div
            data-testid="sharing-consent-card"
            className="p-4 bg-lavender-50/60 rounded-2xl border border-purple-200 space-y-2"
          >
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="shareWithDoctor"
                data-testid="share-with-doctor-checkbox"
                checked={sharedWithDoctor}
                onChange={(e) => setSharedWithDoctor(e.target.checked)}
                className="mt-1 w-5 h-5 text-purple-600 rounded-md border-gray-300 focus:ring-purple-500 cursor-pointer"
              />
              <label htmlFor="shareWithDoctor" className="text-xs text-gray-800 cursor-pointer">
                <span className="font-bold block text-purple-950 text-sm">
                  {t('journal.share_checkbox_title')}
                </span>
                <span className="text-gray-600 text-[11px] block mt-0.5">
                  <strong>{t('journal.private_by_default')}</strong> {t('journal.share_checkbox_desc')}
                </span>
              </label>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-gray-500 pt-1 pl-8">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {sharedWithDoctor
                  ? t('journal.permitted_shared')
                  : t('journal.kept_private')}
              </span>
            </div>
          </div>

          {/* APPOINTMENT DISCUSSION FLAG (Part E) */}
          <div
            data-testid="appointment-flag-card"
            className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200 space-y-1"
          >
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="discussAtAppointment"
                data-testid="discuss-at-appointment-checkbox"
                checked={discussAtAppointment}
                onChange={(e) => setDiscussAtAppointment(e.target.checked)}
                className="mt-1 w-5 h-5 text-indigo-600 rounded-md border-gray-300 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="discussAtAppointment" className="text-xs text-gray-800 cursor-pointer">
                <span className="font-bold block text-indigo-950 text-sm">
                  {t('journal.flag_checkbox_title')}
                </span>
                <span className="text-gray-600 text-[11px] block mt-0.5">
                  {t('journal.flag_checkbox_desc')}
                </span>
              </label>
            </div>
          </div>

          {errorMessage && (
            <div
              data-testid="concern-error-banner"
              className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl"
            >
              {errorMessage}
            </div>
          )}

          {saveSuccess && (
            <div
              data-testid="concern-success-banner"
              className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{t('journal.save_success')}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition min-h-[48px]"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              data-testid="submit-concern-btn"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition shadow-sm min-h-[48px] flex items-center space-x-2"
            >
              {isSubmitting ? (
                <span>{t('journal.saving')}</span>
              ) : (
                <>
                  <span>{t('journal.save_observation')}</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
