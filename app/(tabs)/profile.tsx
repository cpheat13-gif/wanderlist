import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { CARD_SHADOW, SERIF } from '../../lib/editorial';

function HubRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#F0F0EE',
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 16,
        ...CARD_SHADOW,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#F5F5F2', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
        <Text style={{ fontSize: 19 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: SERIF, fontSize: 17, color: '#111' }}>{title}</Text>
        <Text style={{ color: '#9CA3AF', fontSize: 12.5, marginTop: 2 }}>{subtitle}</Text>
      </View>
      <Text style={{ color: '#D1D5DB', fontSize: 20 }}>›</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut, isAdmin } = useAuth();

  const email = session?.user.email ?? '';
  const initial = email.charAt(0).toUpperCase() || '✈';
  const memberSince = session?.user.created_at
    ? new Date(session.user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>
        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 26, paddingBottom: 26 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#17171E', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Text style={{ color: 'white', fontFamily: SERIF, fontSize: 30 }}>{initial}</Text>
          </View>
          <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111' }}>{email}</Text>
          {memberSince ? (
            <Text style={{ color: '#9CA3AF', fontSize: 12.5, marginTop: 4 }}>
              Traveling with Getaway Club since {memberSince}
            </Text>
          ) : null}
        </View>

        {/* Hub */}
        <View style={{ gap: 12 }}>
          <HubRow icon="🌍" title="Your travel map" subtitle="Everywhere you've been & are going" onPress={() => router.push('/world')} />
          <HubRow icon="🗳️" title="Polls" subtitle="Vote on where to go next" onPress={() => router.push('/(tabs)/polls')} />
          <HubRow icon="👣" title="Past trips" subtitle="The places you've already been" onPress={() => router.push('/(tabs)/past')} />
          <HubRow icon="✧" title="Friends" subtitle="See your club's dreams & trips" onPress={() => router.push('/friends')} />
          {isAdmin ? (
            <HubRow icon="🔑" title="Manage members" subtitle="Approve who gets access" onPress={() => router.push('/admin')} />
          ) : null}
        </View>

        {/* Sign out */}
        <Pressable
          onPress={signOut}
          style={({ pressed }) => ({
            alignSelf: 'center',
            marginTop: 34,
            paddingHorizontal: 28,
            paddingVertical: 11,
            borderRadius: 100,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
