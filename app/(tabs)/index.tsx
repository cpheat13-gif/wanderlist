import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookedPlaceRow } from '../../components/discover/BookedPlaceRow';
import { SectionLabel } from '../../components/SectionLabel';
import { supabase } from '../../lib/supabase';
import { Place, PlaceCategory, Trip } from '../../lib/types';

const CATEGORY_SECTIONS: { key: PlaceCategory; label: string }[] = [
  { key: 'hotel', label: 'Hotels' },
  { key: 'restaurant', label: 'Food' },
  { key: 'activity', label: 'Activities' },
  { key: 'sightseeing', label: 'Sightseeing' },
];

export default function PlanningScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [placesByTrip, setPlacesByTrip] = useState<Record<string, Place[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: tripsData } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
    const allTrips = tripsData ?? [];
    setTrips(allTrips);

    const tripIds = allTrips.map((t) => t.id);
    if (tripIds.length === 0) {
      setPlacesByTrip({});
      setLoading(false);
      return;
    }

    const { data: placesData } = await supabase
      .from('places')
      .select('*')
      .in('trip_id', tripIds)
      .order('created_at');

    const grouped: Record<string, Place[]> = {};
    (placesData ?? []).forEach((place) => {
      if (!grouped[place.trip_id]) grouped[place.trip_id] = [];
      grouped[place.trip_id].push(place);
    });
    setPlacesByTrip(grouped);
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

  async function toggleBooked(place: Place) {
    const next = !place.is_booked;
    setPlacesByTrip((prev) => ({
      ...prev,
      [place.trip_id]: (prev[place.trip_id] ?? []).map((p) => (p.id === place.id ? { ...p, is_booked: next } : p)),
    }));
    await supabase.from('places').update({ is_booked: next }).eq('id', place.id);
  }

  async function changeConfirmation(place: Place, value: string) {
    const trimmed = value.trim() || null;
    setPlacesByTrip((prev) => ({
      ...prev,
      [place.trip_id]: (prev[place.trip_id] ?? []).map((p) =>
        p.id === place.id ? { ...p, confirmation_number: trimmed } : p
      ),
    }));
    await supabase.from('places').update({ confirmation_number: trimmed }).eq('id', place.id);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="px-5 pt-4 pb-1">
        <SectionLabel>Planning</SectionLabel>
        {trips.length > 0 ? (
          <Text className="text-textMuted text-xs mt-1">Long-press a trip to delete it.</Text>
        ) : null}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
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
          const places = placesByTrip[trip.id] ?? [];
          return (
            <View key={trip.id} className="mb-7">
              <Pressable
                onPress={() => router.push(`/discover/${trip.id}`)}
                onLongPress={() => confirmDelete(trip)}
                className="mb-3"
              >
                <Text className="text-text text-xl font-bold">{trip.title}</Text>
                {trip.destination && trip.destination !== trip.title ? (
                  <Text className="text-textMuted text-sm mt-0.5">{trip.destination}</Text>
                ) : null}
              </Pressable>

              {places.length === 0 ? (
                <Text className="text-textMuted text-sm">Tap to explore and add places.</Text>
              ) : (
                CATEGORY_SECTIONS.map((section) => {
                  const sectionPlaces = places.filter((p) => p.category === section.key);
                  if (sectionPlaces.length === 0) return null;
                  return (
                    <View key={section.key} className="mb-4">
                      <Text className="text-textMuted text-xs uppercase mb-2" style={{ letterSpacing: 2 }}>
                        {section.label}
                      </Text>
                      {sectionPlaces.map((place) => (
                        <BookedPlaceRow
                          key={place.id}
                          place={place}
                          onToggleBooked={() => toggleBooked(place)}
                          onChangeConfirmation={(value) => changeConfirmation(place, value)}
                        />
                      ))}
                    </View>
                  );
                })
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
