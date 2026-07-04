import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
// eslint-disable-next-line deprecation/deprecation
import { ActivityIndicator, Clipboard, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { SERIF } from '../../lib/editorial';
import {
  addMember,
  fetchAddableUsers,
  fetchTripMembers,
  getOrCreateTripInvite,
  removeMember,
  setMemberRole,
  shareUrlForTripCode,
} from '../../lib/collab';
import { Profile, TripMemberDisplay } from '../../lib/types';

function initials(email: string | null): string {
  return (email?.charAt(0) ?? '?').toUpperCase();
}

export default function ShareTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const myId = session?.user.id ?? '';

  const [title, setTitle] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [members, setMembers] = useState<TripMemberDisplay[]>([]);
  const [addable, setAddable] = useState<Pick<Profile, 'id' | 'email'>[]>([]);
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isOwner = !!ownerId && ownerId === myId;

  const load = useCallback(async () => {
    if (!id) return;
    const { data: trip } = await supabase.from('trips').select('id, title, created_by').eq('id', id).maybeSingle();
    if (!trip) {
      setError('Trip not found.');
      setLoading(false);
      return;
    }
    setTitle(trip.title);
    setOwnerId(trip.created_by);
    const mem = await fetchTripMembers(id, trip.created_by, myId);
    setMembers(mem);
    if (trip.created_by === myId) {
      setAddable(await fetchAddableUsers(mem.map((m) => m.userId)));
      const invite = await getOrCreateTripInvite(id, myId);
      if (invite) setShareUrl(shareUrlForTripCode(invite.code));
    }
    setLoading(false);
  }, [id, myId]);

  useEffect(() => {
    load();
  }, [load]);

  const copyLink = useCallback(() => {
    if (!shareUrl) return;
    Clipboard.setString(shareUrl); // eslint-disable-line deprecation/deprecation
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, [shareUrl]);

  async function shareLink() {
    if (!shareUrl) return;
    try {
      await Share.share({ message: `Join me planning "${title}" on Getaway Club:\n${shareUrl}` });
    } catch {
      /* ignore */
    }
  }

  async function handleAdd(user: Pick<Profile, 'id' | 'email'>) {
    if (!id || busy) return;
    setBusy(user.id);
    setError(null);
    const res = await addMember(id, user.id, 'viewer');
    if (!res.ok) setError(res.error ?? 'Could not add.');
    await load();
    setBusy(null);
  }

  async function toggleRole(m: TripMemberDisplay) {
    if (!id || busy) return;
    setBusy(m.userId);
    await setMemberRole(id, m.userId, m.role === 'editor' ? 'viewer' : 'editor');
    await load();
    setBusy(null);
  }

  async function handleRemove(m: TripMemberDisplay) {
    if (!id || busy) return;
    setBusy(m.userId);
    await removeMember(id, m.userId);
    if (m.isSelf) {
      router.replace('/(tabs)');
      return;
    }
    await load();
    setBusy(null);
  }

  const filteredAddable = addable.filter((u) => (u.email ?? '').toLowerCase().includes(query.trim().toLowerCase()));

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#111" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 6 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, color: '#111' }}>‹</Text>
        </Pressable>
        <Text style={{ flex: 1, fontFamily: SERIF, fontSize: 20, color: '#111', marginLeft: 4 }} numberOfLines={1}>
          Share trip
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase', marginTop: 6, marginBottom: 6 }}>
          Plan together
        </Text>
        <Text style={{ fontFamily: SERIF, fontSize: 26, color: '#111', letterSpacing: -0.5, marginBottom: 20 }} numberOfLines={2}>
          {title}
        </Text>

        {error ? <Text style={{ color: '#B91C1C', fontSize: 13, marginBottom: 14 }}>{error}</Text> : null}

        {/* Share link (owner only) */}
        {isOwner && shareUrl ? (
          <View style={{ backgroundColor: '#111', borderRadius: 20, padding: 20, marginBottom: 26 }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              Invite by link
            </Text>
            <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 15, marginBottom: 4 }} numberOfLines={1}>
              {shareUrl}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 16 }}>
              Anyone with a Getaway Club account who opens this joins as a viewer.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={copyLink} style={({ pressed }) => ({ flex: 1, backgroundColor: 'white', borderRadius: 100, paddingVertical: 13, alignItems: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                <Text style={{ color: '#111', fontSize: 14, fontWeight: '700' }}>{copied ? 'Copied!' : 'Copy link'}</Text>
              </Pressable>
              <Pressable onPress={shareLink} style={({ pressed }) => ({ flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 100, paddingVertical: 13, alignItems: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>Share</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Members */}
        <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
        <Text style={{ fontFamily: SERIF, fontSize: 21, color: '#111', marginBottom: 14 }}>On this trip</Text>
        <View style={{ gap: 10, marginBottom: 28 }}>
          {members.map((m) => (
            <View key={m.userId} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#F0F0EE', borderRadius: 16, padding: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#17171E', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ color: 'white', fontFamily: SERIF, fontSize: 17 }}>{initials(m.email)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: SERIF, fontSize: 15, color: '#111' }} numberOfLines={1}>
                  {m.email ?? 'Unknown'} {m.isSelf ? '· you' : ''}
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 11.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 2 }}>
                  {m.role}
                </Text>
              </View>
              {/* Owner-only controls, not on the owner row */}
              {isOwner && !m.isOwner ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable
                    onPress={() => toggleRole(m)}
                    disabled={busy === m.userId}
                    style={({ pressed }) => ({ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 100, paddingVertical: 7, paddingHorizontal: 12, opacity: busy === m.userId ? 0.5 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}
                  >
                    <Text style={{ color: '#111', fontSize: 12, fontWeight: '600' }}>
                      {m.role === 'editor' ? 'Make viewer' : 'Make editor'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => handleRemove(m)} disabled={busy === m.userId} hitSlop={8} style={{ padding: 4 }}>
                    <Text style={{ color: '#B91C1C', fontSize: 16 }}>✕</Text>
                  </Pressable>
                </View>
              ) : m.isSelf && !m.isOwner ? (
                <Pressable onPress={() => handleRemove(m)} style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
                  <Text style={{ color: '#B91C1C', fontSize: 13 }}>Leave</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>

        {/* Add people (owner only) */}
        {isOwner ? (
          <>
            <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
            <Text style={{ fontFamily: SERIF, fontSize: 21, color: '#111', marginBottom: 4 }}>Add people</Text>
            <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 13, marginBottom: 14 }}>
              Added as a viewer — flip them to editor above to let them contribute.
            </Text>
            <TextInput
              style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, color: '#111', fontSize: 14.5, marginBottom: 12 }}
              placeholder="Search by email"
              placeholderTextColor="#B6BAC2"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {filteredAddable.length === 0 ? (
              <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 13.5 }}>
                {addable.length === 0 ? 'Everyone with an account is already on this trip.' : 'No matches.'}
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {filteredAddable.slice(0, 30).map((u) => (
                  <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#F0F0EE', borderRadius: 14, padding: 10 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#E9EAEC', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Text style={{ color: '#111', fontFamily: SERIF, fontSize: 14 }}>{initials(u.email)}</Text>
                    </View>
                    <Text style={{ flex: 1, color: '#111', fontSize: 14 }} numberOfLines={1}>{u.email}</Text>
                    <Pressable
                      onPress={() => handleAdd(u)}
                      disabled={busy === u.id}
                      style={({ pressed }) => ({ backgroundColor: '#111', borderRadius: 100, paddingVertical: 8, paddingHorizontal: 16, opacity: busy === u.id ? 0.5 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}
                    >
                      {busy === u.id ? <ActivityIndicator color="white" size="small" /> : <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>Add</Text>}
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 13.5 }}>
            Only the trip&apos;s planner can add or manage people.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
