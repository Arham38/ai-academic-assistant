import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export interface RequireRoleProps {
  allowedRoles: string[];
}

export const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles }) => {
  const { role } = useAuth();

  if (!role || !allowedRoles.includes(role)) {
    // Forbidden: User lacks necessary privileges for this route branch
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
