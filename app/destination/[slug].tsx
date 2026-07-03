import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { fetchDestinationPhoto } from '../../lib/unsplash';
import { SERIF, destinationBySlug, formatPrice } from '../../lib/editorial';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GALLERY_H = Math.round(SCREEN_HEIGHT * 0.52);
const GRID_W = Math.floor((SCREEN_WIDTH - 48 - 10) / 2);

export default function DestinationDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const dest = useMemo(() => destinationBySlug(slug ?? ''), [slug]);

  const [gallery, setGallery] = useState<(string | null)[]>([null, null, null, null]);
  const [highlightPhotos, setHighlightPhotos] = useState<Record<number, string>>({});
  const [page, setPage] = useState(0);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    setStatusBarStyle('light');
    return () => setStatusBarStyle('dark');
  }, []));

  useEffect(() => {
    if (!dest) return;
    dest.galleryQueries.forEach((q, i) => {
      fetchDestinationPhoto(q).then((photo) => {
        if (photo)
          setGallery((prev) => {
            const next = [...prev];
            next[i] = photo.url;
            return next;
          });
      });
    });
    dest.highlights.forEach((h, i) => {
      fetchDestinationPhoto(h.photoQuery).then((photo) => {
        if (photo) setHighlightPhotos((prev) => ({ ...prev, [i]: photo.url }));
      });
    });
  }, [dest]);

  useFocusEffect(
    useCallback(() => {
      if (!dest) return;
      supabase
        .from('trips')
        .select('id')
        .eq('status', 'idea')
        .eq('title', dest.name)
        .limit(1)
        .then(({ data }) => setSavedTripId(data?.[0]?.id ?? null));
    }, [dest])
  );

  async function toggleWishlist() {
    if (!session || !dest) return;
    if (savedTripId) {
      const id = savedTripId;
      setSavedTripId(null);
      await supabase.from('trips').delete().eq('id', id);
    } else {
      setSavedTripId('pending');
      const { data } = await supabase
        .from('trips')
        .insert({
          created_by: session.user.id,
          title: dest.name,
          destination: `${dest.name}, ${dest.country}`,
          cover_photo_url: gallery[0] ?? null,
          status: 'idea',
        })
        .select()
        .single();
      setSavedTripId(data?.id ?? null);
    }
  }

  function onGalleryScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const p = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (p !== page) setPage(p);
  }

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/discover');
  }

  if (!dest) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FDFCFA', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#9CA3AF' }}>Destination not found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Swipeable gallery ── */}
        <View style={{ height: GALLERY_H, backgroundColor: '#17171E' }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onGalleryScroll}
          >
            {gallery.map((url, i) => (
              <View key={i} style={{ width: SCREEN_WIDTH, height: GALLERY_H }}>
                {url ? (
                  <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color="rgba(255,255,255,0.4)" />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <LinearGradient
            colors={['rgba(0,0,0,0.45)', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110 }}
            pointerEvents="none"
          />

          {/* Pagination dots */}
          <View
            style={{
              position: 'absolute',
              bottom: 44,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}
            pointerEvents="none"
          >
            {gallery.map((_, i) => (
              <View
                key={i}
                style={{
                  width: page === i ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: page === i ? 'white' : 'rgba(255,255,255,0.5)',
                }}
              />
            ))}
          </View>

          {/* Back */}
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => ({
              position: 'absolute',
              top: insets.top + 10,
              left: 18,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.92)',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.9 : 1 }],
            })}
          >
            <Text style={{ fontSize: 20, color: '#111', lineHeight: 24 }}>‹</Text>
          </Pressable>

          {/* Wishlist */}
          <Pressable
            onPress={toggleWishlist}
            style={({ pressed }) => ({
              position: 'absolute',
              top: insets.top + 10,
              right: 18,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.92)',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.88 : 1 }],
            })}
          >
            <Text style={{ fontSize: 17, color: savedTripId ? '#E11D48' : '#111' }}>
              {savedTripId ? '♥' : '♡'}
            </Text>
          </Pressable>
        </View>

        {/* ── Editorial sheet ── */}
        <View
          style={{
            marginTop: -28,
            backgroundColor: '#FDFCFA',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 26,
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              color: '#9CA3AF',
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            {dest.region} · {dest.country}
          </Text>
          <Text style={{ fontFamily: SERIF, fontSize: 34, color: '#111', letterSpacing: -0.5 }}>
            {dest.name}
          </Text>
          <Text
            style={{
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontSize: 16,
              color: '#6B7280',
              marginTop: 6,
              marginBottom: 18,
            }}
          >
            {dest.tagline}
          </Text>

          <Text style={{ fontFamily: SERIF, fontSize: 15.5, lineHeight: 26, color: '#3F3F46' }}>
            {dest.intro}
          </Text>

          {/* ── Key facts ── */}
          <View
            style={{
              flexDirection: 'row',
              marginTop: 24,
              backgroundColor: 'white',
              borderWidth: 1,
              borderColor: '#F0F0EE',
              borderRadius: 18,
              overflow: 'hidden',
            }}
          >
            {[
              { label: 'Best season', value: dest.facts.season },
              { label: 'Language', value: dest.facts.language },
              { label: 'Currency', value: dest.facts.currency },
              { label: 'Trip length', value: dest.facts.tripLength },
            ].map((f, i) => (
              <View
                key={f.label}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingHorizontal: 6,
                  alignItems: 'center',
                  borderLeftWidth: i > 0 ? 1 : 0,
                  borderLeftColor: '#F0F0EE',
                }}
              >
                <Text
                  style={{
                    color: '#9CA3AF',
                    fontSize: 8.5,
                    fontWeight: '700',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    marginBottom: 5,
                    textAlign: 'center',
                  }}
                >
                  {f.label}
                </Text>
                <Text style={{ color: '#111', fontSize: 11.5, fontWeight: '600', textAlign: 'center' }}>
                  {f.value}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Photo grid ── */}
          <View style={{ marginTop: 30 }}>
            <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
            <Text style={{ fontFamily: SERIF, fontSize: 21, color: '#111', marginBottom: 14 }}>
              In pictures
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {gallery.map((url, i) => (
                <View
                  key={i}
                  style={{
                    width: GRID_W,
                    height: i % 3 === 0 ? 200 : 150,
                    borderRadius: 14,
                    overflow: 'hidden',
                    backgroundColor: '#E9EAEC',
                  }}
                >
                  {url ? (
                    <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
                  ) : null}
                </View>
              ))}
            </View>
          </View>

          {/* ── Highlights & local secrets ── */}
          <View style={{ marginTop: 32 }}>
            <View style={{ width: 28, height: 2, backgroundColor: '#111', marginBottom: 10 }} />
            <Text style={{ fontFamily: SERIF, fontSize: 21, color: '#111', marginBottom: 4 }}>
              Highlights & local secrets
            </Text>
            <Text
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                color: '#9CA3AF',
                fontSize: 13.5,
                marginBottom: 18,
              }}
            >
              The marquee moments — and the ones the guidebooks miss.
            </Text>

            {dest.highlights.map((h, i) => (
              <View key={h.title} style={{ marginBottom: 24 }}>
                <View
                  style={{
                    height: 180,
                    borderRadius: 18,
                    overflow: 'hidden',
                    backgroundColor: '#E9EAEC',
                    marginBottom: 12,
                  }}
                >
                  {highlightPhotos[i] ? (
                    <Image
                      source={{ uri: highlightPhotos[i] }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={300}
                    />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator color="#9CA3AF" size="small" />
                    </View>
                  )}
                  {h.secret ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        backgroundColor: '#17171E',
                        borderRadius: 100,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                      }}
                    >
                      <Text
                        style={{
                          color: 'white',
                          fontSize: 9,
                          fontWeight: '700',
                          letterSpacing: 1.5,
                          textTransform: 'uppercase',
                        }}
                      >
                        ✳ Local secret
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ fontFamily: SERIF, fontSize: 18, color: '#111', marginBottom: 5 }}>
                  {h.title}
                </Text>
                <Text style={{ fontFamily: SERIF, color: '#3F3F46', fontSize: 14, lineHeight: 22 }}>
                  {h.blurb}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky CTA ── */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: insets.bottom + 14,
          backgroundColor: '#FDFCFA',
          borderTopWidth: 1,
          borderTopColor: '#F0F0EE',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <View>
          <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
            Est. daily
          </Text>
          <Text style={{ fontFamily: SERIF, color: '#111', fontSize: 20 }}>
            {formatPrice(dest.estDailyCost)}
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}> / person</Text>
          </Text>
        </View>
        <Pressable
          onPress={() => router.push(`/plan/${dest.slug}`)}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: '#111',
            borderRadius: 100,
            paddingVertical: 16,
            alignItems: 'center',
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>Plan trip itinerary</Text>
        </Pressable>
      </View>
    </View>
  );
}
