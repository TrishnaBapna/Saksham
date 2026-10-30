/** Placeholder Caregiver Dashboard — Stage 4 will build this out. */
import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export const CaregiverDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();

  return (
    <main id="main-content" className="min-h-dvh bg-gray-50 p-4 flex flex-col gap-4 max-w-xl mx-auto">
      <header className="flex items-center justify-between py-2">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Caregiver Portal</p>
          <h1 className="text-xl font-bold text-gray-900">
            Hello, {profile?.name?.split(' ')[0] ?? 'there'} 🤝
          </h1>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
      </header>

      <Card>
        <p className="text-gray-400 text-sm text-center py-8">
          🚧 Caregiver dashboard coming in Stage 4.<br/>
          Patient activity, alerts, and messaging will be here.
        </p>
      </Card>
    </main>
  );
};
