import '../global.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AuthProvider, useAuth } from '../lib/auth';

const headerOptions = {
  headerStyle: { backgroundColor: '#0B0B0E' },
  headerTintColor: '#F5F3EE',
  headerTitleStyle: { color: '#F5F3EE' },
  headerShadowVisible: false,
} as const;

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  if (loading) {
    return <View className="flex-1 bg-bg" />;
  }

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="new-trip" options={{ title: 'New Trip', presentation: 'modal' }} />
      <Stack.Screen name="trip/[id]/index" options={{ title: '' }} />
      <Stack.Screen name="trip/[id]/add-place" options={{ title: 'Add Place', presentation: 'modal' }} />
      <Stack.Screen name="trip/[id]/add-flight" options={{ title: 'Add Flight', presentation: 'modal' }} />
      <Stack.Screen name="trip/[id]/map" options={{ title: 'Map' }} />
      <Stack.Screen name="discover/[tripId]" options={{ headerShown: false }} />
      <Stack.Screen name="destination/[slug]" options={{ headerShown: false }} />
      <Stack.Screen name="plan/[slug]" options={{ headerShown: false }} />
      <Stack.Screen name="day/[dayId]" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
