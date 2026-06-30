import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import { Trip } from '../lib/types';

const STATUS_LABEL: Record<Trip['status'], string> = {
  idea: 'IDEA',
  booked: 'BOOKED',
  past: 'PAST',
};

export function TripCard({
  trip,
  onPress,
  onLongPress,
}: {
  trip: Trip;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="rounded-2xl overflow-hidden mb-4 h-56 bg-surfaceAlt"
    >
      {trip.cover_photo_url ? (
        <Image
          source={{ uri: trip.cover_photo_url }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-textMuted text-3xl">✈︎</Text>
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(11,11,14,0.55)', 'rgba(11,11,14,0.96)']}
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '75%' }}
      />

      <View className="absolute top-3 right-3 bg-black/60 rounded-full px-3 py-1">
        <Text className="text-text text-xs font-semibold" style={{ letterSpacing: 2 }}>
          {STATUS_LABEL[trip.status]}
        </Text>
      </View>

      <View className="absolute bottom-0 left-0 right-0 p-4">
        {trip.destination ? (
          <Text className="text-textMuted text-xs font-semibold uppercase mb-1" style={{ letterSpacing: 3 }}>
            {trip.destination}
          </Text>
        ) : null}
        <Text className="text-text text-xl font-bold uppercase" style={{ letterSpacing: 1 }}>
          {trip.title}
        </Text>
      </View>
    </Pressable>
  );
}
