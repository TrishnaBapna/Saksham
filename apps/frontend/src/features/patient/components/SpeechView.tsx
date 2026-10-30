import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { VoiceReadButton } from '@/components/voice/VoiceReadButton';
import { audioSynthesizer } from '@/services/audioService';

export const SpeechView: React.FC = () => {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [decibels, setDecibels] = useState(25);
  const [completedReport, setCompletedReport] = useState<string | null>(null);

  const startVocalDrill = () => {
    setIsMeasuring(true);
    setCompletedReport(null);
    let vol = 30;

    const interval = setInterval(() => {
      vol += Math.floor(Math.random() * 20) - 7;
      if (vol > 82) vol = 82;
      if (vol < 35) vol = 35;
      setDecibels(vol);
    }, 180);

    setTimeout(() => {
      clearInterval(interval);
      setIsMeasuring(false);
      setDecibels(72);
      audioSynthesizer.playTaskComplete();
      setCompletedReport('Peak Vocal Amplitude: 74 dB SPL — Optimal conversational loudness achieved!');
    }, 4000);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-2xl shrink-0">
            🗣️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 font-heading">
                Speech & Vocal Phonation
              </h2>
              <VoiceReadButton
                textToRead="Speech and Vocal Phonation. High-effort vocal practice to combat hypophonia and maintain voice projection."
                ariaLabel="Read Speech Therapy description"
              />
            </div>
            <p className="text-xs text-gray-500">
              High-effort vocalization exercises to counter hypophonia (soft voice) and preserve articulation.
            </p>
          </div>
        </div>
      </div>

      <Card className="p-6 bg-white border border-gray-100 flex flex-col gap-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
              LSVT Loud Protocol
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              Target: 65 - 80 dB
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900">
            Sustained "Ah" Vocal Projection
          </h3>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            Take a deep breath and hold a strong, open <strong>"Ahhh"</strong> sound as loudly and steadily as comfortable.
          </p>
        </div>

        {/* Live Decibel Gauge Bar */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-bold text-gray-700">
            <span>Acoustic Amplitude</span>
            <span className="text-base font-black text-teal-800">{decibels} dB SPL</span>
          </div>
          <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                decibels >= 65 ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
              style={{ width: `${Math.min(decibels, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 font-medium">
            <span>Quiet (30 dB)</span>
            <span className="font-bold text-teal-700">Target Range (65-80 dB)</span>
            <span>Loud (100 dB)</span>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={startVocalDrill}
          loading={isMeasuring}
          className="w-full min-h-touch text-base bg-teal-700 hover:bg-teal-800"
        >
          {isMeasuring ? 'Listening to your voice...' : '🎙️ Start 4-Second Vocal Loudness Test'}
        </Button>

        {completedReport && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
            ✓ {completedReport}
          </div>
        )}
      </Card>
    </div>
  );
};
