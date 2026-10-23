import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const PublicOnly: React.FC = () => {
  const { isAuthenticated, token } = useAuth();

  if (isAuthenticated || token) {
    // Authenticated users cannot re-access login/register screens
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
