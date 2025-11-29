import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastContainer } from "./services/notificationService";
import "react-toastify/dist/ReactToastify.css";
import "sweetalert2/dist/sweetalert2.min.css";

// Route Components
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import PropertyCustodianRoute from "./components/PropertyCustodianRoute";
import TeacherRoute from "./components/TeacherRoute";
import IctRoute from "./components/IctRoute";
import AccountingRoute from "./components/AccountingRoute";
import IctAccountingRoute from "./components/IctAccountingRoute";

// Public Pages
import Login from "./pages/Login/Login";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

// Import Layout
import Layout from "./components/Layout/Layout";

// Dashboard Pages
import PropertyCustodianDashboard from "./pages/Dashboard/PropertyCustodianDashboard";
import TeacherDashboard from "./pages/Dashboard/TeacherDashboard";
import IctDashboard from "./pages/Dashboard/IctDashboard";
import AccountingDashboard from "./pages/Dashboard/AccountingDashboard";
import PropertyCustodiansManagement from "./pages/ict/PropertyCustodians/PropertyCustodiansManagement";
import SchoolsManagement from "./pages/ict/Schools/SchoolsManagement";
import AccountingManagement from "./pages/accounting/AccountingManagement";
import Backups from "./pages/ict/Backups/Backups";
import IctProfile from "./pages/ict/IctProfile/IctProfile";
import IctSettings from "./pages/ict/IctSettings/IctSettings";
import DcpPackages from "./pages/ict/DcpPackages/DcpPackages";

// Property Custodian Pages
import Inventory from "./pages/PropertyCustodian/Inventory/Inventory";
import InventoryCategories from "./pages/PropertyCustodian/Inventory/InventoryCategories";
import AssignedItems from "./pages/PropertyCustodian/AssignedItems/AssignedItems";
import PersonnelManagement from "./pages/PropertyCustodian/PersonnelManagement/PersonnelManagement";
import InventoryReports from "./pages/PropertyCustodian/InventoryReports/InventoryReports";
import CustodianDcpPackages from "./pages/PropertyCustodian/DcpPackages/DcpPackages";
import DcpInventory from "./pages/PropertyCustodian/DcpPackages/DcpInventory";
import SchoolProfile from "./pages/PropertyCustodian/SchoolProfile/SchoolProfile";
import CustodianSettings from "./pages/PropertyCustodian/Settings/Settings";

import "./App.css";

// App Routes Component
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <IctProfile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <IctAccountingRoute>
            <Layout>
              <IctSettings />
            </Layout>
          </IctAccountingRoute>
        }
      />
      <Route
        path="/backups"
        element={
          <IctRoute>
            <Layout>
              <Backups />
            </Layout>
          </IctRoute>
        }
      />
      <Route
        path="/dashboard/ict/dcp-packages"
        element={
          <IctRoute>
            <Layout>
              <DcpPackages />
            </Layout>
          </IctRoute>
        }
      />

      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Property Custodian Routes */}
      <Route
        path="/custodian"
        element={
          <PropertyCustodianRoute>
            <Layout>
              <PropertyCustodianDashboard />
            </Layout>
          </PropertyCustodianRoute>
        }
      />
      <Route
        path="/custodian/profile"
        element={
          <PropertyCustodianRoute>
            <Layout>
              <SchoolProfile />
            </Layout>
          </PropertyCustodianRoute>
        }
      />
      <Route
        path="/custodian/inventory"
        element={
          <PropertyCustodianRoute>
            <Layout>
              <Inventory />
            </Layout>
          </PropertyCustodianRoute>
        }
      />
      <Route
        path="/custodian/inventory/categories"
        element={
          <PropertyCustodianRoute>
            <Layout>
              <InventoryCategories />
            </Layout>
          </PropertyCustodianRoute>
        }
      />
      <Route
        path="/custodian/assigned-items"
        element={
          <PropertyCustodianRoute>
            <Layout>
              <AssignedItems />
            </Layout>
          </PropertyCustodianRoute>
        }
      />
      <Route
        path="/custodian/personnel"
        element={
          <PropertyCustodianRoute>
            <Layout>
              <PersonnelManagement />
            </Layout>
          </PropertyCustodianRoute>
        }
      />
      <Route
        path="/custodian/reports"
        element={
          <PropertyCustodianRoute>
            <Layout>
              <InventoryReports />
            </Layout>
          </PropertyCustodianRoute>
        }
      />
      <Route
        path="/custodian/dcp-packages"
        element={
          <PropertyCustodianRoute>
            <Layout>
              <CustodianDcpPackages />
            </Layout>
          </PropertyCustodianRoute>
        }
      />
      <Route
        path="/custodian/dcp-inventory"
        element={
          <PropertyCustodianRoute>
            <Layout>
              <DcpInventory />
            </Layout>
          </PropertyCustodianRoute>
        }
      />

      {/* Teacher Routes */}
      <Route
        path="/faculty"
        element={
          <TeacherRoute>
            <Layout>
              <TeacherDashboard />
            </Layout>
          </TeacherRoute>
        }
      />

      {/* ICT Routes */}
      <Route
        path="/dashboard"
        element={
          <IctRoute>
            <Layout>
              <IctDashboard />
            </Layout>
          </IctRoute>
        }
      />
      <Route
        path="/dashboard/ict/custodians"
        element={
          <IctRoute>
            <Layout>
              <PropertyCustodiansManagement />
            </Layout>
          </IctRoute>
        }
      />
      <Route
        path="/dashboard/ict/schools"
        element={
          <IctRoute>
            <Layout>
              <SchoolsManagement />
            </Layout>
          </IctRoute>
        }
      />
      <Route
        path="/dashboard/ict/accounting"
        element={
          <IctRoute>
            <Layout>
              <AccountingManagement />
            </Layout>
          </IctRoute>
        }
      />

      {/* Accounting Routes */}
      <Route
        path="/finance"
        element={
          <AccountingRoute>
            <Layout>
              <AccountingDashboard />
            </Layout>
          </AccountingRoute>
        }
      />

      {/* Property Custodian Settings */}
      <Route
        path="/custodian/settings"
        element={
          <PropertyCustodianRoute>
            <Layout>
              <CustodianSettings />
            </Layout>
          </PropertyCustodianRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Catch all route - 404 Not Found */}
      <Route path="*" element={<NotFound />} />
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
