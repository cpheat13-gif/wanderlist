import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { PillButton } from '../PillButton';
import { FlightCard } from '../FlightCard';
import { buildItinerary } from '../../lib/ai';
import { supabase } from '../../lib/supabase';
import { Flight } from '../../lib/types';

export function FlightsTab({
  tripId,
  destination,
  country,
}: {
  tripId: string;
  destination: string;
  country?: string;
}) {
  const router = useRouter();
  const [departureCity, setDepartureCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<{
    fromCity: string;
    toCity: string;
    estimatedRoundTripUsd: number;
    note: string;
  } | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('flights')
        .select('*')
        .eq('trip_id', tripId)
        .order('departure_time')
        .then(({ data }) => setFlights(data ?? []));
    }, [tripId])
  );

  async function handleEstimate() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const result = await buildItinerary({
        destination,
        country,
        departureCity: departureCity.trim() || undefined,
      });
      setEstimate(result.flightEstimate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong estimating flights.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 110 }}>
      <Text className="text-neutral-900 text-2xl font-semibold mb-3">Flights</Text>

      <Text className="text-neutral-700 font-medium mb-1.5">Flying from</Text>
      <View className="flex-row items-center mb-3">
        <TextInput
          className="flex-1 bg-neutral-100 rounded-full px-4 py-3 text-neutral-900 mr-2"
          placeholder="e.g. New York"
          placeholderTextColor="#A3A3A3"
          value={departureCity}
          onChangeText={setDepartureCity}
        />
      </View>
      <PillButton
        label="Estimate flight cost"
        onPress={handleEstimate}
        variant="solid"
        loading={loading}
        disabled={!departureCity.trim()}
        className="mb-5"
      />

      {error ? <Text className="text-red-500 mb-3">{error}</Text> : null}

      {estimate ? (
        <View className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 mb-6">
          <Text className="text-neutral-900 font-semibold mb-1">
            {estimate.fromCity} → {estimate.toCity}
          </Text>
          <Text className="text-emerald-700 text-lg font-bold mb-1">
            ~${estimate.estimatedRoundTripUsd.toLocaleString()} round trip
          </Text>
          <Text className="text-neutral-500 text-xs">{estimate.note}</Text>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-neutral-900 text-lg font-semibold">Logged flights</Text>
        <Pressable onPress={() => router.push(`/trip/${tripId}/add-flight`)}>
          <Text className="text-emerald-600 font-medium">+ Add flight</Text>
        </Pressable>
      </View>

      {flights.length === 0 ? (
        <Text className="text-neutral-400">No flights logged yet.</Text>
      ) : (
        <View className="bg-neutral-900 rounded-2xl p-3">
          {flights.map((flight) => (
            <FlightCard key={flight.id} flight={flight} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
