import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole, AuthUser } from '../features/auth/types/auth.types.js';
import { AuthService } from '../features/auth/services/authService.js';
import { DEMO_USERS } from '../features/auth/services/roleService.js';

interface AuthContextType {
  currentUser: AuthUser | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, pass: string, portal: UserRole) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  logout: () => void;
  sendPasswordReset: (email: string) => Promise<void>;
  switchDemoRole: (newRole: UserRole) => void;
  setRole: (role: UserRole) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    // 1. Production Mode: Strict zero-trust cold start.
    // An unauthenticated visitor must initialize with currentUser = null.
    // A demo user must never become authenticated in production merely because
    // localStorage is empty or contains a demo identity.
    if (!import.meta.env.DEV || Boolean(import.meta.env.PROD)) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          // Remove any stale or simulated demo session tokens in production
          window.localStorage.removeItem('saksham_auth_user');
        }
      } catch {
        // Safe storage fallback
      }
      return null;
    }

    // 2. Development / Test Mode ONLY:
    // Support cached demo sessions or fall back to default demo patient for prototyping/tests
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = window.localStorage.getItem('saksham_auth_user');
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch {
      // Ignore storage errors in test or SSR environments
    }
    return DEMO_USERS['patient@saksham.care'];
  });

  const [role, setRoleState] = useState<UserRole>(currentUser?.role || 'patient');

  // In production, start in loading state while waiting for Firebase onAuthStateChanged
  // to verify whether an active session exists in IndexedDB.
  // In development, if a demo user is already synchronously loaded, start with isLoading = false.
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (!import.meta.env.DEV || Boolean(import.meta.env.PROD)) {
      return true;
    }
    return false;
  });

  const [error, setError] = useState<string | null>(null);

  // Sync role whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      setRoleState(currentUser.role);
    }
  }, [currentUser]);

  // Listen to Auth State Changes
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        setRoleState(user.role);
      } else {
        // When unauthenticated in production, explicitly ensure currentUser is null
        if (!import.meta.env.DEV || Boolean(import.meta.env.PROD)) {
          setCurrentUser(null);
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, pass: string, portal: UserRole): Promise<AuthUser> => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await AuthService.signIn(email, pass, portal);
      setCurrentUser(user);
      setRoleState(user.role);
      return user;
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await AuthService.signOut();
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    signOut();
  }, [signOut]);

  const sendPasswordReset = useCallback(async (email: string): Promise<void> => {
    setError(null);
    try {
      await AuthService.sendPasswordReset(email);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
      throw err;
    }
  }, []);

  const switchDemoRole = useCallback((newRole: UserRole) => {
    // Strictly disallowed in production builds
    if (!import.meta.env.DEV || Boolean(import.meta.env.PROD)) {
      console.warn('[AuthContext] Demo role switching is strictly disabled in production builds.');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      const targetUser = Object.values(DEMO_USERS).find((u) => u.role === newRole) || DEMO_USERS['patient@saksham.care'];
      setCurrentUser(targetUser);
      setRoleState(newRole);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('saksham_auth_user', JSON.stringify(targetUser));
      }
      setIsLoading(false);
    }, 120);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        isAuthenticated: Boolean(currentUser),
        isLoading,
        error,
        signIn,
        signOut,
        logout,
        sendPasswordReset,
        switchDemoRole,
        setRole: setRoleState,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthSafe = (): AuthContextType | null => {
  return useContext(AuthContext) || null;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
