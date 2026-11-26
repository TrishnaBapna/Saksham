import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AshaInteractiveCompanion2D } from '../../features/ai-companion/components/AshaInteractiveCompanion2D.js';
import { LanguageSwitcherPill } from '../../components/layout/LanguageSwitcherPill.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { getPortalUi } from '../../features/portals/utils/portalTranslation.js';
import {
  ArrowLeft,
  ShieldCheck,
  Volume2,
  Smile,
  Layers
} from 'lucide-react';

export const AshaDemoPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const ui = getPortalUi(language);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF8FF] via-[#F3EDFF] to-[#E9DEFF] flex flex-col">
      {/* Demo Page Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-purple-100 px-4 md:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate('/patient')}
              className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 transition flex items-center gap-1.5 text-xs font-bold"
              title={ui.demoReturnTitle}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{ui.demoReturn}</span>
            </button>

            <div className="h-6 w-px bg-purple-200 hidden sm:block" />

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg md:text-xl text-gray-900 tracking-tight">
                  {t('ai.companion_asha')} 2D
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {ui.demoLive}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                {ui.demoSub}
              </p>
            </div>
          </div>

          {/* Quick Dashboard Links */}
          <div className="flex items-center gap-2 flex-wrap">
            <LanguageSwitcherPill />
            <button
              type="button"
              onClick={() => navigate('/patient')}
              className="px-3 py-1.5 rounded-xl bg-purple-100/70 hover:bg-purple-100 text-purple-800 text-xs font-bold transition"
            >
              {ui.demoPatientBtn}
            </button>
            <button
              type="button"
              onClick={() => navigate('/caregiver')}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition border border-emerald-200"
            >
              {ui.demoCaregiverBtn}
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition border border-gray-200"
            >
              {ui.demoLoginBtn}
            </button>
          </div>
        </div>
      </header>

      {/* Main Companion Showcase */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center">
        {/* Verification Overview Banner */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl border border-purple-100 shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 font-semibold">{ui.demoCard1Label}</div>
              <div className="text-xs font-bold text-gray-900">{ui.demoCard1Val}</div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl border border-purple-100 shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Smile className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 font-semibold">{ui.demoCard2Label}</div>
              <div className="text-xs font-bold text-gray-900">{ui.demoCard2Val}</div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl border border-purple-100 shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 font-semibold">{ui.demoCard3Label}</div>
              <div className="text-xs font-bold text-gray-900">{ui.demoCard3Val}</div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl border border-purple-100 shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 font-semibold">{ui.demoCard4Label}</div>
              <div className="text-xs font-bold text-gray-900">{ui.demoCard4Val}</div>
            </div>
          </div>
        </div>

        {/* 2D Companion Interactive Studio */}
        <AshaInteractiveCompanion2D showControls={true} />
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-100/60 py-4 px-6 text-center text-xs text-gray-500">
        {ui.demoFooter}
      </footer>
    </div>
  );
};
