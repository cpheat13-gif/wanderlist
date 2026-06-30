import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { suggestDestinations, buildItinerary, DestinationSuggestion, ItineraryResponse } from '../../lib/ai';
import { fetchDestinationPhoto, fetchDestinationPhotos, DestinationPhoto } from '../../lib/unsplash';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  suggestions?: DestinationSuggestion[];
}

type ScreenView = 'chat' | 'detail' | 'itinerary';

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

  const [view, setView] = useState<ScreenView>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [photosBySuggestion, setPhotosBySuggestion] = useState<Record<string, DestinationPhoto | null>>({});

  const [selected, setSelected] = useState<DestinationSuggestion | null>(null);
  const [gallery, setGallery] = useState<DestinationPhoto[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  const [departureCity, setDepartureCity] = useState('');
  const [travelTiming, setTravelTiming] = useState('');
  const [interests, setInterests] = useState('');
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [creatingTrip, setCreatingTrip] = useState(false);

  async function handleSend() {
    const trimmed = prompt.trim();
    if (!trimmed || sending) return;
    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setPrompt('');

    try {
      const result = await suggestDestinations(trimmed);
      setMessages((prev) => [...prev, { role: 'assistant', text: result.reply, suggestions: result.suggestions }]);

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

  async function openDetail(suggestion: DestinationSuggestion) {
    setSelected(suggestion);
    setView('detail');
    setGalleryLoading(true);
    const photos = await fetchDestinationPhotos(suggestion.photoQuery, 4);
    setGallery(photos);
    setGalleryLoading(false);
  }

  function openItinerary() {
    setItinerary(null);
    setDepartureCity('');
    setTravelTiming('');
    setInterests('');
    setView('itinerary');
  }

  async function handleBuildItinerary() {
    if (!selected || itineraryLoading) return;
    setError(null);
    setItineraryLoading(true);
    try {
      const result = await buildItinerary({
        destination: selected.name,
        country: selected.country,
        departureCity: departureCity.trim() || undefined,
        travelTiming: travelTiming.trim() || undefined,
        interests: interests.trim() || undefined,
      });
      setItinerary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong building the itinerary.');
    } finally {
      setItineraryLoading(false);
    }
  }

  async function handleCreateTrip() {
    if (!selected || !itinerary || !session || creatingTrip) return;
    setError(null);
    setCreatingTrip(true);
    try {
      const cover = gallery[0] ?? null;
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          created_by: session.user.id,
          title: selected.name,
          destination: `${selected.name}, ${selected.country}`,
          cover_photo_url: cover?.url ?? null,
          cover_photo_credit_name: cover?.photographerName ?? null,
          cover_photo_credit_url: cover?.photographerUrl ?? null,
          status: 'idea',
        })
        .select()
        .single();

      if (tripError || !trip) throw new Error(tripError?.message ?? 'Could not create trip.');

      const places = itinerary.days.flatMap((day) =>
        day.items.map((item) => ({
          trip_id: trip.id,
          name: item.title,
          category: item.category,
          notes: `Day ${day.day}: ${item.description}`,
        }))
      );

      if (places.length > 0) {
        const { error: placesError } = await supabase.from('places').insert(places);
        if (placesError) throw new Error(placesError.message);
      }

      router.push(`/trip/${trip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong creating the trip.');
    } finally {
      setCreatingTrip(false);
    }
  }

  if (view === 'detail' && selected) {
    return (
      <DetailView
        suggestion={selected}
        gallery={gallery}
        galleryLoading={galleryLoading}
        onBack={() => setView('chat')}
        onPlanItinerary={openItinerary}
      />
    );
  }

  if (view === 'itinerary' && selected) {
    return (
      <ItineraryView
        suggestion={selected}
        departureCity={departureCity}
        setDepartureCity={setDepartureCity}
        travelTiming={travelTiming}
        setTravelTiming={setTravelTiming}
        interests={interests}
        setInterests={setInterests}
        itinerary={itinerary}
        loading={itineraryLoading}
        creatingTrip={creatingTrip}
        error={error}
        onBack={() => setView('detail')}
        onBuild={handleBuildItinerary}
        onCreateTrip={handleCreateTrip}
      />
    );
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

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 16 }}>
          {messages.length === 0 ? (
            <View className="items-center mt-16">
              <Text className="text-neutral-400 text-center">
                Try "friends hiking trip" or "I want to go to Peru"
              </Text>
            </View>
          ) : null}

          {messages.map((msg, i) => (
            <View key={i} className="mb-4">
              {msg.role === 'user' ? (
                <View className="self-end bg-emerald-600 rounded-2xl px-4 py-2 max-w-[85%]">
                  <Text className="text-white">{msg.text}</Text>
                </View>
              ) : (
                <View className="self-start max-w-[95%]">
                  <View className="bg-neutral-100 rounded-2xl px-4 py-2 mb-2">
                    <Text className="text-neutral-800">{msg.text}</Text>
                  </View>
                  {msg.suggestions?.map((s) => {
                    const photo = photosBySuggestion[suggestionKey(s)];
                    return (
                      <Pressable
                        key={suggestionKey(s)}
                        onPress={() => openDetail(s)}
                        className="flex-row bg-white border border-neutral-200 rounded-2xl mb-2 overflow-hidden"
                      >
                        <View className="w-24 h-24 bg-neutral-100">
                          {photo ? (
                            <Image source={{ uri: photo.url }} className="w-full h-full" resizeMode="cover" />
                          ) : (
                            <View className="w-full h-full items-center justify-center">
                              <ActivityIndicator color="#059669" />
                            </View>
                          )}
                        </View>
                        <View className="flex-1 px-3 py-2 justify-center">
                          <Text className="font-semibold text-neutral-900">{s.name}</Text>
                          <Text className="text-neutral-500 text-xs mb-1">{s.country}</Text>
                          <Text className="text-neutral-600 text-sm" numberOfLines={2}>
                            {s.blurb}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          ))}

          {sending ? (
            <View className="self-start bg-neutral-100 rounded-2xl px-4 py-3 mb-4">
              <ActivityIndicator color="#059669" />
            </View>
          ) : null}

          {error ? <Text className="text-red-500 mb-4">{error}</Text> : null}
        </ScrollView>

        <View className="flex-row items-center px-5 py-3 border-t border-neutral-100">
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DetailView({
  suggestion,
  gallery,
  galleryLoading,
  onBack,
  onPlanItinerary,
}: {
  suggestion: DestinationSuggestion;
  gallery: DestinationPhoto[];
  galleryLoading: boolean;
  onBack: () => void;
  onPlanItinerary: () => void;
}) {
  const hero = gallery[0];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1">
        <View className="w-full h-72 bg-neutral-100">
          {hero ? (
            <Image source={{ uri: hero.url }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <ActivityIndicator color="#059669" />
            </View>
          )}
          <Pressable
            onPress={onBack}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 items-center justify-center"
          >
            <Text className="text-neutral-900 text-lg">←</Text>
          </Pressable>
        </View>

        {gallery.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 pt-3" contentContainerStyle={{ gap: 8 }}>
            {gallery.slice(1).map((photo, i) => (
              <Image key={i} source={{ uri: photo.url }} className="w-20 h-20 rounded-xl" resizeMode="cover" />
            ))}
          </ScrollView>
        ) : galleryLoading ? (
          <View className="px-5 pt-3">
            <ActivityIndicator color="#059669" />
          </View>
        ) : null}

        <View className="px-5 pt-5">
          <Text className="text-2xl font-semibold text-neutral-900">{suggestion.name}</Text>
          <Text className="text-neutral-500 mb-3">{suggestion.country}</Text>
          <Text className="text-neutral-700 leading-relaxed">{suggestion.blurb}</Text>
        </View>
      </ScrollView>

      <View className="px-5 py-4 border-t border-neutral-100">
        <Pressable onPress={onPlanItinerary} className="bg-emerald-600 rounded-full py-4 items-center">
          <Text className="text-white font-semibold">Plan day-by-day itinerary</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ItineraryView({
  suggestion,
  departureCity,
  setDepartureCity,
  travelTiming,
  setTravelTiming,
  interests,
  setInterests,
  itinerary,
  loading,
  creatingTrip,
  error,
  onBack,
  onBuild,
  onCreateTrip,
}: {
  suggestion: DestinationSuggestion;
  departureCity: string;
  setDepartureCity: (v: string) => void;
  travelTiming: string;
  setTravelTiming: (v: string) => void;
  interests: string;
  setInterests: (v: string) => void;
  itinerary: ItineraryResponse | null;
  loading: boolean;
  creatingTrip: boolean;
  error: string | null;
  onBack: () => void;
  onBuild: () => void;
  onCreateTrip: () => void;
}) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-5 pt-4 pb-2">
        <Pressable onPress={onBack} className="mr-3">
          <Text className="text-neutral-900 text-lg">←</Text>
        </Pressable>
        <Text className="text-xl font-semibold text-neutral-900">{suggestion.name} itinerary</Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 24 }}>
        {!itinerary ? (
          <View className="mt-2">
            <Field label="Flying from" value={departureCity} onChangeText={setDepartureCity} placeholder="e.g. New York" />
            <Field label="Travel timing" value={travelTiming} onChangeText={setTravelTiming} placeholder="e.g. October, 5 days" />
            <Field label="Interests / notes" value={interests} onChangeText={setInterests} placeholder="e.g. hiking, local food" multiline />

            {error ? <Text className="text-red-500 mb-3">{error}</Text> : null}

            <Pressable
              onPress={onBuild}
              disabled={loading}
              className="bg-emerald-600 rounded-full py-4 items-center mt-2"
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Build itinerary</Text>}
            </Pressable>
          </View>
        ) : (
          <View>
            <View className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 mb-5">
              <Text className="text-neutral-900 font-semibold mb-1">
                {itinerary.flightEstimate.fromCity} → {itinerary.flightEstimate.toCity}
              </Text>
              <Text className="text-emerald-700 text-lg font-bold mb-1">
                ~${itinerary.flightEstimate.estimatedRoundTripUsd.toLocaleString()} round trip
              </Text>
              <Text className="text-neutral-500 text-xs">{itinerary.flightEstimate.note}</Text>
            </View>

            {itinerary.days.map((day) => (
              <View key={day.day} className="mb-5">
                <Text className="text-neutral-900 font-semibold mb-1">Day {day.day}</Text>
                <Text className="text-neutral-500 text-sm mb-2">{day.summary}</Text>
                {day.items.map((item, i) => (
                  <View key={i} className="flex-row items-start mb-2">
                    <Text className="text-xs uppercase text-emerald-700 font-semibold w-24 pt-0.5">
                      {item.category}
                    </Text>
                    <View className="flex-1">
                      <Text className="text-neutral-900 font-medium">{item.title}</Text>
                      <Text className="text-neutral-600 text-sm">{item.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}

            {error ? <Text className="text-red-500 mb-3">{error}</Text> : null}

            <Pressable
              onPress={onCreateTrip}
              disabled={creatingTrip}
              className="bg-emerald-600 rounded-full py-4 items-center mt-2"
              style={{ opacity: creatingTrip ? 0.6 : 1 }}
            >
              {creatingTrip ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">Create trip from this</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="text-neutral-700 font-medium mb-1.5">{label}</Text>
      <TextInput
        className="bg-neutral-100 rounded-xl px-4 py-3 text-neutral-900"
        placeholder={placeholder}
        placeholderTextColor="#A3A3A3"
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        style={multiline ? { minHeight: 80, textAlignVertical: 'top' } : undefined}
      />
    </View>
  );
}
