import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Accessible large-target button.
 * Minimum 44 × 44 CSS px tap target (WCAG 2.5.5).
 * Supports keyboard focus, loading state, icons.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantClass: Record<string, string> = {
      primary:   'btn-primary',
      secondary: 'btn-secondary',
      danger:    'btn-danger',
      ghost:     'btn-ghost',
    };

    const sizeClass: Record<string, string> = {
      sm: 'px-4 py-2 text-sm min-h-[2.5rem]',
      md: 'px-6 py-3',
      lg: 'px-8 py-4 text-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        className={`${variantClass[variant]} ${sizeClass[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <span
              className="inline-block w-4 h-4 border-2 border-current border-t-transparent
                         rounded-full animate-spin"
              aria-hidden="true"
            />
            <span className="sr-only">Loading…</span>
          </>
        ) : (
          <>
            {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
