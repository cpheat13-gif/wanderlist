import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { PillButton } from '../PillButton';
import { PlaceCard } from '../PlaceCard';
import { planTrip } from '../../lib/ai';
import { supabase } from '../../lib/supabase';
import { Flight, Place, Trip } from '../../lib/types';

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayIndexFromScheduledAt(scheduledAt: string, startDate: string): number | null {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const sched = new Date(scheduledAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(sched)) return null;
  const diffDays = Math.round((sched - start) / 86400000);
  return diffDays >= 0 ? diffDays + 1 : null;
}

export function PlanTab({
  tripId,
  trip,
  destination,
  country,
  onTripUpdate,
}: {
  tripId: string;
  trip: Trip;
  destination: string;
  country?: string;
  onTripUpdate: (trip: Trip) => void;
}) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingDates, setEditingDates] = useState(!trip.start_date || !trip.end_date);
  const [startDateInput, setStartDateInput] = useState(trip.start_date ?? '');
  const [endDateInput, setEndDateInput] = useState(trip.end_date ?? '');
  const [savingDates, setSavingDates] = useState(false);
  const [building, setBuilding] = useState(false);
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

  async function saveDates() {
    if (!startDateInput.trim() || !endDateInput.trim()) return;
    setSavingDates(true);
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from('trips')
        .update({ start_date: startDateInput.trim(), end_date: endDateInput.trim() })
        .eq('id', tripId)
        .select()
        .single();
      if (updateError) throw new Error(updateError.message);
      if (data) onTripUpdate(data);
      setEditingDates(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save dates.');
    } finally {
      setSavingDates(false);
    }
  }

  async function buildItineraryPlan() {
    if (!trip.start_date || !trip.end_date || places.length === 0) return;
    setBuilding(true);
    setError(null);
    try {
      const result = await planTrip({
        destination,
        country,
        startDate: trip.start_date,
        endDate: trip.end_date,
        places: places.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          notes: p.notes,
          address: p.address,
        })),
        flights: flights.map((f) => ({
          id: f.id,
          fromAirport: f.from_airport,
          toAirport: f.to_airport,
          departureTime: f.departure_time,
          arrivalTime: f.arrival_time,
        })),
      });
      const startDate = trip.start_date;
      await Promise.all(
        result.schedule.map((item) =>
          supabase
            .from('places')
            .update({ scheduled_at: addDays(startDate, item.day - 1) })
            .eq('id', item.placeId)
        )
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong building your plan.');
    } finally {
      setBuilding(false);
    }
  }

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#059669" />
      </View>
    );
  }

  const grouped: Record<number, Place[]> = {};
  const unscheduled: Place[] = [];
  if (trip.start_date) {
    const startDate = trip.start_date;
    places.forEach((place) => {
      const dayIndex = place.scheduled_at ? dayIndexFromScheduledAt(place.scheduled_at, startDate) : null;
      if (dayIndex) {
        grouped[dayIndex] = grouped[dayIndex] ?? [];
        grouped[dayIndex].push(place);
      } else {
        unscheduled.push(place);
      }
    });
  } else {
    unscheduled.push(...places);
  }
  const dayNumbers = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 110 }}>
      <Text className="text-neutral-900 text-2xl font-semibold mb-3">Plan {destination}</Text>

      {editingDates ? (
        <View className="mb-5">
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-neutral-500 text-xs uppercase mb-1">Start date</Text>
              <TextInput
                className="bg-neutral-100 rounded-xl px-4 py-3 text-neutral-900"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#A3A3A3"
                value={startDateInput}
                onChangeText={setStartDateInput}
              />
            </View>
            <View className="flex-1">
              <Text className="text-neutral-500 text-xs uppercase mb-1">End date</Text>
              <TextInput
                className="bg-neutral-100 rounded-xl px-4 py-3 text-neutral-900"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#A3A3A3"
                value={endDateInput}
                onChangeText={setEndDateInput}
              />
            </View>
          </View>
          <PillButton
            label="Save dates"
            onPress={saveDates}
            variant="solid"
            loading={savingDates}
            disabled={!startDateInput.trim() || !endDateInput.trim()}
          />
        </View>
      ) : (
        <Pressable
          onPress={() => setEditingDates(true)}
          className="flex-row items-center justify-between mb-5 bg-neutral-100 rounded-xl px-4 py-3"
        >
          <Text className="text-neutral-700">
            {trip.start_date} → {trip.end_date}
          </Text>
          <Text className="text-emerald-700 text-sm font-medium">Edit</Text>
        </Pressable>
      )}

      {error ? <Text className="text-red-500 mb-3">{error}</Text> : null}

      {places.length === 0 ? (
        <Text className="text-neutral-400 text-center mt-10">Add places from the Explorer tab first.</Text>
      ) : (
        <>
          <PillButton
            label={dayNumbers.length > 0 ? 'Rebuild itinerary' : 'Build itinerary'}
            onPress={buildItineraryPlan}
            variant="solid"
            loading={building}
            disabled={!trip.start_date || !trip.end_date}
            className="mb-5"
          />

          {dayNumbers.map((day) => (
            <View key={day} className="mb-5">
              <Text className="text-neutral-900 font-semibold mb-2">
                Day {day} · {addDays(trip.start_date as string, day - 1)}
              </Text>
              <View className="bg-neutral-900 rounded-2xl p-3">
                {grouped[day].map((place) => (
                  <PlaceCard key={place.id} place={place} />
                ))}
              </View>
            </View>
          ))}

          {unscheduled.length > 0 ? (
            <View className="mb-5">
              <Text className="text-neutral-900 font-semibold mb-2">Unscheduled</Text>
              <View className="bg-neutral-900 rounded-2xl p-3">
                {unscheduled.map((place) => (
                  <PlaceCard key={place.id} place={place} />
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
