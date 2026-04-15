import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { colors, spacing } from '@/theme/tokens';

export default function GroupsScreen() {
  return (
    <AppScreen>
      <AppHeader />

      <SurfaceCard>
        <Text style={styles.greeting}>Hi, welcome back</Text>
        <Text style={styles.title}>Overall, you are settled up in CAD</Text>
      </SurfaceCard>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Groups</Text>
        <Text style={styles.sectionBadge}>Daily splits</Text>
      </View>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Create your first mobile group</Text>
        <Text style={styles.cardBody}>
          This tab is scaffolded to mirror the web app’s main groups dashboard. Next we’ll wire
          the real groups list, balances, and group detail flow against the same backend.
        </Text>
        <View style={styles.buttonGap}>
          <PrimaryButton label="Create group" />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Production-minded next steps</Text>
        <Text style={styles.bullet}>• Invite link + QR flow for viral group growth</Text>
        <Text style={styles.bullet}>• FX snapshot display for multi-currency fairness</Text>
        <Text style={styles.bullet}>
          • Queue-backed AI receipt parsing and settle-up suggestions
        </Text>
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontSize: 14,
    color: colors.textMuted,
  },
  title: {
    marginTop: spacing.sm,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  sectionBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  cardBody: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 24,
    color: colors.textMuted,
  },
  buttonGap: {
    marginTop: spacing.lg,
  },
  bullet: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 24,
    color: colors.textMuted,
  },
});
