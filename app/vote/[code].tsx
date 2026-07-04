import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { castVote, fetchPollByCode, fetchVotes, subscribeVotes } from '../../lib/poll';
import { SERIF } from '../../lib/editorial';
import { Poll, PollOption, PollVote } from '../../lib/types';
import { PollResults } from '../../components/poll/PollResults';

export default function VoteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      if (!code) return;
      const res = await fetchPollByCode(code);
      if (!res) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPoll(res.poll);
      setOptions(res.options);
      setVotes(await fetchVotes(res.poll.id));
      setLoading(false);
      Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
      unsub = subscribeVotes(res.poll.id, async () => {
        setVotes(await fetchVotes(res.poll.id));
      });
    })();
    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const refreshVotes = useCallback(async () => {
    if (poll) setVotes(await fetchVotes(poll.id));
  }, [poll]);

  async function submit() {
    if (!poll || !selected || !name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await castVote({ pollId: poll.id, optionId: selected, voterName: name });
    if (res.ok) {
      setVoted(true);
      await refreshVotes();
    } else {
      setError(res.error ?? 'Something went wrong.');
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#111" />
      </SafeAreaView>
    );
  }

  if (notFound || !poll) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
        <Text style={{ fontSize: 40, marginBottom: 14 }}>🧭</Text>
        <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111', marginBottom: 6, textAlign: 'center' }}>
          Poll not found
        </Text>
        <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 21 }}>
          Double-check the link — it may have been closed or mistyped.
        </Text>
      </SafeAreaView>
    );
  }

  const selectedOption = options.find((o) => o.id === selected);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
            {/* Masthead */}
            <Text
              style={{
                color: '#9CA3AF',
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 3,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Wanderlist · Trip Poll
            </Text>
            <Text style={{ fontFamily: SERIF, fontSize: 30, color: '#111', letterSpacing: -0.5, lineHeight: 36 }}>
              {poll.title}
            </Text>
            {poll.subtitle ? (
              <Text style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: '#6B7280', marginTop: 6 }}>
                {poll.subtitle}
              </Text>
            ) : null}

            {/* Options */}
            <View style={{ marginTop: 24, gap: 14 }}>
              {options.map((o) => {
                const isSel = selected === o.id;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => !voted && setSelected(o.id)}
                    disabled={voted}
                    style={({ pressed }) => ({
                      borderRadius: 20,
                      overflow: 'hidden',
                      borderWidth: isSel ? 2 : 1,
                      borderColor: isSel ? '#111' : '#F0F0EE',
                      backgroundColor: 'white',
                      transform: [{ scale: pressed && !voted ? 0.99 : 1 }],
                    })}
                  >
                    <View style={{ height: 150, backgroundColor: '#E9EAEC' }}>
                      {o.cover_photo_url ? (
                        <Image source={{ uri: o.cover_photo_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
                      ) : null}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.55)']}
                        locations={[0.3, 1]}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                      />
                      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
                        <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 22 }}>{o.label}</Text>
                        {o.subtitle ? (
                          <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 }}>
                            {o.subtitle}
                          </Text>
                        ) : null}
                      </View>
                      {/* radio */}
                      <View
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: isSel ? '#111' : 'rgba(255,255,255,0.9)',
                          borderWidth: isSel ? 0 : 1,
                          borderColor: 'rgba(0,0,0,0.1)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSel ? <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>✓</Text> : null}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Vote form */}
            {voted ? (
              <View
                style={{
                  marginTop: 22,
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#F0F0EE',
                  borderRadius: 18,
                  padding: 18,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 26, marginBottom: 6 }}>🎉</Text>
                <Text style={{ fontFamily: SERIF, fontSize: 17, color: '#111', textAlign: 'center' }}>
                  Thanks, {name.trim()} — your vote is in!
                </Text>
                <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>
                  Results update live below.
                </Text>
              </View>
            ) : (
              <View style={{ marginTop: 22 }}>
                <TextInput
                  style={{
                    backgroundColor: 'white',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 16,
                    paddingHorizontal: 18,
                    paddingVertical: 15,
                    color: '#111',
                    fontSize: 15,
                  }}
                  placeholder="Your name"
                  placeholderTextColor="#B6BAC2"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {error ? (
                  <Text style={{ color: '#B91C1C', fontSize: 12.5, lineHeight: 18, marginTop: 8 }}>{error}</Text>
                ) : null}
                <Pressable
                  onPress={submit}
                  disabled={!selected || !name.trim() || submitting}
                  style={({ pressed }) => ({
                    marginTop: 12,
                    backgroundColor: '#111',
                    borderRadius: 100,
                    paddingVertical: 16,
                    alignItems: 'center',
                    opacity: !selected || !name.trim() || submitting ? 0.4 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  {submitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>
                      {selectedOption ? `Vote for ${selectedOption.label}` : 'Pick a destination'}
                    </Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* Live results */}
            <View style={{ marginTop: 34 }}>
              <PollResults options={options} votes={votes} />
            </View>

            <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#C4C0B8', fontSize: 12, textAlign: 'center', marginTop: 40 }}>
              Made with Wanderlist
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
