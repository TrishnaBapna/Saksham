import React from 'react';
import { Button } from '@/components/ui/Button';

type Role = 'patient' | 'caregiver' | 'doctor';

interface RoleCard {
  role: Role;
  label: string;
  description: string;
  icon: string;
  color: string;
  borderColor: string;
}

const ROLES: RoleCard[] = [
  {
    role: 'patient',
    label: 'Patient',
    description: 'Access your daily tasks, reminders, and care support',
    icon: '💙',
    color: 'bg-blue-50',
    borderColor: 'border-blue-200 hover:border-blue-400',
  },
  {
    role: 'caregiver',
    label: 'Caregiver',
    description: 'Monitor patient activity and send care messages',
    icon: '🤝',
    color: 'bg-green-50',
    borderColor: 'border-green-200 hover:border-green-400',
  },
  {
    role: 'doctor',
    label: 'Doctor',
    description: 'Review clinical data and provide directives',
    icon: '🩺',
    color: 'bg-purple-50',
    borderColor: 'border-purple-200 hover:border-purple-400',
  },
];

/**
 * Placeholder login page for Stage 1.
 * Stage 2 will wire this to Firebase Auth email/password flows.
 * Each role has its own login — no role-switch tab exists.
 */
export const LoginPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);

  return (
    <main
      className="min-h-dvh bg-gradient-to-br from-teal-50 via-white to-green-50
                 flex flex-col items-center justify-center p-4 gap-8"
      aria-label="Saksham login"
    >
      {/* Logo + wordmark */}
      <div className="text-center">
        <div className="text-5xl mb-3" aria-hidden="true">🧠</div>
        <h1 className="text-3xl font-bold text-teal-700 font-heading">Saksham</h1>
        <p className="text-gray-500 mt-1 text-sm">Neurological Care Support</p>
      </div>

      {/* Role selector */}
      {!selectedRole ? (
        <section aria-label="Select your role">
          <h2 className="text-center text-xl font-semibold text-gray-800 mb-4">
            Sign in as…
          </h2>

          <div className="flex flex-col gap-4 w-full max-w-sm">
            {ROLES.map(({ role, label, description, icon, color, borderColor }) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`${color} ${borderColor} border-2 rounded-3xl p-5
                             flex items-center gap-4 text-left
                             transition-all duration-200 hover:shadow-md
                             focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-teal-500 focus-visible:ring-offset-2
                             min-h-touch`}
                aria-label={`Sign in as ${label}`}
              >
                <span className="text-3xl" aria-hidden="true">{icon}</span>
                <div>
                  <div className="font-semibold text-gray-900">{label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{description}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : (
        /* Placeholder form — Stage 2 will implement real auth */
        <section
          aria-label={`Sign in as ${selectedRole}`}
          className="w-full max-w-sm flex flex-col gap-5"
        >
          <button
            onClick={() => setSelectedRole(null)}
            className="flex items-center gap-1 text-sm text-teal-600 hover:underline
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            aria-label="Back to role selection"
          >
            ← Back
          </button>

          <div className="card flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-gray-900 capitalize">
              {selectedRole} Sign In
            </h2>

            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
              />
            </div>

            <Button variant="primary" className="w-full mt-2" disabled>
              Sign In
              <span className="sr-only">
                (Firebase Auth will be wired in Stage 2)
              </span>
            </Button>

            <p className="text-center text-xs text-gray-400">
              Firebase Authentication coming in Stage 2
            </p>
          </div>
        </section>
      )}
    </main>
  );
};
