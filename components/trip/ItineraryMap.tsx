import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { View } from 'react-native';
import { MapStop } from '../../lib/types';

// Native map (react-native-maps). The web build uses ItineraryMap.web.tsx instead.
export function ItineraryMap({ stops, onSelectDay }: { stops: MapStop[]; onSelectDay?: (day: number) => void }) {
  if (stops.length === 0) return <View style={{ flex: 1 }} />;

  const lats = stops.map((s) => s.lat);
  const lngs = stops.map((s) => s.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const region = {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.04, (maxLat - minLat) * 1.6),
    longitudeDelta: Math.max(0.04, (maxLng - minLng) * 1.6),
  };

  return (
    <MapView style={{ flex: 1 }} provider={PROVIDER_DEFAULT} initialRegion={region}>
      {stops.map((s) => (
        <Marker
          key={s.ref}
          coordinate={{ latitude: s.lat, longitude: s.lng }}
          title={s.title}
          description={`Day ${s.dayNumber}`}
          pinColor={s.color}
          onPress={() => onSelectDay?.(s.dayNumber)}
        />
      ))}
    </MapView>
  );
}
