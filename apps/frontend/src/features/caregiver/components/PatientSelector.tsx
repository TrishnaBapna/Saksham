import React from 'react';
import type { LinkedPatientInfo } from '../caregiverService';

interface PatientSelectorProps {
  patients: LinkedPatientInfo[];
  activePatient: LinkedPatientInfo | null;
  onSelect: (patient: LinkedPatientInfo) => void;
}

export const PatientSelector: React.FC<PatientSelectorProps> = ({
  patients,
  activePatient,
  onSelect,
}) => {
  if (patients.length <= 1) {
    return (
      <div className="flex items-center gap-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl px-4 py-2.5">
        <span className="text-xl" aria-hidden="true">👤</span>
        <div className="text-xs">
          <span className="text-gray-500 font-medium">Monitoring: </span>
          <span className="font-bold text-emerald-950">
            {activePatient?.name || 'Assigned Patient'}
          </span>
          {activePatient?.condition && (
            <span className="ml-1.5 capitalize text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full font-semibold">
              {activePatient.condition}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-1.5 shadow-sm">
      <label htmlFor="patient-select" className="text-xs font-semibold text-gray-500 shrink-0">
        Patient:
      </label>
      <select
        id="patient-select"
        value={activePatient?.uid || ''}
        onChange={(e) => {
          const selected = patients.find((p) => p.uid === e.target.value);
          if (selected) onSelect(selected);
        }}
        className="text-xs font-bold text-teal-900 bg-transparent focus:outline-none cursor-pointer"
      >
        {patients.map((p) => (
          <option key={p.uid} value={p.uid}>
            {p.name} ({p.condition || 'General Care'})
          </option>
        ))}
      </select>
    </div>
  );
};
