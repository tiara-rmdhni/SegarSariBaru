import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

export interface VerifiedSessionUser {
  uid: string;
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
}

interface AuthContextValue {
  firebaseUser: User | null;
  verifiedUser: VerifiedSessionUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [verifiedUser, setVerifiedUser] = useState<VerifiedSessionUser | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const verifyWithBackend = useCallback(async (user: User | null) => {
    if (!user) {
      setVerifiedUser(null);
      setLoading(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Gagal memverifikasi sesi dengan server.');
      }
      const data = await res.json();
      setVerifiedUser(data.user);
      setError(null);
    } catch (err: any) {
      console.error('Auth verification error:', err);
      setVerifiedUser(null);
      setError(err.message || 'Gagal memverifikasi sesi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoading(true);
      verifyWithBackend(user);
    });
    return () => unsubscribe();
  }, [verifyWithBackend]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain') {
        setError(
          `Domain "${window.location.hostname}" belum ditambahkan ke Authorized Domains di Firebase Console > Authentication > Settings.`
        );
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err?.message || 'Gagal login dengan Google.');
      }
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setVerifiedUser(null);
    setError(null);
  }, []);

  const getIdToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        verifiedUser,
        loading,
        error,
        signInWithGoogle,
        logout,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
