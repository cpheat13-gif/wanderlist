import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { addMemory, deleteMemory, memoryUrl, pickImageWeb, toggleFavourite, updateTripRecap } from '../../lib/memories';
import { SERIF } from '../../lib/editorial';
import { Memory, Trip } from '../../lib/types';

const { width: SCREEN_WIDTH } = require('react-native').Dimensions.get('window');
const CARD_W = Math.floor((SCREEN_WIDTH - 48 - 12) / 2);

function monthYear(t: Trip): string {
  const iso = t.end_date || t.start_date || t.created_at;
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}
function countryOf(dest: string | null): string | null {
  if (!dest) return null;
  const parts = dest.split(',').map((s) => s.trim());
  return parts.length > 1 ? parts[parts.length - 1] : null;
}
function nameFor(email: string | null): string {
  return email ? email.split('@')[0] : '?';
}

export default function MemoriesScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const myId = session?.user.id ?? '';

  const [trip, setTrip] = useState<Trip | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [placeCount, setPlaceCount] = useState(0);
  const [members, setMembers] = useState<{ id: string; email: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  // add-memory sheet
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // edit recap sheet
  const [editOpen, setEditOpen] = useState(false);
  const [recapDraft, setRecapDraft] = useState('');
  const [keepsakeDraft, setKeepsakeDraft] = useState('');

  const load = useCallback(async () => {
    if (!tripId) return;
    const [{ data: t }, { count }] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).maybeSingle(),
      supabase.from('places').select('*', { count: 'exact', head: true }).eq('trip_id', tripId),
    ]);
    setTrip((t ?? null) as Trip | null);
    setPlaceCount(count ?? 0);
    setMemories(await fetchMems());
    const { data: mem } = await supabase.from('trip_members').select('user_id').eq('trip_id', tripId);
    const memberIds = new Set<string>((mem ?? []).map((m: { user_id: string }) => m.user_id));
    if (t?.created_by) memberIds.add(t.created_by);
    memberIds.delete(myId);
    const ids = [...memberIds];
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, email').in('id', ids);
      setMembers((profs ?? []) as { id: string; email: string | null }[]);
    } else {
      setMembers([]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, myId]);

  async function fetchMems() {
    const { data } = await supabase.from('memories').select('*').eq('trip_id', tripId).order('created_at', { ascending: true });
    return (data ?? []) as Memory[];
  }

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = !!trip && trip.created_by === myId;
  const canAdd = isOwner || members.some((m) => m.id === myId) || (!!trip && !!session); // members + owner; anyone signed-in on a shared/own trip
  const favourites = memories.filter((m) => m.is_favourite);
  const shown = favourites.length > 0 ? favourites : memories.slice(0, 6);
  const heroUrl = trip?.cover_photo_url || (memories[0] ? memoryUrl(memories[0].photo_path) : null);

  async function onPickAdd() {
    setError(null);
    if (Platform.OS !== 'web') {
      setError('Add photos from the web app for now.');
      return;
    }
    const file = await pickImageWeb();
    if (!file) return;
    setPendingFile(file);
    setPreview(typeof URL !== 'undefined' ? URL.createObjectURL(file) : null);
    setCaption('');
    setNote('');
  }

  async function confirmAdd() {
    if (!pendingFile || !session || uploading) return;
    setUploading(true);
    setError(null);
    const res = await addMemory({ tripId: tripId!, userId: session.user.id, file: pendingFile, caption, note });
    if (res.ok) {
      setPendingFile(null);
      setPreview(null);
      setMemories(await fetchMems());
    } else {
      setError(res.error ?? 'Could not save that memory.');
    }
    setUploading(false);
  }

  async function onFav(m: Memory) {
    await toggleFavourite(m.id, !m.is_favourite);
    setMemories((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_favourite: !x.is_favourite } : x)));
  }
  async function onDelete(m: Memory) {
    setMemories((prev) => prev.filter((x) => x.id !== m.id));
    await deleteMemory(m);
  }

  function openEdit() {
    setRecapDraft(trip?.recap ?? '');
    setKeepsakeDraft(trip?.keepsake ?? '');
    setEditOpen(true);
  }
  async function saveEdit() {
    if (!tripId) return;
    await updateTripRecap(tripId, recapDraft, keepsakeDraft);
    setTrip((t) => (t ? { ...t, recap: recapDraft.trim() || null, keepsake: keepsakeDraft.trim() || null } : t));
    setEditOpen(false);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FDFCFA', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#111" />
      </View>
    );
  }
  if (!trip) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#9CA3AF' }}>Trip not found.</Text>
      </SafeAreaView>
    );
  }

  const country = countryOf(trip.destination);

  return (
    <View style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: canAdd ? 120 : 48 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ height: 300, backgroundColor: '#E9EAEC' }}>
          {heroUrl ? <Image source={{ uri: heroUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
          <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.55)']} locations={[0, 0.5, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} style={{ position: 'absolute', top: insets.top + 8, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, color: '#111' }}>‹</Text>
          </Pressable>
          <View style={{ position: 'absolute', left: 16, bottom: 16 }}>
            {country ? (
              <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, marginBottom: 8 }}>
                <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>📍 {country}</Text>
              </View>
            ) : null}
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
              {trip.status === 'past' ? 'Visited' : trip.status === 'booked' ? 'Booked' : 'Planning'} · {monthYear(trip)}
            </Text>
          </View>
        </View>

        {/* Content sheet */}
        <View style={{ backgroundColor: '#FDFCFA', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, paddingTop: 22, paddingHorizontal: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text style={{ flex: 1, fontFamily: SERIF, fontSize: 30, color: '#111' }}>{trip.title}</Text>
            {isOwner ? (
              <Pressable onPress={openEdit} hitSlop={8} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                <Text style={{ fontSize: 15 }}>✎</Text>
              </Pressable>
            ) : null}
          </View>
          {trip.recap ? (
            <Text style={{ color: '#6B7280', fontSize: 14.5, lineHeight: 21, marginTop: 8 }}>{trip.recap}</Text>
          ) : null}

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Stat value={String(placeCount)} label="places" />
            <Stat value={String(memories.length)} label="memories" />
            <View style={{ flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#F0F0EE', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                {members.slice(0, 3).map((m, i) => (
                  <View key={m.id} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#17171E', borderWidth: 1.5, borderColor: 'white', alignItems: 'center', justifyContent: 'center', marginLeft: i === 0 ? 0 : -8 }}>
                    <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{nameFor(m.email).charAt(0).toUpperCase()}</Text>
                  </View>
                ))}
                {members.length === 0 ? <Text style={{ fontSize: 18 }}>👤</Text> : null}
              </View>
              <Text style={{ fontFamily: SERIF, fontSize: 15, color: '#111' }}>
                {members.length === 0 ? 'solo' : `${members.length} ${members.length === 1 ? 'friend' : 'friends'}`}
              </Text>
            </View>
          </View>

          {/* Favourites / recent */}
          {memories.length > 0 ? (
            <>
              <Text style={{ fontFamily: SERIF, fontSize: 21, color: '#111', marginTop: 30, marginBottom: 14 }}>
                {favourites.length > 0 ? 'Favourite memories' : 'Your memories'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 8 }}>
                {shown.map((m) => (
                  <View key={m.id} style={{ width: 220 }}>
                    <View style={{ width: 220, height: 160, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E9EAEC' }}>
                      <Image source={{ uri: memoryUrl(m.photo_path) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      <Pressable onPress={() => onFav(m)} style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 14, color: m.is_favourite ? '#2563EB' : '#9CA3AF' }}>{m.is_favourite ? '♥' : '♡'}</Text>
                      </Pressable>
                    </View>
                    {m.caption ? <Text style={{ fontFamily: SERIF, fontSize: 15, color: '#111', marginTop: 8 }} numberOfLines={1}>{m.caption}</Text> : null}
                    {m.note ? <Text style={{ color: '#9CA3AF', fontSize: 12.5, marginTop: 2 }} numberOfLines={1}>{m.note}</Text> : null}
                  </View>
                ))}
              </ScrollView>
            </>
          ) : (
            <View style={{ alignItems: 'center', marginTop: 34, marginBottom: 10 }}>
              <Text style={{ fontSize: 38, marginBottom: 12 }}>📸</Text>
              <Text style={{ fontFamily: SERIF, fontSize: 19, color: '#111', marginBottom: 4 }}>No memories yet</Text>
              <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 21 }}>
                {canAdd ? 'Add your first photo from this trip.' : 'Nothing here yet.'}
              </Text>
            </View>
          )}

          {/* All memories grid */}
          {memories.length > 0 ? (
            <>
              <Text style={{ fontFamily: SERIF, fontSize: 21, color: '#111', marginTop: 30, marginBottom: 14 }}>All {memories.length}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {memories.map((m) => (
                  <Pressable key={m.id} onLongPress={() => (m.created_by === myId || isOwner) && onDelete(m)} style={{ width: CARD_W, height: 150, borderRadius: 14, overflow: 'hidden', backgroundColor: '#E9EAEC' }}>
                    <Image source={{ uri: memoryUrl(m.photo_path) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    <Pressable onPress={() => onFav(m)} style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 12, color: m.is_favourite ? '#2563EB' : '#9CA3AF' }}>{m.is_favourite ? '♥' : '♡'}</Text>
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {/* Keepsake */}
          {trip.keepsake ? (
            <View style={{ marginTop: 30, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 18, padding: 18 }}>
              <Text style={{ color: '#9A3412', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>A memory to keep</Text>
              <Text style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: '#7C2D12', lineHeight: 24 }}>“{trip.keepsake}”</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Add-a-memory button */}
      {canAdd ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingBottom: insets.bottom + 16 }}>
          <Pressable onPress={onPickAdd} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111', borderRadius: 100, paddingVertical: 14, paddingHorizontal: 24, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>Add a memory</Text>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>＋</Text>
            </View>
          </Pressable>
          {error ? <Text style={{ color: '#B91C1C', fontSize: 12.5, marginTop: 8 }}>{error}</Text> : null}
        </View>
      ) : null}

      {/* Caption sheet after picking a photo */}
      <Modal visible={!!pendingFile} animationType="slide" transparent onRequestClose={() => setPendingFile(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => !uploading && setPendingFile(null)} />
          <SafeAreaView style={{ backgroundColor: '#FDFCFA', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111', marginBottom: 14 }}>New memory</Text>
            {preview ? <Image source={{ uri: preview }} style={{ width: '100%', height: 180, borderRadius: 16, marginBottom: 14, backgroundColor: '#E9EAEC' }} contentFit="cover" /> : null}
            <TextInput style={inp} placeholder="Caption — e.g. Senso-ji Temple" placeholderTextColor="#B6BAC2" value={caption} onChangeText={setCaption} />
            <TextInput style={[inp, { marginTop: 10 }]} placeholder="A note — e.g. Ancient vibes in Asakusa" placeholderTextColor="#B6BAC2" value={note} onChangeText={setNote} />
            {error ? <Text style={{ color: '#B91C1C', fontSize: 12.5, marginTop: 10 }}>{error}</Text> : null}
            <Pressable onPress={confirmAdd} disabled={uploading} style={({ pressed }) => ({ marginTop: 16, backgroundColor: '#111', borderRadius: 100, paddingVertical: 15, alignItems: 'center', opacity: uploading ? 0.6 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
              {uploading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>Save memory</Text>}
            </Pressable>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit recap sheet */}
      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setEditOpen(false)} />
          <SafeAreaView style={{ backgroundColor: '#FDFCFA', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111', marginBottom: 14 }}>Edit album</Text>
            <Text style={lbl}>Recap</Text>
            <TextInput style={inp} placeholder="Late sunsets, cinnamon buns, and long walks…" placeholderTextColor="#B6BAC2" value={recapDraft} onChangeText={setRecapDraft} />
            <Text style={[lbl, { marginTop: 14 }]}>A memory to keep</Text>
            <TextInput style={[inp, { minHeight: 70, textAlignVertical: 'top' }]} placeholder="The one line you never want to forget…" placeholderTextColor="#B6BAC2" value={keepsakeDraft} onChangeText={setKeepsakeDraft} multiline />
            <Pressable onPress={saveEdit} style={({ pressed }) => ({ marginTop: 16, backgroundColor: '#111', borderRadius: 100, paddingVertical: 15, alignItems: 'center', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
              <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>Save</Text>
            </Pressable>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#F0F0EE', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
      <Text style={{ fontFamily: SERIF, fontSize: 22, color: '#111' }}>{value}</Text>
      <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const inp = { backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, color: '#111', fontSize: 15 } as const;
const lbl = { color: '#9CA3AF', fontSize: 10, fontWeight: '700' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 6 };
