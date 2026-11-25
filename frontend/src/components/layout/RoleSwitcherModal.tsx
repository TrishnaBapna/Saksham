import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { UserRole } from '../../types/index.js';
import { Shield, User, HeartHandshake, Stethoscope, Settings, X, Check } from 'lucide-react';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { role, switchDemoRole } = useAuth();
  const { t } = useLanguage();

  if (!isOpen) return null;

  const rolesConfig: { id: UserRole; title: string; desc: string; icon: any; route: string; color: string }[] = [
    {
      id: 'patient',
      title: t('role_modal.patient_title'),
      desc: t('role_modal.patient_desc'),
      icon: User,
      route: '/patient',
      color: 'bg-purple-100 text-purple-700 border-purple-300',
    },
    {
      id: 'caregiver',
      title: t('role_modal.caregiver_title'),
      desc: t('role_modal.caregiver_desc'),
      icon: HeartHandshake,
      route: '/caregiver',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    {
      id: 'doctor',
      title: t('role_modal.doctor_title'),
      desc: t('role_modal.doctor_desc'),
      icon: Stethoscope,
      route: '/doctor',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    {
      id: 'admin',
      title: t('role_modal.admin_title'),
      desc: t('role_modal.admin_desc'),
      icon: Settings,
      route: '/admin',
      color: 'bg-rose-100 text-rose-800 border-rose-300',
    },
  ];

  const handleSelect = (newRole: UserRole, targetRoute: string) => {
    switchDemoRole(newRole);
    navigate(targetRoute);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-saksham-darkText/50 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-purple-200">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-purple-600" />
            <h3 className="font-extrabold text-lg text-saksham-darkText">{t('role_modal.title')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full" aria-label={t('common.close')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-500 my-3">
          {t('role_modal.subtitle')}
        </p>

        <div className="space-y-2.5">
          {rolesConfig.map((item) => {
            const Icon = item.icon;
            const isSelected = role === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id, item.route)}
                className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-start space-x-3 ${
                  isSelected
                    ? `${item.color} shadow-sm ring-2 ring-purple-400`
                    : 'bg-gray-50/70 border-gray-200 hover:bg-white hover:border-purple-200'
                }`}
              >
                <div className="p-2 rounded-xl bg-white shadow-xs mt-0.5">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-saksham-darkText">{item.title}</span>
                    {isSelected && <Check className="w-4 h-4 text-purple-700" />}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-400">
            🔒 {t('role_modal.production_note')}
          </p>
        </div>
      </div>
    </div>
  );
};
