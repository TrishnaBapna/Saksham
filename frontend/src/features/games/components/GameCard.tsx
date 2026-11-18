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
  Play,
  Clock
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
        return <Sparkles className="w-6 h-6 text-yellow-500" />;
      case 'Brain':
        return <Brain className="w-6 h-6 text-purple-600" />;
      case 'Heart':
        return <Heart className="w-6 h-6 text-rose-500" />;
      case 'Search':
        return <Search className="w-6 h-6 text-blue-500" />;
      case 'Eye':
        return <Eye className="w-6 h-6 text-teal-500" />;
      case 'Calendar':
        return <Calendar className="w-6 h-6 text-amber-500" />;
      case 'Music':
        return <Music className="w-6 h-6 text-indigo-500" />;
      case 'Shapes':
        return <Shapes className="w-6 h-6 text-fuchsia-500" />;
      case 'Compass':
        return <Compass className="w-6 h-6 text-cyan-500" />;
      case 'BookOpen':
        return <BookOpen className="w-6 h-6 text-emerald-500" />;
      case 'HelpCircle':
        return <HelpCircle className="w-6 h-6 text-purple-500" />;
      case 'CheckCircle':
        return <CheckCircle className="w-6 h-6 text-emerald-500" />;
      case 'Camera':
        return <Camera className="w-6 h-6 text-rose-500" />;
      default:
        return <Brain className="w-6 h-6 text-purple-600" />;
    }
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'Gentle':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Moderate':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Stimulating':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div
      className="bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple hover:shadow-elevated transition-all flex flex-col justify-between"
      role="article"
      aria-label={`${game.title} - ${game.categoryLabel}`}
    >
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-purple-800 bg-lavender-100 px-2.5 py-0.5 rounded-full border border-purple-200">
            {game.categoryLabel}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getDifficultyBadge(
              game.difficulty
            )}`}
          >
            {game.difficulty}
          </span>
        </div>

        {/* Title and Icon */}
        <div className="flex items-start space-x-3.5 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-lavender-50 border border-purple-100 flex items-center justify-center flex-shrink-0 shadow-2xs">
            {getIcon(game.iconName)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-saksham-darkText leading-snug">
              {game.title}
            </h3>
            <div className="flex items-center space-x-1 text-[11px] text-gray-500 mt-0.5">
              <Clock className="w-3 h-3 text-gray-400" />
              <span>~{game.estimatedMinutes} mins • Calm pace</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-600 leading-relaxed pt-1">
          {game.description}
        </p>

        {/* Benefits pills */}
        <div className="flex flex-wrap gap-1 pt-1">
          {game.benefits.map((b, i) => (
            <span
              key={i}
              className="text-[10px] text-gray-600 bg-purple-50/70 px-2 py-0.5 rounded-md border border-purple-100"
            >
              🌿 {b}
            </span>
          ))}
        </div>
      </div>

      {/* Play Button */}
      <div className="mt-5 pt-3 border-t border-purple-100 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">Supportive engagement</span>
        <button
          onClick={() => onPlay(game)}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition transform active:scale-95"
          aria-label={`Start activity: ${game.title}`}
        >
          <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
          <span>{t('games.play_now') || 'Play Activity'}</span>
        </button>
      </div>
    </div>
  );
};
