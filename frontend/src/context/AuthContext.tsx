import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  role: Role;
  isLoading: boolean;
  isAuthenticated: boolean;
  switchRole: (role: Role, email?: string) => Promise<void>;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'EMPLOYEE',
  isLoading: true,
  isAuthenticated: false,
  switchRole: async () => {},
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const refreshUser = async () => {
    const token = localStorage.getItem('flowforge_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.data) {
        setUser(res.data.data);
        localStorage.setItem('flowforge_user', JSON.stringify(res.data.data));
      }
    } catch {
      localStorage.removeItem('flowforge_token');
      localStorage.removeItem('flowforge_user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const switchRole = async (targetRole: Role, email?: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/switch-role', { role: targetRole, email });
      if (res.data.success && res.data.data) {
        const { user: updatedUser, tokens } = res.data.data;
        setUser(updatedUser);
        localStorage.setItem('flowforge_token', tokens.accessToken);
        localStorage.setItem('flowforge_user', JSON.stringify(updatedUser));
        queryClient.clear();
        await queryClient.invalidateQueries();
      }
    } catch (err) {
      console.error('Failed to switch role', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success && res.data.data) {
        const { user: loggedInUser, tokens } = res.data.data;
        setUser(loggedInUser);
        localStorage.setItem('flowforge_token', tokens.accessToken);
        localStorage.setItem('flowforge_user', JSON.stringify(loggedInUser));
        await queryClient.invalidateQueries();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('flowforge_token');
      localStorage.removeItem('flowforge_user');
      setUser(null);
      await queryClient.clear();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'EMPLOYEE',
        isLoading,
        isAuthenticated: !!user && !!localStorage.getItem('flowforge_token'),
        switchRole,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
