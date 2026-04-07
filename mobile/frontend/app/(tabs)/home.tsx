// app/(tabs)/home.tsx
import { View, Text, Button, StyleSheet } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';

export default function HomeScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feed de Doações</Text>
      <Text>Você está logado e acessando a área restrita!</Text>
      
      {/* Botão temporário para testarmos o LogOut */}
      <Button 
        title="Sair (LogOut)" 
        color="red"
        onPress={() => signOut()} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  title: { fontSize: 24, fontWeight: 'bold' }
});