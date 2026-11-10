import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import {
  Stethoscope,
  FileText,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { DoctorLongitudinalAnalytics } from '../../features/doctor/components/DoctorLongitudinalAnalytics.js';
import { DoctorAnalyticsService, DoctorAssignmentInfo } from '../../features/doctor/services/doctorAnalyticsService.js';

export const DoctorDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const doctorUid = currentUser?.uid || 'demo-doctor-001';
  const targetPatientId = 'demo-patient-001';

  const [assignment, setAssignment] = useState<DoctorAssignmentInfo>({
    isAssigned: true,
    status: 'active',
    doctorId: doctorUid,
    patientId: targetPatientId,
    patientName: 'Sunita Sharma',
  });

  useEffect(() => {
    let isMounted = true;
    DoctorAnalyticsService.getDoctorAssignment(doctorUid, targetPatientId)
      .then((info) => {
        if (isMounted) {
          setAssignment(info);
        }
      })
      .catch((err) => {
        console.warn('[DoctorDashboard] Error resolving doctor assignment:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [doctorUid, targetPatientId]);

  return (
    <div className="pb-24 pt-6 px-4 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-indigo-700 rounded-3xl p-6 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>Clinical Neurology Portal</span>
          </div>
          {assignment.isAssigned && (
            <div className="flex items-center space-x-1 text-2xs text-emerald-200 bg-white/10 px-2.5 py-1 rounded-full font-semibold border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Verified Clinical Link</span>
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold">{currentUser?.displayName || 'Dr. Raman Verma'}</h1>
        <p className="text-xs md:text-sm text-blue-100 mt-1">
          Assigned Patient: {assignment.patientName} (ID: PAT-84920) • Early Cognitive Support
        </p>
      </div>

      {/* Critical Medical Disclaimer Banner */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs text-amber-900 flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Clinical Transparency Policy: </span>
          Saksham strictly separates measured objective behavioral records (routine completions, prompt cues, session attempts) from clinical diagnoses or disease-progression models to prevent algorithmic bias.
        </div>
      </div>

      {/* 30-Day Longitudinal Behavioral Analytics Portal */}
      <DoctorLongitudinalAnalytics
        doctorId={doctorUid}
        patientId={targetPatientId}
        patientName={assignment.patientName}
      />

      {/* Clinical Task Assignment & Notes Section */}
      <section className="bg-white rounded-3xl p-6 border border-blue-100 shadow-soft-purple space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-saksham-darkText flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Neurological Progress Notes & Task Assignment</span>
          </h2>
          <button
            type="button"
            onClick={() => alert('New task assignment dialog: Doctors can schedule specific cognitive tasks or routine items.')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            + Assign Cognitive Activity
          </button>
        </div>

        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-700 space-y-2">
          <div className="flex items-center justify-between font-bold text-gray-800">
            <span>Clinical Review Note (Dr. Raman Verma)</span>
            <span>Recorded Oct 28, 2026</span>
          </div>
          <p className="leading-relaxed">
            "Patient Sunita Sharma is responding remarkably well to the 3-chance assisted recall structure. Her emotional distress regarding forgotten keys is significantly reduced thanks to the Room Memory photograph catalog."
          </p>
        </div>
      </section>
    </div>
  );
};
