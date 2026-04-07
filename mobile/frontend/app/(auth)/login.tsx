// app/(auth)/login.tsx
import { View, Text, Button, StyleSheet } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';

export default function LoginScreen() {
  const { signIn } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Desapega Social</Text>
      <Text>Faça login para continuar</Text>
      
      {/* Botão temporário apenas para testarmos o AuthContext */}
      <Button 
        title="Simular Login" 
        onPress={() => signIn('fake-jwt-token-123')} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  title: { fontSize: 24, fontWeight: 'bold' }
});