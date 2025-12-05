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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Crear Usuarios</h1>
          <p className="text-gray-600">Registra nuevos usuarios en el sistema</p>
        </div>
        <Button
          variant={mostrarFormulario ? 'secondary' : 'primary'}
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          icon={mostrarFormulario ? '✕' : '➕'}
        >
          {mostrarFormulario ? 'Cancelar' : 'Nuevo Usuario'}
        </Button>
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

      {!mostrarFormulario && (
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Usuarios Registrados</h2>
            <p className="text-sm text-gray-600">Total: {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}</p>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Cargando usuarios...</p>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-600">No hay usuarios registrados aún</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">DNI</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Apellido</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">{usuario.dni}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">{usuario.nombre}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">{usuario.apellido}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{usuario.email || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{usuario.telefono || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          usuario.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default EmpleadoUsuarios;

