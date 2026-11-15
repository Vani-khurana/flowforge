import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { Role } from './types';

// Feature Pages
import { Dashboard } from './pages/Dashboard';
import { Requests } from './pages/Requests';
import { Approvals } from './pages/Approvals';
import { Workflows } from './pages/Workflows';
import { AuditLogs } from './pages/AuditLogs';
import { Team } from './pages/Team';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { DocumentReview } from './pages/DocumentReview';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

const ProtectedAppLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-forge-950 flex items-center justify-center text-forge-400">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not authenticated, redirect to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
};

const RoleRoute: React.FC<{ allowedRoles: Role[]; children: React.ReactElement }> = ({
  allowedRoles,
  children,
}) => {
  const { role, user } = useAuth();
  const currentRole: Role = role || user?.role || 'EMPLOYEE';

  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Application Routes */}
              <Route path="/" element={<ProtectedAppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="requests" element={<Requests />} />
                <Route
                  path="approvals"
                  element={
                    <RoleRoute allowedRoles={['MANAGER', 'DEPARTMENT_HEAD', 'HR', 'FINANCE', 'ADMIN']}>
                      <Approvals />
                    </RoleRoute>
                  }
                />
                <Route
                  path="documents/review"
                  element={
                    <RoleRoute allowedRoles={['MANAGER', 'DEPARTMENT_HEAD', 'HR', 'FINANCE', 'ADMIN']}>
                      <DocumentReview />
                    </RoleRoute>
                  }
                />
                <Route
                  path="workflows"
                  element={
                    <RoleRoute allowedRoles={['DEPARTMENT_HEAD', 'ADMIN']}>
                      <Workflows />
                    </RoleRoute>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <RoleRoute allowedRoles={['DEPARTMENT_HEAD', 'HR', 'FINANCE', 'ADMIN']}>
                      <AuditLogs />
                    </RoleRoute>
                  }
                />
                <Route
                  path="users"
                  element={
                    <RoleRoute allowedRoles={['MANAGER', 'DEPARTMENT_HEAD', 'HR', 'ADMIN']}>
                      <Team />
                    </RoleRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <RoleRoute allowedRoles={['ADMIN']}>
                      <Settings />
                    </RoleRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
