import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Dimensions, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { fetchDestinationPhoto } from '../../lib/unsplash';
import { enrichDay, slotStop, swapActivity } from '../../lib/ai';
import { insertActivityByTime } from '../../lib/itinerary';
import { SERIF, formatPrice } from '../../lib/editorial';
import { colorForCategory } from '../../theme/colors';
import { ConciergeLoader } from '../../components/ConciergeLoader';
import { ItineraryActivity, ItineraryDayRow, Place, Trip } from '../../lib/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_H = Math.round(SCREEN_HEIGHT * 0.34);

const CATEGORY_LABEL: Record<string, string> = {
  hotel: 'Stay',
  restaurant: 'Food',
  activity: 'Activity',
  sightseeing: 'Sight',
};

function parseDestination(destination: string | null): { name: string; country?: string } {
  if (!destination) return { name: 'this trip' };
  const [name, ...rest] = destination.split(',').map((s) => s.trim());
  return { name, country: rest.length > 0 ? rest.join(', ') : undefined };
}

export default function DayDetailScreen() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [row, setRow] = useState<ItineraryDayRow | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [heroPhoto, setHeroPhoto] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  // Per-activity swap
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapOptions, setSwapOptions] = useState<ItineraryActivity[]>([]);
  const [swapPhotos, setSwapPhotos] = useState<Record<number, string>>({});
  const [swapError, setSwapError] = useState<string | null>(null);
  // Add a stop
  const [addOpen, setAddOpen] = useState(false);
  const [addInput, setAddInput] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [tripPlaces, setTripPlaces] = useState<Place[]>([]);

  useFocusEffect(useCallback(() => {
    setStatusBarStyle('light');
    return () => setStatusBarStyle('dark');
  }, []));

  useEffect(() => {
    if (!dayId) return;
    supabase
      .from('itinerary_days')
      .select('*')
      .eq('id', dayId)
      .single()
      .then(({ data }) => {
        const r = (data ?? null) as ItineraryDayRow | null;
        setRow(r);
        if (r) {
          supabase
            .from('trips')
            .select('*')
            .eq('id', r.trip_id)
            .single()
            .then(({ data: t }) => setTrip((t ?? null) as Trip | null));
          supabase
            .from('places')
            .select('*')
            .eq('trip_id', r.trip_id)
            .order('created_at', { ascending: true })
            .then(({ data: p }) => setTripPlaces((p ?? []) as Place[]));
        }
      });
  }, [dayId]);

  const destName = useMemo(() => parseDestination(trip?.destination ?? trip?.title ?? null).name, [trip]);
  const country = useMemo(() => parseDestination(trip?.destination ?? null).country, [trip]);
  const activities: ItineraryActivity[] = row?.activities ?? [];
  const isEnriched = activities.some((a) => a.tip || a.timeOfDay);

  // Hero + per-activity photos
  useEffect(() => {
    if (!row || !trip) return;
    fetchDestinationPhoto(`${destName} ${row.title}`).then((p) => {
      if (p) setHeroPhoto(p.url);
    });
    activities.forEach((a, i) => {
      fetchDestinationPhoto(`${a.title} ${destName}`).then((p) => {
        if (p) setPhotos((prev) => (prev[i] ? prev : { ...prev, [i]: p.url }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, trip]);

  async function handleEnrich() {
    if (!row || enriching || activities.length === 0) return;
    setEnriching(true);
    setEnrichError(null);
    try {
      const res = await enrichDay({
        destination: destName,
        country,
        title: row.title,
        summary: row.summary,
        activities: activities.map((a) => ({ title: a.title, category: a.category, description: a.description })),
      });
      const enriched = res.activities as ItineraryActivity[];
      // Persist onto the itinerary_days row (jsonb — no schema change needed).
      await supabase.from('itinerary_days').update({ activities: enriched }).eq('id', row.id);
      setRow({ ...row, activities: enriched });
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : 'Could not deepen this day. Please try again.');
    } finally {
      setEnriching(false);
    }
  }

  async function openSwap(i: number) {
    if (!row) return;
    setSwapIndex(i);
    setSwapOptions([]);
    setSwapPhotos({});
    setSwapError(null);
    setSwapLoading(true);
    const target = activities[i];
    try {
      const res = await swapActivity({
        destination: destName,
        country,
        dayTitle: row.title,
        daySummary: row.summary,
        replace: { title: target.title, category: target.category, timeOfDay: target.timeOfDay },
        others: activities
          .filter((_, j) => j !== i)
          .map((a) => ({ title: a.title, timeOfDay: a.timeOfDay })),
      });
      const opts = res.alternatives as ItineraryActivity[];
      setSwapOptions(opts);
      opts.forEach((o, oi) => {
        fetchDestinationPhoto(`${o.title} ${destName}`).then((p) => {
          if (p) setSwapPhotos((prev) => ({ ...prev, [oi]: p.url }));
        });
      });
    } catch (err) {
      setSwapError(err instanceof Error ? err.message : 'Could not find alternatives. Please try again.');
    } finally {
      setSwapLoading(false);
    }
  }

  async function chooseAlternative(opt: ItineraryActivity, optIndex: number) {
    if (!row || swapIndex === null) return;
    const original = activities[swapIndex];
    // Keep the slot: preserve the original time of day if the alternative omits it.
    const replacement: ItineraryActivity = {
      title: opt.title,
      category: opt.category,
      description: opt.description,
      timeOfDay: opt.timeOfDay ?? original.timeOfDay,
      tip: opt.tip,
    };
    const next = activities.map((a, j) => (j === swapIndex ? replacement : a));
    // Show the chosen photo immediately.
    if (swapPhotos[optIndex]) setPhotos((prev) => ({ ...prev, [swapIndex]: swapPhotos[optIndex] }));
    setRow({ ...row, activities: next });
    setSwapIndex(null);
    setSwapOptions([]);
    await supabase.from('itinerary_days').update({ activities: next }).eq('id', row.id);
  }

  async function addStop(place: { name: string; category?: Place['category']; notes?: string }) {
    if (!row || addLoading || !place.name.trim()) return;
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await slotStop({
        destination: destName,
        country,
        dayTitle: row.title,
        daySummary: row.summary,
        existing: activities.map((a) => ({ title: a.title, timeOfDay: a.timeOfDay })),
        place: { name: place.name.trim(), category: place.category, notes: place.notes ?? undefined },
      });
      const next = insertActivityByTime(activities, res.activity as ItineraryActivity);
      // Indices shift on insert — refetch photos cleanly.
      setPhotos({});
      setRow({ ...row, activities: next });
      await supabase.from('itinerary_days').update({ activities: next }).eq('id', row.id);
      setAddInput('');
      setAddOpen(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Could not add that stop. Please try again.');
    } finally {
      setAddLoading(false);
    }
  }

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  if (!row) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FDFCFA', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#111" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ height: HERO_H, backgroundColor: '#17171E' }}>
          {heroPhoto ? (
            <Image source={{ uri: heroPhoto }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
          ) : null}
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.7)']}
            locations={[0, 0.45, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => ({
              position: 'absolute',
              top: insets.top + 10,
              left: 18,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.92)',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.9 : 1 }],
            })}
          >
            <Text style={{ fontSize: 20, color: '#111', lineHeight: 24 }}>‹</Text>
          </Pressable>
          <View style={{ position: 'absolute', left: 22, right: 22, bottom: 18 }}>
            <Text
              style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 2.5,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              Day {row.day_number} · {trip?.title ?? ''}
            </Text>
            <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 28, letterSpacing: -0.4 }}>
              {row.title}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 22 }}>
          {row.summary ? (
            <Text style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: '#6B7280', lineHeight: 23, marginBottom: 14 }}>
              {row.summary}
            </Text>
          ) : null}
          {row.est_cost ? (
            <Text style={{ color: '#111', fontSize: 13, fontWeight: '700', marginBottom: 20 }}>
              est. {formatPrice(row.est_cost)} <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>/ person</Text>
            </Text>
          ) : null}

          {/* Gameplan */}
          <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
          <Text style={{ fontFamily: SERIF, fontSize: 22, color: '#111', marginBottom: 4 }}>The gameplan</Text>
          <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 13.5, marginBottom: 20 }}>
            {isEnriched ? 'Hour by hour, with the concierge’s tips.' : 'Your day, stop by stop.'}
          </Text>

          {enriching ? (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <ConciergeLoader caption="Going deeper on your day…" size={60} />
            </View>
          ) : (
            activities.map((a, i) => (
              <View key={`${a.title}-${i}`} style={{ marginBottom: 20 }}>
                <View
                  style={{
                    height: 170,
                    borderRadius: 18,
                    overflow: 'hidden',
                    backgroundColor: '#E9EAEC',
                    marginBottom: 12,
                  }}
                >
                  {photos[i] ? (
                    <Image source={{ uri: photos[i] }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator color="#9CA3AF" size="small" />
                    </View>
                  )}
                  {/* time-of-day badge */}
                  {a.timeOfDay ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        backgroundColor: 'rgba(23,23,30,0.9)',
                        borderRadius: 100,
                        paddingHorizontal: 11,
                        paddingVertical: 5,
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 9.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
                        {a.timeOfDay}
                      </Text>
                    </View>
                  ) : null}
                  {/* Swap this stop */}
                  <Pressable
                    onPress={() => openSwap(i)}
                    style={({ pressed }) => ({
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: 'rgba(255,255,255,0.94)',
                      borderRadius: 100,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      transform: [{ scale: pressed ? 0.94 : 1 }],
                    })}
                  >
                    <Text style={{ fontSize: 12, color: '#111' }}>⇄</Text>
                    <Text style={{ fontSize: 11.5, color: '#111', fontWeight: '700' }}>Swap</Text>
                  </Pressable>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colorForCategory(a.category) }} />
                  <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
                    {CATEGORY_LABEL[a.category] ?? a.category}
                  </Text>
                </View>
                <Text style={{ fontFamily: SERIF, fontSize: 18, color: '#111', marginBottom: 5 }}>{a.title}</Text>
                <Text style={{ fontFamily: SERIF, color: '#3F3F46', fontSize: 14, lineHeight: 22 }}>{a.description}</Text>

                {a.tip ? (
                  <View
                    style={{
                      marginTop: 10,
                      backgroundColor: 'white',
                      borderWidth: 1,
                      borderColor: '#F0F0EE',
                      borderRadius: 14,
                      padding: 12,
                      flexDirection: 'row',
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>✳</Text>
                    <Text style={{ flex: 1, color: '#3F3F46', fontSize: 12.5, lineHeight: 18 }}>{a.tip}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}

          {enrichError ? (
            <Text style={{ color: '#B91C1C', fontSize: 12.5, lineHeight: 18, marginBottom: 12 }}>{enrichError}</Text>
          ) : null}

          {/* Go deeper */}
          {!enriching && activities.length > 0 ? (
            <Pressable
              onPress={handleEnrich}
              style={({ pressed }) => ({
                marginTop: 6,
                backgroundColor: isEnriched ? 'white' : '#111',
                borderWidth: isEnriched ? 1.5 : 0,
                borderColor: '#111',
                borderRadius: 100,
                paddingVertical: 15,
                alignItems: 'center',
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ color: isEnriched ? '#111' : 'white', fontSize: 14.5, fontWeight: '700' }}>
                {isEnriched ? '↻ Re-do the deep plan' : '✦ Go deeper with the concierge'}
              </Text>
            </Pressable>
          ) : null}

          {!enriching ? (
            <Pressable
              onPress={() => {
                setAddError(null);
                setAddOpen(true);
              }}
              style={({ pressed }) => ({
                marginTop: 10,
                borderWidth: 1.5,
                borderColor: '#111',
                borderRadius: 100,
                paddingVertical: 15,
                alignItems: 'center',
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ color: '#111', fontSize: 14.5, fontWeight: '700' }}>＋ Add a stop to this day</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {/* ── Swap chooser ── */}
      <Modal
        visible={swapIndex !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSwapIndex(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(17,17,22,0.35)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setSwapIndex(null)} />
          <View
            style={{
              backgroundColor: '#FDFCFA',
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              maxHeight: HERO_H * 2.1,
              paddingTop: 10,
            }}
          >
            <View style={{ alignItems: 'center', paddingBottom: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5E0' }} />
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                paddingHorizontal: 22,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#F0F0EE',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111' }}>Swap this stop</Text>
                <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 12.5 }}>
                  {swapIndex !== null && activities[swapIndex]
                    ? `Alternatives for ${activities[swapIndex].title} — the rest of the day stays put.`
                    : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => setSwapIndex(null)}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 12,
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                })}
              >
                <Text style={{ color: '#111', fontSize: 15 }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 12 }}>
              {swapLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 26 }}>
                  <ConciergeLoader caption="Finding alternatives…" size={54} />
                </View>
              ) : null}

              {swapError ? (
                <Text style={{ color: '#B91C1C', fontSize: 13, lineHeight: 19 }}>{swapError}</Text>
              ) : null}

              {swapOptions.map((opt, oi) => (
                <Pressable
                  key={`${opt.title}-${oi}`}
                  onPress={() => chooseAlternative(opt, oi)}
                  style={({ pressed }) => ({
                    backgroundColor: 'white',
                    borderWidth: 1,
                    borderColor: '#F0F0EE',
                    borderRadius: 18,
                    overflow: 'hidden',
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <View style={{ height: 130, backgroundColor: '#E9EAEC' }}>
                    {swapPhotos[oi] ? (
                      <Image source={{ uri: swapPhotos[oi] }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color="#9CA3AF" size="small" />
                      </View>
                    )}
                  </View>
                  <View style={{ padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colorForCategory(opt.category) }} />
                      <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
                        {CATEGORY_LABEL[opt.category] ?? opt.category}
                        {opt.timeOfDay ? ` · ${opt.timeOfDay}` : ''}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: SERIF, fontSize: 17, color: '#111', marginBottom: 4 }}>{opt.title}</Text>
                    <Text style={{ fontFamily: SERIF, color: '#3F3F46', fontSize: 13.5, lineHeight: 20 }}>{opt.description}</Text>
                    <View
                      style={{
                        marginTop: 12,
                        alignSelf: 'flex-start',
                        backgroundColor: '#111',
                        borderRadius: 100,
                        paddingHorizontal: 16,
                        paddingVertical: 9,
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>Use this instead</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Add a stop ── */}
      <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(17,17,22,0.35)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setAddOpen(false)} />
          <View
            style={{
              backgroundColor: '#FDFCFA',
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              maxHeight: HERO_H * 2.2,
              paddingTop: 10,
            }}
          >
            <View style={{ alignItems: 'center', paddingBottom: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5E0' }} />
            </View>
            <View style={{ paddingHorizontal: 22, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0EE' }}>
              <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111' }}>Add a stop</Text>
              <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 12.5 }}>
                The concierge slots it into the right part of the day.
              </Text>
            </View>

            {addLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 34 }}>
                <ConciergeLoader caption="Slotting it in…" size={54} />
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}>
                {/* Free text */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: 'white',
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 100,
                      paddingHorizontal: 18,
                      paddingVertical: 12,
                      color: '#111',
                      fontSize: 13.5,
                    }}
                    placeholder="A place or idea — e.g. rooftop sunset bar"
                    placeholderTextColor="#B6BAC2"
                    value={addInput}
                    onChangeText={setAddInput}
                    onSubmitEditing={() => addStop({ name: addInput })}
                    returnKeyType="done"
                  />
                  <Pressable
                    onPress={() => addStop({ name: addInput })}
                    disabled={!addInput.trim()}
                    style={({ pressed }) => ({
                      backgroundColor: '#111',
                      borderRadius: 100,
                      paddingHorizontal: 18,
                      paddingVertical: 12,
                      opacity: addInput.trim() ? 1 : 0.35,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    })}
                  >
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>Add</Text>
                  </Pressable>
                </View>

                {addError ? (
                  <Text style={{ color: '#B91C1C', fontSize: 12.5, lineHeight: 18, marginBottom: 8 }}>{addError}</Text>
                ) : null}

                {/* From Explore-added places */}
                {tripPlaces.length > 0 ? (
                  <View style={{ marginTop: 14 }}>
                    <Text
                      style={{
                        color: '#9CA3AF',
                        fontSize: 10,
                        fontWeight: '700',
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        marginBottom: 10,
                      }}
                    >
                      From your Explore finds
                    </Text>
                    {tripPlaces.map((p) => (
                      <Pressable
                        key={p.id}
                        onPress={() => addStop({ name: p.name, category: p.category, notes: p.notes ?? undefined })}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: 'white',
                          borderWidth: 1,
                          borderColor: '#F0F0EE',
                          borderRadius: 14,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          marginBottom: 8,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        })}
                      >
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: colorForCategory(p.category),
                            marginRight: 12,
                          }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#111', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                            {p.name}
                          </Text>
                          {p.notes ? (
                            <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                              {p.notes}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={{ color: '#111', fontSize: 12.5, fontWeight: '700' }}>Add →</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 13, marginTop: 14, lineHeight: 20 }}>
                    Tip: add places from the Explore tab and they'll show up here to drop into any day.
                  </Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
