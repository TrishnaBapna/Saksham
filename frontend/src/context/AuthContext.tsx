import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, UserProfile } from '../types/index.js';

interface AuthContextType {
  currentUser: UserProfile | null;
  role: UserRole;
  setRole: (role: UserRole) => void;
  isLoading: boolean;
  logout: () => void;
  switchDemoRole: (newRole: UserRole) => void;
}

const DEFAULT_USERS: Record<UserRole, UserProfile> = {
  patient: {
    uid: 'patient-demo-01',
    email: 'sunita.sharma@saksham.care',
    displayName: 'Sunita Sharma',
    role: 'patient',
    photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
  },
  caregiver: {
    uid: 'caregiver-demo-01',
    email: 'ananya.sharma@saksham.care',
    displayName: 'Ananya Sharma (Daughter)',
    role: 'caregiver',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  },
  doctor: {
    uid: 'doctor-demo-01',
    email: 'dr.raman.verma@saksham.care',
    displayName: 'Dr. Raman Verma (Neurologist)',
    role: 'doctor',
    photoURL: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=200&q=80',
  },
  admin: {
    uid: 'admin-demo-01',
    email: 'admin.ops@saksham.care',
    displayName: 'System Administrator',
    role: 'admin',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('patient');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(DEFAULT_USERS.patient);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Sync current user with selected role
    setCurrentUser(DEFAULT_USERS[role]);
  }, [role]);

  const switchDemoRole = (newRole: UserRole) => {
    setIsLoading(true);
    setTimeout(() => {
      setRoleState(newRole);
      setCurrentUser(DEFAULT_USERS[newRole]);
      setIsLoading(false);
    }, 150);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        setRole: setRoleState,
        isLoading,
        logout,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
