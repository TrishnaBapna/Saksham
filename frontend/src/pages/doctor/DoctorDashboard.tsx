import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import {
  Stethoscope,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div className="pb-24 pt-6 px-4 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-indigo-700 rounded-3xl p-6 text-white shadow-md">
        <div className="flex items-center space-x-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
          <Stethoscope className="w-4 h-4" />
          <span>Clinical Neurology Portal</span>
        </div>
        <h1 className="text-2xl font-bold">{currentUser?.displayName}</h1>
        <p className="text-xs md:text-sm text-blue-100 mt-1">
          Assigned Patient: Sunita Sharma (ID: PAT-84920) • Early Cognitive Support
        </p>
      </div>

      {/* Critical Medical Disclaimer Banner */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs text-amber-900 flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Clinical Transparency Policy:</span> Saksham strictly separates measured objective behavioral records (routine completions, time to recall, session attempts) from AI-generated natural-language suggestions to prevent algorithmic bias.
        </div>
      </div>

      {/* Longitudinal Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Measured Objective Metrics */}
        <div className="bg-white rounded-3xl p-6 border border-blue-100 shadow-soft-purple space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-saksham-darkText uppercase tracking-wider flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Measured Objective Data (Last 30 Days)</span>
            </h3>
            <span className="text-[11px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
              Physical Data
            </span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Daily Routine Adherence:</span>
              <span className="font-bold text-saksham-darkText text-sm">84.5% (High consistency)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '84.5%' }} />
            </div>

            <div className="flex justify-between items-center text-xs pt-2">
              <span className="text-gray-600">Average Recall Attempt Used:</span>
              <span className="font-bold text-saksham-darkText text-sm">1.3 / 3.0 Cues</span>
            </div>

            <div className="flex justify-between items-center text-xs pt-2">
              <span className="text-gray-600">Room Memory Game Verification:</span>
              <span className="font-bold text-saksham-darkText text-sm">Checked 6 times this week</span>
            </div>
          </div>
        </div>

        {/* AI-Generated Contextual Observations */}
        <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-soft-purple space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-saksham-darkText uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>AI-Assisted Observations</span>
            </h3>
            <span className="text-[11px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-md border border-purple-200">
              AI Suggestion (Not Diagnosis)
            </span>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed pt-1">
            "Patient demonstrated higher verbal interaction enthusiasm during morning sessions (09:00 AM – 11:30 AM). Evening queries about schedule increased slightly on Thursdays."
          </p>

          <div className="p-3 bg-purple-50 rounded-xl text-xs text-purple-800">
            <strong>Recommendation:</strong> Consider sustaining the 11:00 AM hydration routine and introducing word association exercises in late morning.
          </div>
        </div>
      </div>

      {/* Clinical Task Assignment & Notes */}
      <section className="bg-white rounded-3xl p-6 border border-blue-100 shadow-soft-purple space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-saksham-darkText flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Neurological Progress Notes & Task Assignment</span>
          </h2>
          <button
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
