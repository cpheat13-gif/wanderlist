import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { fetchDestinationPhoto } from '../../lib/unsplash';
import { buildItinerary, refineItinerary, FlightEstimate, ItineraryDay } from '../../lib/ai';
import { SERIF, destinationBySlug, formatPrice } from '../../lib/editorial';
import { colorForCategory } from '../../theme/colors';
import { ItineraryDayRow } from '../../lib/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COVER_H = Math.round(SCREEN_HEIGHT * 0.24);

type Phase = 'days' | 'season' | 'travelers' | 'fork' | 'generating' | 'builder';

const WIZARD_STEPS: Phase[] = ['days', 'season', 'travelers'];
const DAY_CHIPS = [3, 5, 7, 10];
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter', 'Flexible'];
const FALLBACK_DAILY_COST = 150;

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

function recommendedDays(tripLength?: string): number {
  if (!tripLength) return 5;
  const m = tripLength.match(/(\d+)\s*–\s*(\d+)/);
  if (m) {
    const mid = (parseInt(m[1], 10) + parseInt(m[2], 10)) / 2;
    return DAY_CHIPS.reduce((best, c) => (Math.abs(c - mid) < Math.abs(best - mid) ? c : best), DAY_CHIPS[0]);
  }
  const single = tripLength.match(/(\d+)/);
  return single ? parseInt(single[1], 10) : 5;
}

function rowsToDays(rows: ItineraryDayRow[]): ItineraryDay[] {
  return rows
    .slice()
    .sort((a, b) => a.day_number - b.day_number)
    .map((r) => ({
      day: r.day_number,
      title: r.title,
      summary: r.summary,
      estCostPerPersonUsd: r.est_cost ?? 0,
      items: r.activities ?? [],
    }));
}

