import React, { useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useCaregiverStore } from './caregiverStore';
import { PatientSelector } from './components/PatientSelector';
import { CaregiverAlertsList } from './components/CaregiverAlertsList';
import { PatientRoutineMonitor } from './components/PatientRoutineMonitor';
import { CaregiverNoteComposer } from './components/CaregiverNoteComposer';
import { PatientPerformanceBreakdown } from './components/PatientPerformanceBreakdown';
import { PersonalisationTrialOverview } from './components/PersonalisationTrialOverview';
import { Button } from '@/components/ui/Button';
import { useToast, ToastContainer } from '@/components/ui/Toast';

export const CaregiverDashboard: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const {
    patients,
    activePatient,
    tasks,
    alerts,
    telemetry,
    tasksLoading,
    init,
    cleanup,
    selectPatient,
    acknowledgePatientAlert,
    postNote,
  } = useCaregiverStore();

  const { toasts, toast, dismiss } = useToast();

  useEffect(() => {
    if (user?.uid) {
      init(user.uid, user.email || '');
    }
    return () => {
      cleanup();
    };
  }, [user?.uid, user?.email, init, cleanup]);

  const handleAcknowledge = async (alertId: number) => {
    try {
      await acknowledgePatientAlert(alertId);
      toast('Alert acknowledged.', 'success');
    } catch {
      toast('Failed to acknowledge alert.', 'error');
    }
  };

  const handlePostNote = async (title: string, body: string) => {
    if (!user) return;
    try {
      await postNote(
        title,
        body,
        profile?.name || user.email?.split('@')[0] || 'Caregiver',
        user.uid
      );
      toast('Instruction posted to patient dashboard.', 'success');
    } catch {
      toast('Failed to send instruction.', 'error');
    }
  };

  const patientName = activePatient?.name || 'Patient';

  return (
    <div className="min-h-dvh bg-slate-50 text-gray-900 pb-16">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 px-4 sm:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">🤝</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-teal-800 text-lg">Saksham</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Caregiver Portal
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Care Circle & Neurological Monitoring
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-xs text-gray-600 hover:text-red-700"
              aria-label="Sign out of Saksham"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 flex flex-col gap-6">
        {/* Welcome banner + Patient selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-xl font-bold font-heading text-gray-900">
              Welcome, {profile?.name || 'Caregiver'} 👋
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Review and coordinate care support for your loved ones.
            </p>
          </div>

          <PatientSelector
            patients={patients}
            activePatient={activePatient}
            onSelect={selectPatient}
          />
        </div>

        {/* 1. Urgent Alerts & Notifications */}
        <CaregiverAlertsList
          alerts={alerts}
          onAcknowledge={handleAcknowledge}
        />

        {/* 2. Seven-Day Personalisation Trial & Adaptive Support */}
        {activePatient && (
          <PersonalisationTrialOverview
            patientUid={activePatient.uid}
            patientName={patientName}
            onAuditNoteAdded={(note) => {
              handlePostNote('Caregiver Trial Observation', note);
            }}
          />
        )}

        {/* 3. Real-time Patient Routine Monitor */}
        <PatientRoutineMonitor
          tasks={tasks}
          loading={tasksLoading}
          patientName={patientName}
        />

        {/* 3. Task Performance & Time Taken (Caregiver View) */}
        <PatientPerformanceBreakdown
          tasks={tasks}
          telemetry={telemetry}
          patientName={patientName}
        />

        {/* 4. Post Care Instructions to Patient */}
        <CaregiverNoteComposer
          patientName={patientName}
          onPostNote={handlePostNote}
        />
      </main>
    </div>
  );
};
