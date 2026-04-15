import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { colors, radii, spacing } from '@/theme/tokens';

export default function AssistantScreen() {
  const [input, setInput] = useState('');

  return (
    <AppScreen>
      <SurfaceCard>
        <Text style={styles.title}>SmartSplit AI</Text>
        <Text style={styles.subtitle}>Ask about friends, groups, expenses, or settlements.</Text>
      </SurfaceCard>

      <View style={styles.thread}>
        <View style={[styles.bubble, styles.assistantBubble]}>
          <Text style={styles.assistantText}>
            Hi, I am your SmartSplit assistant. Ask me about splitting with a friend, creating a
            group, or settling balances.
          </Text>
        </View>
        <View style={[styles.bubble, styles.userBubble]}>
          <Text style={styles.userText}>How much money do I owe?</Text>
        </View>
      </View>

      <SurfaceCard>
        <View style={styles.inputRow}>
          <FormField
            label="Ask AI"
            value={input}
            onChangeText={setInput}
            placeholder="Ask how to split something..."
          />
          <PrimaryButton label="Send" />
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
    gap: spacing.sm,
  },
});
