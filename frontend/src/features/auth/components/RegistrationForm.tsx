import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { UserRole } from '../types/auth.types.js';

interface RegistrationFormProps {
  role: 'patient' | 'caregiver' | 'doctor';
  onSubmit: (formData: any) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  role,
  onSubmit,
  isLoading,
  errorMessage,
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    // Patient specific
    preferredName: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    companionChoice: 'asha' as 'asha' | 'kabir',
    // Caregiver specific
    relationshipToPatient: '',
    patientInvitationCode: '',
    // Doctor specific
    licenseNumber: '',
    specialty: '',
    hospitalAffiliation: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!formData.fullName.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!formData.email.trim()) {
      setLocalError('Please enter your email address.');
      return;
    }
    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (role === 'patient') {
      if (!formData.emergencyContactName || !formData.emergencyContactPhone) {
        setLocalError('Emergency contact name and phone number are required for patient safety.');
        return;
      }
    }

    if (role === 'doctor') {
      if (!formData.licenseNumber.trim() || !formData.specialty.trim()) {
        setLocalError('Medical Registration Number and Specialty are mandatory for physician accounts.');
        return;
      }
    }

    try {
      await onSubmit(formData);
    } catch {
      // Handled via prop or local state
    }
  };

  const activeError = localError || errorMessage;

  const getButtonClass = (r: UserRole) => {
    switch (r) {
      case 'patient':
        return 'bg-purple-600 hover:bg-purple-700 text-white';
      case 'caregiver':
        return 'bg-teal-600 hover:bg-teal-700 text-white';
      case 'doctor':
        return 'bg-blue-700 hover:bg-blue-800 text-white';
      default:
        return 'bg-slate-900 text-white';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {activeError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs md:text-sm text-rose-900 flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <span className="font-medium">{activeError}</span>
        </div>
      )}

      {/* Full Name */}
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
          Full Name
        </label>
        <input
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="e.g., Sunita Sharma"
          required
          className="w-full px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
          Email Address
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
          required
          className="w-full px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
      </div>

      {/* Password & Confirm */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Password (min 6 chars)
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Confirm Password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            required
            className="w-full px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>
      </div>

      {/* Role-Specific Fields */}

      {/* Patient Specific */}
      {role === 'patient' && (
        <div className="space-y-3 pt-2 border-t border-purple-100">
          <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
            Patient Preferences & Safety Contact
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                placeholder="e.g. Ananya (Daughter)"
                className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs md:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs md:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Choose Your AI Companion
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, companionChoice: 'asha' }))}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                  formData.companionChoice === 'asha'
                    ? 'bg-purple-100 text-purple-800 border-purple-500'
                    : 'bg-white text-gray-600'
                }`}
              >
                🌸 Asha (Gentle Guide)
              </button>
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, companionChoice: 'kabir' }))}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                  formData.companionChoice === 'kabir'
                    ? 'bg-purple-100 text-purple-800 border-purple-500'
                    : 'bg-white text-gray-600'
                }`}
              >
                🌟 Kabir (Memory Buddy)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Caregiver Specific */}
      {role === 'caregiver' && (
        <div className="space-y-3 pt-2 border-t border-teal-100">
          <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
            Caregiver Relationship & Patient Linking
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Relationship to Patient
              </label>
              <input
                type="text"
                name="relationshipToPatient"
                value={formData.relationshipToPatient}
                onChange={handleChange}
                placeholder="e.g. Daughter, Spouse, Son"
                className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs md:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Patient Invitation Code (Optional)
              </label>
              <input
                type="text"
                name="patientInvitationCode"
                value={formData.patientInvitationCode}
                onChange={handleChange}
                placeholder="e.g. SAK-8921"
                className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs md:text-sm uppercase font-mono"
              />
            </div>
          </div>
          <p className="text-[11px] text-gray-500">
            * Patient connection requires consent. If you don't have an invitation code yet, you can link with your patient anytime later from settings.
          </p>
        </div>
      )}

      {/* Doctor Specific */}
      {role === 'doctor' && (
        <div className="space-y-3 pt-2 border-t border-blue-100">
          <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
            Medical Practitioner Credentials
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                MCI / State Medical License Number
              </label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                placeholder="e.g. MCI-2015-8492"
                required
                className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs md:text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Medical Specialty
              </label>
              <input
                type="text"
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                placeholder="e.g. Neurology, Geriatrics"
                required
                className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs md:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Hospital or Clinic Affiliation
            </label>
            <input
              type="text"
              name="hospitalAffiliation"
              value={formData.hospitalAffiliation}
              onChange={handleChange}
              placeholder="e.g. Apollo Hospitals, Indiranagar Clinic"
              className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs md:text-sm"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900 border border-amber-200">
            <strong>Verification Note:</strong> Your application will be submitted for administrative credential verification. You will be notified once access is approved.
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md flex items-center justify-center space-x-2 transition-all mt-4 ${getButtonClass(
          role
        )} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Submitting Registration...</span>
          </>
        ) : (
          <>
            <span>
              {role === 'doctor' ? 'Submit Doctor Application' : 'Create Account'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};
