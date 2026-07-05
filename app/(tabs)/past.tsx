import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Dimensions, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { SERIF } from '../../lib/editorial';
import { Trip } from '../../lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 48 - 12) / 2);

export default function PastScreen() {
  const router = useRouter();
  const { signOut, session } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    // Scope to my own past trips — past trips are club-readable, so filter here.
    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'past')
      .eq('created_by', session.user.id)
      .order('created_at', { ascending: false });
    setTrips(data ?? []);
    setLoading(false);
  }, [session]);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 14,
          paddingBottom: 14,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <View>
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
            The scrapbook
          </Text>
          <Text style={{ fontFamily: SERIF, fontSize: 34, color: '#111', letterSpacing: -0.5 }}>
            Past
          </Text>
          <Text style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: '#6B7280', marginTop: 4 }}>
            The journeys that made you.
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 21,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            backgroundColor: 'white',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 4,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          })}
        >
          <Text style={{ fontSize: 17, color: '#111' }}>◎</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#111" />}
      >
        {!loading && trips.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 56, paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>📸</Text>
            <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 20, marginBottom: 8, textAlign: 'center' }}>
              No memories here yet
            </Text>
            <Text
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                color: '#9CA3AF',
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              Once a journey is behind you it'll live here —{'\n'}your travel scrapbook in the making.
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {trips.map((trip) => (
            <Pressable
              key={trip.id}
              onPress={() => router.push(`/memories/${trip.id}`)}
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
