import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { api } from './api';

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
}

interface Permissions {
  [key: string]: {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
}

const IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
const IDLE_WARN_MS   = 18 * 60 * 1000; // warn at 18 minutes

interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: Permissions | null;
  isLoading: boolean;
  showIdleWarning: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  stayLoggedIn: () => void;
  hasRole: (role: string) => boolean;
  canAccess: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const sessionIdRef = useRef<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Load user from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedSession = localStorage.getItem('sessionId');
    if (savedToken) {
      if (savedSession) sessionIdRef.current = Number(savedSession);
      setToken(savedToken);
      fetchUserData(savedToken);
      startHeartbeat(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserData = async (authToken: string) => {
    try {
      const response = await fetch('/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      setUser(data.user);

      // Fetch permissions
      const permResponse = await fetch('/api/v1/auth/permissions', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (permResponse.ok) {
        const permData = await permResponse.json();
        setPermissions(permData.permissions);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      localStorage.removeItem('authToken');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      const newToken = data.token;

      setToken(newToken);
      setUser(data.user);
      localStorage.setItem('authToken', newToken);
      if (data.sessionId) {
        sessionIdRef.current = data.sessionId;
        localStorage.setItem('sessionId', String(data.sessionId));
      }

      // Fetch permissions
      const permResponse = await fetch('/api/v1/auth/permissions', {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (permResponse.ok) {
        const permData = await permResponse.json();
        setPermissions(permData.permissions);
      }

      // Start heartbeat every 3 minutes
      startHeartbeat(newToken);
    } finally {
      setIsLoading(false);
    }
  };

  const startHeartbeat = (authToken: string) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(async () => {
      try {
        await fetch('/api/v1/auth/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        });
      } catch { /* silent */ }
    }, 3 * 60 * 1000);
  };

  const clearIdleTimers = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
  };

  const startIdleTimers = useCallback(() => {
    clearIdleTimers();
    setShowIdleWarning(false);
    warnTimerRef.current = setTimeout(() => setShowIdleWarning(true), IDLE_WARN_MS);
    idleTimerRef.current = setTimeout(() => {
      // Auto logout — clear state then redirect
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      const savedToken = localStorage.getItem('authToken');
      const savedSession = Number(localStorage.getItem('sessionId'));
      if (savedToken && savedSession) {
        fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${savedToken}` },
          body: JSON.stringify({ sessionId: savedSession }),
        }).catch(() => {});
      }
      setUser(null); setToken(null); setPermissions(null);
      sessionIdRef.current = null;
      localStorage.removeItem('authToken');
      localStorage.removeItem('sessionId');
      setShowIdleWarning(false);
      window.location.replace('/login');
    }, IDLE_TIMEOUT_MS);
  }, []);

  // Attach activity listeners when logged in
  useEffect(() => {
    if (!user) return;
    const THROTTLE = 10_000; // only reset once per 10 s max
    const onActivity = () => {
      if (Date.now() - lastActivityRef.current < THROTTLE) return;
      lastActivityRef.current = Date.now();
      startIdleTimers();
    };
    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'] as const;
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));
    startIdleTimers(); // start on login
    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity));
      clearIdleTimers();
    };
  }, [user, startIdleTimers]);

  const stayLoggedIn = () => {
    lastActivityRef.current = Date.now();
    startIdleTimers();
  };

  const logout = async () => {
    clearIdleTimers();
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    const savedToken = token || localStorage.getItem('authToken');
    const savedSession = sessionIdRef.current || Number(localStorage.getItem('sessionId'));
    if (savedToken && savedSession) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${savedToken}` },
          body: JSON.stringify({ sessionId: savedSession }),
        });
      } catch { /* silent */ }
    }
    setUser(null);
    setToken(null);
    setPermissions(null);
    sessionIdRef.current = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('sessionId');
  };

  const hasRole = (role: string): boolean => {
    return user?.roles.includes(role) || false;
  };

  const canAccess = (module: string, action: string = 'view'): boolean => {
    if (!permissions || !permissions[module]) {
      return false;
    }

    const actionKey = `can${action.charAt(0).toUpperCase()}${action.slice(1)}` as keyof typeof permissions[string];
    return permissions[module][actionKey] || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        permissions,
        isLoading,
        showIdleWarning,
        login,
        logout,
        stayLoggedIn,
        hasRole,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
