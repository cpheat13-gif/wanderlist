import { Text, View } from 'react-native';
import { Flight } from '../lib/types';

function formatTime(value: string | null): string {
  if (!value) return '--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function FlightCard({ flight }: { flight: Flight }) {
  return (
    <View className="bg-surface border border-white/10 rounded-xl p-4 mb-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-text text-base font-semibold">
          {flight.from_airport} → {flight.to_airport}
        </Text>
        {flight.flight_number ? (
          <Text className="text-textMuted text-xs">{flight.flight_number}</Text>
        ) : null}
      </View>
      <Text className="text-textMuted text-sm mt-1">
        {flight.airline ? `${flight.airline} · ` : ''}
        {formatTime(flight.departure_time)} → {formatTime(flight.arrival_time)}
      </Text>
      {flight.notes ? <Text className="text-textMuted text-sm mt-1">{flight.notes}</Text> : null}
    </View>
  );
}
