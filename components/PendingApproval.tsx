import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { SERIF } from '../lib/editorial';

// Shown to a signed-in user whose email is not yet on the allowlist.
export function PendingApproval() {
  const { session, signOut, recheckAccess, accessLoading } = useAuth();
  const email = session?.user.email ?? 'your account';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFCFA' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
        <Text style={{ fontSize: 42, marginBottom: 18 }}>🕰️</Text>
        <Text
          style={{
            color: '#9CA3AF',
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          Wanderlist
        </Text>
        <Text style={{ fontFamily: SERIF, fontSize: 26, color: '#111', textAlign: 'center', lineHeight: 32 }}>
          You&apos;re on the list
        </Text>
        <Text
          style={{
            fontFamily: SERIF,
            fontStyle: 'italic',
            color: '#6B7280',
            fontSize: 15,
            textAlign: 'center',
            lineHeight: 23,
            marginTop: 12,
          }}
        >
          Thanks for signing up as {email}. An admin needs to approve you before you can start planning — you&apos;ll be in as soon as they do.
        </Text>

        <Pressable
          onPress={recheckAccess}
          disabled={accessLoading}
          style={({ pressed }) => ({
            marginTop: 30,
            backgroundColor: '#111',
            borderRadius: 100,
            paddingVertical: 14,
            paddingHorizontal: 34,
            transform: [{ scale: pressed ? 0.97 : 1 }],
            opacity: accessLoading ? 0.5 : 1,
          })}
        >
          {accessLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontSize: 14.5, fontWeight: '700' }}>Check again</Text>
          )}
        </Pressable>

        <Pressable onPress={signOut} style={{ marginTop: 18, paddingVertical: 8, paddingHorizontal: 20 }}>
          <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
