import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { approveMember, fetchMembers, revokeMember } from '../lib/members';
import { SERIF } from '../lib/editorial';
import { MemberRow } from '../lib/types';

export default function AdminScreen() {
  const router = useRouter();
  const { isAdmin, accessLoading, session } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await fetchMembers());
    } catch {
      setError('Could not load members.');
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pending = useMemo(() => members.filter((m) => !m.approved), [members]);
  const approved = useMemo(() => members.filter((m) => m.approved), [members]);

  async function handleApprove(m: MemberRow) {
    if (!m.email || busy) return;
    setBusy(m.id);
    setError(null);
    const res = await approveMember(m.email);
    if (!res.ok) setError(res.error ?? 'Could not approve.');
    await load();
    setBusy(null);
  }

  async function handleRevoke(m: MemberRow) {
    if (!m.email || busy) return;
    setBusy(m.id);
    setError(null);
    const res = await revokeMember(m.email);
    if (!res.ok) setError(res.error ?? 'Could not revoke.');
    await load();
    setBusy(null);
  }

  if (!accessLoading && !isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
        <Text style={{ fontSize: 40, marginBottom: 14 }}>🔒</Text>
        <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111', marginBottom: 6, textAlign: 'center' }}>Admins only</Text>
        <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 22 }}>
          You don&apos;t have permission to manage members.
        </Text>
        <Pressable onPress={() => router.back()} style={{ paddingVertical: 10, paddingHorizontal: 26 }}>
          <Text style={{ color: '#111', fontSize: 14, fontWeight: '700' }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 6 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, color: '#111' }}>‹</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#111" />}
      >
        <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
          Manage access
        </Text>
        <Text style={{ fontFamily: SERIF, fontSize: 32, color: '#111', letterSpacing: -0.5 }}>Members</Text>
        <Text style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 24 }}>
          Approve who gets into Getaway Club.
        </Text>

        {error ? <Text style={{ color: '#B91C1C', fontSize: 13, marginBottom: 16 }}>{error}</Text> : null}

        {/* Pending */}
        <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
        <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111', marginBottom: 4 }}>
          Waiting for approval
        </Text>
        <Text style={{ color: '#9CA3AF', fontSize: 12.5, marginBottom: 14 }}>
          {pending.length} {pending.length === 1 ? 'person' : 'people'}
        </Text>

        {!loading && pending.length === 0 ? (
          <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, marginBottom: 30 }}>
            No one is waiting right now.
          </Text>
        ) : (
          <View style={{ gap: 10, marginBottom: 30 }}>
            {pending.map((m) => (
              <View
                key={m.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#F0F0EE',
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: SERIF, fontSize: 15.5, color: '#111' }} numberOfLines={1}>
                    {m.email ?? 'Unknown'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleApprove(m)}
                  disabled={busy === m.id}
                  style={({ pressed }) => ({
                    backgroundColor: '#111',
                    borderRadius: 100,
                    paddingVertical: 9,
                    paddingHorizontal: 18,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                    opacity: busy === m.id ? 0.5 : 1,
                  })}
                >
                  {busy === m.id ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>Approve</Text>
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Approved */}
        <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
        <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111', marginBottom: 4 }}>
          Approved
        </Text>
        <Text style={{ color: '#9CA3AF', fontSize: 12.5, marginBottom: 14 }}>
          {approved.length} {approved.length === 1 ? 'member' : 'members'}
        </Text>

        <View style={{ gap: 10 }}>
          {approved.map((m) => {
            const isSelf = m.id === session?.user.id;
            return (
              <View
                key={m.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#F0F0EE',
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: SERIF, fontSize: 15.5, color: '#111' }} numberOfLines={1}>
                    {m.email ?? 'Unknown'}
                  </Text>
                  {m.is_admin ? (
                    <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 3 }}>
                      Admin
                    </Text>
                  ) : null}
                </View>
                {isSelf || m.is_admin ? (
                  <Text style={{ color: '#D1D5DB', fontSize: 12.5 }}>{isSelf ? 'You' : ''}</Text>
                ) : (
                  <Pressable
                    onPress={() => handleRevoke(m)}
                    disabled={busy === m.id}
                    style={({ pressed }) => ({
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 100,
                      paddingVertical: 9,
                      paddingHorizontal: 16,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                      opacity: busy === m.id ? 0.5 : 1,
                    })}
                  >
                    {busy === m.id ? (
                      <ActivityIndicator color="#111" size="small" />
                    ) : (
                      <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '600' }}>Revoke</Text>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
