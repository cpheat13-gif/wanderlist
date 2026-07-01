import { Text, View } from 'react-native';
import { colorForCategory } from '../theme/colors';
import { Place } from '../lib/types';

export function PlaceCard({ place }: { place: Place }) {
  return (
    <View className="flex-row items-start gap-3 bg-surface border border-white/10 rounded-xl p-4 mb-3">
      <View
        className="w-2.5 h-2.5 rounded-full mt-1.5"
        style={{ backgroundColor: colorForCategory(place.category) }}
      />
      <View className="flex-1">
        <Text className="text-text text-base font-semibold">{place.name}</Text>
        {place.address ? (
          <Text className="text-textMuted text-sm mt-0.5">{place.address}</Text>
        ) : null}
        {place.notes ? (
          <Text className="text-textMuted text-sm mt-1">{place.notes}</Text>
        ) : null}
      </View>
    </View>
  );
}
