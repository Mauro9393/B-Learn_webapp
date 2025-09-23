import React, { createContext, useContext, useState } from 'react';

export type AuthUser = {
  id: number | string;
  email: string;
  role: number | string;
  role_name: string;
  tenant_id: number | string;
} | null;

type AuthContextValue = {
  user: AuthUser;
  setUser: (u: AuthUser) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (v: boolean) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <AuthContext.Provider value={{ user, setUser, isAuthenticated, setIsAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


