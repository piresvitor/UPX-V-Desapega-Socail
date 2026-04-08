import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
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

  // O Porteiro Inteligente
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!token) {
      // Sem token? Verifica o Onboarding
      if (!hasViewedOnboarding && segments[0] !== 'onboarding') {
        router.replace('/onboarding');
      } else if (hasViewedOnboarding && !inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      // Com token? Protege contra voltar pro login ou onboarding
      if (!inTabsGroup) {
        router.replace('/(tabs)/home');
      }
    }
  }, [token, hasViewedOnboarding, segments, isLoading]);

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