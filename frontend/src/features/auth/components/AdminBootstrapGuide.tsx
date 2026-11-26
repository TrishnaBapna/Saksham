import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck, KeyRound, Database } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getGovernanceUi } from '../../portals/utils/governanceTranslation.js';

export const AdminBootstrapGuide: React.FC = () => {
  const { language } = useLanguage();
  const ui = getGovernanceUi(language);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      data-testid="admin-bootstrap-guide"
      className="max-w-md mx-auto mt-4 bg-white/95 rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
        aria-expanded={isOpen}
      >
        <span className="flex items-center space-x-2">
          <KeyRound className="w-4 h-4 text-slate-700" />
          <span>{ui.adminBootstrapTitle}</span>
        </span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 text-xs text-slate-700 space-y-2.5">
          <p className="text-[11px] leading-relaxed text-slate-600">
            {ui.adminBootstrapIntro}
          </p>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
            <div className="flex items-center space-x-1.5 font-sans font-bold text-slate-800 mb-1">
              <Database className="w-3.5 h-3.5 text-slate-700" />
              <span>{ui.adminBootstrapFirestoreTitle}</span>
            </div>
            <div>Collection: <span className="font-bold text-slate-900">users</span></div>
            <div>Document ID: <span className="font-bold text-slate-900">&lt;Firebase Auth UID&gt;</span></div>
            <div>role: <span className="text-emerald-700 font-bold">"admin"</span></div>
            <div>status: <span className="text-emerald-700 font-bold">"verified"</span></div>
            <div>uid: <span className="text-slate-900">&lt;Firebase Auth UID&gt;</span></div>
            <div>email: <span className="text-slate-900">&lt;admin email&gt;</span></div>
            <div>displayName: <span className="text-slate-900">"Saksham Administrator"</span></div>
          </div>

          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-950 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <span>{ui.adminBootstrapSecurityNote}</span>
          </div>
        </div>
      )}
    </div>
  );
};
