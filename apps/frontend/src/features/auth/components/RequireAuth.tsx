import React from 'react';
import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const RequireAuth: React.FC = () => {
  const { isAuthenticated, token } = useAuth();
  const location = useLocation();

  if (!isAuthenticated && !token) {
    // Redirect unauthenticated users to /login preserving the intended target URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
