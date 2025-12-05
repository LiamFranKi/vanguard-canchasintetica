import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await api.get('/auth/verify');
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (dni, password) => {
    try {
      const response = await api.post('/auth/login', { dni, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al iniciar sesión'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const cambiarPassword = async (passwordActual, passwordNueva) => {
    try {
      await api.post('/auth/cambiar-password', {
        password_actual: passwordActual,
        password_nueva: passwordNueva
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al cambiar contraseña'
      };
    }
  };

  const actualizarPerfil = async (datosPerfil) => {
    try {
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' };
      }

      const response = await api.put(`/users/${user.id}`, datosPerfil);
      const usuarioActualizado = response.data;
      
      setUser(usuarioActualizado);
      localStorage.setItem('user', JSON.stringify(usuarioActualizado));
      
      return { success: true, user: usuarioActualizado };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al actualizar perfil'
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    cambiarPassword,
    actualizarPerfil
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


