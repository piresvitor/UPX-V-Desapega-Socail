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
        
        <Image 
          source={require('../../assets/icon.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />

        <Text style={styles.title}>Desapega Social</Text>
        <Text style={styles.subtitle}>Faça login para continuar</Text>
      
      {/* Label para o E-mail adicionada */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>E-mail</Text>
        <TextInput
          style={styles.input}
          placeholder="exemplo@email.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>
      
      {/* Label para a Senha adicionada */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Senha</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, { paddingRight: 50, width: '100%' }]}
            placeholder="Sua senha"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
      
      {loginMutation.isPending ? (
        <ActivityIndicator size="large" color="#FF9800" style={{ marginTop: 10 }} />
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
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingBottom: 60, backgroundColor: '#F3F4F6' },
  logo: { width: 150, height: 150, alignSelf: 'center', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#1F2937' },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 30, color: '#6B7280', marginTop: 5 },
  
  // Estilos para agrupar as Labels
  inputGroup: { marginBottom: 16, width: '100%' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginLeft: 4 },
  
  input: { borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB', padding: 14, borderRadius: 10, fontSize: 16, color: '#1F2937' },
  passwordContainer: { position: 'relative', justifyContent: 'center' },
  eyeIcon: { position: 'absolute', right: 15 },
  primaryButton: { backgroundColor: '#FF9800', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  buttonIcon: { marginRight: 8 },
  link: { textAlign: 'center', marginTop: 25, color: '#2196F3', fontWeight: 'bold' }
});