import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface ClinicalDirectivesComposerProps {
  patientName: string;
  onPostDirective: (title: string, body: string) => Promise<void>;
}

export const ClinicalDirectivesComposer: React.FC<ClinicalDirectivesComposerProps> = ({
  patientName,
  onPostDirective,
}) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [directiveType, setDirectiveType] = useState<'routine' | 'speech' | 'motor' | 'medication'>('routine');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const presets = {
    routine: {
      title: 'Adjusted Daily Routine Schedule',
      body: 'Please follow the new 08:30 AM breakfast and 10:00 AM cognitive exercise routine consistently for optimal dopamine synthesis.',
    },
    speech: {
      title: 'Speech Volume & Intonation Protocol',
      body: 'Practice sustained vowel phonation (/ah/) for 10 seconds, aiming for vocal amplitude above 65 dB.',
    },
    motor: {
      title: 'Fine-Motor Tremor Dampening Exercise',
      body: 'Complete the bilateral finger-tapping exercise for 2 minutes before afternoon rest.',
    },
    medication: {
      title: 'Levodopa Timing Optimization',
      body: 'Take Levodopa exactly 30 minutes prior to meals with water to avoid protein competition.',
    },
  };

  const handleApplyPreset = (type: keyof typeof presets) => {
    setDirectiveType(type);
    setTitle(presets[type].title);
    setBody(presets[type].body);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setLoading(true);
    try {
      await onPostDirective(title.trim(), body.trim());
      setTitle('');
      setBody('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.warn('Directive dispatch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5 bg-white border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">📋</span>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Prescribe Clinical Directive
            </h2>
            <p className="text-xs text-gray-500">
              Formal neurological recommendation synced to {patientName}'s dashboard
            </p>
          </div>
        </div>

        {/* Preset chips */}
        <div className="hidden sm:flex items-center gap-1.5">
          {(['routine', 'speech', 'motor', 'medication'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleApplyPreset(t)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl capitalize transition-colors ${
                directiveType === t
                  ? 'bg-purple-100 text-purple-900 font-bold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="directive-title" className="label text-xs font-semibold">
            Directive Title / Clinical Summary
          </label>
          <input
            id="directive-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Speech Volume Protocol Adjustment"
            className="input text-xs py-2.5"
          />
        </div>

        <div>
          <label htmlFor="directive-body" className="label text-xs font-semibold">
            Detailed Clinical Directives & Instructions for {patientName}
          </label>
          <textarea
            id="directive-body"
            rows={3}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Specify therapeutic parameters, frequency, and cautions..."
            className="input text-xs py-2.5 resize-none"
          />
        </div>

        <div className="flex items-center justify-between mt-1">
          {success ? (
            <span className="text-xs font-semibold text-emerald-700 animate-fade-in">
              Directive published to {patientName}'s chart! ✓
            </span>
          ) : (
            <span className="text-[11px] text-gray-400">
              Audit-logged with your verified clinician credentials.
            </span>
          )}

          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={loading}
            className="bg-purple-700 hover:bg-purple-800 text-xs px-4 text-white"
          >
            Issue Directive
          </Button>
        </div>
      </form>
    </Card>
  );
};
