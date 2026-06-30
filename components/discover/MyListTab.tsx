import { ScrollView, Text, View } from 'react-native';
import { Place, PlaceCategory } from '../../lib/types';
import { BookedPlaceRow } from './BookedPlaceRow';
import { supabase } from '../../lib/supabase';

const CATEGORY_SECTIONS: { key: PlaceCategory; label: string }[] = [
  { key: 'hotel', label: 'Hotels' },
  { key: 'restaurant', label: 'Food' },
  { key: 'activity', label: 'Activities' },
  { key: 'sightseeing', label: 'Sightseeing' },
];

export function MyListTab({
  places,
  onPlaceUpdate,
}: {
  places: Place[];
  onPlaceUpdate: (updated: Place) => void;
}) {
  function handleToggleBooked(place: Place) {
    const updated = { ...place, is_booked: !place.is_booked };
    onPlaceUpdate(updated);
    supabase.from('places').update({ is_booked: updated.is_booked }).eq('id', place.id);
  }

  function handleChangeConfirmation(place: Place, value: string) {
    const updated = { ...place, confirmation_number: value || null };
    onPlaceUpdate(updated);
    supabase.from('places').update({ confirmation_number: updated.confirmation_number }).eq('id', place.id);
  }

  if (places.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-white/40 text-center text-base">
          Nothing added yet — explore and tap + Add to build your list.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 110 }}>
      {CATEGORY_SECTIONS.map(({ key, label }) => {
        const items = places.filter((p) => p.category === key);
        if (items.length === 0) return null;
        return (
          <View key={key} className="mb-6">
            <Text className="text-white/60 font-semibold text-xs uppercase tracking-widest mb-3">{label}</Text>
            {items.map((place) => (
              <BookedPlaceRow
                key={place.id}
                place={place}
                onToggleBooked={() => handleToggleBooked(place)}
                onChangeConfirmation={(val) => handleChangeConfirmation(place, val)}
              />
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}
