import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface CaregiverNoteComposerProps {
  patientName: string;
  onPostNote: (title: string, body: string) => Promise<void>;
}

export const CaregiverNoteComposer: React.FC<CaregiverNoteComposerProps> = ({
  patientName,
  onPostNote,
}) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setLoading(true);
    try {
      await onPostNote(title.trim(), body.trim());
      setTitle('');
      setBody('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.warn('Note dispatch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5 bg-white border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl" aria-hidden="true">📝</span>
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Send Care Instruction or Note
          </h2>
          <p className="text-xs text-gray-500">
            This will appear immediately on {patientName}'s dashboard under Care Team Messages.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="note-title" className="label text-xs font-semibold">
            Subject / Headline
          </label>
          <input
            id="note-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Afternoon water reminder & gentle stretch"
            className="input text-xs py-2.5"
          />
        </div>

        <div>
          <label htmlFor="note-body" className="label text-xs font-semibold">
            Instruction / Message for {patientName}
          </label>
          <textarea
            id="note-body"
            rows={3}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write clear, supportive instructions..."
            className="input text-xs py-2.5 resize-none"
          />
        </div>

        <div className="flex items-center justify-between mt-1">
          {success ? (
            <span className="text-xs font-semibold text-emerald-700 animate-fade-in">
              Note sent to {patientName}'s dashboard! ✓
            </span>
          ) : (
            <span className="text-[11px] text-gray-400">
              Visible only to patient and assigned clinicians.
            </span>
          )}

          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={loading}
            className="bg-teal-700 hover:bg-teal-800 text-xs px-4"
          >
            Post Instruction
          </Button>
        </div>
      </form>
    </Card>
  );
};
