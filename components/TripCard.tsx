import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { Trip } from '../lib/types';

const STATUS_LABEL: Record<Trip['status'], string> = {
  idea: 'IDEA',
  booked: 'BOOKED',
  past: 'PAST',
};

export function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl overflow-hidden bg-surface border border-white/10 mb-4"
    >
      <View className="h-40 bg-surfaceAlt">
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
        <View className="absolute top-3 right-3 bg-black/60 rounded-full px-3 py-1">
          <Text className="text-text text-xs font-semibold" style={{ letterSpacing: 2 }}>
            {STATUS_LABEL[trip.status]}
          </Text>
        </View>
      </View>
      <View className="p-4">
        <Text className="text-text text-lg font-bold uppercase" style={{ letterSpacing: 1 }}>
          {trip.title}
        </Text>
        {trip.destination ? (
          <Text className="text-textMuted text-sm mt-1">{trip.destination}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
