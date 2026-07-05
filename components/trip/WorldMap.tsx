import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { View } from 'react-native';
import { WorldMarker } from '../../lib/world';

// Native fallback (react-native-maps). Web uses WorldMap.web.tsx.
export function WorldMap({ markers, onSelect }: { markers: WorldMarker[]; onSelect?: (id: string, status: string) => void }) {
  if (markers.length === 0) return <View style={{ flex: 1 }} />;
  const lats = markers.map((m) => m.lat);
  const lngs = markers.map((m) => m.lng);
  const region = {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
    longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    latitudeDelta: Math.max(2, (Math.max(...lats) - Math.min(...lats)) * 1.5),
    longitudeDelta: Math.max(2, (Math.max(...lngs) - Math.min(...lngs)) * 1.5),
  };
  const ordered = [...markers].sort((a, b) => (a.when < b.when ? -1 : 1));
  return (
    <MapView style={{ flex: 1 }} provider={PROVIDER_DEFAULT} initialRegion={region}>
      {ordered.length > 1 ? (
        <Polyline coordinates={ordered.map((m) => ({ latitude: m.lat, longitude: m.lng }))} strokeColor="rgba(17,17,17,0.4)" strokeWidth={1.5} lineDashPattern={[2, 7]} />
      ) : null}
      {markers.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.lat, longitude: m.lng }}
          title={m.title}
          description={m.subtitle ?? undefined}
          pinColor={m.color}
          onPress={() => onSelect?.(m.id, m.status)}
        />
      ))}
    </MapView>
  );
}
