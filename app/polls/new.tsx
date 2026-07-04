import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { createPoll } from '../../lib/poll';
import { SERIF } from '../../lib/editorial';
import { Trip } from '../../lib/types';

function subtitleFor(trip: Trip): string | null {
  if (trip.destination && trip.destination !== trip.title) {
    return trip.destination.replace(`${trip.title}, `, '');
  }
  return null;
}

export default function NewPollScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTrips((data ?? []) as Trip[]);
        setLoading(false);
      });
  }, []);

  const selectedTrips = useMemo(() => trips.filter((t) => selected.has(t.id)), [trips, selected]);
  const canCreate = title.trim().length > 0 && selectedTrips.length >= 2;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (!session || !canCreate || creating) return;
    setCreating(true);
    setError(null);
    const poll = await createPoll(session.user.id, {
      title: title.trim(),
      options: selectedTrips.map((t) => ({
        trip_id: t.id,
        label: t.title,
        subtitle: subtitleFor(t),
        cover_photo_url: t.cover_photo_url,
      })),
    });
    if (poll) {
      router.replace(`/polls/${poll.id}`);
    } else {
      setError('Could not create the poll. Please try again.');
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, color: '#111' }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111', marginLeft: 4 }}>New poll</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 8, marginBottom: 8 }}>
          What are we deciding?
        </Text>
        <TextInput
          style={{
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 16,
            paddingHorizontal: 18,
            paddingVertical: 15,
            color: '#111',
            fontSize: 16,
            marginBottom: 24,
          }}
          placeholder="e.g. Where's our birthday trip?"
          placeholderTextColor="#B6BAC2"
          value={title}
          onChangeText={setTitle}
        />

        <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
        <Text style={{ fontFamily: SERIF, fontSize: 21, color: '#111', marginBottom: 4 }}>Pick the options</Text>
        <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 13.5, marginBottom: 18 }}>
          Choose 2 or more of your saved trips to vote between.
        </Text>

        {loading ? (
          <ActivityIndicator color="#111" style={{ marginTop: 20 }} />
        ) : trips.length === 0 ? (
          <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, lineHeight: 21 }}>
            No saved trips yet — add some from Discover or Wishlist, then build a poll.
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            {trips.map((t) => {
              const isSel = selected.has(t.id);
              return (
                <Pressable
                  key={t.id}
                  onPress={() => toggle(t.id)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'white',
                    borderWidth: isSel ? 2 : 1,
                    borderColor: isSel ? '#111' : '#F0F0EE',
                    borderRadius: 16,
                    padding: 10,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                  })}
                >
                  <View style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', backgroundColor: '#E9EAEC' }}>
                    {t.cover_photo_url ? (
                      <Image source={{ uri: t.cover_photo_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontFamily: SERIF, fontSize: 16, color: '#111' }} numberOfLines={1}>
                      {t.title}
                    </Text>
                    {subtitleFor(t) ? (
                      <Text style={{ color: '#9CA3AF', fontSize: 12.5, marginTop: 2 }} numberOfLines={1}>
                        {subtitleFor(t)}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: isSel ? '#111' : 'transparent',
                      borderWidth: isSel ? 0 : 1.5,
                      borderColor: '#D1D5DB',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 6,
                    }}
                  >
                    {isSel ? <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {error ? <Text style={{ color: '#B91C1C', fontSize: 12.5, marginTop: 14 }}>{error}</Text> : null}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#FDFCFA',
          borderTopWidth: 1,
          borderTopColor: '#F0F0EE',
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: insets.bottom + 14,
        }}
      >
        <Pressable
          onPress={handleCreate}
          disabled={!canCreate || creating}
          style={({ pressed }) => ({
            backgroundColor: '#111',
            borderRadius: 100,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: !canCreate || creating ? 0.4 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          {creating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>
              {selectedTrips.length >= 2 ? `Create poll · ${selectedTrips.length} options` : 'Pick at least 2'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
