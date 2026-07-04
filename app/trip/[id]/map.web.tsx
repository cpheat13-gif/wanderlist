import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TripMapWebFallback() {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-text text-lg font-semibold text-center mb-2">Map not available on web</Text>
        <Text className="text-textMuted text-sm text-center">
          Open Getaway Club in Expo Go on your phone to see the map of places for this trip.
        </Text>
      </View>
    </SafeAreaView>
  );
}
