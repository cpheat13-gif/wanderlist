import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Dimensions, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { SERIF, formatPrice } from '../../lib/editorial';
import { Trip } from '../../lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 48 - 12) / 2);

export default function PlanningScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [dayCountByTrip, setDayCountByTrip] = useState<Record<string, number>>({});
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
      setDayCountByTrip({});
      setLoading(false);
      return;
    }

    const { data: dayRows } = await supabase
      .from('itinerary_days')
      .select('trip_id')
      .in('trip_id', tripIds);
    const counts: Record<string, number> = {};
    (dayRows ?? []).forEach((r: { trip_id: string }) => {
      counts[r.trip_id] = (counts[r.trip_id] ?? 0) + 1;
    });
    setDayCountByTrip(counts);
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
    Alert.alert('Delete trip?', `"${trip.title}" and its itinerary will be permanently deleted.`, [
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      {/* Masthead */}
      <View style={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 14 }}>
        <Text
          style={{
            color: '#9CA3AF',
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          In the works
        </Text>
        <Text style={{ fontFamily: SERIF, fontSize: 34, color: '#111', letterSpacing: -0.5 }}>
          Planning
        </Text>
        <Text style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: '#6B7280', marginTop: 4 }}>
          From wish to window seat.
        </Text>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 100,
            paddingHorizontal: 18,
            height: 46,
            backgroundColor: 'white',
          }}
        >
          <Text style={{ color: '#9CA3AF', fontSize: 14, marginRight: 10 }}>⌕</Text>
          <TextInput
            style={{ flex: 1, color: '#111', fontSize: 14 }}
            placeholder="Search your plans…"
            placeholderTextColor="#B6BAC2"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={12}>
              <Text style={{ color: '#9CA3AF', fontSize: 14 }}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#111" />}
      >
        {!loading && filtered.length === 0 ? (
          trips.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 56, paddingHorizontal: 20 }}>
              <Text style={{ fontSize: 40, marginBottom: 16 }}>✈</Text>
              <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 20, marginBottom: 8, textAlign: 'center' }}>
                Nothing in planning yet
              </Text>
              <Text
                style={{
                  fontFamily: SERIF,
                  fontStyle: 'italic',
                  color: '#9CA3AF',
                  fontSize: 14,
                  textAlign: 'center',
                  lineHeight: 22,
                  marginBottom: 22,
                }}
              >
                Open a destination and tap{'\n'}"Plan trip itinerary" to begin.
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/bucket')}
                style={({ pressed }) => ({
                  backgroundColor: '#111',
                  borderRadius: 100,
                  paddingHorizontal: 26,
                  paddingVertical: 13,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>♡ View wishlist</Text>
              </Pressable>
            </View>
          ) : (
            <Text
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                color: '#9CA3AF',
                fontSize: 14,
                textAlign: 'center',
                marginTop: 48,
              }}
            >
              No plans match that.
            </Text>
          )
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {filtered.map((trip) => {
            const dayCount = dayCountByTrip[trip.id] ?? 0;
            const est = trip.est_cost_per_person;
            const meta =
              dayCount > 0
                ? `${dayCount} days${est ? ` · est ${formatPrice(Math.round(est))} pp` : ''}`
                : 'No itinerary yet';
            return (
              <Pressable
                key={trip.id}
                onPress={() => router.push(`/discover/${trip.id}`)}
                onLongPress={() => confirmDelete(trip)}
                style={({ pressed }) => ({
                  width: CARD_WIDTH,
                  height: 210,
                  borderRadius: 20,
                  overflow: 'hidden',
                  backgroundColor: '#E9EAEC',
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                {trip.cover_photo_url ? (
                  <Image
                    source={{ uri: trip.cover_photo_url }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : null}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
                  locations={[0.3, 0.6, 1]}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 }}>
                  <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 18 }} numberOfLines={1}>
                    {trip.title}
                  </Text>
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.75)',
                      fontSize: 10.5,
                      fontWeight: '600',
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                      marginTop: 4,
                    }}
                    numberOfLines={1}
                  >
                    {meta}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
