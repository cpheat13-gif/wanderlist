import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SectionLabel } from '../../components/SectionLabel';
import { supabase } from '../../lib/supabase';
import { Place, Trip } from '../../lib/types';

export default function PlanningScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [placeCountByTrip, setPlaceCountByTrip] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: tripsData } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
    const allTrips = tripsData ?? [];
    setTrips(allTrips);

    const tripIds = allTrips.map((t) => t.id);
    if (tripIds.length === 0) {
      setPlaceCountByTrip({});
      setLoading(false);
      return;
    }

    const { data: placesData } = await supabase.from('places').select('id, trip_id').in('trip_id', tripIds);
    const counts: Record<string, number> = {};
    (placesData ?? []).forEach((p: Pick<Place, 'id' | 'trip_id'>) => {
      counts[p.trip_id] = (counts[p.trip_id] ?? 0) + 1;
    });
    setPlaceCountByTrip(counts);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleDelete(trip: Trip) {
    setTrips((prev) => prev.filter((t) => t.id !== trip.id));
    const { error } = await supabase.from('trips').delete().eq('id', trip.id);
    if (error) {
      Alert.alert('Could not delete trip', error.message);
      load();
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
      <View className="px-5 pt-4 pb-3">
        <SectionLabel>Planning</SectionLabel>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#D4A857" />}
      >
        {!loading && trips.length === 0 ? (
          <View className="items-center mt-20">
            <Text className="text-textMuted text-base text-center">
              No trips yet — start one from New Trip.
            </Text>
          </View>
        ) : null}

        {trips.map((trip) => {
          const count = placeCountByTrip[trip.id] ?? 0;
          return (
            <Pressable
              key={trip.id}
              onPress={() => router.push(`/discover/${trip.id}`)}
              onLongPress={() => confirmDelete(trip)}
              className="mb-4 rounded-2xl overflow-hidden"
              style={{ height: 200 }}
            >
              {trip.cover_photo_url ? (
                <Image
                  source={{ uri: trip.cover_photo_url }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <View className="flex-1 bg-surface" />
              )}

              <LinearGradient
                colors={['transparent', 'rgba(11,11,14,0.65)', 'rgba(11,11,14,0.95)']}
                locations={[0.3, 0.65, 1]}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '75%' }}
              />

<View className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex-row items-end justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-white text-xl font-bold" numberOfLines={1}>
                    {trip.title}
                  </Text>
                  {trip.destination && trip.destination !== trip.title ? (
                    <Text className="text-white/60 text-sm mt-0.5" numberOfLines={1}>
                      {trip.destination}
                    </Text>
                  ) : null}
                </View>
                {count > 0 ? (
                  <View className="bg-white/20 rounded-full px-3 py-1">
                    <Text className="text-white text-xs font-semibold">{count} {count === 1 ? 'place' : 'places'}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
