import axios from 'axios';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../config/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${API_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/** Seconds until the stored access token expires (negative if expired, null if none/unreadable). */
const tokenSecondsLeft = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp - Date.now() / 1000 : null;
  } catch {
    return null;
  }
};

/**
 * Access token for requests made outside axios (e.g. streaming fetch), refreshed first if it is
 * about to expire. Returns null for guests or when the session can't be refreshed.
 */
export const getFreshAccessToken = async (): Promise<string | null> => {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  const left = tokenSecondsLeft(token);
  if (left === null || left > 30) return token;
  try {
    const response = await axios.post(`${API_URL}/auth/refresh-token`, {}, { withCredentials: true });
    const { accessToken } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    return accessToken;
  } catch {
    return null;
  }
};

export default apiClient;
