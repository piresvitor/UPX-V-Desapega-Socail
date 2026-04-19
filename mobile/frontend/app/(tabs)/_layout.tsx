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
      
      {/* ================= ABA NORMAL ================= */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
          href: (userRole === 'Doador' || userRole === 'Beneficiário') ? '/home' : null,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Doar',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle-outline" size={24} color={color} />,
          href: (userRole === 'Doador' || userRole === 'Beneficiário') ? '/create' : null,
        }}
      />
      <Tabs.Screen
        name="radar"
        options={{
          title: 'Radar',
          tabBarIcon: ({ color }) => <Ionicons name="location-outline" size={24} color={color} />,
          href: userRole === 'Freteiro' ? '/radar' : null,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles-outline" size={24} color={color} />,
          href: userRole !== 'Admin' ? '/chat' : null,
        }}
      />

      {/* ================= ABAS DO ADMIN ================= */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Painel',
          tabBarIcon: ({ color }) => <Ionicons name="pie-chart-outline" size={24} color={color} />,
          href: userRole === 'Admin' ? '/dashboard' : null,
        }}
      />
      <Tabs.Screen
        name="verifications"
        options={{
          title: 'Auditoria',
          tabBarIcon: ({ color }) => <Ionicons name="shield-checkmark-outline" size={24} color={color} />,
          href: userRole === 'Admin' ? '/verifications' : null,
        }}
      />
      <Tabs.Screen
        name="admin-users"
        options={{
          title: 'Usuários',
          tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={24} color={color} />,
          href: userRole === 'Admin' ? '/admin-users' : null,
        }}
      />

      {/* ================= PERFIL GERAL ================= */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
          href: userRole !== 'Admin' ? '/profile' : null,
        }}
      />
    </Tabs>
  );
}