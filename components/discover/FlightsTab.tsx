import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { FlightCard } from '../FlightCard';
import { SERIF } from '../../lib/editorial';
import { estimateFlight } from '../../lib/ai';
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
  const [fromAirport, setFromAirport] = useState('');
  const [toAirport, setToAirport] = useState('');
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
    if (loading || !fromAirport.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const result = await estimateFlight({
        from: fromAirport.trim(),
        to: toAirport.trim() || undefined,
        destination,
        country,
      });
      setEstimate(result);
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
      <Text style={{ fontFamily: SERIF, fontSize: 28, color: '#111', marginBottom: 4 }}>Flights</Text>
      <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#6B7280', fontSize: 13.5, marginBottom: 16 }}>
        Enter any airport code — SFO, LHR, DPS — and we'll estimate the fare.
      </Text>

      <View className="flex-row" style={{ gap: 10, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            From
          </Text>
          <TextInput
            className="rounded-2xl px-4 py-3"
            style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', color: '#111', fontSize: 16 }}
            placeholder="SFO"
            placeholderTextColor="#B6BAC2"
            value={fromAirport}
            onChangeText={setFromAirport}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={40}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            To · optional
          </Text>
          <TextInput
            className="rounded-2xl px-4 py-3"
            style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', color: '#111', fontSize: 16 }}
            placeholder={destination}
            placeholderTextColor="#B6BAC2"
            value={toAirport}
            onChangeText={setToAirport}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={40}
          />
        </View>
      </View>
      <Pressable
        onPress={handleEstimate}
        disabled={loading || !fromAirport.trim()}
        style={({ pressed }) => ({
          backgroundColor: '#111',
          borderRadius: 100,
          paddingVertical: 14,
          alignItems: 'center',
          marginBottom: 20,
          opacity: loading || !fromAirport.trim() ? 0.4 : 1,
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
