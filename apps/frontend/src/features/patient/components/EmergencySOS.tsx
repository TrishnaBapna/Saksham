import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface EmergencySOSProps {
  patientName?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  onSendAlert?: (message: string) => Promise<void>;
}

export const EmergencySOS: React.FC<EmergencySOSProps> = ({
  patientName = 'Patient',
  emergencyContactName = 'Caregiver',
  emergencyContactPhone = '+919876543210',
  onSendAlert,
}) => {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const cleanPhone = emergencyContactPhone.replace(/[^0-9+]/g, '');
  const sosMessage = encodeURIComponent(
    `🚨 SOS EMERGENCY from ${patientName}: I need urgent assistance. Please check on me immediately.`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${sosMessage}`;
  const telUrl = `tel:${cleanPhone}`;

  const handleQuickAlert = async () => {
    setLoading(true);
    try {
      if (onSendAlert) {
        await onSendAlert(`Urgent SOS triggered by ${patientName}`);
      }
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      console.warn('SOS alert dispatch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50/90 to-rose-50/70 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center text-2xl font-bold shrink-0 shadow-md shadow-red-200"
            aria-hidden="true"
          >
            🚨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-red-900 font-heading">
                Emergency & Quick SOS
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                Direct Help
              </span>
            </div>
            <p className="text-sm text-red-700 mt-0.5 leading-relaxed">
              Contact <span className="font-semibold">{emergencyContactName}</span> ({emergencyContactPhone}) instantly via WhatsApp or direct phone call.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 min-h-touch px-4 py-2.5 rounded-2xl font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
            aria-label={`Send WhatsApp SOS message to ${emergencyContactName}`}
          >
            <span>💬 WhatsApp SOS</span>
          </a>

          <a
            href={telUrl}
            className="inline-flex items-center justify-center gap-2 min-h-touch px-4 py-2.5 rounded-2xl font-semibold text-sm bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all shadow-sm"
            aria-label={`Call emergency contact ${emergencyContactName}`}
          >
            <span>📞 Call</span>
          </a>

          <Button
            variant="ghost"
            size="sm"
            loading={loading}
            onClick={handleQuickAlert}
            className="text-red-800 hover:bg-red-100 border border-red-200 text-xs px-3"
            aria-label="Send internal notification alert to care team"
          >
            {sent ? 'Alert Sent ✓' : 'Notify Team'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
