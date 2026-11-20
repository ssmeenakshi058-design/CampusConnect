import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import {
  checkIsAuthorizedAdmin,
  ensureAdminAccount,
  ensureStudentAccount,
} from '../lib/firestoreService';
import type { AdminProfile, StudentProfile } from '../types/campus';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  adminProfile: AdminProfile | null;
  studentProfile: StudentProfile | null;
  authLoading: boolean;
  authError: string | null;
  adminAccessDenied: boolean;
  clearAuthError: () => void;
  signInAsStudent: () => Promise<boolean>;
  signInAsAdmin: () => Promise<'authorized' | 'denied' | 'error'>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminAccessDenied, setAdminAccessDenied] = useState(false);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
    setAdminAccessDenied(false);
  }, []);

  useEffect(() => {
    let unsubStudent: (() => void) | null = null;
    let unsubAdmin: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubStudent) {
        unsubStudent();
        unsubStudent = null;
      }
      if (unsubAdmin) {
        unsubAdmin();
        unsubAdmin = null;
      }

      setUser(firebaseUser);

      if (!firebaseUser) {
        setIsAdmin(false);
        setAdminProfile(null);
        setStudentProfile(null);
        setAuthReady(true);
        return;
      }

      try {
        const authorizedAdmin = await checkIsAuthorizedAdmin(firebaseUser);
        setIsAdmin(authorizedAdmin);

        if (authorizedAdmin) {
          const adminSnap = await getDoc(doc(db, 'adminProfiles', firebaseUser.uid));
          if (adminSnap.exists()) {
            setAdminProfile(adminSnap.data() as AdminProfile);
          }
          unsubAdmin = onSnapshot(
            doc(db, 'adminProfiles', firebaseUser.uid),
            (snap) => {
              if (snap.exists()) {
                setAdminProfile(snap.data() as AdminProfile);
              }
            },
            () => undefined
          );
        } else {
          setAdminProfile(null);
        }

        unsubStudent = onSnapshot(
          doc(db, 'studentProfiles', firebaseUser.uid),
          (snap) => {
            if (snap.exists()) {
              setStudentProfile(snap.data() as StudentProfile);
            } else {
              setStudentProfile(null);
            }
          },
          () => undefined
        );
      } catch (err) {
        console.error('Error hydrating auth session:', err);
      } finally {
        setAuthReady(true);
      }
    });

    return () => {
      unsubAuth();
      if (unsubStudent) unsubStudent();
      if (unsubAdmin) unsubAdmin();
    };
  }, []);

  const signInAsStudent = useCallback(async (): Promise<boolean> => {
    setAuthLoading(true);
    setAuthError(null);
    setAdminAccessDenied(false);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const profile = await ensureStudentAccount(result.user);
      setStudentProfile(profile);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signInAsAdmin = useCallback(async (): Promise<'authorized' | 'denied' | 'error'> => {
    setAuthLoading(true);
    setAuthError(null);
    setAdminAccessDenied(false);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const authorized = await checkIsAuthorizedAdmin(result.user);
      if (!authorized) {
        setIsAdmin(false);
        setAdminProfile(null);
        setAdminAccessDenied(true);
        return 'denied';
      }
      const profile = await ensureAdminAccount(result.user);
      setIsAdmin(true);
      setAdminProfile(profile);
      return 'authorized';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to verify administrator credentials.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
      return 'error';
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
      setIsAdmin(false);
      setAdminProfile(null);
      setStudentProfile(null);
      setAdminAccessDenied(false);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        isAdmin,
        adminProfile,
        studentProfile,
        authLoading,
        authError,
        adminAccessDenied,
        clearAuthError,
        signInAsStudent,
        signInAsAdmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
