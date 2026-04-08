import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../src/services/api';
import { useAuth } from '../src/contexts/AuthContext';

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAuth();

  // Busca as estatísticas públicas da plataforma
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['public-statistics'],
    queryFn: async () => {
      const response = await api.get('/public/statistics');
      return response.data; // Retorna: { totalUsers, totalDonations, totalFreightsCompleted }
    }
  });

  const handleStart = async (destination: '/(auth)/login' | '/(auth)/register') => {
    await completeOnboarding(); 
    router.replace(destination);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo ao</Text>
      <Text style={styles.brand}>Desapega Social</Text>
      
      <Text style={styles.subtitle}>
        Conectando quem quer doar com quem mais precisa.
      </Text>

      {/* NOVO: Card de Estatísticas com os 3 dados */}
      <View style={styles.statsCard}>
        {isLoading ? (
          <ActivityIndicator color="#2196F3" size="large" />
        ) : isError ? (
          <Text style={styles.errorText}>Junte-se à nossa comunidade!</Text>
        ) : (
          <View style={styles.statsRow}>
            {/* Dado 1: Usuários */}
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.totalUsers || 0}</Text>
              <Text style={styles.statLabel}>Usuários</Text>
            </View>

            <View style={styles.divider} />

            {/* Dado 2: Doações */}
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.totalDonations || 0}</Text>
              <Text style={styles.statLabel}>Doações</Text>
            </View>

            <View style={styles.divider} />

            {/* Dado 3: Fretes */}
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.totalFreightsCompleted || 0}</Text>
              <Text style={styles.statLabel}>Fretes</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Criar Nova Conta" onPress={() => handleStart('/(auth)/register')} />
        <View style={styles.spacer} />
        <Button title="Já tenho conta (Entrar)" color="gray" onPress={() => handleStart('/(auth)/login')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, textAlign: 'center', color: '#333' },
  brand: { fontSize: 36, fontWeight: 'bold', textAlign: 'center', color: '#2196F3', marginBottom: 20 },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 40 },
  
  // Estilos do Card de Estatísticas
  statsCard: { 
    backgroundColor: '#fff', 
    paddingVertical: 24,
    paddingHorizontal: 10,
    borderRadius: 16, 
    justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, elevation: 5,
    marginBottom: 40,
    minHeight: 120, 
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: '#4CAF50',
    marginBottom: 4
  },
  statLabel: { 
    fontSize: 12, 
    color: '#777',
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  divider: {
    width: 1,
    height: '70%',
    backgroundColor: '#E0E0E0',
  },
  errorText: { fontSize: 16, color: '#555', textAlign: 'center' },
  buttonContainer: { marginTop: 10 },
  spacer: { height: 16 }
});