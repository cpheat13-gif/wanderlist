import { useRef } from 'react';
import { ActivityIndicator, Animated, Dimensions, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { DestinationPhoto } from '../../lib/unsplash';

const COMMIT_THRESHOLD = -100;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export function LivePhotoHero({
  destinationText,
  photo,
  loading,
  onCommit,
}: {
  destinationText: string;
  photo: DestinationPhoto | null;
  loading: boolean;
  onCommit: () => void;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const canCommit = destinationText.trim().length > 0;

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((event) => {
      if (!canCommit) return;
      translateY.setValue(Math.min(0, event.translationY));
    })
    .onEnd((event) => {
      if (!canCommit) return;
      if (event.translationY < COMMIT_THRESHOLD) {
        Animated.timing(translateY, {
          toValue: -SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }).start(() => onCommit());
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={{ flex: 1, transform: [{ translateY }] }}>
        <View className="flex-1 bg-surfaceAlt">
          {photo ? (
            <Image source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <View className="flex-1 items-center justify-center">
              {loading ? (
                <ActivityIndicator color="#D4A857" />
              ) : (
                <Text className="text-textMuted text-3xl">⊙</Text>
              )}
            </View>
          )}

          <LinearGradient
            colors={['transparent', 'rgba(11,11,14,0.55)', 'rgba(11,11,14,0.96)']}
            locations={[0, 0.5, 1]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' }}
          />

          <View className="absolute bottom-0 left-0 right-0 p-6 items-center">
            {destinationText.trim() ? (
              <Text className="text-text text-3xl font-bold text-center mb-3" numberOfLines={2}>
                {destinationText}
              </Text>
            ) : null}
            {canCommit ? (
              <>
                <Text className="text-textMuted text-lg mb-1">⌃</Text>
                <Text className="text-textMuted text-xs uppercase" style={{ letterSpacing: 2 }}>
                  Swipe up to explore
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
