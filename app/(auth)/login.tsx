import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../../components/PillButton';
import { useAuth } from '../../lib/auth';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const result = mode === 'signIn' ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 justify-center px-6">
          <Text className="text-text text-3xl font-bold uppercase mb-1" style={{ letterSpacing: 2 }}>
            Wanderlist
          </Text>
          <Text className="text-textMuted text-sm mb-10">
            {mode === 'signIn' ? 'Sign in to keep planning.' : 'Create your account.'}
          </Text>

          <Text className="text-textMuted text-xs uppercase mb-2" style={{ letterSpacing: 2 }}>
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#9B9AA3"
            className="bg-surface border border-white/10 rounded-xl px-4 py-3 text-text mb-4"
          />

          <Text className="text-textMuted text-xs uppercase mb-2" style={{ letterSpacing: 2 }}>
            Password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#9B9AA3"
            className="bg-surface border border-white/10 rounded-xl px-4 py-3 text-text mb-2"
          />

          {error ? <Text className="text-restaurant text-sm mt-2">{error}</Text> : null}

          <PillButton
            label={mode === 'signIn' ? 'Sign In' : 'Sign Up'}
            onPress={handleSubmit}
            variant="solid"
            loading={loading}
            disabled={!email || !password}
            className="mt-6"
          />

          <PillButton
            label={mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            onPress={() => {
              setError(null);
              setMode(mode === 'signIn' ? 'signUp' : 'signIn');
            }}
            variant="ghost"
            className="mt-3"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
