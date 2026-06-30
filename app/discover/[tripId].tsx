import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { DestinationTab, DestinationTabBar } from '../../components/discover/DestinationTabBar';
import { ExplorerTab } from '../../components/discover/ExplorerTab';
import { FlightsTab } from '../../components/discover/FlightsTab';
import { ChatTab } from '../../components/discover/ChatTab';
import { supabase } from '../../lib/supabase';
import { Place, Trip } from '../../lib/types';

function parseDestination(destination: string | null): { name: string; country?: string } {
  if (!destination) return { name: 'this trip' };
  const [name, ...rest] = destination.split(',').map((s) => s.trim());
  return { name, country: rest.length > 0 ? rest.join(', ') : undefined };
}

function SecondaryHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 4, paddingHorizontal: 20, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
      <Pressable onPress={onBack} style={{ marginRight: 12, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 22, color: '#111' }}>←</Text>
      </Pressable>
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#111' }}>{title}</Text>
    </View>
  );
}

export default function DestinationScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [flightCount, setFlightCount] = useState(0);
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

      supabase
        .from('places')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true })
        .then(({ data }) => setPlaces(data ?? []));

      supabase
        .from('flights')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', tripId)
        .then(({ count }) => setFlightCount(count ?? 0));
    }, [tripId])
  );

  function handlePlaceAdded(place: Place) {
    setPlaces((prev) => [...prev, place]);
  }

  function handlePlaceUpdate(updated: Place) {
    setPlaces((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  if (!trip) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: '#F2F2F4' }} />;
  }

  const { name, country } = parseDestination(trip.destination);

  return (
    <View style={{ flex: 1, backgroundColor: '#F2F2F4' }}>
      {activeTab !== 'explorer' ? (
        <SecondaryHeader title={trip.title} onBack={() => router.back()} />
      ) : null}

      <View style={{ flex: 1 }}>
        {activeTab === 'explorer' ? (
          <ExplorerTab
            tripId={trip.id}
            destination={name}
            country={country}
            coverPhotoUrl={trip.cover_photo_url}
            places={places}
            flightCount={flightCount}
            onBack={() => router.back()}
            onPlaceAdded={handlePlaceAdded}
            onPlaceUpdate={handlePlaceUpdate}
          />
        ) : null}
        {activeTab === 'flights' ? <FlightsTab tripId={trip.id} destination={name} country={country} /> : null}
        {activeTab === 'chat' ? <ChatTab destination={name} country={country} /> : null}
      </View>

      <DestinationTabBar active={activeTab} onChange={setActiveTab} />
    </View>
  );
}
