// app/(auth)/login.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn } = useAuth();
  const router = useRouter();

  // TanStack Query: Gerencia toda a lógica assíncrona da API de forma limpa
  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/login', { email, password });
      return response.data; // Espera retornar { token: "eyJ..." }
    },
    onSuccess: async (data) => {
      // Login com sucesso! Salva o token (o AuthContext vai redirecionar para a Home)
      await signIn(data.token);
      
      // Aqui entraria a chamada PATCH /users/fcm-token no futuro!
    },
    onError: () => {
      Alert.alert('Erro', 'Credenciais inválidas. Verifique seu e-mail e senha.');
    }
  });

  const handleLogin = () => {
    if (!email || !password) {
      return Alert.alert('Aviso', 'Preencha todos os campos!');
    }
    loginMutation.mutate();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Desapega Social</Text>
      <Text style={styles.subtitle}>Faça login para continuar</Text>
      
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      {loginMutation.isPending ? (
        <ActivityIndicator size="large" color="#FF9800" />
      ) : (
        <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
          <Ionicons name="log-in-outline" size={20} color="#FFF" style={styles.buttonIcon} />
          <Text style={styles.primaryButtonText}>Acessar</Text>
        </TouchableOpacity>
      )}

      <Link href="/(auth)/register" style={styles.link}>
        Não tem uma conta? Crie aqui.
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, gap: 16, backgroundColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#1F2937' },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 20, color: '#6B7280', marginTop: 5 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB', padding: 14, borderRadius: 10, fontSize: 16 },
  primaryButton: { backgroundColor: '#FF9800', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  buttonIcon: { marginRight: 8 },
  link: { textAlign: 'center', marginTop: 20, color: '#2196F3', fontWeight: 'bold' }
});