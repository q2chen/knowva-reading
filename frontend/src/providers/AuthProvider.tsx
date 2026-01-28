"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  emailVerified: boolean;
  isAnonymous: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  emailVerified: false,
  isAnonymous: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const emailVerified = user?.emailVerified ?? false;
  const isAnonymous = user?.isAnonymous ?? false;

  return (
    <AuthContext.Provider value={{ user, loading, emailVerified, isAnonymous }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
