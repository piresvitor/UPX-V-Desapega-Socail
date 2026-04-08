// app/_layout.tsx
import { Stack } from 'expo-router'; // <-- Mude de Slot para Stack
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/contexts/AuthContext';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} /> 
      </AuthProvider>
    </QueryClientProvider>
  );
}