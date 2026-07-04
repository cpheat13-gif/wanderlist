import { useEffect, useState } from 'react';
// eslint-disable-next-line deprecation/deprecation
import { ActivityIndicator, Clipboard, Dimensions, Linking, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PillButton } from '../PillButton';
import { ConciergeLoader } from '../ConciergeLoader';
import { colorForCategory } from '../../theme/colors';
import { SERIF } from '../../lib/editorial';
import { exploreDestination, ExploreResult, slotStop } from '../../lib/ai';
import { insertActivityByTime } from '../../lib/itinerary';
import { fetchDestinationPhoto, DestinationPhoto } from '../../lib/unsplash';
import { supabase } from '../../lib/supabase';
import { ItineraryActivity, ItineraryDayRow, Place, PlaceCategory, TiktokLink, TripStatus } from '../../lib/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PHOTO_HEIGHT = Math.round(SCREEN_HEIGHT * 0.48);

const CATEGORY_TABS: {
  key: PlaceCategory;
  label: string;
  quickSearches: string[];
  searchHint: string;
  queryContext: string;
}[] = [
  {
    key: 'hotel',
    label: 'Hotels',
    quickSearches: ['Boutique', 'Budget', 'Luxury', 'Unique stays'],
    searchHint: 'e.g. boutique, beachfront...',
    queryContext: 'hotels and accommodation',
  },
  {
    key: 'restaurant',
    label: 'Food',
    quickSearches: ['Local cuisine', 'Seafood', 'Coffee', 'Fine dining'],
    searchHint: 'e.g. seafood, local food...',
    queryContext: 'restaurants, cafes, and food spots',
  },
  {
    key: 'activity',
    label: 'Activities',
    quickSearches: ['Hiking', 'Water sports', 'Nightlife', 'Tours'],
    searchHint: 'e.g. hiking, nightlife...',
    queryContext: 'activities, tours, and experiences',
  },
  {
    key: 'sightseeing',
    label: 'Sightseeing',
    quickSearches: ['Landmarks', 'Museums', 'Viewpoints', 'Neighborhoods'],
    searchHint: 'e.g. museums, viewpoints...',
    queryContext: 'landmarks, museums, and sightseeing spots',
  },
];

function resultKey(r: ExploreResult) {
  return `${r.name}-${r.category}`;
}

