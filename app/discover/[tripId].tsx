import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { DestinationTab, DestinationTabBar } from '../../components/discover/DestinationTabBar';
import { ExplorerTab } from '../../components/discover/ExplorerTab';
import { FlightsTab } from '../../components/discover/FlightsTab';
import { ChatTab } from '../../components/discover/ChatTab';
import { BookedTab } from '../../components/discover/BookedTab';
import { supabase } from '../../lib/supabase';
import { Trip } from '../../lib/types';

function parseDestination(destination: string | null): { name: string; country?: string } {
  if (!destination) return { name: 'this trip' };
  const [name, ...rest] = destination.split(',').map((s) => s.trim());
  return { name, country: rest.length > 0 ? rest.join(', ') : undefined };
}

export default function DestinationScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [activeTab, setActiveTab] = useState<DestinationTab>('explorer');

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
      return () => setStatusBarStyle('light');
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single()
        .then(({ data }) => setTrip(data ?? null));
    }, [tripId])
  );

  if (!trip) {
    return <SafeAreaView className="flex-1 bg-white" />;
  }

  const { name, country } = parseDestination(trip.destination);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-5 pt-2 pb-1">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-neutral-900 text-lg">←</Text>
        </Pressable>
        <Text className="text-neutral-900 text-lg font-semibold">{trip.title}</Text>
      </View>

      <View className="flex-1">
        {activeTab === 'explorer' ? <ExplorerTab tripId={trip.id} destination={name} country={country} /> : null}
        {activeTab === 'flights' ? <FlightsTab tripId={trip.id} destination={name} country={country} /> : null}
        {activeTab === 'chat' ? <ChatTab destination={name} country={country} /> : null}
        {activeTab === 'booked' ? <BookedTab tripId={trip.id} destination={name} country={country} /> : null}
      </View>

      <DestinationTabBar active={activeTab} onChange={setActiveTab} />
    </SafeAreaView>
  );
}
