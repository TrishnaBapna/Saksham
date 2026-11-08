/**
 * SAKSHAM — PAN-INDIA LOCALIZATION ARCHITECTURE (MILESTONE 5)
 * Supported languages: English + 22 Eighth Schedule Indian Languages
 */

export type SupportedLanguage =
  | 'en' // English
  | 'as' // Assamese (অসমীয়া)
  | 'bn' // Bengali (বাংলা)
  | 'brx' // Bodo (बड़ो)
  | 'doi' // Dogri (डोगरी)
  | 'gu' // Gujarati (ગુજરાતી)
  | 'hi' // Hindi (हिन्दी)
  | 'kn' // Kannada (ಕನ್ನಡ)
  | 'ks' // Kashmiri (كٲشُر / कॉशुर)
  | 'kok' // Konkani (कोंकणी)
  | 'mai' // Maithili (मैथिली)
  | 'ml' // Malayalam (മലയാളം)
  | 'mni' // Manipuri / Meitei (ꯃꯤꯇꯩꯂꯣꯟ / মৈতৈলোন্)
  | 'mr' // Marathi (मराठी)
  | 'ne' // Nepali (नेपाली)
  | 'or' // Odia (ଓଡ଼ିଆ)
  | 'pa' // Punjabi (ਪੰਜਾਬੀ)
  | 'sa' // Sanskrit (संस्कृतम्)
  | 'sat' // Santali (ᱥᱟᱱᱛᱟᱲᱤ)
  | 'sd' // Sindhi (سنڌي)
  | 'ta' // Tamil (தமிழ்)
  | 'te' // Telugu (తెలుగు)
  | 'ur'; // Urdu (اردو)

export type TextDirection = 'ltr' | 'rtl';

export type ScriptType =
  | 'Latin'
  | 'Bengali'
  | 'Bengali-Assamese'
  | 'Devanagari'
  | 'Gujarati'
  | 'Gurmukhi'
  | 'Kannada'
  | 'Malayalam'
  | 'Meitei Mayek'
  | 'Odia'
  | 'Ol Chiki'
  | 'Perso-Arabic'
  | 'Tamil'
  | 'Telugu';

export type ReviewStatus =
  | 'clinically_reviewed'
  | 'native_reviewed'
  | 'curated_standard';

export interface LanguageMetadata {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  script: ScriptType;
  direction: TextDirection;
  bcp47: string;
  reviewStatus: ReviewStatus;
  speechSupport: {
    ttsStandard: boolean;
    sttStandard: boolean;
  };
  welcomeGreeting: string;
  sampleText: string;
}

export type TranslationDictionary = Record<string, string>;
