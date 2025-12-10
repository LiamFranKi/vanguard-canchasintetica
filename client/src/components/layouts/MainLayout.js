import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import swalConfig from '../../utils/swalConfig';
import NotificacionesBadge from '../ui/NotificacionesBadge';
import PushNotificationToggle from '../ui/PushNotificationToggle';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const { getConfig } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();

  const tituloEmpresa = getConfig('nombre_empresa') || 'Canchas Sintéticas';

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
    { path: '/app', label: 'Horarios', icon: '📅', exact: true },
    { path: '/app/reservas', label: 'Mis Reservas', icon: '📋' },
    { path: '/app/mensajes', label: 'Mensajes', icon: '📨' },
    { path: '/app/perfil', label: 'Perfil', icon: '👤' }
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Superior */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo y Título */}
            <div className="flex items-center space-x-3">
              <span className="text-3xl">⚽</span>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{tituloEmpresa}</h1>
                <p className="text-xs text-gray-600">{user?.nombre} {user?.apellido}</p>
              </div>
            </div>

            {/* Navegación con Iconos */}
            <nav className="flex items-center space-x-2 lg:space-x-4">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200
                    min-w-[80px] lg:min-w-[100px]
                    ${isActive(item.path, item.exact)
                      ? 'bg-green-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-green-50 hover:shadow-md'
                    }
                  `}
                  title={item.label}
                >
                  <span className="text-2xl lg:text-3xl mb-1">{item.icon}</span>
                  <span className="text-xs lg:text-sm font-semibold">{item.label}</span>
                </Link>
              ))}
              
              {/* Badge de Notificaciones */}
              <NotificacionesBadge usuarioId={user?.id} rol={user?.rol} />
              
              {/* Toggle Push Notifications */}
              <PushNotificationToggle usuarioId={user?.id} variant="icon" />
              
              {/* Botón Cerrar Sesión */}
              <button
                onClick={handleLogout}
                className="flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 min-w-[80px] lg:min-w-[100px] text-red-600 hover:bg-red-50 hover:shadow-md"
                title="Cerrar Sesión"
              >
                <span className="text-2xl lg:text-3xl mb-1">🚪</span>
                <span className="text-xs lg:text-sm font-semibold">Salir</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Contenido Principal con padding adecuado */}
      <main className="flex-1 overflow-auto px-4 lg:px-8 py-6 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
