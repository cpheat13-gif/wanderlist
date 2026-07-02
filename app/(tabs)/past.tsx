import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Dimensions, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Trip } from '../../lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 32 - 12) / 2);

export default function PastScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'past')
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
    Alert.alert('Delete trip?', `"${trip.title}" will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(trip) },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 6 }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#111', lineHeight: 40 }}>
          Past{'\n'}Trips
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#059669" />}
      >
        {!loading && trips.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 24 }}>
            <Text style={{ fontSize: 44, marginBottom: 14 }}>📸</Text>
            <Text style={{ color: '#111', fontSize: 17, fontWeight: '700', marginBottom: 6 }}>
              No memories here yet
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
              Once a trip is behind you it'll live here — your travel scrapbook in the making.
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {trips.map((trip) => (
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
                <View
                  style={{
                    marginTop: 5,
                    alignSelf: 'flex-start',
                    backgroundColor: 'rgba(255,255,255,0.18)',
                    borderRadius: 100,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' }}>
                    Past
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Sign out — at the bottom of the list */}
        <View style={{ marginTop: 48, alignItems: 'center' }}>
          <Pressable
            onPress={signOut}
            style={{
              paddingHorizontal: 28,
              paddingVertical: 10,
              borderRadius: 100,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
          >
            <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
