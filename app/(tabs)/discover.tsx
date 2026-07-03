import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { fetchDestinationPhoto } from '../../lib/unsplash';
import { DestinationSuggestion, suggestDestinations } from '../../lib/ai';
import {
  DESTINATIONS,
  EditorialDestination,
  REGIONS,
  SERIF,
  VIBES,
  featuredDestination,
  formatPrice,
} from '../../lib/editorial';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RAIL_CARD_W = Math.round(SCREEN_WIDTH * 0.62);
const RAIL_CARD_H = Math.round(RAIL_CARD_W * 1.28);

const ONBOARDING_KEY = 'wanderlist_onboarded_v1';

export default function DiscoverScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [savedByTitle, setSavedByTitle] = useState<Record<string, string>>({});
  const [searchPhoto, setSearchPhoto] = useState<string | null>(null);
  const [searchPhotoLoading, setSearchPhotoLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [concierge, setConcierge] = useState<DestinationSuggestion[]>([]);
  const [conciergeReply, setConciergeReply] = useState<string | null>(null);
  const [conciergeLoading, setConciergeLoading] = useState(false);
  const [conciergeError, setConciergeError] = useState<string | null>(null);
  const [conciergePhotos, setConciergePhotos] = useState<Record<string, string>>({});
  const conciergeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conciergeQueryRef = useRef<string>('');

  const hero = useMemo(() => featuredDestination(), []);

  useFocusEffect(useCallback(() => {
    setStatusBarStyle('dark');
    return () => setStatusBarStyle('light');
  }, []));

  // First-launch onboarding
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((seen) => {
      if (!seen) router.push('/onboarding');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cover photos for all editorial destinations
  useEffect(() => {
    DESTINATIONS.forEach((dest) => {
      fetchDestinationPhoto(dest.photoQuery).then((photo) => {
        if (photo) setPhotos((prev) => ({ ...prev, [dest.slug]: photo.url }));
      });
    });
  }, []);

  // Wishlist state — which editorial destinations already live in the bucket list
  const loadSaved = useCallback(async () => {
    const { data } = await supabase.from('trips').select('id, title').eq('status', 'idea');
    const map: Record<string, string> = {};
    (data ?? []).forEach((t) => {
      map[t.title] = t.id;
    });
    setSavedByTitle(map);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSaved();
    }, [loadSaved])
  );

  async function toggleWishlist(dest: EditorialDestination) {
    if (!session) return;
    const existingId = savedByTitle[dest.name];
    if (existingId) {
      setSavedByTitle((prev) => {
        const next = { ...prev };
        delete next[dest.name];
        return next;
      });
      await supabase.from('trips').delete().eq('id', existingId);
    } else {
      setSavedByTitle((prev) => ({ ...prev, [dest.name]: 'pending' }));
      const { data } = await supabase
        .from('trips')
        .insert({
          created_by: session.user.id,
          title: dest.name,
          destination: `${dest.name}, ${dest.country}`,
          cover_photo_url: photos[dest.slug] ?? null,
          status: 'idea',
        })
        .select()
        .single();
      if (data) setSavedByTitle((prev) => ({ ...prev, [dest.name]: data.id }));
    }
  }

  // Debounced live photo for custom searches
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchPhoto(null);
      setSearchPhotoLoading(false);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      return;
    }
    setSearchPhotoLoading(true);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      const photo = await fetchDestinationPhoto(`${q} travel landscape`);
      setSearchPhoto(photo?.url ?? null);
      setSearchPhotoLoading(false);
    }, 500);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  const searching = search.trim().length > 0;

  const results = useMemo(() => {
    const q = search.toLowerCase().trim();
    return DESTINATIONS.filter((d) => {
      const matchesRegion = !regionFilter || d.region === regionFilter;
      const matchesQ =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.country.toLowerCase().includes(q) ||
        d.region.toLowerCase().includes(q) ||
        d.tagline.toLowerCase().includes(q) ||
        d.vibes.some((v) => v.toLowerCase().includes(q) || q.includes(v.toLowerCase()));
      return matchesRegion && matchesQ;
    });
  }, [search, regionFilter]);

  // Concierge: when the collection has little to offer for a query, ask the AI
  // for recommendations ("trip with my grandma" → real suggestions, not a dead end).
  useEffect(() => {
    const q = search.trim();
    if (conciergeTimerRef.current) clearTimeout(conciergeTimerRef.current);
    if (!q || q.length < 4 || results.length >= 3) {
      setConcierge([]);
      setConciergeReply(null);
      setConciergeError(null);
      setConciergeLoading(false);
      conciergeQueryRef.current = '';
      return;
    }
    if (conciergeQueryRef.current === q) return;
    setConciergeLoading(true);
    setConciergeError(null);
    conciergeTimerRef.current = setTimeout(async () => {
      conciergeQueryRef.current = q;
      try {
        const res = await suggestDestinations(q);
        // Ignore stale responses
        if (conciergeQueryRef.current !== q) return;
        setConcierge(res.suggestions);
        setConciergeReply(res.reply);
        res.suggestions.forEach((s) => {
          fetchDestinationPhoto(s.photoQuery).then((photo) => {
            if (photo) setConciergePhotos((prev) => ({ ...prev, [s.name]: photo.url }));
          });
        });
      } catch (err) {
        if (conciergeQueryRef.current !== q) return;
        setConcierge([]);
        setConciergeReply(null);
        setConciergeError(err instanceof Error ? err.message : 'The concierge could not be reached.');
      } finally {
        if (conciergeQueryRef.current === q) setConciergeLoading(false);
      }
    }, 900);
    return () => {
      if (conciergeTimerRef.current) clearTimeout(conciergeTimerRef.current);
    };
  }, [search, results.length]);

  function WishlistHeart({ dest, size = 34 }: { dest: EditorialDestination; size?: number }) {
    const saved = !!savedByTitle[dest.name];
    return (
      <Pressable
        onPress={() => toggleWishlist(dest)}
        hitSlop={10}
        style={({ pressed }) => ({
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(255,255,255,0.92)',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pressed ? 0.88 : 1 }],
        })}
      >
        <Text style={{ fontSize: size * 0.44, color: saved ? '#E11D48' : '#111', marginTop: 1 }}>
          {saved ? '♥' : '♡'}
        </Text>
      </Pressable>
    );
  }

  function MetaRow({ dest, light }: { dest: EditorialDestination; light?: boolean }) {
    return (
      <Text
        style={{
          color: light ? 'rgba(255,255,255,0.75)' : '#9CA3AF',
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1.1,
          textTransform: 'uppercase',
        }}
      >
        {dest.vibes[0]} · est. {formatPrice(dest.estDailyCost)} / day
      </Text>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Masthead */}
        <View style={{ paddingHorizontal: 24, paddingTop: 14 }}>
          <Text
            style={{
              color: '#9CA3AF',
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 3,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Wanderlist · The Journal
          </Text>
          <Text style={{ fontFamily: SERIF, fontSize: 38, color: '#111', letterSpacing: -0.5 }}>
            Discover
          </Text>
          <Text
            style={{
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontSize: 15,
              color: '#6B7280',
              marginTop: 4,
            }}
          >
            Where will the season take you?
          </Text>
        </View>

        {/* Quiet search */}
        <View style={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 6 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 100,
              paddingHorizontal: 18,
              height: 48,
              backgroundColor: 'white',
            }}
          >
            <Text style={{ color: '#9CA3AF', fontSize: 14, marginRight: 10 }}>⌕</Text>
            <TextInput
              style={{ flex: 1, color: '#111', fontSize: 14 }}
              placeholder="Search the atlas…"
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

        {/* Vibe chips — search by the kind of trip, not just the place */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8, paddingTop: 4, paddingBottom: 6 }}
        >
          {VIBES.map((vibe) => {
            const active = search.trim().toLowerCase() === vibe.toLowerCase();
            return (
              <Pressable
                key={vibe}
                onPress={() => setSearch(active ? '' : vibe)}
                style={({ pressed }) => ({
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 100,
                  borderWidth: 1,
                  borderColor: active ? '#111' : '#E5E7EB',
                  backgroundColor: active ? '#111' : 'white',
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                })}
              >
                <Text style={{ color: active ? 'white' : '#6B7280', fontSize: 12, fontWeight: '600' }}>
                  {vibe}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {searching ? (
          /* ─────────── Search results ─────────── */
          <View style={{ paddingTop: 10 }}>
            {/* Region filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 8, paddingBottom: 16 }}
            >
              {[null, ...REGIONS].map((r) => {
                const active = regionFilter === r;
                return (
                  <Pressable
                    key={r ?? 'all'}
                    onPress={() => setRegionFilter(r)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 100,
                      borderWidth: 1,
                      borderColor: active ? '#111' : '#E5E7EB',
                      backgroundColor: active ? '#111' : 'white',
                    }}
                  >
                    <Text style={{ color: active ? 'white' : '#6B7280', fontSize: 12, fontWeight: '600' }}>
                      {r ?? 'Everywhere'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ paddingHorizontal: 24, gap: 14 }}>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                {results.length} {results.length === 1 ? 'destination' : 'destinations'} in the collection
              </Text>

              {results.map((dest) => (
                <Pressable
                  key={dest.slug}
                  onPress={() => router.push(`/destination/${dest.slug}`)}
                  style={({ pressed }) => ({
                    height: 132,
                    borderRadius: 18,
                    overflow: 'hidden',
                    backgroundColor: '#E9EAEC',
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  {photos[dest.slug] ? (
                    <Image source={{ uri: photos[dest.slug] }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator color="#9CA3AF" size="small" />
                    </View>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.72)']}
                    locations={[0.15, 1]}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  />
                  <View style={{ position: 'absolute', left: 16, right: 56, bottom: 14 }}>
                    <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 21 }}>{dest.name}</Text>
                    <Text
                      style={{ fontFamily: SERIF, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {dest.tagline}
                    </Text>
                    <View style={{ marginTop: 6 }}>
                      <MetaRow dest={dest} light />
                    </View>
                  </View>
                  <View style={{ position: 'absolute', top: 12, right: 12 }}>
                    <WishlistHeart dest={dest} size={32} />
                  </View>
                </Pressable>
              ))}

              {/* Concierge suggestions */}
              {conciergeLoading ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 8,
                  }}
                >
                  <ActivityIndicator color="#9CA3AF" size="small" />
                  <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 13 }}>
                    Consulting the concierge…
                  </Text>
                </View>
              ) : null}

              {conciergeError ? (
                <Text
                  style={{
                    fontFamily: SERIF,
                    fontStyle: 'italic',
                    color: '#9CA3AF',
                    fontSize: 13,
                    lineHeight: 19,
                    paddingVertical: 4,
                  }}
                >
                  The concierge couldn't be reached — {conciergeError}
                </Text>
              ) : null}

              {concierge.length > 0 ? (
                <View style={{ gap: 14 }}>
                  <View>
                    <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
                    <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111' }}>
                      From the concierge
                    </Text>
                    {conciergeReply ? (
                      <Text
                        style={{
                          fontFamily: SERIF,
                          fontStyle: 'italic',
                          color: '#6B7280',
                          fontSize: 13.5,
                          lineHeight: 20,
                          marginTop: 6,
                        }}
                      >
                        {conciergeReply}
                      </Text>
                    ) : null}
                  </View>
                  {concierge.map((s) => (
                    <Pressable
                      key={s.name}
                      onPress={() =>
                        router.push({
                          pathname: '/destination/custom',
                          params: { name: s.name, country: s.country },
                        })
                      }
                      style={({ pressed }) => ({
                        height: 132,
                        borderRadius: 18,
                        overflow: 'hidden',
                        backgroundColor: '#E9EAEC',
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      })}
                    >
                      {conciergePhotos[s.name] ? (
                        <Image
                          source={{ uri: conciergePhotos[s.name] }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                          transition={300}
                        />
                      ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                          <ActivityIndicator color="#9CA3AF" size="small" />
                        </View>
                      )}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.75)']}
                        locations={[0.1, 1]}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                      />
                      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
                        <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 20 }}>
                          {s.name}
                          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>  {s.country}</Text>
                        </Text>
                        <Text
                          style={{
                            fontFamily: SERIF,
                            fontStyle: 'italic',
                            color: 'rgba(255,255,255,0.85)',
                            fontSize: 12,
                            marginTop: 3,
                          }}
                          numberOfLines={2}
                        >
                          {s.blurb}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {/* Custom destination card */}
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/destination/custom', params: { name: search.trim() } })
                }
                style={({ pressed }) => ({
                  height: 96,
                  borderRadius: 18,
                  overflow: 'hidden',
                  backgroundColor: '#17171E',
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                {searchPhoto ? (
                  <Image source={{ uri: searchPhoto }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
                ) : searchPhotoLoading ? (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color="rgba(255,255,255,0.5)" />
                  </View>
                ) : null}
                <LinearGradient
                  colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.75)']}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <View
                  style={{
                    position: 'absolute',
                    left: 16,
                    right: 16,
                    bottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase' }}>
                      Beyond the collection
                    </Text>
                    <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 18, marginTop: 2 }} numberOfLines={1}>
                      “{search.trim()}”
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: 'white',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#111', fontSize: 19, lineHeight: 22 }}>+</Text>
                  </View>
                </View>
              </Pressable>
            </View>
          </View>
        ) : (
          /* ─────────── Editorial home ─────────── */
          <View>
            {/* Hero feature */}
            <View style={{ paddingHorizontal: 24, paddingTop: 14 }}>
              <Pressable
                onPress={() => router.push(`/destination/${hero.slug}`)}
                style={({ pressed }) => ({
                  height: 430,
                  borderRadius: 24,
                  overflow: 'hidden',
                  backgroundColor: '#E9EAEC',
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                })}
              >
                {photos[hero.slug] ? (
                  <Image source={{ uri: photos[hero.slug] }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={400} />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color="#9CA3AF" />
                  </View>
                )}
                <LinearGradient
                  colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.82)']}
                  locations={[0, 0.4, 1]}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <View style={{ position: 'absolute', top: 18, left: 18 }}>
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 10,
                      fontWeight: '700',
                      letterSpacing: 2.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    Featured Journey
                  </Text>
                </View>
                <View style={{ position: 'absolute', top: 14, right: 14 }}>
                  <WishlistHeart dest={hero} />
                </View>
                <View style={{ position: 'absolute', left: 20, right: 20, bottom: 22 }}>
                  <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 34, letterSpacing: -0.5 }}>
                    {hero.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: SERIF,
                      fontStyle: 'italic',
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: 15,
                      marginTop: 4,
                      marginBottom: 10,
                    }}
                  >
                    {hero.tagline}
                  </Text>
                  <MetaRow dest={hero} light />
                </View>
              </Pressable>
            </View>

            {/* Region rails */}
            {REGIONS.map((region) => {
              const regionDests = DESTINATIONS.filter((d) => d.region === region);
              return (
                <View key={region} style={{ marginTop: 34 }}>
                  <View style={{ paddingHorizontal: 24, marginBottom: 14 }}>
                    <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
                    <Text style={{ fontFamily: SERIF, fontSize: 23, color: '#111', letterSpacing: -0.3 }}>
                      {region}
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 24, gap: 14 }}
                    decelerationRate="fast"
                    snapToInterval={RAIL_CARD_W + 14}
                    snapToAlignment="start"
                  >
                    {regionDests.map((dest) => (
                      <Pressable
                        key={dest.slug}
                        onPress={() => router.push(`/destination/${dest.slug}`)}
                        style={({ pressed }) => ({
                          width: RAIL_CARD_W,
                          height: RAIL_CARD_H,
                          borderRadius: 20,
                          overflow: 'hidden',
                          backgroundColor: '#E9EAEC',
                          transform: [{ scale: pressed ? 0.97 : 1 }],
                        })}
                      >
                        {photos[dest.slug] ? (
                          <Image source={{ uri: photos[dest.slug] }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
                        ) : (
                          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator color="#9CA3AF" size="small" />
                          </View>
                        )}
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.88)']}
                          locations={[0.35, 0.65, 1]}
                          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        />
                        <View style={{ position: 'absolute', top: 12, right: 12 }}>
                          <WishlistHeart dest={dest} size={32} />
                        </View>
                        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
                          <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 23 }}>{dest.name}</Text>
                          <Text
                            style={{
                              fontFamily: SERIF,
                              fontStyle: 'italic',
                              color: 'rgba(255,255,255,0.88)',
                              fontSize: 13,
                              marginTop: 3,
                              marginBottom: 8,
                            }}
                            numberOfLines={1}
                          >
                            {dest.tagline}
                          </Text>
                          <MetaRow dest={dest} light />
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              );
            })}

            {/* Closing note */}
            <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 40 }}>
              <View style={{ width: 28, height: 2, backgroundColor: '#D1D5DB', marginBottom: 14 }} />
              <Text
                style={{
                  fontFamily: SERIF,
                  fontStyle: 'italic',
                  color: '#9CA3AF',
                  fontSize: 14,
                  textAlign: 'center',
                  lineHeight: 22,
                }}
              >
                “The world is a book, and those who do not travel read only one page.”
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}
