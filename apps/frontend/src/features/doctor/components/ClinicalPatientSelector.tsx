import React from 'react';
import type { AssignedPatient } from '../doctorService';

interface ClinicalPatientSelectorProps {
  patients: AssignedPatient[];
  activePatient: AssignedPatient | null;
  onSelect: (patient: AssignedPatient) => void;
}

export const ClinicalPatientSelector: React.FC<ClinicalPatientSelectorProps> = ({
  patients,
  activePatient,
  onSelect,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
          🩺
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">
            Clinical Patient Chart: <span className="text-purple-800">{activePatient?.name || 'Select Patient'}</span>
          </h2>
          <p className="text-xs text-gray-500">
            ID: {activePatient?.uid || '—'} · DOB: {activePatient?.dateOfBirth || '—'} · Condition: <span className="capitalize font-semibold text-gray-700">{activePatient?.condition || 'Parkinsons'}</span>
          </p>
        </div>
      </div>

      {patients.length > 1 && (
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label htmlFor="clinician-patient-select" className="text-xs font-semibold text-gray-500">
            Switch:
          </label>
          <select
            id="clinician-patient-select"
            value={activePatient?.uid || ''}
            onChange={(e) => {
              const selected = patients.find((p) => p.uid === e.target.value);
              if (selected) onSelect(selected);
            }}
            className="text-xs font-bold text-purple-900 bg-purple-50/80 border border-purple-200 rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
          >
            {patients.map((p) => (
              <option key={p.uid} value={p.uid}>
                {p.name} ({p.uid})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
