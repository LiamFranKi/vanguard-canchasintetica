import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import swalConfig from '../../utils/swalConfig';
import FormInput from '../../components/ui/FormInput';
import FormTextarea from '../../components/ui/FormTextarea';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const AdminConfig = () => {
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await api.get('/config');
      const configsObj = {};
      response.data.forEach(item => {
        configsObj[item.clave] = item.valor;
      });
      setConfigs(configsObj);
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (clave, valor) => {
    try {
      await api.put(`/config/${clave}`, { valor });
      setConfigs({ ...configs, [clave]: valor });
      swalConfig.toastSuccess('Configuración Actualizada', 'Los cambios se han guardado correctamente');
    } catch (error) {
      swalConfig.toastError('Error', 'Error al actualizar la configuración');
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    const formData = new FormData();
    formData.append('logo', logoFile);

    try {
      const response = await api.post('/config/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setConfigs({ ...configs, logo: response.data.valor });
      swalConfig.toastSuccess('Logo Actualizado', 'El logo se ha actualizado correctamente');
      setLogoFile(null);
    } catch (error) {
      swalConfig.toastError('Error', 'Error al subir el logo');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Configuración del Sistema</h1>

      <div className="space-y-4 sm:space-y-6">
        {/* Logo */}
        <Card title="Logo de la Empresa" subtitle="Sube el logo que aparecerá en el sitio">
          {configs.logo && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
              <img
                src={`${window.location.origin}${configs.logo}`}
                alt="Logo"
                className="h-32 w-auto mx-auto"
              />
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files[0])}
              className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all text-sm sm:text-base"
            />
            <Button
              variant="primary"
              onClick={handleLogoUpload}
              disabled={!logoFile}
              icon="📤"
              className="w-full sm:w-auto flex-shrink-0 text-sm sm:text-base"
            >
              Subir Logo
            </Button>
          </div>
        </Card>

        {/* Información General */}
        <Card title="Información General" subtitle="Configura los datos básicos del sitio">
          <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
            <FormInput
              label="Nombre de la Empresa"
              type="text"
              value={configs.nombre_empresa || ''}
              onChange={(e) => setConfigs({ ...configs, nombre_empresa: e.target.value })}
              onBlur={() => handleUpdate('nombre_empresa', configs.nombre_empresa)}
              placeholder="Nombre de tu empresa"
              icon="🏢"
            />
            <FormInput
              label="Título del Panel de Administración"
              type="text"
              value={configs.titulo_panel_admin || ''}
              onChange={(e) => setConfigs({ ...configs, titulo_panel_admin: e.target.value })}
              onBlur={() => handleUpdate('titulo_panel_admin', configs.titulo_panel_admin)}
              placeholder="Ej: Administración, Panel de Control, etc."
              icon="⚙️"
            />
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Nota:</strong> Si dejas este campo vacío, se usará el nombre de la empresa. 
                Este título aparecerá en la barra lateral del panel de administración.
              </p>
            </div>
            <FormInput
              label="Título del Landing"
              type="text"
              value={configs.titulo_landing || ''}
              onChange={(e) => setConfigs({ ...configs, titulo_landing: e.target.value })}
              onBlur={() => handleUpdate('titulo_landing', configs.titulo_landing)}
              placeholder="Título principal de la página de inicio"
              icon="📝"
            />
            <FormInput
              label="Subtítulo del Landing"
              type="text"
              value={configs.subtitulo_landing || ''}
              onChange={(e) => setConfigs({ ...configs, subtitulo_landing: e.target.value })}
              onBlur={() => handleUpdate('subtitulo_landing', configs.subtitulo_landing)}
              placeholder="Subtítulo descriptivo"
              icon="📄"
            />
            <FormInput
              label="Días Máximos para Pagar"
              type="number"
              value={configs.dias_max_pago || '3'}
              onChange={(e) => setConfigs({ ...configs, dias_max_pago: e.target.value })}
              onBlur={() => handleUpdate('dias_max_pago', configs.dias_max_pago)}
              placeholder="Ej: 3"
              icon="⏰"
            />
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Importante:</strong> Si una reserva no se paga dentro de este plazo, se cancelará automáticamente y se liberará el espacio.
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="mr-2">🎨</span>Color Principal
              </label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={configs.color_principal || '#22c55e'}
                  onChange={(e) => setConfigs({ ...configs, color_principal: e.target.value })}
                  onBlur={() => handleUpdate('color_principal', configs.color_principal)}
                  className="h-14 w-20 border-2 border-gray-300 rounded-xl cursor-pointer shadow-md hover:shadow-lg transition"
                />
                <FormInput
                  type="text"
                  value={configs.color_principal || '#22c55e'}
                  onChange={(e) => setConfigs({ ...configs, color_principal: e.target.value })}
                  onBlur={() => handleUpdate('color_principal', configs.color_principal)}
                  placeholder="#22c55e"
                  className="flex-1 mb-0"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Configuración de Correos */}
        <Card title="Configuración de Correos" subtitle="Personaliza los correos que se enviarán">
          <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
            <FormInput
              label="Asunto Correo Bienvenida"
              type="text"
              value={configs.email_bienvenida_asunto || ''}
              onChange={(e) => setConfigs({ ...configs, email_bienvenida_asunto: e.target.value })}
              onBlur={() => handleUpdate('email_bienvenida_asunto', configs.email_bienvenida_asunto)}
              placeholder="Asunto del correo de bienvenida"
              icon="📧"
            />
            <FormTextarea
              label="Cuerpo Correo Bienvenida (HTML)"
              value={configs.email_bienvenida_cuerpo || ''}
              onChange={(e) => setConfigs({ ...configs, email_bienvenida_cuerpo: e.target.value })}
              onBlur={() => handleUpdate('email_bienvenida_cuerpo', configs.email_bienvenida_cuerpo)}
              placeholder="Usa HTML. Variables: {{nombre}}, {{dni}}"
              rows="6"
              icon="📝"
            />
            <FormInput
              label="Asunto Correo Reserva"
              type="text"
              value={configs.email_reserva_asunto || ''}
              onChange={(e) => setConfigs({ ...configs, email_reserva_asunto: e.target.value })}
              onBlur={() => handleUpdate('email_reserva_asunto', configs.email_reserva_asunto)}
              placeholder="Asunto del correo de reserva"
              icon="📧"
            />
            <FormTextarea
              label="Cuerpo Correo Reserva (HTML)"
              value={configs.email_reserva_cuerpo || ''}
              onChange={(e) => setConfigs({ ...configs, email_reserva_cuerpo: e.target.value })}
              onBlur={() => handleUpdate('email_reserva_cuerpo', configs.email_reserva_cuerpo)}
              placeholder="Usa HTML. Variables: {{nombre}}, {{cancha}}, {{fecha}}, {{hora_inicio}}, {{hora_fin}}"
              rows="6"
              icon="📝"
            />
            
            <div className="border-t-2 border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">❌</span>Reserva Cancelada
              </h3>
            </div>
            <FormInput
              label="Asunto Correo Reserva Cancelada"
              type="text"
              value={configs.email_reserva_cancelada_asunto || ''}
              onChange={(e) => setConfigs({ ...configs, email_reserva_cancelada_asunto: e.target.value })}
              onBlur={() => handleUpdate('email_reserva_cancelada_asunto', configs.email_reserva_cancelada_asunto)}
              placeholder="Asunto del correo de reserva cancelada"
              icon="📧"
            />
            <FormTextarea
              label="Cuerpo Correo Reserva Cancelada (HTML)"
              value={configs.email_reserva_cancelada_cuerpo || ''}
              onChange={(e) => setConfigs({ ...configs, email_reserva_cancelada_cuerpo: e.target.value })}
              onBlur={() => handleUpdate('email_reserva_cancelada_cuerpo', configs.email_reserva_cancelada_cuerpo)}
              placeholder="Usa HTML. Variables: {{nombre}}, {{cancha}}, {{fecha}}, {{hora_inicio}}, {{hora_fin}}"
              rows="6"
              icon="📝"
            />
            
            <div className="border-t-2 border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">💰</span>Pago Registrado
              </h3>
            </div>
            <FormInput
              label="Asunto Correo Pago"
              type="text"
              value={configs.email_pago_asunto || ''}
              onChange={(e) => setConfigs({ ...configs, email_pago_asunto: e.target.value })}
              onBlur={() => handleUpdate('email_pago_asunto', configs.email_pago_asunto)}
              placeholder="Asunto del correo de pago"
              icon="📧"
            />
            <FormTextarea
              label="Cuerpo Correo Pago (HTML)"
              value={configs.email_pago_cuerpo || ''}
              onChange={(e) => setConfigs({ ...configs, email_pago_cuerpo: e.target.value })}
              onBlur={() => handleUpdate('email_pago_cuerpo', configs.email_pago_cuerpo)}
              placeholder="Usa HTML. Variables: {{nombre}}, {{cancha}}, {{fecha}}, {{hora_inicio}}, {{hora_fin}}, {{monto}}, {{metodo}}"
              rows="6"
              icon="📝"
            />
            
            <div className="border-t-2 border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">⏰</span>Recordatorio de Reserva
              </h3>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  <strong>💡 Nota:</strong> Este correo se envía automáticamente el mismo día de la reserva a las 8:00 AM (configurable en variables de entorno).
                </p>
              </div>
            </div>
            <FormInput
              label="Asunto Correo Recordatorio"
              type="text"
              value={configs.email_recordatorio_asunto || ''}
              onChange={(e) => setConfigs({ ...configs, email_recordatorio_asunto: e.target.value })}
              onBlur={() => handleUpdate('email_recordatorio_asunto', configs.email_recordatorio_asunto)}
              placeholder="Asunto del correo de recordatorio"
              icon="📧"
            />
            <FormTextarea
              label="Cuerpo Correo Recordatorio (HTML)"
              value={configs.email_recordatorio_cuerpo || ''}
              onChange={(e) => setConfigs({ ...configs, email_recordatorio_cuerpo: e.target.value })}
              onBlur={() => handleUpdate('email_recordatorio_cuerpo', configs.email_recordatorio_cuerpo)}
              placeholder="Usa HTML. Variables: {{nombre}}, {{cancha}}, {{fecha}}, {{hora_inicio}}, {{hora_fin}}"
              rows="6"
              icon="📝"
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminConfig;

