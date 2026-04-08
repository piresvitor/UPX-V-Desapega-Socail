// src/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const api = axios.create({
  // Para acessar o localhost do seu computador vamos usar o IP especial 10.0.2.2
  baseURL: 'http://10.0.2.2:3333', 
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