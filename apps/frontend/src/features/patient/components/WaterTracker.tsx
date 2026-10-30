import React from 'react';
import { Button } from '@/components/ui/Button';

interface WaterTrackerProps {
  logged: number;
  target?: number;
  onLogWater: () => void;
}

export const WaterTracker: React.FC<WaterTrackerProps> = ({
  logged,
  target = 8,
  onLogWater,
}) => {
  const percent = Math.min(Math.round((logged / target) * 100), 100);

  return (
    <div className="bg-gradient-to-r from-sky-50 to-blue-50/60 border border-sky-100 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div
          className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center text-2xl shrink-0 shadow-sm"
          aria-hidden="true"
        >
          💧
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-sky-950 font-heading">
              Hydration Tracker
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
              {logged} / {target} glasses
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-36 sm:w-48 bg-sky-200/60 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-sky-800">{percent}%</span>
          </div>
        </div>
      </div>

      <Button
        variant="primary"
        size="md"
        onClick={onLogWater}
        disabled={logged >= target}
        className="bg-sky-600 hover:bg-sky-700 min-h-touch px-5 text-white self-start sm:self-auto"
        aria-label="Log 1 glass of water"
      >
        {logged >= target ? 'Goal Reached 🎉' : '+ Log Glass (250ml)'}
      </Button>
    </div>
  );
};
