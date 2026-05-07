import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredModule?: string;
  requiredAction?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredModule,
  requiredAction = 'view',
}: ProtectedRouteProps) {
  const { user, isLoading, hasRole, canAccess } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-[#14856E]" size={32} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (requiredModule && !canAccess(requiredModule, requiredAction)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Module Access Denied</h1>
          <p className="text-gray-600 mt-2">
            You don't have permission to {requiredAction} this module.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
