import { createBrowserRouter, Navigate } from 'react-router-dom';
import React from 'react';
import { App } from '../App';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { UnauthorizedPage } from '../pages/auth/UnauthorizedPage';
import { DashboardOverview } from '../pages/dashboard/DashboardOverview';
import { StudentDashboardPage } from '../pages/dashboard/StudentDashboardPage';
import { ResearcherHubPage } from '../pages/dashboard/ResearcherHubPage';
import { DocumentsPage, DocumentLayout, DocumentOverview, DocumentChat } from '../pages/documents';
import { UploadPage } from '../features/documents/pages/UploadPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { AdminPage } from '../pages/admin/AdminPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RequireAuth } from '../features/auth/components/RequireAuth';
import { RequireRole } from '../features/auth/components/RequireRole';
import { PublicOnly } from '../features/auth/components/PublicOnly';
import { PersistLogin } from '../features/auth/components/PersistLogin';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../features/auth/hooks/useAuth';

const RootIndex: React.FC = () => {
  const { isAuthenticated, token, user } = useAuth();
  if (isAuthenticated && token && user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PersistLogin />,
    children: [
      {
        path: '/',
        element: <App />,
        children: [
          // Root index routes to dashboard when authenticated, or login when unauthenticated
          {
            index: true,
            element: <RootIndex />,
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

                  // Manuscript & Plagiarism Report Library (with nested document views)
                  {
                    path: 'documents',
                    children: [
                      {
                        index: true,
                        element: <DocumentsPage />,
                      },
                      {
                        path: 'upload',
                        element: <UploadPage />,
                      },
                      {
                        path: ':documentId',
                        element: <DocumentLayout />,
                        children: [
                          {
                            index: true,
                            element: <Navigate to="overview" replace />,
                          },
                          {
                            path: 'overview',
                            element: <DocumentOverview />,
                          },
                          {
                            path: 'chat',
                            element: <DocumentChat />,
                          },
                          {
                            path: 'report',
                            element: <DocumentOverview />,
                          },
                          {
                            path: '*',
                            element: <Navigate to="overview" replace />,
                          },
                        ],
                      },
                    ],
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
