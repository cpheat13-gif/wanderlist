import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { SERIF } from '../../lib/editorial';
import { Trip } from '../../lib/types';

function fmtRange(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const opts = { month: 'short', day: 'numeric' } as const;
  const s = new Date(start + 'T12:00:00').toLocaleDateString('en-US', opts);
  if (!end) return s;
  const e = new Date(end + 'T12:00:00').toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${s} – ${e}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut, isAdmin } = useAuth();
  const [bookings, setBookings] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'booked')
      .order('start_date', { ascending: true });
    setBookings(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const email = session?.user.email ?? '';
  const initial = email.charAt(0).toUpperCase() || '✈';
  const memberSince = session?.user.created_at
    ? new Date(session.user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#111" />}
      >
        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 30, paddingBottom: 28 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: '#17171E',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Text style={{ color: 'white', fontFamily: SERIF, fontSize: 30 }}>{initial}</Text>
          </View>
          <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111' }}>{email}</Text>
          {memberSince ? (
            <Text style={{ color: '#9CA3AF', fontSize: 12.5, marginTop: 4 }}>
              Traveling with Wanderlist since {memberSince}
            </Text>
          ) : null}
        </View>

        {/* Bookings */}
        <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
        <Text style={{ fontFamily: SERIF, fontSize: 21, color: '#111', marginBottom: 14 }}>
          Your bookings
        </Text>

        {!loading && bookings.length === 0 ? (
          <View
            style={{
              backgroundColor: 'white',
              borderWidth: 1,
              borderColor: '#F0F0EE',
              borderRadius: 18,
              padding: 24,
              alignItems: 'center',
              marginBottom: 30,
            }}
          >
            <Text style={{ fontSize: 32, marginBottom: 10 }}>🎫</Text>
            <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 16, marginBottom: 4 }}>
              No journeys booked yet
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
              Find a destination that calls to you and book its signature journey.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/discover')}
              style={({ pressed }) => ({
                backgroundColor: '#111',
                borderRadius: 100,
                paddingHorizontal: 22,
                paddingVertical: 11,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 13.5 }}>Browse the atlas</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 12, marginBottom: 30 }}>
            {bookings.map((trip) => {
              const range = fmtRange(trip.start_date, trip.end_date);
              return (
                <Pressable
                  key={trip.id}
                  onPress={() => router.push(`/discover/${trip.id}`)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    backgroundColor: 'white',
                    borderWidth: 1,
                    borderColor: '#F0F0EE',
                    borderRadius: 18,
                    overflow: 'hidden',
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <View style={{ width: 86, height: 86, backgroundColor: '#E9EAEC' }}>
                    {trip.cover_photo_url ? (
                      <Image
                        source={{ uri: trip.cover_photo_url }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, padding: 14, justifyContent: 'center' }}>
                    <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 16 }} numberOfLines={1}>
                      {trip.title}
                    </Text>
                    {range ? (
                      <Text style={{ color: '#9CA3AF', fontSize: 12.5, marginTop: 3 }}>{range}</Text>
                    ) : null}
                    <Text style={{ color: '#059669', fontSize: 11, fontWeight: '700', marginTop: 5, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                      Confirmed
                    </Text>
                  </View>
                  <View style={{ justifyContent: 'center', paddingRight: 14 }}>
                    <Text style={{ color: '#D1D5DB', fontSize: 20 }}>›</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Admin */}
        {isAdmin ? (
          <Pressable
            onPress={() => router.push('/admin')}
            style={({ pressed }) => ({
              backgroundColor: 'white',
              borderWidth: 1,
              borderColor: '#F0F0EE',
              borderRadius: 16,
              paddingVertical: 15,
              paddingHorizontal: 18,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 24,
              transform: [{ scale: pressed ? 0.99 : 1 }],
            })}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: SERIF, fontSize: 16, color: '#111' }}>Manage members</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12.5, marginTop: 2 }}>Approve who gets access</Text>
            </View>
            <Text style={{ color: '#D1D5DB', fontSize: 20 }}>›</Text>
          </Pressable>
        ) : null}

        {/* Sign out */}
        <Pressable
          onPress={signOut}
          style={({ pressed }) => ({
            alignSelf: 'center',
            paddingHorizontal: 28,
            paddingVertical: 11,
            borderRadius: 100,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
