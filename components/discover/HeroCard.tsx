import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Text, View } from 'react-native';
import { PillButton } from '../PillButton';
import { DestinationSuggestion } from '../../lib/ai';
import { DestinationPhoto } from '../../lib/unsplash';

export function HeroCard({
  suggestion,
  photo,
  width,
  height,
  loading,
  onGo,
}: {
  suggestion: DestinationSuggestion;
  photo: DestinationPhoto | null | undefined;
  width: number;
  height: number;
  loading: boolean;
  onGo: () => void;
}) {
  return (
    <View style={{ width, height }} className="px-1">
      <View className="flex-1 rounded-3xl overflow-hidden bg-neutral-200">
        {photo ? (
          <Image source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#059669" />
          </View>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(11,11,14,0.55)', 'rgba(11,11,14,0.96)']}
          locations={[0, 0.5, 1]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' }}
        />

        <View className="absolute bottom-0 left-0 right-0 p-6 items-center">
          <Text className="text-white text-3xl font-bold text-center mb-1">{suggestion.name}</Text>
          <Text className="text-white/70 text-sm uppercase mb-2" style={{ letterSpacing: 2 }}>
            {suggestion.country}
          </Text>
          <Text className="text-white/85 text-center mb-5" numberOfLines={3}>
            {suggestion.blurb}
          </Text>
          <Text className="text-white/60 text-lg mb-1">⌃</Text>
          <PillButton label="Go" onPress={onGo} variant="solid" loading={loading} className="px-10" />
        </View>
      </View>
    </View>
  );
}
