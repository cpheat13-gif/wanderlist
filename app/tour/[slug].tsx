import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { fetchDestinationPhoto } from '../../lib/unsplash';
import { SERIF, destinationBySlug, formatPrice, tourBySlug } from '../../lib/editorial';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COVER_H = Math.round(SCREEN_HEIGHT * 0.32);

type Step = 'itinerary' | 'dates' | 'travelers' | 'addons' | 'review' | 'done';

const BOOKING_STEPS: Step[] = ['dates', 'travelers', 'addons', 'review'];

function nextDepartures(count = 6): Date[] {
  const now = new Date();
  const out: Date[] = [];
  for (let i = 1; i <= count; i++) {
    out.push(new Date(now.getFullYear(), now.getMonth() + i, 12));
  }
  return out;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function makeRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `WL-${s}`;
}

export default function TourScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const tour = useMemo(() => tourBySlug(slug ?? ''), [slug]);
  const dest = useMemo(
    () => (tour ? destinationBySlug(tour.destinationSlug) : undefined),
    [tour]
  );

  const [cover, setCover] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('itinerary');
  const departures = useMemo(() => nextDepartures(6), []);
  const [departure, setDeparture] = useState<Date | null>(null);
  const [travelers, setTravelers] = useState(2);
  const [addOnIds, setAddOnIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [bookingRef, setBookingRef] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    setStatusBarStyle('light');
    return () => setStatusBarStyle('dark');
  }, []));

  useEffect(() => {
    if (!dest) return;
    fetchDestinationPhoto(dest.photoQuery).then((p) => {
      if (p) setCover(p.url);
    });
  }, [dest]);

  if (!tour || !dest) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FDFCFA', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#9CA3AF' }}>Tour not found.</Text>
      </View>
    );
  }

  const selectedAddOns = tour.addOns.filter((a) => addOnIds.has(a.id));
  const perPerson = tour.price + selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  const total = perPerson * travelers;

  const endDate = departure
    ? new Date(departure.getFullYear(), departure.getMonth(), departure.getDate() + tour.durationDays - 1)
    : null;

  function toggleAddOn(id: string) {
    setAddOnIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBack() {
    if (step === 'itinerary' || step === 'done') {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/discover');
      return;
    }
    const idx = BOOKING_STEPS.indexOf(step);
    setStep(idx <= 0 ? 'itinerary' : BOOKING_STEPS[idx - 1]);
  }

  function advance() {
    if (step === 'itinerary') setStep('dates');
    else if (step === 'dates' && departure) setStep('travelers');
    else if (step === 'travelers') setStep('addons');
    else if (step === 'addons') setStep('review');
    else if (step === 'review') confirmBooking();
  }

  async function confirmBooking() {
    if (!session || !departure || !endDate || confirming || !tour || !dest) return;
    setConfirming(true);
    try {
      const ref = makeRef();
      const { data: trip, error } = await supabase
        .from('trips')
        .insert({
          created_by: session.user.id,
          title: dest.name,
          destination: `${dest.name}, ${dest.country}`,
          cover_photo_url: cover,
          status: 'booked',
          start_date: isoDate(departure),
          end_date: isoDate(endDate),
        })
        .select()
        .single();
      if (error || !trip) throw new Error(error?.message ?? 'Could not create booking');

      // Register the tour's accommodations as booked places so they surface in the Booked tab.
      const stays = Array.from(
        new Set(tour.days.map((d) => d.stay).filter((s) => s && s !== '—'))
      );
      if (stays.length > 0) {
        await supabase.from('places').insert(
          stays.map((stay) => ({
            trip_id: trip.id,
            name: stay,
            category: 'hotel',
            notes: `Included in “${tour.title}” · ref ${ref}`,
            is_booked: true,
            confirmation_number: ref,
          }))
        );
      }

      setBookingRef(ref);
      setStep('done');
    } finally {
      setConfirming(false);
    }
  }

  const ctaLabel: string =
    step === 'itinerary'
      ? 'Begin booking'
      : step === 'dates'
        ? departure
          ? 'Continue — travelers'
          : 'Select a departure'
        : step === 'travelers'
          ? 'Continue — add-ons'
          : step === 'addons'
            ? 'Review booking'
            : 'Confirm booking';

  const ctaDisabled = (step === 'dates' && !departure) || confirming;
  const stepIndex = BOOKING_STEPS.indexOf(step);

  return (
    <View style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cover ── */}
        <View style={{ height: COVER_H, backgroundColor: '#17171E' }}>
          {cover ? (
            <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color="rgba(255,255,255,0.4)" />
            </View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.75)']}
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
              Signature journey · {dest.name}
            </Text>
            <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 30, letterSpacing: -0.5 }}>
              {tour.title}
            </Text>
            <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 3 }}>
              {tour.subtitle}
            </Text>
          </View>
        </View>

        {step === 'itinerary' ? (
          /* ─────────── Itinerary view ─────────── */
          <View style={{ paddingHorizontal: 24, paddingTop: 22 }}>
            {/* Stats */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: 'white',
                borderWidth: 1,
                borderColor: '#F0F0EE',
                borderRadius: 18,
                overflow: 'hidden',
                marginBottom: 24,
              }}
            >
              {[
                { label: 'Per person', value: formatPrice(tour.price) },
                { label: 'Duration', value: `${tour.durationDays} days` },
                { label: 'Group', value: tour.groupSize },
              ].map((s, i) => (
                <View
                  key={s.label}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 15,
                    borderLeftWidth: i > 0 ? 1 : 0,
                    borderLeftColor: '#F0F0EE',
                  }}
                >
                  <Text
                    style={{
                      color: '#9CA3AF',
                      fontSize: 9,
                      fontWeight: '700',
                      letterSpacing: 1.2,
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    {s.label}
                  </Text>
                  <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 17 }}>{s.value}</Text>
                </View>
              ))}
            </View>

            {/* Included */}
            <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
            <Text style={{ fontFamily: SERIF, fontSize: 21, color: '#111', marginBottom: 12 }}>
              What's included
            </Text>
            <View style={{ marginBottom: 28, gap: 8 }}>
              {tour.included.map((item) => (
                <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: '#111',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>✓</Text>
                  </View>
                  <Text style={{ color: '#3F3F46', fontSize: 14 }}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Timeline */}
            <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
            <Text style={{ fontFamily: SERIF, fontSize: 21, color: '#111', marginBottom: 18 }}>
              Day by day
            </Text>
            {tour.days.map((day, i) => {
              const last = i === tour.days.length - 1;
              return (
                <View key={i} style={{ flexDirection: 'row' }}>
                  {/* Rail */}
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
                      <Text style={{ color: 'white', fontFamily: SERIF, fontSize: 13 }}>{i + 1}</Text>
                    </View>
                    {!last ? (
                      <View style={{ width: 1.5, flex: 1, backgroundColor: '#E5E5E0', marginVertical: 4 }} />
                    ) : null}
                  </View>
                  {/* Card */}
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
                    <Text
                      style={{
                        color: '#9CA3AF',
                        fontSize: 9,
                        fontWeight: '700',
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        marginBottom: 4,
                      }}
                    >
                      Day {i + 1}
                    </Text>
                    <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 17, marginBottom: 8 }}>
                      {day.title}
                    </Text>
                    {day.activities.map((a) => (
                      <View key={a} style={{ flexDirection: 'row', marginBottom: 4 }}>
                        <Text style={{ color: '#C4C0B8', fontSize: 13, marginRight: 8 }}>—</Text>
                        <Text style={{ color: '#3F3F46', fontSize: 13.5, flex: 1, lineHeight: 19 }}>{a}</Text>
                      </View>
                    ))}
                    <View
                      style={{
                        flexDirection: 'row',
                        marginTop: 10,
                        paddingTop: 10,
                        borderTopWidth: 1,
                        borderTopColor: '#F5F5F2',
                        gap: 16,
                      }}
                    >
                      <Text style={{ color: '#9CA3AF', fontSize: 12 }}>🍽 {day.meals}</Text>
                      {day.stay !== '—' ? (
                        <Text style={{ color: '#9CA3AF', fontSize: 12, flex: 1 }} numberOfLines={1}>
                          🛏 {day.stay}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : step === 'done' ? (
          /* ─────────── Confirmation ─────────── */
          <View style={{ paddingHorizontal: 24, paddingTop: 48, alignItems: 'center' }}>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: '#111',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 22,
              }}
            >
              <Text style={{ color: 'white', fontSize: 32 }}>✓</Text>
            </View>
            <Text style={{ fontFamily: SERIF, fontSize: 28, color: '#111', textAlign: 'center' }}>
              You're going to {dest.name}.
            </Text>
            <Text
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                color: '#6B7280',
                fontSize: 15,
                textAlign: 'center',
                marginTop: 8,
                lineHeight: 23,
              }}
            >
              {departure ? fmtDate(departure) : ''} · {travelers} {travelers === 1 ? 'traveler' : 'travelers'}
            </Text>
            <View
              style={{
                marginTop: 26,
                backgroundColor: 'white',
                borderWidth: 1,
                borderColor: '#F0F0EE',
                borderRadius: 16,
                paddingHorizontal: 28,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#9CA3AF', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
                Booking reference
              </Text>
              <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 24, letterSpacing: 2 }}>
                {bookingRef}
              </Text>
            </View>
            <Pressable
              onPress={() => router.replace('/(tabs)/booked')}
              style={({ pressed }) => ({
                marginTop: 30,
                backgroundColor: '#111',
                borderRadius: 100,
                paddingVertical: 16,
                paddingHorizontal: 44,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>View in Booked</Text>
            </Pressable>
            <Pressable onPress={() => router.replace('/(tabs)/discover')} style={{ marginTop: 16, padding: 8 }}>
              <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Back to Discover</Text>
            </Pressable>
          </View>
        ) : (
          /* ─────────── Booking steps ─────────── */
          <View style={{ paddingHorizontal: 24, paddingTop: 22 }}>
            {/* Step progress */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              {BOOKING_STEPS.map((s, i) => (
                <View
                  key={s}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: i <= stepIndex ? '#111' : '#E5E5E0',
                  }}
                />
              ))}
            </View>
            <Text style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 20 }}>
              Step {stepIndex + 1} of {BOOKING_STEPS.length}
            </Text>

            {step === 'dates' ? (
              <View>
                <Text style={{ fontFamily: SERIF, fontSize: 24, color: '#111', marginBottom: 6 }}>
                  Choose your departure
                </Text>
                <Text style={{ color: '#6B7280', fontSize: 13.5, lineHeight: 20, marginBottom: 20 }}>
                  Small-group departures, one per month. {tour.durationDays} days from the date you choose.
                </Text>
                <View style={{ gap: 10 }}>
                  {departures.map((d) => {
                    const selected = departure?.getTime() === d.getTime();
                    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + tour.durationDays - 1);
                    return (
                      <Pressable
                        key={d.toISOString()}
                        onPress={() => setDeparture(d)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: selected ? '#111' : 'white',
                          borderWidth: 1,
                          borderColor: selected ? '#111' : '#F0F0EE',
                          borderRadius: 16,
                          paddingHorizontal: 18,
                          paddingVertical: 16,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        })}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: SERIF, fontSize: 16, color: selected ? 'white' : '#111' }}>
                            {fmtShort(d)} → {fmtShort(end)}
                          </Text>
                          <Text style={{ fontSize: 12, color: selected ? 'rgba(255,255,255,0.65)' : '#9CA3AF', marginTop: 3 }}>
                            {d.getFullYear()} · {tour.groupSize.toLowerCase()} travelers
                          </Text>
                        </View>
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: 1.5,
                            borderColor: selected ? 'white' : '#D1D5DB',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'white' }} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {step === 'travelers' ? (
              <View>
                <Text style={{ fontFamily: SERIF, fontSize: 24, color: '#111', marginBottom: 6 }}>
                  Who's coming?
                </Text>
                <Text style={{ color: '#6B7280', fontSize: 13.5, lineHeight: 20, marginBottom: 26 }}>
                  Price is per person. Groups of {tour.groupSize.replace('Max ', '')} or fewer keep it intimate.
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
                    <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>Ages 12 and up</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                    <Pressable
                      onPress={() => setTravelers((t) => Math.max(1, t - 1))}
                      style={({ pressed }) => ({
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: '#D1D5DB',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: travelers <= 1 ? 0.35 : 1,
                        transform: [{ scale: pressed ? 0.9 : 1 }],
                      })}
                    >
                      <Text style={{ fontSize: 20, color: '#111', lineHeight: 24 }}>−</Text>
                    </Pressable>
                    <Text style={{ fontFamily: SERIF, fontSize: 26, color: '#111', minWidth: 30, textAlign: 'center' }}>
                      {travelers}
                    </Text>
                    <Pressable
                      onPress={() => setTravelers((t) => Math.min(8, t + 1))}
                      style={({ pressed }) => ({
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: '#111',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: travelers >= 8 ? 0.35 : 1,
                        transform: [{ scale: pressed ? 0.9 : 1 }],
                      })}
                    >
                      <Text style={{ fontSize: 20, color: 'white', lineHeight: 24 }}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}

            {step === 'addons' ? (
              <View>
                <Text style={{ fontFamily: SERIF, fontSize: 24, color: '#111', marginBottom: 6 }}>
                  Make it yours
                </Text>
                <Text style={{ color: '#6B7280', fontSize: 13.5, lineHeight: 20, marginBottom: 20 }}>
                  Optional experiences, priced per person. Skip freely — the journey is complete without them.
                </Text>
                <View style={{ gap: 10 }}>
                  {tour.addOns.map((a) => {
                    const on = addOnIds.has(a.id);
                    return (
                      <Pressable
                        key={a.id}
                        onPress={() => toggleAddOn(a.id)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: 'white',
                          borderWidth: 1.5,
                          borderColor: on ? '#111' : '#F0F0EE',
                          borderRadius: 16,
                          paddingHorizontal: 18,
                          paddingVertical: 16,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        })}
                      >
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={{ fontFamily: SERIF, fontSize: 15.5, color: '#111' }}>{a.label}</Text>
                          <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 3, lineHeight: 17 }}>
                            {a.detail}
                          </Text>
                          <Text style={{ color: '#111', fontSize: 12.5, fontWeight: '700', marginTop: 6 }}>
                            +{formatPrice(a.price)} <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>/ person</Text>
                          </Text>
                        </View>
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 7,
                            backgroundColor: on ? '#111' : 'transparent',
                            borderWidth: on ? 0 : 1.5,
                            borderColor: '#D1D5DB',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {on ? <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {step === 'review' ? (
              <View>
                <Text style={{ fontFamily: SERIF, fontSize: 24, color: '#111', marginBottom: 20 }}>
                  One last look
                </Text>
                <View
                  style={{
                    backgroundColor: 'white',
                    borderWidth: 1,
                    borderColor: '#F0F0EE',
                    borderRadius: 18,
                    padding: 20,
                  }}
                >
                  <Text style={{ fontFamily: SERIF, fontSize: 18, color: '#111', marginBottom: 2 }}>
                    {tour.title}
                  </Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 12.5, marginBottom: 16 }}>
                    {dest.name}, {dest.country} · {tour.durationDays} days
                  </Text>

                  {[
                    { label: 'Departure', value: departure ? fmtDate(departure) : '—' },
                    { label: 'Return', value: endDate ? fmtDate(endDate) : '—' },
                    { label: 'Travelers', value: `${travelers}` },
                  ].map((row) => (
                    <View
                      key={row.label}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingVertical: 9,
                        borderTopWidth: 1,
                        borderTopColor: '#F5F5F2',
                      }}
                    >
                      <Text style={{ color: '#6B7280', fontSize: 13.5 }}>{row.label}</Text>
                      <Text style={{ color: '#111', fontSize: 13.5, fontWeight: '600' }}>{row.value}</Text>
                    </View>
                  ))}

                  <View style={{ paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F5F5F2' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#6B7280', fontSize: 13.5 }}>
                        Base · {formatPrice(tour.price)} × {travelers}
                      </Text>
                      <Text style={{ color: '#111', fontSize: 13.5, fontWeight: '600' }}>
                        {formatPrice(tour.price * travelers)}
                      </Text>
                    </View>
                    {selectedAddOns.map((a) => (
                      <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
                        <Text style={{ color: '#6B7280', fontSize: 13.5 }}>
                          {a.label} × {travelers}
                        </Text>
                        <Text style={{ color: '#111', fontSize: 13.5, fontWeight: '600' }}>
                          {formatPrice(a.price * travelers)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 14,
                      borderTopWidth: 1,
                      borderTopColor: '#111',
                    }}
                  >
                    <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 16 }}>Total</Text>
                    <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 22 }}>{formatPrice(total)}</Text>
                  </View>
                </View>
                <Text style={{ color: '#B6BAC2', fontSize: 11.5, lineHeight: 17, marginTop: 14, textAlign: 'center' }}>
                  This saves the journey to your Booked tab with a reference code.{'\n'}No payment is taken — this is your planning ledger.
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* ── Persistent summary bar ── */}
      {step !== 'done' ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: insets.bottom + 14,
            backgroundColor: '#FDFCFA',
            borderTopWidth: 1,
            borderTopColor: '#F0F0EE',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <View>
            <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
              {step === 'itinerary' ? 'Per person' : `Total · ${travelers} ${travelers === 1 ? 'traveler' : 'travelers'}`}
            </Text>
            <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 20 }}>
              {step === 'itinerary' ? formatPrice(tour.price) : formatPrice(total)}
            </Text>
          </View>
          <Pressable
            onPress={advance}
            disabled={ctaDisabled}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: '#111',
              borderRadius: 100,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: ctaDisabled ? 0.4 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            {confirming ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>{ctaLabel}</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
