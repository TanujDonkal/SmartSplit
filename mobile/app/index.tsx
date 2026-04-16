import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { BrandHeader } from '@/components/BrandHeader';
import { FeaturePill } from '@/components/FeaturePill';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { colors, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  return (
    <AppScreen>
      <SurfaceCard>
        <BrandHeader />

        <View style={styles.content}>
          <Text style={styles.title}>Split bills simply across friends, trips, and shared groups.</Text>
          <Text style={styles.body}>
            SmartSplit keeps direct expenses, group balances, receipts, settlements, and AI
            helpers together in one polished mobile flow.
          </Text>
        </View>

        <View style={styles.pillRow}>
          <FeaturePill label="Direct friend expenses" />
          <FeaturePill label="Groups, balances, and settle up" />
          <FeaturePill label="Receipts, AI parsing, and insights" />
        </View>

        <View style={styles.actions}>
          <Link href="/register" asChild>
            <PrimaryButton label="Sign up" />
          </Link>
          <Link href="/login" asChild>
            <PrimaryButton label="Log in" tone="secondary" />
          </Link>
        </View>

        <View style={styles.footerTag}>
          <Text style={styles.footerText}>Friends | Groups | Activity | Account</Text>
        </View>

        <View style={styles.bars}>
          <View style={[styles.bar, { height: 28, backgroundColor: colors.secondary }]} />
          <View style={[styles.bar, { height: 44, backgroundColor: colors.olive }]} />
          <View style={[styles.bar, { height: 38, backgroundColor: colors.primary }]} />
          <View style={[styles.bar, { height: 52, backgroundColor: colors.accent }]} />
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    fontSize: 15,
    lineHeight: 26,
    color: colors.textMuted,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  footerTag: {
    marginTop: spacing.xl,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
});
