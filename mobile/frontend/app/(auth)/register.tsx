// app/(auth)/register.tsx
import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Doador');
  
  // Novos estados para controle visual de erros
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Criar Conta</Text>
      
      <TextInput style={styles.input} placeholder="Nome Completo" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      
      {/* Campo de Senha com UX Melhorado */}
      <View style={styles.inputWrapper}>
        <TextInput 
          style={[styles.input, passwordError ? styles.inputError : null]} 
          placeholder="Senha" 
          value={password} 
          // Limpa o erro assim que o usuário volta a digitar
          onChangeText={(text) => { setPassword(text); setPasswordError(''); }} 
          secureTextEntry 
        />
        {passwordError ? (
          <Text style={styles.errorText}>{passwordError}</Text>
        ) : (
          <Text style={styles.helperText}>Mínimo de 8 caracteres</Text>
        )}
      </View>

      {/* Campo de Confirmar Senha */}
      <View style={styles.inputWrapper}>
        <TextInput 
          style={[styles.input, confirmError ? styles.inputError : null]} 
          placeholder="Confirmar Senha" 
          value={confirmPassword} 
          onChangeText={(text) => { setConfirmPassword(text); setConfirmError(''); }} 
          secureTextEntry 
        />
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
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Criar Conta" onPress={handleRegister} />
      )}

      <Button title="Voltar" color="gray" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, gap: 16 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  inputWrapper: { marginBottom: 4 }, // Novo: Empacota o input e a mensagem de erro
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, fontSize: 16 },
  inputError: { borderColor: 'red', borderWidth: 2 }, // Novo: Borda vermelha para erro
  errorText: { color: 'red', fontSize: 12, marginTop: 4, marginLeft: 4 }, // Novo: Estilo do erro
  helperText: { color: '#666', fontSize: 12, marginTop: 4, marginLeft: 4 }, // Novo: Estilo da dica
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 10 },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 10 }
});