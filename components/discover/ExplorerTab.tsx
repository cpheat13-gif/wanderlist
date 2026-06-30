import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { PillButton } from '../PillButton';
import { BookedPlaceRow } from './BookedPlaceRow';
import { exploreDestination, ExploreResult } from '../../lib/ai';
import { fetchDestinationPhoto, DestinationPhoto } from '../../lib/unsplash';
import { supabase } from '../../lib/supabase';
import { Place, PlaceCategory } from '../../lib/types';

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
  onPlaceAdded,
  onPlaceUpdate,
}: {
  tripId: string;
  destination: string;
  country?: string;
  coverPhotoUrl: string | null;
  places: Place[];
  onPlaceAdded?: (place: Place) => void;
  onPlaceUpdate?: (place: Place) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<PlaceCategory>('hotel');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ExploreResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photosByResult, setPhotosByResult] = useState<Record<string, DestinationPhoto | null>>({});
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [addingKey, setAddingKey] = useState<string | null>(null);

  const activeTab = CATEGORY_TABS.find((t) => t.key === activeCategory)!;
  const categoryPlaces = places.filter((p) => p.category === activeCategory);

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

  function handleChangeConfirmation(place: Place, value: string) {
    const updated = { ...place, confirmation_number: value || null };
    onPlaceUpdate?.(updated);
    supabase.from('places').update({ confirmation_number: updated.confirmation_number }).eq('id', place.id);
  }

  return (
    <View className="flex-1">
      {/* Full-screen photo background */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {coverPhotoUrl ? (
          <Image source={{ uri: coverPhotoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View className="flex-1 bg-neutral-900 items-center justify-center">
            <Text className="text-neutral-700 text-5xl">⊙</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(11,11,14,0.8)', '#0B0B0E']}
          locations={[0.15, 0.48, 0.72]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Photo spacer + title */}
        <View style={{ height: 175 }} className="justify-end px-5 pb-3">
          <Text className="text-white text-2xl font-bold">Explore {destination}</Text>
        </View>

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          className="mb-4"
          style={{ flexGrow: 0 }}
        >
          {CATEGORY_TABS.map((tab) => {
            const isActive = tab.key === activeCategory;
            return (
              <Pressable
                key={tab.key}
                onPress={() => handleCategoryChange(tab.key)}
                className="rounded-full px-4 py-2"
                style={
                  isActive
                    ? { backgroundColor: 'rgba(255,255,255,0.92)' }
                    : { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }
                }
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: isActive ? '#0B0B0E' : 'rgba(255,255,255,0.8)' }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 16 }}>
          {/* Search input */}
          <View className="flex-row items-center mb-3">
            <TextInput
              className="flex-1 rounded-full px-4 py-3 text-white mr-2"
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}
              placeholder={activeTab.searchHint}
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => runSearch(query)}
              returnKeyType="search"
            />
            <Pressable
              onPress={() => runSearch(query)}
              disabled={loading || !query.trim()}
              className="bg-emerald-600 rounded-full w-11 h-11 items-center justify-center"
              style={{ opacity: loading || !query.trim() ? 0.5 : 1 }}
            >
              <Text className="text-white text-lg">⌕</Text>
            </Pressable>
          </View>

          {/* Quick searches */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            className="mb-5"
            style={{ flexGrow: 0 }}
          >
            {activeTab.quickSearches.map((label) => (
              <Pressable
                key={label}
                onPress={() => {
                  setQuery(label);
                  runSearch(label);
                }}
                className="rounded-full px-3 py-1.5"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Already-added places for this category */}
          {categoryPlaces.length > 0 ? (
            <View className="mb-5">
              <Text className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">
                Added
              </Text>
              {categoryPlaces.map((place) => (
                <BookedPlaceRow
                  key={place.id}
                  place={place}
                  onToggleBooked={() => handleToggleBooked(place)}
                  onChangeConfirmation={(val) => handleChangeConfirmation(place, val)}
                />
              ))}
            </View>
          ) : null}

          {error ? <Text className="text-red-400 mb-3 text-sm">{error}</Text> : null}

          {/* Search results */}
          {loading ? (
            <View className="items-center mt-8">
              <ActivityIndicator color="#059669" />
            </View>
          ) : results.length > 0 ? (
            <View>
              <Text className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">
                Results
              </Text>
              {results.map((result) => {
                const key = resultKey(result);
                const photo = photosByResult[key];
                const isAdded = addedKeys.has(key);
                return (
                  <View
                    key={key}
                    className="flex-row bg-white border border-neutral-200 rounded-2xl mb-3 overflow-hidden"
                  >
                    <View className="w-28 h-28 bg-neutral-100">
                      {photo ? (
                        <Image
                          source={{ uri: photo.url }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      ) : (
                        <View className="w-full h-full items-center justify-center">
                          <ActivityIndicator color="#059669" />
                        </View>
                      )}
                    </View>
                    <View className="flex-1 px-4 py-3 justify-center">
                      <Text className="font-semibold text-neutral-900">{result.name}</Text>
                      <Text className="text-neutral-600 text-sm mt-0.5" numberOfLines={2}>
                        {result.blurb}
                      </Text>
                    </View>
                    <View className="justify-center pr-3">
                      <PillButton
                        label={isAdded ? 'Added' : '+ Add'}
                        onPress={() => handleAdd(result)}
                        variant={isAdded ? 'ghost' : 'solid'}
                        loading={addingKey === key}
                        disabled={isAdded}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : categoryPlaces.length === 0 ? (
            <Text className="text-white/40 text-center mt-6 text-sm">
              Search for {activeTab.label.toLowerCase()} to add to your trip.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
