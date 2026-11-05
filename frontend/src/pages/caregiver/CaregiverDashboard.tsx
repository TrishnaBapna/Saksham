import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import {
  HeartHandshake,
  MapPin,
  CalendarCheck,
  ShieldCheck,
  Clock,
  CheckCircle,
  Compass,
} from 'lucide-react';

export const CaregiverDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [geofenceRadius] = useState<number>(500); // 500 meters

  return (
    <div className="pb-24 pt-6 px-4 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-600 rounded-3xl p-6 text-white shadow-md">
        <div className="flex items-center space-x-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
          <HeartHandshake className="w-4 h-4" />
          <span>Caregiver Portal</span>
        </div>
        <h1 className="text-2xl font-bold">Welcome, {currentUser?.displayName}</h1>
        <p className="text-xs md:text-sm text-emerald-100 mt-1">
          Authorized Care Companion for Sunita Sharma • Active Care Link
        </p>
      </div>

      {/* Connected Patient Quick Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Routine Completion */}
        <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-soft-purple">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-gray-400">Routines Today</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-saksham-darkText">1 / 4 Done</div>
          <p className="text-xs text-gray-500 mt-1">Morning medication completed at 08:32 AM</p>
        </div>

        {/* Card 2: Assisted Recall Usage */}
        <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-soft-purple">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-gray-400">3-Chance Assisted Recall</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-saksham-darkText">Level 1 Cue</div>
          <p className="text-xs text-gray-500 mt-1">Patient completed recall on 1st attempt today</p>
        </div>

        {/* Card 3: Safety Status */}
        <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-soft-purple">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-gray-400">Safety Status</span>
            <ShieldCheck className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">Inside Safe Zone</div>
          <p className="text-xs text-gray-500 mt-1">Home Geofence active (updated 8 mins ago)</p>
        </div>
      </div>

      {/* Consent-Governed Geofencing & Location Module */}
      <section className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft-purple space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-saksham-darkText">
              Consent-Gated Location & Geofence
            </h2>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200">
            ✓ Patient Consent Active
          </span>
        </div>

        <p className="text-xs text-gray-600">
          Location is updated only with active patient authorization. Coordinates are never continuously broadcast without consent.
        </p>

        {/* Simulated Map Container */}
        <div className="relative h-64 bg-slate-100 rounded-2xl overflow-hidden border border-gray-200 flex items-center justify-center text-center p-6">
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
          <div className="relative z-10 space-y-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md border-4 border-white animate-pulse">
              <Compass className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-sm text-saksham-darkText">
              Sunita is currently at Home (Indiranagar 2nd Stage)
            </h3>
            <p className="text-xs text-gray-500">
              Last GPS sync: Today at 09:42 AM (Accuracy: ± 8 meters)
            </p>
            <div className="inline-block text-xs bg-white text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 font-semibold shadow-xs">
              Configured Safe Radius: {geofenceRadius} meters
            </div>
          </div>
        </div>
      </section>

      {/* Routine Management by Caregiver */}
      <section className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft-purple space-y-3">
        <h2 className="text-lg font-bold text-saksham-darkText">
          Authorized Routine Monitoring
        </h2>
        <div className="space-y-2.5">
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">11:00 AM</span>
              <h4 className="font-bold text-sm text-saksham-darkText mt-1">Morning Hydration & Gentle Arm Stretches</h4>
              <p className="text-xs text-gray-500">3-chance assisted recall cues configured</p>
            </div>
            <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-semibold">
              Pending
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md">08:30 AM</span>
              <h4 className="font-bold text-sm text-saksham-darkText mt-1">Morning Blood Pressure Medication</h4>
              <p className="text-xs text-emerald-700">Completed on time</p>
            </div>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </section>
    </div>
  );
};
