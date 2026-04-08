import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
        tabBarActiveTintColor: '#2196F3', 
        headerShown: false 
    }}>
      <Tabs.Screen name="home" options={{ title: 'Início' }} />
      <Tabs.Screen name="create" options={{ title: 'Doar' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}