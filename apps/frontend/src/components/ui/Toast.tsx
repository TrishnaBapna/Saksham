import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

// ─── Single toast item ────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'bg-green-600 text-white',
  error:   'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  info:    'bg-teal-600 text-white',
};

const variantIcon: Record<ToastVariant, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const labelId = useId();
  const { id, message, variant = 'info', durationMs = 4000 } = toast;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), durationMs);
    return () => clearTimeout(timer);
  }, [id, durationMs, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-labelledby={labelId}
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl
                  shadow-lg animate-slide-up min-w-[260px] max-w-sm
                  ${variantStyles[variant]}`}
    >
      <span className="text-lg font-bold" aria-hidden="true">
        {variantIcon[variant]}
      </span>
      <span id={labelId} className="flex-1 text-sm font-medium">
        {message}
      </span>
      <button
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className="ml-auto shrink-0 opacity-75 hover:opacity-100 transition-opacity
                   p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-white"
      >
        ✕
      </button>
    </div>
  );
};

// ─── Toast container (renders via portal) ────────────────────────────────────

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  const root = document.getElementById('toast-root');
  if (!root) return null;

  return createPortal(
    <>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </>,
    root
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info', durationMs = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant, durationMs }]);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}
