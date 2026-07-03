import { Pressable, ScrollView, Text, View } from 'react-native';
import { SERIF, formatPrice } from '../../lib/editorial';
import { colorForCategory } from '../../theme/colors';
import { ItineraryDayRow, Trip } from '../../lib/types';

export function ItineraryTab({
  trip,
  rows,
  onRefine,
}: {
  trip: Trip;
  rows: ItineraryDayRow[];
  onRefine: () => void;
}) {
  const sorted = rows.slice().sort((a, b) => a.day_number - b.day_number);
  const total =
    trip.est_cost_per_person ?? sorted.reduce((sum, r) => sum + (r.est_cost ?? 0), 0);

  if (sorted.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FDFCFA', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
        <Text style={{ fontSize: 36, marginBottom: 16 }}>☰</Text>
        <Text style={{ fontFamily: SERIF, fontSize: 21, color: '#111', marginBottom: 8, textAlign: 'center' }}>
          No itinerary yet
        </Text>
        <Text
          style={{
            fontFamily: SERIF,
            fontStyle: 'italic',
            color: '#9CA3AF',
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 24,
          }}
        >
          Answer three questions and the concierge{'\n'}drafts your days in {trip.title}.
        </Text>
        <Pressable
          onPress={onRefine}
          style={({ pressed }) => ({
            backgroundColor: '#111',
            borderRadius: 100,
            paddingHorizontal: 28,
            paddingVertical: 14,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text style={{ color: 'white', fontSize: 14.5, fontWeight: '700' }}>
            ✦ Plan it with the concierge
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FDFCFA' }}
      contentContainerStyle={{
        paddingTop: 8,
        paddingHorizontal: 24,
        paddingBottom: 130,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
      <Text style={{ fontFamily: SERIF, fontSize: 24, color: '#111', marginBottom: 4 }}>
        The itinerary
      </Text>
      <Text
        style={{
          fontFamily: SERIF,
          fontStyle: 'italic',
          color: '#6B7280',
          fontSize: 13.5,
          marginBottom: 8,
        }}
      >
        {sorted.length} days
        {trip.season ? ` · ${trip.season}` : ''}
        {trip.travelers ? ` · ${trip.travelers} ${trip.travelers === 1 ? 'traveler' : 'travelers'}` : ''}
      </Text>
      {total > 0 ? (
        <Text style={{ color: '#111', fontSize: 13, fontWeight: '700', marginBottom: 22 }}>
          est. {formatPrice(Math.round(total))} <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>/ person</Text>
        </Text>
      ) : (
        <View style={{ marginBottom: 22 }} />
      )}

      {sorted.map((row, i) => {
        const last = i === sorted.length - 1;
        return (
          <View key={row.id} style={{ flexDirection: 'row' }}>
            <View style={{ width: 40, alignItems: 'center' }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: '#111',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: 'white', fontFamily: SERIF, fontSize: 13 }}>{row.day_number}</Text>
              </View>
              {!last ? (
                <View style={{ width: 1.5, flex: 1, backgroundColor: '#E5E5E0', marginVertical: 4 }} />
              ) : null}
            </View>
            <View
              style={{
                flex: 1,
                marginLeft: 12,
                marginBottom: last ? 0 : 18,
                backgroundColor: 'white',
                borderWidth: 1,
                borderColor: '#F0F0EE',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text
                  style={{
                    flex: 1,
                    color: '#9CA3AF',
                    fontSize: 9,
                    fontWeight: '700',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                  }}
                >
                  Day {row.day_number}
                </Text>
                {row.est_cost ? (
                  <View style={{ backgroundColor: '#F5F5F2', borderRadius: 100, paddingHorizontal: 9, paddingVertical: 3 }}>
                    <Text style={{ color: '#3F3F46', fontSize: 10.5, fontWeight: '700' }}>
                      ~{formatPrice(row.est_cost)} pp
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 17, marginBottom: 4 }}>
                {row.title}
              </Text>
              {row.summary ? (
                <Text
                  style={{
                    fontFamily: SERIF,
                    fontStyle: 'italic',
                    color: '#6B7280',
                    fontSize: 12.5,
                    lineHeight: 18,
                    marginBottom: 10,
                  }}
                >
                  {row.summary}
                </Text>
              ) : null}
              {row.activities.map((item, j) => (
                <View key={`${item.title}-${j}`} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colorForCategory(item.category),
                      marginTop: 5,
                      marginRight: 10,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#111', fontSize: 13.5, fontWeight: '600' }}>{item.title}</Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 12, lineHeight: 17, marginTop: 1 }}>
                      {item.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        );
      })}

      <Pressable
        onPress={onRefine}
        style={({ pressed }) => ({
          marginTop: 26,
          backgroundColor: '#111',
          borderRadius: 100,
          paddingVertical: 15,
          alignItems: 'center',
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <Text style={{ color: 'white', fontSize: 14.5, fontWeight: '700' }}>Keep refining →</Text>
      </Pressable>
    </ScrollView>
  );
}
