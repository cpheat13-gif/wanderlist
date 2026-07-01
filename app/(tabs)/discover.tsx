import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { fetchDestinationPhoto } from '../../lib/unsplash';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 32 - 12) / 2);

type CategoryKey = 'all' | 'beach' | 'mountain' | 'temple' | 'city';

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'beach', label: 'Beach' },
  { key: 'mountain', label: 'Mountain' },
  { key: 'temple', label: 'Temple' },
  { key: 'city', label: 'City' },
];

interface Destination {
  name: string;
  location: string;
  category: CategoryKey;
  photoQuery: string;
}

const CURATED: Destination[] = [
  // Beach
  { name: 'Santorini', location: 'Greece', category: 'beach', photoQuery: 'Santorini Greece cliffs sea' },
  { name: 'Maldives', location: 'Indian Ocean', category: 'beach', photoQuery: 'Maldives overwater bungalow crystal water' },
  { name: 'Bali', location: 'Indonesia', category: 'beach', photoQuery: 'Bali Indonesia rice terrace beach' },
  { name: 'Amalfi Coast', location: 'Italy', category: 'beach', photoQuery: 'Amalfi Coast Italy coastal cliff' },
  { name: 'Koh Samui', location: 'Thailand', category: 'beach', photoQuery: 'Koh Samui Thailand tropical beach' },
  { name: 'Tulum', location: 'Mexico', category: 'beach', photoQuery: 'Tulum Mexico beach ruins' },
  // Mountain
  { name: 'Banff', location: 'Canada', category: 'mountain', photoQuery: 'Banff National Park Canada turquoise lake' },
  { name: 'Swiss Alps', location: 'Switzerland', category: 'mountain', photoQuery: 'Swiss Alps Switzerland snowy peaks' },
  { name: 'Patagonia', location: 'Argentina', category: 'mountain', photoQuery: 'Patagonia Torres del Paine mountains' },
  { name: 'Dolomites', location: 'Italy', category: 'mountain', photoQuery: 'Dolomites Italy dramatic mountains' },
  { name: 'Queenstown', location: 'New Zealand', category: 'mountain', photoQuery: 'Queenstown New Zealand mountains lake' },
  { name: 'Iceland', location: 'Northern Europe', category: 'mountain', photoQuery: 'Iceland waterfall glacier landscape' },
  // Temple
  { name: 'Angkor Wat', location: 'Cambodia', category: 'temple', photoQuery: 'Angkor Wat Cambodia temple sunrise' },
  { name: 'Kyoto', location: 'Japan', category: 'temple', photoQuery: 'Kyoto Japan fushimi inari shrine gate' },
  { name: 'Petra', location: 'Jordan', category: 'temple', photoQuery: 'Petra Jordan ancient rose city' },
  { name: 'Bagan', location: 'Myanmar', category: 'temple', photoQuery: 'Bagan Myanmar temples sunset hot air balloon' },
  { name: 'Machu Picchu', location: 'Peru', category: 'temple', photoQuery: 'Machu Picchu Peru Inca ruins mountains' },
  // City
  { name: 'Tokyo', location: 'Japan', category: 'city', photoQuery: 'Tokyo Japan shibuya crossing night neon' },
  { name: 'Paris', location: 'France', category: 'city', photoQuery: 'Paris France Eiffel Tower golden hour' },
  { name: 'New York', location: 'USA', category: 'city', photoQuery: 'New York City Manhattan skyline aerial' },
  { name: 'Barcelona', location: 'Spain', category: 'city', photoQuery: 'Barcelona Spain Sagrada Familia architecture' },
  { name: 'Dubai', location: 'UAE', category: 'city', photoQuery: 'Dubai UAE skyline Burj Khalifa modern' },
];

