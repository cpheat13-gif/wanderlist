import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { DestinationPreview } from '../../components/discover/DestinationPreview';

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
  description: string;
  rating: string;
  bestTime: string;
  days: string;
}

const CURATED: Destination[] = [
  // Beach
  {
    name: 'Santorini', location: 'Greece', category: 'beach',
    photoQuery: 'Santorini Greece cliffs sea sunset',
    description: 'Iconic white-washed villages perched on volcanic cliffs above the deep blue Aegean Sea. Famous for dramatic sunsets, luxury cave hotels, and postcard-perfect scenery.',
    rating: '4.9', bestTime: 'Jun–Sep', days: '5–7',
  },
  {
    name: 'Maldives', location: 'Indian Ocean', category: 'beach',
    photoQuery: 'Maldives overwater bungalow crystal water',
    description: 'A tropical paradise of over 1,000 coral islands. Renowned for overwater bungalows, crystal-clear lagoons, and vibrant underwater life unlike anywhere else on Earth.',
    rating: '4.9', bestTime: 'Nov–Apr', days: '7–10',
  },
  {
    name: 'Bali', location: 'Indonesia', category: 'beach',
    photoQuery: 'Bali Indonesia rice terrace beach',
    description: 'A jewel of Indonesia with lush rice terraces, ancient temples, and vibrant surf culture. From spiritual retreats in Ubud to golden-hour cocktails on Seminyak Beach.',
    rating: '4.8', bestTime: 'Apr–Oct', days: '7–14',
  },
  {
    name: 'Amalfi Coast', location: 'Italy', category: 'beach',
    photoQuery: 'Amalfi Coast Italy coastal cliff village',
    description: 'A stretch of dramatic coastline in southern Italy where colorful villages cling to cliffsides above turquoise waters. Romantic, scenic, and endlessly photogenic.',
    rating: '4.8', bestTime: 'May–Sep', days: '5–7',
  },
  {
    name: 'Koh Samui', location: 'Thailand', category: 'beach',
    photoQuery: 'Koh Samui Thailand tropical beach palm',
    description: "Thailand's second-largest island balances laid-back tropical vibes with world-class resorts. White sand beaches, crystal-clear waters, and a vibrant food scene await.",
    rating: '4.7', bestTime: 'Dec–Apr', days: '5–7',
  },
  {
    name: 'Tulum', location: 'Mexico', category: 'beach',
    photoQuery: 'Tulum Mexico beach ruins turquoise',
    description: 'A bohemian beach town where ancient Mayan ruins overlook turquoise Caribbean waters. Famous for eco-chic cenote swimming, jungle retreats, and incredible street food.',
    rating: '4.7', bestTime: 'Dec–Apr', days: '4–7',
  },
  // Mountain
  {
    name: 'Banff', location: 'Canada', category: 'mountain',
    photoQuery: 'Banff National Park Canada turquoise lake mountains',
    description: "Canada's most iconic national park, where turquoise glacial lakes mirror snow-capped Rocky Mountain peaks. World-class skiing in winter and spectacular hiking all summer.",
    rating: '4.9', bestTime: 'Jul–Sep', days: '5–7',
  },
  {
    name: 'Swiss Alps', location: 'Switzerland', category: 'mountain',
    photoQuery: 'Swiss Alps Switzerland snowy peaks village',
    description: 'The heart of Alpine Europe, with majestic peaks, pristine ski runs, and charming mountain villages. Home to the Matterhorn and countless breathtaking panoramas.',
    rating: '4.9', bestTime: 'Jun–Sep', days: '7–14',
  },
  {
    name: 'Patagonia', location: 'Argentina', category: 'mountain',
    photoQuery: 'Patagonia Torres del Paine mountains glacier',
    description: 'At the southern tip of South America, a wild frontier of jagged granite spires, glaciers, and windswept plains. The ultimate destination for serious adventurers.',
    rating: '4.8', bestTime: 'Nov–Mar', days: '10–14',
  },
  {
    name: 'Dolomites', location: 'Italy', category: 'mountain',
    photoQuery: 'Dolomites Italy dramatic mountains meadow',
    description: "Italy's most dramatic mountain landscape, with pale limestone towers soaring above green valleys. A UNESCO World Heritage site that's equally stunning in every season.",
    rating: '4.8', bestTime: 'Jun–Sep', days: '5–7',
  },
  {
    name: 'Queenstown', location: 'New Zealand', category: 'mountain',
    photoQuery: 'Queenstown New Zealand mountains lake aerial',
    description: "New Zealand's adventure capital, set against the stunning backdrop of the Remarkables and Lake Wakatipu. Bungee jumping, skiing, and breathtaking scenery at every turn.",
    rating: '4.8', bestTime: 'Dec–Feb', days: '5–7',
  },
  {
    name: 'Iceland', location: 'Northern Europe', category: 'mountain',
    photoQuery: 'Iceland waterfall glacier northern lights',
    description: 'A land of fire and ice — glaciers, volcanoes, geysers, midnight sun, and the magical aurora borealis. Every landscape feels otherworldly and utterly unique.',
    rating: '4.9', bestTime: 'Jun–Aug', days: '7–10',
  },
  // Temple
  {
    name: 'Angkor Wat', location: 'Cambodia', category: 'temple',
    photoQuery: 'Angkor Wat Cambodia temple sunrise reflection',
    description: "The world's largest religious monument, this 12th-century Khmer complex rises from the Cambodian jungle. Watching sunrise over its iconic spires is an unforgettable experience.",
    rating: '4.9', bestTime: 'Nov–Mar', days: '3–5',
  },
  {
    name: 'Kyoto', location: 'Japan', category: 'temple',
    photoQuery: 'Kyoto Japan fushimi inari shrine torii gate',
    description: "Japan's ancient capital is a living museum of geisha districts, zen gardens, bamboo groves, and over 1,600 Buddhist temples. Magical in cherry blossom season.",
    rating: '4.9', bestTime: 'Mar–May', days: '4–7',
  },
  {
    name: 'Petra', location: 'Jordan', category: 'temple',
    photoQuery: 'Petra Jordan ancient rose city treasury',
    description: 'The rose-red city carved into desert cliffs by the Nabataean civilization. Walking through the narrow Siq canyon to suddenly behold the Treasury is one of travel\'s great moments.',
    rating: '4.9', bestTime: 'Mar–May', days: '2–3',
  },
  {
    name: 'Bagan', location: 'Myanmar', category: 'temple',
    photoQuery: 'Bagan Myanmar temples sunset hot air balloon',
    description: 'A vast plain dotted with over 2,000 ancient Buddhist temples and stupas. Drifting over the temple-studded landscape in a hot air balloon at sunrise is pure magic.',
    rating: '4.8', bestTime: 'Nov–Feb', days: '3–4',
  },
  {
    name: 'Machu Picchu', location: 'Peru', category: 'temple',
    photoQuery: 'Machu Picchu Peru Inca ruins mountains clouds',
    description: 'The legendary Inca citadel perched high in the Peruvian Andes, shrouded in clouds and mystery. One of the world\'s most impressive and awe-inspiring archaeological sites.',
    rating: '4.9', bestTime: 'May–Sep', days: '2–4',
  },
  // City
  {
    name: 'Tokyo', location: 'Japan', category: 'city',
    photoQuery: 'Tokyo Japan shibuya crossing night neon lights',
    description: 'A mesmerizing collision of ancient tradition and hyper-modern technology. From neon-lit Shibuya crossings to serene temple gardens — Tokyo never stops surprising.',
    rating: '4.9', bestTime: 'Mar–May', days: '7–10',
  },
  {
    name: 'Paris', location: 'France', category: 'city',
    photoQuery: 'Paris France Eiffel Tower golden hour river',
    description: 'The City of Light — Eiffel Tower, Louvre, croissants, and that indescribable Parisian ambiance. Romance, art, and culture at every turn.',
    rating: '4.8', bestTime: 'Apr–Jun', days: '5–7',
  },
  {
    name: 'New York', location: 'USA', category: 'city',
    photoQuery: 'New York City Manhattan skyline aerial bridge',
    description: 'The city that never sleeps — a kinetic, thrilling metropolis of iconic landmarks, world-class dining, Broadway shows, and endless neighborhoods to explore.',
    rating: '4.8', bestTime: 'Apr–Jun', days: '5–7',
  },
  {
    name: 'Barcelona', location: 'Spain', category: 'city',
    photoQuery: 'Barcelona Spain Sagrada Familia architecture',
    description: "Gaudí's masterpieces, golden beaches, vibrant nightlife, and incredible tapas. Spain's most cosmopolitan city is an assault on the senses — in the very best way.",
    rating: '4.8', bestTime: 'May–Sep', days: '4–6',
  },
  {
    name: 'Dubai', location: 'UAE', category: 'city',
    photoQuery: 'Dubai UAE skyline Burj Khalifa night modern',
    description: 'A city of superlatives — the world\'s tallest building, most ambitious architecture, and most luxurious hotels. A futuristic desert oasis that never stops breaking records.',
    rating: '4.7', bestTime: 'Nov–Mar', days: '4–6',
  },
];

