import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface PreviewDestination {
  name: string;
  location: string;
  description: string;
  rating: string;
  bestTime: string;
  days: string;
}

export function DestinationPreview({
  dest,
  photoUrl,
  visible,
  onClose,
  onAdd,
  adding,
}: {
  dest: PreviewDestination | null;
  photoUrl: string | null;
  visible: boolean;
  onClose: () => void;
  onAdd: () => void;
  adding: boolean;
}) {
  const insets = useSafeAreaInsets();

  if (!dest) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent transparent={false}>
      <View style={{ flex: 1, backgroundColor: '#111' }}>
        {/* Full-bleed photo */}
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={{ flex: 1 }} contentFit="cover" />
        ) : (
          <View style={{ flex: 1, backgroundColor: '#1C1C2E' }} />
        )}

        {/* Subtle gradient at top for button readability */}
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'transparent']}
          locations={[0, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110 }}
        />

        {/* Back button */}
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: insets.top + 12,
            left: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.92)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 20, color: '#111', lineHeight: 24 }}>‹</Text>
        </Pressable>

        {/* Bookmark icon (decorative, matches reference) */}
        <View
          style={{
            position: 'absolute',
            top: insets.top + 12,
            right: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.92)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16 }}>🔖</Text>
        </View>

        {/* Frosted bottom card */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(14,14,22,0.78)',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 22,
            paddingTop: 22,
            paddingBottom: insets.bottom + 20,
          }}
        >
          {/* Drag indicator */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' }} />
          </View>

          {/* Name + location */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
            <Text style={{ fontSize: 16, marginRight: 8, marginTop: 2 }}>📍</Text>
            <View>
              <Text style={{ color: 'white', fontSize: 22, fontWeight: '700', letterSpacing: -0.3 }}>
                {dest.name}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 }}>
                {dest.location}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 14 }} />

          {/* Stats row — hidden for custom searches with no curated data */}
          {dest.rating !== '—' ? (
            <View style={{ flexDirection: 'row', gap: 22, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={{ fontSize: 14 }}>⭐</Text>
                <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>{dest.rating}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={{ fontSize: 14 }}>☀️</Text>
                <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>{dest.bestTime}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={{ fontSize: 14 }}>📅</Text>
                <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>{dest.days} days</Text>
              </View>
            </View>
          ) : null}

          {/* Description */}
          <Text
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 10,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              marginBottom: 6,
            }}
          >
            Description
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.82)',
              fontSize: 13,
              lineHeight: 20,
              marginBottom: 22,
            }}
            numberOfLines={3}
          >
            {dest.description}
          </Text>

          {/* CTA */}
          <Pressable
            onPress={onAdd}
            disabled={adding}
            style={({ pressed }) => ({
              backgroundColor: 'white',
              borderRadius: 100,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: adding ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            {adding ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text style={{ color: '#111', fontSize: 15, fontWeight: '700' }}>
                Add to Bucket List
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
