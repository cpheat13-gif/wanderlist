import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { SERIF } from '../lib/editorial';
import { Airport, searchAirports } from '../lib/ai';

// A searchable airport picker. Type a city, airport name, or partial IATA code
// and pick from live AI results — or just type a code directly.
export function AirportSearch({
  value,
  onChange,
  placeholder = 'Search a city or airport code…',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeQueryRef = useRef('');

  // Keep the field in sync if the parent resets the value.
  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const q = query.trim();
    if (timerRef.current) clearTimeout(timerRef.current);
    // Don't search when the field already holds a chosen "City (CODE)" value.
    if (q.length < 2 || /\([A-Z]{3}\)/.test(q)) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      activeQueryRef.current = q;
      try {
        const res = await searchAirports(q);
        if (activeQueryRef.current !== q) return;
        setResults(res.airports);
        setOpen(true);
      } catch {
        if (activeQueryRef.current === q) setResults([]);
      } finally {
        if (activeQueryRef.current === q) setLoading(false);
      }
    }, 450);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  function choose(a: Airport) {
    const label = `${a.city} (${a.code})`;
    setQuery(label);
    onChange(label);
    setResults([]);
    setOpen(false);
  }

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'white',
          borderWidth: 1,
          borderColor: '#E5E7EB',
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        <Text style={{ color: '#9CA3AF', fontSize: 14, marginRight: 10 }}>⌕</Text>
        <TextInput
          style={{ flex: 1, color: '#111', fontSize: 15 }}
          placeholder={placeholder}
          placeholderTextColor="#B6BAC2"
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            onChange(t);
            setOpen(true);
          }}
          autoCorrect={false}
          onFocus={() => setOpen(true)}
        />
        {loading ? <ActivityIndicator color="#9CA3AF" size="small" /> : null}
        {query.length > 0 && !loading ? (
          <Pressable
            onPress={() => {
              setQuery('');
              onChange('');
              setResults([]);
            }}
            hitSlop={10}
          >
            <Text style={{ color: '#9CA3AF', fontSize: 14 }}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {open && (results.length > 0 || loading) ? (
        <View
          style={{
            marginTop: 8,
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: '#F0F0EE',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {loading && results.length === 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 }}>
              <ActivityIndicator color="#9CA3AF" size="small" />
              <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 13.5 }}>
                Searching airports…
              </Text>
            </View>
          ) : null}
          {results.map((a, i) => (
            <Pressable
              key={`${a.code}-${i}`}
              onPress={() => choose(a)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: '#F5F5F2',
                backgroundColor: pressed ? '#FAFAF8' : 'white',
              })}
            >
              <View
                style={{
                  width: 46,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: '#111',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                <Text style={{ color: 'white', fontFamily: SERIF, fontSize: 13, letterSpacing: 0.5 }}>{a.code}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#111', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                  {a.city} · {a.country}
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                  {a.name}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
