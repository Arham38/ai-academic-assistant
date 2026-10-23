import { createBrowserRouter, Navigate } from 'react-router-dom';
import { App } from '../App';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { UnauthorizedPage } from '../pages/auth/UnauthorizedPage';
import { DashboardOverview } from '../pages/dashboard/DashboardOverview';
import { StudentDashboardPage } from '../pages/dashboard/StudentDashboardPage';
import { ResearcherHubPage } from '../pages/dashboard/ResearcherHubPage';
import { DocumentsPage } from '../pages/documents/DocumentsPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { AdminPage } from '../pages/admin/AdminPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RequireAuth } from '../features/auth/components/RequireAuth';
import { RequireRole } from '../features/auth/components/RequireRole';
import { PublicOnly } from '../features/auth/components/PublicOnly';
import { PersistLogin } from '../features/auth/components/PersistLogin';
import { DashboardLayout } from '../components/layout/DashboardLayout';

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

          // Protected authenticated routes nested inside DashboardLayout
          {
            element: <RequireAuth />,
            children: [
              {
                element: <DashboardLayout />,
                children: [
                  // Core Academic Dashboard Overview
                  {
                    path: 'dashboard',
                    element: <DashboardOverview />,
                  },

                  // Student Hub (accessible across all authenticated roles)
                  {
                    path: 'dashboard/student',
                    element: <StudentDashboardPage />,
                  },

                  // Researcher Hub (restricted to RESEARCHER and ADMIN roles)
                  {
                    element: <RequireRole allowedRoles={['RESEARCHER', 'ADMIN']} />,
                    children: [
                      {
                        path: 'dashboard/research',
                        element: <ResearcherHubPage />,
                      },
                    ],
                  },

                  // Admin Panel (restricted to ADMIN role)
                  {
                    element: <RequireRole allowedRoles={['ADMIN']} />,
                    children: [
                      {
                        path: 'dashboard/admin',
                        element: <AdminPage />,
                      },
                      {
                        path: 'admin',
                        element: <AdminPage />,
                      },
                    ],
                  },

                  // Manuscript & Plagiarism Report Library
                  {
                    path: 'documents',
                    element: <DocumentsPage />,
                  },

                  // Account Profile & Security Settings
                  {
                    path: 'settings',
                    element: <SettingsPage />,
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
