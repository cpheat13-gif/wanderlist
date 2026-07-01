import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorForCategory } from '../../../theme/colors';
import { supabase } from '../../../lib/supabase';
import { Place } from '../../../lib/types';

export default function TripMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('places')
        .select('*')
        .eq('trip_id', id)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .then(({ data }) => setPlaces(data ?? []));
    }, [id])
  );

  const pinned = places.filter((p) => p.lat != null && p.lng != null);
  const initialRegion = pinned[0]
    ? {
        latitude: pinned[0].lat as number,
        longitude: pinned[0].lng as number,
        latitudeDelta: 0.2,
        longitudeDelta: 0.2,
      }
    : { latitude: 20, longitude: 0, latitudeDelta: 60, longitudeDelta: 60 };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['bottom', 'left', 'right']}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        onPress={() => setSelected(null)}
      >
        {pinned.map((place) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.lat as number, longitude: place.lng as number }}
            pinColor={colorForCategory(place.category)}
            onPress={() => setSelected(place)}
          />
        ))}
      </MapView>

      {selected ? (
        <View className="absolute bottom-6 left-5 right-5 bg-surface border border-white/10 rounded-2xl p-4">
          <Text className="text-text text-base font-semibold">{selected.name}</Text>
          {selected.address ? <Text className="text-textMuted text-sm mt-1">{selected.address}</Text> : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
