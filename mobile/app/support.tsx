import { Linking, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { SUPPORT_EMAIL, SUPPORT_MAILTO, legalUrls } from '@/lib/legal';
import { colors, spacing } from '@/theme/tokens';

const topics = [
  'login and password reset help',
  'receipt parsing or upload issues',
  'friend and group syncing problems',
  'AI assistant output that needs review',
  'privacy and account deletion requests',
];

export default function SupportScreen() {
  return (
    <AppScreen>
      <SurfaceCard>
        <Text style={styles.title}>Support</Text>
        <Text style={styles.body}>
          Contact SmartSplit support if you need help with Android app access, receipts, data, or
          account requests.
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <View style={styles.stack}>
          <Text style={styles.label}>Support email</Text>
          <Text style={styles.email}>{SUPPORT_EMAIL}</Text>
          <PrimaryButton
            label="Email support"
            onPress={() => void Linking.openURL(SUPPORT_MAILTO)}
          />
          <PrimaryButton
            label="Open support page"
            tone="ghost"
            onPress={() => void Linking.openURL(legalUrls.support)}
          />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <View style={styles.stack}>
          <Text style={styles.label}>Best topics for support</Text>
          {topics.map((topic) => (
            <Text key={topic} style={styles.body}>
              {topic}
            </Text>
          ))}
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
  body: {
    fontSize: 14,
    lineHeight: 24,
    color: colors.textMuted,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  email: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  stack: {
    gap: spacing.md,
  },
});
