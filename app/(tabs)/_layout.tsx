import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: 'white', borderTopColor: '#F3F4F6' },
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>✦</Text>,
        }}
      />
      <Tabs.Screen
        name="bucket"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>♡</Text>,
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
      <Tabs.Screen name="past" options={{ href: null }} />
      <Tabs.Screen name="polls" options={{ href: null }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>◍</Text>,
        }}
      />
    </Tabs>
  );
}
