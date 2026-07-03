import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchDestinationPhoto } from '../lib/unsplash';
import { SERIF } from '../lib/editorial';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = 'wanderlist_onboarded_v1';

const PAGES = [
  {
    kicker: 'Welcome to Wanderlist',
    title: 'The world,\nbeautifully organized',
    body: 'A travel journal you plan inside. Browse destinations the way you would flip through a magazine — then keep the ones that keep you up at night.',
    photoQuery: 'Santorini caldera sunset aerial dramatic',
  },
  {
    kicker: 'Dream first',
    title: 'Build a bucket list\nworth the name',
    body: 'Tap the heart on anything that moves you. Dive deeper with photo galleries, honest reviews, and day-by-day journeys crafted by people who have been.',
    photoQuery: 'Wadi Rum desert night stars camp',
  },
  {
    kicker: 'Then make it real',
    title: 'From wish\nto window seat',
    body: 'When a dream is ready, move it into planning — search hotels and hidden gems, pin your finds, and book the journey without leaving the page.',
    photoQuery: 'Ha Long Bay junk boat sunrise mist',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);

  useEffect(() => {
    PAGES.forEach((p, i) => {
      fetchDestinationPhoto(p.photoQuery).then((photo) => {
        if (photo)
          setPhotos((prev) => {
            const next = [...prev];
            next[i] = photo.url;
            return next;
          });
      });
    });
  }, []);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const p = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (p !== page) setPage(p);
  }

  async function finish() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  function next() {
    if (page < PAGES.length - 1) {
      scrollRef.current?.scrollTo({ x: (page + 1) * SCREEN_WIDTH, animated: true });
    } else {
      finish();
    }
  }

  const last = page === PAGES.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: '#0E0E14' }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
      >
        {PAGES.map((p, i) => (
          <View key={i} style={{ width: SCREEN_WIDTH, flex: 1 }}>
            {photos[i] ? (
              <Image
                source={{ uri: photos[i]! }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                contentFit="cover"
                transition={500}
              />
            ) : null}
            <LinearGradient
              colors={['rgba(10,10,16,0.55)', 'rgba(10,10,16,0.15)', 'rgba(10,10,16,0.92)']}
              locations={[0, 0.4, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 32, paddingBottom: 170 }}>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  marginBottom: 14,
                }}
              >
                {p.kicker}
              </Text>
              <Text style={{ fontFamily: SERIF, color: 'white', fontSize: 36, lineHeight: 44, letterSpacing: -0.5 }}>
                {p.title}
              </Text>
              <Text
                style={{
                  fontFamily: SERIF,
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 15,
                  lineHeight: 24,
                  marginTop: 16,
                }}
              >
                {p.body}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Skip */}
      <Pressable
        onPress={finish}
        hitSlop={12}
        style={{ position: 'absolute', top: insets.top + 14, right: 24 }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' }}>Skip</Text>
      </Pressable>

      {/* Dots + CTA */}
      <View
        style={{
          position: 'absolute',
          left: 32,
          right: 32,
          bottom: insets.bottom + 30,
          gap: 24,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={{
                width: page === i ? 20 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: page === i ? 'white' : 'rgba(255,255,255,0.4)',
              }}
            />
          ))}
        </View>
        <Pressable
          onPress={next}
          style={({ pressed }) => ({
            backgroundColor: 'white',
            borderRadius: 100,
            paddingVertical: 17,
            alignItems: 'center',
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text style={{ color: '#111', fontSize: 15, fontWeight: '700' }}>
            {last ? 'Begin exploring' : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
