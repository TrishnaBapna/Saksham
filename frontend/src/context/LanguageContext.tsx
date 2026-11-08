import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext.js';
import {
  SupportedLanguage,
  LanguageMetadata,
  ALL_LANGUAGES,
  LANGUAGE_MAP,
  getLanguageMetadata,
  isRTLLanguage,
  translate,
  formatDate as formatI18nDate,
  formatTime as formatI18nTime,
  formatNumber as formatI18nNumber,
} from '../i18n/index.js';

export type { SupportedLanguage, LanguageMetadata };

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  script?: string;
  direction?: 'ltr' | 'rtl';
}

export const LANGUAGE_OPTIONS: LanguageOption[] = ALL_LANGUAGES.map((l) => ({
  code: l.code,
  name: l.name,
  nativeName: l.nativeName,
  script: l.script,
  direction: l.direction,
}));

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  languageMeta: LanguageMetadata;
  isRTL: boolean;
  t: (key: string, params?: Record<string, string | number>, count?: number) => string;
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date) => string;
  formatNumber: (num: number) => string;
  allLanguages: LanguageMetadata[];
  previewLanguage: SupportedLanguage | null;
  setPreviewLanguage: (lang: SupportedLanguage | null) => void;
  isLanguageModalOpen: boolean;
  setIsLanguageModalOpen: (open: boolean) => void;
  confirmLanguage: (lang: SupportedLanguage) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  let authContext: any = null;
  try {
    authContext = useAuth();
  } catch {
    authContext = null;
  }
  const currentUser = authContext?.currentUser ?? null;
  const userScopedId = currentUser?.uid ? `user_${currentUser.uid}` : 'guest';

  // Account-scoped storage keys
  const langStorageKey = `saksham_lang_${userScopedId}`;
  const hasSelectedKey = `saksham_has_selected_lang_${userScopedId}`;

  // Initial language resolution: account-scoped -> default 'en'
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(langStorageKey) as SupportedLanguage | null;
      if (saved && LANGUAGE_MAP[saved]) {
        return saved;
      }
    }
    return 'en';
  });

  const [previewLanguage, setPreviewLanguage] = useState<SupportedLanguage | null>(null);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState<boolean>(() => {
    // Only prompt welcoming modal if the user has never confirmed a language preference
    if (typeof window !== 'undefined' && window.localStorage) {
      const hasChosen = window.localStorage.getItem(hasSelectedKey);
      return !hasChosen;
    }
    return false;
  });

  // Keep state synchronized when switching accounts or logging in
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(langStorageKey) as SupportedLanguage | null;
      if (saved && LANGUAGE_MAP[saved]) {
        setLanguageState(saved);
      } else {
        setLanguageState('en');
      }

      const hasChosen = window.localStorage.getItem(hasSelectedKey);
      setIsLanguageModalOpen(!hasChosen);
    }
  }, [userScopedId, langStorageKey, hasSelectedKey]);

  // Apply document direction and language code to root HTML element
  const activeLanguage = previewLanguage || language;
  const languageMeta = getLanguageMetadata(activeLanguage);
  const isRTL = isRTLLanguage(activeLanguage);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = languageMeta.code;
      document.documentElement.dir = languageMeta.direction;

      if (languageMeta.direction === 'rtl') {
        document.documentElement.classList.add('rtl-mode');
      } else {
        document.documentElement.classList.remove('rtl-mode');
      }
    }
  }, [languageMeta]);

  const setLanguage = (newLang: SupportedLanguage) => {
    if (!LANGUAGE_MAP[newLang]) return;
    setLanguageState(newLang);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(langStorageKey, newLang);
      window.localStorage.setItem(hasSelectedKey, 'true');
    }
  };

  const confirmLanguage = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    setPreviewLanguage(null);
    setIsLanguageModalOpen(false);
  };

  const t = (key: string, params?: Record<string, string | number>, count?: number): string => {
    return translate(activeLanguage, key, params, count);
  };

  const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
    return formatI18nDate(date, activeLanguage, options);
  };

  const formatTime = (date: Date): string => {
    return formatI18nTime(date, activeLanguage);
  };

  const formatNumber = (num: number): string => {
    return formatI18nNumber(num, activeLanguage);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        languageMeta,
        isRTL,
        t,
        formatDate,
        formatTime,
        formatNumber,
        allLanguages: ALL_LANGUAGES,
        previewLanguage,
        setPreviewLanguage,
        isLanguageModalOpen,
        setIsLanguageModalOpen,
        confirmLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

const defaultLanguageContext: LanguageContextType = {
  language: 'en',
  setLanguage: () => {},
  isRTL: false,
  languageMeta: ALL_LANGUAGES[0],
  allLanguages: ALL_LANGUAGES,
  t: (key: string, params?: Record<string, string | number>) => translate('en', key, params),
  previewLanguage: 'en',
  setPreviewLanguage: () => {},
  isLanguageModalOpen: false,
  setIsLanguageModalOpen: () => {},
  confirmLanguage: () => {},
  formatDate: (date: Date | number, options?: Intl.DateTimeFormatOptions) => formatI18nDate(date, 'en', options),
  formatTime: (date: Date | number) => formatI18nTime(date, 'en'),
  formatNumber: (num: number) => formatI18nNumber(num, 'en'),
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    return defaultLanguageContext;
  }
  return context;
};
