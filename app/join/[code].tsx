import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { redeemTripInvite } from '../../lib/collab';
import { SERIF } from '../../lib/editorial';

// Authenticated join screen — an approved Getaway Club user opens a trip's share
// link and is added to the trip, then dropped into its workspace.
export default function JoinTripScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { session, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const triedRef = useRef(false);

  useEffect(() => {
    if (loading || !code || triedRef.current) return;
    if (!session) return; // auth wall will redirect to login
    triedRef.current = true;
    (async () => {
      try {
        const { tripId, error: err } = await redeemTripInvite(code);
        if (tripId) {
          router.replace(`/discover/${tripId}`);
        } else {
          setError(err ?? 'This invite link is invalid or has expired.');
        }
      } catch {
        setError('Something went wrong joining this trip.');
      }
    })();
  }, [loading, session, code, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
      {error ? (
        <>
          <Text style={{ fontSize: 40, marginBottom: 14 }}>🧭</Text>
          <Text style={{ fontFamily: SERIF, fontSize: 20, color: '#111', marginBottom: 6, textAlign: 'center' }}>
            Couldn&apos;t join this trip
          </Text>
          <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 22 }}>
            {error}
          </Text>
          <Pressable onPress={() => router.replace('/(tabs)')} style={({ pressed }) => ({ backgroundColor: '#111', borderRadius: 100, paddingVertical: 13, paddingHorizontal: 30, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>Go home</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator color="#111" />
          <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, marginTop: 16 }}>
            Adding you to the trip…
          </Text>
        </>
      )}
    </SafeAreaView>
  );
}
