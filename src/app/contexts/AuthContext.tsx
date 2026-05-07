import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: Permissions | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  canAccess: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      setToken(savedToken);
      fetchUserData(savedToken);
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

      // Fetch permissions
      const permResponse = await fetch('/api/v1/auth/permissions', {
        headers: {
          Authorization: `Bearer ${newToken}`,
        },
      });

      if (permResponse.ok) {
        const permData = await permResponse.json();
        setPermissions(permData.permissions);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPermissions(null);
    localStorage.removeItem('authToken');
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
        login,
        logout,
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
