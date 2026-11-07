import React, { useState, useEffect } from 'react';
import { ReminderSettings } from '../../../types/index.js';
import { RoutineService } from '../services/routineService.js';
import { audioSynthesizer } from '../../../services/audioSynthesizerService.js';
import {
  X,
  Bell,
  Moon,
  Volume2,
  Clock,
  Check,
} from 'lucide-react';

interface ReminderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
}

export const ReminderSettingsModal: React.FC<ReminderSettingsModalProps> = ({
  isOpen,
  onClose,
  patientId,
}) => {
  const [settings, setSettings] = useState<ReminderSettings>(() =>
    RoutineService.getReminderSettings(patientId)
  );

  const [notificationPerm, setNotificationPerm] = useState<NotificationPermission>('default');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotificationPerm(Notification.permission);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    if (typeof Notification !== 'undefined') {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPerm(perm);
        if (perm === 'granted') {
          audioSynthesizer.playChime('chime');
        }
      } catch (e) {
        console.warn('Notification permission error:', e);
      }
    }
  };

  const handleSave = () => {
    RoutineService.saveReminderSettings(patientId, settings);
    audioSynthesizer.setSoundEnabled(settings.soundEnabled);
    audioSynthesizer.playChime('bell');
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminder-settings-title"
    >
      <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-purple-100 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 id="reminder-settings-title" className="text-base font-bold text-saksham-darkText">
                Reminders & Notification Settings
              </h3>
              <p className="text-xs text-gray-500">Personalized peaceful schedule alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition"
            aria-label="Close reminder settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Reminders Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-purple-900">Active Care Reminders</span>
            <p className="text-[11px] text-gray-500">Nudges for scheduled activities and medication</p>
          </div>
          <button
            type="button"
            onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
            className={`w-12 h-7 rounded-full p-1 transition-colors ${
              settings.enabled ? 'bg-purple-600' : 'bg-gray-300'
            }`}
            aria-label={`Toggle care reminders ${settings.enabled ? 'off' : 'on'}`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Browser Notification Status Pill & Permission Button */}
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">System Notification Status</span>
            {notificationPerm === 'granted' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3" /> Active & Ready 🔔
              </span>
            ) : notificationPerm === 'denied' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold border border-rose-200">
                Blocked in Browser 🔒
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-200">
                Permission Needed ⚠️
              </span>
            )}
          </div>

          <p className="text-[11px] text-gray-500 leading-relaxed">
            Browser notifications alert you when Saksham is in the background. Tap below to enable permissions.
          </p>

          {notificationPerm !== 'granted' && (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Allow System Reminders</span>
            </button>
          )}
        </div>

        {/* Quiet Hours (Sundowning / Rest Window Protection) */}
        <div className="p-4 bg-lavender-50/60 rounded-2xl border border-purple-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Moon className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-purple-950">Quiet Hours (Rest Window)</span>
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings((s) => ({ ...s, quietHoursEnabled: !s.quietHoursEnabled }))
              }
              className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                settings.quietHoursEnabled ? 'bg-purple-600' : 'bg-gray-300'
              }`}
              aria-label="Toggle quiet hours"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.quietHoursEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="text-[11px] text-gray-500">
            Suppresses audible alerts during restful sleep hours so you are never disturbed.
          </p>

          {settings.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] font-bold text-gray-600 block mb-1">From</label>
                <input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, quietHoursStart: e.target.value }))
                  }
                  className="w-full p-2 text-xs border border-purple-200 rounded-xl bg-white font-semibold text-center"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-600 block mb-1">Until</label>
                <input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, quietHoursEnd: e.target.value }))
                  }
                  className="w-full p-2 text-xs border border-purple-200 rounded-xl bg-white font-semibold text-center"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sound & Voice Feedback Toggles */}
        <div className="space-y-2">
          <label className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl cursor-pointer">
            <span className="text-xs font-semibold text-gray-800 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-purple-600" />
              <span>Harmonic Audio Chimes</span>
            </span>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) =>
                setSettings((s) => ({ ...s, soundEnabled: e.target.checked }))
              }
              className="w-4 h-4 text-purple-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl cursor-pointer">
            <span className="text-xs font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Spoken Voice Announcements</span>
            </span>
            <input
              type="checkbox"
              checked={settings.voiceEnabled}
              onChange={(e) =>
                setSettings((s) => ({ ...s, voiceEnabled: e.target.checked }))
              }
              className="w-4 h-4 text-purple-600 rounded"
            />
          </label>
        </div>

        {/* Snooze Duration Options */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-gray-700">Default Snooze Duration</span>
          <div className="grid grid-cols-3 gap-2">
            {[3, 5, 15].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() =>
                  setSettings((s) => ({ ...s, snoozeDurationMinutes: mins }))
                }
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  settings.snoozeDurationMinutes === mins
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {mins} mins
              </button>
            ))}
          </div>
        </div>

        {/* Save Confirmation Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSave}
            className={`w-full py-3 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2 min-h-[48px] ${
              savedSuccess ? 'bg-emerald-600' : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Settings Saved!</span>
              </>
            ) : (
              <span>Save Reminder Preferences</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
