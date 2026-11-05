import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

interface CommonLoginFormProps {
  buttonText?: string;
  buttonClass?: string;
  onSubmit: (email: string, pass: string) => Promise<void>;
  onForgotPassword?: (email: string) => Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
  placeholderEmail?: string;
  emailLabel?: string;
}

export const CommonLoginForm: React.FC<CommonLoginFormProps> = ({
  buttonText = 'Sign In',
  buttonClass = 'bg-purple-600 hover:bg-purple-700 text-white',
  onSubmit,
  onForgotPassword,
  isLoading = false,
  errorMessage = null,
  placeholderEmail = 'you@example.com',
  emailLabel = 'Email Address',
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('Please enter your email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    try {
      await onSubmit(email.trim(), password);
    } catch {
      // Error is surfaced via errorMessage prop or local state
    }
  };

  const handleForgotClick = async () => {
    setLocalError(null);
    if (!email.trim()) {
      setLocalError('Please enter your email address above to receive password reset instructions.');
      return;
    }

    if (onForgotPassword) {
      setIsResetting(true);
      try {
        await onForgotPassword(email.trim());
        setResetSent(true);
      } catch (err: any) {
        setLocalError(err.message || 'Could not send reset email.');
      } finally {
        setIsResetting(false);
      }
    }
  };

  const activeError = localError || errorMessage;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Error Banner */}
      {activeError && (
        <div
          className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs md:text-sm text-rose-900 flex items-start space-x-2.5 animate-in fade-in"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed font-medium">{activeError}</div>
        </div>
      )}

      {/* Reset Sent Confirmation */}
      {resetSent && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800">
          ✓ Password reset instructions have been sent to <strong>{email}</strong>.
        </div>
      )}

      {/* Email / Username Input */}
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
          {emailLabel}
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholderEmail}
            autoComplete="email"
            required
            className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 transition shadow-inner font-medium"
          />
        </div>
      </div>

      {/* Password Input */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            Password
          </label>
          {onForgotPassword && (
            <button
              type="button"
              onClick={handleForgotClick}
              disabled={isResetting}
              className="text-xs font-semibold text-purple-700 hover:text-purple-900 hover:underline"
            >
              {isResetting ? 'Sending link...' : 'Forgot password?'}
            </button>
          )}
        </div>
        <div className="relative">
          <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className="w-full pl-10 pr-11 py-3 bg-white rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 transition shadow-inner font-medium"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-1.5 text-gray-400 hover:text-gray-600 absolute right-3 top-1/2 -translate-y-1/2 rounded-full focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md flex items-center justify-center space-x-2 transition-all ${buttonClass} ${
          isLoading ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verifying Credentials...</span>
          </>
        ) : (
          <>
            <span>{buttonText}</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};
