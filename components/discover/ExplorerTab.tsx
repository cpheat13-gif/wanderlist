import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { PillButton } from '../PillButton';
import { colorForCategory } from '../../theme/colors';
import { exploreDestination, ExploreResult } from '../../lib/ai';
import { fetchDestinationPhoto, DestinationPhoto } from '../../lib/unsplash';
import { supabase } from '../../lib/supabase';

const QUICK_SEARCHES = ['Food', 'Hiking', 'Culture', 'Nightlife', 'Nature'];
const HIGHLIGHTS_QUERY = 'top highlights and must-see spots';

function resultKey(r: ExploreResult) {
  return `${r.name}-${r.category}`;
}

export function ExplorerTab({
  tripId,
  destination,
  country,
  coverPhotoUrl,
}: {
  tripId: string;
  destination: string;
  country?: string;
  coverPhotoUrl: string | null;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ExploreResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlights, setHighlights] = useState<ExploreResult[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photosByResult, setPhotosByResult] = useState<Record<string, DestinationPhoto | null>>({});
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [addingKey, setAddingKey] = useState<string | null>(null);

  useEffect(() => {
    setHighlightsLoading(true);
    exploreDestination({ destination, country, query: HIGHLIGHTS_QUERY })
      .then((result) => {
        setHighlights(result.results);
        result.results.forEach((r) => {
          fetchDestinationPhoto(r.photoQuery).then((photo) => {
            setPhotosByResult((prev) => ({ ...prev, [resultKey(r)]: photo }));
          });
        });
      })
      .catch(() => {
        // Highlights are a nice-to-have; a failure here shouldn't block search.
      })
      .finally(() => setHighlightsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setError(null);
    setLoading(true);
    setResults([]);
    try {
      const result = await exploreDestination({ destination, country, query: trimmed });
      setResults(result.results);
      result.results.forEach((r) => {
        fetchDestinationPhoto(r.photoQuery).then((photo) => {
          setPhotosByResult((prev) => ({ ...prev, [resultKey(r)]: photo }));
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong searching.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(result: ExploreResult) {
    const key = resultKey(result);
    if (addedKeys.has(key) || addingKey) return;
    setAddingKey(key);
    try {
      const { error: insertError } = await supabase.from('places').insert({
        trip_id: tripId,
        name: result.name,
        category: result.category,
        notes: result.blurb,
        is_booked: false,
      });
      if (insertError) throw new Error(insertError.message);
      setAddedKeys((prev) => new Set(prev).add(key));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this place.');
    } finally {
      setAddingKey(null);
    }
  }

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 110 }}>
        <View className="w-full bg-neutral-200" style={{ height: 256 }}>
          {coverPhotoUrl ? (
            <Image source={{ uri: coverPhotoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-neutral-400 text-3xl">⊙</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(11,11,14,0.55)', 'rgba(11,11,14,0.96)']}
            locations={[0, 0.5, 1]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' }}
          />
          <View className="absolute bottom-0 left-0 right-0 p-5">
            <Text className="text-white text-2xl font-bold">Explore {destination}</Text>
          </View>
        </View>

        <View style={{ padding: 20 }}>
          <View className="flex-row items-center mb-3">
            <TextInput
              className="flex-1 bg-neutral-100 rounded-full px-4 py-3 text-neutral-900 mr-2"
              placeholder="e.g. hiking, rooftop bars..."
              placeholderTextColor="#A3A3A3"
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} className="mb-4">
            {QUICK_SEARCHES.map((label) => (
              <Pressable
                key={label}
                onPress={() => {
                  setQuery(label);
                  runSearch(label);
                }}
                className="rounded-full px-4 py-2 border border-neutral-200 bg-neutral-50"
              >
                <Text className="text-neutral-700 text-sm">{label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {highlightsLoading || highlights.length > 0 ? (
            <View className="mb-5">
              <Text className="text-neutral-900 font-semibold mb-2">Highlights</Text>
              {highlightsLoading ? (
                <View className="items-center py-6">
                  <ActivityIndicator color="#059669" />
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                  {highlights.map((highlight) => {
                    const key = resultKey(highlight);
                    const photo = photosByResult[key];
                    const isAdded = addedKeys.has(key);
                    return (
                      <View
                        key={key}
                        style={{ width: 220 }}
                        className="bg-white border border-neutral-200 rounded-2xl overflow-hidden"
                      >
                        <View className="w-full h-36 bg-neutral-100">
                          {photo ? (
                            <Image source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                          ) : (
                            <View className="flex-1 items-center justify-center">
                              <ActivityIndicator color="#059669" />
                            </View>
                          )}
                        </View>
                        <View className="p-2">
                          <Text className="font-semibold text-neutral-900 text-sm" numberOfLines={1}>
                            {highlight.name}
                          </Text>
                          <Text className="text-neutral-500 text-xs mb-2" numberOfLines={2}>
                            {highlight.blurb}
                          </Text>
                          <PillButton
                            label={isAdded ? 'Added' : '+ Add'}
                            onPress={() => handleAdd(highlight)}
                            variant={isAdded ? 'ghost' : 'solid'}
                            loading={addingKey === key}
                            disabled={isAdded}
                          />
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          ) : null}

          {error ? <Text className="text-red-500 mb-3">{error}</Text> : null}

          {loading ? (
            <View className="items-center mt-10">
              <ActivityIndicator color="#059669" />
            </View>
          ) : results.length === 0 ? (
            <Text className="text-neutral-400 text-center mt-10">
              Search for hotels, restaurants, or activities to add to your trip.
            </Text>
          ) : (
            results.map((result) => {
              const key = resultKey(result);
              const photo = photosByResult[key];
              const isAdded = addedKeys.has(key);
              return (
                <View key={key} className="flex-row bg-white border border-neutral-200 rounded-2xl mb-3 overflow-hidden">
                  <View className="w-28 h-28 bg-neutral-100">
                    {photo ? (
                      <Image source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <View className="w-full h-full items-center justify-center">
                        <ActivityIndicator color="#059669" />
                      </View>
                    )}
                  </View>
                  <View className="flex-1 px-4 py-3 justify-center">
                    <View className="flex-row items-center gap-1.5 mb-0.5">
                      <View className="w-2 h-2 rounded-full" style={{ backgroundColor: colorForCategory(result.category) }} />
                      <Text className="text-neutral-400 text-[10px] uppercase">{result.category}</Text>
                    </View>
                    <Text className="font-semibold text-neutral-900">{result.name}</Text>
                    <Text className="text-neutral-600 text-sm" numberOfLines={2}>
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
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
