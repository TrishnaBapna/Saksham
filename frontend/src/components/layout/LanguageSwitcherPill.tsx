import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, SupportedLanguage, LANGUAGE_OPTIONS } from '../../context/LanguageContext.js';

interface LanguageSwitcherPillProps {
  className?: string;
}

export const LanguageSwitcherPill: React.FC<LanguageSwitcherPillProps> = ({ className = '' }) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      className={`inline-flex items-center bg-white/95 backdrop-blur-sm border border-purple-200 hover:border-purple-400 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-800 shadow-xs transition ${className}`}
    >
      <Globe className="w-3.5 h-3.5 text-purple-600 mr-1.5 flex-shrink-0" aria-hidden="true" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
        className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
        aria-label={t('topbar.select_language_aria')}
        title={t('topbar.select_language_aria')}
        data-testid="auth-language-switcher"
      >
        {LANGUAGE_OPTIONS.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.nativeName} ({opt.name})
          </option>
        ))}
      </select>
    </div>
  );
};
