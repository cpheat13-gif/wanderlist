import { Text, View } from 'react-native';
import { SERIF } from '../../lib/editorial';
import { PollOption, PollVote } from '../../lib/types';

// Live bar chart per option, sorted by vote count descending, with voter names.
export function PollResults({ options, votes }: { options: PollOption[]; votes: PollVote[] }) {
  const total = votes.length;
  const byOption: Record<string, PollVote[]> = {};
  votes.forEach((v) => {
    if (!byOption[v.option_id]) byOption[v.option_id] = [];
    byOption[v.option_id].push(v);
  });

  const ranked = options
    .map((o) => ({ option: o, votes: byOption[o.id] ?? [] }))
    .sort((a, b) => b.votes.length - a.votes.length);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 }}>
        <View style={{ width: 28, height: 2, backgroundColor: '#111', marginRight: 10, alignSelf: 'center' }} />
        <Text style={{ fontFamily: SERIF, fontSize: 21, color: '#111' }}>Results</Text>
        <Text style={{ color: '#9CA3AF', fontSize: 12.5, marginLeft: 8 }}>
          {total} {total === 1 ? 'vote' : 'votes'}
        </Text>
      </View>

      {total === 0 ? (
        <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, lineHeight: 21 }}>
          No votes yet — be the first, or share the link to get the group in.
        </Text>
      ) : (
        <View style={{ gap: 16 }}>
          {ranked.map(({ option, votes: ov }, i) => {
            const pct = total > 0 ? Math.round((ov.length / total) * 100) : 0;
            const leading = i === 0 && ov.length > 0;
            return (
              <View key={option.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ flex: 1, fontFamily: SERIF, fontSize: 16, color: '#111' }} numberOfLines={1}>
                    {option.label}
                  </Text>
                  <Text style={{ color: '#111', fontSize: 13, fontWeight: '700' }}>{pct}%</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 12, marginLeft: 8 }}>
                    {ov.length} {ov.length === 1 ? 'vote' : 'votes'}
                  </Text>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: '#EEEEEA', overflow: 'hidden' }}>
                  <View
                    style={{
                      width: `${pct}%`,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: leading ? '#111' : '#B9B3A8',
                    }}
                  />
                </View>
                {ov.length > 0 ? (
                  <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 6, lineHeight: 17 }}>
                    {ov.map((v) => v.voter_name).join(' · ')}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
