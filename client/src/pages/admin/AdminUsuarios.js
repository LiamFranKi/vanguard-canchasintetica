import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import swalConfig from '../../utils/swalConfig';
import { useAuth } from '../../context/AuthContext';
import FormCard from '../../components/ui/FormCard';
import FormInput from '../../components/ui/FormInput';
import FormSelect from '../../components/ui/FormSelect';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const AdminUsuarios = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [formData, setFormData] = useState({
    dni: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    rol: 'usuario'
  });

  useEffect(() => {
    loadUsuarios();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [usuarios, filtroRol, filtroBusqueda]);

  const loadUsuarios = async () => {
    try {
      // Cargar todos los usuarios sin filtrar por rol
      const response = await api.get('/users');
      setUsuarios(response.data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let filtrados = [...usuarios];

    // Filtrar por rol
    if (filtroRol) {
      filtrados = filtrados.filter(usuario => usuario.rol === filtroRol);
    }

    // Filtrar por búsqueda (nombre, apellido, DNI, email)
    if (filtroBusqueda) {
      const busqueda = filtroBusqueda.toLowerCase();
      filtrados = filtrados.filter(usuario => 
        usuario.dni.toLowerCase().includes(busqueda) ||
        usuario.nombre.toLowerCase().includes(busqueda) ||
        usuario.apellido.toLowerCase().includes(busqueda) ||
        (usuario.email && usuario.email.toLowerCase().includes(busqueda))
      );
    }

    setUsuariosFiltrados(filtrados);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Si el usuario es empleado, forzar rol 'usuario'
      const datosEnvio = { ...formData };
      if (user?.rol === 'empleado') {
        datosEnvio.rol = 'usuario';
      }

      if (usuarioEditando) {
        // Actualizar usuario existente
        await api.put(`/users/${usuarioEditando.id}`, datosEnvio);
        swalConfig.toastSuccess('¡Usuario Actualizado!', 'El usuario se ha actualizado exitosamente');
      } else {
        // Crear nuevo usuario
        await api.post('/users', datosEnvio);
        swalConfig.toastSuccess('¡Usuario Creado!', 'El usuario se ha registrado exitosamente');
      }
      setMostrarFormulario(false);
      setUsuarioEditando(null);
      setFormData({ dni: '', nombre: '', apellido: '', email: '', telefono: '', rol: 'usuario' });
      loadUsuarios();
    } catch (error) {
      swalConfig.toastError('Error', error.response?.data?.message || `Error al ${usuarioEditando ? 'actualizar' : 'crear'} el usuario`);
    }
  };

  const handleEditar = (usuario) => {
    setUsuarioEditando(usuario);
    setFormData({
      dni: usuario.dni,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email || '',
      telefono: usuario.telefono || '',
      rol: usuario.rol
    });
    setMostrarFormulario(true);
  };

  const handleEliminar = async (id, nombre) => {
    const result = await swalConfig.confirm(
      '¿Eliminar usuario?',
      `¿Estás seguro de que deseas eliminar a ${nombre}? Esta acción no se puede deshacer.`,
      {
        confirmText: 'Sí, eliminar',
        confirmColor: '#ef4444',
        cancelText: 'Cancelar'
      }
    );

    if (result.isConfirmed) {
      try {
        await api.delete(`/users/${id}`);
        swalConfig.toastSuccess('Usuario Eliminado', 'El usuario se ha eliminado correctamente');
        loadUsuarios();
      } catch (error) {
        swalConfig.toastError('Error', error.response?.data?.message || 'Error al eliminar el usuario');
      }
    }
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setUsuarioEditando(null);
    setFormData({ dni: '', nombre: '', apellido: '', email: '', telefono: '', rol: 'usuario' });
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">Gestión de Usuarios</h1>
            <p className="text-gray-600">Administra los usuarios del sistema</p>
          </div>
          <Button
            variant={mostrarFormulario ? 'secondary' : 'primary'}
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            icon={mostrarFormulario ? '✕' : '➕'}
          >
            {mostrarFormulario ? 'Cancelar' : 'Nuevo Usuario'}
          </Button>
        </div>

        {/* Filtros */}
        <Card className="p-4 mb-4">
          <div className="grid md:grid-cols-2 gap-4">
            <FormInput
              label="Buscar"
              type="text"
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
              placeholder="Buscar por nombre, apellido, DNI o email..."
              icon="🔍"
            />
            <FormSelect
              label="Filtrar por Rol"
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              options={[
                { value: '', label: 'Todos los roles' },
                { value: 'admin', label: 'Administrador' },
                { value: 'empleado', label: 'Empleado' },
                { value: 'usuario', label: 'Usuario' }
              ]}
              icon="👔"
            />
          </div>
          {(filtroRol || filtroBusqueda) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                <strong>{usuariosFiltrados.length}</strong> usuario{usuariosFiltrados.length !== 1 ? 's' : ''} encontrado{usuariosFiltrados.length !== 1 ? 's' : ''}
                {(filtroRol || filtroBusqueda) && (
                  <button
                    onClick={() => {
                      setFiltroRol('');
                      setFiltroBusqueda('');
                    }}
                    className="ml-2 text-green-600 hover:text-green-700 font-semibold"
                  >
                    Limpiar filtros
                  </button>
                )}
              </p>
            </div>
          )}
        </Card>
      </div>

      {mostrarFormulario && (
        <FormCard
          title={usuarioEditando ? "Editar Usuario" : "Nuevo Usuario"}
          subtitle={usuarioEditando ? "Modifica los datos del usuario" : "Completa los datos para crear un nuevo usuario"}
          onSubmit={handleSubmit}
          onCancel={handleCancelar}
          submitLabel={usuarioEditando ? "Actualizar Usuario" : "Crear Usuario"}
          cancelLabel="Cancelar"
          className="mb-6"
        >
          <div className="grid md:grid-cols-2 gap-6">
            <FormInput
              label="DNI"
              type="text"
              value={formData.dni}
              onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
              placeholder="Ingresa el DNI"
              required
              disabled={!!usuarioEditando}
              icon="🆔"
            />
            {user?.rol === 'admin' ? (
              <FormSelect
                label="Rol"
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                options={[
                  { value: 'admin', label: 'Administrador' },
                  { value: 'empleado', label: 'Empleado' },
                  { value: 'usuario', label: 'Usuario' }
                ]}
                icon="👔"
                required
              />
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="mr-2">👔</span>Rol
                </label>
                <div className="px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl text-gray-600">
                  Usuario (solo puedes crear usuarios)
                </div>
                <input type="hidden" value="usuario" />
              </div>
            )}
            <FormInput
              label="Nombre"
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ingresa el nombre"
              required
              icon="👤"
            />
            <FormInput
              label="Apellido"
              type="text"
              value={formData.apellido}
              onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
              placeholder="Ingresa el apellido"
              required
              icon="👤"
            />
            <FormInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="correo@ejemplo.com"
              icon="📧"
            />
            <FormInput
              label="Teléfono"
              type="text"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="Número de teléfono"
              icon="📱"
            />
          </div>
        </FormCard>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Cargando usuarios...</div>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                  <th className="px-6 py-4 text-center font-semibold">DNI</th>
                  <th className="px-6 py-4 text-center font-semibold">Nombre</th>
                  <th className="px-6 py-4 text-center font-semibold">Email</th>
                  <th className="px-6 py-4 text-center font-semibold">Teléfono</th>
                  <th className="px-6 py-4 text-center font-semibold">Rol</th>
                  <th className="px-6 py-4 text-center font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      {loading ? 'Cargando...' : 'No se encontraron usuarios'}
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.id} className="border-b hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-center font-medium">{usuario.dni}</td>
                      <td className="px-6 py-4 text-center">{usuario.nombre} {usuario.apellido}</td>
                      <td className="px-6 py-4 text-center text-gray-600">{usuario.email || '-'}</td>
                      <td className="px-6 py-4 text-center text-gray-600">{usuario.telefono || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-4 py-2 rounded-full text-xs font-semibold shadow-md capitalize ${
                          usuario.rol === 'admin'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : usuario.rol === 'empleado'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {usuario.rol === 'admin' ? '👑 Admin' : usuario.rol === 'empleado' ? '👔 Empleado' : '👤 Usuario'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditar(usuario)}
                            icon="✏️"
                            className="px-3"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleEliminar(usuario.id, `${usuario.nombre} ${usuario.apellido}`)}
                            icon="🗑️"
                            className="px-3"
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminUsuarios;

