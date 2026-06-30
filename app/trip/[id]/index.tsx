import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlightCard } from '../../../components/FlightCard';
import { PillButton } from '../../../components/PillButton';
import { PlaceCard } from '../../../components/PlaceCard';
import { SectionLabel } from '../../../components/SectionLabel';
import { TikTokEmbed } from '../../../components/TikTokEmbed';
import { supabase } from '../../../lib/supabase';
import { Flight, Place, PlaceCategory, Trip } from '../../../lib/types';

const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  hotel: 'Hotels',
  restaurant: 'Restaurants',
  activity: 'Activities',
};

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);

  const load = useCallback(async () => {
    const [tripRes, flightsRes, placesRes] = await Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase.from('flights').select('*').eq('trip_id', id).order('departure_time'),
      supabase.from('places').select('*').eq('trip_id', id).order('created_at'),
    ]);
    setTrip(tripRes.data ?? null);
    setFlights(flightsRes.data ?? []);
    setPlaces(placesRes.data ?? []);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!trip) {
    return <SafeAreaView className="flex-1 bg-bg" />;
  }

  const placesByCategory: Record<PlaceCategory, Place[]> = {
    hotel: places.filter((p) => p.category === 'hotel'),
    restaurant: places.filter((p) => p.category === 'restaurant'),
    activity: places.filter((p) => p.category === 'activity'),
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['bottom', 'left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {trip.cover_photo_url ? (
          <View className="h-56 mb-5">
            <Image source={{ uri: trip.cover_photo_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            {trip.cover_photo_credit_name ? (
              <Text
                className="absolute bottom-2 right-3 text-text text-xs"
                onPress={() => trip.cover_photo_credit_url && Linking.openURL(trip.cover_photo_credit_url)}
              >
                Photo by {trip.cover_photo_credit_name} on Unsplash
              </Text>
            ) : null}
          </View>
        ) : null}

        <View className="px-5 pt-4">
          <Text className="text-text text-2xl font-bold uppercase mb-1" style={{ letterSpacing: 1 }}>
            {trip.title}
          </Text>
          {trip.destination ? <Text className="text-textMuted text-base mb-5">{trip.destination}</Text> : null}

          <View className="flex-row gap-3 mb-6">
            <PillButton label="+ Place" onPress={() => router.push(`/trip/${id}/add-place`)} variant="glass" />
            <PillButton label="+ Flight" onPress={() => router.push(`/trip/${id}/add-flight`)} variant="glass" />
            <PillButton label="Map" onPress={() => router.push(`/trip/${id}/map`)} variant="glass" />
          </View>

          {trip.tiktok_url ? (
            <View className="mb-6">
              <SectionLabel className="mb-3">Inspo</SectionLabel>
              <TikTokEmbed url={trip.tiktok_url} />
            </View>
          ) : null}

          {flights.length > 0 ? (
            <View className="mb-6">
              <SectionLabel className="mb-3">Flights</SectionLabel>
              {flights.map((flight) => (
                <FlightCard key={flight.id} flight={flight} />
              ))}
            </View>
          ) : null}

          {(Object.keys(placesByCategory) as PlaceCategory[]).map((category) => {
            const list = placesByCategory[category];
            if (list.length === 0) return null;
            return (
              <View className="mb-6" key={category}>
                <SectionLabel className="mb-3">{CATEGORY_LABEL[category]}</SectionLabel>
                {list.map((place) => (
                  <PlaceCard key={place.id} place={place} />
                ))}
              </View>
            );
          })}

          {flights.length === 0 && places.length === 0 && !trip.tiktok_url ? (
            <Text className="text-textMuted text-base mt-10 text-center">
              Nothing here yet — add a flight or a place to get started.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
