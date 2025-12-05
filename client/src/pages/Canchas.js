import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Canchas = () => {
  const [canchas, setCanchas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCanchas();
  }, []);

  const loadCanchas = async () => {
    try {
      const response = await api.get('/canchas?activa=true');
      setCanchas(response.data);
    } catch (error) {
      console.error('Error cargando canchas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">Cargando canchas...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">Nuestras Canchas</h1>
        <p className="text-gray-600">Selecciona una cancha para ver horarios y hacer tu reserva</p>
      </div>
      
      {canchas.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-7xl mb-6 animate-bounce">⚽</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">No hay canchas disponibles</h3>
          <p className="text-gray-600">Por favor, contacta con el administrador</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {canchas.map((cancha) => (
            <Card
              key={cancha.id}
              className="overflow-hidden hover:scale-105 transition-transform duration-300"
            >
              {cancha.imagen && (
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${cancha.imagen}`}
                    alt={cancha.nombre}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-3 text-green-700">{cancha.nombre}</h3>
                {cancha.descripcion && (
                  <p className="text-gray-600 mb-4 line-clamp-2">{cancha.descripcion}</p>
                )}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">👥</span>
                    <span className="font-semibold">Capacidad: {cancha.capacidad} jugadores</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">🕐</span>
                    <span className="font-semibold">
                      Horario: {cancha.hora_inicio_atencion ? cancha.hora_inicio_atencion.substring(0, 5) : '08:00'} - {cancha.hora_fin_atencion ? cancha.hora_fin_atencion.substring(0, 5) : '23:00'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center text-green-600">
                      <span className="mr-1">💰</span>
                      <span className="font-semibold">30min: S/.{cancha.precio_30min || 25}</span>
                    </div>
                    <div className="flex items-center text-green-600">
                      <span className="mr-1">💰</span>
                      <span className="font-semibold">1h: S/.{cancha.precio_1hora || 50}</span>
                    </div>
                  </div>
                </div>
                <Link to="/app/horarios" state={{ cancha_id: cancha.id }}>
                  <Button
                    variant="primary"
                    className="w-full"
                    icon="📅"
                  >
                    Ver Horarios y Reservar
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Canchas;