const POPULAR: Destination[] = [
  { name: 'Cappadocia', location: 'Turkey', category: 'all', photoQuery: 'Cappadocia Turkey hot air balloon sunrise' },
  { name: 'Bora Bora', location: 'French Polynesia', category: 'all', photoQuery: 'Bora Bora French Polynesia overwater bungalow lagoon' },
  { name: 'Tuscany', location: 'Italy', category: 'all', photoQuery: 'Tuscany Italy rolling hills vineyard golden' },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryKey>('all');
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [committing, setCommitting] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
      return () => setStatusBarStyle('light');
    }, [])
  );

  useEffect(() => {
    [...CURATED, ...POPULAR].forEach((dest) => {
      fetchDestinationPhoto(dest.photoQuery).then((photo) => {
        if (photo) setPhotos((prev) => ({ ...prev, [dest.name]: photo.url }));
      });
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CURATED.filter((d) => {
      const matchesCat = category === 'all' || d.category === category;
      const matchesSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [category, search]);

  const showPopular = category === 'all' && !search.trim();

  async function handleSelect(dest: Destination) {
    if (!session || committing) return;
    setCommitting(dest.name);
    try {
      const { data: trip, error } = await supabase
        .from('trips')
        .insert({
          created_by: session.user.id,
          title: dest.name,
          destination: `${dest.name}, ${dest.location}`,
          cover_photo_url: photos[dest.name] ?? null,
          status: 'idea',
        })
        .select()
        .single();
      if (!error && trip) router.push(`/discover/${trip.id}`);
    } finally {
      setCommitting(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Title */}
      <View style={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 8 }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#111', lineHeight: 40 }}>
          {'Discover\nNew Destination'}
        </Text>
      </View>

      {/* Search row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingBottom: 14,
          gap: 10,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F3F4F6',
            borderRadius: 100,
            paddingHorizontal: 16,
            height: 46,
          }}
        >
          <Text style={{ color: '#9CA3AF', fontSize: 15, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={{ flex: 1, color: '#111', fontSize: 14 }}
            placeholder="Search places..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Text style={{ color: '#9CA3AF', fontSize: 15 }}>✕</Text>
            </Pressable>
          ) : null}
        </View>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: '#059669',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: 'white', fontSize: 17 }}>⊞</Text>
        </View>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 28, paddingBottom: 14 }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = category === cat.key;
          return (
            <Pressable key={cat.key} onPress={() => setCategory(cat.key)} style={{ alignItems: 'center' }}>
              <Text
                style={{
                  color: isActive ? '#111' : '#9CA3AF',
                  fontWeight: isActive ? '700' : '400',
                  fontSize: 15,
                }}
              >
                {cat.label}
              </Text>
              {isActive ? (
                <View
                  style={{
                    height: 2.5,
                    backgroundColor: '#111',
                    borderRadius: 2,
                    marginTop: 4,
                    width: '100%',
                  }}
                />
              ) : (
                <View style={{ height: 2.5, marginTop: 4 }} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 2-column grid */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
            paddingHorizontal: 16,
            marginBottom: 28,
          }}
        >
          {filtered.length === 0 ? (
            <Text
              style={{
                color: '#9CA3AF',
                fontSize: 14,
                textAlign: 'center',
                marginTop: 28,
                width: '100%',
                lineHeight: 22,
              }}
            >
              No destinations found — try a different filter or search.
            </Text>
          ) : (
            filtered.map((dest) => (
              <Pressable
                key={dest.name}
                onPress={() => handleSelect(dest)}
                disabled={!!committing}
                style={{
                  width: CARD_WIDTH,
                  height: 200,
                  borderRadius: 20,
                  overflow: 'hidden',
                  backgroundColor: '#D1D5DB',
                }}
              >
                {photos[dest.name] ? (
                  <Image
                    source={{ uri: photos[dest.name] }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={300}
                  />
                ) : null}

                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.9)']}
                  locations={[0.35, 0.68, 1]}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: '70%',
                  }}
                />

                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: 14,
                  }}
                >
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 16,
                      fontWeight: '700',
                      letterSpacing: -0.3,
                    }}
                    numberOfLines={1}
                  >
                    {dest.name}
                  </Text>
                  <Text
                    style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {dest.location}
                  </Text>
                </View>

                {committing === dest.name ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ActivityIndicator color="white" />
                  </View>
                ) : null}
              </Pressable>
            ))
          )}
        </View>

        {/* Popular section */}
        {showPopular ? (
          <View style={{ paddingHorizontal: 16 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: '700',
                color: '#111',
                marginBottom: 14,
              }}
            >
              Popular ▾
            </Text>
            {POPULAR.map((dest) => (
              <Pressable
                key={dest.name}
                onPress={() => handleSelect(dest)}
                disabled={!!committing}
                style={{
                  height: 140,
                  borderRadius: 20,
                  overflow: 'hidden',
                  marginBottom: 14,
                  backgroundColor: '#D1D5DB',
                }}
              >
                {photos[dest.name] ? (
                  <Image
                    source={{ uri: photos[dest.name] }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={300}
                  />
                ) : null}

                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.82)']}
                  locations={[0.2, 0.6, 1]}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: '80%',
                  }}
                />

                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: 16,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>
                    {dest.name}
                  </Text>
                  <Text
                    style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 3 }}
                  >
                    {dest.location}
                  </Text>
                </View>

                {committing === dest.name ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ActivityIndicator color="white" />
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
