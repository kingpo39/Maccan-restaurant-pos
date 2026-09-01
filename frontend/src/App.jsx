import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { hasPageAccess } from './utils/permissions';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IngredientsPage from './pages/IngredientsPage';
import RecipesPage from './pages/RecipesPage';
import SuppliersPage from './pages/SuppliersPage';
import InventoryPage from './pages/InventoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import TablesPage from './pages/TablesPage';
import KDSPage from './pages/KDSPage';
import NutritionPage from './pages/NutritionPage';
import MenuPrintPage from './pages/MenuPrintPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-900 mx-auto mb-4"></div>
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

// Permission-guarded route wrapper
function PermissionRoute({ pagePath, children, fallback = '/' }) {
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];

  if (!hasPageAccess(userPermissions, pagePath)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">دسترسی محدود شده</h2>
          <h3 className="text-sm text-gray-500 mb-4">Access Denied</h3>
          <p className="text-gray-600 text-sm mb-6">
            شما اجازه دسترسی به این بخش را ندارید.
            <br />
            <span className="text-xs text-gray-400">Your role does not have permission for this page.</span>
          </p>
          <button
            onClick={() => window.location.href = fallback}
            className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition text-sm"
          >
            بازگشت به داشبورد
          </button>
        </div>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/menu-print" element={<MenuPrintPage />} />
            <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={
                <PermissionRoute pagePath="/">
                  <DashboardPage />
                </PermissionRoute>
              } />
              <Route path="ingredients" element={
                <PermissionRoute pagePath="/ingredients">
                  <IngredientsPage />
                </PermissionRoute>
              } />
              <Route path="recipes" element={
                <PermissionRoute pagePath="/recipes">
                  <RecipesPage />
                </PermissionRoute>
              } />
              <Route path="inventory" element={
                <PermissionRoute pagePath="/inventory">
                  <InventoryPage />
                </PermissionRoute>
              } />
              <Route path="tables" element={
                <PermissionRoute pagePath="/tables">
                  <TablesPage />
                </PermissionRoute>
              } />
              <Route path="kds" element={
                <PermissionRoute pagePath="/kds">
                  <KDSPage />
                </PermissionRoute>
              } />
              <Route path="nutrition" element={
                <PermissionRoute pagePath="/nutrition">
                  <NutritionPage />
                </PermissionRoute>
              } />
              <Route path="analytics" element={
                <PermissionRoute pagePath="/analytics">
                  <AnalyticsPage />
                </PermissionRoute>
              } />
              <Route path="suppliers" element={
                <PermissionRoute pagePath="/suppliers">
                  <SuppliersPage />
                </PermissionRoute>
              } />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
