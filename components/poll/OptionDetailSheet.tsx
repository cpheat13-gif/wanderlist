import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SERIF } from '../../lib/editorial';
import { PollOption } from '../../lib/types';

function fmtMoney(n: number | null | undefined): string | null {
  if (typeof n !== 'number' || !isFinite(n)) return null;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtDates(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const o = { month: 'short', day: 'numeric' } as const;
  const s = new Date(start + 'T12:00:00').toLocaleDateString('en-US', o);
  if (!end) return s;
  const e = new Date(end + 'T12:00:00').toLocaleDateString('en-US', { ...o, year: 'numeric' });
  return `${s} – ${e}`;
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#F0F0EE',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 14,
        minWidth: 104,
      }}
    >
      <Text style={{ color: '#9CA3AF', fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ fontFamily: SERIF, fontSize: 17, color: '#111', marginTop: 3 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// A slide-up sheet showing an option's snapshotted detail: cost + flight time at
// the top, a photo gallery, then the day-by-day itinerary — so voters can make an
// educated choice without leaving the poll.
export function OptionDetailSheet({ option, onClose }: { option: PollOption | null; onClose: () => void }) {
  const d = option?.detail ?? null;
  const cost = fmtMoney(d?.estCostPerPerson);
  const flight = d?.flightTime ?? null;
  const dates = fmtDates(d?.startDate ?? null, d?.endDate ?? null);
  const gallery = d?.gallery ?? [];
  const days = d?.days ?? [];

  return (
    <Modal visible={!!option} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}>
        <Pressable style={{ height: 60 }} onPress={onClose} />
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
          {/* Grabber + close */}
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5E0' }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
            <Text style={{ flex: 1, fontFamily: SERIF, fontSize: 22, color: '#111' }} numberOfLines={1}>
              {option?.label}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, color: '#9CA3AF' }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {option?.subtitle ? (
              <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#6B7280', fontSize: 14, paddingHorizontal: 20, marginBottom: 14 }}>
                {option.subtitle}
              </Text>
            ) : null}

            {/* Top-line facts */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 6 }}
            >
              {cost ? <Chip label="Est. / person" value={cost} /> : null}
              {flight ? <Chip label="Flight" value={flight} /> : null}
              {d?.travelers ? <Chip label="Travelers" value={String(d.travelers)} /> : null}
              {d?.season ? <Chip label="Season" value={d.season} /> : null}
              {dates ? <Chip label="Dates" value={dates} /> : null}
            </ScrollView>
            {d?.flightFrom && flight ? (
              <Text style={{ color: '#9CA3AF', fontSize: 12, paddingHorizontal: 20, marginTop: 8 }}>
                Flight time from {d.flightFrom} · rough estimate.
              </Text>
            ) : null}

            {/* Gallery */}
            {gallery.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingTop: 18 }}
              >
                {gallery.map((url, i) => (
                  <View key={i} style={{ width: 240, height: 150, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E9EAEC' }}>
                    <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {/* Itinerary */}
            <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
              <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
              <Text style={{ fontFamily: SERIF, fontSize: 21, color: '#111', marginBottom: 4 }}>The itinerary</Text>
              {days.length === 0 ? (
                <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, lineHeight: 21, marginTop: 6 }}>
                  No day-by-day plan yet for this one — vote on the vibe and the trip gets planned if it wins.
                </Text>
              ) : (
                <View style={{ gap: 14, marginTop: 12 }}>
                  {days.map((day) => (
                    <View
                      key={day.dayNumber}
                      style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#F0F0EE', borderRadius: 16, padding: 16 }}
                    >
                      <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                        Day {day.dayNumber}
                      </Text>
                      <Text style={{ fontFamily: SERIF, fontSize: 17, color: '#111', marginTop: 3 }}>{day.title}</Text>
                      {day.summary ? (
                        <Text style={{ color: '#6B7280', fontSize: 13.5, lineHeight: 20, marginTop: 6 }}>{day.summary}</Text>
                      ) : null}
                      {day.activities.length > 0 ? (
                        <View style={{ gap: 8, marginTop: 12 }}>
                          {day.activities.map((a, i) => (
                            <View key={i} style={{ flexDirection: 'row' }}>
                              <Text style={{ color: '#C4C0B8', fontSize: 13, marginRight: 8 }}>—</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: '#111', fontSize: 13.5, fontWeight: '600' }}>{a.title}</Text>
                                {a.description ? (
                                  <Text style={{ color: '#9CA3AF', fontSize: 12.5, lineHeight: 18, marginTop: 1 }}>{a.description}</Text>
                                ) : null}
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
