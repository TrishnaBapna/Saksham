import { SupportedLanguage, TranslationDictionary } from './types.js';
import { getLanguageMetadata } from './languages.js';
import { enTranslations } from './locales/en.js';
import { hiTranslations } from './locales/hi.js';
import { bnTranslations } from './locales/bn.js';
import { taTranslations } from './locales/ta.js';
import { teTranslations } from './locales/te.js';
import { mrTranslations } from './locales/mr.js';
import { guTranslations } from './locales/gu.js';
import { knTranslations } from './locales/kn.js';
import { mlTranslations } from './locales/ml.js';
import { paTranslations } from './locales/pa.js';
import { orTranslations } from './locales/or.js';
import { asTranslations } from './locales/as.js';
import { urTranslations } from './locales/ur.js';
import { ksTranslations } from './locales/ks.js';
import { sdTranslations } from './locales/sd.js';
import { saTranslations } from './locales/sa.js';
import { neTranslations } from './locales/ne.js';
import { kokTranslations } from './locales/kok.js';
import { maiTranslations } from './locales/mai.js';
import { doiTranslations } from './locales/doi.js';
import { brxTranslations } from './locales/brx.js';
import { satTranslations } from './locales/sat.js';
import { mniTranslations } from './locales/mni.js';

export const TRANSLATION_CATALOGUE: Record<SupportedLanguage, TranslationDictionary> = {
  en: enTranslations,
  hi: hiTranslations,
  bn: bnTranslations,
  ta: taTranslations,
  te: teTranslations,
  mr: mrTranslations,
  gu: guTranslations,
  kn: knTranslations,
  ml: mlTranslations,
  pa: paTranslations,
  or: orTranslations,
  as: asTranslations,
  ur: urTranslations,
  ks: ksTranslations,
  sd: sdTranslations,
  sa: saTranslations,
  ne: neTranslations,
  kok: kokTranslations,
  mai: maiTranslations,
  doi: doiTranslations,
  brx: brxTranslations,
  sat: satTranslations,
  mni: mniTranslations,
};

/**
 * Core translation lookup with interpolation and graceful English fallback.
 */
export function translate(
  lang: SupportedLanguage,
  key: string,
  params?: Record<string, string | number>,
  count?: number
): string {
  const dictionary = TRANSLATION_CATALOGUE[lang] || enTranslations;

  // Check plural key if count is provided and key_plural exists
  let template = dictionary[key];
  if (count !== undefined && count === 1 && dictionary[`${key}_one`]) {
    template = dictionary[`${key}_one`];
  } else if (count !== undefined && count > 1 && dictionary[`${key}_other`]) {
    template = dictionary[`${key}_other`];
  }

  // Safe fallback to English dictionary
  if (!template) {
    template = enTranslations[key] || key;
  }

  // Parameter interpolation e.g. {name}, {count}, {step}, {total}
  if (params) {
    let result = template;
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
    return result;
  }

  return template;
}

/**
 * Localized date formatting for calming neuro-care headers
 */
export function formatDate(
  dateOrLang: Date | number | SupportedLanguage,
  langOrDate?: SupportedLanguage | Date | number,
  options?: Intl.DateTimeFormatOptions
): string {
  let date: Date;
  let lang: SupportedLanguage = 'en';

  if (dateOrLang instanceof Date || typeof dateOrLang === 'number') {
    date = typeof dateOrLang === 'number' ? new Date(dateOrLang) : dateOrLang;
    if (typeof langOrDate === 'string') lang = langOrDate as SupportedLanguage;
  } else {
    lang = dateOrLang as SupportedLanguage;
    date = langOrDate instanceof Date ? langOrDate : typeof langOrDate === 'number' ? new Date(langOrDate) : new Date();
  }

  const meta = getLanguageMetadata(lang);
  const defaultOptions: Intl.DateTimeFormatOptions = options || {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  };

  try {
    return new Intl.DateTimeFormat(meta.bcp47, defaultOptions).format(date);
  } catch {
    return date.toLocaleDateString ? date.toLocaleDateString('en-US', defaultOptions) : String(date);
  }
}

/**
 * Localized time formatting
 */
export function formatTime(
  dateOrLang: Date | number | SupportedLanguage,
  langOrDate?: SupportedLanguage | Date | number
): string {
  let date: Date;
  let lang: SupportedLanguage = 'en';

  if (dateOrLang instanceof Date || typeof dateOrLang === 'number') {
    date = typeof dateOrLang === 'number' ? new Date(dateOrLang) : dateOrLang;
    if (typeof langOrDate === 'string') lang = langOrDate as SupportedLanguage;
  } else {
    lang = dateOrLang as SupportedLanguage;
    date = langOrDate instanceof Date ? langOrDate : typeof langOrDate === 'number' ? new Date(langOrDate) : new Date();
  }

  const meta = getLanguageMetadata(lang);
  try {
    return new Intl.DateTimeFormat(meta.bcp47, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleTimeString ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  }
}

/**
 * Localized number formatting
 */
export function formatNumber(
  numOrLang: number | SupportedLanguage,
  langOrNum?: SupportedLanguage | number
): string {
  let num: number = 0;
  let lang: SupportedLanguage = 'en';

  if (typeof numOrLang === 'number') {
    num = numOrLang;
    if (typeof langOrNum === 'string') lang = langOrNum as SupportedLanguage;
  } else {
    lang = numOrLang as SupportedLanguage;
    if (typeof langOrNum === 'number') num = langOrNum;
  }

  const meta = getLanguageMetadata(lang);
  try {
    return new Intl.NumberFormat(meta.bcp47).format(num);
  } catch {
    return String(num);
  }
}

/**
 * Validate translation coverage across all 23 languages
 */
export function validateTranslationCompleteness(): Record<
  SupportedLanguage,
  { translated: number; total: number; percentage: number }
> {
  const canonicalKeys = Object.keys(enTranslations);
  const total = canonicalKeys.length;
  const result: any = {};

  for (const [langCode, dict] of Object.entries(TRANSLATION_CATALOGUE)) {
    let count = 0;
    for (const key of canonicalKeys) {
      if (dict[key] && dict[key].trim().length > 0) {
        count++;
      }
    }
    result[langCode] = {
      translated: count,
      total,
      percentage: Math.round((count / total) * 100),
    };
  }

  return result;
}
