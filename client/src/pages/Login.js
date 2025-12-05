import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import swalConfig from '../utils/swalConfig';
import FormInput from '../components/ui/FormInput';
import Button from '../components/ui/Button';
import './Login.css';

const Login = () => {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(dni, password);

    if (result.success) {
      swalConfig.toastSuccess('¡Bienvenido!', 'Has iniciado sesión correctamente');

      // Redirigir según rol
      const user = JSON.parse(localStorage.getItem('user'));
      if (user.rol === 'admin') {
        navigate('/admin');
      } else if (user.rol === 'empleado') {
        navigate('/empleado');
      } else {
        navigate('/app');
      }
    } else {
      swalConfig.toastError('Error', result.message || 'Credenciales inválidas');
    }

    setLoading(false);
  };

  return (
    <div className="login-page min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo de cancha de fútbol */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-green-500 to-emerald-600"></div>
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px'
        }}
      ></div>
      
      {/* Líneas de cancha */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(to right, rgba(255,255,255,0.2) 2px, transparent 2px),
          linear-gradient(to bottom, rgba(255,255,255,0.2) 2px, transparent 2px)
        `,
        backgroundSize: '50px 50px, 50px 50px, 200px 200px, 200px 200px'
      }}></div>
      
      {/* Círculo central */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border-4 border-white border-opacity-20 rounded-full"></div>
      
      {/* Área de portería izquierda */}
      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-32 h-48 border-r-4 border-white border-opacity-20"></div>
      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-16 h-24 border-r-4 border-white border-opacity-30 mt-12 mb-12"></div>
      
      {/* Área de portería derecha */}
      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-32 h-48 border-l-4 border-white border-opacity-20"></div>
      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-16 h-24 border-l-4 border-white border-opacity-30 mt-12 mb-12"></div>
      
      <div className="login-container bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md relative z-10 border border-gray-100 backdrop-blur-sm bg-opacity-95">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mb-4 shadow-lg">
            <div className="text-5xl">⚽</div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Iniciar Sesión</h1>
          <p className="text-gray-600">Ingresa con tu DNI y contraseña</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormInput
            label="DNI (Usuario)"
            type="text"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="Ingresa tu DNI"
            required
            icon="🆔"
          />

          <FormInput
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresa tu contraseña"
            required
            icon="🔒"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={loading}
            className="w-full"
            icon="🚀"
          >
            Iniciar Sesión
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-green-600 hover:text-green-700 font-medium">
            ← Volver al inicio
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Login;

