import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '../types';
import { authApi } from '../api/auth';
import { cartApi } from '../api/cart';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const response = await authApi.getCurrentUser();
        setUser(response.data?.user || null);
      }
    } catch (error) {
      localStorage.removeItem('accessToken');
    } finally {
      setLoading(false);
    }
  };

  const mergeGuestCartIfPresent = async () => {
    const sessionId = localStorage.getItem('sessionId');

    if (!sessionId) {
      return;
    }

    try {
      await cartApi.mergeCarts(sessionId);
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch (error) {
      console.error('Cart merge error:', error);
      toast.error('Logged in, but we could not merge your guest cart automatically.');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      if (response.data) {
        localStorage.setItem('accessToken', response.data.accessToken);
        setUser(response.data.user);
        await mergeGuestCartIfPresent();
        toast.success('Login successful!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await authApi.register({ name, email, password });
      if (response.data) {
        localStorage.setItem('accessToken', response.data.accessToken);
        setUser(response.data.user);
        await mergeGuestCartIfPresent();
        toast.success('Registration successful!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      localStorage.removeItem('accessToken');
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
