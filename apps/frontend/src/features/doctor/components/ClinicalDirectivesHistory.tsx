import React from 'react';
import type { DoctorDirective, ClinicalNote } from '@/types/firestore';
import { Card } from '@/components/ui/Card';

interface ClinicalDirectivesHistoryProps {
  directives: DoctorDirective[];
  notesHistory: ClinicalNote[];
  patientName: string;
}

export const ClinicalDirectivesHistory: React.FC<ClinicalDirectivesHistoryProps> = ({
  directives,
  notesHistory,
  patientName,
}) => {
  return (
    <Card className="p-5 bg-white border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Directive History & Multidisciplinary Clinical Notes
          </h2>
          <p className="text-xs text-gray-500">
            Comprehensive audit record of medical directives and caregiver communications for {patientName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Directives Column */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
            <span>🩺 Issued Directives</span>
            <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full">
              {directives.length}
            </span>
          </h3>

          {directives.length === 0 ? (
            <p className="text-xs text-gray-400 italic p-3 bg-gray-50/60 rounded-xl">
              No directives issued yet for this patient.
            </p>
          ) : (
            directives.map((dir) => (
              <div
                key={dir.id}
                className="p-3 bg-purple-50/40 border border-purple-100 rounded-xl text-xs"
              >
                <div className="flex items-center justify-between font-semibold text-gray-900">
                  <span>{dir.title}</span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    {dir.createdAt ? new Date(dir.createdAt).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
                <p className="text-gray-600 mt-1 leading-relaxed">{dir.body}</p>
                <p className="text-[10px] text-purple-700 font-medium mt-1.5">
                  Signed: Dr. {dir.doctorName}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Notes & Caregiver Comms Column */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
            <span>🤝 Caregiver & Team Notes</span>
            <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded-full">
              {notesHistory.length}
            </span>
          </h3>

          {notesHistory.length === 0 ? (
            <p className="text-xs text-gray-400 italic p-3 bg-gray-50/60 rounded-xl">
              No caregiver notes logged yet.
            </p>
          ) : (
            notesHistory.map((note) => (
              <div
                key={note.id}
                className="p-3 bg-teal-50/30 border border-teal-100 rounded-xl text-xs"
              >
                <div className="flex items-center justify-between font-semibold text-gray-900">
                  <span>{note.title}</span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
                <p className="text-gray-600 mt-1 leading-relaxed">{note.body}</p>
                <p className="text-[10px] text-teal-700 font-medium mt-1.5">
                  From: {note.authorName} ({note.authorRole})
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
};
