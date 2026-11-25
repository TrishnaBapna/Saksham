import React from 'react';
import { GameCategory } from '../../../types/index.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import {
  Brain,
  Sparkles,
  Search,
  Calendar,
  Shapes,
  BookOpen,
  Camera,
  History
} from 'lucide-react';

interface GameCategoryFilterProps {
  activeCategory: GameCategory | 'all' | 'history';
  onSelectCategory: (cat: GameCategory | 'all' | 'history') => void;
  historyCount?: number;
}

export const GameCategoryFilter: React.FC<GameCategoryFilterProps> = ({
  activeCategory,
  onSelectCategory,
  historyCount = 0
}) => {
  const { t } = useLanguage();

  const categories: {
    id: GameCategory | 'all' | 'history';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'all', label: t('games.filter_all') || 'All Activities', icon: Brain },
    { id: 'memory', label: t('games.filter_memory') || 'Memory & Recall', icon: Sparkles },
    { id: 'attention', label: t('games.filter_attention') || 'Attention', icon: Search },
    { id: 'sequence', label: t('games.filter_daily') || 'Sequencing', icon: Calendar },
    { id: 'pattern', label: t('games.filter_patterns') || 'Patterns', icon: Shapes },
    { id: 'language', label: t('games.filter_language') || 'Language', icon: BookOpen },
    { id: 'objects', label: t('games.filter_objects') || 'Everyday & Room', icon: Camera },
    { id: 'history', label: `${t('games.filter_history') || 'My History'} (${historyCount})`, icon: History }
  ];

  return (
    <div
      className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none"
      role="tablist"
      aria-label={t('games.categories_aria')}
    >
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isActive = activeCategory === cat.id;

        return (
          <button
            key={cat.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectCategory(cat.id)}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 shadow-2xs ${
              isActive
                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-300'
                : 'bg-white text-purple-900 border border-purple-200 hover:bg-lavender-50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
};
