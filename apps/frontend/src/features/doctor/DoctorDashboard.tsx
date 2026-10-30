import React, { useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useDoctorStore } from './doctorStore';
import { ClinicalPatientSelector } from './components/ClinicalPatientSelector';
import { ClinicalDirectivesComposer } from './components/ClinicalDirectivesComposer';
import { NeurologicalTelemetryViewer } from './components/NeurologicalTelemetryViewer';
import { ClinicalDirectivesHistory } from './components/ClinicalDirectivesHistory';
import { Button } from '@/components/ui/Button';
import { useToast, ToastContainer } from '@/components/ui/Toast';

export const DoctorDashboard: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const {
    patients,
    activePatient,
    directives,
    notesHistory,
    telemetry,
    init,
    cleanup,
    selectPatient,
    postDirective,
  } = useDoctorStore();

  const { toasts, toast, dismiss } = useToast();

  useEffect(() => {
    if (user?.uid) {
      init(user.uid, user.email || '');
    }
    return () => {
      cleanup();
    };
  }, [user?.uid, user?.email, init, cleanup]);

  const handlePostDirective = async (title: string, body: string) => {
    if (!user) return;
    try {
      await postDirective(
        title,
        body,
        profile?.name || user.email?.split('@')[0] || 'Clinician',
        user.uid
      );
      toast('Directive published to patient medical record.', 'success');
    } catch {
      toast('Failed to record directive.', 'error');
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
            <span className="text-2xl" aria-hidden="true">🩺</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-purple-950 text-lg">Saksham</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                  Clinical Portal
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Neurology Department & Directives Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-600 hidden sm:inline">
              Dr. {profile?.name || user?.email?.split('@')[0]}
            </span>
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

      {/* Main Clinical Workspace */}
      <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 flex flex-col gap-6">
        {/* 1. Patient Selector & Chart Info */}
        <ClinicalPatientSelector
          patients={patients}
          activePatient={activePatient}
          onSelect={selectPatient}
        />

        {/* 2. Neurological Biomarkers & Telemetry */}
        <NeurologicalTelemetryViewer
          telemetry={telemetry}
          patientName={patientName}
        />

        {/* 3. Prescribe Directive Composer */}
        <ClinicalDirectivesComposer
          patientName={patientName}
          onPostDirective={handlePostDirective}
        />

        {/* 4. Directives and Notes History */}
        <ClinicalDirectivesHistory
          directives={directives}
          notesHistory={notesHistory}
          patientName={patientName}
        />
      </main>
    </div>
  );
};
