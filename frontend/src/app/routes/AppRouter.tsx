import { Navigate } from 'react-router';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import AuthGuard from '@/app/guards/AuthGuard';
import RoleGuard from '@/app/guards/RoleGuard';
import ResponsiveLayout from '@/app/layout/ResponsiveLayout';

import LoginPage from '@/pages/Login/LoginPage';
import DashboardPage from '@/pages/Dashboard/DashboardPage';
import ProductsPage from '@/pages/Products/ProductsPage';
import LocationsPage from '@/pages/Locations/LocationsPage';
import StockPage from '@/pages/Stock/StockPage';
import LedgerPage from '@/pages/Ledger/LedgerPage';
import DocumentsPZPage from '@/pages/Documents/PZ/DocumentsPZPage';
import DocumentsMMPage from '@/pages/Documents/MM/DocumentsMMPage';
import DocumentsRWPage from '@/pages/Documents/RW/DocumentsRWPage';
import PutawayPage from '@/pages/Putaway/PutawayPage';
import PickingPage from '@/pages/Picking/PickingPage';
import InventoryPage from '@/pages/Inventory/InventoryPage';
import TasksPage from '@/pages/Tasks/TasksPage';
import ReportsPage from '@/pages/Reports/ReportsPage';
import AuditLogPage from '@/pages/AuditLog/AuditLogPage';
import UsersPage from '@/pages/Users/UsersPage';
import SettingsPage from '@/pages/Settings/SettingsPage';

const router = createBrowserRouter([
  // Public
  { path: '/login', element: <LoginPage /> },

  // Protected
  {
    element: <AuthGuard />,
    children: [
      {
        element: <ResponsiveLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },

          { path: '/dashboard', element: <DashboardPage /> },

          {
            element: <RoleGuard area="dictionaries" />,
            children: [
              { path: '/products', element: <ProductsPage /> },
              { path: '/locations', element: <LocationsPage /> },
            ],
          },

          {
            element: <RoleGuard area="movements" />,
            children: [
              { path: '/stock', element: <StockPage /> },
              { path: '/ledger', element: <LedgerPage /> },
              { path: '/putaway', element: <PutawayPage /> },
              { path: '/picking', element: <PickingPage /> },
            ],
          },

          {
            element: <RoleGuard area="documents" />,
            children: [
              { path: '/documents/pz', element: <DocumentsPZPage /> },
              { path: '/documents/mm', element: <DocumentsMMPage /> },
              { path: '/documents/rw', element: <DocumentsRWPage /> },
            ],
          },

          {
            element: <RoleGuard area="inventory" />,
            children: [{ path: '/inventory', element: <InventoryPage /> }],
          },

          {
            element: <RoleGuard area="tasks" />,
            children: [{ path: '/tasks', element: <TasksPage /> }],
          },

          {
            element: <RoleGuard area="reports" />,
            children: [
              { path: '/reports', element: <ReportsPage /> },
              { path: '/audit-log', element: <AuditLogPage /> },
            ],
          },

          {
            element: <RoleGuard area="users" />,
            children: [{ path: '/users', element: <UsersPage /> }],
          },

          {
            element: <RoleGuard area="systemConfig" />,
            children: [{ path: '/settings', element: <SettingsPage /> }],
          },

          // Fallback
          { path: '*', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
