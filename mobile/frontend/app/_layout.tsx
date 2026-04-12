// app/_layout.tsx
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/contexts/AuthContext';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen 
            name="review/create" 
            options={{ presentation: 'modal', title: 'Avaliar Usuário' }} 
          />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}