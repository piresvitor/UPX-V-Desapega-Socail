import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform, Image } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/login', { email, password });
      return response.data; 
    },
    onSuccess: async (data) => {
      await signIn(data.token);
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        
        {/* Logo adicionada aqui */}
        <Image 
          source={require('../../assets/icon.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />

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
      
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, { paddingRight: 50 }]}
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
          <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>
      
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingBottom: 60, gap: 16, backgroundColor: '#F3F4F6' },
  
  // Estilo da logo adicionado
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 10,
  },

  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#1F2937' },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 20, color: '#6B7280', marginTop: 5 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB', padding: 14, borderRadius: 10, fontSize: 16, width: '100%' },
  passwordContainer: { position: 'relative', justifyContent: 'center', width: '100%' },
  eyeIcon: { position: 'absolute', right: 15 },
  primaryButton: { backgroundColor: '#FF9800', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  buttonIcon: { marginRight: 8 },
  link: { textAlign: 'center', marginTop: 20, color: '#2196F3', fontWeight: 'bold' }
});