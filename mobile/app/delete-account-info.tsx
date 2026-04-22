import { Linking, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { SUPPORT_MAILTO, legalUrls } from '@/lib/legal';
import { colors, spacing } from '@/theme/tokens';

const steps = [
  'Log in to SmartSplit.',
  'Open the Account tab.',
  'Review the warning shown in the Delete account section.',
  'Use Delete account to permanently remove your account and related app data.',
];

export default function DeleteAccountInfoScreen() {
  return (
    <AppScreen>
      <SurfaceCard>
        <Text style={styles.title}>Delete account</Text>
        <Text style={styles.body}>
          SmartSplit supports account deletion inside the app, and this screen gives the same
          instructions outside the main account flow.
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <View style={styles.stack}>
          {steps.map((step, index) => (
            <Text key={step} style={styles.body}>
              {index + 1}. {step}
            </Text>
          ))}
          <PrimaryButton
            label="Open deletion help page"
            tone="ghost"
            onPress={() => void Linking.openURL(legalUrls.deleteAccount)}
          />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <View style={styles.stack}>
          <Text style={styles.body}>
            If you cannot access the app, email SmartSplit support from your account email and ask
            for account deletion help.
          </Text>
          <PrimaryButton
            label="Email deletion support"
            onPress={() => void Linking.openURL(SUPPORT_MAILTO)}
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
