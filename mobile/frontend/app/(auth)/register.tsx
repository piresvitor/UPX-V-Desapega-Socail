import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [uiRole, setUiRole] = useState('doador');
  
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { signIn } = useAuth();
  const router = useRouter();

  const roleOptions = [
    { id: 'doador', label: 'Quero Doar', icon: 'heart-outline', apiValue: 'Doador' },
    { id: 'beneficiario', label: 'Receber', icon: 'hand-left-outline', apiValue: 'Beneficiário' },
    { id: 'ambos', label: 'Doar e Receber', icon: 'swap-horizontal-outline', apiValue: 'Doador' },
    { id: 'freteiro', label: 'Sou Motorista', icon: 'car-outline', apiValue: 'Freteiro' }
  ];

  const registerMutation = useMutation({
    mutationFn: async (backendRole: string) => {
      await api.post('/auth/register', { fullName, email, password, role: backendRole });
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
    
    if (isValid) {
      const selectedOption = roleOptions.find(r => r.id === uiRole);
      const backendRole = selectedOption ? selectedOption.apiValue : 'Doador';
      registerMutation.mutate(backendRole);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Criar Conta</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nome Completo</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Ex: Maria Silva" 
          placeholderTextColor="#9CA3AF"
          value={fullName} 
          onChangeText={setFullName} 
        />
      </View>

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
            style={[styles.input, { paddingRight: 50, width: '100%' }, passwordError ? styles.inputError : null]} 
            placeholder="Sua senha" 
            placeholderTextColor="#9CA3AF"
            value={password} 
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

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Confirmar Senha</Text>
        <View style={styles.passwordContainer}>
          <TextInput 
            style={[styles.input, { paddingRight: 50, width: '100%' }, confirmError ? styles.inputError : null]} 
            placeholder="Repita sua senha" 
            placeholderTextColor="#9CA3AF"
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
      
      <View style={styles.roleGrid}>
        {roleOptions.map((option) => {
          const isSelected = uiRole === option.id;
          return (
            <TouchableOpacity 
              key={option.id}
              style={[styles.roleCard, isSelected && styles.roleCardSelected]}
              onPress={() => setUiRole(option.id)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={option.icon as any} 
                size={28} 
                color={isSelected ? '#EB681E' : '#64748B'} 
                style={{ marginBottom: 6 }}
              />
              <Text style={[styles.roleCardText, isSelected && styles.roleCardTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {registerMutation.isPending ? (
        <ActivityIndicator size="large" color="#EB681E" style={{ marginTop: 10 }} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 60, backgroundColor: '#F8FAFC', width: '100%', maxWidth: 400, alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#111827', marginBottom: 30 },
  
  inputGroup: { marginBottom: 20, width: '100%' }, 
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginBottom: 8, marginLeft: 4 }, 
  input: { borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', padding: 18, borderRadius: 14, fontSize: 16, color: '#111827', width: '100%' },
  inputError: { borderColor: '#DC2626', borderWidth: 2 }, 
  
  passwordContainer: { position: 'relative', justifyContent: 'center', width: '100%' },
  eyeIcon: { position: 'absolute', right: 18 },
  errorText: { color: '#DC2626', fontSize: 12, marginTop: 4, marginLeft: 4 }, 
  helperText: { color: '#64748B', fontSize: 12, marginTop: 4, marginLeft: 4 }, 
  
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 10, marginBottom: 15, color: '#334155', marginLeft: 4 },
  
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  roleCard: { width: '48%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 },
  roleCardSelected: { borderColor: '#EB681E', backgroundColor: '#FFF3EB', borderWidth: 2 },
  roleCardText: { fontSize: 13, fontWeight: '600', color: '#64748B', textAlign: 'center' },
  roleCardTextSelected: { color: '#EB681E', fontWeight: 'bold' },
  
  primaryButton: { backgroundColor: '#EB681E', padding: 18, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#EB681E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 3, width: '100%' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  
  secondaryButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 18, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, width: '100%' },
  secondaryButtonText: { color: '#475569', fontSize: 18, fontWeight: 'bold' },
  buttonIcon: { marginRight: 8 }
});