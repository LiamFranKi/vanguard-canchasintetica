import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const ConfigContext = createContext();

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig debe usarse dentro de ConfigProvider');
  }
  return context;
};

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/config');
      const configs = {};
      response.data.forEach(item => {
        configs[item.clave] = item.valor;
      });
      setConfig(configs);
      
      // Aplicar tema
      if (configs.color_principal) {
        document.documentElement.style.setProperty('--color-primary', configs.color_principal);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfig = (clave, defaultValue = '') => {
    return config[clave] || defaultValue;
  };

  const value = {
    config,
    loading,
    loadConfig,
    getConfig
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};


