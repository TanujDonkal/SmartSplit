import { Linking, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { legalUrls } from '@/lib/legal';
import { colors, spacing } from '@/theme/tokens';

const sections = [
  'SmartSplit stores account profile details, friends, groups, expenses, balances, comments, receipt uploads, and AI prompts you submit.',
  'That data is used to authenticate you, calculate balances, sync your account across devices, process receipts, and return assistant replies.',
  'You can manage your account in the app and permanently delete it from the Account screen.',
];

export default function PrivacyScreen() {
  return (
    <AppScreen>
      <SurfaceCard>
        <Text style={styles.title}>Privacy policy</Text>
        <Text style={styles.body}>
          Review how SmartSplit handles your account, expense, receipt, and AI data before using
          the Android app.
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <View style={styles.stack}>
          {sections.map((section) => (
            <Text key={section} style={styles.body}>
              {section}
            </Text>
          ))}
          <PrimaryButton
            label="Open full privacy policy"
            tone="ghost"
            onPress={() => void Linking.openURL(legalUrls.privacy)}
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
  body: {
    fontSize: 14,
    lineHeight: 24,
    color: colors.textMuted,
  },
  stack: {
    gap: spacing.md,
  },
});
