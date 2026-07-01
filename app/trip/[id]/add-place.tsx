import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../../../components/PillButton';
import { colorForCategory } from '../../../theme/colors';
import { supabase } from '../../../lib/supabase';
import { PlaceCategory } from '../../../lib/types';

const CATEGORIES: { value: PlaceCategory; label: string }[] = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'activity', label: 'Activity' },
  { value: 'sightseeing', label: 'Sightseeing' },
];

export default function AddPlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [category, setCategory] = useState<PlaceCategory>('hotel');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('places').insert({
      trip_id: id,
      category,
      name: name.trim(),
      address: address.trim() || null,
      lat: lat.trim() ? Number(lat) : null,
      lng: lng.trim() ? Number(lng) : null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-5 pt-4">
        <Text className="text-textMuted text-xs uppercase mb-2" style={{ letterSpacing: 2 }}>
          Category
        </Text>
        <View className="flex-row gap-2 mb-4">
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.value}
              onPress={() => setCategory(c.value)}
              className={`flex-row items-center gap-2 rounded-full px-4 py-2 border ${
                category === c.value ? 'border-white/40 bg-white/10' : 'border-white/10'
              }`}
            >
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: colorForCategory(c.value) }} />
              <Text className="text-text text-sm">{c.label}</Text>
            </Pressable>
          ))}
        </View>

        <Field label="Name" value={name} onChangeText={setName} placeholder="Hotel name" />
        <Field label="Address" value={address} onChangeText={setAddress} placeholder="123 Fjord St" />

        <View className="flex-row gap-3">
          <View className="flex-1" style={{ minWidth: 0 }}>
            <Field label="Latitude" value={lat} onChangeText={setLat} placeholder="60.39" keyboardType="numeric" />
          </View>
          <View className="flex-1" style={{ minWidth: 0 }}>
            <Field label="Longitude" value={lng} onChangeText={setLng} placeholder="5.32" keyboardType="numeric" />
          </View>
        </View>

        <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" />

        {error ? <Text className="text-restaurant text-sm mb-3">{error}</Text> : null}

        <PillButton
          label="Save Place"
          onPress={handleSave}
          variant="solid"
          loading={saving}
          disabled={!name.trim()}
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
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View className="mb-4" style={{ minWidth: 0 }}>
      <Text className="text-textMuted text-xs uppercase mb-2" style={{ letterSpacing: 2 }}>
        {props.label}
      </Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#9B9AA3"
        keyboardType={props.keyboardType}
        style={{ minWidth: 0 }}
        className="bg-surface border border-white/10 rounded-xl px-4 py-3 text-text"
      />
    </View>
  );
}
