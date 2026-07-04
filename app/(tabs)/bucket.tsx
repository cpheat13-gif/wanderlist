import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Dimensions, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DESTINATIONS, SERIF } from '../../lib/editorial';
import { Trip } from '../../lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 48 - 12) / 2);

type Tab = 'mine' | 'friends';

function nameFor(email: string | null | undefined): string {
  if (!email) return 'A friend';
  return email.split('@')[0];
}

export default function WishlistScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const myId = session?.user.id ?? '';
  const [trips, setTrips] = useState<Trip[]>([]);
  const [owners, setOwners] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('mine');

  const load = useCallback(async () => {
    setLoading(true);
    // RLS returns my wishlist plus every club member's wishlist (idea status).
    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'idea')
      .order('created_at', { ascending: false });
    const all = (data ?? []) as Trip[];
    setTrips(all);
    const ownerIds = [...new Set(all.map((t) => t.created_by).filter((id) => id && id !== myId))];
    if (ownerIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, email').in('id', ownerIds);
      const map: Record<string, string | null> = {};
      (profs ?? []).forEach((p: { id: string; email: string | null }) => (map[p.id] = p.email));
      setOwners(map);
    }
    setLoading(false);
  }, [myId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const mine = useMemo(() => trips.filter((t) => t.created_by === myId), [trips, myId]);
  const friends = useMemo(() => trips.filter((t) => t.created_by !== myId), [trips, myId]);

  async function handleDelete(trip: Trip) {
    setTrips((prev) => prev.filter((t) => t.id !== trip.id));
    await supabase.from('trips').delete().eq('id', trip.id);
  }

  function confirmDelete(trip: Trip) {
    if (trip.created_by !== myId) return; // can't delete a friend's item
    Alert.alert('Remove from wishlist?', `"${trip.title}" will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(trip) },
    ]);
  }

  // Mine → open the destination page or my own workspace. Friends → always the
  // read-only destination page, where you can save it to your own wishlist or plan.
  function openTrip(trip: Trip, isMine: boolean) {
    const collection = DESTINATIONS.find((d) => d.name === trip.title);
    if (collection) {
      router.push(`/destination/${collection.slug}`);
      return;
    }
    if (isMine) {
      router.push(`/discover/${trip.id}`);
      return;
    }
    const params: Record<string, string> = { name: trip.title };
    if (trip.destination && trip.destination !== trip.title) {
      const country = trip.destination.replace(`${trip.title}, `, '');
      if (country) params.country = country;
    }
    router.push({ pathname: '/destination/custom', params });
  }

  const active = tab === 'mine' ? mine : friends;
  const filtered = active.filter((t) => {
    const q = search.toLowerCase().trim();
    return !q || t.title.toLowerCase().includes(q) || (t.destination?.toLowerCase().includes(q) ?? false);
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      {/* Masthead */}
      <View style={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 12 }}>
        <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
          Dreams, kept
        </Text>
        <Text style={{ fontFamily: SERIF, fontSize: 34, color: '#111', letterSpacing: -0.5 }}>Wishlist</Text>
        <Text style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: '#6B7280', marginTop: 4 }}>
          {tab === 'mine' ? 'Every place that made your heart skip.' : 'Where your people are dreaming of going.'}
        </Text>
      </View>

      {/* Segmented control */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginBottom: 14 }}>
        {(['mine', 'friends'] as Tab[]).map((t) => {
          const activeTab = tab === t;
          const count = t === 'mine' ? mine.length : friends.length;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: activeTab ? '#111' : 'white',
                borderWidth: 1,
                borderColor: activeTab ? '#111' : '#E5E7EB',
                borderRadius: 100,
                paddingVertical: 9,
                paddingHorizontal: 18,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ color: activeTab ? 'white' : '#111', fontSize: 13.5, fontWeight: '700' }}>
                {t === 'mine' ? 'Mine' : 'Friends'}
              </Text>
              {count > 0 ? (
                <Text style={{ color: activeTab ? 'rgba(255,255,255,0.6)' : '#9CA3AF', fontSize: 12.5, fontWeight: '700' }}>
                  {count}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 100, paddingHorizontal: 18, height: 46, backgroundColor: 'white' }}>
          <Text style={{ color: '#9CA3AF', fontSize: 14, marginRight: 10 }}>⌕</Text>
          <TextInput
            style={{ flex: 1, color: '#111', fontSize: 14 }}
            placeholder={tab === 'mine' ? 'Search your wishlist…' : "Search friends' wishlists…"}
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
          active.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 52, paddingHorizontal: 20 }}>
              <Text style={{ fontSize: 40, marginBottom: 16 }}>{tab === 'mine' ? '♡' : '✧'}</Text>
              <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 20, marginBottom: 8, textAlign: 'center' }}>
                {tab === 'mine' ? 'Nothing saved yet' : 'No friends’ dreams yet'}
              </Text>
              <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 22 }}>
                {tab === 'mine'
                  ? 'Tap “Add to wishlist” on anything in Discover\nthat keeps you up at night.'
                  : 'When people in your club wishlist a place,\nit shows up here for inspiration.'}
              </Text>
              {tab === 'mine' ? (
                <Pressable
                  onPress={() => router.push('/(tabs)/discover')}
                  style={({ pressed }) => ({ backgroundColor: '#111', borderRadius: 100, paddingHorizontal: 26, paddingVertical: 13, transform: [{ scale: pressed ? 0.97 : 1 }] })}
                >
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>✦ Browse the atlas</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 48 }}>
              Nothing matches that.
            </Text>
          )
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {filtered.map((trip) => {
            const isMine = trip.created_by === myId;
            return (
              <Pressable
                key={trip.id}
                onPress={() => openTrip(trip, isMine)}
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
                  <Image source={{ uri: trip.cover_photo_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : null}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.88)']}
                  locations={[0.35, 0.65, 1]}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                {isMine ? (
                  <View style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#E11D48' }}>♥</Text>
                  </View>
                ) : (
                  <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 100, paddingVertical: 4, paddingHorizontal: 9 }}>
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#111' }}>{nameFor(owners[trip.created_by]).charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={{ color: 'white', fontSize: 10.5, fontWeight: '600' }} numberOfLines={1}>{nameFor(owners[trip.created_by])}</Text>
                  </View>
                )}
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 }}>
                  <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 18 }} numberOfLines={1}>
                    {trip.title}
                  </Text>
                  {trip.destination && trip.destination !== trip.title ? (
                    <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {trip.destination.replace(`${trip.title}, `, '')}
                    </Text>
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
