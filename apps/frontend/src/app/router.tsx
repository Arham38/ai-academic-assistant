import { createBrowserRouter, Navigate } from 'react-router-dom';
import { App } from '../App';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { UnauthorizedPage } from '../pages/auth/UnauthorizedPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { AdminPage } from '../pages/admin/AdminPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RequireAuth } from '../features/auth/components/RequireAuth';
import { RequireRole } from '../features/auth/components/RequireRole';
import { PublicOnly } from '../features/auth/components/PublicOnly';
import { PersistLogin } from '../features/auth/components/PersistLogin';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PersistLogin />,
    children: [
      {
        path: '/',
        element: <App />,
        children: [
          // Root index redirects straight to dashboard
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },

          // Public routes (accessible only when logged out)
          {
            element: <PublicOnly />,
            children: [
              {
                path: 'login',
                element: <LoginPage />,
              },
              {
                path: 'register',
                element: <RegisterPage />,
              },
            ],
          },

          // Protected authenticated routes
          {
            element: <RequireAuth />,
            children: [
              {
                path: 'dashboard',
                element: <DashboardPage />,
              },
              // Restricted RBAC sub-tree
              {
                element: <RequireRole allowedRoles={['ADMIN']} />,
                children: [
                  {
                    path: 'admin',
                    element: <AdminPage />,
                  },
                ],
              },
            ],
          },

          // 403 Access Denied
          {
            path: 'unauthorized',
            element: <UnauthorizedPage />,
          },

          // 404 Catch-all
          {
            path: '*',
            element: <NotFoundPage />,
          },
        ],
      },
    ],
  },
]);
