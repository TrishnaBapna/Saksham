import React from 'react';
import type { CaregiverAlert } from '@/types/firestore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface CaregiverAlertsListProps {
  alerts: CaregiverAlert[];
  onAcknowledge: (alertId: number) => void;
}

export const CaregiverAlertsList: React.FC<CaregiverAlertsListProps> = ({
  alerts,
  onAcknowledge,
}) => {
  const unacknowledged = alerts.filter((a) => !a.acknowledged);

  return (
    <Card className="border border-red-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">🚨</span>
          <h2 className="text-base font-bold text-gray-900">
            Emergency & Safety Alerts
          </h2>
          {unacknowledged.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
              {unacknowledged.length} Active
            </span>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-6 text-gray-400 bg-gray-50/60 rounded-2xl">
          <p className="text-2xl mb-1" aria-hidden="true">🛡️</p>
          <p className="text-xs font-semibold text-gray-600">No active alerts reported</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Emergency SOS triggers and critical task deviations will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {alerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            return (
              <div
                key={alert.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition-all gap-3 ${
                  alert.acknowledged
                    ? 'bg-gray-50/70 border-gray-100 opacity-70'
                    : isCritical
                    ? 'bg-red-50/90 border-red-200'
                    : 'bg-amber-50/90 border-amber-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5" aria-hidden="true">
                    {alert.acknowledged ? '✓' : isCritical ? '🚨' : '⚠️'}
                  </span>
                  <div>
                    <p className={`text-xs font-bold ${isCritical ? 'text-red-950' : 'text-gray-900'}`}>
                      {alert.text}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : alert.time}
                      {alert.acknowledged && ' · Acknowledged by caregiver'}
                    </p>
                  </div>
                </div>

                {!alert.acknowledged && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onAcknowledge(alert.id)}
                    className="self-end sm:self-center bg-gray-900 hover:bg-gray-800 text-xs px-3 text-white"
                  >
                    Acknowledge
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
