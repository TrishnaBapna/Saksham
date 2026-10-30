import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
  role?: string;
  'aria-label'?: string;
}

/**
 * Accessible card container.
 * When `hoverable` + `onClick` are provided, the card becomes a button-role
 * region with keyboard activation support.
 */
export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  onClick,
  role,
  'aria-label': ariaLabel,
}) => {
  const isInteractive = hoverable && !!onClick;

  if (isInteractive) {
    return (
      <div
        role={role ?? 'button'}
        tabIndex={0}
        aria-label={ariaLabel}
        className={`card-hover ${className}`}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      role={role}
      aria-label={ariaLabel}
      className={`card ${className}`}
    >
      {children}
    </div>
  );
};