export default function PlanTripScreen() {
  const params = useLocalSearchParams<{ slug: string; tripId?: string; name?: string; country?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const dest = useMemo(() => destinationBySlug(params.slug ?? ''), [params.slug]);
  const destName = dest?.name ?? params.name ?? 'your destination';
  const destCountry = dest?.country ?? params.country;
  const dailyCost = dest?.estDailyCost ?? FALLBACK_DAILY_COST;

  const [phase, setPhase] = useState<Phase>('days');
  const [cover, setCover] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);

  // Wizard answers
  const [days, setDays] = useState(recommendedDays(dest?.facts.tripLength));
  const [season, setSeason] = useState<string | null>(dest?.facts.season ?? null);
  const [travelers, setTravelers] = useState(2);

  // Builder state
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [flightEstimate, setFlightEstimate] = useState<FlightEstimate | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [refining, setRefining] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const autoSaveRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => {
    setStatusBarStyle('light');
    return () => setStatusBarStyle('dark');
  }, []));

  useEffect(() => {
    const q = dest?.photoQuery ?? `${destName} travel landscape`;
    fetchDestinationPhoto(q).then((p) => {
      if (p) setCover(p.url);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Claim the trip the moment planning starts: reuse a wishlist trip for this
  // destination (or the explicit tripId we were given), else create one — either
  // way it lands in the Planning tab immediately.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function claim() {
      if (params.tripId) {
        await supabase.from('trips').update({ status: 'planning' }).eq('id', params.tripId).eq('status', 'idea');
        if (!cancelled) setTripId(params.tripId);
        return params.tripId;
      }
      const { data: existing } = await supabase
        .from('trips')
        .select('id, status')
        .eq('title', destName)
        .in('status', ['idea', 'planning'])
        .limit(1);
      const found = existing?.[0];
      if (found) {
        if (found.status === 'idea') {
          await supabase.from('trips').update({ status: 'planning' }).eq('id', found.id);
        }
        if (!cancelled) setTripId(found.id);
        return found.id;
      }
      const { data: created } = await supabase
        .from('trips')
        .insert({
          created_by: session!.user.id,
          title: destName,
          destination: destCountry ? `${destName}, ${destCountry}` : destName,
          cover_photo_url: null,
          status: 'planning',
        })
        .select()
        .single();
      if (created && !cancelled) setTripId(created.id);
      return created?.id ?? null;
    }

    claim().then(async (id) => {
      if (!id || cancelled) return;
      // Resume: if this trip already has an itinerary, jump straight to the builder.
      const { data: trip } = await supabase.from('trips').select('*').eq('id', id).single();
      const { data: rows } = await supabase.from('itinerary_days').select('*').eq('trip_id', id);
      if (cancelled) return;
      if (rows && rows.length > 0) {
        setItinerary(rowsToDays(rows as ItineraryDayRow[]));
        if (trip?.travelers) setTravelers(trip.travelers);
        if (trip?.season) setSeason(trip.season);
        setDays(rows.length);
        setSaved(true);
        setPhase('builder');
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Keep the trip cover in sync once we have a photo.
  useEffect(() => {
    if (tripId && cover) {
      supabase.from('trips').update({ cover_photo_url: cover }).eq('id', tripId).is('cover_photo_url', null).then(() => {});
    }
  }, [tripId, cover]);

  const estTotal =
    itinerary.length > 0
      ? itinerary.reduce((sum, d) => sum + (d.estCostPerPersonUsd || 0), 0)
      : dailyCost * days;

  const stepIndex = WIZARD_STEPS.indexOf(phase);
  const inWizard = stepIndex >= 0;

  function handleBack() {
    if (inWizard && stepIndex > 0) {
      setPhase(WIZARD_STEPS[stepIndex - 1]);
      return;
    }
    if (phase === 'fork') {
      setPhase('travelers');
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  async function generate(interests?: string) {
    setPhase('generating');
    setGenError(null);
    try {
      const res = await buildItinerary({
        destination: destName,
        country: destCountry,
        days,
        season: season ?? undefined,
        travelers,
        interests,
      });
      setItinerary(res.days);
      setFlightEstimate(res.flightEstimate);
      setSaved(false);
      setPhase('builder');
      if (autoSaveRef.current) {
        await persist(res.days);
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Something went wrong building the itinerary.');
      setPhase('fork');
    }
  }

  async function persist(daysToSave: ItineraryDay[]) {
    if (!tripId) return;
    setSaving(true);
    try {
      const total = daysToSave.reduce((sum, d) => sum + (d.estCostPerPersonUsd || 0), 0);
      await supabase.from('itinerary_days').delete().eq('trip_id', tripId);
      await supabase.from('itinerary_days').insert(
        daysToSave.map((d) => ({
          trip_id: tripId,
          day_number: d.day,
          title: d.title,
          summary: d.summary,
          activities: d.items,
          est_cost: d.estCostPerPersonUsd || null,
        }))
      );
      await supabase
        .from('trips')
        .update({ travelers, season, est_cost_per_person: total, status: 'planning' })
        .eq('id', tripId);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function sendRefinement(message: string) {
    if (!message.trim() || refining || itinerary.length === 0) return;
    const userMsg: ChatMessage = { role: 'user', text: message.trim() };
    setChat((prev) => [...prev, userMsg]);
    setChatInput('');
    setRefining(true);
    try {
      const res = await refineItinerary({
        destination: destName,
        country: destCountry,
        days,
        season: season ?? undefined,
        travelers,
        itinerary,
        message: userMsg.text,
        history: chat.slice(-6),
      });
      setItinerary(res.days);
      setSaved(false);
      setChat((prev) => [...prev, { role: 'assistant', text: res.reply }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
    } catch (err) {
      setChat((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: err instanceof Error ? err.message : 'I could not reach the concierge just now — try again in a moment.',
        },
      ]);
    } finally {
      setRefining(false);
    }
  }

  const seasonOptions = useMemo(() => {
    const opts: { label: string; recommended: boolean }[] = [];
    if (dest?.facts.season) opts.push({ label: dest.facts.season, recommended: true });
    SEASONS.forEach((s) => opts.push({ label: s, recommended: false }));
    return opts;
  }, [dest]);

  /* ────────────────────────── UI pieces ────────────────────────── */

  const Header = (
    <View style={{ height: COVER_H, backgroundColor: '#17171E' }}>
      {cover ? (
        <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
      ) : null}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.72)']}
        locations={[0, 0.5, 1]}
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
      <View style={{ position: 'absolute', left: 22, right: 22, bottom: 16 }}>
        <Text
          style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            marginBottom: 5,
          }}
        >
          Planning your journey
        </Text>
        <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 27, letterSpacing: -0.5 }}>
          {destName}
        </Text>
      </View>
    </View>
  );

  function DayCard({ day, index }: { day: ItineraryDay; index: number }) {
    const last = index === itinerary.length - 1;
    return (
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 40, alignItems: 'center' }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: '#111',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: 'white', fontFamily: SERIF, fontSize: 13 }}>{day.day}</Text>
          </View>
          {!last ? <View style={{ width: 1.5, flex: 1, backgroundColor: '#E5E5E0', marginVertical: 4 }} /> : null}
        </View>
        <View
          style={{
            flex: 1,
            marginLeft: 12,
            marginBottom: last ? 0 : 18,
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: '#F0F0EE',
            borderRadius: 16,
            padding: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text
              style={{
                flex: 1,
                color: '#9CA3AF',
                fontSize: 9,
                fontWeight: '700',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              Day {day.day}
            </Text>
            {day.estCostPerPersonUsd ? (
              <View style={{ backgroundColor: '#F5F5F2', borderRadius: 100, paddingHorizontal: 9, paddingVertical: 3 }}>
                <Text style={{ color: '#3F3F46', fontSize: 10.5, fontWeight: '700' }}>
                  ~{formatPrice(day.estCostPerPersonUsd)} pp
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 17, marginBottom: 4 }}>{day.title}</Text>
          <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#6B7280', fontSize: 12.5, lineHeight: 18, marginBottom: 10 }}>
            {day.summary}
          </Text>
          {day.items.map((item, i) => (
            <View key={`${item.title}-${i}`} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colorForCategory(item.category),
                  marginTop: 5,
                  marginRight: 10,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#111', fontSize: 13.5, fontWeight: '600' }}>{item.title}</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 12, lineHeight: 17, marginTop: 1 }}>{item.description}</Text>
              </View>
            </View>
          ))}
          {/* Quick actions */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {[
              { label: '↻ Swap day', msg: `Day ${day.day}: swap this day for something different.` },
              { label: 'More relaxed', msg: `Day ${day.day}: make this day more relaxed and slower-paced.` },
              { label: 'More food', msg: `Day ${day.day}: add more memorable food experiences.` },
            ].map((qa) => (
              <Pressable
                key={qa.label}
                onPress={() => sendRefinement(qa.msg)}
                disabled={refining}
                style={({ pressed }) => ({
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 100,
                  paddingHorizontal: 11,
                  paddingVertical: 5,
                  opacity: refining ? 0.4 : 1,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                })}
              >
                <Text style={{ color: '#6B7280', fontSize: 11.5, fontWeight: '600' }}>{qa.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  }

  /* ────────────────────────── Render ────────────────────────── */

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FDFCFA' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: phase === 'builder' ? 210 : 130 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {Header}

        {inWizard ? (
          <View style={{ paddingHorizontal: 24, paddingTop: 22 }}>
            {/* Progress */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              {WIZARD_STEPS.map((s, i) => (
                <View
                  key={s}
                  style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= stepIndex ? '#111' : '#E5E5E0' }}
                />
              ))}
            </View>
            <Text style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 22 }}>
              Question {stepIndex + 1} of {WIZARD_STEPS.length}
            </Text>

            {phase === 'days' ? (
              <View>
                <Text style={{ fontFamily: SERIF, fontSize: 25, color: '#111', marginBottom: 6 }}>
                  How many days?
                </Text>
                {dest ? (
                  <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#6B7280', fontSize: 13.5, marginBottom: 22 }}>
                    Most travelers give {destName} {dest.facts.tripLength}.
                  </Text>
                ) : (
                  <View style={{ marginBottom: 22 }} />
                )}
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                  {DAY_CHIPS.map((c) => {
                    const active = days === c;
                    const recommended = c === recommendedDays(dest?.facts.tripLength);
                    return (
                      <Pressable
                        key={c}
                        onPress={() => setDays(c)}
                        style={({ pressed }) => ({
                          minWidth: 72,
                          alignItems: 'center',
                          backgroundColor: active ? '#111' : 'white',
                          borderWidth: 1,
                          borderColor: active ? '#111' : '#E5E7EB',
                          borderRadius: 16,
                          paddingVertical: 14,
                          paddingHorizontal: 14,
                          transform: [{ scale: pressed ? 0.95 : 1 }],
                        })}
                      >
                        <Text style={{ fontFamily: SERIF, fontSize: 19, color: active ? 'white' : '#111' }}>{c}</Text>
                        <Text style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.65)' : '#9CA3AF', marginTop: 2 }}>
                          {recommended ? 'recommended' : 'days'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {/* Custom stepper */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Text style={{ color: '#6B7280', fontSize: 13 }}>Or exactly:</Text>
                  <Pressable
                    onPress={() => setDays((d) => Math.max(2, d - 1))}
                    style={({ pressed }) => ({
                      width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#D1D5DB',
                      alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.9 : 1 }],
                    })}
                  >
                    <Text style={{ fontSize: 17, color: '#111' }}>−</Text>
                  </Pressable>
                  <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111', minWidth: 26, textAlign: 'center' }}>
                    {days}
                  </Text>
                  <Pressable
                    onPress={() => setDays((d) => Math.min(21, d + 1))}
                    style={({ pressed }) => ({
                      width: 34, height: 34, borderRadius: 17, backgroundColor: '#111',
                      alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.9 : 1 }],
                    })}
                  >
                    <Text style={{ fontSize: 17, color: 'white' }}>+</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {phase === 'season' ? (
              <View>
                <Text style={{ fontFamily: SERIF, fontSize: 25, color: '#111', marginBottom: 6 }}>
                  When are you thinking?
                </Text>
                {dest ? (
                  <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#6B7280', fontSize: 13.5, marginBottom: 22 }}>
                    {destName} is at its best {dest.facts.season}.
                  </Text>
                ) : (
                  <View style={{ marginBottom: 22 }} />
                )}
                <View style={{ gap: 10 }}>
                  {seasonOptions.map((opt) => {
                    const active = season === opt.label;
                    return (
                      <Pressable
                        key={opt.label}
                        onPress={() => setSeason(opt.label)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: active ? '#111' : 'white',
                          borderWidth: 1,
                          borderColor: active ? '#111' : '#F0F0EE',
                          borderRadius: 16,
                          paddingHorizontal: 18,
                          paddingVertical: 15,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        })}
                      >
                        <Text style={{ flex: 1, fontFamily: SERIF, fontSize: 16, color: active ? 'white' : '#111' }}>
                          {opt.label}
                        </Text>
                        {opt.recommended ? (
                          <View
                            style={{
                              backgroundColor: active ? 'rgba(255,255,255,0.18)' : '#F5F5F2',
                              borderRadius: 100,
                              paddingHorizontal: 9,
                              paddingVertical: 4,
                            }}
                          >
                            <Text
                              style={{
                                color: active ? 'white' : '#6B7280',
                                fontSize: 9,
                                fontWeight: '700',
                                letterSpacing: 1,
                                textTransform: 'uppercase',
                              }}
                            >
                              Best season
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {phase === 'travelers' ? (
              <View>
                <Text style={{ fontFamily: SERIF, fontSize: 25, color: '#111', marginBottom: 6 }}>
                  Who's coming?
                </Text>
                <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#6B7280', fontSize: 13.5, marginBottom: 26 }}>
                  We'll keep a per-person estimate as we plan.
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'white',
                    borderWidth: 1,
                    borderColor: '#F0F0EE',
                    borderRadius: 18,
                    padding: 20,
                  }}
                >
                  <View>
                    <Text style={{ fontFamily: SERIF, fontSize: 17, color: '#111' }}>Travelers</Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>Friends, family, or just you</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                    <Pressable
                      onPress={() => setTravelers((t) => Math.max(1, t - 1))}
                      style={({ pressed }) => ({
                        width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB',
                        alignItems: 'center', justifyContent: 'center',
                        opacity: travelers <= 1 ? 0.35 : 1, transform: [{ scale: pressed ? 0.9 : 1 }],
                      })}
                    >
                      <Text style={{ fontSize: 20, color: '#111', lineHeight: 24 }}>−</Text>
                    </Pressable>
                    <Text style={{ fontFamily: SERIF, fontSize: 26, color: '#111', minWidth: 30, textAlign: 'center' }}>
                      {travelers}
                    </Text>
                    <Pressable
                      onPress={() => setTravelers((t) => Math.min(12, t + 1))}
                      style={({ pressed }) => ({
                        width: 40, height: 40, borderRadius: 20, backgroundColor: '#111',
                        alignItems: 'center', justifyContent: 'center',
                        opacity: travelers >= 12 ? 0.35 : 1, transform: [{ scale: pressed ? 0.9 : 1 }],
                      })}
                    >
                      <Text style={{ fontSize: 20, color: 'white', lineHeight: 24 }}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {phase === 'fork' ? (
          <View style={{ paddingHorizontal: 24, paddingTop: 26 }}>
            <Text style={{ fontFamily: SERIF, fontSize: 25, color: '#111', marginBottom: 6 }}>
              How shall we plan it?
            </Text>
            <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#6B7280', fontSize: 13.5, marginBottom: 22 }}>
              {days} days · {season ?? 'Flexible'} · {travelers} {travelers === 1 ? 'traveler' : 'travelers'}
            </Text>

            {genError ? (
              <View
                style={{
                  backgroundColor: '#FEF2F2',
                  borderWidth: 1,
                  borderColor: '#FECACA',
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: '#B91C1C', fontSize: 13, lineHeight: 19 }}>{genError}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => {
                autoSaveRef.current = true;
                generate();
              }}
              style={({ pressed }) => ({
                backgroundColor: '#111',
                borderRadius: 20,
                padding: 22,
                marginBottom: 12,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text style={{ fontSize: 22, marginBottom: 8 }}>✦</Text>
              <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 19, marginBottom: 5 }}>
                Schedule the recommended trip
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 19 }}>
                We draft the whole journey — the classics done the insider way — and save it straight to your Planning tab. You can still refine it after.
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                autoSaveRef.current = false;
                generate();
              }}
              style={({ pressed }) => ({
                backgroundColor: 'white',
                borderWidth: 1.5,
                borderColor: '#111',
                borderRadius: 20,
                padding: 22,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text style={{ fontSize: 22, marginBottom: 8 }}>✎</Text>
              <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 19, marginBottom: 5 }}>
                Build it together
              </Text>
              <Text style={{ color: '#6B7280', fontSize: 13, lineHeight: 19 }}>
                We start with a draft, then shape it day by day — tell us what you love, ask questions, and we'll recommend the best of {destName}.
              </Text>
            </Pressable>
          </View>
        ) : null}

        {phase === 'generating' ? (
          <View style={{ alignItems: 'center', paddingTop: 70, paddingHorizontal: 40 }}>
            <ActivityIndicator color="#111" size="large" />
            <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111', marginTop: 24, textAlign: 'center' }}>
              Drafting your {days} days in {destName}…
            </Text>
            <Text
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                color: '#9CA3AF',
                fontSize: 13.5,
                marginTop: 8,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              Weighing seasons, distances, and the places worth your mornings.
            </Text>
          </View>
        ) : null}

        {phase === 'builder' ? (
          <View style={{ paddingHorizontal: 24, paddingTop: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ flex: 1, fontFamily: SERIF, fontSize: 22, color: '#111' }}>
                Your {itinerary.length} days
              </Text>
              {saved ? (
                <View style={{ backgroundColor: '#F0FDF4', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#BBF7D0' }}>
                  <Text style={{ color: '#059669', fontSize: 10.5, fontWeight: '700' }}>Saved to Planning</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#6B7280', fontSize: 13, marginBottom: 20 }}>
              {season ?? 'Flexible'} · {travelers} {travelers === 1 ? 'traveler' : 'travelers'} · refine anything below
            </Text>

            {itinerary.map((day, i) => (
              <DayCard key={day.day} day={day} index={i} />
            ))}

            {flightEstimate ? (
              <Text
                style={{
                  fontFamily: SERIF,
                  fontStyle: 'italic',
                  color: '#9CA3AF',
                  fontSize: 12.5,
                  lineHeight: 18,
                  marginTop: 18,
                }}
              >
                ✈ Flights {flightEstimate.fromCity} → {flightEstimate.toCity}: roughly{' '}
                {formatPrice(flightEstimate.estimatedRoundTripUsd)} round trip, not included in the daily estimate.{' '}
                {flightEstimate.note}
              </Text>
            ) : null}

            {/* Chat thread */}
            {chat.length > 0 ? (
              <View style={{ marginTop: 26, gap: 10 }}>
                <View style={{ width: 28, height: 2, backgroundColor: '#111' }} />
                <Text style={{ fontFamily: SERIF, fontSize: 19, color: '#111', marginBottom: 4 }}>
                  The conversation
                </Text>
                {chat.map((m, i) => (
                  <View
                    key={i}
                    style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '86%',
                      backgroundColor: m.role === 'user' ? '#111' : 'white',
                      borderWidth: m.role === 'user' ? 0 : 1,
                      borderColor: '#F0F0EE',
                      borderRadius: 16,
                      borderBottomRightRadius: m.role === 'user' ? 4 : 16,
                      borderBottomLeftRadius: m.role === 'user' ? 16 : 4,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: m.role === 'user' ? 'white' : '#3F3F46',
                        fontSize: 13.5,
                        lineHeight: 20,
                        fontFamily: m.role === 'assistant' ? SERIF : undefined,
                      }}
                    >
                      {m.text}
                    </Text>
                  </View>
                ))}
                {refining ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator color="#9CA3AF" size="small" />
                    <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 13 }}>
                      Reworking the plan…
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : refining ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 }}>
                <ActivityIndicator color="#9CA3AF" size="small" />
                <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 13 }}>
                  Reworking the plan…
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* ── Persistent estimate bar + actions ── */}
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
        {phase === 'builder' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
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
              placeholder="Ask or wish for anything…"
              placeholderTextColor="#B6BAC2"
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={() => sendRefinement(chatInput)}
              editable={!refining}
              returnKeyType="send"
            />
            <Pressable
              onPress={() => sendRefinement(chatInput)}
              disabled={refining || !chatInput.trim()}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#111',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: refining || !chatInput.trim() ? 0.35 : 1,
                transform: [{ scale: pressed ? 0.9 : 1 }],
              })}
            >
              <Text style={{ color: 'white', fontSize: 16 }}>↑</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View>
            <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
              {itinerary.length > 0 ? 'Est. trip cost' : 'Rough estimate'}
            </Text>
            <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 20 }}>
              {formatPrice(Math.round(estTotal))}
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}> / person</Text>
            </Text>
          </View>

          {inWizard ? (
            <Pressable
              onPress={() => setPhase(stepIndex < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[stepIndex + 1] : 'fork')}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: '#111',
                borderRadius: 100,
                paddingVertical: 16,
                alignItems: 'center',
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>
                {stepIndex < WIZARD_STEPS.length - 1 ? 'Continue' : 'Choose how to plan'}
              </Text>
            </Pressable>
          ) : null}

          {phase === 'fork' || phase === 'generating' ? (
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 12.5 }}>
                {days} days · {travelers} {travelers === 1 ? 'traveler' : 'travelers'}
              </Text>
            </View>
          ) : null}

          {phase === 'builder' ? (
            <Pressable
              onPress={() => (saved ? router.replace('/(tabs)') : persist(itinerary))}
              disabled={saving}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: saved ? 'white' : '#111',
                borderWidth: saved ? 1.5 : 0,
                borderColor: '#111',
                borderRadius: 100,
                paddingVertical: 15,
                alignItems: 'center',
                opacity: saving ? 0.6 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              {saving ? (
                <ActivityIndicator color={saved ? '#111' : 'white'} />
              ) : (
                <Text style={{ color: saved ? '#111' : 'white', fontSize: 14.5, fontWeight: '700' }}>
                  {saved ? 'View in Planning' : 'Save itinerary'}
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
