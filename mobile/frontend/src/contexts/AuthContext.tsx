import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    // Se ainda está carregando o banco local ou o GPS, não faz nada
    if (isLoading || !navigationState?.key) return;

    const rootSegment = segments[0];

    if (!token) {
      // Se não tem token e não está no grupo de auth/onboarding, manda pra lá
      if (!hasViewedOnboarding && rootSegment !== 'onboarding') {
        router.replace('/onboarding');
      } else if (hasViewedOnboarding && rootSegment !== '(auth)') {
        router.replace('/(auth)/login');
      }
    } else {
      // Se TEM token e está tentando entrar no login/onboarding, manda pra Home
      if (rootSegment === '(auth)' || rootSegment === 'onboarding' || rootSegment === undefined) {
        router.replace('/(tabs)/home');
      }
    }
  }, [token, hasViewedOnboarding, segments, isLoading, navigationState?.key]);

  const signIn = async (newToken: string) => {
    await AsyncStorage.setItem('@DesapegaSocial:token', newToken);
    setToken(newToken);
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