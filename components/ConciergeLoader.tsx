import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { SERIF } from '../lib/editorial';

// Rotating sub-captions for a touch of delight while the concierge works.
const SUBLINES = [
  'Charting your days',
  'Finding the good light',
  'Asking the locals',
  'Chasing the golden hour',
  'Pinning the hidden gems',
  'Reading the season',
];

type Motif = 'plane' | 'pin' | 'compass';
const MOTIFS: Motif[] = ['plane', 'pin', 'compass'];

// A travel-themed loading animation in the app's editorial palette.
// One of three motifs is chosen at random on each mount.
export function ConciergeLoader({
  caption,
  size = 64,
}: {
  caption?: string;
  size?: number;
}) {
  const motif = useMemo<Motif>(() => MOTIFS[Math.floor(Math.random() * MOTIFS.length)], []);
  const anim = useRef(new Animated.Value(0)).current;
  const [subIndex, setSubIndex] = useState(() => Math.floor(Math.random() * SUBLINES.length));

  useEffect(() => {
    let loop: Animated.CompositeAnimation;
    if (motif === 'plane') {
      loop = Animated.loop(
        Animated.timing(anim, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: false })
      );
    } else if (motif === 'pin') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 560, easing: Easing.out(Easing.quad), useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0, duration: 620, easing: Easing.in(Easing.quad), useNativeDriver: false }),
        ])
      );
    } else {
      loop = Animated.loop(
        Animated.timing(anim, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: false })
      );
    }
    loop.start();
    return () => loop.stop();
  }, [motif, anim]);

  useEffect(() => {
    const id = setInterval(() => setSubIndex((i) => (i + 1) % SUBLINES.length), 1900);
    return () => clearInterval(id);
  }, []);

  const trackWidth = size * 3;
  const iconStyle = { fontSize: size * 0.62, lineHeight: size * 0.78 };

  let stage: React.ReactNode = null;

  if (motif === 'plane') {
    const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.5, trackWidth - size * 0.4] });
    const translateY = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -size * 0.14, 0] });
    stage = (
      <View style={{ width: trackWidth, height: size, justifyContent: 'center' }}>
        {/* dashed route */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <View key={i} style={{ width: 5, height: 3, borderRadius: 2, backgroundColor: '#DCDAD3' }} />
          ))}
        </View>
        <Animated.Text
          style={[
            iconStyle,
            { position: 'absolute', transform: [{ translateX }, { translateY }] },
          ]}
        >
          ✈️
        </Animated.Text>
      </View>
    );
  } else if (motif === 'pin') {
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.42, 0] });
    const shadowScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
    const shadowOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.22] });
    stage = (
      <View style={{ width: size * 1.6, height: size * 1.4, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Animated.Text style={[iconStyle, { transform: [{ translateY }] }]}>📍</Animated.Text>
        <Animated.View
          style={{
            width: size * 0.5,
            height: size * 0.12,
            borderRadius: size * 0.25,
            backgroundColor: '#111',
            marginTop: 4,
            opacity: shadowOpacity,
            transform: [{ scaleX: shadowScale }],
          }}
        />
      </View>
    );
  } else {
    const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    stage = (
      <View style={{ width: size * 1.4, height: size * 1.4, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.Text style={[iconStyle, { transform: [{ rotate }] }]}>🧭</Animated.Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {stage}
      {caption ? (
        <Text
          style={{
            fontFamily: SERIF,
            fontSize: 18,
            color: '#111',
            textAlign: 'center',
            marginTop: 22,
            paddingHorizontal: 20,
          }}
        >
          {caption}
        </Text>
      ) : null}
      <Text
        style={{
          fontFamily: SERIF,
          fontStyle: 'italic',
          fontSize: 13.5,
          color: '#9CA3AF',
          textAlign: 'center',
          marginTop: caption ? 6 : 14,
        }}
      >
        {SUBLINES[subIndex]}…
      </Text>
    </View>
  );
}
