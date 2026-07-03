import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorForCategory } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { SERIF } from '../../lib/editorial';
import { Flight, Place, Trip } from '../../lib/types';

export default function BookedScreen() {
  const router = useRouter();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 14 }}>
        <Text
          style={{
            color: '#9CA3AF',
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Set in stone
        </Text>
        <Text style={{ fontFamily: SERIF, fontSize: 34, color: '#111', letterSpacing: -0.5 }}>
          Booked
        </Text>
        <Text style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: '#6B7280', marginTop: 4 }}>
          Confirmed plans across all your journeys.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#111" />}
      >
        {!loading && !hasAny ? (
          <View style={{ alignItems: 'center', marginTop: 56, paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>🎟</Text>
            <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 20, marginBottom: 8, textAlign: 'center' }}>
              Nothing booked yet
            </Text>
            <Text
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                color: '#9CA3AF',
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 22,
                marginBottom: 22,
              }}
            >
              Check off places inside a trip once{'\n'}they're booked and they'll gather here.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)')}
              style={({ pressed }) => ({
                backgroundColor: '#111',
                borderRadius: 100,
                paddingHorizontal: 26,
                paddingVertical: 13,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Go to Planning</Text>
            </Pressable>
          </View>
        ) : null}

        {tripIds.map((tripId) => {
          const trip = trips[tripId];
          const flights = flightsByTrip[tripId] ?? [];
          const places = placesByTrip[tripId] ?? [];
          if (flights.length === 0 && places.length === 0) return null;
          return (
            <View key={tripId} style={{ marginBottom: 28 }}>
              <Pressable onPress={() => router.push(`/discover/${tripId}`)} hitSlop={4}>
                <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 20, marginBottom: 12, letterSpacing: -0.3 }}>
                  {trip?.title ?? 'Trip'} ›
                </Text>
              </Pressable>

              {flights.map((flight) => (
                <View
                  key={flight.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: '#F0F0EE',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, marginRight: 10 }}>✈️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#111', fontWeight: '600', fontSize: 15 }}>
                        {flight.from_airport} → {flight.to_airport}
                      </Text>
                      {flight.airline || flight.flight_number ? (
                        <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
                          {[flight.airline, flight.flight_number].filter(Boolean).join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => toggleFlightBooked(flight)}
                      hitSlop={8}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        backgroundColor: '#111',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                    </Pressable>
                  </View>
                  <TextInput
                    style={{
                      marginTop: 10,
                      backgroundColor: 'white',
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      color: '#111',
                      fontSize: 13,
                    }}
                    placeholder="Confirmation #"
                    placeholderTextColor="#C4C4C4"
                    defaultValue={flight.confirmation_number ?? ''}
                    onEndEditing={(e) => changeFlightConfirmation(flight, e.nativeEvent.text)}
                  />
                </View>
              ))}

              {places.map((place) => (
                <View
                  key={place.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: '#F0F0EE',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                        <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                          {place.notes}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => togglePlaceBooked(place)}
                      hitSlop={8}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        backgroundColor: '#111',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                    </Pressable>
                  </View>
                  <TextInput
                    style={{
                      marginTop: 10,
                      backgroundColor: 'white',
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      color: '#111',
                      fontSize: 13,
                    }}
                    placeholder="Confirmation #"
                    placeholderTextColor="#C4C4C4"
                    defaultValue={place.confirmation_number ?? ''}
                    onEndEditing={(e) => changePlaceConfirmation(place, e.nativeEvent.text)}
                  />
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
