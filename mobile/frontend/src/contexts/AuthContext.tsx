import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { api } from '../services/api';
import Constants from 'expo-constants';
import { jwtDecode } from 'jwt-decode'; 

interface AuthContextType {
  token: string | null;
  userRole: string | null; 
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
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
        
        if (storedToken) {
          setToken(storedToken);
          const decoded: any = jwtDecode(storedToken);
          setUserRole(decoded.role);
        }
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
        if (userRole === 'Freteiro') {
          router.replace('/(tabs)/radar');
        } else if (userRole === 'Admin') {
          router.replace('/(tabs)/dashboard'); 
        } else {
          router.replace('/(tabs)/home'); 
        }
      }
    }
  }, [token, hasViewedOnboarding, segments, isLoading, navigationState?.key, userRole]);

  const registerForPushNotificationsAsync = async () => {
    if (!Device.isDevice) return;
    if (Constants.appOwnership === 'expo') return;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') return;

      const tokenData = await Notifications.getDevicePushTokenAsync();
      const fcmToken = tokenData.data;

      // Endpoint corrigido 
      await api.patch('/users/fcm-token', { fcmToken });
      console.log('FCM Token salvo com sucesso!');
    } catch (error) {
      console.warn('Não foi possível gerar/salvar o Token FCM neste dispositivo:', error);
    }
  };
  
  const signIn = async (newToken: string) => {
    await AsyncStorage.setItem('@DesapegaSocial:token', newToken);
    setToken(newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    const decoded: any = jwtDecode(newToken);
    setUserRole(decoded.role);

    // Agora o Token tenta ser registrado logo após o login
    registerForPushNotificationsAsync();
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('@DesapegaSocial:token');
    setToken(null);
    setUserRole(null);
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('@DesapegaSocial:onboarding_viewed', 'true');
    setHasViewedOnboarding(true);
  };

  return (
    <AuthContext.Provider value={{ token, userRole, isLoading, signIn, signOut, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);