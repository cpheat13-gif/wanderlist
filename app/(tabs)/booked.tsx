import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookedFlightRow } from '../../components/discover/BookedFlightRow';
import { BookedPlaceRow } from '../../components/discover/BookedPlaceRow';
import { SectionLabel } from '../../components/SectionLabel';
import { supabase } from '../../lib/supabase';
import { Flight, Place, Trip } from '../../lib/types';

export default function BookedScreen() {
  const [trips, setTrips] = useState<Record<string, Trip>>({});
  const [placesByTrip, setPlacesByTrip] = useState<Record<string, Place[]>>({});
  const [flightsByTrip, setFlightsByTrip] = useState<Record<string, Flight[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [placesRes, flightsRes] = await Promise.all([
      supabase.from('places').select('*').eq('is_booked', true).order('created_at'),
      supabase.from('flights').select('*').eq('is_booked', true).order('departure_time'),
    ]);
    const bookedPlaces = placesRes.data ?? [];
    const bookedFlights = flightsRes.data ?? [];

    const tripIds = Array.from(new Set([...bookedPlaces.map((p) => p.trip_id), ...bookedFlights.map((f) => f.trip_id)]));

    if (tripIds.length === 0) {
      setTrips({});
      setPlacesByTrip({});
      setFlightsByTrip({});
      setLoading(false);
      return;
    }

    const { data: tripsData } = await supabase.from('trips').select('*').in('id', tripIds);
    const tripsById: Record<string, Trip> = {};
    (tripsData ?? []).forEach((t) => {
      tripsById[t.id] = t;
    });
    setTrips(tripsById);

    const placesGrouped: Record<string, Place[]> = {};
    bookedPlaces.forEach((place) => {
      if (!placesGrouped[place.trip_id]) placesGrouped[place.trip_id] = [];
      placesGrouped[place.trip_id].push(place);
    });
    setPlacesByTrip(placesGrouped);

    const flightsGrouped: Record<string, Flight[]> = {};
    bookedFlights.forEach((flight) => {
      if (!flightsGrouped[flight.trip_id]) flightsGrouped[flight.trip_id] = [];
      flightsGrouped[flight.trip_id].push(flight);
    });
    setFlightsByTrip(flightsGrouped);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function togglePlaceBooked(place: Place) {
    setPlacesByTrip((prev) => ({
      ...prev,
      [place.trip_id]: (prev[place.trip_id] ?? []).filter((p) => p.id !== place.id),
    }));
    await supabase.from('places').update({ is_booked: false }).eq('id', place.id);
  }

  async function changePlaceConfirmation(place: Place, value: string) {
    const trimmed = value.trim() || null;
    setPlacesByTrip((prev) => ({
      ...prev,
      [place.trip_id]: (prev[place.trip_id] ?? []).map((p) =>
        p.id === place.id ? { ...p, confirmation_number: trimmed } : p
      ),
    }));
    await supabase.from('places').update({ confirmation_number: trimmed }).eq('id', place.id);
  }

  async function toggleFlightBooked(flight: Flight) {
    setFlightsByTrip((prev) => ({
      ...prev,
      [flight.trip_id]: (prev[flight.trip_id] ?? []).filter((f) => f.id !== flight.id),
    }));
    await supabase.from('flights').update({ is_booked: false }).eq('id', flight.id);
  }

  async function changeFlightConfirmation(flight: Flight, value: string) {
    const trimmed = value.trim() || null;
    setFlightsByTrip((prev) => ({
      ...prev,
      [flight.trip_id]: (prev[flight.trip_id] ?? []).map((f) =>
        f.id === flight.id ? { ...f, confirmation_number: trimmed } : f
      ),
    }));
    await supabase.from('flights').update({ confirmation_number: trimmed }).eq('id', flight.id);
  }

  const tripIds = Object.keys(trips);
  const hasAny = tripIds.some(
    (id) => (placesByTrip[id]?.length ?? 0) > 0 || (flightsByTrip[id]?.length ?? 0) > 0
  );

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="px-5 pt-4 pb-1">
        <SectionLabel>Booked</SectionLabel>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#D4A857" />}
      >
        {!loading && !hasAny ? (
          <View className="items-center mt-20">
            <Text className="text-textMuted text-base text-center">
              Nothing booked yet — mark places as booked from the Planning tab.
            </Text>
          </View>
        ) : null}

        {tripIds.map((tripId) => {
          const trip = trips[tripId];
          const flights = flightsByTrip[tripId] ?? [];
          const places = placesByTrip[tripId] ?? [];
          if (flights.length === 0 && places.length === 0) return null;
          return (
            <View key={tripId} className="mb-7">
              <Text className="text-text text-xl font-bold mb-3">{trip?.title ?? 'Trip'}</Text>
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
                  onToggleBooked={() => togglePlaceBooked(place)}
                  onChangeConfirmation={(value) => changePlaceConfirmation(place, value)}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
