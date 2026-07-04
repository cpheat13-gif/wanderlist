import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchFriendProfile } from '../../lib/friends';
import { DESTINATIONS, SERIF } from '../../lib/editorial';
import { Trip } from '../../lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 48 - 12) / 2);

function nameFor(email: string | null): string {
  return email ? email.split('@')[0] : 'A friend';
}

export default function FriendProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<Trip[]>([]);
  const [past, setPast] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const res = await fetchFriendProfile(userId);
      setEmail(res.email);
      setWishlist(res.wishlist);
      setPast(res.past);
      setLoading(false);
    })();
  }, [userId]);

  // A friend's card opens the read-only destination page — where you can wishlist
  // or plan your own version.
  function openTrip(trip: Trip) {
    const collection = DESTINATIONS.find((d) => d.name === trip.title);
    if (collection) {
      router.push(`/destination/${collection.slug}`);
      return;
    }
    const params: Record<string, string> = { name: trip.title };
    if (trip.destination && trip.destination !== trip.title) {
      const country = trip.destination.replace(`${trip.title}, `, '');
      if (country) params.country = country;
    }
    router.push({ pathname: '/destination/custom', params });
  }

  function Grid({ trips }: { trips: Trip[] }) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {trips.map((trip) => (
          <Pressable
            key={trip.id}
            onPress={() => openTrip(trip)}
            style={({ pressed }) => ({ width: CARD_WIDTH, height: 200, borderRadius: 20, overflow: 'hidden', backgroundColor: '#E9EAEC', transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            {trip.cover_photo_url ? (
              <Image source={{ uri: trip.cover_photo_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : null}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.88)']} locations={[0.35, 0.65, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 }}>
              <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 18 }} numberOfLines={1}>{trip.title}</Text>
              {trip.destination && trip.destination !== trip.title ? (
                <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {trip.destination.replace(`${trip.title}, `, '')}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, color: '#111' }}>‹</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#111" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 26 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#17171E', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Text style={{ color: 'white', fontFamily: SERIF, fontSize: 30 }}>{nameFor(email).charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={{ fontFamily: SERIF, fontSize: 22, color: '#111' }}>{nameFor(email)}</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 12.5, marginTop: 4 }}>
              {wishlist.length} wishlisted · {past.length} {past.length === 1 ? 'trip' : 'trips'}
            </Text>
          </View>

          {/* Dreams */}
          <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
          <Text style={{ fontFamily: SERIF, fontSize: 21, color: '#111', marginBottom: 14 }}>Dreams</Text>
          {wishlist.length === 0 ? (
            <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, marginBottom: 28 }}>Nothing wishlisted yet.</Text>
          ) : (
            <View style={{ marginBottom: 28 }}>
              <Grid trips={wishlist} />
            </View>
          )}

          {/* Been there */}
          <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
          <Text style={{ fontFamily: SERIF, fontSize: 21, color: '#111', marginBottom: 14 }}>Been there</Text>
          {past.length === 0 ? (
            <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14 }}>No past trips shared yet.</Text>
          ) : (
            <Grid trips={past} />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
