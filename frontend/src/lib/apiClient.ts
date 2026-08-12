import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { TokenPair } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

const ACCESS_TOKEN_KEY = 'tvet_access_token';
const REFRESH_TOKEN_KEY = 'tvet_refresh_token';

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (tokens: TokenPair) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const apiClient = axios.create({ baseURL: API_BASE_URL });

// Attach the access token to every request that isn't the login call itself.
apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Called by AuthContext once it mounts, so the interceptor can trigger a real logout+redirect
// without importing react-router hooks into a plain module.
let onSessionExpired: (() => void) | null = null;
export function registerSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<TokenPair>(`${API_BASE_URL}/auth/refresh`, { refreshToken });
    tokenStorage.setTokens(data);
    return data.accessToken;
  } catch {
    return null;
  }
}

// On a 401 from any authenticated route, try exactly one silent refresh-and-retry before giving
// up and forcing the user back to the login screen (architecture.md §4: short-lived access token
// backed by a longer-lived refresh token).
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retried && !isAuthEndpoint) {
      originalRequest._retried = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      }

      tokenStorage.clear();
      onSessionExpired?.();
    }

    return Promise.reject(error);
  },
);

// Every error the backend returns follows { statusCode, message, timestamp } (HttpExceptionFilter).
// message may be a single string or (from class-validator) an array of strings.
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { message?: string | string[] } | undefined;
    if (body?.message) {
      return Array.isArray(body.message) ? body.message.join(' ') : body.message;
    }
    if (error.message) return error.message;
  }
  return fallback;
}

// The 409 grade-conflict response includes a conflictId; surface it distinctly so the UI can
// deep-link to the Sync Conflict Queue (grading.service.ts manualGrade()).
export function getConflictId(error: unknown): string | null {
  if (axios.isAxiosError(error) && error.response?.status === 409) {
    const body = error.response.data as { conflictId?: string };
    return body.conflictId ?? null;
  }
  return null;
}
