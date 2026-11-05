import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { CharacterProvider } from './context/CharacterContext.js';
import { AccessibilityProvider } from './context/AccessibilityContext.js';
import { LanguageProvider } from './context/LanguageContext.js';

import { TopBar } from './components/layout/TopBar.js';
import { BottomNav } from './components/layout/BottomNav.js';

import { PatientDashboard } from './pages/patient/PatientDashboard.js';
import { DailyRoutines } from './pages/patient/DailyRoutines.js';
import { LovedOnes } from './pages/patient/LovedOnes.js';
import { MindGames } from './pages/patient/MindGames.js';
import { PatientProfile } from './pages/patient/PatientProfile.js';

import { CaregiverDashboard } from './pages/caregiver/CaregiverDashboard.js';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard.js';
import { AdminDashboard } from './pages/admin/AdminDashboard.js';

const AppContent: React.FC = () => {
  const location = useLocation();
  const isPatientRoute = location.pathname.startsWith('/patient');

  return (
    <div className="min-h-screen flex flex-col bg-lavender-50/50">
      <TopBar />
      <main className="flex-1">
        <Routes>
          {/* Default redirect to patient experience */}
          <Route path="/" element={<Navigate to="/patient" replace />} />

          {/* Patient Persona Routes */}
          <Route path="/patient" element={<PatientDashboard />} />
          <Route path="/patient/routines" element={<DailyRoutines />} />
          <Route path="/patient/loved-ones" element={<LovedOnes />} />
          <Route path="/patient/mind-games" element={<MindGames />} />
          <Route path="/patient/profile" element={<PatientProfile />} />

          {/* Secondary Role Dashboards */}
          <Route path="/caregiver" element={<CaregiverDashboard />} />
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/patient" replace />} />
        </Routes>
      </main>

      {/* Persistent Bottom Nav for Patient View */}
      {isPatientRoute && <BottomNav />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AccessibilityProvider>
            <CharacterProvider>
              <AppContent />
            </CharacterProvider>
          </AccessibilityProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
