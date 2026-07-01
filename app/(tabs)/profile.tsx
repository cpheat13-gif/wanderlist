import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../../components/GlassCard';
import { PillButton } from '../../components/PillButton';
import { SectionLabel } from '../../components/SectionLabel';
import { useAuth } from '../../lib/auth';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-5 pt-4">
        <SectionLabel className="mb-6">Profile</SectionLabel>

        <GlassCard className="p-5 mb-6">
          <Text className="text-textMuted text-xs uppercase mb-1" style={{ letterSpacing: 2 }}>
            Signed in as
          </Text>
          <Text className="text-text text-base font-semibold">{session?.user.email}</Text>
        </GlassCard>

        <PillButton label="Sign Out" onPress={signOut} variant="glass" />
      </View>
    </SafeAreaView>
  );
}
