/**
 * SAKSHAM — STAGE 3 PHASE C: NOTIFICATION BELL COMPONENT
 * Accessible TopBar notification bell with unread badge and dropdown list.
 * 100% Spark Free Plan compliant — zero external push SDKs.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Sparkles, X } from 'lucide-react';
import { InAppNotification } from '../types/notification.types.js';
import { NotificationService } from '../services/notificationService.js';
import { useAuth } from '../../../context/AuthContext.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getEffectivePatientId } from '../../auth/services/identityService.js';

interface NotificationBellProps {
  patientId?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ patientId: propPatientId }) => {
  const { currentUser, role } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const targetPatientId = propPatientId || getEffectivePatientId(currentUser);
  const currentRole = (role as 'patient' | 'caregiver' | 'doctor') || 'patient';

  const [notifications, setNotifications] = useState<InAppNotification[]>(() =>
    NotificationService.getNotifications(targetPatientId, currentRole)
  );

  const refreshNotifications = () => {
    const list = NotificationService.getNotifications(targetPatientId, currentRole);
    setNotifications(list);
  };

  useEffect(() => {
    refreshNotifications();
    const unsubscribe = NotificationService.subscribe(() => {
      refreshNotifications();
    });
    return () => unsubscribe();
  }, [targetPatientId, currentRole]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    await NotificationService.markAsRead(targetPatientId, id);
    refreshNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await NotificationService.markAllAsRead(targetPatientId, currentRole);
    refreshNotifications();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        data-testid="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl border border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-700 bg-white transition cursor-pointer shadow-2xs"
        aria-label={t('notifications.unread_aria', { count: unreadCount })}
        title={t('notifications.unread_aria', { count: unreadCount })}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            data-testid="notification-unread-badge"
            className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 text-white rounded-full text-[10px] font-black flex items-center justify-center animate-pulse shadow-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          data-testid="notification-dropdown-panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-purple-100 p-4 z-50 animate-in fade-in slide-in-from-top-2"
          role="region"
          aria-label={t('notifications.title')}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-gray-900">{t('notifications.title')}</h3>
              {unreadCount > 0 && (
                <span className="text-3xs font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                  {t('notifications.unread_count', { count: unreadCount })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  data-testid="mark-all-read-btn"
                  onClick={handleMarkAllAsRead}
                  className="text-2xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-purple-50 transition cursor-pointer"
                  title={t('notifications.mark_all_read')}
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>{t('notifications.mark_all_read')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                aria-label={t('notifications.close_aria')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="mt-2 divide-y divide-gray-100 max-h-72 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                {t('notifications.empty')}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  data-testid={`notification-item-${n.id}`}
                  onClick={() => !n.read && handleMarkAsRead(n.id)}
                  className={`py-2.5 px-2 rounded-xl transition cursor-pointer flex items-start justify-between gap-2.5 ${
                    n.read ? 'hover:bg-gray-50 opacity-75' : 'bg-purple-50/50 hover:bg-purple-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      {!n.read && (
                        <span
                          data-testid="unread-dot"
                          className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0"
                        />
                      )}
                      <h4 className="text-xs font-bold text-gray-900">{n.title}</h4>
                    </div>
                    <p className="text-2xs text-gray-600 leading-relaxed">{n.message}</p>
                    <span className="text-3xs text-gray-400 block pt-0.5">
                      {new Date(n.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
