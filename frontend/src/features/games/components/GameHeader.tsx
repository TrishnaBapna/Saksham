import React from 'react';
import { GameItem, GameDifficulty } from '../../../types/index.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { ArrowLeft, Pause, Play, RotateCcw, Clock, Sparkles, HelpCircle } from 'lucide-react';

interface GameHeaderProps {
  game: GameItem;
  currentDifficulty: GameDifficulty;
  onChangeDifficulty: (diff: GameDifficulty) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onRestart: () => void;
  onExit: () => void;
  elapsedSeconds: number;
  onHelp?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  game,
  currentDifficulty,
  onChangeDifficulty,
  isPaused,
  onTogglePause,
  onRestart,
  onExit,
  elapsedSeconds,
  onHelp
}) => {
  const { t, language } = useLanguage();
  const headerUi = (
    {
      hi: {
        exitAria: 'खेल से बाहर निकलें और दिमागी खेल सूची पर लौटें',
        exitTitle: 'गतिविधि बंद करें',
        elapsedAria: (time: string) => `बीता समय: ${time}`,
        helpAria: 'मदद और मार्गदर्शन',
        adaptiveTitle: 'कठिनाई आपकी सुविधा के अनुसार अपने आप बदलती है',
        switchDiff: 'कठिनाई स्तर बदलें',
        levelAria: (d: string) => `वर्तमान स्तर: ${d}। बदलने के लिए दबाएं।`,
        levelPrefix: 'स्तर:',
        resume: 'खेल फिर शुरू करें',
        pause: 'खेल रोकें',
        restart: 'गतिविधि फिर से शुरू करें',
        pausedBanner: '⏸️ गतिविधि रुकी हुई है। आराम से समय लें! तैयार होने पर ▶ फिर शुरू करें दबाएं।',
      },
      mr: {
        exitAria: 'खेळातून बाहेर पडा आणि मेंदूचे खेळ यादीवर परत या',
        exitTitle: 'उपक्रम बंद करा',
        elapsedAria: (time: string) => `गेलेला वेळ: ${time}`,
        helpAria: 'मदत आणि मार्गदर्शन',
        adaptiveTitle: 'तुमच्या सोयीनुसार काठिण्य आपोआप जुळते',
        switchDiff: 'काठिण्य पातळी बदला',
        levelAria: (d: string) => `सध्याची पातळी: ${d}. बदलण्यासाठी क्लिक करा.`,
        levelPrefix: 'पातळी:',
        resume: 'खेळ पुन्हा सुरू करा',
        pause: 'खेळ थांबवा',
        restart: 'उपक्रम पुन्हा सुरू करा',
        pausedBanner: '⏸️ उपक्रम थांबवला आहे. शांतपणे विश्रांती घ्या! तयार झाल्यावर ▶ पुन्हा सुरू करा वर टॅप करा.',
      },
      bn: {
        exitAria: 'খেলা থেকে বেরিয়ে মস্তিষ্কের খেলার তালিকায় ফিরুন',
        exitTitle: 'কার্যক্রম বন্ধ করুন',
        elapsedAria: (time: string) => `অতিবাহিত সময়: ${time}`,
        helpAria: 'সাহায্য ও নির্দেশনা',
        adaptiveTitle: 'আপনার স্বাচ্ছন্দ্য অনুযায়ী অসুবিধার স্তর স্বয়ংক্রিয়ভাবে পরিবর্তিত হয়',
        switchDiff: 'স্তর পরিবর্তন করুন',
        levelAria: (d: string) => `বর্তমান স্তর: ${d}। পরিবর্তন করতে ক্লিক করুন।`,
        levelPrefix: 'স্তর:',
        resume: 'খেলা চালু করুন',
        pause: 'খেলা থামান',
        restart: 'আবার শুরু করুন',
        pausedBanner: '⏸️ খেলাটি সাময়িকভাবে থামানো আছে। বিশ্রাম নিন! প্রস্তুত হলে ▶ চালু করুন চাপুন।',
      },
      ta: {
        exitAria: 'விளையாட்டிலிருந்து வெளியேறி பட்டியலுக்குத் திரும்பு',
        exitTitle: 'செயல்பாட்டை மூடு',
        elapsedAria: (time: string) => `கழிந்த நேரம்: ${time}`,
        helpAria: 'உதவி மற்றும் வழிகாட்டுதல்',
        adaptiveTitle: 'உங்கள் வசதிக்கு ஏற்ப நிலை தானாகவே மாறும்',
        switchDiff: 'நிலையை மாற்று',
        levelAria: (d: string) => `தற்போதைய நிலை: ${d}. மாற்ற அழுத்தவும்.`,
        levelPrefix: 'நிலை:',
        resume: 'விளையாட்டைத் தொடரவும்',
        pause: 'விளையாட்டை இடைநிறுத்து',
        restart: 'மீண்டும் தொடங்கு',
        pausedBanner: '⏸️ செயல்பாடு இடைநிறுத்தப்பட்டுள்ளது. ஓய்வெடுங்கள்! தயாரானதும் ▶ தொடரவும் என்பதைத் தட்டவும்.',
      },
      te: {
        exitAria: 'ఆట నుండి బయటకు వచ్చి మైండ్ గేమ్స్ జాబితాకు వెళ్లండి',
        exitTitle: 'కార్యకలాపాన్ని మూసివేయండి',
        elapsedAria: (time: string) => `గడిచిన సమయం: ${time}`,
        helpAria: 'సహాయం మరియు మార్గదర్శనం',
        adaptiveTitle: 'మీ సౌకర్యాన్ని బట్టి స్థాయి ఆటోమేటిక్‌గా మారుతుంది',
        switchDiff: 'స్థాయిని మార్చండి',
        levelAria: (d: string) => `ప్రస్తుత స్థాయి: ${d}. మార్చడానికి నొక్కండి.`,
        levelPrefix: 'స్థాయి:',
        resume: 'ఆటను కొనసాగించండి',
        pause: 'ఆటను ఆపండి',
        restart: 'మళ్లీ ప్రారంభించండి',
        pausedBanner: '⏸️ ఆట ఆపబడింది. విశ్రాంతి తీసుకోండి! సిద్ధంగా ఉన్నప్పుడు ▶ కొనసాగించండి నొక్కండి.',
      },
      kn: {
        exitAria: 'ಆಟದಿಂದ ಹೊರಬಂದು ಮೈಂಡ್ ಗೇಮ್ಸ್ ಪಟ್ಟಿಗೆ ಹಿಂತಿರುಗಿ',
        exitTitle: 'ಚಟುವಟಿಕೆಯನ್ನು ಮುಚ್ಚಿ',
        elapsedAria: (time: string) => `ಕಳೆದ ಸಮಯ: ${time}`,
        helpAria: 'ಸಹಾಯ ಮತ್ತು ಮಾರ್ಗದರ್ಶನ',
        adaptiveTitle: 'ನಿಮ್ಮ ಅನುಕೂಲಕ್ಕೆ ತಕ್ಕಂತೆ ಕಠಿಣತೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಬದಲಾಗುತ್ತದೆ',
        switchDiff: 'ಹಂತ ಬದಲಾಯಿಸಿ',
        levelAria: (d: string) => `ಪ್ರಸ್ತುತ ಹಂತ: ${d}. ಬದಲಾಯಿಸಲು ಒತ್ತಿರಿ.`,
        levelPrefix: 'ಹಂತ:',
        resume: 'ಆಟ ಮುಂದುವರಿಸಿ',
        pause: 'ಆಟ ವಿರಾಮಗೊಳಿಸಿ',
        restart: 'ಮತ್ತೆ ಪ್ರಾರಂಭಿಸಿ',
        pausedBanner: '⏸️ ಚಟುವಟಿಕೆಯನ್ನು ವಿರಾಮಗೊಳಿಸಲಾಗಿದೆ. ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ! ಸಿದ್ಧವಾದಾಗ ▶ ಮುಂದುವರಿಸಿ ಒತ್ತಿರಿ.',
      },
    } as Record<string, any>
  )[language] || {
    exitAria: 'Exit game and return to Mind Games library',
    exitTitle: 'Exit activity',
    elapsedAria: (time: string) => `Time elapsed: ${time}`,
    helpAria: 'Help and orientation',
    adaptiveTitle: 'Difficulty adapts automatically to your comfort',
    switchDiff: 'Switch difficulty',
    levelAria: (d: string) => `Current difficulty: ${d}. Click to change.`,
    levelPrefix: 'Level:',
    resume: 'Resume game',
    pause: 'Pause game',
    restart: 'Restart activity',
    pausedBanner: '⏸️ Activity is paused. Take your time to rest! Tap ▶ Resume whenever you are ready.',
  };
  const localizedDiff = t(`games.difficulty_${currentDifficulty.toLowerCase()}` as any) || currentDifficulty;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const difficulties: GameDifficulty[] = ['Gentle', 'Moderate', 'Stimulating'];

  const cycleDifficulty = () => {
    const idx = difficulties.indexOf(currentDifficulty);
    const next = difficulties[(idx + 1) % difficulties.length];
    onChangeDifficulty(next);
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-purple-200 shadow-soft-purple space-y-3">
      {/* Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-3">
          {/* Predictable, Clearly Labeled Exit Action */}
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center space-x-1.5 px-3 py-2 min-h-[44px] rounded-2xl bg-lavender-50 border border-purple-200 text-purple-900 hover:bg-lavender-100 transition shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
            aria-label={headerUi.exitAria}
            title={headerUi.exitTitle}
          >
            <ArrowLeft className="w-4 h-4 text-purple-700" aria-hidden="true" />
            <span className="font-bold text-xs">{t('games.back_to_games') || 'Back to games'}</span>
          </button>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-saksham-darkText">
              {t(`game.${game.id}.title`) || game.title}
            </h2>
            <div className="flex items-center space-x-2 text-[11px] text-gray-500">
              <span className="font-semibold text-purple-700">{t(`game.category.${game.category}`) || game.categoryLabel}</span>
              <span>•</span>
              <span className="flex items-center space-x-1" aria-label={headerUi.elapsedAria(formatTime(elapsedSeconds))}>
                <Clock className="w-3 h-3 text-gray-400" aria-hidden="true" />
                <span>{formatTime(elapsedSeconds)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Reorientation / Help Action */}
          {onHelp && (
            <button
              type="button"
              onClick={onHelp}
              className="inline-flex items-center space-x-1 px-3 py-2 min-h-[44px] rounded-2xl bg-lavender-50 hover:bg-lavender-100 border border-purple-200 text-purple-800 font-bold text-xs transition shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-300 cursor-pointer"
              aria-label={headerUi.helpAria}
              title={headerUi.helpAria}
            >
              <HelpCircle className="w-4 h-4 text-purple-600" aria-hidden="true" />
              <span>{t('games.help_button') || 'Help'}</span>
            </button>
          )}

          {/* Subtle Auto-Adaptive Indicator */}
          <span
            className="hidden sm:inline-flex px-2.5 py-1.5 rounded-xl border border-purple-200 bg-lavender-50 text-[11px] font-bold text-purple-900 shadow-2xs items-center gap-1"
            title={headerUi.adaptiveTitle}
          >
            <Sparkles className="w-3 h-3 text-purple-600" aria-hidden="true" />
            <span>{t('games.auto_adaptive') || 'Auto-Adaptive'}</span>
          </span>

          {/* Accessible / Test override hook (hidden from patient visual interface) */}
          <button
            onClick={cycleDifficulty}
            className="sr-only"
            title={headerUi.switchDiff}
            aria-label={headerUi.levelAria(localizedDiff)}
          >
            {headerUi.levelPrefix} {localizedDiff}
          </button>

          {/* Pause / Resume */}
          <button
            type="button"
            onClick={onTogglePause}
            className={`p-2.5 min-h-[44px] min-w-[44px] rounded-2xl flex items-center justify-center transition cursor-pointer ${
              isPaused
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-lavender-50 hover:bg-lavender-100 text-purple-700 border border-purple-200 shadow-2xs'
            }`}
            title={isPaused ? headerUi.resume : headerUi.pause}
            aria-label={isPaused ? headerUi.resume : headerUi.pause}
          >
            {isPaused ? <Play className="w-4 h-4 ml-0.5" aria-hidden="true" /> : <Pause className="w-4 h-4" aria-hidden="true" />}
          </button>

          {/* Restart */}
          <button
            type="button"
            onClick={onRestart}
            className="p-2.5 min-h-[44px] min-w-[44px] rounded-2xl bg-lavender-50 hover:bg-lavender-100 text-purple-700 border border-purple-200 flex items-center justify-center transition shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-300"
            title={headerUi.restart}
            aria-label={headerUi.restart}
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {isPaused && (
        <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-xs text-amber-900 text-center font-medium animate-fadeIn">
          {headerUi.pausedBanner}
        </div>
      )}
    </div>
  );
};
