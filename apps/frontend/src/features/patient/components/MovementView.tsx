import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { VoiceReadButton } from '@/components/voice/VoiceReadButton';

export const MovementView: React.FC = () => {
  const [isMetroActive, setIsMetroActive] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [tapTimer, setTapTimer] = useState(0);
  const [tapActive, setTapActive] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  const toggleMetronome = () => {
    if (isMetroActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsMetroActive(false);
    } else {
      setIsMetroActive(true);
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      // 100 BPM = 600ms interval
      intervalRef.current = setInterval(() => {
        if (!audioCtxRef.current) return;
        const now = audioCtxRef.current.currentTime;
        const osc = audioCtxRef.current.createOscillator();
        const g = audioCtxRef.current.createGain();

        osc.frequency.setValueAtTime(800, now);
        g.gain.setValueAtTime(0.15, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

        osc.connect(g);
        g.connect(audioCtxRef.current.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      }, 600);
    }
  };

  const handleTap = () => {
    if (!tapActive) {
      setTapActive(true);
      setTapCount(1);
      setTapTimer(15);
      const timer = setInterval(() => {
        setTapTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setTapActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTapCount((c) => c + 1);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-2xl shrink-0">
            🚶
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 font-heading">
                Movement & Motor Therapy
              </h2>
              <VoiceReadButton
                textToRead="Movement and Motor Therapy. Rhythmic auditory stimulation, finger tapping, and gait freezing cues."
                ariaLabel="Read Movement Therapy description"
              />
            </div>
            <p className="text-xs text-gray-500">
              Rhythmic auditory cueing (RAS) to overcome freezing of gait and monitor motor cadence.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Metronome Tool */}
        <Card className="p-6 bg-white border border-gray-100 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                Auditory Cueing (RAS)
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                100 BPM Optimal
              </span>
            </div>
            <h3 className="text-base font-bold text-gray-900">
              Rhythmic Stride Pacing Metronome
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Synchronize your stepping to this steady acoustic beat to overcome freezing-of-gait hesitation at doorways or turns.
            </p>
          </div>

          <Button
            variant={isMetroActive ? 'danger' : 'primary'}
            onClick={toggleMetronome}
            className="w-full min-h-touch text-base"
          >
            {isMetroActive ? '⏹ Stop Metronome (100 BPM)' : '▶ Start 100 BPM Pacing Beat'}
          </Button>
        </Card>

        {/* Fine Motor Tapping Drill */}
        <Card className="p-6 bg-white border border-gray-100 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                Motor Bradykinesia Drill
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {tapActive ? `${tapTimer}s remaining` : '15 Second Test'}
              </span>
            </div>
            <h3 className="text-base font-bold text-gray-900">
              Alternating Finger Tap Counter
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Tap the large button as rapidly and rhythmically as possible to measure fine-motor dexterity and amplitude fatigue.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTap}
            className={`w-full py-6 rounded-2xl font-black text-xl transition-all min-h-touch select-none ${
              tapActive
                ? 'bg-blue-600 text-white active:scale-95 shadow-md shadow-blue-200'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-2 border-blue-200'
            }`}
          >
            {tapActive ? `Tap! (${tapCount} recorded)` : 'Start Finger Tapping Test'}
          </button>
        </Card>
      </div>
    </div>
  );
};
