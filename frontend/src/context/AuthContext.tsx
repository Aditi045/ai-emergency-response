import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, setAuthToken, clearAuthToken, getAuthToken } from '../services/api';
import { wsService } from '../services/websocket';
import { triggerOfflineBatchSync } from '../services/offlineQueue';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnline: boolean;
  login: (credentials: any) => Promise<void>;
  loginDemo: (role: UserRole) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  syncOfflineQueue: () => Promise<{ success: boolean; synced: number; failed: number }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerOfflineBatchSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check me
    const initAuth = async () => {
      if (getAuthToken()) {
        try {
          const profile = await api.auth.me();
          setUser(profile);
          wsService.connect(profile.role, profile.id);
        } catch {
          clearAuthToken();
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const login = async (credentials: any) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(credentials);
      setAuthToken(res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      wsService.connect(res.user.role, res.user.id);
    } finally {
      setIsLoading(false);
    }
  };

  const loginDemo = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const demoEmails: Record<UserRole, { email: string; pass: string }> = {
        ADMIN: { email: 'admin@resqintel.ai', pass: 'Admin@123' },
        DISPATCHER: { email: 'dispatcher@resqintel.ai', pass: 'Dispatch@123' },
        ANALYST: { email: 'analyst@resqintel.ai', pass: 'Analyst@123' },
        RESPONDER: { email: 'responder@resqintel.ai', pass: 'Responder@123' },
        CITIZEN: { email: 'citizen@resqintel.ai', pass: 'Citizen@123' },
      };
      const creds = demoEmails[role];
      const res = await api.auth.login({ email: creds.email, password: creds.pass });
      setAuthToken(res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      wsService.connect(res.user.role, res.user.id);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(data);
      setAuthToken(res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      wsService.connect(res.user.role, res.user.id);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    setToken(null);
    setUser(null);
    wsService.disconnect();
  };

  const syncOfflineQueue = async () => {
    return await triggerOfflineBatchSync();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        isOnline,
        login,
        loginDemo,
        register,
        logout,
        syncOfflineQueue,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
