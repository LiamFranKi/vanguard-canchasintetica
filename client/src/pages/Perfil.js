import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import swalConfig from '../utils/swalConfig';
import FormCard from '../components/ui/FormCard';
import FormInput from '../components/ui/FormInput';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Perfil = () => {
  const { user, cambiarPassword, actualizarPerfil } = useAuth();
  const [modoEdicion, setModoEdicion] = useState(false);
  const [perfilData, setPerfilData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: ''
  });
  const [mostrarCambioPassword, setMostrarCambioPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    password_actual: '',
    password_nueva: '',
    password_confirmar: ''
  });

  // Inicializar datos del perfil cuando el usuario esté disponible
  useEffect(() => {
    if (user) {
      setPerfilData({
        nombre: user.nombre || '',
        apellido: user.apellido || '',
        email: user.email || '',
        telefono: user.telefono || ''
      });
    }
  }, [user]);

  const handleEditarPerfil = async (e) => {
    e.preventDefault();

    if (!perfilData.nombre || !perfilData.apellido) {
      swalConfig.toastError('Error', 'El nombre y apellido son requeridos');
      return;
    }

    const result = await actualizarPerfil(perfilData);

    if (result.success) {
      swalConfig.toastSuccess('¡Perfil Actualizado!', 'Tu información ha sido actualizada correctamente');
      setModoEdicion(false);
    } else {
      swalConfig.toastError('Error', result.message || 'Error al actualizar el perfil');
    }
  };

  const handleCancelarEdicion = () => {
    // Restaurar valores originales del usuario
    if (user) {
      setPerfilData({
        nombre: user.nombre || '',
        apellido: user.apellido || '',
        email: user.email || '',
        telefono: user.telefono || ''
      });
    }
    setModoEdicion(false);
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();

    if (passwordData.password_nueva !== passwordData.password_confirmar) {
      swalConfig.toastError('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (passwordData.password_nueva.length < 6) {
      swalConfig.toastError('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const result = await cambiarPassword(
      passwordData.password_actual,
      passwordData.password_nueva
    );

    if (result.success) {
      swalConfig.toastSuccess('¡Contraseña Cambiada!', 'Tu contraseña ha sido actualizada correctamente');

      setPasswordData({
        password_actual: '',
        password_nueva: '',
        password_confirmar: ''
      });
      setMostrarCambioPassword(false);
    } else {
      swalConfig.toastError('Error', result.message || 'Error al cambiar la contraseña');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">Mi Perfil</h1>
        <p className="text-gray-600">Gestiona tu información personal y contraseña</p>
      </div>

      <Card 
        title="Información Personal" 
        className="mb-6"
        headerAction={
          !modoEdicion ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModoEdicion(true)}
              icon="✏️"
            >
              Editar
            </Button>
          ) : null
        }
      >
        {modoEdicion ? (
          <FormCard
            onSubmit={handleEditarPerfil}
            onCancel={handleCancelarEdicion}
            submitLabel="Guardar Cambios"
            cancelLabel="Cancelar"
            padding={false}
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="mr-2">🆔</span>DNI
                </label>
                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 font-semibold text-gray-800">
                  {user?.dni}
                </div>
                <p className="text-xs text-gray-500 mt-1">El DNI no se puede modificar</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="mr-2">👔</span>Rol
                </label>
                <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 font-semibold text-green-700 capitalize">
                  {user?.rol}
                </div>
              </div>
              <FormInput
                label="Nombre"
                type="text"
                value={perfilData.nombre}
                onChange={(e) => setPerfilData({ ...perfilData, nombre: e.target.value })}
                placeholder="Ingresa tu nombre"
                required
                icon="👤"
              />
              <FormInput
                label="Apellido"
                type="text"
                value={perfilData.apellido}
                onChange={(e) => setPerfilData({ ...perfilData, apellido: e.target.value })}
                placeholder="Ingresa tu apellido"
                required
                icon="👤"
              />
              <FormInput
                label="Email"
                type="email"
                value={perfilData.email}
                onChange={(e) => setPerfilData({ ...perfilData, email: e.target.value })}
                placeholder="ejemplo@correo.com"
                icon="📧"
              />
              <FormInput
                label="Teléfono"
                type="tel"
                value={perfilData.telefono}
                onChange={(e) => setPerfilData({ ...perfilData, telefono: e.target.value })}
                placeholder="987654321"
                icon="📱"
              />
            </div>
          </FormCard>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="mr-2">🆔</span>DNI
              </label>
              <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 font-semibold text-gray-800">
                {user?.dni}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="mr-2">👤</span>Nombre
              </label>
              <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 font-semibold text-gray-800">
                {user?.nombre}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="mr-2">👤</span>Apellido
              </label>
              <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 font-semibold text-gray-800">
                {user?.apellido}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="mr-2">📧</span>Email
              </label>
              <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 font-semibold text-gray-800">
                {user?.email || 'No registrado'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="mr-2">📱</span>Teléfono
              </label>
              <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 font-semibold text-gray-800">
                {user?.telefono || 'No registrado'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="mr-2">👔</span>Rol
              </label>
              <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 font-semibold text-green-700 capitalize">
                {user?.rol}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card 
        title="Cambiar Contraseña"
        headerAction={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarCambioPassword(!mostrarCambioPassword)}
            icon={mostrarCambioPassword ? '✕' : '🔒'}
          >
            {mostrarCambioPassword ? 'Cancelar' : 'Cambiar'}
          </Button>
        }
      >
        {mostrarCambioPassword && (
          <FormCard
            onSubmit={handleCambiarPassword}
            onCancel={() => setMostrarCambioPassword(false)}
            submitLabel="Cambiar Contraseña"
            cancelLabel="Cancelar"
            padding={false}
          >
            <FormInput
              label="Contraseña Actual"
              type="password"
              value={passwordData.password_actual}
              onChange={(e) => setPasswordData({ ...passwordData, password_actual: e.target.value })}
              placeholder="Ingresa tu contraseña actual"
              required
              icon="🔒"
            />

            <FormInput
              label="Nueva Contraseña"
              type="password"
              value={passwordData.password_nueva}
              onChange={(e) => setPasswordData({ ...passwordData, password_nueva: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              icon="🔐"
            />

            <FormInput
              label="Confirmar Nueva Contraseña"
              type="password"
              value={passwordData.password_confirmar}
              onChange={(e) => setPasswordData({ ...passwordData, password_confirmar: e.target.value })}
              placeholder="Confirma tu nueva contraseña"
              required
              minLength={6}
              icon="🔐"
            />
          </FormCard>
        )}
      </Card>
    </div>
  );
};

export default Perfil;