const POPULAR: Destination[] = [
  {
    name: 'Cappadocia', location: 'Turkey', category: 'all' as CategoryKey,
    photoQuery: 'Cappadocia Turkey hot air balloon sunrise fairy chimneys',
    description: 'A surreal landscape of fairy chimneys, underground cities, and cave hotels in central Turkey. Floating over the valleys in a hot air balloon at sunrise is pure magic.',
    rating: '4.9', bestTime: 'Apr–Jun', days: '3–5',
  },
  {
    name: 'Bora Bora', location: 'French Polynesia', category: 'all' as CategoryKey,
    photoQuery: 'Bora Bora French Polynesia overwater bungalow lagoon blue',
    description: 'The jewel of French Polynesia, with its iconic shark-fin mountain, electric blue lagoon, and overwater bungalows. Widely considered the most beautiful island in the world.',
    rating: '4.9', bestTime: 'May–Oct', days: '5–7',
  },
  {
    name: 'Tuscany', location: 'Italy', category: 'all' as CategoryKey,
    photoQuery: 'Tuscany Italy rolling hills vineyard golden cypress',
    description: 'Rolling hills of vineyards, olive groves, medieval hilltop towns, and world-famous Renaissance art. Italy\'s most beloved region is a feast for every sense.',
    rating: '4.8', bestTime: 'Apr–Jun', days: '7–10',
  },
];

