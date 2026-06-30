import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SectionLabel } from '../../components/SectionLabel';
import { TripCard } from '../../components/TripCard';
import { PillButton } from '../../components/PillButton';
import { supabase } from '../../lib/supabase';
import { Trip } from '../../lib/types';

export default function TripsScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrips = useCallback(async () => {
    const { data } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
    setTrips(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [loadTrips])
  );

  async function handleDelete(trip: Trip) {
    setTrips((prev) => prev.filter((t) => t.id !== trip.id));
    const { error } = await supabase.from('trips').delete().eq('id', trip.id);
    if (error) {
      Alert.alert('Could not delete trip', error.message);
      loadTrips();
    }
  }

  function confirmDelete(trip: Trip) {
    Alert.alert('Delete trip?', `"${trip.title}" will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(trip) },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-5 pt-4">
        <View className="flex-row items-center justify-between mb-1">
          <SectionLabel>Trips</SectionLabel>
          <PillButton label="+ New Trip" onPress={() => router.push('/new-trip')} variant="glass" />
        </View>
        {trips.length > 0 ? (
          <Text className="text-textMuted text-xs mb-5">Long-press a trip to delete it.</Text>
        ) : null}

        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadTrips} tintColor="#D4A857" />}
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              onPress={() => router.push(`/trip/${item.id}`)}
              onLongPress={() => confirmDelete(item)}
            />
          )}
          ListEmptyComponent={
            !loading ? (
              <View className="items-center mt-20">
                <Text className="text-textMuted text-base">No trips yet — start with an idea.</Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}
