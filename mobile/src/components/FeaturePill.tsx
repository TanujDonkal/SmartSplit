import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export function FeaturePill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    minWidth: 96,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    lineHeight: 20,
  },
});
