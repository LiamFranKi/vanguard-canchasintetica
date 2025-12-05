import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import swalConfig from '../../utils/swalConfig';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { getConfig } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Obtener el título del panel desde la configuración, o usar el nombre de la empresa
  const tituloAdmin = getConfig('titulo_panel_admin') || getConfig('nombre_empresa') || 'Administración';

  const handleLogout = async () => {
    const result = await swalConfig.confirm(
      '¿Cerrar sesión?',
      'Estás seguro de que deseas salir del sistema',
      {
        confirmText: 'Sí, salir',
        confirmColor: '#ef4444',
        cancelText: 'Cancelar'
      }
    );

    if (result.isConfirmed) {
      logout();
      navigate('/login');
      swalConfig.toastSuccess('Sesión cerrada', 'Has cerrado sesión correctamente');
    }
  };

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊', roles: ['admin', 'empleado'] },
    { path: '/admin/canchas', label: 'Canchas', icon: '⚽', roles: ['admin'] },
    { path: '/admin/horarios', label: 'Horarios', icon: '📅', roles: ['admin'] },
    { path: '/admin/reservas', label: 'Reservas', icon: '📋', roles: ['admin', 'empleado'] },
    { path: '/admin/usuarios', label: 'Usuarios', icon: '👥', roles: ['admin', 'empleado'] },
    { path: '/admin/reportes', label: 'Reportes', icon: '📈', roles: ['admin', 'empleado'] },
    // { path: '/admin/pagos', label: 'Pagos', icon: '💳', roles: ['admin', 'empleado'] }, // Oculto: integrado en Reservas
    { path: '/admin/config', label: 'Configuración', icon: '⚙️', roles: ['admin'] }
  ].filter(item => item.roles.includes(user?.rol));

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-green-600 text-white p-4 flex justify-between items-center z-50">
        <h1 className="text-xl font-bold">⚽ Admin</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-2xl"
        >
          ☰
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed lg:fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } transition-transform duration-300 ease-in-out`}
        style={{ top: '0' }}
      >
        <div className="h-full flex flex-col overflow-y-auto">
          <div className="p-6 bg-green-700 text-white text-center">
            <div className="mb-2">
              <span className="text-4xl">⚽</span>
            </div>
            <h2 className="text-xl font-bold mb-2">{tituloAdmin}</h2>
            <p className="text-sm opacity-90">{user?.nombre} {user?.apellido}</p>
            <p className="text-xs opacity-75 capitalize">{user?.rol}</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 p-3 rounded-lg transition ${
                  isActive(item.path)
                    ? 'bg-green-600 text-white'
                    : 'text-gray-700 hover:bg-green-50'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t space-y-2">
            {/* Botones Vista Usuario y Vista Empleado ocultos para todos los roles */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-3 p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
            >
              <span className="text-xl">🚪</span>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 ml-0 lg:ml-64 pt-16 lg:pt-0">
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

