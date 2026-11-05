import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RegistrationForm } from '../components/RegistrationForm.js';
import { RegistrationService } from '../services/registrationService.js';
import { PatientRegistrationData } from '../types/auth.types.js';
import { ArrowLeft, Sparkles, Heart } from 'lucide-react';
import '../styles/auth.css';

export const PatientRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async (data: PatientRegistrationData) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await RegistrationService.registerPatient(data);
      navigate('/patient');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender-50 via-white to-pink-50/40 flex items-center justify-center p-4 py-8">
      <div className="max-w-lg w-full bg-white rounded-3xl p-6 md:p-8 border-2 border-purple-200 shadow-soft-purple">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-purple-100">
          <Link
            to="/login?role=patient"
            className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </Link>
          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center space-x-1">
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
            <span>New Patient Sanctuary</span>
          </span>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-2 shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-saksham-darkText">Join Saksham</h1>
          <p className="text-xs text-gray-500 mt-1">
            Set up your personalised neuro-care sanctuary with companion assistance.
          </p>
        </div>

        {/* Form */}
        <RegistrationForm
          role="patient"
          onSubmit={handleRegister}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />

        <div className="mt-5 text-center text-xs text-gray-500">
          Already have an account?{' '}
          <Link to="/login?role=patient" className="font-bold text-purple-700 hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};
