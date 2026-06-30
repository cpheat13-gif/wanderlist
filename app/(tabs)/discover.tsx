import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { LivePhotoHero } from '../../components/discover/LivePhotoHero';
import { fetchDestinationPhoto, DestinationPhoto } from '../../lib/unsplash';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

const DEBOUNCE_MS = 500;

export default function NewTripScreen() {
  const router = useRouter();
  const { session } = useAuth();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
    }, [])
  );

  const [destinationText, setDestinationText] = useState('');
  const [photo, setPhoto] = useState<DestinationPhoto | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = destinationText.trim();
    if (!trimmed) {
      setPhoto(null);
      setPhotoLoading(false);
      return;
    }

    setPhotoLoading(true);
    debounceRef.current = setTimeout(() => {
      const requestId = ++requestIdRef.current;
      fetchDestinationPhoto(trimmed).then((result) => {
        if (requestIdRef.current !== requestId) return;
        setPhoto(result);
        setPhotoLoading(false);
      });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [destinationText]);

  async function handleCommit() {
    if (!session || committing) return;
    const trimmed = destinationText.trim();
    if (!trimmed) return;

    setError(null);
    setCommitting(true);
    try {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          created_by: session.user.id,
          title: trimmed,
          destination: trimmed,
          cover_photo_url: photo?.url ?? null,
          cover_photo_credit_name: photo?.photographerName ?? null,
          cover_photo_credit_url: photo?.photographerUrl ?? null,
          status: 'idea',
        })
        .select()
        .single();

      if (tripError || !trip) throw new Error(tripError?.message ?? 'Could not create trip.');

      setDestinationText('');
      setPhoto(null);
      router.push(`/discover/${trip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong creating the trip.');
    } finally {
      setCommitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <View className="px-5 pt-4 pb-2">
          <Text className="text-text text-2xl font-bold">New Trip</Text>
          <Text className="text-textMuted mt-1">Where do you want to go?</Text>
        </View>

        <View className="px-5 pb-3">
          <TextInput
            className="bg-surface border border-white/10 rounded-full px-5 py-3 text-text"
            placeholder="Where to?"
            placeholderTextColor="#9B9AA3"
            value={destinationText}
            onChangeText={setDestinationText}
            returnKeyType="done"
          />
        </View>

        {error ? <Text className="text-restaurant text-sm px-5 mb-2">{error}</Text> : null}

        <View className="flex-1 px-5 pb-5">
          <View className="flex-1 rounded-3xl overflow-hidden">
            <LivePhotoHero
              destinationText={destinationText}
              photo={photo}
              loading={photoLoading || committing}
              onCommit={handleCommit}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
