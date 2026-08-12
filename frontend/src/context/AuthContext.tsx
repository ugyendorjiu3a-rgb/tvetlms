import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { authApi } from '../lib/api';
import { registerSessionExpiredHandler, tokenStorage } from '../lib/apiClient';
import type { AccessTokenPayload, CurrentUser, RoleName } from '../lib/types';

interface AuthContextValue {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** The role the UI is currently rendering for — matters when a user holds more than one role
   * (ui-ux-flow.md §0.1 role switcher), e.g. a Trainer who is also an Exam Controller. */
  activeRole: RoleName | null;
  setActiveRole: (role: RoleName) => void;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACTIVE_ROLE_KEY = 'tvet_active_role';

function decodeUser(accessToken: string): CurrentUser {
  const payload = jwtDecode<AccessTokenPayload>(accessToken);
  return {
    userId: payload.sub,
    institutionId: payload.institutionId,
    roles: payload.roles,
    traineeId: payload.traineeId,
    trainerId: payload.trainerId,
  };
}

function isExpired(accessToken: string): boolean {
  try {
    const { exp } = jwtDecode<AccessTokenPayload>(accessToken);
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [activeRole, setActiveRoleState] = useState<RoleName | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStorage.clear();
    localStorage.removeItem(ACTIVE_ROLE_KEY);
    setUser(null);
    setActiveRoleState(null);
  }, []);

  useEffect(() => {
    // Restore session from a previously stored access token on first load. A stale/expired token
    // just means "not logged in" — the apiClient's own refresh interceptor handles renewal
    // transparently once a real request is made, so we don't try to refresh proactively here.
    const token = tokenStorage.getAccessToken();
    if (token && !isExpired(token)) {
      const decoded = decodeUser(token);
      setUser(decoded);
      const storedRole = localStorage.getItem(ACTIVE_ROLE_KEY) as RoleName | null;
      setActiveRoleState(storedRole && decoded.roles.includes(storedRole) ? storedRole : decoded.roles[0] ?? null);
    } else {
      tokenStorage.clear();
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    registerSessionExpiredHandler(logout);
  }, [logout]);

  const login = useCallback(async (loginId: string, password: string) => {
    const tokens = await authApi.login(loginId, password);
    tokenStorage.setTokens(tokens);
    const decoded = decodeUser(tokens.accessToken);
    setUser(decoded);
    const initialRole = decoded.roles[0] ?? null;
    setActiveRoleState(initialRole);
    if (initialRole) localStorage.setItem(ACTIVE_ROLE_KEY, initialRole);
  }, []);

  const setActiveRole = useCallback((role: RoleName) => {
    setActiveRoleState(role);
    localStorage.setItem(ACTIVE_ROLE_KEY, role);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, isLoading, activeRole, setActiveRole, login, logout }),
    [user, isLoading, activeRole, setActiveRole, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
