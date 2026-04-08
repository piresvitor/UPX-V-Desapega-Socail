// app/(auth)/login.tsx
import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
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
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Acessar" onPress={handleLogin} />
      )}

      <Link href="/(auth)/register" style={styles.link}>
        Não tem uma conta? Crie aqui.
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, gap: 16 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 20, color: '#666' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, fontSize: 16 },
  link: { textAlign: 'center', marginTop: 20, color: 'blue', fontWeight: 'bold' }
});