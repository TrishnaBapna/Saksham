/**
 * Placeholder Patient Dashboard — Stage 3 will build this out fully.
 * Shows the authenticated user's name and condition.
 */
import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const CONDITION_LABELS: Record<string, string> = {
  parkinsons: "Parkinson's Disease",
  alzheimers: "Alzheimer's Disease",
  dementia:   'Dementia',
  other:      'General Care',
};

export const PatientDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();

  return (
    <main id="main-content" className="min-h-dvh bg-gray-50 p-4 flex flex-col gap-4 max-w-xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between py-2">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Patient Portal</p>
          <h1 className="text-xl font-bold text-gray-900">
            Hello, {profile?.name?.split(' ')[0] ?? 'there'} 👋
          </h1>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
      </header>

      {profile?.condition && (
        <Card className="bg-teal-50 border-teal-200">
          <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide">
            Care Profile
          </p>
          <p className="text-base font-semibold text-teal-800 mt-1">
            {CONDITION_LABELS[profile.condition] ?? 'General Care'}
          </p>
        </Card>
      )}

      <Card>
        <p className="text-gray-400 text-sm text-center py-8">
          🚧 Patient dashboard coming in Stage 3.<br/>
          Full task list, reminders, SOS, and care messages will be here.
        </p>
      </Card>
    </main>
  );
};
