import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'sweetalert2/dist/sweetalert2.min.css';
import Login from './pages/Login/Login';
import DashboardLayout from './components/Layout/DashboardLayout';
import PropertyCustodianDashboard from './pages/Dashboard/PropertyCustodianDashboard';
import TeacherDashboard from './pages/Dashboard/TeacherDashboard';
import IctDashboard from './pages/Dashboard/IctDashboard';
import AccountingDashboard from './pages/Dashboard/AccountingDashboard';
import './App.css';

// Menu configurations for each user type
const propertyCustodianMenu = [
  { path: '/dashboard/property_custodian', label: 'Inventory Management', icon: 'fa-box' },
  { path: '/dashboard/property_custodian/reports', label: 'Reports', icon: 'fa-chart-bar' },
];

const teacherMenu = [
  { path: '/dashboard/teacher', label: 'My Items', icon: 'fa-box' },
  { path: '/dashboard/teacher/profile', label: 'My Profile', icon: 'fa-user' },
];

const ictMenu = [
  { path: '/dashboard/ict', label: 'System Settings', icon: 'fa-cog' },
  { path: '/dashboard/ict/backups', label: 'Backups', icon: 'fa-database' },
  { path: '/dashboard/ict/custodians', label: 'Property Custodians', icon: 'fa-users' },
];

const accountingMenu = [
  { path: '/dashboard/accounting', label: 'Analytics', icon: 'fa-chart-line' },
  { path: '/dashboard/accounting/inventory', label: 'Inventory List', icon: 'fa-list' },
];

// Protected Route Component
const ProtectedRoute = ({ children, allowedUserTypes }) => {
  const { isAuthenticated, userType } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedUserTypes && !allowedUserTypes.includes(userType)) {
    return <Navigate to={`/dashboard/${userType}`} replace />;
  }

  return children;
};

// Get menu based on user type
const getMenuForUserType = (userType) => {
  switch (userType) {
    case 'property_custodian':
      return propertyCustodianMenu;
    case 'teacher':
      return teacherMenu;
    case 'ict':
      return ictMenu;
    case 'accounting':
      return accountingMenu;
    default:
      return [];
  }
};

// App Routes Component
const AppRoutes = () => {
  const { isAuthenticated, userType } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Property Custodian Routes */}
      <Route
        path="/dashboard/property_custodian"
        element={
          <ProtectedRoute allowedUserTypes={['property_custodian']}>
            <DashboardLayout menuItems={getMenuForUserType('property_custodian')}>
              <PropertyCustodianDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Teacher Routes */}
      <Route
        path="/dashboard/teacher"
        element={
          <ProtectedRoute allowedUserTypes={['teacher']}>
            <DashboardLayout menuItems={getMenuForUserType('teacher')}>
              <TeacherDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      {/* ICT Routes */}
      <Route
        path="/dashboard/ict"
        element={
          <ProtectedRoute allowedUserTypes={['ict']}>
            <DashboardLayout menuItems={getMenuForUserType('ict')}>
              <IctDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Accounting Routes */}
      <Route
        path="/dashboard/accounting"
        element={
          <ProtectedRoute allowedUserTypes={['accounting']}>
            <DashboardLayout menuItems={getMenuForUserType('accounting')}>
              <AccountingDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Default redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={`/dashboard/${userType}`} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <ToastContainer />
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
