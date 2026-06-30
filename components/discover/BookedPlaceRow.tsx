import { Pressable, Text, TextInput, View } from 'react-native';
import { PlaceCard } from '../PlaceCard';
import { Place } from '../../lib/types';

export function BookedPlaceRow({
  place,
  onToggleBooked,
  onChangeConfirmation,
}: {
  place: Place;
  onToggleBooked: () => void;
  onChangeConfirmation: (value: string) => void;
}) {
  return (
    <View className="mb-3">
      <PlaceCard place={place} />
      <View className="flex-row items-center gap-3 bg-surface border border-white/10 rounded-xl px-4 py-3 -mt-3">
        <Pressable
          onPress={onToggleBooked}
          className={`w-6 h-6 rounded-md items-center justify-center border ${
            place.is_booked ? 'bg-accent border-accent' : 'border-white/30'
          }`}
        >
          {place.is_booked ? <Text className="text-bg text-xs font-bold">✓</Text> : null}
        </Pressable>
        <Text className="text-textMuted text-sm">{place.is_booked ? 'Booked' : 'Not booked'}</Text>
        <TextInput
          className="flex-1 text-text text-sm"
          placeholder="Confirmation #"
          placeholderTextColor="#9B9AA3"
          defaultValue={place.confirmation_number ?? ''}
          onEndEditing={(e) => onChangeConfirmation(e.nativeEvent.text)}
        />
      </View>
    </View>
  );
}
