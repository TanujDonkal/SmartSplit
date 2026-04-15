import { StyleSheet, Text } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { AppScreen } from '@/components/AppScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { colors, spacing } from '@/theme/tokens';

export default function ActivityScreen() {
  return (
    <AppScreen>
      <AppHeader />

      <SurfaceCard>
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.body}>
          The activity timeline will mirror recent expenses, settlements, comments, and
          receipt-assisted entries from the current web app.
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.itemTitle}>Walmart</Text>
        <Text style={styles.itemMeta}>Testing User owes you US$45.16</Text>
        <Text style={styles.itemSubtle}>
          Recent expenses and receipts will land here next.
        </Text>
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
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 24,
    color: colors.textMuted,
  },
  itemTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  itemMeta: {
    marginTop: spacing.xs,
    fontSize: 15,
    color: colors.primaryDark,
  },
  itemSubtle: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textMuted,
  },
});
