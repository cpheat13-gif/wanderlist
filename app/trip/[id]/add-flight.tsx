import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../../../components/PillButton';
import { supabase } from '../../../lib/supabase';

export default function AddFlightScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [fromAirport, setFromAirport] = useState('');
  const [toAirport, setToAirport] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('flights').insert({
      trip_id: id,
      airline: airline.trim() || null,
      flight_number: flightNumber.trim() || null,
      from_airport: fromAirport.trim().toUpperCase(),
      to_airport: toAirport.trim().toUpperCase(),
      departure_time: departureTime.trim() || null,
      arrival_time: arrivalTime.trim() || null,
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
        <View className="flex-row gap-3">
          <View className="flex-1" style={{ minWidth: 0 }}>
            <Field label="From" value={fromAirport} onChangeText={setFromAirport} placeholder="JFK" autoCapitalize="characters" />
          </View>
          <View className="flex-1" style={{ minWidth: 0 }}>
            <Field label="To" value={toAirport} onChangeText={setToAirport} placeholder="OSL" autoCapitalize="characters" />
          </View>
        </View>

        <Field label="Airline" value={airline} onChangeText={setAirline} placeholder="Norse Atlantic" />
        <Field label="Flight number" value={flightNumber} onChangeText={setFlightNumber} placeholder="N0123" autoCapitalize="characters" />
        <Field
          label="Departure (ISO date/time)"
          value={departureTime}
          onChangeText={setDepartureTime}
          placeholder="2026-08-01T18:30:00Z"
        />
        <Field
          label="Arrival (ISO date/time)"
          value={arrivalTime}
          onChangeText={setArrivalTime}
          placeholder="2026-08-02T07:10:00Z"
        />
        <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" />

        {error ? <Text className="text-restaurant text-sm mb-3">{error}</Text> : null}

        <PillButton
          label="Save Flight"
          onPress={handleSave}
          variant="solid"
          loading={saving}
          disabled={!fromAirport.trim() || !toAirport.trim()}
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
  autoCapitalize?: 'none' | 'characters';
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
        autoCapitalize={props.autoCapitalize}
        style={{ minWidth: 0 }}
        className="bg-surface border border-white/10 rounded-xl px-4 py-3 text-text"
      />
    </View>
  );
}
