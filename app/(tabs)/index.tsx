import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Dimensions, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { Place, Trip } from '../../lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 32 - 12) / 2);

export default function PlanningScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [placeCountByTrip, setPlaceCountByTrip] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data: tripsData } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'planning')
      .order('created_at', { ascending: false });
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
    await supabase.from('trips').delete().eq('id', trip.id);
  }

  function confirmDelete(trip: Trip) {
    Alert.alert('Delete trip?', `"${trip.title}" will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(trip) },
    ]);
  }

  const filtered = trips.filter((t) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      t.title.toLowerCase().includes(q) ||
      (t.destination?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 6 }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#111', lineHeight: 40 }}>
          Planning
        </Text>
      </View>

      {/* Search row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 10 }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F3F4F6',
            borderRadius: 100,
            paddingHorizontal: 16,
            height: 46,
          }}
        >
          <Text style={{ color: '#9CA3AF', fontSize: 15, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={{ flex: 1, color: '#111', fontSize: 14 }}
            placeholder="Search trips..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Text style={{ color: '#9CA3AF', fontSize: 15 }}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#059669" />}
      >
        {!loading && filtered.length === 0 ? (
          trips.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 24 }}>
              <Text style={{ fontSize: 44, marginBottom: 14 }}>✈️</Text>
              <Text style={{ color: '#111', fontSize: 17, fontWeight: '700', marginBottom: 6 }}>
                Nothing in planning yet
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 }}>
                Open a trip from your bucket list and tap "Move to Planning" when you're ready to make it real.
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/bucket')}
                style={({ pressed }) => ({
                  backgroundColor: '#059669',
                  borderRadius: 100,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
                  ♡ View bucket list
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ color: '#9CA3AF', fontSize: 15, textAlign: 'center', lineHeight: 24 }}>
                No trips match your search.
              </Text>
            </View>
          )
        ) : null}

        {/* 2-column grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {filtered.map((trip) => {
            const count = placeCountByTrip[trip.id] ?? 0;
            return (
              <Pressable
                key={trip.id}
                onPress={() => router.push(`/discover/${trip.id}`)}
                onLongPress={() => confirmDelete(trip)}
                style={({ pressed }) => ({
                  width: CARD_WIDTH,
                  height: 200,
                  borderRadius: 20,
                  overflow: 'hidden',
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                {trip.cover_photo_url ? (
                  <Image
                    source={{ uri: trip.cover_photo_url }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <View style={{ flex: 1, backgroundColor: '#E5E7EB' }} />
                )}

                <LinearGradient
                  colors={['transparent', 'rgba(11,11,14,0.72)', 'rgba(11,11,14,0.96)']}
                  locations={[0.3, 0.65, 1]}
                  style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '75%' }}
                />

                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 }}>
                  <Text
                    style={{ color: 'white', fontSize: 14, fontWeight: '700', letterSpacing: -0.2 }}
                    numberOfLines={1}
                  >
                    {trip.title}
                  </Text>
                  {trip.destination && trip.destination !== trip.title ? (
                    <Text
                      style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {trip.destination}
                    </Text>
                  ) : null}
                  {count > 0 ? (
                    <View
                      style={{
                        marginTop: 5,
                        alignSelf: 'flex-start',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRadius: 100,
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
                        {count} {count === 1 ? 'place' : 'places'}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
