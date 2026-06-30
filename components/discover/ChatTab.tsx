import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { askAboutDestination } from '../../lib/ai';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export function ChatTab({ destination, country }: { destination: string; country?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const trimmed = question.trim();
    if (!trimmed || sending) return;
    setError(null);
    setSending(true);
    const history = messages;
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setQuestion('');

    try {
      const result = await askAboutDestination({ destination, country, question: trimmed, history });
      setMessages((prev) => [...prev, { role: 'assistant', text: result.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong asking Claude.');
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={8}
    >
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 16 }}>
        <Text className="text-neutral-900 text-2xl font-semibold mb-3">Ask about {destination}</Text>

        {messages.length === 0 ? (
          <Text className="text-neutral-400 mt-4">
            Ask anything — best time to visit, what to pack, local tips...
          </Text>
        ) : null}

        {messages.map((msg, i) => (
          <View key={i} className="mb-3">
            {msg.role === 'user' ? (
              <View className="self-end bg-emerald-600 rounded-2xl px-4 py-2 max-w-[85%]">
                <Text className="text-white">{msg.text}</Text>
              </View>
            ) : (
              <View className="self-start bg-neutral-100 rounded-2xl px-4 py-2 max-w-[95%]">
                <Text className="text-neutral-800">{msg.text}</Text>
              </View>
            )}
          </View>
        ))}

        {sending ? (
          <View className="self-start bg-neutral-100 rounded-2xl px-4 py-3 mb-3">
            <ActivityIndicator color="#059669" />
          </View>
        ) : null}

        {error ? <Text className="text-red-500 mb-3">{error}</Text> : null}
      </ScrollView>

      <View className="flex-row items-center px-5 pt-2" style={{ paddingBottom: 100 }}>
        <TextInput
          className="flex-1 bg-neutral-100 rounded-full px-4 py-3 text-neutral-900 mr-2"
          placeholder="Ask a question..."
          placeholderTextColor="#A3A3A3"
          value={question}
          onChangeText={setQuestion}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Pressable
          onPress={handleSend}
          disabled={sending || !question.trim()}
          className="bg-emerald-600 rounded-full w-11 h-11 items-center justify-center"
          style={{ opacity: sending || !question.trim() ? 0.5 : 1 }}
        >
          <Text className="text-white text-lg">↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
