// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: 'blue' }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Feed',
          tabBarIcon: () => null, // Depois colocamos os ícones do FontAwesome aqui!
        }}
      />
    </Tabs>
  );
}