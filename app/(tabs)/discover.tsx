import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { HeroCarousel } from '../../components/discover/HeroCarousel';
import { suggestDestinations, DestinationSuggestion } from '../../lib/ai';
import { fetchDestinationPhoto, DestinationPhoto } from '../../lib/unsplash';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

function suggestionKey(s: DestinationSuggestion) {
  return `${s.name}-${s.country}`;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { session } = useAuth();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
      return () => setStatusBarStyle('light');
    }, [])
  );

  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<DestinationSuggestion[]>([]);
  const [reply, setReply] = useState<string | null>(null);
  const [photosBySuggestion, setPhotosBySuggestion] = useState<Record<string, DestinationPhoto | null>>({});
  const [creatingKey, setCreatingKey] = useState<string | null>(null);

  async function handleSend() {
    const trimmed = prompt.trim();
    if (!trimmed || sending) return;
    setError(null);
    setSending(true);
    setSuggestions([]);
    setReply(null);

    try {
      const result = await suggestDestinations(trimmed);
      setReply(result.reply);
      setSuggestions(result.suggestions);

      result.suggestions.forEach((s) => {
        const key = suggestionKey(s);
        fetchDestinationPhoto(s.photoQuery).then((photo) => {
          setPhotosBySuggestion((prev) => ({ ...prev, [key]: photo }));
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong asking Claude.');
    } finally {
      setSending(false);
    }
  }

  async function handleGo(suggestion: DestinationSuggestion) {
    if (!session || creatingKey) return;
    const key = suggestionKey(suggestion);
    setError(null);
    setCreatingKey(key);
    try {
      const photo = photosBySuggestion[key] ?? null;
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          created_by: session.user.id,
          title: suggestion.name,
          destination: `${suggestion.name}, ${suggestion.country}`,
          cover_photo_url: photo?.url ?? null,
          cover_photo_credit_name: photo?.photographerName ?? null,
          cover_photo_credit_url: photo?.photographerUrl ?? null,
          status: 'idea',
        })
        .select()
        .single();

      if (tripError || !trip) throw new Error(tripError?.message ?? 'Could not create trip.');

      router.push(`/discover/${trip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong creating the trip.');
    } finally {
      setCreatingKey(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <View className="px-5 pt-4 pb-2">
          <Text className="text-2xl font-semibold text-neutral-900">Discover</Text>
          <Text className="text-neutral-500 mt-1">Tell me about a trip idea and I'll suggest places.</Text>
        </View>

        <View className="flex-row items-center px-5 py-3">
          <TextInput
            className="flex-1 bg-neutral-100 rounded-full px-4 py-3 text-neutral-900 mr-2"
            placeholder="I want to go to..."
            placeholderTextColor="#A3A3A3"
            value={prompt}
            onChangeText={setPrompt}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !prompt.trim()}
            className="bg-emerald-600 rounded-full w-11 h-11 items-center justify-center"
            style={{ opacity: sending || !prompt.trim() ? 0.5 : 1 }}
          >
            <Text className="text-white text-lg">↑</Text>
          </Pressable>
        </View>

        {error ? <Text className="text-red-500 px-5 mb-2">{error}</Text> : null}

        {sending ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-neutral-400">Thinking...</Text>
          </View>
        ) : suggestions.length > 0 ? (
          <View className="flex-1">
            {reply ? <Text className="text-neutral-600 px-6 mb-2">{reply}</Text> : null}
            <HeroCarousel
              suggestions={suggestions}
              photosByKey={photosBySuggestion}
              keyFor={suggestionKey}
              creatingKey={creatingKey}
              onGo={handleGo}
            />
          </View>
        ) : (
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-neutral-400 text-center">
              Try "friends hiking trip" or "I want to go to Peru"
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
