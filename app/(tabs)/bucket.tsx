import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Dimensions, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { DESTINATIONS, SERIF } from '../../lib/editorial';
import { Trip } from '../../lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 48 - 12) / 2);

export default function WishlistScreen() {
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
    Alert.alert('Remove from wishlist?', `"${trip.title}" will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(trip) },
    ]);
  }

  function openTrip(trip: Trip) {
    const collection = DESTINATIONS.find((d) => d.name === trip.title);
    if (collection) router.push(`/destination/${collection.slug}`);
    else router.push(`/discover/${trip.id}`);
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
          Dreams, kept
        </Text>
        <Text style={{ fontFamily: SERIF, fontSize: 34, color: '#111', letterSpacing: -0.5 }}>
          Wishlist
        </Text>
        <Text style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: '#6B7280', marginTop: 4 }}>
          Every place that made your heart skip.
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
            placeholder="Search your wishlist…"
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
              <Text style={{ fontSize: 40, marginBottom: 16 }}>♡</Text>
              <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 20, marginBottom: 8, textAlign: 'center' }}>
                Nothing saved yet
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
                Tap the heart on anything in Discover{'\n'}that keeps you up at night.
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/discover')}
                style={({ pressed }) => ({
                  backgroundColor: '#111',
                  borderRadius: 100,
                  paddingHorizontal: 26,
                  paddingVertical: 13,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>✦ Browse the atlas</Text>
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
              Nothing on your wishlist matches that.
            </Text>
          )
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {filtered.map((trip) => (
            <Pressable
              key={trip.id}
              onPress={() => openTrip(trip)}
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
                colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.88)']}
                locations={[0.35, 0.65, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: 'rgba(255,255,255,0.92)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 13, color: '#E11D48' }}>♥</Text>
              </View>
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 }}>
                <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 18 }} numberOfLines={1}>
                  {trip.title}
                </Text>
                {trip.destination && trip.destination !== trip.title ? (
                  <Text
                    style={{
                      fontFamily: SERIF,
                      fontStyle: 'italic',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: 12,
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {trip.destination.replace(`${trip.title}, `, '')}
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
