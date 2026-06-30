import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0B0B0E', borderTopColor: '#2A2A33' },
        tabBarActiveTintColor: '#D4A857',
        tabBarInactiveTintColor: '#9B9AA3',
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'New Trip',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>✦</Text>,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Planning',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>◷</Text>,
        }}
      />
      <Tabs.Screen
        name="booked"
        options={{
          title: 'Booked',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>✓</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>◎</Text>,
        }}
      />
    </Tabs>
  );
}