export function ExplorerTab({
  tripId,
  destination,
  country,
  coverPhotoUrl,
  places,
  flightCount = 0,
  onBack,
  onPlaceAdded,
  onPlaceUpdate,
  onDeleteTrip,
  tripStatus,
  onStatusChange,
}: {
  tripId: string;
  destination: string;
  country?: string;
  coverPhotoUrl: string | null;
  places: Place[];
  flightCount?: number;
  onBack?: () => void;
  onPlaceAdded?: (place: Place) => void;
  onPlaceUpdate?: (place: Place) => void;
  onDeleteTrip?: () => void;
  tripStatus?: TripStatus;
  onStatusChange?: (status: TripStatus) => void;
}) {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<PlaceCategory>('hotel');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ExploreResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photosByResult, setPhotosByResult] = useState<Record<string, DestinationPhoto | null>>({});
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [heroThumbs, setHeroThumbs] = useState<(string | null)[]>([null, null, null]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tiktokLinks, setTiktokLinks] = useState<TiktokLink[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Add-to-itinerary
  const [tripDays, setTripDays] = useState<ItineraryDayRow[]>([]);
  const [dayPickerFor, setDayPickerFor] = useState<{ name: string; category: PlaceCategory; notes?: string } | null>(null);
  const [slottingDay, setSlottingDay] = useState<string | null>(null);
  const [slotDone, setSlotDone] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('tiktok_links')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setTiktokLinks(data ?? []));
  }, [tripId]);

  useEffect(() => {
    supabase
      .from('itinerary_days')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true })
      .then(({ data }) => setTripDays((data ?? []) as ItineraryDayRow[]));
  }, [tripId]);

  async function slotIntoDay(day: ItineraryDayRow) {
    if (!dayPickerFor || slottingDay) return;
    setSlottingDay(day.id);
    try {
      const existing = (day.activities ?? []).map((a) => ({ title: a.title, timeOfDay: a.timeOfDay }));
      const res = await slotStop({
        destination,
        country,
        dayTitle: day.title,
        daySummary: day.summary,
        existing,
        place: dayPickerFor,
      });
      const next = insertActivityByTime((day.activities ?? []) as ItineraryActivity[], res.activity as ItineraryActivity);
      await supabase.from('itinerary_days').update({ activities: next }).eq('id', day.id);
      setTripDays((prev) => prev.map((d) => (d.id === day.id ? { ...d, activities: next } : d)));
      setSlotDone(`Added to Day ${day.day_number}`);
      setDayPickerFor(null);
      setTimeout(() => setSlotDone(null), 2200);
    } catch {
      setSlotDone('Could not add — try again');
      setTimeout(() => setSlotDone(null), 2200);
    } finally {
      setSlottingDay(null);
    }
  }

  async function handleSaveLink() {
    const url = linkInput.trim();
    if (!url || savingLink) return;
    setSavingLink(true);
    const { data, error: insertError } = await supabase
      .from('tiktok_links')
      .insert({ trip_id: tripId, url })
      .select()
      .single();
    if (!insertError && data) {
      setTiktokLinks((prev) => [...prev, data as TiktokLink]);
      setLinkInput('');
      setShowLinkInput(false);
    }
    setSavingLink(false);
  }

  async function handleDeleteLink(id: string) {
    setTiktokLinks((prev) => prev.filter((l) => l.id !== id));
    await supabase.from('tiktok_links').delete().eq('id', id);
  }

  function toggleExpanded(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function getPlaceLink(result: ExploreResult): { label: string; url: string } | null {
    if (result.category !== 'hotel' && result.category !== 'restaurant') return null;
    if (result.website) return { label: 'Official Website', url: result.website };
    const q = encodeURIComponent(`${result.name} ${destination} official website`);
    return { label: 'Search Online', url: `https://www.google.com/search?q=${q}` };
  }

  const activeTab = CATEGORY_TABS.find((t) => t.key === activeCategory)!;
  const categoryPlaces = places.filter((p) => p.category === activeCategory);

  useEffect(() => {
    const queries = [
      `${destination} scenic view`,
      `${destination} local culture`,
      `${destination} food market`,
    ];
    queries.forEach((q, i) => {
      fetchDestinationPhoto(q)
        .then((photo) => {
          if (photo)
            setHeroThumbs((prev) => {
              const next = [...prev];
              next[i] = photo.url;
              return next;
            });
        })
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCategoryChange(cat: PlaceCategory) {
    setActiveCategory(cat);
    setQuery('');
    setResults([]);
    setError(null);
  }

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setError(null);
    setLoading(true);
    setResults([]);
    try {
      const result = await exploreDestination({
        destination,
        country,
        query: `${trimmed} — ${activeTab.queryContext}`,
      });
      setResults(result.results);
      result.results.forEach((r) => {
        fetchDestinationPhoto(r.photoQuery).then((photo) => {
          setPhotosByResult((prev) => ({ ...prev, [resultKey(r)]: photo }));
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(result: ExploreResult) {
    const key = resultKey(result);
    if (addedKeys.has(key) || addingKey) return;
    setAddingKey(key);
    try {
      const { data, error: insertError } = await supabase
        .from('places')
        .insert({
          trip_id: tripId,
          name: result.name,
          category: activeCategory,
          notes: result.blurb,
          is_booked: false,
        })
        .select()
        .single();
      if (insertError) throw new Error(insertError.message);
      setAddedKeys((prev) => new Set(prev).add(key));
      if (data) onPlaceAdded?.(data as Place);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this place.');
    } finally {
      setAddingKey(null);
    }
  }

  function handleToggleBooked(place: Place) {
    const updated = { ...place, is_booked: !place.is_booked };
    onPlaceUpdate?.(updated);
    supabase.from('places').update({ is_booked: updated.is_booked }).eq('id', place.id);
  }

  const bookedCount = places.filter((p) => p.is_booked).length;
  const displayUrl = activePhotoIndex === 0 ? coverPhotoUrl : heroThumbs[activePhotoIndex - 1];

  return (
    <View style={{ flex: 1 }}>
      {/* ── Full-bleed photo layer ── */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: PHOTO_HEIGHT,
          backgroundColor: '#1C1C2E',
        }}
      >
        {displayUrl ? (
          <Image
            source={{ uri: displayUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#444', fontSize: 52 }}>⊙</Text>
          </View>
        )}

        {/* Top gradient for back button readability */}
        <LinearGradient
          colors={['rgba(0,0,0,0.32)', 'transparent']}
          locations={[0, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100 }}
        />

        {/* Thumbnail column — right side */}
        <View style={{ position: 'absolute', right: 14, top: insets.top + 10, gap: 6 }}>
          {[coverPhotoUrl, ...heroThumbs].map((url, i) => (
            <Pressable
              key={i}
              onPress={() => setActivePhotoIndex(i)}
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                overflow: 'hidden',
                borderWidth: 2.5,
                borderColor: activePhotoIndex === i ? 'white' : 'rgba(255,255,255,0.45)',
                backgroundColor: 'rgba(255,255,255,0.15)',
              }}
            >
              {url ? (
                <Image
                  source={{ uri: url }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              )}
            </Pressable>
          ))}
        </View>

        {/* Back button */}
        <Pressable
          onPress={onBack}
          style={{
            position: 'absolute',
            top: insets.top + 10,
            left: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.88)',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.14,
            shadowRadius: 4,
          }}
        >
          <Text style={{ fontSize: 22, color: '#111', lineHeight: 26 }}>‹</Text>
        </Pressable>
      </View>

      {/* ── White bottom sheet card ── */}
      <View
        style={{
          position: 'absolute',
          top: PHOTO_HEIGHT - 32,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'white',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          overflow: 'hidden',
        }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Drag indicator */}
          <View style={{ alignItems: 'center', paddingTop: 10, marginBottom: 2 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' }} />
          </View>

          {/* Destination name + location */}
          <View style={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 14 }}>
            <Text
              style={{ fontFamily: SERIF, fontSize: 30, color: '#111', letterSpacing: -0.5 }}
              numberOfLines={1}
            >
              {destination}
            </Text>
            {country ? (
              <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#6B7280', fontSize: 14, marginTop: 4 }}>
                {country}
              </Text>
            ) : null}
          </View>

          {/* Stats row */}
          <View
            style={{
              flexDirection: 'row',
              marginHorizontal: 16,
              marginBottom: 16,
              backgroundColor: 'white',
              borderWidth: 1,
              borderColor: '#F0F0EE',
              borderRadius: 18,
              overflow: 'hidden',
            }}
          >
            {[
              { label: 'Places', value: places.length },
              { label: 'Booked', value: bookedCount },
              { label: 'Flights', value: flightCount },
            ].map(({ label, value }, i) => (
              <View
                key={label}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderLeftWidth: i > 0 ? 1 : 0,
                  borderLeftColor: '#F0F0EE',
                }}
              >
                <Text style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 5, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: '600' }}>{label}</Text>
                <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 22 }}>{value}</Text>
              </View>
            ))}
          </View>

          {/* ── Move to Planning ── */}
          {tripStatus === 'idea' && onStatusChange ? (
            <Pressable
              onPress={() => onStatusChange('planning')}
              style={{
                marginHorizontal: 16,
                marginBottom: 16,
                backgroundColor: '#111',
                borderRadius: 18,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 16,
                gap: 8,
              }}
            >
              <Text style={{ color: 'white', fontSize: 16 }}>◷</Text>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                Move to Planning
              </Text>
            </Pressable>
          ) : null}

          {/* ── TikTok ── */}
          <View style={{ marginHorizontal: 16, marginTop: 4 }}>
            {/* Discover button */}
            <Pressable
              onPress={() =>
                WebBrowser.openBrowserAsync(
                  `https://www.tiktok.com/search?q=${encodeURIComponent(destination + ' travel')}`
                )
              }
              style={{
                borderRadius: 18,
                backgroundColor: '#000',
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 16,
              }}
            >
              <Text style={{ fontSize: 26, marginRight: 14 }}>♪</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                  {destination} on TikTok
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 }}>
                  Discover travel videos & tips
                </Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 22 }}>›</Text>
            </Pressable>

            {/* Saved links header */}
            <View
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 10 }}
            >
              <Text
                style={{
                  flex: 1,
                  color: '#9CA3AF',
                  fontSize: 11,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 1.5,
                }}
              >
                My TikTok Links
              </Text>
              <Pressable onPress={() => setShowLinkInput((v) => !v)}>
                <Text style={{ color: '#111', fontSize: 13, fontWeight: '600' }}>
                  {showLinkInput ? 'Cancel' : '+ Add link'}
                </Text>
              </Pressable>
            </View>

            {showLinkInput ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: 'white',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    color: '#111',
                    fontSize: 13,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                  placeholder="Paste TikTok link..."
                  placeholderTextColor="#9CA3AF"
                  value={linkInput}
                  onChangeText={setLinkInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  onSubmitEditing={handleSaveLink}
                />
                <Pressable
                  onPress={handleSaveLink}
                  disabled={!linkInput.trim() || savingLink}
                  style={{
                    backgroundColor: '#111',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 11,
                    opacity: !linkInput.trim() || savingLink ? 0.45 : 1,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Save</Text>
                </Pressable>
              </View>
            ) : null}

            {tiktokLinks.length === 0 && !showLinkInput ? (
              <Text style={{ color: '#C4C4C4', fontSize: 13, marginBottom: 4 }}>
                No links saved yet — paste a TikTok URL to save it here.
              </Text>
            ) : null}

            {tiktokLinks.map((link) => {
              let display = link.url;
              try {
                display = decodeURIComponent(new URL(link.url).pathname.replace(/^\//, ''));
              } catch {}
              return (
                <View
                  key={link.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'white',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: '#F0F0EE',
                  }}
                >
                  <Text style={{ fontSize: 16, marginRight: 10 }}>♪</Text>
                  <Pressable style={{ flex: 1 }} onPress={() => WebBrowser.openBrowserAsync(link.url)}>
                    <Text style={{ color: '#111', fontSize: 13 }} numberOfLines={1}>
                      {display}
                    </Text>
                  </Pressable>
                  <Pressable
                    hitSlop={8}
                    style={{ paddingHorizontal: 10 }}
                    onPress={() => {
                      Clipboard.setString(link.url); // eslint-disable-line deprecation/deprecation
                      setCopiedId(link.id);
                      setTimeout(() => setCopiedId(null), 1500);
                    }}
                  >
                    <Text
                      style={{
                        color: copiedId === link.id ? '#111' : '#9CA3AF',
                        fontSize: 12,
                        fontWeight: '600',
                      }}
                    >
                      {copiedId === link.id ? 'Copied!' : 'Copy'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => handleDeleteLink(link.id)} hitSlop={8}>
                    <Text style={{ color: '#D1D5DB', fontSize: 16 }}>✕</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* ── Category tabs ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 16 }}
            style={{ flexGrow: 0 }}
          >
            {CATEGORY_TABS.map((tab) => {
              const isActive = tab.key === activeCategory;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => handleCategoryChange(tab.key)}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 100,
                    backgroundColor: isActive ? '#111' : '#F0F0EE',
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? 'white' : '#6B7280',
                      fontWeight: isActive ? '600' : '500',
                      fontSize: 14,
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ paddingHorizontal: 16 }}>
            {/* ── Search ── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: '#F0F0EE',
                  borderRadius: 100,
                  paddingHorizontal: 20,
                  paddingVertical: 13,
                  color: '#111',
                  fontSize: 14,
                  marginRight: 8,
                }}
                placeholder={activeTab.searchHint}
                placeholderTextColor="#9CA3AF"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => runSearch(query)}
                returnKeyType="search"
              />
              <Pressable
                onPress={() => runSearch(query)}
                disabled={loading || !query.trim()}
                style={{
                  backgroundColor: '#111',
                  borderRadius: 100,
                  width: 46,
                  height: 46,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: loading || !query.trim() ? 0.45 : 1,
                }}
              >
                <Text style={{ color: 'white', fontSize: 20 }}>⌕</Text>
              </Pressable>
            </View>

            {/* ── Quick searches ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              style={{ flexGrow: 0, marginBottom: 20 }}
            >
              {activeTab.quickSearches.map((label) => (
                <Pressable
                  key={label}
                  onPress={() => {
                    setQuery(label);
                    runSearch(label);
                  }}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 100,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                >
                  <Text style={{ color: '#6B7280', fontSize: 13 }}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* ── Added places ── */}
            {categoryPlaces.length > 0 ? (
              <View style={{ marginBottom: 22 }}>
                <Text
                  style={{
                    color: '#9CA3AF',
                    fontSize: 11,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: 1.5,
                    marginBottom: 10,
                  }}
                >
                  Added
                </Text>
                {categoryPlaces.map((place) => (
                  <View
                    key={place.id}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: 16,
                      padding: 14,
                      marginBottom: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#F0F0EE',
                    }}
                  >
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: colorForCategory(place.category),
                        marginRight: 12,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#111', fontWeight: '600', fontSize: 15 }}>
                        {place.name}
                      </Text>
                      {place.notes ? (
                        <Text
                          style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}
                          numberOfLines={1}
                        >
                          {place.notes}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() =>
                        setDayPickerFor({ name: place.name, category: place.category, notes: place.notes ?? undefined })
                      }
                      hitSlop={6}
                      style={({ pressed }) => ({
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        borderRadius: 100,
                        paddingHorizontal: 11,
                        paddingVertical: 6,
                        marginLeft: 8,
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                      })}
                    >
                      <Text style={{ color: '#111', fontSize: 11.5, fontWeight: '700' }}>＋ Day</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleToggleBooked(place)}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        backgroundColor: place.is_booked ? '#111' : 'transparent',
                        borderWidth: place.is_booked ? 0 : 1.5,
                        borderColor: '#D1D5DB',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 8,
                      }}
                    >
                      {place.is_booked ? (
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                      ) : null}
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            {error ? (
              <Text style={{ color: '#EF4444', marginBottom: 12, fontSize: 13 }}>{error}</Text>
            ) : null}

            {/* ── Search results ── */}
            {loading ? (
              <View style={{ alignItems: 'center', marginTop: 28 }}>
                <ActivityIndicator color="#111" />
              </View>
            ) : results.length > 0 ? (
              <View>
                <Text
                  style={{
                    color: '#9CA3AF',
                    fontSize: 11,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: 1.5,
                    marginBottom: 10,
                  }}
                >
                  Results
                </Text>
                {results.map((result) => {
                  const key = resultKey(result);
                  const photo = photosByResult[key];
                  const isAdded = addedKeys.has(key);
                  const isExpanded = expandedKeys.has(key);
                  const link = getPlaceLink(result);
                  return (
                    <View
                      key={key}
                      style={{
                        flexDirection: 'row',
                        backgroundColor: 'white',
                        borderRadius: 18,
                        marginBottom: 12,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: '#F0F0EE',
                      }}
                    >
                      <View style={{ width: 110, minHeight: 110, backgroundColor: '#E5E7EB' }}>
                        {photo ? (
                          <Image
                            source={{ uri: photo.url }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        ) : (
                          <View
                            style={{
                              flex: 1,
                              minHeight: 110,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ActivityIndicator color="#111" />
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1, padding: 14 }}>
                        <Text style={{ fontWeight: '600', color: '#111', fontSize: 15 }}>
                          {result.name}
                        </Text>
                        <Text
                          style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4, lineHeight: 18 }}
                          numberOfLines={isExpanded ? undefined : 2}
                        >
                          {result.blurb}
                        </Text>
                        {isExpanded ? (
                          <View
                            style={{
                              marginTop: 12,
                              flexDirection: 'row',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 8,
                            }}
                          >
                            {link ? (
                              <Pressable
                                onPress={() => Linking.openURL(link.url)}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  backgroundColor: '#F5F5F2',
                                  borderRadius: 100,
                                  paddingHorizontal: 12,
                                  paddingVertical: 6,
                                  borderWidth: 1,
                                  borderColor: '#111',
                                }}
                              >
                                <Text
                                  style={{ fontSize: 12, color: '#111', fontWeight: '600' }}
                                >
                                  🔗 {link.label}
                                </Text>
                              </Pressable>
                            ) : null}
                            <PillButton
                              label={isAdded ? 'Added' : '+ Add'}
                              onPress={() => handleAdd(result)}
                              variant={isAdded ? 'ghost' : 'solid'}
                              loading={addingKey === key}
                              disabled={isAdded}
                            />
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => toggleExpanded(key)}
                            style={{ marginTop: 8, alignSelf: 'flex-start' }}
                          >
                            <Text style={{ color: '#111', fontSize: 13, fontWeight: '600' }}>
                              Explore more ›
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : categoryPlaces.length === 0 ? (
              <Text
                style={{
                  color: '#9CA3AF',
                  textAlign: 'center',
                  marginTop: 24,
                  fontSize: 14,
                  lineHeight: 22,
                }}
              >
                Search for {activeTab.label.toLowerCase()} to add to your trip.
              </Text>
            ) : null}
          </View>

          {/* ── Remove trip ── */}
          {onDeleteTrip ? (
            <View style={{ marginHorizontal: 16, marginTop: 32, marginBottom: 8, alignItems: 'center' }}>
              {confirmDelete ? (
                <View style={{ alignItems: 'center', gap: 12 }}>
                  <Text style={{ color: '#6B7280', fontSize: 13 }}>
                    Remove this trip permanently?
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      onPress={() => setConfirmDelete(false)}
                      style={{
                        paddingHorizontal: 22,
                        paddingVertical: 10,
                        borderRadius: 100,
                        backgroundColor: '#F0F0EE',
                      }}
                    >
                      <Text style={{ color: '#6B7280', fontWeight: '600', fontSize: 14 }}>
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={onDeleteTrip}
                      style={{
                        paddingHorizontal: 22,
                        paddingVertical: 10,
                        borderRadius: 100,
                        backgroundColor: '#EF4444',
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => setConfirmDelete(true)} style={{ paddingVertical: 14 }}>
                  <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '500' }}>
                    Remove trip
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* ── "Added to Day N" confirmation ── */}
      {slotDone ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: insets.bottom + 96,
            alignSelf: 'center',
            backgroundColor: '#111',
            borderRadius: 100,
            paddingHorizontal: 18,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <Text style={{ color: 'white', fontSize: 12 }}>✓</Text>
          <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>{slotDone}</Text>
        </View>
      ) : null}

      {/* ── Add-to-a-day picker ── */}
      <Modal
        visible={!!dayPickerFor}
        animationType="slide"
        transparent
        onRequestClose={() => setDayPickerFor(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(17,17,22,0.35)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => (slottingDay ? null : setDayPickerFor(null))} />
          <View
            style={{
              backgroundColor: '#FDFCFA',
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              maxHeight: SCREEN_HEIGHT * 0.7,
              paddingTop: 10,
            }}
          >
            <View style={{ alignItems: 'center', paddingBottom: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5E0' }} />
            </View>
            <View style={{ paddingHorizontal: 22, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0EE' }}>
              <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111' }} numberOfLines={1}>
                Add {dayPickerFor?.name}
              </Text>
              <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 12.5 }}>
                Pick a day — the concierge slots it into the right part.
              </Text>
            </View>

            {slottingDay ? (
              <View style={{ alignItems: 'center', paddingVertical: 34 }}>
                <ConciergeLoader caption="Slotting it in…" size={54} />
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 10 }}>
                {tripDays.length === 0 ? (
                  <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, lineHeight: 21 }}>
                    No itinerary yet — build one from the Itinerary tab, then you can drop finds into any day.
                  </Text>
                ) : (
                  tripDays.map((d) => (
                    <Pressable
                      key={d.id}
                      onPress={() => slotIntoDay(d)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        borderWidth: 1,
                        borderColor: '#F0F0EE',
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      })}
                    >
                      <View
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          backgroundColor: '#111',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}
                      >
                        <Text style={{ color: 'white', fontFamily: SERIF, fontSize: 13 }}>{d.day_number}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: SERIF, fontSize: 15.5, color: '#111' }} numberOfLines={1}>
                          {d.title}
                        </Text>
                        <Text style={{ color: '#9CA3AF', fontSize: 11.5, marginTop: 1 }}>
                          {(d.activities ?? []).length} stops
                        </Text>
                      </View>
                      <Text style={{ color: '#111', fontSize: 12.5, fontWeight: '700' }}>Add →</Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
