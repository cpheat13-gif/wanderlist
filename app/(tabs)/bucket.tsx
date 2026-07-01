import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Dimensions, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { Trip } from '../../lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 32 - 12) / 2);

export default function BucketScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'idea')
      .order('created_at', { ascending: false });
    setTrips(data ?? []);
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
    Alert.alert('Remove from Bucket List?', `"${trip.title}" will be permanently deleted.`, [
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
          Bucket{'\n'}List
        </Text>
      </View>

      {/* Search */}
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
            placeholder="Search bucket list..."
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
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 15, textAlign: 'center', lineHeight: 24 }}>
              {trips.length === 0
                ? 'Nothing saved yet — browse Discover to add destinations.'
                : 'No trips match your search.'}
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {filtered.map((trip) => (
            <Pressable
              key={trip.id}
              onPress={() => router.push(`/discover/${trip.id}`)}
              onLongPress={() => confirmDelete(trip)}
              style={{ width: CARD_WIDTH, height: 200, borderRadius: 20, overflow: 'hidden' }}
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
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
