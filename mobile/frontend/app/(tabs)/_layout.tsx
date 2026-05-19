import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { userRole } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#2563EB',
      tabBarInactiveTintColor: '#64748B',
      tabBarLabelStyle: { fontSize: 12, paddingBottom: 4 },
      headerShown: false,
      tabBarStyle: {
        height: 60 + insets.bottom,
        paddingBottom: 8 + insets.bottom,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      }
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