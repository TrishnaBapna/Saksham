import React from 'react';
import { GameItem } from '../../../types/index.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import {
  Sparkles,
  Brain,
  Heart,
  Search,
  Eye,
  Calendar,
  Music,
  Shapes,
  Compass,
  BookOpen,
  HelpCircle,
  CheckCircle,
  Camera,
  Play
} from 'lucide-react';

interface GameCardProps {
  game: GameItem;
  onPlay: (game: GameItem) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onPlay }) => {
  const { t } = useLanguage();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-7 h-7 text-yellow-600" aria-hidden="true" />;
      case 'Brain':
        return <Brain className="w-7 h-7 text-purple-600" aria-hidden="true" />;
      case 'Heart':
        return <Heart className="w-7 h-7 text-rose-500" aria-hidden="true" />;
      case 'Search':
        return <Search className="w-7 h-7 text-blue-600" aria-hidden="true" />;
      case 'Eye':
        return <Eye className="w-7 h-7 text-teal-600" aria-hidden="true" />;
      case 'Calendar':
        return <Calendar className="w-7 h-7 text-amber-600" aria-hidden="true" />;
      case 'Music':
        return <Music className="w-7 h-7 text-indigo-600" aria-hidden="true" />;
      case 'Shapes':
        return <Shapes className="w-7 h-7 text-fuchsia-600" aria-hidden="true" />;
      case 'Compass':
        return <Compass className="w-7 h-7 text-cyan-600" aria-hidden="true" />;
      case 'BookOpen':
        return <BookOpen className="w-7 h-7 text-emerald-600" aria-hidden="true" />;
      case 'HelpCircle':
        return <HelpCircle className="w-7 h-7 text-purple-600" aria-hidden="true" />;
      case 'CheckCircle':
        return <CheckCircle className="w-7 h-7 text-emerald-600" aria-hidden="true" />;
      case 'Camera':
        return <Camera className="w-7 h-7 text-rose-600" aria-hidden="true" />;
      default:
        return <Brain className="w-7 h-7 text-purple-600" aria-hidden="true" />;
    }
  };

  return (
    <div
      className="bg-white rounded-3xl p-5 sm:p-6 border border-purple-100 shadow-soft-purple hover:shadow-elevated transition-all flex flex-col justify-between focus-within:ring-2 focus-within:ring-purple-400"
      role="article"
      aria-label={`${t(`game.${game.id}.title`) || game.title} - ${t(`game.category.${game.category}`) || game.categoryLabel}`}
    >
      <div className="space-y-3">
        {/* Top: Category Pill */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-purple-800 bg-lavender-100 px-3 py-1 rounded-full border border-purple-200">
            {t(`game.category.${game.category}`) || game.categoryLabel}
          </span>
        </div>

        {/* Title and Prominent Icon */}
        <div className="flex items-start space-x-4 pt-1">
          <div className="w-14 h-14 rounded-2xl bg-lavender-50 border border-purple-100 flex items-center justify-center flex-shrink-0 shadow-2xs">
            {getIcon(game.iconName)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-base sm:text-lg text-saksham-darkText leading-snug">
              {t(`game.${game.id}.title`) || game.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mt-1">
              {t(`game.${game.id}.desc`) || game.description}
            </p>
          </div>
        </div>
      </div>

      {/* Large Accessible Play Target */}
      <div className="mt-5 pt-4 border-t border-purple-100 flex items-center justify-end">
        <button
          type="button"
          onClick={() => onPlay(game)}
          className="inline-flex items-center justify-center space-x-2 px-6 py-3 min-h-[48px] rounded-2xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-sm shadow-sm transition transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-purple-300 cursor-pointer"
          aria-label={`${t('games.play_now') || 'Play'}: ${t(`game.${game.id}.title`) || game.title}`}
        >
          <Play className="w-4 h-4 fill-white" aria-hidden="true" />
          <span>{t('games.play_now') || 'Play'}</span>
        </button>
      </div>
    </div>
  );
};
