import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const api = axios.create({
  // Apontando para o backend em produção no Render
  baseURL: 'https://desapega-social-api.onrender.com', 
  timeout: 10000, // Aborta se demorar mais de 10 segundos
});

// Interceptor: Antes de qualquer requisição sair, ele injeta o Token JWT
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('@DesapegaSocial:token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Erro ao recuperar token do AsyncStorage', error);
  }
  return config;
});