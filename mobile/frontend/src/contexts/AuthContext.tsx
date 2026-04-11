import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { api } from '../services/api';
import Constants from 'expo-constants';

interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [hasViewedOnboarding, setHasViewedOnboarding] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const segments = useSegments();
  const router = useRouter();
  
  const navigationState = useRootNavigationState();

  useEffect(() => {
    async function loadStorageData() {
      try {
        const storedToken = await AsyncStorage.getItem('@DesapegaSocial:token');
        const viewed = await AsyncStorage.getItem('@DesapegaSocial:onboarding_viewed');
        
        if (storedToken) setToken(storedToken);
        if (viewed === 'true') setHasViewedOnboarding(true);
      } catch (error) {
        console.error('Erro ao ler dados', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadStorageData();
  }, []);

  useEffect(() => {
    if (isLoading || !navigationState?.key) return;

    const rootSegment = segments[0];

    if (!token) {
      if (!hasViewedOnboarding && rootSegment !== 'onboarding') {
        router.replace('/onboarding');
      } else if (hasViewedOnboarding && rootSegment !== '(auth)') {
        router.replace('/(auth)/login');
      }
    } else {
      if (rootSegment === '(auth)' || rootSegment === 'onboarding' || rootSegment === undefined) {
        router.replace('/(tabs)/home');
      }
    }
  }, [token, hasViewedOnboarding, segments, isLoading, navigationState?.key]);

// Função isolada para gerenciar o Push Token
  const registerForPushNotificationsAsync = async () => {
    // 1. Regra para Emuladores: O device precisa ser físico
    if (!Device.isDevice) {
      console.log('Push Notifications requerem um dispositivo físico.');
      return;
    }

    // 2. 🛡️ O BYPASS DO EXPO GO: Se estiver no aplicativo de testes do Expo, ele pula fora pacificamente.
    if (Constants.appOwnership === 'expo') {
      console.log('No Expo Go (SDK 53+), Push Notifications não são suportadas nativamente. Pulando etapa de FCM Token.');
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Permissão de notificação negada pelo usuário.');
        return;
      }

      const tokenData = await Notifications.getDevicePushTokenAsync();
      const fcmToken = tokenData.data;

      await api.patch('/users/me/fcm-token', { fcmToken });
      console.log('FCM Token atualizado com sucesso no BD.');
    } catch (error) {
      console.error('Erro ao registrar FCM token:', error);
    }
  };
  
  const signIn = async (newToken: string) => {
    await AsyncStorage.setItem('@DesapegaSocial:token', newToken);
    setToken(newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    // Dispara a coleta do token em background logo após o login
    registerForPushNotificationsAsync();
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('@DesapegaSocial:token');
    setToken(null);
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('@DesapegaSocial:onboarding_viewed', 'true');
    setHasViewedOnboarding(true);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, signIn, signOut, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);