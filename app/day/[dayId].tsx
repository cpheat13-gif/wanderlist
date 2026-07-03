import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { fetchDestinationPhoto } from '../../lib/unsplash';
import { enrichDay } from '../../lib/ai';
import { SERIF, formatPrice } from '../../lib/editorial';
import { colorForCategory } from '../../theme/colors';
import { ConciergeLoader } from '../../components/ConciergeLoader';
import { ItineraryActivity, ItineraryDayRow, Trip } from '../../lib/types';

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
        </View>
      </ScrollView>
    </View>
  );
}
