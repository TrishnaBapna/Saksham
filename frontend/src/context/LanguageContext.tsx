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

export type ReadingPreference = 'text' | 'audio' | 'both';

export interface MultilingualPreferences {
  displayLanguage: SupportedLanguage;
  spokenInputLanguages: SupportedLanguage[];
  responseLanguage: SupportedLanguage;
  readingPreference: ReadingPreference;
  autoDetectSpokenLanguage: boolean;
  allowCodeSwitching: boolean;
}

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
  // Priority 1: Decoupled Multilingual Preferences
  preferences: MultilingualPreferences;
  displayLanguage: SupportedLanguage;
  spokenInputLanguages: SupportedLanguage[];
  responseLanguage: SupportedLanguage;
  readingPreference: ReadingPreference;
  autoDetectSpokenLanguage: boolean;
  allowCodeSwitching: boolean;
  setSpokenInputLanguages: (langs: SupportedLanguage[]) => void;
  setResponseLanguage: (lang: SupportedLanguage) => void;
  setReadingPreference: (pref: ReadingPreference) => void;
  setAutoDetectSpokenLanguage: (enabled: boolean) => void;
  setAllowCodeSwitching: (enabled: boolean) => void;
  updatePreferences: (partial: Partial<MultilingualPreferences>) => void;
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
  const multiPrefStorageKey = `saksham_multilingual_prefs_${userScopedId}`;

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

  // Priority 1: Decoupled Multilingual Preferences state
  const [preferences, setPreferencesState] = useState<MultilingualPreferences>(() => {
    const defaultPrefs: MultilingualPreferences = {
      displayLanguage: language,
      spokenInputLanguages: ['en', 'hi', 'mr'],
      responseLanguage: language,
      readingPreference: 'both',
      autoDetectSpokenLanguage: true,
      allowCodeSwitching: true,
    };
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(multiPrefStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            ...defaultPrefs,
            ...parsed,
            displayLanguage: parsed.displayLanguage || language,
            responseLanguage: parsed.responseLanguage || language,
          };
        }
      } catch {
        // Fallback to default
      }
    }
    return defaultPrefs;
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
      const initialLang = saved && LANGUAGE_MAP[saved] ? saved : 'en';
      setLanguageState(initialLang);

      try {
        const raw = window.localStorage.getItem(multiPrefStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          setPreferencesState({
            displayLanguage: parsed.displayLanguage || initialLang,
            spokenInputLanguages: parsed.spokenInputLanguages || ['en', 'hi', 'mr'],
            responseLanguage: parsed.responseLanguage || initialLang,
            readingPreference: parsed.readingPreference || 'both',
            autoDetectSpokenLanguage: parsed.autoDetectSpokenLanguage !== false,
            allowCodeSwitching: parsed.allowCodeSwitching !== false,
          });
        } else {
          setPreferencesState({
            displayLanguage: initialLang,
            spokenInputLanguages: ['en', 'hi', 'mr'],
            responseLanguage: initialLang,
            readingPreference: 'both',
            autoDetectSpokenLanguage: true,
            allowCodeSwitching: true,
          });
        }
      } catch {
        // storage error
      }

      const hasChosen = window.localStorage.getItem(hasSelectedKey);
      setIsLanguageModalOpen(!hasChosen);
    }
  }, [userScopedId, langStorageKey, hasSelectedKey, multiPrefStorageKey]);

  const savePreferences = (updated: MultilingualPreferences) => {
    setPreferencesState(updated);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(multiPrefStorageKey, JSON.stringify(updated));
      } catch {
        // storage error
      }
    }
  };

  const updatePreferences = (partial: Partial<MultilingualPreferences>) => {
    const updated: MultilingualPreferences = {
      ...preferences,
      ...partial,
    };
    savePreferences(updated);
  };

  const setSpokenInputLanguages = (langs: SupportedLanguage[]) => {
    updatePreferences({ spokenInputLanguages: langs });
  };

  const setResponseLanguage = (lang: SupportedLanguage) => {
    if (!LANGUAGE_MAP[lang]) return;
    updatePreferences({ responseLanguage: lang });
  };

  const setReadingPreference = (pref: ReadingPreference) => {
    updatePreferences({ readingPreference: pref });
  };

  const setAutoDetectSpokenLanguage = (enabled: boolean) => {
    updatePreferences({ autoDetectSpokenLanguage: enabled });
  };

  const setAllowCodeSwitching = (enabled: boolean) => {
    updatePreferences({ allowCodeSwitching: enabled });
  };

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
    updatePreferences({
      displayLanguage: newLang,
      responseLanguage: newLang,
    });
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
        // Decoupled Preferences
        preferences,
        displayLanguage: preferences.displayLanguage,
        spokenInputLanguages: preferences.spokenInputLanguages,
        responseLanguage: preferences.responseLanguage,
        readingPreference: preferences.readingPreference,
        autoDetectSpokenLanguage: preferences.autoDetectSpokenLanguage,
        allowCodeSwitching: preferences.allowCodeSwitching,
        setSpokenInputLanguages,
        setResponseLanguage,
        setReadingPreference,
        setAutoDetectSpokenLanguage,
        setAllowCodeSwitching,
        updatePreferences,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

const defaultPreferences: MultilingualPreferences = {
  displayLanguage: 'en',
  spokenInputLanguages: ['en', 'hi', 'mr'],
  responseLanguage: 'en',
  readingPreference: 'both',
  autoDetectSpokenLanguage: true,
  allowCodeSwitching: true,
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
  preferences: defaultPreferences,
  displayLanguage: 'en',
  spokenInputLanguages: ['en', 'hi', 'mr'],
  responseLanguage: 'en',
  readingPreference: 'both',
  autoDetectSpokenLanguage: true,
  allowCodeSwitching: true,
  setSpokenInputLanguages: () => {},
  setResponseLanguage: () => {},
  setReadingPreference: () => {},
  setAutoDetectSpokenLanguage: () => {},
  setAllowCodeSwitching: () => {},
  updatePreferences: () => {},
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    return defaultLanguageContext;
  }
  return context;
};
