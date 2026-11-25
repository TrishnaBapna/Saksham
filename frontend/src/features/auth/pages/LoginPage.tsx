import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { UserRole } from '../types/auth.types.js';
import { RoleSelector } from '../components/RoleSelector.js';
import { PatientLogin } from '../components/PatientLogin.js';
import { CaregiverLogin } from '../components/CaregiverLogin.js';
import { DoctorLogin } from '../components/DoctorLogin.js';
import { AdminLogin } from '../components/AdminLogin.js';
import { isLocalDemoEnvironment } from '../services/identityService.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { signIn, sendPasswordReset, isLoading, error, clearError } = useAuth();

  const roleParam = searchParams.get('role') as UserRole | null;
  const [activePortal, setActivePortal] = useState<UserRole | null>(roleParam);

  useEffect(() => {
    if (roleParam && ['patient', 'caregiver', 'doctor', 'admin'].includes(roleParam)) {
      setActivePortal(roleParam);
    }
  }, [roleParam]);

  const handleSelectRole = (selected: UserRole) => {
    clearError();
    if (isLocalDemoEnvironment()) {
      try {
        localStorage.setItem('saksham_demo_scenario', 'true');
      } catch {}
    }
    setActivePortal(selected);
    setSearchParams({ role: selected });
  };

  const handleBackToRoles = () => {
    clearError();
    setActivePortal(null);
    setSearchParams({});
  };

  const handleLoginSubmit = async (email: string, pass: string) => {
    if (!activePortal) return;
    if (isLocalDemoEnvironment()) {
      try {
        localStorage.setItem('saksham_demo_scenario', 'true');
      } catch {}
    }

    try {
      const authUser = await signIn(email, pass, activePortal);

      // Automatic Redirection based on VERIFIED role
      switch (authUser.role) {
        case 'patient':
          navigate('/patient');
          break;
        case 'caregiver':
          navigate('/caregiver');
          break;
        case 'doctor':
          navigate('/doctor');
          break;
        case 'admin':
          navigate('/admin');
          break;
        default:
          navigate('/patient');
      }
    } catch {
      // Error is caught and surfaced in AuthContext
    }
  };

  const handleForgotPassword = async (email: string) => {
    await sendPasswordReset(email);
  };

  // 1. If no specific portal chosen yet, show Common Role Selector
  if (!activePortal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lavender-50 via-white to-purple-50/50 flex items-center justify-center py-6">
        <RoleSelector onSelectRole={handleSelectRole} />
      </div>
    );
  }

  // 2. Render chosen role-specific authentication interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender-50 via-white to-purple-50/40 flex items-center justify-center p-4">
      {activePortal === 'patient' && (
        <PatientLogin
          onSubmit={handleLoginSubmit}
          onForgotPassword={handleForgotPassword}
          isLoading={isLoading}
          errorMessage={error}
          onBackToRoles={handleBackToRoles}
        />
      )}

      {activePortal === 'caregiver' && (
        <CaregiverLogin
          onSubmit={handleLoginSubmit}
          onForgotPassword={handleForgotPassword}
          isLoading={isLoading}
          errorMessage={error}
          onBackToRoles={handleBackToRoles}
        />
      )}

      {activePortal === 'doctor' && (
        <DoctorLogin
          onSubmit={handleLoginSubmit}
          onForgotPassword={handleForgotPassword}
          isLoading={isLoading}
          errorMessage={error}
          onBackToRoles={handleBackToRoles}
        />
      )}

      {activePortal === 'admin' && (
        <AdminLogin
          onSubmit={handleLoginSubmit}
          onForgotPassword={handleForgotPassword}
          isLoading={isLoading}
          errorMessage={error}
          onBackToRoles={handleBackToRoles}
        />
      )}
    </div>
  );
};
