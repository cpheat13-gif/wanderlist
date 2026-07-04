import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { fetchFriends, FriendSummary } from '../../lib/friends';
import { SERIF } from '../../lib/editorial';

function nameFor(email: string | null): string {
  return email ? email.split('@')[0] : 'A friend';
}

export default function FriendsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const myId = session?.user.id ?? '';
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!myId) return;
    setLoading(true);
    setFriends(await fetchFriends(myId));
    setLoading(false);
  }, [myId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, color: '#111' }}>‹</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#111" />}
      >
        <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase', marginTop: 6, marginBottom: 6 }}>
          Your club
        </Text>
        <Text style={{ fontFamily: SERIF, fontSize: 34, color: '#111', letterSpacing: -0.5 }}>Friends</Text>
        <Text style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 22 }}>
          Peek at everyone&apos;s dreams and where they&apos;ve been.
        </Text>

        {loading ? (
          <ActivityIndicator color="#111" style={{ marginTop: 30 }} />
        ) : friends.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 14 }}>✧</Text>
            <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111', marginBottom: 6, textAlign: 'center' }}>No one here yet</Text>
            <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
              As people join your club, they&apos;ll show up here.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {friends.map((f) => (
              <Pressable
                key={f.userId}
                onPress={() => router.push(`/friends/${f.userId}`)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#F0F0EE',
                  borderRadius: 18,
                  padding: 14,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                })}
              >
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#17171E', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Text style={{ color: 'white', fontFamily: SERIF, fontSize: 19 }}>{nameFor(f.email).charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: SERIF, fontSize: 17, color: '#111' }} numberOfLines={1}>{nameFor(f.email)}</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 12.5, marginTop: 2 }}>
                    {f.wishlistCount} wishlisted · {f.tripCount} {f.tripCount === 1 ? 'trip' : 'trips'}
                  </Text>
                </View>
                <Text style={{ color: '#D1D5DB', fontSize: 20 }}>›</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
