// app/(auth)/register.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Doador');
  
  // Novos estados para controle visual de erros e exibição de senha
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { signIn } = useAuth();
  const router = useRouter();

  const registerMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/register', { fullName, email, password, role });
      const loginResponse = await api.post('/auth/login', { email, password });
      return loginResponse.data;
    },
    onSuccess: async (data) => {
      await signIn(data.token);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao criar conta.';
      Alert.alert('Erro no Servidor', message);
    }
  });

  const handleRegister = () => {
    // Reseta os erros visuais antes de testar novamente
    setPasswordError('');
    setConfirmError('');
    let isValid = true;

    if (!fullName || !email) {
      Alert.alert('Aviso', 'Por favor, preencha seu nome e e-mail.');
      return;
    }

    if (password.length < 8) {
      setPasswordError('A senha precisa ter pelo menos 8 caracteres.');
      isValid = false;
    }

    if (password !== confirmPassword) {
      setConfirmError('As senhas não coincidem.');
      isValid = false;
    }
    
    // Só chama a API se não houver nenhum erro nos inputs
    if (isValid) {
      registerMutation.mutate();
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Criar Conta</Text>
      
      <TextInput style={styles.input} placeholder="Nome Completo" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      
      {/* Campo de Senha com UX Melhorado */}
      <View style={styles.inputWrapper}>
        <View style={styles.passwordContainer}>
          <TextInput 
            style={[styles.input, { paddingRight: 50 }, passwordError ? styles.inputError : null]} 
            placeholder="Senha" 
            value={password} 
            // Limpa o erro assim que o usuário volta a digitar
            onChangeText={(text) => { setPassword(text); setPasswordError(''); }} 
            secureTextEntry={!showPassword} 
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        {passwordError ? (
          <Text style={styles.errorText}>{passwordError}</Text>
        ) : (
          <Text style={styles.helperText}>Mínimo de 8 caracteres</Text>
        )}
      </View>

      {/* Campo de Confirmar Senha */}
      <View style={styles.inputWrapper}>
        <View style={styles.passwordContainer}>
          <TextInput 
            style={[styles.input, { paddingRight: 50 }, confirmError ? styles.inputError : null]} 
            placeholder="Confirmar Senha" 
            value={confirmPassword} 
            onChangeText={(text) => { setConfirmPassword(text); setConfirmError(''); }} 
            secureTextEntry={!showConfirmPassword} 
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        {confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}
      </View>

      <Text style={styles.label}>Como você deseja usar o app?</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={role} onValueChange={(itemValue) => setRole(itemValue)}>
          <Picker.Item label="Quero Doar Itens (Doador)" value="Doador" />
          <Picker.Item label="Preciso de Doações (Beneficiário)" value="Beneficiário" />
          <Picker.Item label="Sou Motorista (Freteiro)" value="Freteiro" />
        </Picker>
      </View>

      {registerMutation.isPending ? (
        <ActivityIndicator size="large" color="#FF9800" />
      ) : (
        <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
          <Ionicons name="person-add-outline" size={20} color="#FFF" style={styles.buttonIcon} />
          <Text style={styles.primaryButtonText}>Criar Conta</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={20} color="#6B7280" style={styles.buttonIcon} />
        <Text style={styles.secondaryButtonText}>Voltar</Text>
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingBottom: 60, gap: 16, backgroundColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#1F2937', marginBottom: 20 },
  inputWrapper: { marginBottom: 4 }, // Novo: Empacota o input e a mensagem de erro
  input: { borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB', padding: 14, borderRadius: 10, fontSize: 16 },
  inputError: { borderColor: '#DC2626', borderWidth: 2 }, // Novo: Borda vermelha para erro
  passwordContainer: { position: 'relative', justifyContent: 'center' },
  eyeIcon: { position: 'absolute', right: 15 },
  errorText: { color: '#DC2626', fontSize: 12, marginTop: 4, marginLeft: 4 }, // Novo: Estilo do erro
  helperText: { color: '#6B7280', fontSize: 12, marginTop: 4, marginLeft: 4 }, // Novo: Estilo da dica
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 10, color: '#1F2937' },
  pickerContainer: { borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB', borderRadius: 10, marginBottom: 10 },
  primaryButton: { backgroundColor: '#FF9800', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryButtonText: { color: '#6B7280', fontSize: 16, fontWeight: 'bold' },
  buttonIcon: { marginRight: 8 }
});