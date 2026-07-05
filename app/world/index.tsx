import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { locateStops } from '../../lib/ai';
import { fetchWorldPlaces, STATUS_META, WorldMarker, WorldStatus } from '../../lib/world';
import { SERIF } from '../../lib/editorial';
import { ConciergeLoader } from '../../components/ConciergeLoader';
import { WorldMap } from '../../components/trip/WorldMap';

type Filter = 'all' | WorldStatus;

export default function WorldScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const myId = session?.user.id ?? '';
  const [markers, setMarkers] = useState<WorldMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    if (!myId) return;
    setLoading(true);
    try {
      const places = await fetchWorldPlaces(myId);
      if (places.length === 0) {
        setMarkers([]);
        setLoading(false);
        return;
      }
      const res = await locateStops({
        destination: 'the world',
        stops: places.map((p) => ({ ref: p.id, title: p.destination || p.title })),
      });
      const coords = new Map<string, { lat: number; lng: number }>();
      res.located.forEach((l) => {
        if (typeof l.lat === 'number' && typeof l.lng === 'number') coords.set(l.ref, { lat: l.lat, lng: l.lng });
      });
      setMarkers(
        places
          .filter((p) => coords.has(p.id))
          .map((p) => ({
            id: p.id,
            title: p.title,
            subtitle: p.subtitle,
            lat: coords.get(p.id)!.lat,
            lng: coords.get(p.id)!.lng,
            status: p.status,
            color: STATUS_META[p.status].color,
            photo: p.photo,
            when: p.when,
          }))
      );
    } catch {
      setMarkers([]);
    }
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: markers.length };
    markers.forEach((m) => (c[m.status] = (c[m.status] ?? 0) + 1));
    return c;
  }, [markers]);
  const visible = useMemo(() => (filter === 'all' ? markers : markers.filter((m) => m.status === filter)), [markers, filter]);

  function onSelect(id: string, status: string) {
    if (status === 'visited') router.push(`/memories/${id}`);
    else router.push(`/discover/${id}`);
  }

  const chips: Filter[] = ['all', 'visited', 'saved', 'upcoming', 'shared'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 4 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, color: '#111' }}>‹</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
        <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
          Your places & escapes
        </Text>
        <Text style={{ fontFamily: SERIF, fontSize: 32, color: '#111', letterSpacing: -0.5 }}>Explore your world</Text>
      </View>

      {/* Filters */}
      {!loading && markers.length > 0 ? (
        <View style={{ paddingBottom: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {chips.map((f) => {
              const on = filter === f;
              const n = counts[f] ?? 0;
              if (f !== 'all' && n === 0) return null;
              const meta = f === 'all' ? null : STATUS_META[f as WorldStatus];
              return (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: on ? '#111' : 'white',
                    borderWidth: 1,
                    borderColor: on ? '#111' : '#E5E7EB',
                    borderRadius: 100,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}
                >
                  {meta ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: meta.color }} /> : null}
                  <Text style={{ color: on ? 'white' : '#111', fontSize: 12.5, fontWeight: '700' }}>
                    {f === 'all' ? 'All places' : meta!.label} {n}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ConciergeLoader caption="Mapping your travels…" />
        </View>
      ) : markers.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={{ fontSize: 42, marginBottom: 14 }}>🌍</Text>
          <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111', marginBottom: 6, textAlign: 'center' }}>Your map is waiting</Text>
          <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 21 }}>
            Save places and plan trips, and they’ll light up here — everywhere you’ve been and everywhere you’re headed.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, marginHorizontal: 12, marginBottom: 16, borderRadius: 18, overflow: 'hidden', backgroundColor: '#eaf1f6' }}>
          <WorldMap key={filter} markers={visible} onSelect={onSelect} />
        </View>
      )}
    </SafeAreaView>
  );
}