export default function BucketListScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryKey>('all');
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  const [adding, setAdding] = useState(false);
  const [searchPhoto, setSearchPhoto] = useState<string | null>(null);
  const [searchPhotoLoading, setSearchPhotoLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(useCallback(() => {
    setStatusBarStyle('dark');
    return () => setStatusBarStyle('light');
  }, []));

  useEffect(() => {
    [...CURATED, ...POPULAR].forEach((dest) => {
      fetchDestinationPhoto(dest.photoQuery).then((photo) => {
        if (photo) setPhotos((prev) => ({ ...prev, [dest.name]: photo.url }));
      });
    });
  }, []);

  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchPhoto(null);
      setSearchPhotoLoading(false);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      return;
    }
    setSearchPhotoLoading(true);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      const photo = await fetchDestinationPhoto(`${q} travel landscape`);
      setSearchPhoto(photo?.url ?? null);
      setSearchPhotoLoading(false);
    }, 500);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

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

  async function handleAddToBucketList() {
    if (!session || !selectedDest || adding) return;
    setAdding(true);
    try {
      const { data: trip, error } = await supabase
        .from('trips')
        .insert({
          created_by: session.user.id,
          title: selectedDest.name,
          destination: `${selectedDest.name}, ${selectedDest.location}`,
          cover_photo_url: photos[selectedDest.name] ?? searchPhoto ?? null,
          status: 'idea',
        })
        .select()
        .single();
      if (!error && trip) {
        setSelectedDest(null);
        router.push(`/discover/${trip.id}`);
      }
    } finally {
      setAdding(false);
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
            <Pressable
              key={cat.key}
              onPress={() => setCategory(cat.key)}
              style={{ alignItems: 'center' }}
            >
              <Text
                style={{
                  color: isActive ? '#111' : '#9CA3AF',
                  fontWeight: isActive ? '700' : '400',
                  fontSize: 15,
                }}
              >
                {cat.label}
              </Text>
              <View
                style={{
                  height: 2.5,
                  backgroundColor: isActive ? '#111' : 'transparent',
                  borderRadius: 2,
                  marginTop: 4,
                  width: '100%',
                  minWidth: 4,
                }}
              />
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
        {/* 2-column curated grid */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
            paddingHorizontal: 16,
            marginBottom: 28,
          }}
        >
          {/* Custom search card — always shown when user has typed something */}
          {search.trim() ? (
            <Pressable
              onPress={() =>
                setSelectedDest({
                  name: search.trim(),
                  location: '',
                  category: 'all' as CategoryKey,
                  photoQuery: `${search.trim()} travel landscape`,
                  description:
                    'Add this destination to your bucket list and start exploring hotels, restaurants, activities, and sightseeing spots.',
                  rating: '—',
                  bestTime: '—',
                  days: '—',
                })
              }
              style={{
                width: '100%',
                height: 100,
                borderRadius: 20,
                overflow: 'hidden',
                backgroundColor: '#1C1C2E',
              }}
            >
              {searchPhoto ? (
                <Image
                  source={{ uri: searchPhoto }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={300}
                />
              ) : searchPhotoLoading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color="rgba(255,255,255,0.5)" />
                </View>
              ) : null}
              <LinearGradient
                colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.72)']}
                locations={[0, 1]}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 3 }}>
                    Add destination
                  </Text>
                  <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>
                    {search.trim()}
                  </Text>
                </View>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#059669',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 20, lineHeight: 24 }}>+</Text>
                </View>
              </View>
            </Pressable>
          ) : null}

          {filtered.length === 0 ? (
            !search.trim() ? (
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
                No destinations found — try a different filter.
              </Text>
            ) : null
          ) : (
            filtered.map((dest) => (
              <Pressable
                key={dest.name}
                onPress={() => setSelectedDest(dest)}
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
                  style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' }}
                />
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 }}>
                  <Text
                    style={{ color: 'white', fontSize: 16, fontWeight: '700', letterSpacing: -0.3 }}
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
              </Pressable>
            ))
          )}
        </View>

        {/* Popular section */}
        {showPopular ? (
          <View style={{ paddingHorizontal: 16, marginBottom: 32 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 14 }}>
              Popular ▾
            </Text>
            {POPULAR.map((dest) => (
              <Pressable
                key={dest.name}
                onPress={() => setSelectedDest(dest)}
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
                  style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '80%' }}
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
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 3 }}>
                    {dest.location}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

      </ScrollView>

      {/* Destination preview modal */}
      <DestinationPreview
        dest={selectedDest}
        photoUrl={selectedDest ? (photos[selectedDest.name] ?? searchPhoto ?? null) : null}
        visible={!!selectedDest}
        onClose={() => setSelectedDest(null)}
        onAdd={handleAddToBucketList}
        adding={adding}
      />
    </SafeAreaView>
  );
}
