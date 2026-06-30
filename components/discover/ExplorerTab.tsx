import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { PillButton } from '../PillButton';
import { colorForCategory } from '../../theme/colors';
import { exploreDestination, ExploreResult } from '../../lib/ai';
import { fetchDestinationPhoto, DestinationPhoto } from '../../lib/unsplash';
import { supabase } from '../../lib/supabase';

const QUICK_SEARCHES = ['Food', 'Hiking', 'Culture', 'Nightlife', 'Nature'];

function resultKey(r: ExploreResult) {
  return `${r.name}-${r.category}`;
}

export function ExplorerTab({
  tripId,
  destination,
  country,
}: {
  tripId: string;
  destination: string;
  country?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ExploreResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photosByResult, setPhotosByResult] = useState<Record<string, DestinationPhoto | null>>({});
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [addingKey, setAddingKey] = useState<string | null>(null);

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
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 110 }}>
        <Text className="text-neutral-900 text-2xl font-semibold mb-3">Explore {destination}</Text>

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
                <View className="w-20 h-20 bg-neutral-100">
                  {photo ? (
                    <Image source={{ uri: photo.url }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <View className="w-full h-full items-center justify-center">
                      <ActivityIndicator color="#059669" />
                    </View>
                  )}
                </View>
                <View className="flex-1 px-3 py-2 justify-center">
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
      </ScrollView>
    </View>
  );
}
