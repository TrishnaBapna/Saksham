import React from 'react';
import { UserRole } from '../types/auth.types.js';
import { Sparkles, User, HeartHandshake, Stethoscope, ShieldCheck, ArrowRight } from 'lucide-react';
import '../styles/auth.css';

interface RoleSelectorProps {
  onSelectRole: (role: UserRole) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ onSelectRole }) => {
  const roles = [
    {
      id: 'patient' as UserRole,
      title: 'Patient Sanctuary',
      tagline: 'Memory Support & Companionship',
      description: 'Your gentle care space with Asha & Kabir, 3-chance assisted recall routines, loved ones photos, and soothing mind games.',
      icon: User,
      badge: 'Accessible & Voice-Ready',
      colorClass: 'border-purple-200 hover:border-purple-500 bg-gradient-to-br from-white via-purple-50/40 to-pink-50/30',
      iconBg: 'bg-purple-100 text-purple-700',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
      buttonBg: 'bg-purple-600 hover:bg-purple-700 text-white',
    },
    {
      id: 'caregiver' as UserRole,
      title: 'Caregiver Portal',
      tagline: 'Family Monitoring & Reassurance',
      description: 'Check routine progress, receive safe geofence notifications, manage family memory cues, and coordinate peaceful daily care.',
      icon: HeartHandshake,
      badge: 'Consent-Governed',
      colorClass: 'border-teal-200 hover:border-teal-500 bg-gradient-to-br from-white via-teal-50/40 to-sky-50/30',
      iconBg: 'bg-teal-100 text-teal-700',
      badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
      buttonBg: 'bg-teal-600 hover:bg-teal-700 text-white',
    },
    {
      id: 'doctor' as UserRole,
      title: 'Clinician Console',
      tagline: 'Neurology & Adherence Analytics',
      description: 'Review longitudinal behavioral records, assess 3-chance recall trends, assign therapeutic activities, and author clinical notes.',
      icon: Stethoscope,
      badge: 'Verified Practitioners',
      colorClass: 'border-blue-200 hover:border-blue-500 bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/30',
      iconBg: 'bg-blue-100 text-blue-700',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    {
      id: 'admin' as UserRole,
      title: 'Administrator Hub',
      tagline: 'Governance & Security Audits',
      description: 'Review credential verifications, inspect immutable audit logs, govern account roles, and maintain system operational integrity.',
      icon: ShieldCheck,
      badge: 'Restricted Access',
      colorClass: 'border-slate-300 hover:border-slate-600 bg-gradient-to-br from-white via-slate-50 to-gray-100/50',
      iconBg: 'bg-slate-200 text-slate-800',
      badgeClass: 'bg-slate-200 text-slate-800 border-slate-300',
      buttonBg: 'bg-slate-900 hover:bg-black text-white',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      {/* Brand Header */}
      <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14 space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200 shadow-xs mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Care • Connection • Confidence</span>
        </div>

        <div className="flex items-center justify-center space-x-3">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-3xl bg-gradient-to-tr from-purple-600 to-lavender-500 flex items-center justify-center text-white shadow-soft-purple">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold text-saksham-darkText tracking-tight">
              Saksham
            </h1>
            <p className="text-xs font-semibold text-purple-700">सक्षम — AI Neuro-Care Companion</p>
          </div>
        </div>

        <p className="text-sm md:text-base text-gray-600 leading-relaxed pt-2">
          Welcome to your personalized care sanctuary. Please choose your portal to sign in to your role-specific dashboard.
        </p>
      </div>

      {/* Role Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <div
              key={role.id}
              onClick={() => onSelectRole(role.id)}
              className={`rounded-3xl p-6 md:p-7 border-2 auth-card-transition auth-card-hover cursor-pointer flex flex-col justify-between shadow-xs ${role.colorClass}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectRole(role.id)}
              aria-label={`Select ${role.title}`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs ${role.iconBg}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${role.badgeClass}`}>
                    {role.badge}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-saksham-darkText">{role.title}</h3>
                <p className="text-xs font-bold text-gray-500 mb-2">{role.tagline}</p>
                <p className="text-xs md:text-sm text-gray-600 leading-relaxed mb-6">
                  {role.description}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200/50 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Access Portal</span>
                <button
                  type="button"
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition ${role.buttonBg}`}
                >
                  <span>Enter</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Disclaimer */}
      <div className="mt-12 text-center text-xs text-gray-400 max-w-lg mx-auto">
        🔒 Saksham verifies your true account role on login. Selecting a portal is a visual preference; cross-role access is cryptographically blocked by Role-Based Access Control.
      </div>
    </div>
  );
};
