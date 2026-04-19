import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';

export default function TabLayout() {
  const { userRole } = useAuth();

  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#2196F3',
      headerShown: false,
      tabBarStyle: { height: 60, paddingBottom: 5 }
    }}>
      
      {/* ABA 1: FEED GERAL (Escondida para Freteiros e Admins) */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
          href: (userRole === 'Doador' || userRole === 'Beneficiário') ? '/home' : null,
        }}
      />

      {/* ABA 2: CRIAR DOAÇÃO (Escondida para Freteiros e Admins) */}
      <Tabs.Screen
        name="create"
        options={{
          title: 'Doar',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle-outline" size={24} color={color} />,
          href: (userRole === 'Doador' || userRole === 'Beneficiário') ? '/create' : null,
        }}
      />

      {/* ABA EXCLUSIVA DO FRETEIRO */}
      <Tabs.Screen
        name="radar"
        options={{
          title: 'Radar Fretes',
          tabBarIcon: ({ color }) => <Ionicons name="map-outline" size={24} color={color} />,
          href: userRole === 'Freteiro' ? '/radar' : null,
        }}
      />

      {/* ABA DE CHAT (Todo mundo vê, menos Admin) */}
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles-outline" size={24} color={color} />,
          href: userRole !== 'Admin' ? '/chat' : null,
        }}
      />

      {/* ABA DE PERFIL (Todo mundo vê) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}