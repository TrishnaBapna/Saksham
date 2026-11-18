import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { CharacterProvider } from './context/CharacterContext.js';
import { AccessibilityProvider } from './context/AccessibilityContext.js';
import { LanguageProvider } from './context/LanguageContext.js';
import { PatientExperienceProvider, usePatientExperienceSafe } from './context/PatientExperienceContext.js';

import { TopBar } from './components/layout/TopBar.js';
import { BottomNav } from './components/layout/BottomNav.js';
import { FloatingUtilityHub } from './components/layout/FloatingUtilityHub.js';

// Auth Pages & Protected Route
import { LoginPage } from './features/auth/pages/LoginPage.js';
import { PatientRegistrationPage } from './features/auth/pages/PatientRegistrationPage.js';
import { CaregiverRegistrationPage } from './features/auth/pages/CaregiverRegistrationPage.js';
import { DoctorRegistrationPage } from './features/auth/pages/DoctorRegistrationPage.js';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute.js';

// Role Dashboards
import { PatientDashboard } from './pages/patient/PatientDashboard.js';
import { LovedOnes } from './pages/patient/LovedOnes.js';
import { MindGames } from './pages/patient/MindGames.js';
import { PatientProfile } from './pages/patient/PatientProfile.js';
import { CaregiverDashboard } from './pages/caregiver/CaregiverDashboard.js';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard.js';
import { AdminDashboard } from './pages/admin/AdminDashboard.js';
import { AshaDemoPage } from './pages/demo/AshaDemoPage.js';
import { AshaHomeGuidePage } from './pages/patient/AshaHomeGuidePage.js';

export const AppContent: React.FC = () => {
  const location = useLocation();
  const { isHybrid } = usePatientExperienceSafe();
  const isAuthRoute =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register');
  const isDemoRoute = location.pathname.startsWith('/asha-demo');
  const isPatientRoute = location.pathname.startsWith('/patient');

  return (
    <div className="min-h-screen flex flex-col bg-lavender-50/50">
      {/* Show TopBar on application dashboard views, hide on dedicated auth or demo screens */}
      {!isAuthRoute && !isDemoRoute && <TopBar />}

      <main className="flex-1">
        <Routes>
          {/* Public Asha 2D Live Interactive Companion Demo */}
          <Route path="/asha-demo" element={<AshaDemoPage />} />

          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/patient" element={<PatientRegistrationPage />} />
          <Route path="/register/caregiver" element={<CaregiverRegistrationPage />} />
          <Route path="/register/doctor" element={<DoctorRegistrationPage />} />

          {/* Root Redirect to Patient Sanctuary */}
          <Route path="/" element={<Navigate to="/patient" replace />} />

          {/* Protected Patient Routes */}
          <Route
            path="/patient"
            element={
              <ProtectedRoute allowedRole="patient">
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          {/* Milestone 1 Consolidated Navigation: Safe redirect for legacy /patient/routines bookmarks */}
          <Route
            path="/patient/routines"
            element={
              <ProtectedRoute allowedRole="patient">
                <Navigate to="/patient" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/loved-ones"
            element={
              <ProtectedRoute allowedRole="patient">
                <LovedOnes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/mind-games"
            element={
              <ProtectedRoute allowedRole="patient">
                <MindGames />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/profile"
            element={
              <ProtectedRoute allowedRole="patient">
                <PatientProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/home-guide"
            element={
              <ProtectedRoute allowedRole="patient">
                <AshaHomeGuidePage />
              </ProtectedRoute>
            }
          />

          {/* Protected Caregiver Routes */}
          <Route
            path="/caregiver"
            element={
              <ProtectedRoute allowedRole="caregiver">
                <CaregiverDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Doctor Routes */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRole="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/patient" replace />} />
        </Routes>
      </main>

      {/* Persistent Patient Floating Utilities & Bottom Nav (Hybrid mode renders 4 bottom tabs, Asha-only hides them) */}
      {isPatientRoute && !isAuthRoute && (
        <>
          <FloatingUtilityHub />
          {isHybrid && <BottomNav />}
        </>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <LanguageProvider>
          <AccessibilityProvider>
            <PatientExperienceProvider>
              <CharacterProvider>
                <AppContent />
              </CharacterProvider>
            </PatientExperienceProvider>
          </AccessibilityProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
