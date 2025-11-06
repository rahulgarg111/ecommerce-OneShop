import apiClient from './client';
import type { User, ApiResponse } from '../types';

export const authApi = {
  register: async (data: { name: string; email: string; password: string }) => {
    const response = await apiClient.post<ApiResponse<{ user: User; accessToken: string }>>(
      '/auth/register',
      data
    );
    return response.data;
  },

  login: async (data: { email: string; password: string }) => {
    const response = await apiClient.post<ApiResponse<{ user: User; accessToken: string }>>(
      '/auth/login',
      data
    );
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post<ApiResponse>('/auth/logout');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await apiClient.post<ApiResponse>('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await apiClient.post<ApiResponse>('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },
};
