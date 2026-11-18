import React, { useState, useMemo } from 'react';
import { useLanguage, SupportedLanguage } from '../../context/LanguageContext.js';
import {
  Globe,
  Search,
  Check,
  X,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { SpeechService } from '../../services/speechService.js';
import { getLinguisticReviewStatus } from '../../i18n/linguisticReviewRegistry.js';

interface LanguageSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageSelectionModal: React.FC<LanguageSelectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    language,
    allLanguages,
    confirmLanguage,
    setPreviewLanguage,
    t,
  } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(language);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Sync state when opened
  React.useEffect(() => {
    if (isOpen) {
      setSelectedLang(language);
      setPreviewLanguage(null);
    }
  }, [isOpen, language, setPreviewLanguage]);

  // Filter languages by English name or native script
  const filteredLanguages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allLanguages;
    return allLanguages.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.script.toLowerCase().includes(q)
    );
  }, [searchQuery, allLanguages]);

  if (!isOpen) return null;

  const currentPreview = allLanguages.find((l) => l.code === selectedLang) || allLanguages[0];

  const handleSelectLanguage = (code: SupportedLanguage) => {
    setSelectedLang(code);
    setPreviewLanguage(code);
  };

  const handleConfirm = () => {
    confirmLanguage(selectedLang);
    SpeechService.cancelSpeech();
    onClose();
  };

  const handlePlaySample = () => {
    if (!currentPreview) return;
    setIsPlayingAudio(true);
    SpeechService.speak(
      currentPreview.welcomeGreeting,
      () => setIsPlayingAudio(true),
      () => setIsPlayingAudio(false),
      currentPreview.code
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-modal-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fadeIn overflow-y-auto"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-purple-100 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-700 via-purple-600 to-lavender-600 text-white relative">
          <button
            onClick={() => {
              setPreviewLanguage(null);
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
            aria-label="Close language selector"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 text-lavender-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <Globe className="w-4 h-4" />
            <span>Pan-India Localization • 22 Languages + English</span>
          </div>

          <h2 id="lang-modal-heading" className="text-xl sm:text-2xl font-extrabold">
            {t('lang_modal.title')}
          </h2>
          <p className="text-xs sm:text-sm text-lavender-100 mt-1">
            {t('lang_modal.subtitle')}
          </p>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 bg-lavender-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('lang_modal.search_placeholder')}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm font-medium text-gray-800 placeholder-gray-400 shadow-2xs"
            />
          </div>
        </div>

        {/* Live Language Preview Banner */}
        {currentPreview && (
          <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">
                  {t('lang_modal.preview_title')}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-200/60 text-purple-800 font-semibold">
                  {currentPreview.script}
                </span>
                {currentPreview.direction === 'rtl' && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                    RTL (Right-to-Left)
                  </span>
                )}
              </div>
              <p
                className="text-base font-extrabold text-saksham-darkText"
                dir={currentPreview.direction}
              >
                {currentPreview.welcomeGreeting}
              </p>
              <p
                className="text-xs text-gray-600 font-medium"
                dir={currentPreview.direction}
              >
                {currentPreview.sampleText}
              </p>
            </div>

            <button
              onClick={handlePlaySample}
              className={`shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                isPlayingAudio
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-100'
              }`}
              title="Hear pronunciation sample"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isPlayingAudio ? 'Listening...' : 'Hear Sample'}</span>
            </button>
          </div>
        )}

        {/* Language Grid */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {filteredLanguages.map((langOpt) => {
            const isSelected = selectedLang === langOpt.code;
            return (
              <button
                key={langOpt.code}
                onClick={() => handleSelectLanguage(langOpt.code)}
                className={`p-3 rounded-2xl border-2 text-left transition flex items-center justify-between min-h-[58px] cursor-pointer ${
                  isSelected
                    ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-200 shadow-xs'
                    : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50/30'
                }`}
                aria-pressed={isSelected}
              >
                <div>
                  <div className="flex items-baseline space-x-1.5">
                    <span
                      className="font-extrabold text-base text-gray-900"
                      dir={langOpt.direction}
                    >
                      {langOpt.nativeName}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      ({langOpt.name})
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-purple-700 font-semibold">
                      {langOpt.script}
                    </span>
                    {langOpt.direction === 'rtl' && (
                      <span className="text-[10px] text-amber-700 font-bold">
                        • RTL
                      </span>
                    )}
                    {(() => {
                      const rec = getLinguisticReviewStatus(langOpt.code);
                      return (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                            rec.tier === 'TIER_1_VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.tier === 'TIER_2_VALIDATED_VOICE'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rec.tier === 'TIER_1_VERIFIED'
                            ? 'Verified'
                            : rec.tier === 'TIER_2_VALIDATED_VOICE'
                            ? 'Voice + UI'
                            : 'UI (Review)'}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border border-gray-300 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              setPreviewLanguage(null);
              onClose();
            }}
            className="px-4 py-2.5 rounded-2xl border border-gray-300 hover:bg-gray-100 text-xs sm:text-sm font-bold text-gray-700 transition cursor-pointer"
          >
            {t('lang_modal.cancel_btn')}
          </button>

          <button
            onClick={handleConfirm}
            className="flex-1 max-w-xs py-3 px-5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-extrabold shadow-soft-purple transition cursor-pointer flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-4 h-4 text-lavender-200" />
            <span>{t('lang_modal.confirm_btn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
