import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '../context/ConfigContext';
import api from '../services/api';
import './LandingPage.css';

const LandingPage = () => {
  const { getConfig } = useConfig();
  const [canchas, setCanchas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCanchas();
  }, []);

  const loadCanchas = async () => {
    try {
      const response = await api.get('/canchas?activa=true');
      setCanchas(response.data.slice(0, 3)); // Mostrar solo 3
    } catch (error) {
      console.error('Error cargando canchas:', error);
    } finally {
      setLoading(false);
    }
  };

  const nombreEmpresa = getConfig('nombre_empresa', 'Canchas Sintéticas');
  const titulo = getConfig('titulo_landing', 'Reserva tu Cancha Sintética');
  const subtitulo = getConfig('subtitulo_landing', 'Disfruta del mejor fútbol en nuestras canchas');
  const logo = getConfig('logo', '');

  return (
    <div className="landing-page min-h-screen bg-gradient-to-br from-green-500 via-green-600 to-green-700">
      {/* Hero Section */}
      <section className="hero-section relative overflow-hidden">
        <div className="soccer-pattern absolute inset-0 opacity-10"></div>
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="text-center text-white">
            {logo && (
              <img 
                src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${logo}`} 
                alt={nombreEmpresa}
                className="mx-auto mb-8 h-24 w-auto"
              />
            )}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
              {titulo}
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              {subtitulo}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/login"
                className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition transform hover:scale-105 shadow-lg"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/app/horarios"
                className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-green-600 transition transform hover:scale-105"
              >
                Ver Horarios
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            ¿Por qué elegirnos?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="feature-card text-center p-6 rounded-lg bg-green-50 hover:shadow-lg transition">
              <div className="text-5xl mb-4">⚽</div>
              <h3 className="text-2xl font-semibold mb-3 text-green-700">Canchas de Primera</h3>
              <p className="text-gray-600">
                Canchas sintéticas de última generación con iluminación profesional
              </p>
            </div>
            <div className="feature-card text-center p-6 rounded-lg bg-green-50 hover:shadow-lg transition">
              <div className="text-5xl mb-4">📅</div>
              <h3 className="text-2xl font-semibold mb-3 text-green-700">Reserva Online</h3>
              <p className="text-gray-600">
                Reserva tu cancha desde cualquier dispositivo, las 24 horas del día
              </p>
            </div>
            <div className="feature-card text-center p-6 rounded-lg bg-green-50 hover:shadow-lg transition">
              <div className="text-5xl mb-4">💳</div>
              <h3 className="text-2xl font-semibold mb-3 text-green-700">Pago Fácil</h3>
              <p className="text-gray-600">
                Múltiples formas de pago: online, depósito o efectivo
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Canchas Preview */}
      {!loading && canchas.length > 0 && (
        <section className="canchas-section py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
              Nuestras Canchas
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {canchas.map((cancha) => (
                <div key={cancha.id} className="cancha-card bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition">
                  {cancha.imagen && (
                    <img
                      src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${cancha.imagen}`}
                      alt={cancha.nombre}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-6">
                    <h3 className="text-2xl font-semibold mb-2 text-green-700">{cancha.nombre}</h3>
                    {cancha.descripcion && (
                      <p className="text-gray-600 mb-4">{cancha.descripcion}</p>
                    )}
                    <Link
                      to="/app/horarios"
                      className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      Ver Disponibilidad
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-4">{nombreEmpresa}</h3>
          <p className="text-gray-400 mb-4">
            Reserva tu cancha y disfruta del mejor fútbol
          </p>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} {nombreEmpresa}. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;


