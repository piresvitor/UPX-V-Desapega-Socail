// app/index.tsx
import { View, ActivityIndicator } from 'react-native';

export default function IndexScreen() {
  // Esta tela pisca por 1 milissegundo. 
  // O AuthContext (Porteiro) vai interceptar e mandar para o Login ou para a Home.
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
}