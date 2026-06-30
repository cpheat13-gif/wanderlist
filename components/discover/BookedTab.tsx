import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { BookedPlaceRow } from './BookedPlaceRow';
import { BookedFlightRow } from './BookedFlightRow';
import { buildItinerary } from '../../lib/ai';
import { supabase } from '../../lib/supabase';
import { Flight, Place } from '../../lib/types';

export function BookedTab({
  tripId,
  destination,
  country,
}: {
  tripId: string;
  destination: string;
  country?: string;
}) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [placesRes, flightsRes] = await Promise.all([
      supabase.from('places').select('*').eq('trip_id', tripId).order('created_at'),
      supabase.from('flights').select('*').eq('trip_id', tripId).order('departure_time'),
    ]);
    setPlaces(placesRes.data ?? []);
    setFlights(flightsRes.data ?? []);
    setLoaded(true);
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!loaded || seeding || places.length > 0) return;
    seedItinerary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, places.length]);

  async function seedItinerary() {
    setSeeding(true);
    setError(null);
    try {
      const result = await buildItinerary({ destination, country });
      const seeded = result.days.flatMap((day) =>
        day.items.map((item) => ({
          trip_id: tripId,
          name: item.title,
          category: item.category,
          notes: `Day ${day.day}: ${item.description}`,
          is_booked: false,
        }))
      );
      if (seeded.length > 0) {
        const { error: insertError } = await supabase.from('places').insert(seeded);
        if (insertError) throw new Error(insertError.message);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong building your itinerary.');
    } finally {
      setSeeding(false);
    }
  }

  async function toggleBooked(place: Place) {
    const next = !place.is_booked;
    setPlaces((prev) => prev.map((p) => (p.id === place.id ? { ...p, is_booked: next } : p)));
    await supabase.from('places').update({ is_booked: next }).eq('id', place.id);
  }

  async function changeConfirmation(place: Place, value: string) {
    const trimmed = value.trim() || null;
    setPlaces((prev) => prev.map((p) => (p.id === place.id ? { ...p, confirmation_number: trimmed } : p)));
    await supabase.from('places').update({ confirmation_number: trimmed }).eq('id', place.id);
  }

  async function toggleFlightBooked(flight: Flight) {
    const next = !flight.is_booked;
    setFlights((prev) => prev.map((f) => (f.id === flight.id ? { ...f, is_booked: next } : f)));
    await supabase.from('flights').update({ is_booked: next }).eq('id', flight.id);
  }

  async function changeFlightConfirmation(flight: Flight, value: string) {
    const trimmed = value.trim() || null;
    setFlights((prev) => prev.map((f) => (f.id === flight.id ? { ...f, confirmation_number: trimmed } : f)));
    await supabase.from('flights').update({ confirmation_number: trimmed }).eq('id', flight.id);
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 110 }}>
      <Text className="text-neutral-900 text-2xl font-semibold mb-3">Booked stuff</Text>

      {error ? <Text className="text-red-500 mb-3">{error}</Text> : null}

      {seeding ? (
        <View className="items-center mt-10">
          <ActivityIndicator color="#059669" />
          <Text className="text-neutral-400 mt-3">Building your itinerary...</Text>
        </View>
      ) : places.length === 0 && flights.length === 0 ? (
        <Text className="text-neutral-400 mt-4">Nothing logged yet.</Text>
      ) : (
        <View className="bg-neutral-900 rounded-2xl p-3">
          {flights.map((flight) => (
            <BookedFlightRow
              key={flight.id}
              flight={flight}
              onToggleBooked={() => toggleFlightBooked(flight)}
              onChangeConfirmation={(value) => changeFlightConfirmation(flight, value)}
            />
          ))}
          {places.map((place) => (
            <BookedPlaceRow
              key={place.id}
              place={place}
              onToggleBooked={() => toggleBooked(place)}
              onChangeConfirmation={(value) => changeConfirmation(place, value)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
