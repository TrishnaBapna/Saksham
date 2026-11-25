/**
 * SAKSHAM NEURO-CARE — LOVED ONES VISUAL RECALL MODAL
 * Character-grounded face and photograph recognition for patients with cognitive memory gaps.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LovedOne } from '../../../types/index.js';
import { LovedOnesVisualRecallService, VisualRecallResult } from '../services/lovedOnesVisualRecallService.js';
import { SpeechService } from '../../../services/speechService.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getTranslatedRelationship } from '../utils/relationshipTranslation.js';
import {
  X,
  Users,
  AlertCircle,
  HelpCircle,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface LovedOnesVisualRecallModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName?: string;
}

export const LovedOnesVisualRecallModal: React.FC<LovedOnesVisualRecallModalProps> = ({
  isOpen,
  onClose,
  patientId = 'sunita_01',
  patientName = 'Sunita Ji',
}) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [selectedPhoto, setSelectedPhoto] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<VisualRecallResult | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  if (!isOpen) return null;

  // Preset sample photos for rapid demonstration
  const samplePresets = [
    {
      label: 'Ananya (Daughter)',
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    },
    {
      label: 'Aarav (Grandson)',
      url: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?auto=format&fit=crop&w=600&q=80',
    },
    {
      label: 'Dr. Vikram (Son)',
      url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80',
    },
    {
      label: 'Unrecognized Person',
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const handleSelectPhoto = async (url: string) => {
    setSelectedPhoto(url);
    setIsAnalyzing(true);
    setResult(null);

    try {
      const recallResult = await LovedOnesVisualRecallService.matchCandidatePhoto(patientId, url);
      setResult(recallResult);
    } catch (e) {
      console.warn('Error matching photo:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlayVoiceNote = (member: LovedOne) => {
    if (isPlayingAudio) {
      SpeechService.cancelSpeech();
      setIsPlayingAudio(false);
      return;
    }

    const noteText =
      member.voiceRecording?.transcript ||
      member.audioNote ||
      `Namaste, I am ${member.name}, your ${member.relationship}. Sending you love always!`;

    setIsPlayingAudio(true);
    SpeechService.speak(
      noteText,
      undefined,
      () => {
        setIsPlayingAudio(false);
      },
      SpeechService.getBCP47(language)
    );
  };

  const handleClose = () => {
    if (isPlayingAudio) {
      SpeechService.cancelSpeech();
      setIsPlayingAudio(false);
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="visual-recall-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 via-pink-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 id="visual-recall-title" className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {t('loved_ones.visual_title')}
                <span className="text-xs px-2 py-0.5 font-medium bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                  On-Device Privacy
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Identify familiar people from authorized family records for {patientName}.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close Visual Recall"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Preset Photo Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Select or test a photograph:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {samplePresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleSelectPhoto(preset.url)}
                  className={`p-2 rounded-xl border text-left flex flex-col items-center gap-2 transition-all ${
                    selectedPhoto === preset.url
                      ? 'border-rose-500 bg-rose-50/70 shadow-sm ring-2 ring-rose-200'
                      : 'border-slate-200 bg-white hover:border-rose-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 text-center line-clamp-1">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Analysis in Progress */}
          {isAnalyzing && (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="font-semibold text-slate-700 text-sm">Comparing with authorized Loved Ones records...</p>
              <p className="text-xs text-slate-500 mt-1">100% on-device private perceptual verification</p>
            </div>
          )}

          {/* Match Results */}
          {result && !isAnalyzing && (
            <div className="space-y-4 animate-fade-in">
              {result.outcome === 'TENTATIVE_MATCH' && result.matchedMember ? (
                <div className="bg-gradient-to-br from-rose-50/80 to-amber-50/40 p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        Recognized Family Member ({Math.round(result.confidenceScore * 100)}% match)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-rose-300 shadow-md shrink-0 bg-slate-100">
                      <img
                        src={result.matchedMember.photoUrl || selectedPhoto}
                        alt={result.matchedMember.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold text-slate-900">
                        {result.matchedMember.name}
                      </h3>
                      <p className="text-sm font-semibold text-rose-700">
                        {getTranslatedRelationship(result.matchedMember.relationship, t)}
                      </p>
                      {result.memoryCue && (
                        <p className="text-xs text-slate-600 italic pt-1">
                          "{result.memoryCue}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for recognized person */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-rose-200/60">
                    {result.audioNoteAvailable && (
                      <button
                        onClick={() => handlePlayVoiceNote(result.matchedMember!)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all ${
                          isPlayingAudio
                            ? 'bg-amber-600 text-white animate-pulse'
                            : 'bg-white hover:bg-rose-50 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        {isPlayingAudio ? 'Stop Voice Note' : 'Play Family Voice Note'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleClose();
                        navigate('/patient/loved-ones');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                    >
                      <Users className="w-4 h-4" /> View Full Family Profile
                    </button>
                  </div>
                </div>
              ) : result.outcome === 'UNCERTAIN_MATCH' && result.matchedMember ? (
                <div className="bg-amber-50 p-4 sm:p-5 rounded-2xl border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-amber-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      {t('loved_ones.visual_uncertain')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 font-medium">{result.explanation}</p>
                  <p className="text-xs text-slate-500">
                    Asha avoids falsely confirming identities when visual features are ambiguous.
                  </p>
                  <button
                    onClick={() => {
                      handleClose();
                      navigate('/patient/loved-ones');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 underline"
                  >
                    Open Loved Ones album to verify together <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center space-y-2">
                  <AlertCircle className="w-7 h-7 text-slate-400 mx-auto" />
                  <h4 className="font-bold text-slate-800 text-base">{t('loved_ones.visual_unrecognized')}</h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    {result.explanation} Asha never invents false family identities or assumes connections that are not verified.
                  </p>
                  <button
                    onClick={() => {
                      handleClose();
                      navigate('/patient/loved-ones');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold mt-2"
                  >
                    Add to Loved Ones Sanctuary
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            100% On-Device Visual Recall — Zero External Biometric Cloud APIs
          </span>
          <button
            onClick={handleClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
