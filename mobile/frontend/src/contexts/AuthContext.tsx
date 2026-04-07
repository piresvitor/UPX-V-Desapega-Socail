import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // 1. Ao abrir o app, verifica se já existe um token salvo
  useEffect(() => {
    async function loadStorageData() {
      try {
        const storedToken = await AsyncStorage.getItem('@DesapegaSocial:token');
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (error) {
        console.error('Erro ao ler token', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadStorageData();
  }, []);

  // 2. Reage a mudanças de rota ou de token
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      // Sem token e tentando acessar área restrita? Vai pro Login!
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      // Com token e na tela de login? Vai pro Feed (Home)!
      router.replace('/(tabs)/home');
    }
  }, [token, segments, isLoading]);

  const signIn = async (newToken: string) => {
    await AsyncStorage.setItem('@DesapegaSocial:token', newToken);
    setToken(newToken);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('@DesapegaSocial:token');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook customizado para facilitar o uso nas telas
export const useAuth = () => useContext(AuthContext);