import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../components/PillButton';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export default function NewTripScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
        cover_photo_url: coverPhotoUrl.trim() || null,
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
        />
        <Field
          label="Cover photo URL"
          value={coverPhotoUrl}
          onChangeText={setCoverPhotoUrl}
          placeholder="https://…"
          autoCapitalize="none"
        />
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
        className="bg-surface border border-white/10 rounded-xl px-4 py-3 text-text"
      />
    </View>
  );
}
