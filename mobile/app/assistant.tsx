import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { NoticeText } from '@/components/NoticeText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useAuth } from '@/context/useAuth';
import { api, type AssistantChatMessage } from '@/lib/api';
import { colors, radii, spacing } from '@/theme/tokens';

type ChatMessage = {
  id: string;
  role: AssistantChatMessage['role'];
  text: string;
};

export default function AssistantScreen() {
  const { token } = useAuth();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'assistant-welcome',
      role: 'assistant',
      text: 'Hi, I am your SmartSplit assistant. Ask me about splitting with a friend, creating a group, or settling balances.',
    },
  ]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isSending) {
      return;
    }

    if (!token) {
      setError('Log in first to use SmartSplit AI.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const nextMessages = [...chatMessages, userMessage];
    setChatMessages(nextMessages);
    setInput('');
    setError('');
    setIsSending(true);

    try {
      const response = await api.askAssistant({
        messages: nextMessages.map((message) => ({
          role: message.role,
          text: message.text,
        })),
      });

      setChatMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now() + 1}`,
          role: 'assistant',
          text: response.reply,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error
          ? `I couldn't reach SmartSplit AI right now: ${err.message}`
          : 'I could not reach SmartSplit AI right now.';

      setChatMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now() + 1}`,
          role: 'assistant',
          text: message,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AppScreen>
      <SurfaceCard>
        <Text style={styles.title}>SmartSplit AI</Text>
        <Text style={styles.subtitle}>Ask about friends, groups, expenses, or settlements.</Text>
      </SurfaceCard>

      {error ? <NoticeText tone="error" message={error} /> : null}

      <View style={styles.thread}>
        {chatMessages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.bubble,
              message.role === 'assistant' ? styles.assistantBubble : styles.userBubble,
            ]}
          >
            <Text
              style={
                message.role === 'assistant' ? styles.assistantText : styles.userText
              }
            >
              {message.text}
            </Text>
          </View>
        ))}
      </View>

      <SurfaceCard>
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask how to split something..."
            placeholderTextColor={colors.textSoft}
            style={styles.input}
            multiline
          />
          <PrimaryButton
            label={isSending ? 'Sending...' : 'Send'}
            onPress={() => void handleSend()}
            disabled={isSending}
          />
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textMuted,
  },
  thread: {
    gap: spacing.sm,
  },
  bubble: {
    maxWidth: '86%',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  assistantBubble: {
    backgroundColor: '#f4f8f7',
  },
  assistantText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 22,
  },
  userBubble: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  userText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 22,
  },
  inputRow: {
    gap: spacing.md,
  },
  input: {
    minHeight: 96,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.secondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
  },
});
