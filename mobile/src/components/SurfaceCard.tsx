import { StyleSheet, View } from 'react-native';
import type { PropsWithChildren } from 'react';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export function SurfaceCard({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
});
