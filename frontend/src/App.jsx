import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-900"></div></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="ingredients" element={<IngredientsPage />} />
            <Route path="recipes" element={<RecipesPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="tables" element={<TablesPage />} />
            <Route path="kds" element={<KDSPage />} />
            <Route path="nutrition" element={<NutritionPage />} />
            <Route path="menu-print" element={<MenuPrintPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
