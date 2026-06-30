import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../components/PillButton';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { DestinationPhoto, fetchDestinationPhoto } from '../lib/unsplash';

export default function NewTripScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [photo, setPhoto] = useState<DestinationPhoto | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [searchedFor, setSearchedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function findPhoto() {
    const query = destination.trim();
    if (!query) return;
    setPhotoLoading(true);
    const result = await fetchDestinationPhoto(query);
    setPhoto(result);
    setSearchedFor(query);
    setPhotoLoading(false);
  }

  async function handleCreate() {
    if (!session) return;
    setSaving(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from('trips')
      .insert({
        created_by: session.user.id,
        title: title.trim(),
        destination: destination.trim() || null,
        cover_photo_url: photo?.url ?? null,
        cover_photo_credit_name: photo?.photographerName ?? null,
        cover_photo_credit_url: photo?.photographerUrl ?? null,
        tiktok_url: tiktokUrl.trim() || null,
        status: 'idea',
      })
      .select()
      .single();
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.replace(`/trip/${data.id}`);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-5 pt-4">
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="Norway road trip" />
        <Field
          label="Destination"
          value={destination}
          onChangeText={setDestination}
          placeholder="Norway"
          onBlur={() => {
            if (destination.trim() && destination.trim() !== searchedFor) findPhoto();
          }}
        />

        <View className="mb-4">
          <Text className="text-textMuted text-xs uppercase mb-2" style={{ letterSpacing: 2 }}>
            Cover Photo
          </Text>
          <View className="h-40 rounded-xl overflow-hidden bg-surface border border-white/10 items-center justify-center">
            {photoLoading ? (
              <ActivityIndicator color="#D4A857" />
            ) : photo ? (
              <Image source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Text className="text-textMuted text-sm px-4 text-center">
                {destination.trim() ? 'No photo found — try a different destination.' : 'Add a destination to pull a photo.'}
              </Text>
            )}
          </View>
          {photo ? (
            <Text className="text-textMuted text-xs mt-2">Photo by {photo.photographerName} on Unsplash</Text>
          ) : null}
          <PillButton
            label={photo ? 'Shuffle photo' : 'Find photo'}
            onPress={findPhoto}
            variant="glass"
            disabled={!destination.trim() || photoLoading}
            className="mt-3 self-start"
          />
        </View>

        <Field
          label="TikTok inspo link"
          value={tiktokUrl}
          onChangeText={setTiktokUrl}
          placeholder="https://www.tiktok.com/…"
          autoCapitalize="none"
        />

        {error ? <Text className="text-restaurant text-sm mb-3">{error}</Text> : null}

        <PillButton
          label="Create Trip"
          onPress={handleCreate}
          variant="solid"
          loading={saving}
          disabled={!title.trim()}
          className="mt-2"
        />
      </View>
    </SafeAreaView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize?: 'none' | 'sentences';
  onBlur?: () => void;
}) {
  return (
    <View className="mb-4">
      <Text className="text-textMuted text-xs uppercase mb-2" style={{ letterSpacing: 2 }}>
        {props.label}
      </Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#9B9AA3"
        autoCapitalize={props.autoCapitalize}
        onBlur={props.onBlur}
        className="bg-surface border border-white/10 rounded-xl px-4 py-3 text-text"
      />
    </View>
  );
}
