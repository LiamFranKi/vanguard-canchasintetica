import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import swalConfig from '../../utils/swalConfig';
import FormCard from '../../components/ui/FormCard';
import FormInput from '../../components/ui/FormInput';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const EmpleadoUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formData, setFormData] = useState({
    dni: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: ''
  });

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      // El backend ya filtra automáticamente para empleados (solo usuarios con rol 'usuario')
      const response = await api.get('/users');
      setUsuarios(response.data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      swalConfig.toastError('Error', 'Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Los empleados solo pueden crear usuarios con rol 'usuario'
      await api.post('/users', { ...formData, rol: 'usuario' });
      swalConfig.toastSuccess('¡Usuario Creado!', 'El usuario se ha registrado exitosamente');
      setMostrarFormulario(false);
      setFormData({ dni: '', nombre: '', apellido: '', email: '', telefono: '' });
      loadUsuarios(); // Recargar la lista
    } catch (error) {
      swalConfig.toastError('Error', error.response?.data?.message || 'Error al crear el usuario');
    }
  };

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1">Gestión de Usuarios</h1>
            <p className="text-sm sm:text-base text-gray-600">Administra los usuarios del sistema</p>
          </div>
          <Button
            variant={mostrarFormulario ? 'secondary' : 'primary'}
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            icon={mostrarFormulario ? '✕' : '➕'}
            className="w-full sm:w-auto text-sm sm:text-base"
          >
            {mostrarFormulario ? 'Cancelar' : 'Nuevo Usuario'}
          </Button>
        </div>
      </div>

      {mostrarFormulario && (
        <FormCard
          title="Nuevo Usuario"
          subtitle="Completa los datos para crear un nuevo usuario. La contraseña inicial será el DNI."
          onSubmit={handleSubmit}
          onCancel={() => {
            setMostrarFormulario(false);
            setFormData({ dni: '', nombre: '', apellido: '', email: '', telefono: '' });
          }}
          submitLabel="Crear Usuario"
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
              icon="🆔"
            />
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

          <Card className="p-4 bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>💡 Nota:</strong> El usuario se creará con rol "Usuario". 
              La contraseña inicial será el DNI, que el usuario podrá cambiar después del primer login.
            </p>
          </Card>
        </FormCard>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Cargando usuarios...</div>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center font-semibold text-xs sm:text-sm md:text-base">DNI</th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center font-semibold text-xs sm:text-sm md:text-base">Nombre</th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center font-semibold text-xs sm:text-sm md:text-base hidden sm:table-cell">Email</th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center font-semibold text-xs sm:text-sm md:text-base hidden md:table-cell">Teléfono</th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center font-semibold text-xs sm:text-sm md:text-base">Estado</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      {loading ? 'Cargando...' : 'No se encontraron usuarios'}
                    </td>
                  </tr>
                ) : (
                  usuarios.map((usuario) => (
                    <tr key={usuario.id} className="border-b hover:bg-gray-50 transition">
                      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center font-medium text-xs sm:text-sm">{usuario.dni}</td>
                      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center text-xs sm:text-sm">{usuario.nombre} {usuario.apellido}</td>
                      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center text-gray-600 text-xs sm:text-sm hidden sm:table-cell">{usuario.email || '-'}</td>
                      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center text-gray-600 text-xs sm:text-sm hidden md:table-cell">{usuario.telefono || '-'}</td>
                      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center">
                        <span className={`inline-block px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full text-xs font-semibold shadow-md ${
                          usuario.activo 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
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

export default EmpleadoUsuarios;

