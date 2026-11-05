import React, { createContext, useContext, useState } from 'react';

export type SupportedLanguage = 'en' | 'hi';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
}

const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    'app.title': 'Saksham',
    'app.tagline': 'Your Neuro-Care Companion',
    'patient.welcome': 'Namaste, Sunita! How are you feeling today?',
    'ai.input_placeholder': 'Ask Asha anything, or tap the microphone...',
    'ai.voice_start': 'Listening...',
    'ai.voice_stop': 'Tap to speak',
    'card.routines': 'Daily Routines & Care',
    'card.routines_sub': 'Assisted recall, medications & gentle daily schedules',
    'card.loved_ones': 'Loved Ones',
    'card.loved_ones_sub': 'Photographs, family memory cues & voice notes',
    'card.mind_games': 'Mind Games',
    'card.mind_games_sub': 'Memory matching, puzzles & Room Memory Game',
    'nav.home': 'Home',
    'nav.routines': 'Routines',
    'nav.family': 'Family',
    'nav.games': 'Games',
    'nav.profile': 'Profile',
    'btn.try_recall': 'Try Recall',
    'btn.mark_done': 'Mark as Done',
    'btn.completed': 'Completed',
    'reminder.title': 'Next Activity: 11:00 AM',
    'reminder.activity': 'Morning Hydration & Gentle Arm Stretches',
    'progress.weekly': 'Weekly Care Progress',
    'progress.streak': '4 days gentle streak',
  },
  hi: {
    'app.title': 'सक्षम (Saksham)',
    'app.tagline': 'आपका न्यूरो-केयर साथी',
    'patient.welcome': 'नमस्ते, सुनीता जी! आज आप कैसा महसूस कर रही हैं?',
    'ai.input_placeholder': 'आशा से कुछ भी पूछें, या माइक पर टैप करें...',
    'ai.voice_start': 'सुन रहे हैं...',
    'ai.voice_stop': 'बोलने के लिए टैप करें',
    'card.routines': 'दैनिक दिनचर्या और देखभाल',
    'card.routines_sub': 'सहायता प्राप्त याद, दवाइयाँ और दैनिक कार्य',
    'card.loved_ones': 'अपने प्रियजन (Loved Ones)',
    'card.loved_ones_sub': 'तस्वीरें, पारिवारिक यादें और आवाज़ के संदेश',
    'card.mind_games': 'दिमागी खेल (Mind Games)',
    'card.mind_games_sub': 'स्मृति अभ्यास, पहेलियाँ और कमरा स्मृति खेल',
    'nav.home': 'होम',
    'nav.routines': 'दिनचर्या',
    'nav.family': 'परिवार',
    'nav.games': 'खेल',
    'nav.profile': 'प्रोफ़ाइल',
    'btn.try_recall': 'याद करने का प्रयास करें',
    'btn.mark_done': 'पूर्ण चिह्नित करें',
    'btn.completed': 'पूर्ण हुआ',
    'reminder.title': 'अगली गतिविधि: सुबह 11:00 बजे',
    'reminder.activity': 'सुबह का पानी पीना और हल्का व्यायाम',
    'progress.weekly': 'साप्ताहिक देखभाल प्रगति',
    'progress.streak': '4 दिन का सौम्य क्रम',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<SupportedLanguage>('en');

  const t = (key: string): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
