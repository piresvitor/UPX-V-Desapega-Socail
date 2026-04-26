import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/services/api';
import { useAuth } from '../src/contexts/AuthContext';

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAuth();

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['public-statistics'],
    queryFn: async () => {
      // Se o servidor estiver dormindo (Render), ele aborta após 5 segundos e libera a tela!
      const response = await api.get('/public/statistics', { timeout: 5000 });
      return response.data; 
    },
    retry: false // Impede que o React Query tente de novo infinitamente
  });

  const handleStart = async (destination: '/(auth)/login' | '/(auth)/register') => {
    await completeOnboarding(); 
    router.replace(destination);
  };

  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/icon.png')} 
        style={styles.logo} 
        resizeMode="contain" 
      />

      <Text style={styles.title}>Bem-vindo ao</Text>
      <Text style={styles.brand}>Desapega Social</Text>
      
      <Text style={styles.subtitle}>
        Conectando quem quer doar com quem mais precisa.
      </Text>

      <View style={styles.statsCard}>
        {isLoading ? (
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator color="#FF9800" size="large" />
            <Text style={{ marginTop: 10, color: '#6B7280', fontSize: 12 }}>Acordando o servidor...</Text>
          </View>
        ) : isError || !stats ? (
          <Text style={styles.errorText}>Junte-se à nossa comunidade!</Text>
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.totalUsers || 0}</Text>
              <Text style={styles.statLabel}>Usuários</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.totalDonations || 0}</Text>
              <Text style={styles.statLabel}>Doações</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.totalFreightsCompleted || 0}</Text>
              <Text style={styles.statLabel}>Fretes</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => handleStart('/(auth)/register')}>
          <Ionicons name="add-circle" size={20} color="#FFF" style={styles.buttonIcon} />
          <Text style={styles.primaryButtonText}>Criar Nova Conta</Text>
        </TouchableOpacity>
        <View style={styles.spacer} />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => handleStart('/(auth)/login')}>
          <Ionicons name="log-in-outline" size={20} color="#2196F3" style={styles.buttonIcon} />
          <Text style={styles.secondaryButtonText}>Já tenho conta (Entrar)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F3F4F6' },
  logo: { width: 120, height: 120, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#1F2937' },
  brand: { fontSize: 36, fontWeight: 'bold', textAlign: 'center', color: '#FF9800', marginBottom: 20 },
  subtitle: { fontSize: 15, textAlign: 'center', color: '#6B7280', marginTop: 5, marginBottom: 40 },
  statsCard: { backgroundColor: '#FFF', paddingVertical: 24, paddingHorizontal: 20, borderRadius: 16, justifyContent: 'center', elevation: 2, marginBottom: 40, minHeight: 120 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 28, fontWeight: '900', color: '#10B981', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#6B7280', textTransform: 'uppercase', fontWeight: '600' },
  divider: { width: 1, height: '70%', backgroundColor: '#D1D5DB' },
  errorText: { fontSize: 16, color: '#6B7280', textAlign: 'center', fontWeight: 'bold' },
  buttonContainer: { marginTop: 10 },
  primaryButton: { backgroundColor: '#FF9800', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#2196F3', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: '#2196F3', fontSize: 16, fontWeight: 'bold' },
  buttonIcon: { marginRight: 8 },
  spacer: { height: 16 }
});