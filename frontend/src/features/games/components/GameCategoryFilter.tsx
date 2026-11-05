import React from 'react';
import { GameCategory } from '../../../types/index.js';
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
  const categories: {
    id: GameCategory | 'all' | 'history';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'all', label: 'All Activities', icon: Brain },
    { id: 'memory', label: 'Memory & Recall', icon: Sparkles },
    { id: 'attention', label: 'Attention', icon: Search },
    { id: 'sequence', label: 'Sequencing', icon: Calendar },
    { id: 'pattern', label: 'Patterns', icon: Shapes },
    { id: 'language', label: 'Language', icon: BookOpen },
    { id: 'objects', label: 'Everyday & Room', icon: Camera },
    { id: 'history', label: `My History (${historyCount})`, icon: History }
  ];

  return (
    <div
      className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none"
      role="tablist"
      aria-label="Cognitive game categories"
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
