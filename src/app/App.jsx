
import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { bootstrapAuth, logout } from '../features/auth/actions/authActions';
import { selectAuthBootstrapped } from '../features/auth/selectors/authSelectors';

import Layout from '../shared/components/Layout';
import ProtectedRoute from '../shared/components/ProtectedRoute';
import PublicRoute from '../shared/components/PublicRoute';

import LoginPage from '../features/Login/pages/Login';
import SettingsPage from '../features/settings/pages/settingsPage';
import DashboardPage from '../features/dashboard/Dashboard';
import ShopPage from '../features/shops/pages/ShopPage';
import FranchiseOwnerPage from '../features/franchiseOwners/pages/FranchiseOwnerPage';
import FamilyMembersScreen from '../features/Family/pages/familyMenbersScreen';
import TenantsPage from '../features/tenant/pages/TenantsPage';
import ShopAssignScreen from '../features/franchiseOwners/pages/ShopAssignScreen';
import FranchiseOwnerProfile from '../features/franchiseOwners/pages/FranchiseOwnerProfile';
import ContractPage from '../features/contract/pages/ContractPage';
import ContractDetailPage from '../features/contract/pages/ContractDetailPage';
import FamilyMemberProfile from '../features/Family/pages/FamilyMemberProfile';

import TenantProfile from '../features/tenant/pages/TenantProfile';
import EmployeesPage from '../features/employees/pages/EmployeesPage';
import EmployeeProfile from '../features/employees/pages/EmployeeProfile';
import ExpensesPage from '../features/expenses/pages/ExpensesPage'
import AdminUsersPage from '../features/adminUsers/pages/AdminUsersPage';



export default function App() {
  const dispatch = useDispatch();
  const bootstrapped = useSelector(selectAuthBootstrapped);


  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  const router = createBrowserRouter([
    // Login layout'suz
    {
      path: '/login',
      element: (
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      ),
    },
    // Diğer her şey Layout içinde
    {
      path: '/',
      element: <Layout onLogout={() => dispatch(logout())} />,
      children: [
        {
          index: true,
          element: (
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'dashboard',
          element: (
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          ),
        },
         {
          path: 'shops',
          element: (
            <ProtectedRoute>
              <ShopPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'contracts',
          element: (
            <ProtectedRoute>
              <ContractPage />
            </ProtectedRoute>
          ),
        },
        {
          path: "contracts/:id",   // 🔥 dinamik id
          element: (
            <ProtectedRoute>
              <ContractDetailPage />
            </ProtectedRoute>
          ),
        },
         {
          path: 'owners',
          element: (
            <ProtectedRoute>
              <FamilyMembersScreen />
            </ProtectedRoute>
          ),
        },
         {
          path: 'franchisees',
          element: (
            <ProtectedRoute>
              <FranchiseOwnerPage />
            </ProtectedRoute>
          ),
        },
         {
          path: 'tenants',
          element: (
            <ProtectedRoute>
              <TenantsPage />
            </ProtectedRoute>
          ),
        },
                 {
          path: 'expenses',
          element: (
            <ProtectedRoute>
              <ExpensesPage />
            </ProtectedRoute>
          ),
        },

          {
          path: 'tenant-profile/:tenantId',
          element: (
            <ProtectedRoute>
              <TenantProfile />
            </ProtectedRoute>
          ),
        },
        {
          path: 'admins',
          element: (
            <ProtectedRoute>
              <AdminUsersPage />
            </ProtectedRoute>
          ),
        },

        {
          path: 'settings',
          element: (
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'shop-assign/:ownerId',
          element: (
            <ProtectedRoute>
              <ShopAssignScreen />
            </ProtectedRoute>
          ),
        },
        {
          path: 'franchise-owner-profile/:ownerId',
          element: (
            <ProtectedRoute>
              <FranchiseOwnerProfile />
            </ProtectedRoute>
          ),
        },
        {
          path: 'family-member-profile/:familyId',
          element:(
            <ProtectedRoute>
              <FamilyMemberProfile/>
            </ProtectedRoute>
          )
        },
        {
          path: 'employees',
          element:(
            <ProtectedRoute>
              <EmployeesPage/>
            </ProtectedRoute>
          )
        },
        {
          path: 'employee-profile/:employeeId',
          element:(
            <ProtectedRoute>
              <EmployeeProfile/>
            </ProtectedRoute>
          )
        }

      ],
    },
  ]);

  if (!bootstrapped) {
    return (
      <div style={{ padding: 24 }}>
        <h3>Uygulama hazırlanıyor…</h3>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}