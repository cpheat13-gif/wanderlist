import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { fetchMyPolls, MyPollSummary } from '../../lib/poll';
import { SERIF } from '../../lib/editorial';

export default function PollsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [polls, setPolls] = useState<MyPollSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setPolls(await fetchMyPolls(session.user.id));
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 14 }}>
        <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
          Decide together
        </Text>
        <Text style={{ fontFamily: SERIF, fontSize: 34, color: '#111', letterSpacing: -0.5 }}>Polls</Text>
        <Text style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: '#6B7280', marginTop: 4 }}>
          Share a vote — no accounts needed.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#111" />}
      >
        <Pressable
          onPress={() => router.push('/polls/new')}
          style={({ pressed }) => ({
            backgroundColor: '#111',
            borderRadius: 100,
            paddingVertical: 15,
            alignItems: 'center',
            marginBottom: 22,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <Text style={{ color: 'white', fontSize: 14.5, fontWeight: '700' }}>＋ New poll</Text>
        </Pressable>

        {!loading && polls.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>🗳️</Text>
            <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 20, marginBottom: 8, textAlign: 'center' }}>
              No polls yet
            </Text>
            <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
              Turn a few of your saved trips into a vote,{'\n'}then share the link with the group.
            </Text>
          </View>
        ) : null}

        <View style={{ gap: 12 }}>
          {polls.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/polls/${p.id}`)}
              style={({ pressed }) => ({
                backgroundColor: 'white',
                borderWidth: 1,
                borderColor: '#F0F0EE',
                borderRadius: 18,
                padding: 18,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: SERIF, fontSize: 18, color: '#111' }} numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 12.5, marginTop: 3 }}>
                    {p.optionCount} options · {p.voteCount} {p.voteCount === 1 ? 'vote' : 'votes'}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: '#F5F5F2',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 13, letterSpacing: 1 }}>{p.share_code}</Text>
                </View>
                <Text style={{ color: '#D1D5DB', fontSize: 20 }}>›</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
