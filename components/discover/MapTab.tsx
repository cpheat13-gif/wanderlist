import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { locateStops } from '../../lib/ai';
import { SERIF } from '../../lib/editorial';
import { ItineraryActivity, ItineraryDayRow, MapStop } from '../../lib/types';
import { ConciergeLoader } from '../ConciergeLoader';
import { ItineraryMap } from '../trip/ItineraryMap';

const DAY_COLORS = ['#111111', '#B45309', '#0E7490', '#9D174D', '#4D7C0F', '#6D28D9', '#B91C1C', '#0F766E', '#A16207', '#1D4ED8'];
const colorForDay = (n: number) => DAY_COLORS[(n - 1 + DAY_COLORS.length) % DAY_COLORS.length];

type RawStop = { ref: string; title: string; dayNumber: number; lat?: number; lng?: number };

export function MapTab({ tripId, destination, country }: { tripId: string; destination: string; country?: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<ItineraryDayRow[]>([]);
  const [stops, setStops] = useState<MapStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dayFilter, setDayFilter] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase
        .from('itinerary_days')
        .select('*')
        .eq('trip_id', tripId)
        .order('day_number', { ascending: true });
      const dayRows = (data ?? []) as ItineraryDayRow[];
      setRows(dayRows);

      const raw: RawStop[] = [];
      dayRows.forEach((d) =>
        (d.activities ?? []).forEach((a, i) =>
          raw.push({ ref: `${d.day_number}-${i}`, title: a.title, dayNumber: d.day_number, lat: a.lat, lng: a.lng })
        )
      );
      if (raw.length === 0) {
        setStops([]);
        setLoading(false);
        return;
      }

      const coords: Record<string, { lat: number; lng: number }> = {};
      raw.forEach((r) => {
        if (typeof r.lat === 'number' && typeof r.lng === 'number') coords[r.ref] = { lat: r.lat, lng: r.lng };
      });
      const missing = raw.filter((r) => !coords[r.ref]);
      if (missing.length > 0) {
        const res = await locateStops({ destination, country, stops: missing.map((r) => ({ ref: r.ref, title: r.title })) });
        res.located.forEach((l) => {
          if (typeof l.lat === 'number' && typeof l.lng === 'number') coords[l.ref] = { lat: l.lat, lng: l.lng };
        });
        // Persist coords back onto the itinerary so we don't re-locate every visit
        // (best-effort — silently no-ops for non-owners under RLS).
        await persist(dayRows, coords);
      }

      const built: MapStop[] = raw
        .filter((r) => coords[r.ref])
        .map((r) => ({
          ref: r.ref,
          title: r.title,
          dayNumber: r.dayNumber,
          lat: coords[r.ref].lat,
          lng: coords[r.ref].lng,
          color: colorForDay(r.dayNumber),
        }));
      setStops(built);
    } catch {
      setError('Couldn’t place the stops on the map. Please try again.');
    }
    setLoading(false);
  }, [tripId, destination, country]);

  useEffect(() => {
    load();
  }, [load]);

  async function persist(rows: ItineraryDayRow[], coords: Record<string, { lat: number; lng: number }>) {
    for (const d of rows) {
      const acts = d.activities ?? [];
      let changed = false;
      const next: ItineraryActivity[] = acts.map((a, i) => {
        const c = coords[`${d.day_number}-${i}`];
        if (c && (a.lat !== c.lat || a.lng !== c.lng)) {
          changed = true;
          return { ...a, lat: c.lat, lng: c.lng };
        }
        return a;
      });
      if (changed) {
        try {
          await supabase.from('itinerary_days').update({ activities: next }).eq('id', d.id);
        } catch {
          /* non-owner — keep in memory only */
        }
      }
    }
  }

  const days = useMemo(() => Array.from(new Set(stops.map((s) => s.dayNumber))).sort((a, b) => a - b), [stops]);
  const visible = useMemo(() => (dayFilter ? stops.filter((s) => s.dayNumber === dayFilter) : stops), [stops, dayFilter]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDFCFA' }}>
        <ConciergeLoader caption="Mapping your trip…" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDFCFA', paddingHorizontal: 36 }}>
        <Text style={{ fontSize: 38, marginBottom: 12 }}>🗺️</Text>
        <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 18 }}>
          {error}
        </Text>
        <Pressable onPress={load} style={({ pressed }) => ({ backgroundColor: '#111', borderRadius: 100, paddingVertical: 12, paddingHorizontal: 28, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (stops.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDFCFA', paddingHorizontal: 40 }}>
        <Text style={{ fontSize: 40, marginBottom: 14 }}>🧭</Text>
        <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111', marginBottom: 6, textAlign: 'center' }}>Nothing to map yet</Text>
        <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 21 }}>
          Build an itinerary and your days will appear here, pinned on the map.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      {/* Day filter */}
      <View style={{ paddingBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          <FilterChip label="All days" active={dayFilter === null} onPress={() => setDayFilter(null)} />
          {days.map((d) => (
            <FilterChip key={d} label={`Day ${d}`} dot={colorForDay(d)} active={dayFilter === d} onPress={() => setDayFilter(d)} />
          ))}
        </ScrollView>
      </View>

      {/* Map fills the rest; leave room for the floating tab bar */}
      <View style={{ flex: 1, marginHorizontal: 12, marginBottom: 96, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E9EAEC' }}>
        <ItineraryMap key={dayFilter ?? 'all'} stops={visible} onSelectDay={setSelectedDay} />
      </View>

      <DaySheet
        row={rows.find((r) => r.day_number === selectedDay) ?? null}
        color={selectedDay ? colorForDay(selectedDay) : '#111'}
        onClose={() => setSelectedDay(null)}
        onOpen={(id) => {
          setSelectedDay(null);
          router.push(`/day/${id}`);
        }}
      />
    </View>
  );
}

function DaySheet({
  row,
  color,
  onClose,
  onOpen,
}: {
  row: ItineraryDayRow | null;
  color: string;
  onClose: () => void;
  onOpen: (dayId: string) => void;
}) {
  return (
    <Modal visible={!!row} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <SafeAreaView style={{ backgroundColor: '#FDFCFA', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '72%' }}>
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5E0' }} />
          </View>
          {row ? (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{row.day_number}</Text>
                </View>
                <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  Day {row.day_number}
                </Text>
              </View>
              <Text style={{ fontFamily: SERIF, fontSize: 23, color: '#111', marginBottom: row.summary ? 6 : 14 }}>{row.title}</Text>
              {row.summary ? (
                <Text style={{ color: '#6B7280', fontSize: 13.5, lineHeight: 20, marginBottom: 16 }}>{row.summary}</Text>
              ) : null}

              <View style={{ gap: 10 }}>
                {(row.activities ?? []).map((a, i) => (
                  <View key={i} style={{ flexDirection: 'row', backgroundColor: 'white', borderWidth: 1, borderColor: '#F0F0EE', borderRadius: 14, padding: 14 }}>
                    <Text style={{ color: '#C4C0B8', fontSize: 13, marginRight: 10 }}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      {a.timeOfDay ? (
                        <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>
                          {a.timeOfDay}
                        </Text>
                      ) : null}
                      <Text style={{ fontFamily: SERIF, fontSize: 15.5, color: '#111' }}>{a.title}</Text>
                      {a.description ? (
                        <Text style={{ color: '#9CA3AF', fontSize: 12.5, lineHeight: 18, marginTop: 3 }}>{a.description}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => onOpen(row.id)}
                style={({ pressed }) => ({ marginTop: 18, backgroundColor: '#111', borderRadius: 100, paddingVertical: 15, alignItems: 'center', transform: [{ scale: pressed ? 0.98 : 1 }] })}
              >
                <Text style={{ color: 'white', fontSize: 14.5, fontWeight: '700' }}>Open this day ›</Text>
              </Pressable>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function FilterChip({ label, dot, active, onPress }: { label: string; dot?: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: active ? '#111' : 'white',
        borderWidth: 1,
        borderColor: active ? '#111' : '#E5E7EB',
        borderRadius: 100,
        paddingVertical: 8,
        paddingHorizontal: 14,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      {dot ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dot }} /> : null}
      <Text style={{ color: active ? 'white' : '#111', fontSize: 12.5, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
