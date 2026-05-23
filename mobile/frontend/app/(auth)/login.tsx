import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        
        {/* Logo Aumentado */}
        <Image 
          source={require('../../assets/icon.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />

        <Text style={styles.title}>Desapega Social</Text>
        <Text style={styles.subtitle}>Faça login para continuar</Text>
      
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
        <ActivityIndicator size="large" color="#EB681E" style={{ marginTop: 10 }} />
      ) : (
        <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
          <Ionicons name="log-in-outline" size={20} color="#FFF" style={styles.buttonIcon} />
          <Text style={styles.primaryButtonText}>Acessar</Text>
        </TouchableOpacity>
      )}

      {/* Link em Laranja */}
      <Link href="/(auth)/register" style={styles.link}>
        Não tem uma conta? Crie aqui.
      </Link>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Ajuste na largura máxima para o formulário não ficar "espremido" no centro
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 60, backgroundColor: '#F8FAFC', width: '100%', maxWidth: 400, alignSelf: 'center' },
  
  // Aumentado de 140x140 para 180x180
  logo: { width: 180, height: 180, alignSelf: 'center', marginBottom: 20 },
  
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#111827' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 35, color: '#475569', marginTop: 8 },
  
  // Garantindo que o input ocupe 100% do espaço disponível
  inputGroup: { marginBottom: 20, width: '100%' },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginBottom: 8, marginLeft: 4 },
  
  // Aumentado o padding (altura) e a fonte da caixa de texto
  input: { borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', padding: 18, borderRadius: 14, fontSize: 16, color: '#111827', width: '100%' },
  
  passwordContainer: { position: 'relative', justifyContent: 'center', width: '100%' },
  eyeIcon: { position: 'absolute', right: 18 },
  
  // Cor laranja principal do projeto (#EB681E) aplicada ao botão e sombra
  primaryButton: { backgroundColor: '#EB681E', padding: 18, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, shadowColor: '#EB681E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 3, width: '100%' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  buttonIcon: { marginRight: 8 },
  
  // Cor laranja aplicada ao link
  link: { textAlign: 'center', marginTop: 28, color: '#EB681E', fontWeight: 'bold', fontSize: 15 }
});