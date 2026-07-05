'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export interface ScreenPermission {
  screenKey: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export type ScreenPermissionsMap = Record<string, { canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean }>;

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  affiliateId?: number;
  membershipNumber?: string;
  screenKeys?: string[];
  screenPermissions?: ScreenPermissionsMap;
}

interface AuthContextType {
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const welcomed = useRef(false);

  const fetchUserScreens = useRef(async () => {
    try {
      const res = await api.get('users/screens');
      const data = res.data;
      const screenKeys = data.isSuperAdmin
        ? data.allScreens.map((s: any) => s.key)
        : data.userScreens.map((s: any) => typeof s === 'string' ? s : s.screenKey);
      const screenPermissions: ScreenPermissionsMap = {};
      if (data.isSuperAdmin) {
        for (const s of data.allScreens) {
          screenPermissions[s.key] = { canCreate: true, canRead: true, canUpdate: true, canDelete: true };
        }
      } else {
        for (const s of data.userScreens) {
          if (typeof s === 'string') {
            screenPermissions[s] = { canCreate: false, canRead: true, canUpdate: false, canDelete: false };
          } else {
            screenPermissions[s.screenKey] = {
              canCreate: s.canCreate,
              canRead: s.canRead,
              canUpdate: s.canUpdate,
              canDelete: s.canDelete,
            };
          }
        }
      }
      setUser(prev => prev ? { ...prev, screenKeys, screenPermissions } : null);
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.screenKeys = screenKeys;
        parsed.screenPermissions = screenPermissions;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
    } catch {
      // silent - permissions are optional
    }
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
          try {
            const parsed = JSON.parse(storedUser) as User;
            setUser(parsed);
            fetchUserScreens.current();
            if (!welcomed.current) {
              welcomed.current = true;
              toast(
                () => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold text-sm border border-gold/20">
                      {parsed.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-navy">Welcome back, {parsed.name}</p>
                      <p className="text-[10px] text-slate/40 font-medium uppercase tracking-wider">{parsed.role?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                ),
                { duration: 4000 }
              );
            }
          } catch (e) {
            console.error('Failed to parse stored user', e);
          }
        }
      }
    } catch (e) {
      console.error('Failed to access localStorage', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    fetchUserScreens.current();
    welcomed.current = true;
    toast(
      () => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">
            {user.name?.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold text-navy">Welcome, {user.name}</p>
            <p className="text-[10px] text-slate/40 font-medium uppercase tracking-wider">{user.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
      ),
      { duration: 4000 }
    );
  };

  const logout = async () => {
    try {
      await api.post('auth/logout');
    } catch {
      // fire-and-forget; proceed regardless
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
