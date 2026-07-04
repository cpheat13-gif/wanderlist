import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
// eslint-disable-next-line deprecation/deprecation
import { ActivityIndicator, Clipboard, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchPollById, fetchVotes, shareUrlForCode, subscribeVotes } from '../../lib/poll';
import { supabase } from '../../lib/supabase';
import { SERIF } from '../../lib/editorial';
import { Poll, PollOption, PollVote } from '../../lib/types';
import { PollResults } from '../../components/poll/PollResults';

export default function PollDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      if (!id) return;
      const res = await fetchPollById(id);
      if (res) {
        setPoll(res.poll);
        setOptions(res.options);
        setVotes(await fetchVotes(res.poll.id));
        unsub = subscribeVotes(res.poll.id, async () => setVotes(await fetchVotes(res.poll.id)));
      }
      setLoading(false);
    })();
    return () => unsub?.();
  }, [id]);

  const shareUrl = poll ? shareUrlForCode(poll.share_code) : '';

  const copyLink = useCallback(() => {
    if (!shareUrl) return;
    Clipboard.setString(shareUrl); // eslint-disable-line deprecation/deprecation
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, [shareUrl]);

  async function shareLink() {
    if (!poll) return;
    try {
      await Share.share({ message: `Vote on our trip: ${poll.title}\n${shareUrl}` });
    } catch {
      // ignore
    }
  }

  async function handleDelete() {
    if (!poll) return;
    await supabase.from('polls').delete().eq('id', poll.id);
    router.back();
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#111" />
      </SafeAreaView>
    );
  }

  if (!poll) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#9CA3AF' }}>Poll not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, color: '#111' }}>‹</Text>
        </Pressable>
        <Text style={{ flex: 1, fontFamily: SERIF, fontSize: 18, color: '#111', marginLeft: 4 }} numberOfLines={1}>
          {poll.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* Share card */}
        <View
          style={{
            backgroundColor: '#111',
            borderRadius: 20,
            padding: 20,
            marginTop: 8,
            marginBottom: 26,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Share to collect votes
          </Text>
          <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 15, marginBottom: 4 }} numberOfLines={1}>
            {shareUrl}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 16 }}>
            Anyone with the link can vote — no account needed. Code {poll.share_code}.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={copyLink}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: 'white',
                borderRadius: 100,
                paddingVertical: 13,
                alignItems: 'center',
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ color: '#111', fontSize: 14, fontWeight: '700' }}>{copied ? 'Copied!' : 'Copy link'}</Text>
            </Pressable>
            <Pressable
              onPress={shareLink}
              style={({ pressed }) => ({
                flex: 1,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.35)',
                borderRadius: 100,
                paddingVertical: 13,
                alignItems: 'center',
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>Share</Text>
            </Pressable>
          </View>
        </View>

        <PollResults options={options} votes={votes} />

        <Pressable onPress={handleDelete} style={{ marginTop: 40, alignItems: 'center', paddingVertical: 12 }}>
          <Text style={{ color: '#B91C1C', fontSize: 14 }}>Delete poll</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
