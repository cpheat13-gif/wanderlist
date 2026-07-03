import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SERIF } from '../../lib/editorial';
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
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: '#FDFCFA' }}
        contentContainerStyle={{ padding: 20, paddingBottom: 16 }}
      >
        <Text style={{ fontFamily: SERIF, fontSize: 24, color: '#111', marginBottom: 12 }}>
          Ask about {destination}
        </Text>

        {messages.length === 0 ? (
          <Text style={{ fontFamily: SERIF, fontStyle: 'italic', color: '#9CA3AF', fontSize: 14, marginTop: 8, lineHeight: 21 }}>
            Ask anything — best time to visit, what to pack, local tips...
          </Text>
        ) : null}

        {messages.map((msg, i) => (
          <View key={i} className="mb-3">
            {msg.role === 'user' ? (
              <View className="self-end rounded-2xl px-4 py-2 max-w-[85%]" style={{ backgroundColor: '#111' }}>
                <Text className="text-white">{msg.text}</Text>
              </View>
            ) : (
              <View
                className="self-start rounded-2xl px-4 py-2 max-w-[95%]"
                style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#F0F0EE' }}
              >
                <Text style={{ fontFamily: SERIF, color: '#3F3F46', lineHeight: 21 }}>{msg.text}</Text>
              </View>
            )}
          </View>
        ))}

        {sending ? (
          <View
            className="self-start rounded-2xl px-4 py-3 mb-3"
            style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#F0F0EE' }}
          >
            <ActivityIndicator color="#111" />
          </View>
        ) : null}

        {error ? <Text className="text-red-500 mb-3">{error}</Text> : null}
      </ScrollView>

      <View
        className="flex-row items-center px-5 pt-2"
        style={{ paddingBottom: 100, backgroundColor: '#FDFCFA' }}
      >
        <TextInput
          className="flex-1 rounded-full px-4 py-3 mr-2"
          style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', color: '#111' }}
          placeholder="Ask a question..."
          placeholderTextColor="#B6BAC2"
          value={question}
          onChangeText={setQuestion}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Pressable
          onPress={handleSend}
          disabled={sending || !question.trim()}
          className="rounded-full w-11 h-11 items-center justify-center"
          style={{ backgroundColor: '#111', opacity: sending || !question.trim() ? 0.4 : 1 }}
        >
          <Text className="text-white text-lg">↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
