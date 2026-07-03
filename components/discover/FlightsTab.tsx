import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { FlightCard } from '../FlightCard';
import { SERIF } from '../../lib/editorial';
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
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: '#FDFCFA' }}
      contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
    >
      <Text style={{ fontFamily: SERIF, fontSize: 28, color: '#111', marginBottom: 12 }}>Flights</Text>

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
      <Pressable
        onPress={handleEstimate}
        disabled={loading || !departureCity.trim()}
        style={({ pressed }) => ({
          backgroundColor: '#111',
          borderRadius: 100,
          paddingVertical: 14,
          alignItems: 'center',
          marginBottom: 20,
          opacity: loading || !departureCity.trim() ? 0.4 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Estimate flight cost</Text>
        )}
      </Pressable>

      {error ? <Text className="text-red-500 mb-3">{error}</Text> : null}

      {estimate ? (
        <View className="bg-white border border-neutral-200 rounded-2xl px-4 py-3 mb-6">
          <Text className="text-neutral-900 font-semibold mb-1">
            {estimate.fromCity} → {estimate.toCity}
          </Text>
          <Text style={{ fontFamily: SERIF, fontSize: 18, color: '#111', marginBottom: 4 }}>
            ~${estimate.estimatedRoundTripUsd.toLocaleString()} round trip
          </Text>
          <Text className="text-neutral-500 text-xs">{estimate.note}</Text>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between mb-3">
        <Text style={{ fontFamily: SERIF, fontSize: 18, color: '#111' }}>Logged flights</Text>
        <Pressable onPress={() => router.push(`/trip/${tripId}/add-flight`)}>
          <Text className="text-neutral-900 font-semibold">+ Add flight</Text>
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
