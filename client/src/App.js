import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Canchas from './pages/Canchas';
import Reservas from './pages/Reservas';
import Horarios from './pages/Horarios';
import Pagos from './pages/Pagos';
import Perfil from './pages/Perfil';
import Mensajes from './pages/Mensajes';
import Notificaciones from './pages/Notificaciones';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCanchas from './pages/admin/AdminCanchas';
import AdminHorarios from './pages/admin/AdminHorarios';
import AdminUsuarios from './pages/admin/AdminUsuarios';
import AdminReservas from './pages/admin/AdminReservas';
import AdminPagos from './pages/admin/AdminPagos';
import AdminConfig from './pages/admin/AdminConfig';
import AdminReportes from './pages/admin/AdminReportes';
import AdminMensajes from './pages/admin/AdminMensajes';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AdminLayout from './components/layouts/AdminLayout';
import EmpleadoLayout from './components/layouts/EmpleadoLayout';

// Empleado Pages
import EmpleadoDashboard from './pages/empleado/EmpleadoDashboard';
import EmpleadoReservas from './pages/empleado/EmpleadoReservas';
import EmpleadoHorarios from './pages/empleado/EmpleadoHorarios';
import EmpleadoUsuarios from './pages/empleado/EmpleadoUsuarios';
import EmpleadoReportes from './pages/empleado/EmpleadoReportes';
import EmpleadoMensajes from './pages/empleado/EmpleadoMensajes';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-green-700">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/app" />;
  }

  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route 
        path="/login" 
        element={
          user ? (
            user.rol === 'admin' ? <Navigate to="/admin" /> :
            user.rol === 'empleado' ? <Navigate to="/empleado" /> :
            <Navigate to="/app" />
          ) : (
            <Login />
          )
        } 
      />
      
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Horarios />} />
        <Route path="canchas" element={<Canchas />} />
        <Route path="reservas" element={<Reservas />} />
        <Route path="horarios" element={<Horarios />} />
        <Route path="pagos" element={<Pagos />} />
        <Route path="mensajes" element={<Mensajes />} />
        <Route path="notificaciones" element={<Notificaciones />} />
        <Route path="perfil" element={<Perfil />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin', 'empleado']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="canchas" element={<AdminCanchas />} />
        <Route path="horarios" element={<AdminHorarios />} />
        <Route path="usuarios" element={<AdminUsuarios />} />
        <Route path="reservas" element={<AdminReservas />} />
        <Route path="pagos" element={<AdminPagos />} />
        <Route path="reportes" element={<AdminReportes />} />
        <Route path="mensajes" element={<AdminMensajes />} />
        <Route path="notificaciones" element={<Notificaciones />} />
        <Route path="config" element={<AdminConfig />} />
      </Route>

      <Route
        path="/empleado"
        element={
          <ProtectedRoute allowedRoles={['admin', 'empleado']}>
            <EmpleadoLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<EmpleadoDashboard />} />
        <Route path="reservas" element={<EmpleadoReservas />} />
        <Route path="horarios" element={<EmpleadoHorarios />} />
        <Route path="usuarios" element={<EmpleadoUsuarios />} />
        <Route path="reportes" element={<EmpleadoReportes />} />
        <Route path="mensajes" element={<EmpleadoMensajes />} />
        <Route path="notificaciones" element={<Notificaciones />} />
        <Route path="perfil" element={<Perfil />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ConfigProvider>
        <Router>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Router>
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;

