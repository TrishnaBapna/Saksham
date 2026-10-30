import React from 'react';
import type { ClinicalNote, DoctorDirective } from '@/types/firestore';
import { Card } from '@/components/ui/Card';
import { VoiceReadButton } from '@/components/voice/VoiceReadButton';

interface CareTeamNotesProps {
  notes: ClinicalNote[];
  directives: DoctorDirective[];
  loading: boolean;
}

export const CareTeamNotes: React.FC<CareTeamNotesProps> = ({
  notes,
  directives,
  loading,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        <div className="h-24 bg-gray-100 animate-pulse rounded-2xl w-full" />
      </div>
    );
  }

  const hasMessages = notes.length > 0 || directives.length > 0;

  return (
    <section aria-labelledby="careteam-messages-heading" className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="careteam-messages-heading" className="text-lg font-bold text-gray-900">
            Care Team Messages & Instructions
          </h2>
          <p className="text-xs text-gray-500">
            Guidance and notes written for you by your doctor and caregiver
          </p>
        </div>
      </div>

      {!hasMessages ? (
        <Card className="p-6 text-center text-gray-500 bg-white border border-gray-100">
          <p className="text-2xl mb-1.5" aria-hidden="true">📬</p>
          <p className="text-sm font-medium">No new notes from your doctor or caregiver.</p>
          <p className="text-xs text-gray-400 mt-1">
            Whenever your care team leaves instructions or updates, they will appear here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Doctor Directives */}
          {directives.map((dir, idx) => (
            <Card
              key={dir.id || `dir-${idx}`}
              className="border border-purple-100 bg-gradient-to-br from-purple-50/50 to-white p-4"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                  🩺 Doctor Directive
                </span>
                <div className="flex items-center gap-1.5">
                  <VoiceReadButton
                    textToRead={`Doctor directive from Doctor ${dir.doctorName}. ${dir.title}. ${dir.body}`}
                    ariaLabel="Read directive aloud"
                  />
                  <span className="text-[11px] text-gray-400">
                    {dir.createdAt ? new Date(dir.createdAt).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{dir.title}</h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-line">
                {dir.body}
              </p>
              <p className="text-[11px] text-purple-700 font-medium mt-2">
                By Dr. {dir.doctorName}
              </p>
            </Card>
          ))}

          {/* Caregiver Notes */}
          {notes.map((note, idx) => (
            <Card
              key={note.id || `note-${idx}`}
              className="border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white p-4"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  {note.authorRole === 'caregiver' ? '🤝 Caregiver Note' : '🩺 Clinical Note'}
                </span>
                <div className="flex items-center gap-1.5">
                  <VoiceReadButton
                    textToRead={`Caregiver note from ${note.authorName}. ${note.title}. ${note.body}`}
                    ariaLabel="Read caregiver note aloud"
                  />
                  <span className="text-[11px] text-gray-400">
                    {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{note.title}</h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-line">
                {note.body}
              </p>
              <p className="text-[11px] text-blue-700 font-medium mt-2">
                From {note.authorName}
              </p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};
