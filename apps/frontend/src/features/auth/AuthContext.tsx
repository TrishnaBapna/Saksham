/**
 * AuthContext — single source of truth for the signed-in user.
 *
 * Provides:
 *   useAuth()  →  { user, profile, role, loading, signOut }
 *
 * Usage:
 *   Wrap the app in <AuthProvider>; consume with useAuth() in any component.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile, UserRole } from '@/types/firestore';
import {
  subscribeToAuthState,
  fetchUserProfile,
  signOut as authSignOut,
  getRoleFromToken,
} from './authService';

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** The raw Firebase Auth user (null = not signed in) */
  user: User | null;
  /** The Firestore profile document (null = not loaded yet or no profile) */
  profile: UserProfile | null;
  /** The user's role (from Firestore profile — not from token claims) */
  role: UserRole | null;
  /** True while the initial auth state check is in progress */
  loading: boolean;
  /** Signs the user out and clears context state */
  signOut: () => Promise<void>;
  /** Manually refresh the profile (e.g. after onboarding completes) */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole]       = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (firebaseUser: User) => {
    try {
      const p = await fetchUserProfile(firebaseUser.uid);
      setProfile(p);
      // Prefer Firestore role; fall back to token claim
      if (p?.role) {
        setRole(p.role);
      } else {
        const tokenRole = await getRoleFromToken(firebaseUser);
        setRole(tokenRole);
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to load profile:', err);
      setProfile(null);
      setRole(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user);
  }, [user, loadProfile]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        await loadProfile(firebaseUser);
      } else {
        setProfile(null);
        setRole(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [loadProfile]);

  const handleSignOut = useCallback(async () => {
    await authSignOut();
    setUser(null);
    setProfile(null);
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, profile, role, loading, signOut: handleSignOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return ctx;
}
