import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext.js';
import { Home, CalendarCheck, Users, Gamepad2, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const navItems = [
    { path: '/patient', label: t('nav.home'), icon: Home, exact: true },
    { path: '/patient/routines', label: t('nav.routines'), icon: CalendarCheck },
    { path: '/patient/loved-ones', label: t('nav.family'), icon: Users },
    { path: '/patient/mind-games', label: t('nav.games'), icon: Gamepad2 },
    { path: '/patient/profile', label: t('nav.profile'), icon: User },
  ];

  const isActive = (itemPath: string, exact?: boolean) => {
    if (exact) return location.pathname === itemPath;
    return location.pathname.startsWith(itemPath);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-purple-100 py-2 px-3 shadow-lg"
      aria-label="Patient Bottom Navigation"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.exact);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 min-w-[56px] min-h-[50px] ${
                active
                  ? 'text-purple-700 bg-purple-50 font-bold scale-105'
                  : 'text-gray-500 hover:text-purple-600 hover:bg-gray-50 font-medium'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={`w-5 h-5 mb-0.5 transition-transform ${active ? 'scale-110 text-purple-700' : ''}`} />
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
